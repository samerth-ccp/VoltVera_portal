import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createUserSchema, updateUserSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple session setup for basic authentication
  app.use(session({
    secret: 'voltverashop-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // set to true in production with HTTPS
      httpOnly: false, // Allow frontend access to session
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    }
  }));

  // Simple login - check email and password
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
      const user = await storage.getUserByEmailAndPassword(email, password);
      if (user) {
        // Store user in session
        (req.session as any).userId = user.id;
        console.log('Login successful, session created:', req.session.id, 'userId:', user.id);
        res.json({ success: true, user });
      } else {
        res.status(401).json({ message: "Invalid email or password" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout
  app.post('/api/logout', (req, res) => {
    (req.session as any).userId = null;
    res.json({ success: true });
  });

  // Simple auth middleware
  const isAuthenticated = async (req: any, res: any, next: any) => {
    const userId = (req.session as any)?.userId;
    console.log('Auth check - Session ID:', req.session?.id, 'User ID:', userId);
    
    if (!userId) {
      console.log('No userId in session');
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      console.log('User not found in database:', userId);
      return res.status(401).json({ message: "User not found" });
    }
    
    console.log('Auth successful for user:', user.email);
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
      const user = await storage.createUser(userData);
      res.status(201).json(user);
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

  const httpServer = createServer(app);
  return httpServer;
}