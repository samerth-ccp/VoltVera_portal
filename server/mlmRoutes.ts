import { Router } from "express";
import { storage } from "./storage";
import {
  createProductSchema,
  createPurchaseSchema,
  createWithdrawalSchema,
  createKYCSchema,
  createFranchiseRequestSchema,
  createSupportTicketSchema,
  createNewsSchema,
  updateUserProfileSchema,
  type CreateProduct,
  type CreatePurchase,
  type CreateWithdrawal,
  type CreateKYC,
  type CreateFranchiseRequest,
  type CreateSupportTicket,
  type CreateNews,
  type UpdateUserProfile
} from "@shared/schema";

// Extend session type to include userId
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

const router = Router();

// Middleware to check authentication
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Middleware to check admin role
const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (error: any) {
    console.error('Admin auth error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

// ===== ADMIN ROUTES =====
// Get enhanced admin statistics
router.get('/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await storage.getAdminStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch admin statistics' });
  }
});

// Enhanced user search for admin
router.get('/admin/users/search', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { query = '', searchType, status, role, kycStatus } = req.query;
    
    const users = await storage.searchUsers(query as string, {
      searchType: searchType as 'id' | 'name' | 'bv' | 'rank',
      status: status as string,
      role: role as string,
      kycStatus: kycStatus as string,
    });
    
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Failed to search users' });
  }
});

// ===== PRODUCT ROUTES =====
// Get all products
router.get('/products', requireAuth, async (req, res) => {
  try {
    const products = await storage.getAllProducts();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Get products by type
router.get('/products/type/:type', requireAuth, async (req, res) => {
  try {
    const { type } = req.params;
    if (type !== 'first_purchase' && type !== 'second_purchase') {
      return res.status(400).json({ message: 'Invalid product type' });
    }
    const products = await storage.getProductsByType(type);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products by type:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Create product (Admin only)
router.post('/admin/products', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = createProductSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid product data', errors: result.error.errors });
    }
    
    const product = await storage.createProduct(result.data);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Update product (Admin only)
router.patch('/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await storage.updateProduct(id, req.body);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// ===== PURCHASE ROUTES =====
// Create purchase
router.post('/purchases', requireAuth, async (req, res) => {
  try {
    const result = createPurchaseSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid purchase data', errors: result.error.errors });
    }
    
    const purchase = await storage.createPurchase(req.session.userId!, result.data);
    res.status(201).json(purchase);
  } catch (error: any) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ message: error.message || 'Failed to create purchase' });
  }
});

// Get user purchases
router.get('/purchases', requireAuth, async (req, res) => {
  try {
    const purchases = await storage.getUserPurchases(req.session.userId!);
    res.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ message: 'Failed to fetch purchases' });
  }
});

// ===== WALLET ROUTES =====
// Get wallet balance
router.get('/wallet', requireAuth, async (req, res) => {
  try {
    let wallet = await storage.getWalletBalance(req.session.userId!);
    if (!wallet) {
      wallet = await storage.createWalletBalance(req.session.userId!);
    }
    res.json(wallet);
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ message: 'Failed to fetch wallet' });
  }
});

// Get transaction history
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const transactions = await storage.getUserTransactions(req.session.userId!);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// ===== WITHDRAWAL ROUTES =====
// Create withdrawal request
router.post('/withdrawals', requireAuth, async (req, res) => {
  try {
    const result = createWithdrawalSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid withdrawal data', errors: result.error.errors });
    }
    
    const withdrawal = await storage.createWithdrawalRequest(req.session.userId!, result.data);
    res.status(201).json(withdrawal);
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    res.status(500).json({ message: (error as any).message || 'Failed to create withdrawal request' });
  }
});

// Get user withdrawal requests
router.get('/withdrawals', requireAuth, async (req, res) => {
  try {
    const withdrawals = await storage.getUserWithdrawals(req.session.userId!);
    res.json(withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ message: 'Failed to fetch withdrawals' });
  }
});

// Get all withdrawal requests (Admin only)
router.get('/admin/withdrawals', requireAuth, requireAdmin, async (req, res) => {
  try {
    const withdrawals = await storage.getAllWithdrawals();
    res.json(withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ message: 'Failed to fetch withdrawals' });
  }
});

// Update withdrawal status (Admin only)
router.patch('/admin/withdrawals/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const success = await storage.updateWithdrawalStatus(id, status, adminNotes);
    if (!success) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }
    res.json({ message: 'Withdrawal status updated successfully' });
  } catch (error) {
    console.error('Error updating withdrawal:', error);
    res.status(500).json({ message: 'Failed to update withdrawal status' });
  }
});

// ===== KYC ROUTES =====
// Get user KYC documents
router.get('/kyc', requireAuth, async (req, res) => {
  try {
    const documents = await storage.getUserKYCDocuments(req.session.userId!);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching KYC documents:', error);
    res.status(500).json({ message: 'Failed to fetch KYC documents' });
  }
});

// Upload KYC document
router.post('/kyc', requireAuth, async (req, res) => {
  try {
    const result = createKYCSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid KYC data', errors: result.error.errors });
    }
    
    const document = await storage.createKYCDocument(req.session.userId!, result.data);
    res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading KYC document:', error);
    res.status(500).json({ message: 'Failed to upload KYC document' });
  }
});

// Replace/update existing KYC document
router.put('/kyc/:documentId', requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const result = createKYCSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid KYC data', errors: result.error.errors });
    }
    
    // Check if document belongs to the current user
    const existingDoc = await storage.getKYCDocumentById(documentId);
    if (!existingDoc || existingDoc.userId !== req.session.userId!) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const updatedDocument = await storage.updateKYCDocument(documentId, result.data);
    res.json(updatedDocument);
  } catch (error) {
    console.error('Error updating KYC document:', error);
    res.status(500).json({ message: 'Failed to update KYC document' });
  }
});

// Get all pending KYC (Admin only)
router.get('/admin/kyc', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 KYC endpoint called by user:', req.session.userId);
    const documents = await storage.getAllPendingKYC();
    console.log('📊 KYC documents found:', documents.length);
    res.json(documents);
  } catch (error) {
    console.error('❌ Error fetching pending KYC:', error);
    res.status(500).json({ message: 'Failed to fetch pending KYC', error: error.message });
  }
});

// Update KYC status (Admin only)
router.patch('/admin/kyc/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const success = await storage.updateKYCStatus(id, status, rejectionReason);
    if (!success) {
      return res.status(404).json({ message: 'KYC document not found' });
    }
    res.json({ message: 'KYC status updated successfully' });
  } catch (error) {
    console.error('Error updating KYC status:', error);
    res.status(500).json({ message: 'Failed to update KYC status' });
  }
});

// Create KYC records for existing users (Admin only)
router.post('/admin/kyc/create-for-existing', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Get user data
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create KYC records for the user
    await storage.createKYCRecordsForExistingUser(userId, user);
    
    res.json({ message: 'KYC records created successfully for existing user' });
  } catch (error) {
    console.error('Error creating KYC records for existing user:', error);
    res.status(500).json({ message: 'Failed to create KYC records' });
  }
});

// Create KYC records for ALL existing users (Admin only) - One-time migration
router.post('/admin/kyc/migrate-all-users', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('🚀 Starting KYC migration for all existing users...');
    
    // Get all active users
    const users = await storage.getAllUsers();
    console.log(`📊 Found ${users.length} users to process`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        await storage.createKYCRecordsForExistingUser(user.id, user);
        processedCount++;
        console.log(`✅ Processed user ${user.userId} (${user.email})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing user ${user.userId}:`, error);
      }
    }
    
    res.json({ 
      message: 'KYC migration completed', 
      processed: processedCount, 
      errors: errorCount,
      total: users.length 
    });
  } catch (error) {
    console.error('Error during KYC migration:', error);
    res.status(500).json({ message: 'Failed to migrate KYC records' });
  }
});

// Get KYC documents for a specific user (Admin only)
router.get('/admin/kyc/:userId/documents', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 Fetching KYC documents for user:', userId);
    
    // Fetch documents from kyc_documents table
    const documents = await db.select().from(kycDocuments).where(eq(kycDocuments.userId, userId));
    
    console.log(`Found ${documents.length} documents for user ${userId}`);
    
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
      rejectionReason: doc.rejectionReason,
      reviewedBy: doc.reviewedBy,
      reviewedAt: doc.reviewedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }));
    
    res.json(transformedDocuments);
  } catch (error) {
    console.error('❌ Error fetching KYC documents:', error);
    res.status(500).json({ message: 'Failed to fetch KYC documents', error: error.message });
  }
});

// Debug endpoint to check KYC records (Admin only)
router.get('/admin/kyc/debug', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { kycDocuments, users } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    // Get all KYC records
    const allKYC = await db.select().from(kycDocuments);
    console.log('🔍 All KYC records:', allKYC);
    
    // Get KYC records with user info
    const kycWithUsers = await db
      .select({
        kycId: kycDocuments.id,
        userId: kycDocuments.userId,
        documentType: kycDocuments.documentType,
        status: kycDocuments.status,
        userUserId: users.userId,
        userEmail: users.email,
        userStatus: users.status
      })
      .from(kycDocuments)
      .leftJoin(users, eq(kycDocuments.userId, users.id));
    
    res.json({
      totalKYCRecords: allKYC.length,
      kycRecords: allKYC,
      kycWithUsers: kycWithUsers
    });
  } catch (error) {
    console.error('Error in KYC debug endpoint:', error);
    res.status(500).json({ message: 'Failed to debug KYC records', error: error.message });
  }
});

// ===== RANK ROUTES =====
// Get user rank history
router.get('/ranks', requireAuth, async (req, res) => {
  try {
    const achievements = await storage.getUserRankHistory(req.session.userId!);
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching rank history:', error);
    res.status(500).json({ message: 'Failed to fetch rank history' });
  }
});

// Check rank eligibility
router.get('/ranks/eligibility', requireAuth, async (req, res) => {
  try {
    const eligibility = await storage.checkRankEligibility(req.session.userId!);
    res.json(eligibility);
  } catch (error) {
    console.error('Error checking rank eligibility:', error);
    res.status(500).json({ message: 'Failed to check rank eligibility' });
  }
});

// ===== BV CALCULATION ROUTES =====
// Get user BV stats
router.get('/bv-stats', requireAuth, async (req, res) => {
  try {
    const bvStats = await storage.calculateUserBV(req.session.userId!);
    res.json(bvStats);
  } catch (error) {
    console.error('Error calculating BV stats:', error);
    res.status(500).json({ message: 'Failed to calculate BV stats' });
  }
});

// ===== FRANCHISE ROUTES =====
// Create franchise request
router.post('/franchise-requests', requireAuth, async (req, res) => {
  try {
    const result = createFranchiseRequestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid franchise request data', errors: result.error.errors });
    }
    
    const request = await storage.createFranchiseRequest(req.session.userId!, result.data);
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating franchise request:', error);
    res.status(500).json({ message: 'Failed to create franchise request' });
  }
});

// Get user franchise requests
router.get('/franchise-requests', requireAuth, async (req, res) => {
  try {
    const requests = await storage.getUserFranchiseRequests(req.session.userId!);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching franchise requests:', error);
    res.status(500).json({ message: 'Failed to fetch franchise requests' });
  }
});

// Get all franchise requests (Admin only)
router.get('/admin/franchise-requests', requireAuth, requireAdmin, async (req, res) => {
  try {
    const requests = await storage.getAllFranchiseRequests();
    res.json(requests);
  } catch (error) {
    console.error('Error fetching franchise requests:', error);
    res.status(500).json({ message: 'Failed to fetch franchise requests' });
  }
});

// Update franchise request status (Admin only)
router.patch('/admin/franchise-requests/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const success = await storage.updateFranchiseRequestStatus(id, status, adminNotes);
    if (!success) {
      return res.status(404).json({ message: 'Franchise request not found' });
    }
    res.json({ message: 'Franchise request status updated successfully' });
  } catch (error) {
    console.error('Error updating franchise request:', error);
    res.status(500).json({ message: 'Failed to update franchise request status' });
  }
});

// ===== SUPPORT ROUTES =====
// Create support ticket
router.post('/support-tickets', requireAuth, async (req, res) => {
  try {
    const result = createSupportTicketSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid ticket data', errors: result.error.errors });
    }
    
    const ticket = await storage.createSupportTicket(req.session.userId!, result.data);
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ message: 'Failed to create support ticket' });
  }
});

// Get user support tickets
router.get('/support-tickets', requireAuth, async (req, res) => {
  try {
    const tickets = await storage.getUserTickets(req.session.userId!);
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ message: 'Failed to fetch support tickets' });
  }
});

// Get all support tickets (Admin only)
router.get('/admin/support-tickets', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tickets = await storage.getAllTickets();
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ message: 'Failed to fetch support tickets' });
  }
});

// Update support ticket status (Admin only)
router.patch('/admin/support-tickets/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;
    const success = await storage.updateTicketStatus(id, status, resolution);
    if (!success) {
      return res.status(404).json({ message: 'Support ticket not found' });
    }
    res.json({ message: 'Support ticket status updated successfully' });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    res.status(500).json({ message: 'Failed to update support ticket status' });
  }
});

// ===== ACHIEVERS ROUTES =====
// Get achievers by type
router.get('/achievers/:type', requireAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const { period = 'monthly' } = req.query;
    const achievers = await storage.getAchieversByType(type, period as string);
    res.json(achievers);
  } catch (error) {
    console.error('Error fetching achievers:', error);
    res.status(500).json({ message: 'Failed to fetch achievers' });
  }
});

// ===== CHEQUE ROUTES =====
// Get user cheques
router.get('/cheques', requireAuth, async (req, res) => {
  try {
    const cheques = await storage.getUserCheques(req.session.userId!);
    res.json(cheques);
  } catch (error) {
    console.error('Error fetching cheques:', error);
    res.status(500).json({ message: 'Failed to fetch cheques' });
  }
});

// ===== NEWS ROUTES =====
// Get active news
router.get('/news', async (req, res) => {
  try {
    const news = await storage.getActiveNews();
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ message: 'Failed to fetch news' });
  }
});

// Get all news (Admin only)
router.get('/admin/news', requireAuth, requireAdmin, async (req, res) => {
  try {
    const news = await storage.getAllNews();
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ message: 'Failed to fetch news' });
  }
});

// Create news (Admin only)
router.post('/admin/news', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = createNewsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid news data', errors: result.error.errors });
    }
    
    const news = await storage.createNews(result.data, req.session.userId!);
    res.status(201).json(news);
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({ message: 'Failed to create news' });
  }
});

// ===== PROFILE ROUTES =====
// Update user profile
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const result = updateUserProfileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid profile data', errors: result.error.errors });
    }
    
    const user = await storage.updateUserProfile(req.session.userId!, result.data);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

export default router;