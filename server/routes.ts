import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createUserSchema, updateUserSchema, signupUserSchema, passwordResetSchema, recruitUserSchema, users } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { sendSignupEmail, sendPasswordResetEmail, sendUserInvitationEmail } from "./emailService";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import mlmRoutes from "./mlmRoutes";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
      console.log('Attempting login for:', email);
      const user = await storage.getUserByEmailAndPassword(email, password);
      console.log('User found:', !!user);
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
      // Remove password from validation schema for admin creation
      const adminUserSchema = createUserSchema.omit({ password: true });
      const userData = adminUserSchema.parse(req.body);
      
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
      
      // Create pending user with sponsor if provided
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

  // Sponsor verification route
  app.get("/api/auth/verify-sponsor/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({ message: "Sponsor code is required" });
      }
      
      // Check if sponsor exists by user ID or email
      let sponsor = await storage.getUser(code);
      if (!sponsor) {
        sponsor = await storage.getUserByEmail(code);
      }
      
      if (!sponsor) {
        return res.status(404).json({ message: "Invalid sponsor code" });
      }
      
      if (sponsor.status !== 'active') {
        return res.status(400).json({ message: "Sponsor account is not active" });
      }
      
      res.json({ 
        sponsor: {
          name: `${sponsor.firstName} ${sponsor.lastName}`,
          email: sponsor.email,
          id: sponsor.id
        }
      });
    } catch (error) {
      console.error("Error verifying sponsor:", error);
      res.status(500).json({ message: "Failed to verify sponsor" });
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

  // Get user KYC documents
  app.get("/api/kyc", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const documents = await storage.getUserKYCDocuments(req.session.userId!);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching KYC documents:", error);
      res.status(500).json({ message: "Failed to fetch KYC documents" });
    }
  });

  // Submit KYC document
  app.post("/api/kyc", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const { documentType, documentUrl, documentNumber } = req.body;
      
      if (!documentType || !documentUrl) {
        return res.status(400).json({ message: "Document type and URL are required" });
      }
      
      // Check if user already has a pending or approved document of this type
      const existingDocs = await storage.getUserKYCDocuments(req.session.userId!);
      const existingDoc = existingDocs.find(doc => 
        doc.documentType === documentType && (doc.status === 'pending' || doc.status === 'approved')
      );
      
      if (existingDoc) {
        return res.status(400).json({ 
          message: "You already have a document of this type submitted or approved" 
        });
      }
      
      const kycData = {
        documentType,
        documentUrl,
        documentNumber: documentNumber || undefined,
      };
      
      const document = await storage.createKYCDocument(req.session.userId!, kycData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error submitting KYC document:", error);
      res.status(500).json({ message: "Failed to submit KYC document" });
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

  // Binary MLM Tree routes
  app.get("/api/binary-tree", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const treeData = await storage.getBinaryTreeData(userId);
      res.json(treeData);
    } catch (error) {
      console.error("Error fetching binary tree data:", error);
      res.status(500).json({ message: "Failed to fetch binary tree data" });
    }
  });

  // Direct recruits only (left and right positions in binary tree)
  app.get("/api/direct-recruits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const directRecruits = await storage.getDirectRecruits(userId);
      res.json(directRecruits);
    } catch (error) {
      console.error("Error fetching direct recruits:", error);
      res.status(500).json({ message: "Failed to fetch direct recruits" });
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
      const { packageAmount } = req.body;
      
      console.log('=== ADMIN APPROVE REQUEST ===');
      console.log('Recruit ID:', id);
      console.log('Package Amount:', packageAmount);
      console.log('Admin User:', req.user.email);

      if (!packageAmount) {
        return res.status(400).json({ message: "Package amount is required" });
      }

      const newUser = await storage.approvePendingRecruit(id, { packageAmount });
      res.json({ 
        message: "Recruit approved and user created successfully",
        user: newUser 
      });
    } catch (error) {
      console.error("Error approving recruit:", error);
      console.error("Error details:", error instanceof Error ? error.message : error);
      
      // Send specific error message to frontend
      const errorMessage = error instanceof Error ? error.message : "Failed to approve recruit";
      res.status(500).json({ 
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      });
    }
  });

  app.delete("/api/admin/pending-recruits/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason = "No reason provided" } = req.body;
      const rejectedBy = req.user.id;
      
      const success = await storage.rejectPendingRecruit(id, rejectedBy, reason);
      
      if (!success) {
        return res.status(404).json({ message: "Pending recruit not found" });
      }

      res.json({ message: "Recruit rejected successfully with notifications sent" });
    } catch (error) {
      console.error("Error rejecting recruit:", error);
      res.status(500).json({ message: "Failed to reject recruit" });
    }
  });

  // Get pending recruits awaiting upline decision with strategic information
  app.get("/api/upline/pending-recruits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const pendingRecruits = await storage.getPendingRecruitsForUplineWithDetails(userId);
      res.json(pendingRecruits);
    } catch (error) {
      console.error("Error getting pending recruits for upline:", error);
      res.status(500).json({ message: "Failed to get pending recruits" });
    }
  });

  // Upline decides position for pending recruit and generates referral link
  app.post("/api/upline/pending-recruits/:id/decide", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { decision, position } = req.body;
      const uplineId = req.user.id;

      if (!decision || !['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ message: "Valid decision (approved/rejected) is required" });
      }

      if (decision === 'approved' && (!position || !['left', 'right'].includes(position))) {
        return res.status(400).json({ message: "Position (left/right) is required when approving" });
      }

      if (decision === 'approved') {
        // Generate referral link for the approved recruit
        const token = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiry
        
        const referralLink = await storage.createReferralLink({
          token,
          generatedBy: uplineId,
          generatedByRole: req.user.role,
          placementSide: position,
          expiresAt,
          pendingRecruitId: id // Link this referral to the pending recruit
        });
        
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://voltveratech.com' 
          : `http://localhost:5000`;
        const fullUrl = `${baseUrl}/referral-register?token=${token}`;
        
        // Update the pending recruit with link generation step
        await storage.uplineDecidePosition(id, uplineId, decision, position, token);
        
        res.json({ 
          message: `Recruit approved for ${position} position. Share this link with them to complete registration.`,
          referralLink: fullUrl,
          expiresIn: '48 hours'
        });
      } else {
        // Rejection flow remains the same
        await storage.uplineDecidePosition(id, uplineId, decision, position);
        res.json({ message: "Recruit rejected." });
      }
    } catch (error) {
      console.error("Error processing upline decision:", error);
      res.status(500).json({ message: "Failed to process decision" });
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

  // Notification endpoints
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const success = await storage.markNotificationAsRead(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Referral link endpoints
  app.post('/api/referral/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { placementSide } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      if (!placementSide || !['left', 'right'].includes(placementSide)) {
        return res.status(400).json({ message: 'Valid placement side (left/right) is required' });
      }
      
      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiry
      
      const referralLink = await storage.createReferralLink({
        token,
        generatedBy: userId,
        generatedByRole: userRole,
        placementSide,
        expiresAt
      });
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://voltveratech.com' 
        : `http://localhost:5000`;
      const fullUrl = `${baseUrl}/recruit?ref=${token}`;
      
      res.json({
        referralLink,
        url: fullUrl,
        expiresIn: '48 hours'
      });
    } catch (error) {
      console.error('Error generating referral link:', error);
      res.status(500).json({ message: 'Failed to generate referral link' });
    }
  });

  app.get('/api/referral/validate/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      const referralLink = await storage.getReferralLink(token);
      if (!referralLink) {
        return res.status(404).json({ message: 'Invalid referral link' });
      }
      
      if (referralLink.isUsed) {
        return res.status(400).json({ message: 'Referral link has already been used' });
      }
      
      if (new Date() > referralLink.expiresAt) {
        return res.status(400).json({ message: 'Referral link has expired' });
      }
      
      res.json({
        valid: true,
        placementSide: referralLink.placementSide,
        generatedBy: referralLink.generatedBy,
        generatedByRole: referralLink.generatedByRole
      });
    } catch (error) {
      console.error('Error validating referral link:', error);
      res.status(500).json({ message: 'Failed to validate referral link' });
    }
  });

  app.get('/api/referral/my-links', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const links = await storage.getUserReferralLinks(userId);
      res.json(links);
    } catch (error) {
      console.error('Error fetching user referral links:', error);
      res.status(500).json({ message: 'Failed to fetch referral links' });
    }
  });

  // Recruitment registration endpoint (when new user fills details via referral link)
  app.post('/api/recruitment/register', async (req, res) => {
    try {
      const { token, recruiteeName, recruiteeEmail } = req.body;
      
      if (!token || !recruiteeName || !recruiteeEmail) {
        return res.status(400).json({ message: 'Token, name, and email are required' });
      }
      
      // Validate referral link
      const referralLink = await storage.getReferralLink(token);
      if (!referralLink) {
        return res.status(404).json({ message: 'Invalid or expired referral link' });
      }
      
      if (referralLink.isUsed) {
        return res.status(400).json({ message: 'This referral link has already been used' });
      }
      
      if (new Date() > referralLink.expiresAt) {
        return res.status(400).json({ message: 'This referral link has expired' });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(recruiteeEmail);
      if (existingUser) {
        return res.status(409).json({ message: 'A user with this email already exists' });
      }
      
      // Update the pending recruit with the user's details (this was already approved by upline)
      if (referralLink.pendingRecruitId) {
        // Update pending recruit status to awaiting admin (final approval)
        await storage.updatePendingRecruitDetails(referralLink.pendingRecruitId, {
          fullName: recruiteeName,
          email: recruiteeEmail,
          status: 'awaiting_admin'
        });
        
        // Mark referral link as used
        await storage.markReferralLinkAsUsed(token, referralLink.pendingRecruitId);
      }
      
      res.json({
        message: 'Registration completed successfully! Your information has been submitted for final admin approval.',
        status: 'awaiting_admin'
      });
    } catch (error) {
      console.error('Error processing recruitment registration:', error);
      res.status(500).json({ message: 'Failed to process registration' });
    }
  });

  app.get('/api/admin/recruitment-requests', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { status } = req.query;
      const requests = await storage.getRecruitmentRequests({
        status: status as string
      });
      res.json(requests);
    } catch (error) {
      console.error('Error fetching recruitment requests:', error);
      res.status(500).json({ message: 'Failed to fetch recruitment requests' });
    }
  });

  app.post('/api/admin/recruitment-requests/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      
      const request = await storage.getRecruitmentRequest(id);
      if (!request) {
        return res.status(404).json({ message: 'Recruitment request not found' });
      }
      
      // Auto-generate credentials and create user
      const tempPassword = nanoid(12);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Create user account
      const newUser = await storage.createUser({
        email: request.recruiteeEmail,
        password: hashedPassword,
        firstName: request.recruiteeName?.split(' ')[0] || 'User',
        lastName: request.recruiteeName?.split(' ').slice(1).join(' ') || '',
        role: 'user',
        status: 'pending' // Will be activated when they complete invitation
      });
      
      // Set KYC deadline (7 days)
      const kycDeadline = new Date();
      kycDeadline.setDate(kycDeadline.getDate() + 7);
      
      // Set KYC deadline separately since it's not in create schema
      await db.update(users)
        .set({ kycDeadline })
        .where(eq(users.id, newUser.id));
      
      // Mark recruitment request as completed
      await storage.updateRecruitmentRequestStatus(id, 'completed', adminId);
      
      // Mark referral link as used
      const referralLink = await storage.getReferralLink(request.referralLinkId);
      if (referralLink) {
        await storage.markReferralLinkAsUsed(referralLink.token, newUser.id);
      }
      
      // Generate invitation token and send email
      const invitationToken = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      await storage.createEmailToken({
        email: newUser.email!,
        token: invitationToken,
        type: 'invitation',
        expiresAt
      });
      
      // Send invitation email
      const emailSent = await sendUserInvitationEmail(
        newUser.email!, 
        newUser.firstName || 'User', 
        invitationToken
      );
      
      res.json({
        message: 'Recruitment approved and user account created',
        user: newUser,
        emailSent
      });
    } catch (error) {
      console.error('Error approving recruitment request:', error);
      res.status(500).json({ message: 'Failed to approve recruitment request' });
    }
  });

  // Founder-only routes - Hidden IDs and override capabilities  
  const isFounder = (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== 'founder') {
      return res.status(403).json({ message: 'Founder access required' });
    }
    next();
  };

  app.get('/api/founder/stats', isAuthenticated, isFounder, async (req: any, res) => {
    try {
      const stats = await storage.getFounderStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching founder stats:', error);
      res.status(500).json({ message: 'Failed to fetch founder stats' });
    }
  });

  app.get('/api/founder/hidden-ids', isAuthenticated, isFounder, async (req: any, res) => {
    try {
      const hiddenIds = await storage.getHiddenIds();
      res.json(hiddenIds);
    } catch (error) {
      console.error('Error fetching hidden IDs:', error);
      res.status(500).json({ message: 'Failed to fetch hidden IDs' });
    }
  });

  app.post('/api/founder/create-hidden-id', isAuthenticated, isFounder, async (req: any, res) => {
    try {
      const { email, firstName, lastName, placementSide } = req.body;
      
      if (!email || !firstName || !lastName || !placementSide) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'Email already exists' });
      }
      
      // Check hidden ID limit (20 max)
      const currentHiddenIds = await storage.getHiddenIds();
      if (currentHiddenIds.length >= 20) {
        return res.status(400).json({ message: 'Maximum of 20 hidden IDs allowed' });
      }
      
      // Create hidden ID
      const tempPassword = nanoid(16);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      const hiddenUser = await storage.createUser({
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: 'user',
        status: 'active',
        isHiddenId: true,
        emailVerified: new Date()
      });
      
      res.json({
        message: 'Hidden ID created successfully',
        hiddenId: hiddenUser
      });
    } catch (error) {
      console.error('Error creating hidden ID:', error);
      res.status(500).json({ message: 'Failed to create hidden ID' });
    }
  });

  app.post('/api/founder/override-placement', isAuthenticated, isFounder, async (req: any, res) => {
    try {
      const { userId, newParentId, position } = req.body;
      
      if (!userId || !newParentId || !['left', 'right'].includes(position)) {
        return res.status(400).json({ message: 'Valid userId, newParentId, and position are required' });
      }
      
      await storage.overridePlacement(userId, newParentId, position);
      
      res.json({
        message: 'Placement overridden successfully'
      });
    } catch (error) {
      console.error('Error overriding placement:', error);
      res.status(500).json({ message: 'Failed to override placement' });
    }
  });

  // Additional admin endpoints for user management
  // Get wallet balances for all users
  app.get('/api/admin/wallet-balances', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const walletBalances = await storage.getAllWalletBalances();
      res.json(walletBalances);
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      res.status(500).json({ message: 'Failed to fetch wallet balances' });
    }
  });

  // Get withdrawal requests for all users
  app.get('/api/admin/withdrawal-requests', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const withdrawalRequests = await storage.getAllWithdrawalRequests();
      res.json(withdrawalRequests);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
      res.status(500).json({ message: 'Failed to fetch withdrawal requests' });
    }
  });

  // Admin login as user
  app.post('/api/admin/login-as-user/:userId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      const targetUser = await storage.getUserById(userId);

      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update session to log in as the target user
      req.session.userId = userId;
      req.session.user = targetUser;

      res.json({ message: 'Successfully logged in as user', user: targetUser });
    } catch (error) {
      console.error('Error logging in as user:', error);
      res.status(500).json({ message: 'Failed to login as user' });
    }
  });

  // Update user status (block/unblock)
  app.patch('/api/admin/users/:userId/status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive', 'pending'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const updatedUser = await storage.updateUserStatus(userId, status);

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User status updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ message: 'Failed to update user status' });
    }
  });

  // Update user details
  app.patch('/api/admin/users/:userId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.password;
      delete updateData.createdAt;

      const updatedUser = await storage.updateUser(userId, updateData);

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Remove password from response
      const { password, ...safeUser } = updatedUser;
      res.json({ message: 'User updated successfully', user: safeUser });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // Mount MLM routes with /api prefix
  app.use('/api', mlmRoutes);

  const httpServer = createServer(app);
  return httpServer;
}