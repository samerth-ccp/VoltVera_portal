import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createUserSchema, updateUserSchema, signupUserSchema, passwordResetSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { sendSignupEmail, sendPasswordResetEmail, sendUserInvitationEmail } from "./emailService";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for deployment
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Session store configuration
  const PgSession = ConnectPgSimple(session);
  const isProduction = process.env.NODE_ENV === 'production';
  
  const sessionStore = isProduction 
    ? new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: 'sessions',
        createTableIfMissing: true,
      })
    : undefined; // Use default memory store for development

  // Session setup for authentication
  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'voltverashop-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: isProduction, // secure cookies in production
      httpOnly: true, // Secure cookies for security
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax' // Compatible with same-origin requests
    }
  }));

  // Simple login - check email and password
  app.post('/api/login', async (req, res) => {
    const { email, password, rememberMe } = req.body;
    
    try {
      const user = await storage.getUserByEmailAndPassword(email, password);
      if (user) {
        // Update last active timestamp
        await storage.updateUser(user.id, { lastActiveAt: new Date() });
        
        // Store user in session
        (req.session as any).userId = user.id;
        
        // Set session expiration based on remember me
        if (rememberMe) {
          // Remember me: 30 days
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        } else {
          // Regular session: 24 hours
          req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
        }
        
        res.json({ success: true, user });
      } else {
        res.status(401).json({ message: "Invalid email or password" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout (support both GET and POST)
  const handleLogout = (req: any, res: any) => {
    if (req.session) {
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  };

  app.post('/api/logout', handleLogout);
  app.get('/api/logout', handleLogout);

  // Simple auth middleware
  const isAuthenticated = async (req: any, res: any, next: any) => {
    const userId = (req.session as any)?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    req.user = user;
    next();
  };

  // Admin middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    res.json(req.user);
  });

  // User management routes (admin only)
  app.get("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const search = req.query.search as string;
      const users = await storage.getAllUsers(search);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.post("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      
      // Check if email already exists
      if (userData.email) {
        const existingUser = await storage.getUserByEmail(userData.email);
        if (existingUser) {
          return res.status(409).json({ message: "A user with this email already exists" });
        }
      }
      
      // Create user with temporary password (will be replaced when user accepts invitation) 
      const tempPassword = nanoid(16);
      const userWithPassword = { ...userData, password: tempPassword };
      const user = await storage.createUser(userWithPassword);
      
      // Generate invitation token for admin-created users
      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiration
      
      await storage.createEmailToken({
        email: user.email,
        token,
        type: 'invitation',
        expiresAt
      });
      
      // Send user invitation email instead of signup email
      const emailSent = await sendUserInvitationEmail(user.email, user.firstName || 'User', token);
      
      if (emailSent) {
        console.log(`User invitation email sent to ${user.email}`);
        res.status(201).json({ 
          ...user, 
          message: "User invitation sent successfully" 
        });
      } else {
        console.log(`Development mode: Invitation token for ${user.email}: ${token}`);
        console.log(`Invitation URL: https://voltveratech.com/complete-invitation?token=${token}`);
        res.status(201).json({ 
          ...user, 
          message: "User created. Email service needs configuration - check server logs for verification link.",
          devToken: process.env.NODE_ENV === 'development' ? token : undefined
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Password change route
  app.post("/api/auth/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      // Verify current password
      const user = await storage.getUserByEmailAndPassword(req.user.email, currentPassword);
      if (!user) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Update password
      const success = await storage.updatePassword(userId, newPassword);
      if (!success) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Validate invitation token route
  app.post("/api/auth/validate-invitation", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const emailToken = await storage.getEmailToken(token);
      if (!emailToken || emailToken.type !== 'invitation') {
        return res.status(400).json({ message: "Invalid or expired invitation" });
      }

      if (new Date() > emailToken.expiresAt) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      const user = await storage.getUserByEmail(emailToken.email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      res.json({ 
        valid: true, 
        user: { 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName 
        } 
      });
    } catch (error) {
      console.error("Error validating invitation:", error);
      res.status(500).json({ message: "Failed to validate invitation" });
    }
  });

  // Complete invitation route
  app.post("/api/auth/complete-invitation", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const emailToken = await storage.getEmailToken(token);
      if (!emailToken || emailToken.type !== 'invitation') {
        return res.status(400).json({ message: "Invalid or expired invitation" });
      }

      if (new Date() > emailToken.expiresAt) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      const user = await storage.getUserByEmail(emailToken.email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Update user password and activate account
      const success = await storage.updatePassword(user.id, password);
      if (!success) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      await storage.updateUser(user.id, { 
        status: 'active', 
        emailVerified: new Date() 
      });

      // Remove the used token
      await storage.deleteEmailToken(token);

      res.json({ message: "Account setup completed successfully" });
    } catch (error) {
      console.error("Error completing invitation:", error);
      res.status(500).json({ message: "Failed to complete invitation" });
    }
  });

  // User signup with email verification
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const userData = signupUserSchema.parse(req.body);
      
      // Check if email already exists  
      const existingUser = await storage.getUserByEmail(userData.email!);
      if (existingUser) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
      
      // Create pending user
      const user = await storage.createSignupUser(userData);
      
      // Generate verification token
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.createEmailToken({
        email: userData.email!,
        token,
        type: 'signup',
        expiresAt
      });
      
      // Send verification email
      const emailSent = await sendSignupEmail(userData.email!, token);
      if (!emailSent) {
        // For development, still allow signup but show different message
        console.log(`Development mode: Verification token for ${userData.email!}: ${token}`);
        console.log(`Verification URL: http://localhost:5000/verify-email?token=${token}`);
        return res.status(201).json({ 
          message: "Account created! Email service needs configuration. Use verification URL from server logs.",
          userId: user.id,
          devToken: process.env.NODE_ENV === 'development' ? token : undefined
        });
      }
      
      res.status(201).json({ 
        message: "Account created successfully. Please check your email to verify your account.",
        userId: user.id 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Email verification route
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }
      
      const result = await storage.getUserByToken(token);
      if (!result || result.tokenType !== 'signup') {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      
      // Verify the user's email
      const success = await storage.verifyUserEmail(result.user.email!);
      if (!success) {
        return res.status(500).json({ message: "Failed to verify email" });
      }
      
      // Delete the verification token
      await storage.deleteEmailToken(token);
      
      res.json({ message: "Email verified successfully. You can now login to your account." });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Forgot password route
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account with that email exists, password reset instructions have been sent." });
      }

      // Generate password reset token
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await storage.createEmailToken({
        email: user.email!,
        token,
        type: 'password_reset',
        expiresAt
      });
      
      // Send password reset email
      const emailSent = await sendPasswordResetEmail(user.email!, token);
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send password reset email" });
      }

      res.json({ message: "If an account with that email exists, password reset instructions have been sent." });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Failed to process password reset" });
    }
  });

  // Reset password route
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = passwordResetSchema.parse(req.body);
      
      const result = await storage.getUserByToken(token);
      if (!result || result.tokenType !== 'password_reset') {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Update password
      const success = await storage.updatePassword(result.user.id, newPassword);
      if (!success) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      // Delete the reset token
      await storage.deleteEmailToken(token);
      
      res.json({ message: "Password reset successfully. You can now login with your new password." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}