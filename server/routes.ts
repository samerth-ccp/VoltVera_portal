import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createUserSchema, updateUserSchema, signupUserSchema, passwordResetSchema, recruitUserSchema, completeUserRegistrationSchema, users, pendingRecruits, referralLinks, kycDocuments } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { sendSignupEmail, sendPasswordResetEmail, sendUserInvitationEmail } from "./emailService";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import mlmRoutes from "./mlmRoutes";
import { db } from "./db";
import { eq, lt, and, sql } from "drizzle-orm";

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
    // Try to use PostgreSQL session store with explicit configuration
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not configured');
    }
    
    sessionStore = new PgSession({
      conString: dbUrl,
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
    store: sessionStore // Use proper session store
  }));

  // Simple login - check userId and password (support both endpoints)
  const handleLogin = async (req: any, res: any) => {
    const { userId, password, rememberMe } = req.body;
    
    try {
      const user = await storage.getUserByUserIdAndPassword(userId, password);
      if (user) {
        console.log('=== LOGIN ATTEMPT SUCCESS ===');
        console.log('Request for userId:', userId, 'Found user record ID:', user.id);
        console.log('Previous session ID:', req.sessionID);
        console.log('Previous session userId:', (req.session as any)?.userId);
        
        // Regenerate session to prevent session fixation attacks
        req.session.regenerate((err: any) => {
          if (err) {
            console.error('Session regeneration error:', err);
            return res.status(500).json({ message: "Login failed" });
          }
          
          // Set session expiration based on remember me
          const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
          req.session.cookie.maxAge = maxAge;
          
          // Store user in fresh session
          (req.session as any).userId = user.id;
          (req.session as any).user = user;
          
          // Save session explicitly to ensure data is persisted
          req.session.save((saveErr: any) => {
            if (saveErr) {
              console.error('Session save error:', saveErr);
              return res.status(500).json({ message: "Login failed" });
            }
            
            console.log('=== LOGIN SESSION CREATED ===');
            console.log('New session ID:', req.sessionID);
            console.log('User stored in session:', user.id, user.userId);
            console.log('User status:', user.status, 'User role:', user.role);
            
            // Update last active timestamp
            storage.updateUser(user.id, { lastActiveAt: new Date() }).then(() => {
              res.json({ success: true, user });
            }).catch((updateError) => {
              console.error('Last active update error:', updateError);
              res.json({ success: true, user }); // Still return success
            });
          });
        });
      } else {
        console.log('Login failed for user:', userId, '- Invalid credentials');
        res.status(401).json({ message: "Invalid user ID or password" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  };
  
  app.post('/api/login', handleLogin);
  app.post('/api/auth/login', handleLogin);

  // Logout (support both GET and POST)
  const handleLogout = (req: any, res: any) => {
    console.log('Logout request for session:', req.sessionID, 'User:', (req.session as any)?.userId);
    
    if (req.session) {
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie('voltverashop.sid'); // Clear the session cookie
        console.log('Session destroyed successfully');
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
  // Legacy KYC document upload with URL
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

  // New KYC document upload with Base64 binary data
  app.post("/api/kyc/upload", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const { documentType, documentData, documentContentType, documentFilename, documentNumber } = req.body;
      
      if (!documentType || !documentData || !documentContentType || !documentFilename) {
        return res.status(400).json({ 
          message: "Document type, data, content type, and filename are required" 
        });
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

      // Validate Base64 data
      const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Pattern.test(documentData)) {
        return res.status(400).json({ 
          message: "Invalid document data format" 
        });
      }

      // Calculate file size from Base64 data
      const documentSize = Math.round((documentData.length * 3) / 4);

      // Limit file size to 10MB
      if (documentSize > 10 * 1024 * 1024) {
        return res.status(400).json({ 
          message: "Document size exceeds 10MB limit" 
        });
      }
      
      const kycData = {
        documentType,
        documentData,
        documentContentType,
        documentFilename,
        documentSize,
        documentNumber: documentNumber || undefined,
      };
      
      const document = await storage.createKYCDocumentBinary(req.session.userId!, kycData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading KYC document:", error);
      res.status(500).json({ message: "Failed to upload KYC document" });
    }
  });

  // Replace/Update KYC document with binary data
  app.put("/api/kyc/:documentId", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { documentId } = req.params;
      const { documentType, documentData, documentContentType, documentFilename, documentNumber } = req.body;
      
      if (!documentData || !documentContentType || !documentFilename) {
        return res.status(400).json({ 
          message: "Document data, content type, and filename are required" 
        });
      }

      // Validate Base64 data
      const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Pattern.test(documentData)) {
        return res.status(400).json({ 
          message: "Invalid document data format" 
        });
      }

      // Calculate file size from Base64 data
      const documentSize = Math.round((documentData.length * 3) / 4);

      // Limit file size to 10MB
      if (documentSize > 10 * 1024 * 1024) {
        return res.status(400).json({ 
          message: "Document size exceeds 10MB limit" 
        });
      }

      // Check if document exists and belongs to user
      const existingDocs = await storage.getUserKYCDocuments(req.session.userId!);
      const existingDoc = existingDocs.find(doc => doc.id === documentId);
      
      if (!existingDoc) {
        return res.status(404).json({ 
          message: "Document not found or access denied" 
        });
      }
      
      // Update the document with new binary data
      const updatedDocument = await storage.updateKYCDocument(documentId, {
        documentData,
        documentContentType,
        documentFilename,
        documentSize,
        documentNumber: documentNumber || undefined,
        status: 'pending', // Reset status to pending for review
      });
      
      res.json(updatedDocument);
    } catch (error) {
      console.error("Error replacing KYC document:", error);
      res.status(500).json({ message: "Failed to replace KYC document" });
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

  // Team management routes - call admin user creation directly
  app.post("/api/team/recruit", isAuthenticated, async (req: any, res) => {
    try {
      const recruitData = recruitUserSchema.parse(req.body);
      const recruiterId = req.user.id;
      
             // Check if email already exists
       const existingUser = await storage.getUserByEmail(recruitData.email!);
       if (existingUser) {
         return res.status(409).json({ message: "A user with this email already exists" });
       }

             // Create referral link for user recruit (different from admin workflow)
       const token = nanoid(32);
       const expiresAt = new Date();
       expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiry
       
       // Create referral link instead of invitation token
       await storage.createReferralLink({
         token,
         generatedBy: recruiterId,
         generatedByRole: req.user.role,
         placementSide: 'left', // Default to left, can be changed later
         expiresAt
       });

             // Generate referral link with correct pattern for user recruits
       let baseUrl;
       if (process.env.NODE_ENV === 'development') {
         baseUrl = 'http://localhost:5000';
       } else if (req.get('host')?.includes('replit.dev')) {
         baseUrl = `https://${req.get('host')}`;
       } else {
         baseUrl = 'https://voltveratech.com';
       }
       
       const referralLink = `${baseUrl}/recruit?ref=${token}`;
      
      res.status(201).json({ 
        message: "Referral link generated successfully",
        referralLink,
        recruitInfo: {
          name: recruitData.fullName,
          email: recruitData.email,
          referrerId: recruiterId
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error generating referral link:", error);
      res.status(500).json({ message: "Failed to generate referral link" });
    }
  });

  // Check if user has admin upline workflow
  app.get("/api/team/admin-upline-workflow", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const result = await storage.checkAdminUplineWorkflow(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error checking admin upline workflow:", error);
      res.status(500).json({ message: error.message || "Failed to check workflow" });
    }
  });

  // Create pending recruit with position selection (admin upline workflow)
  app.post("/api/team/recruit-with-position", isAuthenticated, async (req: any, res) => {
    try {
      const recruiterId = req.user.id;
      const result = recruitUserSchema.extend({
        position: z.enum(['left', 'right'])
      }).safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(result.data.email!);
      if (existingUser) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
      
      const pendingRecruit = await storage.createPendingRecruitWithPosition(result.data, recruiterId);
      
      res.status(201).json({
        message: "Recruit created with position selected! Referral link will be generated for full registration.",
        pendingRecruit: {
          id: pendingRecruit.id,
          email: pendingRecruit.email,
          fullName: pendingRecruit.fullName,
          position: pendingRecruit.position,
          status: pendingRecruit.status
        }
      });
    } catch (error: any) {
      console.error("Error creating pending recruit with position:", error);
      res.status(500).json({ message: error.message || "Failed to create pending recruit" });
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
      console.log('=== ADMIN PENDING RECRUITS REQUEST ===');
      console.log('Admin user:', req.user.email, req.user.role);
      
      // Add a test query to see all pending recruits regardless of status
      console.log('=== TESTING DATABASE QUERY ===');
      const allRecruits = await db.select().from(pendingRecruits);
      console.log('All pending recruits in database:', allRecruits.length);
      console.log('Recruits:', allRecruits.map(r => ({ 
        id: r.id, 
        email: r.email, 
        status: r.status, 
        recruiterId: r.recruiterId,
        uplineDecision: r.uplineDecision 
      })));
      
      const filteredRecruits = await storage.getPendingRecruits();
      console.log('Admin endpoint - Found pending recruits:', filteredRecruits.length);
      
      res.json(filteredRecruits);
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

  // Get documents for a specific pending recruit
  app.get("/api/admin/pending-recruits/:id/documents", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      console.log('=== FETCHING DOCUMENTS FOR PENDING RECRUIT ===');
      console.log('Recruit ID:', id);
      
      // Create temporary user ID to match what we used when storing documents
      const tempUserId = `pending_${id}`;
      
      // Fetch documents from kyc_documents table
      const documents = await db.select().from(kycDocuments).where(eq(kycDocuments.userId, tempUserId));
      
      console.log(`Found ${documents.length} documents for recruit ${id}`);
      
      // Transform documents for frontend consumption
      const transformedDocuments = documents.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        documentData: doc.documentData,
        documentContentType: doc.documentContentType,
        documentFilename: doc.documentFilename,
        documentSize: doc.documentSize,
        documentNumber: doc.documentNumber,
        status: doc.status,
        createdAt: doc.createdAt
      }));
      
      res.json(transformedDocuments);
    } catch (error) {
      console.error("Error fetching documents for pending recruit:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // TEMPORARY: Fix existing admin-generated recruits
  app.post("/api/admin/fix-existing-recruits", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      console.log('🔧 Fixing existing admin-generated recruits...');
      
      // Get all pending recruits
      const allRecruits = await db.select().from(pendingRecruits);
      console.log(`Found ${allRecruits.length} total pending recruits`);
      
      // Get all users with admin/founder roles
      const allUsers = await db.select().from(users);
      const adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'founder');
      const adminIds = adminUsers.map(u => u.id);
      console.log(`Found ${adminIds.length} admin users:`, adminIds);
      
      // Find recruits created by admin users
      const adminGeneratedRecruits = allRecruits.filter(recruit => 
        adminIds.includes(recruit.recruiterId)
      );
      console.log(`Found ${adminGeneratedRecruits.length} admin-generated recruits`);
      
      if (adminGeneratedRecruits.length === 0) {
        console.log('✅ No admin-generated recruits to fix');
        return res.json({ message: 'No admin-generated recruits to fix' });
      }
      
      // Update each admin-generated recruit
      let fixedCount = 0;
      for (const recruit of adminGeneratedRecruits) {
        console.log(`Fixing recruit ${recruit.id} (${recruit.email})`);
        
        // Update status to 'awaiting_admin' and uplineDecision to 'approved'
        await db.update(pendingRecruits)
          .set({
            status: 'awaiting_admin',
            uplineDecision: 'approved',
            updatedAt: new Date()
          })
          .where(eq(pendingRecruits.id, recruit.id));
        
        fixedCount++;
        console.log(`✅ Updated ${recruit.email}`);
      }
      
      console.log('🎉 All existing admin-generated recruits have been fixed!');
      res.json({ 
        message: 'Fixed existing admin-generated recruits', 
        fixedCount,
        recruits: adminGeneratedRecruits.map(r => ({ id: r.id, email: r.email }))
      });
      
    } catch (error) {
      console.error('❌ Error fixing recruits:', error);
      res.status(500).json({ error: 'Failed to fix existing recruits' });
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
          : `http://localhost:5173`;
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
      const { placementType, placementSide, parentId } = req.body; // Placement type, side, and optional parent ID
      const userId = req.user.id;
      const userRole = req.user.role;
      
      if (!placementType || !placementSide || !['left', 'right'].includes(placementSide)) {
        return res.status(400).json({ message: 'Valid placement type and side (left/right) are required' });
      }
      
      // Validate parentId requirement for strategic placement
      if (placementType === 'strategic' && !parentId) {
        return res.status(400).json({ message: 'Parent ID is required for strategic placement' });
      }
      
      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiry
      
      // Create referral link with placement information
      let pendingRecruitId = null;
      
      if (userRole === 'admin' || userRole === 'founder') {
        if (placementType === 'strategic') {
          // Create a temporary pending recruit to store strategic placement info
          const tempRecruit = await storage.createPendingRecruit({
            fullName: 'STRATEGIC_PLACEMENT_TEMP',
            email: `temp_${Date.now()}@strategic.local`,
            mobile: undefined
          }, parentId); // Use selected parent as recruiter
          
          // Update with strategic placement info
          await db.update(pendingRecruits)
            .set({ 
              uplineId: parentId,
              position: placementSide,
              status: 'awaiting_admin',
              uplineDecision: 'approved'
            })
            .where(eq(pendingRecruits.id, tempRecruit.id));
          
          pendingRecruitId = tempRecruit.id;
          console.log('Created temporary strategic placement recruit:', tempRecruit.id);
        } else if (placementType === 'auto' || placementType === 'root') {
          // For auto/root placement, create a temporary recruit with special markers
          const tempRecruit = await storage.createPendingRecruit({
            fullName: placementType === 'auto' ? 'AUTO_PLACEMENT_TEMP' : 'ROOT_PLACEMENT_TEMP',
            email: `temp_${Date.now()}@${placementType}.local`,
            mobile: undefined
          }, 'admin-demo'); // Use admin as default recruiter
          
          // Update with placement type info
          await db.update(pendingRecruits)
            .set({ 
              uplineId: placementType === 'root' ? null : 'admin-demo',
              position: placementSide,
              status: 'awaiting_admin',
              uplineDecision: 'approved'
            })
            .where(eq(pendingRecruits.id, tempRecruit.id));
          
          pendingRecruitId = tempRecruit.id;
          console.log(`Created temporary ${placementType} placement recruit:`, tempRecruit.id);
        }
      }
      
      const referralLink = await storage.createReferralLink({
        token,
        generatedBy: userId,
        generatedByRole: userRole,
        placementSide,
        pendingRecruitId: pendingRecruitId, // Link to strategic placement info
        expiresAt
      });
      
      console.log('Creating strategic referral link:', {
        token,
        parentId,
        placementSide,
        generatedBy: userId,
        pendingRecruitId
      });
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://voltveratech.com' 
        : 'http://localhost:5000';
      const fullUrl = `${baseUrl}/recruit?ref=${token}`;
      
      res.json({
        referralLink,
        url: fullUrl,
        expiresIn: '48 hours',
        placementType: placementType,
        parentId: parentId || null,
        placementSide: placementSide,
        message: `${placementType === 'strategic' ? 'Strategic' : placementType === 'auto' ? 'Auto' : 'Root'} referral link generated. User will complete registration through the link.`
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
      
      // Create or update pending recruit record
      let pendingRecruitId;
      
      if (referralLink.pendingRecruitId) {
        // Update existing pending recruit
        await storage.updatePendingRecruitDetails(referralLink.pendingRecruitId, {
          fullName: recruiteeName,
          email: recruiteeEmail,
          status: 'awaiting_admin'
        });
        pendingRecruitId = referralLink.pendingRecruitId;
      } else {
        // Create new pending recruit record for direct referral link registration
        let recruiterId = referralLink.generatedBy;
        let uplineId = referralLink.generatedBy;
        
        // Check if this is a placement referral link
        if (referralLink.pendingRecruitId) {
          const placementRecruit = await db.select().from(pendingRecruits).where(eq(pendingRecruits.id, referralLink.pendingRecruitId)).limit(1);
          if (placementRecruit.length > 0) {
            const recruit = placementRecruit[0];
            
            if (recruit.fullName === 'STRATEGIC_PLACEMENT_TEMP') {
              // Strategic placement - use stored parent and position
              recruiterId = recruit.recruiterId || referralLink.generatedBy;
              uplineId = recruit.uplineId || referralLink.generatedBy;
              
              console.log('Using strategic placement info:', {
                recruiterId,
                uplineId,
                position: recruit.position
              });
            } else if (recruit.fullName === 'AUTO_PLACEMENT_TEMP') {
              // Auto placement - system will find best position
              recruiterId = referralLink.generatedBy;
              uplineId = referralLink.generatedBy;
              
              console.log('Using auto placement - system will find best position');
            } else if (recruit.fullName === 'ROOT_PLACEMENT_TEMP') {
              // Root placement - place at top level
              recruiterId = referralLink.generatedBy;
              uplineId = 'root'; // Special marker for root placement
              
              console.log('Using root placement - user will be at top level');
            }
            
            // Delete the temporary placement recruit
            await db.delete(pendingRecruits).where(eq(pendingRecruits.id, referralLink.pendingRecruitId));
          }
        }
        
        const pendingRecruit = await storage.createPendingRecruit({
          fullName: recruiteeName,
          email: recruiteeEmail,
          mobile: undefined
        }, recruiterId);
        
        // Update with strategic placement info if available
        if (referralLink.pendingRecruitId) {
          const strategicRecruit = await db.select().from(pendingRecruits).where(eq(pendingRecruits.id, referralLink.pendingRecruitId)).limit(1);
          if (strategicRecruit.length > 0 && strategicRecruit[0].fullName === 'STRATEGIC_PLACEMENT_TEMP') {
            await db.update(pendingRecruits)
              .set({ 
                uplineId: strategicRecruit[0].uplineId || referralLink.generatedBy,
                position: strategicRecruit[0].position || 'left',
                updatedAt: new Date()
              })
              .where(eq(pendingRecruits.id, pendingRecruit.id));
          }
        }
        
        pendingRecruitId = pendingRecruit.id;
      }
      
      // Mark referral link as used
      await storage.markReferralLinkAsUsed(token, pendingRecruitId);
      
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
        password: tempPassword, // Use original password, not hashed
        firstName: request.recruiteeName?.split(' ')[0] || 'User',
        lastName: request.recruiteeName?.split(' ').slice(1).join(' ') || '',
        role: 'user',
        // status: 'pending' will be set in user creation process separately
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
        password: tempPassword, // Use original password, not hashed
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
      (req.session as any).user = targetUser;

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

  // Admin referral link generation
  app.post('/api/admin/generate-referral-link', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { parentUserId, position, expirationHours = 168 } = req.body; // Default 7 days
      
      if (!parentUserId || !position) {
        return res.status(400).json({ message: 'Parent user ID and position are required' });
      }
      
      if (!['left', 'right'].includes(position)) {
        return res.status(400).json({ message: 'Position must be "left" or "right"' });
      }
      
      // Verify parent user exists
      const parentUser = await storage.getUserById(parentUserId);
      if (!parentUser) {
        return res.status(404).json({ message: 'Parent user not found' });
      }
      
      // Generate unique token
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
      
      // Create referral link
      const referralLink = await storage.createReferralLink({
        token,
        generatedBy: req.session.userId!,
        generatedByRole: 'admin',
        placementSide: position,
        expiresAt
      });
      
      const registrationUrl = `${req.protocol}://${req.get('host')}/referral-register?token=${token}`;
      
      res.json({
        message: 'Referral link generated successfully',
        referralLink: {
          ...referralLink,
          registrationUrl,
          parentUser: {
            id: parentUser.id,
            name: `${parentUser.firstName} ${parentUser.lastName}`,
            email: parentUser.email
          }
        }
      });
    } catch (error) {
      console.error('Error generating referral link:', error);
      res.status(500).json({ message: 'Failed to generate referral link' });
    }
  });
  
  // Get all referral links (admin)
  app.get('/api/admin/referral-links', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const links = await storage.getReferralLinks();
      res.json(links);
    } catch (error) {
      console.error('Error fetching referral links:', error);
      res.status(500).json({ message: 'Failed to fetch referral links' });
    }
  });
  
  // Validate referral token (public endpoint) - with query parameter support
  app.get('/api/referral/validate', async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ message: 'Token parameter is required' });
      }
      
      const referralLink = await storage.getReferralLink(token);
      if (!referralLink) {
        return res.status(404).json({ message: 'Invalid referral link', valid: false });
      }
      
      if (referralLink.isUsed) {
        return res.status(400).json({ message: 'Referral link has already been used', valid: false });
      }
      
      if (referralLink.expiresAt < new Date()) {
        return res.status(400).json({ message: 'Referral link has expired', valid: false });
      }
      
      res.json({
        valid: true,
        placementSide: referralLink.placementSide,
        generatedBy: referralLink.generatedBy
      });
    } catch (error) {
      console.error('Error validating referral token:', error);
      res.status(500).json({ message: 'Failed to validate referral token', valid: false });
    }
  });

  // Validate referral token (public endpoint) - original with path parameter
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
      
      if (referralLink.expiresAt < new Date()) {
        return res.status(400).json({ message: 'Referral link has expired' });
      }
      
      res.json({
        valid: true,
        placementSide: referralLink.placementSide,
        generatedBy: referralLink.generatedBy
      });
    } catch (error) {
      console.error('Error validating referral token:', error);
      res.status(500).json({ message: 'Failed to validate referral token' });
    }
  });

  // Object Storage routes
  app.post('/api/objects/upload', isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error('Error getting upload URL:', error);
      res.status(500).json({ error: 'Failed to get upload URL' });
    }
  });

  // Serve documents with proper access control and object storage integration  
  app.get('/api/documents/*', isAuthenticated, async (req, res) => {
    try {
      const documentPath = req.path.replace('/api/documents/', '');
      const requestingUserId = (req.session as any)?.userId;
      const requestingUser = (req.session as any)?.user;
      
      // Check if the requesting user has permission to access this document
      // Admins can access any document, users can only access their own documents
      let hasPermission = false;
      
      if (requestingUser?.role === 'admin') {
        hasPermission = true;
      } else {
        // Check if this document belongs to the requesting user
        // For legacy documents, check profileImageUrl and KYC documents
        const userKycDocs = await storage.getUserKYCDocuments(requestingUserId);
        const userProfile = await storage.getUserById(requestingUserId);
        
        // Check if the document matches the user's profile image
        // Handle both full URLs and path-only formats
        if (userProfile?.profileImageUrl?.includes(documentPath) || 
            userProfile?.profileImageUrl?.endsWith(documentPath)) {
          hasPermission = true;
          console.log(`Document access granted: ${documentPath} matches user profile image for ${requestingUser?.userId}`);
        }
        
        // Check if the document is in the user's KYC documents
        // Handle both full URLs and path-only formats
        for (const doc of userKycDocs) {
          if (doc.documentUrl && (doc.documentUrl.includes(documentPath) || 
              doc.documentUrl.endsWith(documentPath))) {
            hasPermission = true;
            console.log(`Document access granted: ${documentPath} matches KYC document for ${requestingUser?.userId}`);
            break;
          }
        }
        
        // Also check if the document path matches the filename pattern
        // This handles cases where documents are accessed by filename only
        const filename = documentPath.split('/').pop();
        if (filename && userProfile?.profileImageUrl?.includes(filename)) {
          hasPermission = true;
          console.log(`Document access granted: ${filename} matches user profile image filename for ${requestingUser?.userId}`);
        }
        
        for (const doc of userKycDocs) {
          const docFilename = doc.documentUrl?.split('/').pop();
          if (filename && docFilename === filename) {
            hasPermission = true;
            console.log(`Document access granted: ${filename} matches KYC document filename for ${requestingUser?.userId}`);
            break;
          }
        }
      }
      
      if (!hasPermission) {
        console.log(`Access denied: User ${requestingUserId} (${requestingUser?.userId}) attempted to access document ${documentPath}`);
        return res.status(403).json({ error: 'Access denied: You can only view your own documents' });
      }
      
      // If user has permission, try to serve the document
      try {
        // First check if this is a binary document stored in the database
        // Try to find by filename in binary KYC documents
        const userKycDocs = await storage.getUserKYCDocuments(requestingUserId);
        const filename = documentPath.split('/').pop();
        
        for (const doc of userKycDocs) {
          // Check if this document has binary data and matches the requested path/filename
          if (doc.documentData && doc.documentFilename && 
              (doc.documentFilename === filename || 
               documentPath.includes(doc.documentFilename) ||
               (doc.documentUrl && (doc.documentUrl.includes(documentPath) || doc.documentUrl.endsWith(documentPath))))) {
            
            console.log(`Serving binary document from database: ${doc.documentFilename} for user ${requestingUser?.userId}`);
            
            // Serve the binary document from database
            const binaryData = Buffer.from(doc.documentData, 'base64');
            
            res.set({
              'Content-Type': doc.documentContentType || 'application/octet-stream',
              'Content-Length': binaryData.length.toString(),
              'Cache-Control': 'private, max-age=3600',
              'Content-Disposition': `inline; filename="${doc.documentFilename}"`,
            });
            
            return res.send(binaryData);
          }
        }
        
        // If not found in database, try object storage
        const { ObjectStorageService } = await import('./objectStorage');
        const objectStorageService = new ObjectStorageService();
        
        // Try to find in object storage public directories first
        let documentFile = await objectStorageService.searchPublicObject(documentPath);
        
        if (documentFile) {
          return objectStorageService.downloadObject(documentFile, res);
        }
        
        // Try legacy storage as fallback
        const legacyUrl = `https://storage.googleapis.com/documents/${documentPath}`;
        try {
          const response = await fetch(legacyUrl);
          
          if (response.ok) {
            const contentType = response.headers.get('content-type') || 'application/octet-stream';
            const contentLength = response.headers.get('content-length');
            
            res.set({
              'Content-Type': contentType,
              'Cache-Control': 'private, max-age=3600',
            });
            
            if (contentLength) {
              res.set('Content-Length', contentLength);
            }
            
            return response.body?.pipe(res);
          }
        } catch (fetchError) {
          console.log('Legacy document not accessible');
        }
        
        // Document not found in any storage but user has permission
        console.log(`Document not found but access permitted: ${documentPath} for user ${requestingUserId}`);
        throw new Error('Document not found');
        
      } catch (storageError) {
        // Document not found - serve informative placeholder for authorized user
        const isImage = documentPath.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/);
        const isPdf = documentPath.toLowerCase().endsWith('.pdf');
        
        if (isImage) {
          res.set({
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'private, max-age=3600',
          });
          
          const placeholderSvg = `
            <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#f3f4f6" stroke="#e5e7eb" stroke-width="2"/>
              <text x="50%" y="35%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">
                Document: ${documentPath}
              </text>
              <text x="50%" y="50%" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af">
                (Original document not accessible)
              </text>
              <text x="50%" y="65%" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af">
                Please re-upload this document
              </text>
            </svg>
          `;
          
          return res.send(placeholderSvg);
        } else if (isPdf) {
          res.set({
            'Content-Type': 'text/plain',
            'Cache-Control': 'private, max-age=3600',
          });
          
          return res.send(`PDF Document: ${documentPath}\n\nOriginal document not accessible - please re-upload.`);
        } else {
          res.set({
            'Content-Type': 'text/plain',
            'Cache-Control': 'private, max-age=3600',
          });
          
          return res.send(`Document: ${documentPath}\n\nOriginal document not accessible - please re-upload.`);
        }
      }
      
    } catch (error) {
      console.error('Error serving document:', error);
      res.status(500).json({ error: 'Failed to serve document' });
    }
  });

  // Serve private documents to authenticated users
  app.get('/api/objects/*', isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService, ObjectNotFoundError } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      
      // Extract the object path from the URL
      const objectPath = req.path.replace('/api', '');
      
      // Get the file from object storage
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      
      // Stream the file to the response
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error('Error serving private document:', error);
      if (error instanceof (await import('./objectStorage')).ObjectNotFoundError) {
        return res.status(404).json({ error: 'Document not found' });
      }
      res.status(500).json({ error: 'Failed to serve document' });
    }
  });

  // Complete registration endpoint - Creates pending recruit for admin approval
  app.post('/api/referral/complete-registration', async (req, res) => {
    try {
      // Debug: Log what's being received
      console.log('Received registration data:', req.body);
      console.log('Document fields:', {
        panCardUrl: req.body.panCardUrl,
        aadhaarCardUrl: req.body.aadhaarCardUrl,
        bankStatementUrl: req.body.bankStatementUrl,
        photoUrl: req.body.photoUrl
      });
      
      const validationResult = completeUserRegistrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log('Validation failed:', validationResult.error.flatten());
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.flatten() 
        });
      }

      const data = validationResult.data;
      
      // Validate referral token
      const referralLink = await storage.getReferralLink(data.referralToken);
      if (!referralLink) {
        return res.status(404).json({ message: 'Invalid referral link' });
      }
      
      if (referralLink.isUsed) {
        return res.status(400).json({ message: 'Referral link has already been used' });
      }
      
      if (referralLink.expiresAt < new Date()) {
        return res.status(400).json({ message: 'Referral link has expired' });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(409).json({ 
          message: 'An account with this email already exists. Please use a different email address or try logging in.',
          error: 'DUPLICATE_EMAIL'
        });
      }

      // Create a comprehensive pending recruit record for admin approval
      const pendingRecruit = await storage.createComprehensivePendingRecruit({
        fullName: `${data.firstName} ${data.lastName}`,
        email: data.email,
        mobile: data.mobile,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        panNumber: data.panNumber,
        aadhaarNumber: data.aadhaarNumber,
        bankAccountNumber: data.bankAccountNumber,
        bankIFSC: data.bankIFSC,
        bankName: data.bankName,
        packageAmount: data.packageAmount,
        panCardUrl: data.panCardUrl,
        aadhaarCardUrl: data.aadhaarCardUrl,
        bankStatementUrl: data.bankStatementUrl,
        profileImageUrl: data.photoUrl,
        password: data.password, // Store securely for later use
      }, referralLink.generatedBy, referralLink.placementSide);
      
      // Now handle document uploads and link them to the pending recruit
      // We'll create a temporary user ID based on the pending recruit ID for document linking
      const tempUserId = `pending_${pendingRecruit.id}`;
      
      console.log('🔍 Document Processing Debug:');
      console.log('  - tempUserId:', tempUserId);
      console.log('  - panCardUrl exists:', !!data.panCardUrl);
      console.log('  - panCardUrl starts with data:', data.panCardUrl?.startsWith('data:'));
      console.log('  - aadhaarCardUrl exists:', !!data.aadhaarCardUrl);
      console.log('  - aadhaarCardUrl starts with data:', data.aadhaarCardUrl?.startsWith('data:'));
      console.log('  - bankStatementUrl exists:', !!data.bankStatementUrl);
      console.log('  - bankStatementUrl starts with data:', data.bankStatementUrl?.startsWith('data:'));
      console.log('  - photoUrl exists:', !!data.photoUrl);
      console.log('  - photoUrl starts with data:', data.photoUrl?.startsWith('data:'));
      
      // Upload documents if provided and link them to the pending recruit
      const documentUploads = [];
      
      if (data.panCardUrl && data.panCardUrl.startsWith('data:')) {
        console.log('📄 Processing PAN Card document...');
        // Extract base64 data from data URL
        const base64Data = data.panCardUrl.split(',')[1];
        const contentType = data.panCardUrl.split(';')[0].split(':')[1];
        
        console.log('  - Base64 data length:', base64Data.length);
        console.log('  - Content type:', contentType);
        
        try {
          const panDoc = await storage.createKYCDocumentBinary(tempUserId, {
            documentType: 'panCard',
            documentData: base64Data,
            documentContentType: contentType,
            documentFilename: 'pan_card.jpg',
            documentSize: Math.round((base64Data.length * 3) / 4),
            documentNumber: data.panNumber,
          });
          console.log('  ✅ PAN Card document created with ID:', panDoc.id);
          documentUploads.push({ type: 'panCard', id: panDoc.id });
        } catch (error) {
          console.error('  ❌ Error creating PAN Card document:', error);
        }
      }
      
      if (data.aadhaarCardUrl && data.aadhaarCardUrl.startsWith('data:')) {
        console.log('📄 Processing Aadhaar Card document...');
        const base64Data = data.aadhaarCardUrl.split(',')[1];
        const contentType = data.aadhaarCardUrl.split(';')[0].split(':')[1];
        
        console.log('  - Base64 data length:', base64Data.length);
        console.log('  - Content type:', contentType);
        
        try {
          const aadhaarDoc = await storage.createKYCDocumentBinary(tempUserId, {
            documentType: 'aadhaarCard',
            documentData: base64Data,
            documentContentType: contentType,
            documentFilename: 'aadhaar_card.jpg',
            documentSize: Math.round((base64Data.length * 3) / 4),
            documentNumber: data.aadhaarNumber,
          });
          console.log('  ✅ Aadhaar Card document created with ID:', aadhaarDoc.id);
          documentUploads.push({ type: 'aadhaarCard', id: aadhaarDoc.id });
        } catch (error) {
          console.error('  ❌ Error creating Aadhaar Card document:', error);
        }
      }
      
      if (data.bankStatementUrl && data.bankStatementUrl.startsWith('data:')) {
        console.log('📄 Processing Bank Statement document...');
        const base64Data = data.bankStatementUrl.split(',')[1];
        const contentType = data.bankStatementUrl.split(';')[0].split(':')[1];
        
        console.log('  - Base64 data length:', base64Data.length);
        console.log('  - Content type:', contentType);
        
        try {
          const bankDoc = await storage.createKYCDocumentBinary(tempUserId, {
            documentType: 'bankStatement',
            documentData: base64Data,
            documentContentType: contentType,
            documentFilename: 'bank_statement.jpg',
            documentSize: Math.round((base64Data.length * 3) / 4),
          });
          console.log('  ✅ Bank Statement document created with ID:', bankDoc.id);
          documentUploads.push({ type: 'bankStatement', id: bankDoc.id });
        } catch (error) {
          console.error('  ❌ Error creating Bank Statement document:', error);
        }
      }
      
      if (data.photoUrl && data.photoUrl.startsWith('data:')) {
        console.log('📄 Processing Photo document...');
        const base64Data = data.photoUrl.split(',')[1];
        const contentType = data.photoUrl.split(';')[0].split(':')[1];
        
        console.log('  - Base64 data length:', base64Data.length);
        console.log('  - Content type:', contentType);
        
        try {
          const photoDoc = await storage.createKYCDocumentBinary(tempUserId, {
            documentType: 'photo',
            documentData: base64Data,
            documentContentType: contentType,
            documentFilename: 'profile_photo.jpg',
            documentSize: Math.round((base64Data.length * 3) / 4),
          });
          console.log('  ✅ Photo document created with ID:', photoDoc.id);
          documentUploads.push({ type: 'photo', id: photoDoc.id });
        } catch (error) {
          console.error('  ❌ Error creating Photo document:', error);
        }
      }
      
      console.log('📊 Document Processing Summary:');
      console.log('  - Total documents processed:', documentUploads.length);
      console.log('  - Document uploads:', documentUploads);
      
      // Mark referral link as used
      await storage.markReferralLinkAsUsed(data.referralToken, pendingRecruit.id);

      res.status(201).json({
        message: 'Registration submitted successfully! Your application has been sent for upline approval first, then admin approval. You will receive login credentials via email once both approvals are complete.',
        status: 'awaiting_upline',
        recruitId: pendingRecruit.id,
        documentsUploaded: documentUploads.length
      });
    } catch (error: any) {
      console.error('Error completing registration:', error);
      
      // Handle duplicate email error
      if (error.code === '23505' && error.constraint?.includes('email')) {
        return res.status(409).json({ 
          message: 'An account with this email already exists. Please use a different email address or try logging in.',
          error: 'DUPLICATE_EMAIL'
        });
      }
      
      res.status(500).json({ message: 'Failed to complete registration' });
    }
  });

  // User profile update endpoint for pending users
  app.put('/api/user/profile', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Allow pending users to update their profile
      if (user.status !== 'pending' && user.status !== 'active') {
        return res.status(403).json({ message: 'Profile updates not allowed for your account status' });
      }

      const updatedUser = await storage.updateUser(userId, req.body);
      res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // Get pending users for admin approval
  app.get('/api/admin/pending-users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      res.status(500).json({ message: 'Failed to fetch pending users' });
    }
  });

  // Admin approve pending user
  app.patch('/api/admin/users/:userId/approve', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.status !== 'pending') {
        return res.status(400).json({ message: 'User is not in pending status' });
      }

      // Activate the user
      const updatedUser = await storage.updateUser(userId, { 
        status: 'active',
        activationDate: new Date()
      });

      res.json({ 
        message: 'User approved successfully', 
        user: updatedUser 
      });
    } catch (error) {
      console.error('Error approving user:', error);
      res.status(500).json({ message: 'Failed to approve user' });
    }
  });

  // Admin reject pending user
  app.patch('/api/admin/users/:userId/reject', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.status !== 'pending') {
        return res.status(400).json({ message: 'User is not in pending status' });
      }

      // Reject the user (set status to rejected)
      const updatedUser = await storage.updateUser(userId, { 
        status: 'rejected'
      });

      res.json({ 
        message: 'User rejected successfully', 
        user: updatedUser 
      });
    } catch (error) {
      console.error('Error rejecting user:', error);
      res.status(500).json({ message: 'Failed to reject user' });
    }
  });

  // Mount MLM routes with /api prefix
  app.use('/api', mlmRoutes);

  // ===== ADMIN STRATEGIC USER CREATION WITH PLACEMENT CONTROL =====
  
  // Get all users for parent selection in admin user creation
  app.get('/api/admin/users-for-placement', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsersForPlacement();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users for placement:', error);
      res.status(500).json({ message: 'Failed to fetch users for placement' });
    }
  });

  // Admin create user with strategic placement
  app.post('/api/admin/users/create-with-placement', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        mobile,
        packageAmount,
        parentId,        // Strategic parent placement
        position,        // 'left' or 'right'
        sponsorId,       // Optional: different from parent
        profileData      // Additional profile fields
      } = req.body;

      console.log('=== ADMIN STRATEGIC USER CREATION ===');
      console.log('Email:', email);
      console.log('Parent ID:', parentId);
      console.log('Position:', position);
      console.log('Package Amount:', packageAmount);

      // Validate required fields
      if (!email || !password || !firstName || !lastName || !parentId || !position) {
        return res.status(400).json({ 
          message: 'Missing required fields: email, password, firstName, lastName, parentId, position' 
        });
      }

      if (!['left', 'right'].includes(position)) {
        return res.status(400).json({ 
          message: 'Position must be either "left" or "right"' 
        });
      }

      // Create user with strategic placement
      const newUser = await storage.createUserWithStrategicPlacement({
        email,
        password,
        firstName,
        lastName,
        mobile,
        packageAmount: packageAmount || '0.00',
        parentId,
        position,
        sponsorId: sponsorId || parentId,
        profileData: profileData || {}
      });

      res.status(201).json({
        message: 'User created successfully with strategic placement',
        user: newUser,
        placement: {
          parentId,
          position,
          level: newUser.level
        }
      });

    } catch (error) {
      console.error('Error creating user with strategic placement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      res.status(500).json({ 
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      });
    }
  });

  // Clean up expired referral links and temporary recruits periodically
  setInterval(async () => {
    try {
      const now = new Date();
      
      // Delete expired referral links
      const expiredLinks = await db.delete(referralLinks)
        .where(lt(referralLinks.expiresAt, now));
      
      if (expiredLinks.rowCount > 0) {
        console.log(`Cleaned up ${expiredLinks.rowCount} expired referral links`);
      }
      
      // Clean up temporary placement recruits that are older than 1 hour
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const tempRecruits = await db.delete(pendingRecruits)
        .where(
          and(
            sql`full_name LIKE '%_PLACEMENT_TEMP'`,
            lt(pendingRecruits.createdAt, oneHourAgo)
          )
        );
      
      if (tempRecruits.rowCount > 0) {
        console.log(`Cleaned up ${tempRecruits.rowCount} old temporary placement recruits`);
      }
    } catch (error) {
      console.error('Error in periodic cleanup:', error);
    }
  }, 60 * 60 * 1000); // Run every hour

  const httpServer = createServer(app);
  return httpServer;
}