import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createUserSchema, updateUserSchema, signupUserSchema, passwordResetSchema, recruitUserSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { sendSignupEmail, sendPasswordResetEmail, sendUserInvitationEmail } from "./emailService";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for deployment
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      sessionFixApplied: true,
      buildVersion: 'emergency-session-fix-v4',
      sessionId: req.sessionID || 'NO_SESSION',
      hasSession: !!req.session,
      envVars: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasSessionSecret: !!(process.env.SESSION_SECRET || process.env.SECRET_KEY),
        nodeEnv: process.env.NODE_ENV
      }
    });
  });

  // Session store configuration
  const PgSession = ConnectPgSimple(session);
  const isProduction = process.env.NODE_ENV === 'production';
  
  let sessionStore;
  try {
    // Try to use PostgreSQL session store
    sessionStore = new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
    });
    
    sessionStore.on('error', (err) => {
      console.error('Session store error:', err);
    });
    
    console.log('Using PostgreSQL session store');
  } catch (error) {
    console.error('Failed to initialize PostgreSQL session store:', error);
    console.log('Falling back to memory store');
    sessionStore = undefined; // Use default memory store
  }

  // Session configuration with environment-specific settings
  const sessionSecret = process.env.SESSION_SECRET || process.env.SECRET_KEY || 'voltverashop-fallback-secret-2025';
  console.log('Session secret configured:', sessionSecret ? 'Yes' : 'No');
  console.log('Database URL configured:', process.env.DATABASE_URL ? 'Yes' : 'No');
  console.log('Production mode:', isProduction);
  
  app.use(session({
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true,
    name: 'voltverashop.sid',
    cookie: { 
      secure: false, // Allow both HTTP and HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    },
    store: undefined // Use memory store to avoid DB connection issues
  }));

  // Simple login - check email and password
  app.post('/api/login', async (req, res) => {
    const { email, password, rememberMe } = req.body;
    console.log('=== LOGIN DEBUG ===');
    console.log('Email:', email);
    console.log('Production:', isProduction);
    console.log('Session ID before login:', req.sessionID);
    console.log('Database URL exists:', !!process.env.DATABASE_URL);
    
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
        
        // Store user in session with debugging
        (req.session as any).userId = user.id;
        (req.session as any).user = user;
        
        console.log('Session after login:', req.sessionID);
        console.log('User stored in session:', (req.session as any).userId);
        console.log('Cookie settings:', req.session.cookie);
        
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
        res.clearCookie('voltverashop.sid'); // Clear the session cookie
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  };

  app.post('/api/logout', handleLogout);
  app.get('/api/logout', handleLogout);

  // Simple auth middleware with debugging
  const isAuthenticated = async (req: any, res: any, next: any) => {
    const userId = (req.session as any)?.userId;
    console.log('Auth check - Session ID:', req.sessionID);
    console.log('Auth check - User ID in session:', userId);
    console.log('Auth check - Full session:', req.session);
    
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
        email: user.email!,
        token,
        type: 'invitation',
        expiresAt
      });
      
      // Send user invitation email instead of signup email
      const emailSent = await sendUserInvitationEmail(user.email!, user.firstName || 'User', token);
      
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

  // Team management routes
  app.post("/api/team/recruit", isAuthenticated, async (req: any, res) => {
    try {
      const recruitData = recruitUserSchema.parse(req.body);
      const recruiterId = req.user.id;
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(recruitData.email!);
      if (existingUser) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
      
      // Create pending recruit (new workflow)
      const pendingRecruit = await storage.createPendingRecruit(recruitData, recruiterId);
      
      res.status(201).json({ 
        message: "Recruitment request submitted successfully! Admin will process your request and send credentials.",
        pendingRecruit: {
          id: pendingRecruit.id,
          email: pendingRecruit.email,
          fullName: pendingRecruit.fullName,
          status: pendingRecruit.status
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating pending recruit:", error);
      res.status(500).json({ message: "Failed to submit recruitment request" });
    }
  });

  app.get("/api/team/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const members = await storage.getTeamMembers(userId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.get("/api/team/downline", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const levels = req.query.levels ? parseInt(req.query.levels as string) : 5;
      const downline = await storage.getDownline(userId, levels);
      res.json(downline);
    } catch (error) {
      console.error("Error fetching downline:", error);
      res.status(500).json({ message: "Failed to fetch downline" });
    }
  });

  app.get("/api/team/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getTeamStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching team stats:", error);
      res.status(500).json({ message: "Failed to fetch team stats" });
    }
  });

  // Admin routes for pending recruits management
  app.get("/api/admin/pending-recruits", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const pendingRecruits = await storage.getPendingRecruits();
      res.json(pendingRecruits);
    } catch (error) {
      console.error("Error getting pending recruits:", error);
      res.status(500).json({ message: "Failed to get pending recruits" });
    }
  });

  app.post("/api/admin/pending-recruits/:id/approve", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { packageAmount, position } = req.body;

      if (!packageAmount || !position) {
        return res.status(400).json({ message: "Package amount and position are required" });
      }

      const newUser = await storage.approvePendingRecruit(id, { packageAmount, position });
      res.json({ 
        message: "Recruit approved and user created successfully",
        user: newUser 
      });
    } catch (error) {
      console.error("Error approving recruit:", error);
      res.status(500).json({ message: "Failed to approve recruit" });
    }
  });

  app.delete("/api/admin/pending-recruits/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.rejectPendingRecruit(id);
      
      if (!success) {
        return res.status(404).json({ message: "Pending recruit not found" });
      }

      res.json({ message: "Recruit rejected successfully" });
    } catch (error) {
      console.error("Error rejecting recruit:", error);
      res.status(500).json({ message: "Failed to reject recruit" });
    }
  });

  // Get user's own pending recruits
  app.get("/api/team/pending-recruits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const pendingRecruits = await storage.getPendingRecruits(userId);
      res.json(pendingRecruits);
    } catch (error) {
      console.error("Error getting user pending recruits:", error);
      res.status(500).json({ message: "Failed to get pending recruits" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}