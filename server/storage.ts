import {
  users,
  emailTokens,
  pendingRecruits,
  referralLinks,
  recruitmentRequests,
  products,
  purchases,
  walletBalances,
  transactions,
  withdrawalRequests,
  kycDocuments,
  rankAchievements,
  franchiseRequests,
  supportTickets,
  achievers,
  cheques,
  news,
  lifetimeBvCalculations,
  type User,
  type UpsertUser,
  type CreateUser,
  type RecruitUser,
  type UpdateUser,
  type UpdateUserProfile,
  type SignupUser,
  type EmailToken,
  type CreateToken,
  type PendingRecruit,
  type ReferralLink,
  type CreateReferralLink,
  type RecruitmentRequest,
  type CreateRecruitmentRequest,
  type Product,
  type CreateProduct,
  type Purchase,
  type CreatePurchase,
  type WalletBalance,
  type Transaction,
  type WithdrawalRequest,
  type CreateWithdrawal,
  type KYCDocument,
  type CreateKYC,
  type RankAchievement,
  type FranchiseRequest,
  type CreateFranchiseRequest,
  type SupportTicket,
  type CreateSupportTicket,
  type Achiever,
  type Cheque,
  type News,
  type CreateNews,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc, and, sql, gte, lte, asc, ne, inArray } from "drizzle-orm";

import { nanoid } from "nanoid";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmailAndPassword(email: string, password: string): Promise<User | undefined>;
  getUserByUserIdAndPassword(userId: string, password: string): Promise<User | undefined>;
  updateUserStatus(userId: string, status: string): Promise<User | undefined>;
  
  // User management operations
  getAllUsers(search?: string): Promise<(User & { sponsorUserId: string | null })[]>;
  getTodayJoinings(userTimezone?: string): Promise<(User & { sponsorUserId: string | null })[]>;
  getPaidMembers(): Promise<(User & { sponsorUserId: string | null })[]>;
  getFreeUsers(): Promise<(User & { sponsorUserId: string | null })[]>;
  searchUsers(query: string, filters: {
    status?: string;
    role?: string;
    kycStatus?: string;
  }): Promise<(User & { sponsorUserId: string | null })[]>;
  createUser(user: CreateUser): Promise<User & { originalPassword?: string }>;
  updateUser(id: string, updates: UpdateUser): Promise<User | undefined>;
  updateUserProfile(id: string, updates: UpdateUserProfile): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    pendingUsers: number;
  }>;
  getPendingUsers(): Promise<User[]>;
  getAdminStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    pendingKYC: number;
    withdrawalRequests: number;
    franchiseRequests: number;
    totalBV: string;
    monthlyIncome: string;
  }>;
  
  // Password management
  getUserByEmail(email: string): Promise<User | undefined>;
  updatePassword(id: string, newPassword: string): Promise<boolean>;
  
  // Email verification and signup
  createSignupUser(user: SignupUser): Promise<User>;
  createEmailToken(token: CreateToken): Promise<EmailToken>;
  getEmailToken(token: string): Promise<EmailToken | undefined>;
  deleteEmailToken(token: string): Promise<boolean>;
  verifyUserEmail(email: string): Promise<boolean>;
  getUserByToken(token: string): Promise<{ user: User; tokenType: string } | undefined>;
  
  // Team management operations
  getTeamMembers(userId: string): Promise<User[]>;
  getDownline(userId: string, levels?: number): Promise<User[]>;
  getTeamStats(userId: string): Promise<{
    directRecruits: number;
    totalDownline: number;
    activeMembers: number;
    currentRank: string;
    teamBV: string;
    leftBV: string;
    rightBV: string;
    totalDirects: number;
  }>;
  
  // Binary MLM Tree operations (LEGACY)
  getBinaryTreeData_legacy(userId: string): Promise<any>;
  getDirectRecruits_legacy(userId: string): Promise<User[]>;
  placeUserInBinaryTree(userId: string, sponsorId: string): Promise<void>;
  
  // Multi-Child MLM Tree operations (NEW)
  getMultiChildTreeData(userId: string): Promise<any>;
  getMultiChildDirectRecruits(userId: string): Promise<User[]>;
  placeUserInMultiChildTree(userId: string, sponsorId: string, uplineId: string, desiredPosition?: 'left' | 'right'): Promise<void>;
  
  // Pending recruits operations (new workflow)
  createPendingRecruit(data: RecruitUser, recruiterId: string): Promise<PendingRecruit>;
  getPendingRecruits(recruiterId?: string): Promise<PendingRecruit[]>;
  approvePendingRecruit(id: string, adminData: { packageAmount: string; position: string }): Promise<User>;
  rejectPendingRecruit(id: string, rejectedBy: string, reason: string): Promise<boolean>;
  
  // Product operations
  getAllProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductsByType(type: 'first_purchase' | 'second_purchase'): Promise<Product[]>;
  createProduct(data: CreateProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
  // Purchase operations
  createPurchase(userId: string, data: CreatePurchase): Promise<Purchase>;
  getUserPurchases(userId: string): Promise<Purchase[]>;
  getAllPurchasesWithDetails(): Promise<any[]>;
  getPurchaseById(id: string): Promise<Purchase | undefined>;
  updatePurchaseStatus(id: string, status: string): Promise<boolean>;
  
  // Wallet operations
  getWalletBalance(userId: string): Promise<WalletBalance | undefined>;
  createWalletBalance(userId: string): Promise<WalletBalance>;
  updateWalletBalance(userId: string, amount: string, description: string, type: any): Promise<Transaction>;
  getUserTransactions(userId: string): Promise<Transaction[]>;
  
  // Withdrawal operations
  createWithdrawalRequest(userId: string, data: CreateWithdrawal): Promise<WithdrawalRequest>;
  createUserWithdrawalRequest(data: { userId: string; withdrawalType: 'INR' | 'USD'; amount: string; remarks: string }): Promise<WithdrawalRequest>;
  createAdminWithdrawalRequest(data: { userId: string; withdrawalType: 'INR' | 'USD'; amount: string; remarks: string }): Promise<WithdrawalRequest>;
  getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]>;
  getAllWithdrawals(): Promise<WithdrawalRequest[]>;
  getPendingWithdrawalsWithUserDetails(): Promise<any[]>;
  getApprovedWithdrawalsWithUserDetails(): Promise<any[]>;
  getRejectedWithdrawalsWithUserDetails(): Promise<any[]>;
  updateWithdrawalStatus(id: string, status: string, adminNotes?: string): Promise<boolean>;
  
  // KYC operations
  getUserKYCDocuments(userId: string): Promise<KYCDocument[]>;
  createKYCDocument(userId: string, data: CreateKYC): Promise<KYCDocument>;
  getKYCDocumentById(id: string): Promise<KYCDocument | null>;
  updateKYCDocument(id: string, data: CreateKYC): Promise<KYCDocument>;
  updateKYCStatus(id: string, status: any, rejectionReason?: string): Promise<boolean>;
  getAllPendingKYC(): Promise<KYCDocument[]>;
  fixExistingKYCStatuses(): Promise<void>;
  cleanupDuplicateKYCDocuments(): Promise<void>;
  consolidateDocumentTypes(): Promise<void>;
  
  // Rank operations
  getUserRankHistory(userId: string): Promise<RankAchievement[]>;
  createRankAchievement(userId: string, rank: any, teamBV: string, leftBV: string, rightBV: string): Promise<RankAchievement>;
  checkRankEligibility(userId: string): Promise<{ eligible: boolean; newRank?: any; teamBV: string }>;
  
  // Franchise operations
  createFranchiseRequest(userId: string, data: CreateFranchiseRequest): Promise<FranchiseRequest>;
  getUserFranchiseRequests(userId: string): Promise<FranchiseRequest[]>;
  getAllFranchiseRequests(): Promise<FranchiseRequest[]>;
  updateFranchiseRequestStatus(id: string, status: string, adminNotes?: string): Promise<boolean>;
  
  // Support operations
  createSupportTicket(userId: string, data: CreateSupportTicket): Promise<SupportTicket>;
  getUserTickets(userId: string): Promise<SupportTicket[]>;
  getAllTickets(): Promise<SupportTicket[]>;
  updateTicketStatus(id: string, status: any, resolution?: string): Promise<boolean>;
  
  // Achievers operations
  getAchieversByType(type: string, period: string): Promise<Achiever[]>;
  createAchiever(userId: string, type: string, position: number, amount?: string): Promise<Achiever>;
  
  // Cheque operations
  getUserCheques(userId: string): Promise<Cheque[]>;
  createCheque(userId: string, amount: string, purpose: string): Promise<Cheque>;
  
  // News operations
  getAllNews(): Promise<News[]>;
  getActiveNews(): Promise<News[]>;
  createNews(data: CreateNews, createdBy: string): Promise<News>;
  updateNews(id: string, updates: Partial<News>): Promise<News | undefined>;
  
  // BV calculation operations
  calculateUserBV(userId: string): Promise<{ totalBV: string; leftBV: string; rightBV: string }>;
  updateUserBVStats(userId: string): Promise<void>;
  processIncomeDistribution(purchaseId: string): Promise<void>;

  // Financial operations for admin
  getAllWalletBalances(): Promise<WalletBalance[]>;
  getAllWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  
  // Income reports
  getIncomeReports(filters?: {
    transactionTypes?: string[];
    startDate?: string;
    endDate?: string;
    userId?: string;
  }): Promise<any[]>;
  
  // Referral links and recruitment
  createReferralLink(data: CreateReferralLink & { token: string }): Promise<ReferralLink>;
  getReferralLink(token: string): Promise<ReferralLink | undefined>;
  markReferralLinkAsUsed(token: string, usedBy: string): Promise<boolean>;
  getUserReferralLinks(userId: string): Promise<ReferralLink[]>;
  
  // Recruitment requests
  createRecruitmentRequest(data: CreateRecruitmentRequest): Promise<RecruitmentRequest>;
  getRecruitmentRequest(id: string): Promise<RecruitmentRequest | undefined>;
  updateRecruitmentRequestStatus(id: string, status: string, approvedBy?: string): Promise<boolean>;
  getRecruitmentRequests(filters?: { status?: string; generatedBy?: string }): Promise<RecruitmentRequest[]>;
  
  // Founder-specific operations
  getFounderStats(): Promise<{
    totalUsers: number;
    hiddenIds: number;
    totalRevenue: string;
    networkBalance: string;
    leftLegUsers: number;
    rightLegUsers: number;
  }>;
  getHiddenIds(): Promise<User[]>;
  overridePlacement(userId: string, newParentId: string, position: string): Promise<boolean>;
  
  // Update pending recruit details after user fills registration form
  updatePendingRecruitDetails(recruitId: string, details: { fullName: string; email: string; status: string }): Promise<boolean>;
  
  // Get all referral links
  getReferralLinks(): Promise<ReferralLink[]>;
  
  // Admin user operations
  getAdminUser(): Promise<any>;
  
  // Comprehensive pending recruit operations
  createComprehensivePendingRecruit(
    data: {
      fullName: string;
      email: string;
      mobile?: string;
      packageAmount?: string;
      password: string;
      // Additional comprehensive data
      nominee?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      panNumber?: string;
      aadhaarNumber?: string;
      bankAccountNumber?: string;
      bankIFSC?: string;
      bankName?: string;
      bankAccountHolderName?: string;
      panCardUrl?: string;
      aadhaarFrontUrl?: string;
      aadhaarBackUrl?: string;
      bankCancelledChequeUrl?: string;
      profileImageUrl?: string;
    },
    recruiterId: string,
    placementSide: string
  ): Promise<PendingRecruit>;
  
  // Financial operations for admin
  getAllUsersForPlacement(): Promise<User[]>;
  createUserWithStrategicPlacement(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    mobile?: string;
    packageAmount: string;
    parentId: string;
    position: 'left' | 'right';
    sponsorId: string;
    profileData?: any;
  }): Promise<User & { originalPassword: string }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    // Try to find by internal id first (UUID)
    let [user] = await db.select().from(users).where(eq(users.id, id));
    
    // If not found, try to find by display user_id (VV0001, admin-demo, etc.)
    if (!user) {
      [user] = await db.select().from(users).where(eq(users.userId, id));
    }
    
    return user;
  }

  async getUserByEmailAndPassword(email: string, password: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user) {
      const passwordMatch = password === user.password; // Direct string comparison for plaintext
      if (passwordMatch) {
        // Only allow login for active users
        if (user.status === 'active') {
          return user;
        }
        // For inactive users, return undefined to prevent login
        return undefined;
      }
    }
    return undefined;
  }

  async getUserByUserIdAndPassword(userId: string, password: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.userId, userId));
    if (user) {
      const passwordMatch = password === user.password; // Direct string comparison for plaintext
      if (passwordMatch) {
        // Only allow login for active users
        if (user.status === 'active') {
          return user;
        }
        // For inactive users, return undefined to prevent login
        return undefined;
      }
    }
    return undefined;
  }

  // Additional user management operations
  async getAllUsers(search?: string): Promise<(User & { sponsorUserId: string | null })[]> {
    let query = db.select({
      id: users.id,
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      mobile: users.mobile,
      sponsorId: users.sponsorId,
      packageAmount: users.packageAmount,
      cryptoWalletAddress: users.cryptoWalletAddress,
      txnPin: users.txnPin,
      password: users.password,
      status: users.status,
      registrationDate: users.createdAt,
      kycStatus: users.kycStatus,
      kycApprovedAt: users.kycApprovedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).orderBy(desc(users.createdAt));
    
    if (search) {
      query = query.where(
        or(
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      ) as typeof query;
    }
    
    const result = await query;
    
    // Add sponsor user IDs by fetching sponsor information
    const usersWithSponsorIds = await Promise.all(result.map(async (user) => {
      let sponsorUserId = null;
      if (user.sponsorId) {
        const sponsor = await db.select({ userId: users.userId })
          .from(users)
          .where(eq(users.userId, user.sponsorId))
          .limit(1);
        sponsorUserId = sponsor[0]?.userId || null;
      }
      
      return {
        ...user,
        sponsorUserId
      };
    }));
    
    return usersWithSponsorIds as (User & { sponsorUserId: string | null })[];
  }

  // Get users who were activated today
  async getTodayJoinings(userTimezone: string = 'UTC'): Promise<(User & { sponsorUserId: string | null })[]> {
    // Get current date in YYYY-MM-DD format to avoid timezone issues
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // Gets YYYY-MM-DD format
    
    console.log(`Looking for users who were activated today in timezone: ${userTimezone}`);
    console.log(`Current time: ${today.toISOString()}`);
    
    // Check what the database thinks "today" is
    const dbToday = await db.execute(sql`SELECT CURRENT_DATE, NOW(), DATE(NOW() AT TIME ZONE 'UTC') as utc_date`);
    console.log('Database date info:', dbToday);
    
    // First, let's get all users to debug what activation dates we have
    const allUsersDebug = await db.select({
      id: users.id,
      userId: users.userId,
      email: users.email,
      createdAt: users.createdAt,
      activationDate: users.activationDate
    }).from(users).orderBy(desc(users.activationDate)).limit(20);
    
    console.log('Recent users with activation dates:', allUsersDebug.map(u => ({
      id: u.id,
      userId: u.userId,
      email: u.email,
      createdAt: u.createdAt?.toISOString(),
      activationDate: u.activationDate?.toISOString(),
      activationDateOnly: u.activationDate?.toISOString().split('T')[0]
    })));
    
    // Use activation_date instead of created_at for today's joinings
    const query = db.select({
      id: users.id,
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      mobile: users.mobile,
      sponsorId: users.sponsorId,
      packageAmount: users.packageAmount,
      cryptoWalletAddress: users.cryptoWalletAddress,
      txnPin: users.txnPin,
      password: users.password,
      status: users.status,
      registrationDate: users.createdAt,
      kycStatus: users.kycStatus,
      kycApprovedAt: users.kycApprovedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      activationDate: users.activationDate
    }).from(users)
    .where(
      sql`DATE(${users.activationDate} AT TIME ZONE 'UTC' AT TIME ZONE ${userTimezone}) = DATE(NOW() AT TIME ZONE ${userTimezone})`
    )
    .orderBy(desc(users.activationDate));
    
    const result = await query;
 
    console.log('Result:', result);
    
    console.log(`Found ${result.length} users who were activated today (${todayString}):`, 
      result.map(u => ({ id: u.id, userId: u.userId, email: u.email, activationDate: u.activationDate }))
    );
    
    // Add sponsor user IDs by fetching sponsor information
    const usersWithSponsorIds = await Promise.all(result.map(async (user) => {
      let sponsorUserId = null;
      if (user.sponsorId) {
        const sponsor = await db.select({ userId: users.userId })
          .from(users)
          .where(eq(users.userId, user.sponsorId))
          .limit(1);
        sponsorUserId = sponsor[0]?.userId || null;
      }
      
      return {
        ...user,
        sponsorUserId
      };
    }));
    
    return usersWithSponsorIds as (User & { sponsorUserId: string | null })[];
  }

  // Get paid members (users with approved KYC, bank details, and who have made any transactions)
  async getPaidMembers(): Promise<(User & { sponsorUserId: string | null })[]> {
    console.log('Looking for paid members...');
    
    // Query for paid members with all required conditions
    const query = db.select({
      id: users.id,
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      mobile: users.mobile,
      sponsorId: users.sponsorId,
      packageAmount: users.packageAmount,
      cryptoWalletAddress: users.cryptoWalletAddress,
      txnPin: users.txnPin,
      password: users.password,
      status: users.status,
      registrationDate: users.createdAt,
      kycStatus: users.kycStatus,
      kycApprovedAt: users.kycApprovedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      activationDate: users.activationDate,
      // KYC fields
      panNumber: users.panNumber,
      aadhaarNumber: users.aadhaarNumber,
      // Bank fields
      bankAccountNumber: users.bankAccountNumber,
      bankIFSC: users.bankIFSC,
      bankName: users.bankName,
      bankAccountHolderName: users.bankAccountHolderName
    }).from(users)
    .where(
      and(
        // Condition 1: Status should be 'active'
        eq(users.status, 'active'),
        
        // Condition 2: KYC should be approved
        eq(users.kycStatus, 'approved'),
        
        // Condition 3: PAN and Aadhaar should not be empty
        sql`${users.panNumber} IS NOT NULL AND ${users.panNumber} != ''`,
        sql`${users.aadhaarNumber} IS NOT NULL AND ${users.aadhaarNumber} != ''`,
        
        // Condition 4: Bank details should not be empty
        sql`${users.bankAccountNumber} IS NOT NULL AND ${users.bankAccountNumber} != ''`,
        sql`${users.bankIFSC} IS NOT NULL AND ${users.bankIFSC} != ''`,
        sql`${users.bankName} IS NOT NULL AND ${users.bankName} != ''`,
        sql`${users.bankAccountHolderName} IS NOT NULL AND ${users.bankAccountHolderName} != ''`,
        
        // Condition 5: User has made at least one transaction (any type)
        sql`EXISTS (SELECT 1 FROM transactions WHERE transactions.user_id = ${users.id})`
      )
    )
    .orderBy(desc(users.activationDate));
    
    const result = await query;
    
    console.log(`Found ${result.length} paid members:`, 
      result.map(u => ({ 
        id: u.id, 
        userId: u.userId, 
        email: u.email, 
        kycStatus: u.kycStatus,
        hasBankDetails: !!(u.bankAccountNumber && u.bankIFSC && u.bankName && u.bankAccountHolderName),
        hasTransactions: true // All results have transactions by definition
      }))
    );
    
    // Add sponsor user IDs by fetching sponsor information
    const usersWithSponsorIds = await Promise.all(result.map(async (user) => {
      let sponsorUserId = null;
      if (user.sponsorId) {
        const sponsor = await db.select({ userId: users.userId })
          .from(users)
          .where(eq(users.userId, user.sponsorId))
          .limit(1);
        sponsorUserId = sponsor[0]?.userId || null;
      }
      
      return {
        ...user,
        sponsorUserId
      };
    }));
    
    return usersWithSponsorIds as (User & { sponsorUserId: string | null })[];
  }

  // Get free users (all users minus users with package amount > 0)
  async getFreeUsers(): Promise<(User & { sponsorUserId: string | null })[]> {
    console.log('Looking for free users...');
    
    // First, let's see all package amounts in the database
    const allUsers = await db.select({ 
      id: users.id, 
      userId: users.userId, 
      packageAmount: users.packageAmount 
    }).from(users);
    console.log('All users with package amounts:', allUsers.map(u => ({ 
      userId: u.userId, 
      packageAmount: u.packageAmount 
    })));
    
    // Query for free users - all users except those with package amount > 0
    const query = db.select({
      id: users.id,
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      mobile: users.mobile,
      sponsorId: users.sponsorId,
      packageAmount: users.packageAmount,
      cryptoWalletAddress: users.cryptoWalletAddress,
      txnPin: users.txnPin,
      password: users.password,
      status: users.status,
      registrationDate: users.createdAt,
      kycStatus: users.kycStatus,
      kycApprovedAt: users.kycApprovedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      activationDate: users.activationDate
    }).from(users)
    .where(
      or(
        // Users with package amount = null
        sql`${users.packageAmount} IS NULL`,
        // Users with empty package amount
        sql`${users.packageAmount} = ''`,
        // Users with package amount = 0 (any format: '0', '0.0', '0.00', etc.)
        sql`CAST(${users.packageAmount} AS DECIMAL) = 0`,
        // Users with package amount = '0.00' (exact match)
        eq(users.packageAmount, '0.00')
      )
    )
    .orderBy(desc(users.createdAt));
    
    const result = await query;

    console.log('Result:', result);
    
    console.log(`Found ${result.length} free users:`, 
      result.map(u => ({ 
        id: u.id, 
        userId: u.userId, 
        email: u.email, 
        packageAmount: u.packageAmount
      }))
    );
    
    // Add sponsor user IDs by fetching sponsor information
    const usersWithSponsorIds = await Promise.all(result.map(async (user) => {
      let sponsorUserId = null;
      if (user.sponsorId) {
        const sponsor = await db.select({ userId: users.userId })
          .from(users)
          .where(eq(users.userId, user.sponsorId))
          .limit(1);
        sponsorUserId = sponsor[0]?.userId || null;
      }
      
      return {
        ...user,
        sponsorUserId
      };
    }));
    
    return usersWithSponsorIds as (User & { sponsorUserId: string | null })[];
  }

  // Generate random user ID like VVAB12CD, VV3F9K2L, etc.
  async generateNextUserId(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const idLength = 6; // 6 random characters after "VV"
    const maxAttempts = 10; // Retry limit in case of collision
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random alphanumeric string
      let randomPart = '';
      for (let i = 0; i < idLength; i++) {
        randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      const newUserId = `VV${randomPart}`;
      
      // Check if this ID already exists
      const existing = await db.select({ userId: users.userId })
        .from(users)
        .where(eq(users.userId, newUserId))
        .limit(1);
      
      if (existing.length === 0) {
        return newUserId; // Unique ID found
      }
      
      // If collision, loop will retry
      console.log(`User ID collision detected: ${newUserId}, retrying...`);
    }
    
    // Fallback (extremely unlikely to reach here)
    throw new Error('Failed to generate unique user ID after multiple attempts');
  }

  async createUser(userData: CreateUser): Promise<User & { originalPassword?: string }> {
    // Generate random user ID
    const userId = await this.generateNextUserId();
    
    // Store password in plaintext (no hashing)
    console.log('🔍 Creating user with plaintext password:', userData.password || "defaultpass123");
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        userId,
        password: userData.password || "defaultpass123", // Store password in plaintext
        originalPassword: userData.password || "defaultpass123", // Store original password in database
        status: 'active', // Default to active for admin-created users
        emailVerified: new Date(),
        lastActiveAt: new Date()
      })
      .returning();
    
    console.log('✅ User created, originalPassword in result:', user.originalPassword);
    
    // Return user with original password for admin viewing
    return {
      ...user,
      originalPassword: userData.password || "defaultpass123"
    };
  }



  async updateUser(id: string, updates: UpdateUser): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateUserProfile(id: string, updates: UpdateUserProfile): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUserStats() {
    const allUsers = await db.select().from(users);
    
    // Exclude admin users from all counts
    const nonAdminUsers = allUsers.filter(u => u.role !== 'admin');
    
    return {
      totalUsers: nonAdminUsers.length,
      activeUsers: nonAdminUsers.filter(u => u.status === 'active').length,
      adminUsers: allUsers.filter(u => u.role === 'admin').length,
      pendingUsers: nonAdminUsers.filter(u => u.status === 'pending').length,
    };
  }

  async getPendingUsers(): Promise<User[]> {
    const pendingUsers = await db.select()
      .from(users)
      .where(eq(users.status, 'pending'))
      .orderBy(desc(users.registrationDate));
    
    return pendingUsers;
  }

  async searchUsers(query: string, filters: {
    status?: string;
    role?: string;
    kycStatus?: string;
  }): Promise<(User & { sponsorUserId: string | null })[]> {
    let searchConditions: any[] = [];
    
    // Unified search across User ID, Name, and Email
    if (query && query.trim()) {
      searchConditions.push(
        or(
          ilike(users.userId, `%${query}%`),
          ilike(users.id, `%${query}%`),
          ilike(users.firstName, `%${query}%`),
          ilike(users.lastName, `%${query}%`),
          ilike(sql`concat(${users.firstName}, ' ', ${users.lastName})`, `%${query}%`),
          ilike(users.email, `%${query}%`)
        )
      );
    }
    
    // Add filter conditions
    const filterConditions: any[] = [];
    if (filters.status) {
      filterConditions.push(eq(users.status, filters.status as any));
    }
    if (filters.role) {
      filterConditions.push(eq(users.role, filters.role as any));
    }
    if (filters.kycStatus) {
      filterConditions.push(eq(users.kycStatus, filters.kycStatus as any));
    }
    
    // Combine all conditions
    const allConditions = [...searchConditions, ...filterConditions];
    
    let searchQuery = db.select().from(users).orderBy(desc(users.createdAt));
    
    if (allConditions.length > 0) {
      searchQuery = searchQuery.where(and(...allConditions)) as typeof searchQuery;
    }
    
    const result = await searchQuery;
    
    // Add sponsor user IDs by fetching sponsor information
    const usersWithSponsorIds = await Promise.all(result.map(async (user) => {
      let sponsorUserId = null;
      if (user.sponsorId) {
        const sponsor = await db.select({ userId: users.userId })
          .from(users)
          .where(eq(users.userId, user.sponsorId))
          .limit(1);
        sponsorUserId = sponsor[0]?.userId || null;
      }
      
      return {
        ...user,
        sponsorUserId
      };
    }));
    
    return usersWithSponsorIds as (User & { sponsorUserId: string | null })[];
  }

  async getAdminStats() {
    const [userStats, kycCount, withdrawalCount, franchiseCount, purchaseCount] = await Promise.all([
      this.getUserStats(),
      db.select({ count: sql<number>`count(*)` }).from(kycDocuments).where(eq(kycDocuments.status, 'pending')),
      db.select({ count: sql<number>`count(*)` }).from(withdrawalRequests).where(eq(withdrawalRequests.status, 'pending')),
      db.select({ count: sql<number>`count(*)` }).from(franchiseRequests).where(eq(franchiseRequests.status, 'pending')),
      // Exclude admin purchases from count - FIXED: Join using Display ID
      db.select({ count: sql<number>`count(*)` })
        .from(purchases)
        .innerJoin(users, eq(purchases.userId, users.userId))
        .where(ne(users.role, 'admin'))
    ]);
    
    // Calculate total BV in system from lifetimeBvCalculations (excluding admin users)
    const bvRecords = await db
      .select({ 
        teamBv: lifetimeBvCalculations.teamBv,
        userId: lifetimeBvCalculations.userId 
      })
      .from(lifetimeBvCalculations)
      .innerJoin(users, eq(lifetimeBvCalculations.userId, users.userId))
      .where(ne(users.role, 'admin'));
    
    const totalBV = bvRecords.reduce((sum, record) => sum + parseFloat(record.teamBv || '0'), 0);
    
    // Calculate monthly income from actual transactions for current month (excluding admin users)
    // EXCLUDES: admin_credit, admin_debit (manual wallet adjustments), withdrawal, purchase (deductions)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyTransactions = await db.select({ amount: transactions.amount })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.userId))
      .where(
        and(
          gte(transactions.createdAt, firstDayOfMonth),
          ne(users.role, 'admin'),
          sql`${transactions.type} IN ('sponsor_income', 'sales_incentive', 'sales_bonus', 'consistency_bonus', 'franchise_income', 'car_fund', 'travel_fund', 'leadership_fund', 'house_fund', 'millionaire_club', 'royalty_income')`
        )
      );
    
    const monthlyIncome = monthlyTransactions.reduce((sum, txn) => sum + parseFloat(txn.amount || '0'), 0);
    
    return {
      totalUsers: userStats.totalUsers,
      activeUsers: userStats.activeUsers,
      pendingKYC: kycCount[0]?.count || 0,
      withdrawalRequests: withdrawalCount[0]?.count || 0,
      franchiseRequests: franchiseCount[0]?.count || 0,
      totalPurchases: purchaseCount[0]?.count || 0,
      totalBV: totalBV.toFixed(2),
      monthlyIncome: monthlyIncome.toFixed(2)
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updatePassword(id: string, newPassword: string): Promise<boolean> {
    // Store password in plaintext (no hashing)
    const result = await db
      .update(users)
      .set({ 
        password: newPassword, // Store password in plaintext
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Email verification and signup methods
  async createSignupUser(userData: SignupUser): Promise<User> {
    // Store password in plaintext (no hashing)
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: userData.password, // Store password in plaintext
        status: 'pending', // Pending until email verification
      })
      .returning();
    return user;
  }

  async createEmailToken(tokenData: CreateToken): Promise<EmailToken> {
    const [token] = await db
      .insert(emailTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async getEmailToken(token: string): Promise<EmailToken | undefined> {
    const [tokenData] = await db
      .select()
      .from(emailTokens)
      .where(eq(emailTokens.token, token));
    return tokenData;
  }

  // Enhanced token validation with security checks
  async validateToken(token: string, ipAddress?: string): Promise<{ valid: boolean; token?: EmailToken; reason?: string }> {
    const tokenData = await this.getEmailToken(token);
    
    if (!tokenData) {
      return { valid: false, reason: 'Token not found' };
    }
    
    // Check if already consumed
    if (tokenData.consumedAt) {
      return { valid: false, reason: 'Token already used' };
    }
    
    // Check if revoked
    if (tokenData.revokedAt) {
      return { valid: false, reason: 'Token revoked' };
    }
    
    // Check expiration
    if (tokenData.expiresAt < new Date()) {
      // Auto-delete expired tokens
      await this.deleteEmailToken(token);
      return { valid: false, reason: 'Token expired' };
    }
    
    return { valid: true, token: tokenData };
  }

  // Consume token (mark as used)
  async consumeToken(token: string, ipAddress?: string): Promise<boolean> {
    try {
      const validation = await this.validateToken(token, ipAddress);
      if (!validation.valid) {
        return false;
      }
      
      await db
        .update(emailTokens)
        .set({ 
          consumedAt: new Date(),
          ipAddress: ipAddress 
        })
        .where(eq(emailTokens.token, token));
      
      return true;
    } catch (error) {
      console.error('Error consuming token:', error);
      return false;
    }
  }

  // Revoke token
  async revokeToken(token: string, revokedBy: string): Promise<boolean> {
    try {
      await db
        .update(emailTokens)
        .set({ 
          revokedAt: new Date(),
          revokedBy 
        })
        .where(eq(emailTokens.token, token));
      
      return true;
    } catch (error) {
      console.error('Error revoking token:', error);
      return false;
    }
  }

  async deleteEmailToken(token: string): Promise<boolean> {
    try {
      await db
        .delete(emailTokens)
        .where(eq(emailTokens.token, token));
      return true;
    } catch (error) {
      console.error('Error deleting email token:', error);
      return false;
    }
  }

  async verifyUserEmail(email: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ 
          status: 'active', 
          emailVerified: new Date() 
        })
        .where(eq(users.email, email));
      return true;
    } catch (error) {
      console.error('Error verifying user email:', error);
      return false;
    }
  }

  // Enhanced getUserByToken with security validation
  async getUserByToken(token: string, ipAddress?: string): Promise<{ user: User; tokenType: string } | undefined> {
    const validation = await this.validateToken(token, ipAddress);
    
    if (!validation.valid || !validation.token) {
      return undefined;
    }
    
    const user = await this.getUserByEmail(validation.token.email);
    if (!user) return undefined;
    
    return { user, tokenType: validation.token.type };
  }

  // Audit logging functionality
  async logAction(params: {
    entityType: string;
    entityId: string;
    action: string;
    actorId: string;
    actorRole: string;
    previousState?: any;
    newState?: any;
    changes?: any;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      // For now, just console log - can extend to database later
      console.log('=== AUDIT LOG ===');
      console.log('Entity:', params.entityType, params.entityId);
      console.log('Action:', params.action);
      console.log('Actor:', params.actorId, `(${params.actorRole})`);
      console.log('Changes:', params.changes);
      console.log('Reason:', params.reason);
      console.log('Timestamp:', new Date().toISOString());
      console.log('==================');
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  // Team management methods
  async getTeamMembers(userId: string): Promise<User[]> {
    // Normalize UUID to Display ID
    const normalizedUserId = await this.normalizeToDisplayId(userId);
    
    return await db.select()
      .from(users)
      .where(eq(users.sponsorId, normalizedUserId))
      .orderBy(desc(users.createdAt));
  }

  async getDownline(userId: string, levels: number = 10): Promise<User[]> {
    // Normalize UUID to Display ID for initial lookup
    const normalizedUserId = await this.normalizeToDisplayId(userId);
    
    const allMembers: User[] = [];
    const visited = new Set<string>();
    
    const getLevel = async (currentDisplayId: string, currentLevel: number): Promise<void> => {
      if (currentLevel > levels || visited.has(currentDisplayId)) return;
      visited.add(currentDisplayId);
      
      // Look up user by Display ID (for sponsor/parent relationships)
      const currentUser = await db.select().from(users).where(eq(users.userId, currentDisplayId)).limit(1);
      if (!currentUser.length) return;
      
      const user = currentUser[0];
      
      // Get children based on parent_id (which stores Display IDs)
      const children = await db.select().from(users).where(eq(users.parentId, currentDisplayId));
      
      for (const child of children) {
        if (!allMembers.find(m => m.id === child.id)) {
          allMembers.push(child);
          await getLevel(child.userId!, currentLevel + 1);
        }
      }
    };
    
    await getLevel(normalizedUserId, 1);
    return allMembers.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }
  
  // Helper function to normalize UUID to Display ID
  private async normalizeToDisplayId(id: string): Promise<string> {
    if (!id) return id;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidPattern.test(id)) {
      const user = await db.select({ userId: users.userId }).from(users).where(eq(users.id, id)).limit(1);
      return user[0]?.userId || id;
    }
    return id;
  }

  async getTeamStats(userId: string): Promise<{
    directRecruits: number;
    totalDownline: number;
    activeMembers: number;
    currentRank: string;
    teamBV: string;
    matchedBV: string;
    totalTeamBV: string;
    leftBV: string;
    rightBV: string;
    totalDirects: number;
  }> {
    const directMembers = await this.getTeamMembers(userId);
    const allDownline = await this.getDownline(userId);
    const user = await this.getUser(userId);
    
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    // Calculate both matched BV and total BV
    const leftBV = parseFloat(user.leftBV || '0');
    const rightBV = parseFloat(user.rightBV || '0');
    const matchedBV = Math.min(leftBV, rightBV);  // For income calculations
    const totalTeamBV = leftBV + rightBV;  // For rank qualification
    
    const result = {
      directRecruits: directMembers.length,
      totalDownline: allDownline.length,
      activeMembers: allDownline.filter(u => u.status === 'active').length,
      currentRank: user.currentRank || 'Executive',
      teamBV: matchedBV.toFixed(2),  // Matched BV (for income display)
      matchedBV: matchedBV.toFixed(2),  // Explicit matched BV field
      totalTeamBV: totalTeamBV.toFixed(2),  // Total BV (for rank qualification)
      leftBV: user.leftBV || '0.00',
      rightBV: user.rightBV || '0.00',
      totalDirects: user.totalDirects || 0,
    };
    
    console.log('📊 getTeamStats result for user', userId, ':', result);
    
    return result;
  }

  // Pending recruits operations 
  async createPendingRecruit(data: RecruitUser, recruiterId: string): Promise<PendingRecruit> {
    // Find the recruiter
    console.log('Looking for recruiter with ID:', recruiterId);
    const recruiter = await this.getUser(recruiterId);
    console.log('Recruiter found:', !!recruiter, recruiter?.email);
    if (!recruiter) {
      throw new Error(`Recruiter not found with ID: ${recruiterId}`);
    }

    // FIXED: Every recruiter is their own upline for their recruits
    // This ensures users control their own team placement
    let uplineId = recruiterId; // Recruiter decides position for their recruits
    let initialStatus = 'awaiting_upline';
    let initialUplineDecision = 'pending';

    // SPECIAL CASE: If the recruiter is an admin/founder, they can approve directly
    if (recruiter.role === 'admin' || recruiter.role === 'founder') {
      console.log('*** ADMIN RECRUITER WORKFLOW - DIRECT TO ADMIN APPROVAL ***');
      initialStatus = 'awaiting_admin';
      initialUplineDecision = 'approved'; // Admin has already decided
      uplineId = recruiterId; // Admin is their own upline
    } else {
      console.log('*** REGULAR RECRUITER WORKFLOW - AWAITING UPLINE ***');
      console.log('Recruiter is not admin/founder, using regular workflow');
      // Regular users need to decide position for their recruits
    }

    const [pendingRecruit] = await db.insert(pendingRecruits).values({
      email: data.email,
      fullName: data.fullName,
      mobile: data.mobile,
      recruiterId,
      uplineId, // This is now always the recruiter
      status: initialStatus,
      uplineDecision: initialUplineDecision,
    }).returning();
    return pendingRecruit;
  }

  // Simple referral link generation - no complex workflow needed
  async checkAdminUplineWorkflow(userId: string): Promise<{ hasAdminUpline: boolean, uplineId?: string }> {
    // All users now use simple referral link generation
    return { hasAdminUpline: false };
  }

  // Create pending recruit with immediate position selection (streamlined workflow)
  async createPendingRecruitWithPosition(data: RecruitUser & { position: 'left' | 'right' }, recruiterId: string): Promise<PendingRecruit> {
    const recruiter = await this.getUser(recruiterId);
    if (!recruiter) {
      throw new Error(`Recruiter not found with ID: ${recruiterId}`);
    }

    console.log('=== POSITION-ALREADY-CHOSEN WORKFLOW ===');
    console.log('Recruiter:', recruiter.email);
    console.log('Position chosen:', data.position);

    // STREAMLINED WORKFLOW: Position already chosen, skip upline approval
    // Go directly to admin approval since position decision is already made
    const [pendingRecruit] = await db.insert(pendingRecruits).values({
      email: data.email,
      fullName: data.fullName,
      mobile: data.mobile,
      recruiterId,
      uplineId: recruiterId, // Recruiter is the upline
      position: data.position, // Position already chosen
      status: 'awaiting_admin', // Skip upline approval, go directly to admin
      uplineDecision: 'approved', // Auto-approve since position is chosen
      uplineDecisionAt: new Date(), // Mark as already decided
    }).returning();

    return pendingRecruit;
  }

  // Get admin user for upline assignment
  async getAdminUser(): Promise<any> {
    try {
      const adminUsers = await db.select()
        .from(users)
        .where(eq(users.role, 'admin'))
        .limit(1);
      return adminUsers[0] || null;
    } catch (error) {
      console.error('Error getting admin user:', error);
      return null;
    }
  }

  // Create comprehensive pending recruit for full registration form
  async createComprehensivePendingRecruit(
    data: {
      fullName: string;
      email: string;
      mobile?: string;
      packageAmount?: string;
      password: string;
      // Additional comprehensive data
      nominee?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      panNumber?: string;
      aadhaarNumber?: string;
      bankAccountNumber?: string;
      bankIFSC?: string;
      bankName?: string;
      bankAccountHolderName?: string;
      panCardUrl?: string;
      aadhaarFrontUrl?: string;
      aadhaarBackUrl?: string;
      bankCancelledChequeUrl?: string;
      profileImageUrl?: string;
    },
    recruiterId: string,
    placementSide: string
  ): Promise<PendingRecruit> {
    const recruiter = await this.getUser(recruiterId);
    if (!recruiter) {
      throw new Error(`Recruiter not found with ID: ${recruiterId}`);
    }

    // Store password in plaintext (no hashing)

    // STREAMLINED WORKFLOW: Position already chosen, skip upline approval
    // Since placementSide is provided, go directly to admin approval
    const uplineId = recruiterId; // Recruiter is the upline

    // Create pending recruit with all comprehensive data
    const [pendingRecruit] = await db.insert(pendingRecruits).values({
      email: data.email,
      fullName: data.fullName,
      mobile: data.mobile,
      recruiterId,
      uplineId: uplineId, // Use the determined upline
      packageAmount: data.packageAmount || '0.00',
      position: placementSide, // Position already chosen
      status: 'awaiting_admin', // Skip upline approval, go directly to admin
      uplineDecision: 'approved', // Auto-approve since position is chosen
      uplineDecisionAt: new Date(), // Mark as already decided
      // Store all the comprehensive registration data
      password: data.password, // Store password in plaintext
      nominee: data.nominee,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      panNumber: data.panNumber,
      aadhaarNumber: data.aadhaarNumber,
      bankAccountNumber: data.bankAccountNumber,
      bankIFSC: data.bankIFSC,
      bankName: data.bankName,
      bankAccountHolderName: data.bankAccountHolderName,
      panCardUrl: data.panCardUrl,
      aadhaarFrontUrl: data.aadhaarFrontUrl,
      aadhaarBackUrl: data.aadhaarBackUrl,
      bankCancelledChequeUrl: data.bankCancelledChequeUrl,
      profileImageUrl: data.profileImageUrl,
    }).returning();

    return pendingRecruit;
  }

  async getPendingRecruits(recruiterId?: string): Promise<PendingRecruit[]> {
    console.log('=== GETTING PENDING RECRUITS ===');
    console.log('Recruiter ID filter:', recruiterId);
    
    // Get all pending recruits that are either:
    // 1. Awaiting admin approval (status = 'awaiting_admin')
    // 2. Created by admin users (regardless of status)
    // BUT exclude temporary placement recruits
    const results = await db.select().from(pendingRecruits)
      .where(
        and(
          // Exclude temporary placement recruits
          sql`${pendingRecruits.fullName} NOT LIKE '%_PLACEMENT_TEMP'`,
          or(
            eq(pendingRecruits.status, 'awaiting_admin'),
            // Also include recruits created by admin users
            sql`${pendingRecruits.recruiterId} IN (SELECT id FROM users WHERE role = 'admin')`
          )
        )
      )
      .orderBy(desc(pendingRecruits.createdAt));
    
    console.log('Found pending recruits:', results.length);
    console.log('Recruits:', results.map(r => ({ 
      id: r.id, 
      email: r.email, 
      status: r.status, 
      uplineDecision: r.uplineDecision,
      recruiterId: r.recruiterId
    })));
    
    // Enrich results with recruiter role information
    const enrichedResults = await Promise.all(
      results.map(async (recruit) => {
        const recruiter = await this.getUser(recruit.recruiterId);
        return {
          ...recruit,
          recruiterRole: recruiter?.role || 'user'
        };
      })
    );
    
    return enrichedResults;
  }

  // Get pending recruits awaiting upline decision
  async getPendingRecruitsForUpline(uplineId: string): Promise<PendingRecruit[]> {
    return await db.select()
      .from(pendingRecruits)
      .where(and(
        eq(pendingRecruits.uplineId, uplineId),
        eq(pendingRecruits.status, 'awaiting_upline')
      ))
      .orderBy(desc(pendingRecruits.createdAt));
  }

  // Get pending recruits with strategic decision information
  async getPendingRecruitsForUplineWithDetails(uplineId: string): Promise<any[]> {
    const pendingRecruits = await this.getPendingRecruitsForUpline(uplineId);
    
    const enrichedRecruits = await Promise.all(
      pendingRecruits.map(async (recruit) => {
        // Get recruiter information
        const recruiter = await this.getUser(recruit.recruiterId);
        
        // Get upline's leg balance information (use total downline for strategic view)
        const upline = await this.getUser(uplineId);
        const leftLegStats = upline?.leftChildId ? await this.getLegStats(upline.leftChildId) : { count: 0, volume: 0 };
        const rightLegStats = upline?.rightChildId ? await this.getLegStats(upline.rightChildId) : { count: 0, volume: 0 };
        
        // Get available positions
        const availablePositions = await this.getAvailablePositions(uplineId);
        
        // Calculate strategic recommendations based on total leg stats (weaker = fewer members)
        const weakerLeg = leftLegStats.count < rightLegStats.count ? 'left' : 
                         rightLegStats.count < leftLegStats.count ? 'right' :
                         leftLegStats.volume <= rightLegStats.volume ? 'left' : 'right';
        const strongerLeg = weakerLeg === 'left' ? 'right' : 'left';
        
        return {
          ...recruit,
          recruiterInfo: {
            id: recruiter?.id,
            name: `${recruiter?.firstName} ${recruiter?.lastName}`,
            email: recruiter?.email,
            position: recruiter?.position,
            level: recruiter?.level,
            packageAmount: recruiter?.packageAmount,
            activationDate: recruiter?.activationDate,
          },
          legBalance: {
            leftLeg: leftLegStats,
            rightLeg: rightLegStats,
            weakerLeg,
            strongerLeg,
            balanceRatio: leftLegStats.count === 0 && rightLegStats.count === 0 ? 1 : 
              Math.min(leftLegStats.count, rightLegStats.count) / Math.max(leftLegStats.count, rightLegStats.count, 1)
          },
          availablePositions,
          strategicRecommendation: {
            recommendedPosition: availablePositions.left && availablePositions.right ? weakerLeg :
                               availablePositions.left ? 'left' :
                               availablePositions.right ? 'right' : null,
            reason: availablePositions.left && availablePositions.right ? 
                   `Build the weaker ${weakerLeg} leg (${weakerLeg === 'left' ? leftLegStats.count : rightLegStats.count} members) to balance your binary structure` :
                   availablePositions.left ? `Only LEFT position is available` :
                   availablePositions.right ? `Only RIGHT position is available` :
                   `No positions available - both slots are occupied`,
            impactAnalysis: {
              leftChoice: `Left leg would have ${leftLegStats.count + 1} members`,
              rightChoice: `Right leg would have ${rightLegStats.count + 1} members`
            }
          }
        };
      })
    );
    
    return enrichedRecruits;
  }

  // Get statistical information for a leg (downline count and volume)
  async getLegStats(rootUserId: string): Promise<{ count: number; volume: number }> {
    const downlineMembers = await this.getDownline(rootUserId);
    const totalVolume = downlineMembers.reduce((sum, member) => 
      sum + parseFloat(member.packageAmount || '0'), 0
    );
    
    return {
      count: downlineMembers.length + 1, // Include the root user
      volume: totalVolume + parseFloat((await this.getUser(rootUserId))?.packageAmount || '0')
    };
  }

  // Get direct children stats for position recommendations (not entire downline)
  async getDirectChildrenStats(rootUserId: string): Promise<{ count: number; volume: number }> {
    const directChildren = await db.select()
      .from(users)
      .where(eq(users.parentId, rootUserId));
    
    const totalVolume = directChildren.reduce((sum, member) => 
      sum + parseFloat(member.packageAmount || '0'), 0
    );
    
    return {
      count: directChildren.length,
      volume: totalVolume
    };
  }

  // Check available positions for a given upline
  async getAvailablePositions(uplineId: string): Promise<{ left: boolean; right: boolean }> {
    const upline = await this.getUser(uplineId);
    return {
      left: !upline?.leftChildId,
      right: !upline?.rightChildId
    };
  }

  // Upline decides position for pending recruit
  async uplineDecidePosition(pendingRecruitId: string, uplineId: string, decision: 'approved' | 'rejected', position?: 'left' | 'right', referralToken?: string): Promise<void> {
    if (decision === 'approved' && !position) {
      throw new Error('Position must be specified when approving');
    }

    const updateData: any = {
      uplineDecision: decision,
      uplineDecisionAt: new Date(),
      updatedAt: new Date(),
    };

    if (decision === 'approved') {
      updateData.position = position;
      // NEW WORKFLOW: Set to awaiting_details so recruit gets referral link for complete registration
      updateData.status = 'awaiting_details'; // Generate referral link for full details
    } else {
      updateData.status = 'rejected';
    }

    await db.update(pendingRecruits)
      .set(updateData)
      .where(and(
        eq(pendingRecruits.id, pendingRecruitId),
        eq(pendingRecruits.uplineId, uplineId)
      ));
  }


  async approvePendingRecruit(id: string, adminData: { packageAmount: string; position?: string; kycDecision?: { status: 'approved' | 'rejected' | 'pending'; reason?: string } }): Promise<User> {
    console.log('=== APPROVING PENDING RECRUIT ===');
    console.log('Recruit ID:', id);
    console.log('Package Amount:', adminData.packageAmount);
    
    // Get the pending recruit
    const [pendingRecruit] = await db.select().from(pendingRecruits).where(eq(pendingRecruits.id, id));
    console.log('Found pending recruit:', !!pendingRecruit);
    console.log('Recruit status:', pendingRecruit?.status);
    console.log('Upline decision:', pendingRecruit?.uplineDecision);
    console.log('Position:', pendingRecruit?.position);
    
    if (!pendingRecruit) {
      console.log('ERROR: Pending recruit not found with ID:', id);
      throw new Error('Pending recruit not found');
    }

    // Check if recruit is ready for admin approval
    // Special case: If recruiter is admin, allow direct approval
    // We need to check the recruiter's role from the users table
    const recruiter = await this.getUser(pendingRecruit.recruiterId); // recruiterId is always null as per new code for multi-child tree
    const isAdminGenerated = recruiter?.role === 'admin' || recruiter?.role === 'founder';
    
    if (isAdminGenerated) {
      console.log('*** ADMIN-GENERATED RECRUIT - DIRECT APPROVAL ALLOWED ***');
      console.log('Recruiter role:', recruiter?.role);
      console.log('Current status:', pendingRecruit.status);
      console.log('Upline decision:', pendingRecruit.uplineDecision);
      
      // For admin-generated recruits, we can approve directly
      // Allow approval if status is 'awaiting_admin' OR if it's an old recruit with 'awaiting_upline' status
      if (pendingRecruit.status !== 'awaiting_admin' && pendingRecruit.status !== 'awaiting_upline') {
        console.log('ERROR: Admin-generated recruit not in correct status for approval');
        throw new Error('Admin-generated recruit not ready for approval');
      }
      
      // If it's an old recruit with 'awaiting_upline' status, we'll update it during approval
      if (pendingRecruit.status === 'awaiting_upline') {
        console.log('Updating old admin-generated recruit status from awaiting_upline to awaiting_admin');
        await db.update(pendingRecruits)
          .set({ 
            status: 'awaiting_admin',
            updatedAt: new Date()
          })
          .where(eq(pendingRecruits.id, pendingRecruit.id));
      }
    } else {
      // For regular recruits, check upline approval
      if (pendingRecruit.status !== 'awaiting_admin' || pendingRecruit.uplineDecision !== 'approved') {
        console.log('ERROR: Regular recruit not ready for admin approval');
        throw new Error('Recruit must be approved by upline first');
      }
    }

    // Handle position requirement - Admin can override upline decision
    let finalPosition = pendingRecruit.position;
    
    // Admin can always override position if provided
    if (adminData.position) {
      finalPosition = adminData.position;
      console.log('Admin overriding position to:', finalPosition);
    } else if (!finalPosition) {
      // If no position set anywhere, require admin to provide one
      console.log('ERROR: No position set by upline or admin');
      throw new Error('Position must be set by upline or admin before approval');
    }
    
    console.log('Final position for approval:', finalPosition);

    // Check if user already exists
    const existingUser = await this.getUserByEmail(pendingRecruit.email);
    console.log('Existing user check:', !!existingUser);
    if (existingUser) {
      console.log('ERROR: User already exists with email:', pendingRecruit.email);
      throw new Error('User already exists with this email');
    }

    // Create the user with approved data
    const names = pendingRecruit.fullName.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || '';

    // Use stored password if available (comprehensive registration), otherwise use default
    const passwordToUse = pendingRecruit.password || 'defaultpass123';
    
    // Generate random user ID
    const userId = await this.generateNextUserId();
    
    const [newUser] = await db.insert(users).values({
      userId,
      email: pendingRecruit.email,
      firstName,
      lastName,
      mobile: pendingRecruit.mobile,
      sponsorId: pendingRecruit.recruiterId,
      packageAmount: adminData.packageAmount,
      position: finalPosition, // Use final position (from upline or admin)
      registrationDate: pendingRecruit.createdAt,
      activationDate: new Date(),
      idStatus: 'Active',
      role: 'user',
      status: 'active',
      password: passwordToUse,
      // Include comprehensive data if available
      dateOfBirth: pendingRecruit.dateOfBirth,
      address: pendingRecruit.address,
      city: pendingRecruit.city,
      state: pendingRecruit.state,
      pincode: pendingRecruit.pincode,
      panNumber: pendingRecruit.panNumber,
      aadhaarNumber: pendingRecruit.aadhaarNumber,
      bankAccountNumber: pendingRecruit.bankAccountNumber,
      bankIFSC: pendingRecruit.bankIFSC,
      bankName: pendingRecruit.bankName,
      bankAccountHolderName: pendingRecruit.bankAccountHolderName,
      nominee: pendingRecruit.nominee,
      profileImageUrl: pendingRecruit.profileImageUrl,
    }).returning();

    // Place user in tree (LEGACY - commented out)
    // if (!pendingRecruit.uplineId) {
    //   throw new Error('Upline ID is required for position placement');
    // }
    // await this.placeUserInBinaryTreeAtSpecificPosition(newUser.id, pendingRecruit.uplineId, finalPosition as 'left' | 'right', pendingRecruit.recruiterId);

    // Place user in multi-child tree at the final position (NEW)
    if (!pendingRecruit.uplineId) {
      throw new Error('Upline ID is required for position placement');
    }
    
    // Use the position from pending recruit (set during referral link registration)
    const placementPosition = finalPosition as 'left' | 'right';
    await this.placeUserInMultiChildTree(newUser.id, pendingRecruit.recruiterId, pendingRecruit.uplineId, placementPosition);

    // Create wallet balance for the new user
    await this.createWalletBalance(userId);

    // ===== LEGACY URL DOCUMENT TRANSFER (COMMENTED OUT TO PREVENT DUPLICATES) =====
    // This code was creating duplicate documents during approval process
    // Documents are now stored as binary data during registration and transferred via the binary transfer process below
    
    /*
    // Transfer KYC documents if available from comprehensive registration
    if (pendingRecruit.panCardUrl || pendingRecruit.aadhaarFrontUrl || 
        pendingRecruit.bankCancelledChequeUrl || pendingRecruit.profileImageUrl) {
      const { kycDocuments } = await import('@shared/schema');
      
      // Transfer PAN card
      if (pendingRecruit.panCardUrl) {
        await db.insert(kycDocuments).values({
          userId: newUser.id,
          documentType: 'pan_card',
          documentUrl: pendingRecruit.panCardUrl,
          documentNumber: pendingRecruit.panNumber,
          status: 'pending'
        });
      }
      
      // Transfer Aadhaar front card  
      if (pendingRecruit.aadhaarFrontUrl) {
        await db.insert(kycDocuments).values({
          userId: newUser.id,
          documentType: 'aadhaar_front',
          documentUrl: pendingRecruit.aadhaarFrontUrl,
          documentNumber: pendingRecruit.aadhaarNumber,
          status: 'pending'
        });
      }
      
      // Transfer Aadhaar back card  
      if (pendingRecruit.aadhaarBackUrl) {
        await db.insert(kycDocuments).values({
          userId: newUser.id,
          documentType: 'aadhaar_back',
          documentUrl: pendingRecruit.aadhaarBackUrl,
          documentNumber: pendingRecruit.aadhaarNumber,
          status: 'pending'
        });
      }
      
      // Transfer bank cancelled cheque
      if (pendingRecruit.bankCancelledChequeUrl) {
        await db.insert(kycDocuments).values({
          userId: newUser.id,
          documentType: 'bank_details',
          documentUrl: pendingRecruit.bankCancelledChequeUrl,
          status: 'pending'
        });
      }
      
      // Transfer profile photo
      if (pendingRecruit.profileImageUrl) {
        await db.insert(kycDocuments).values({
          userId: newUser.id,
          documentType: 'photo',
          documentUrl: pendingRecruit.profileImageUrl,
          status: 'pending'
        });
      }
      
      console.log(`KYC documents transferred for user ${newUser.email}`);
    }
    */

    // Transfer KYC documents from temp user ID to real user ID (for binary documents)
    try {
      console.log('🔄 Transferring binary KYC documents from temp user to real user...');
      const tempUserId = `pending_${pendingRecruit.id}`;
      
      // Update all KYC documents from temp user ID to real user ID
      await db.update(kycDocuments)
        .set({ 
          userId: newUser.id,
          status: adminData.kycDecision?.status || 'pending'
        })
        .where(eq(kycDocuments.userId, tempUserId));
      
      console.log('✅ Binary KYC documents transferred successfully');
    } catch (transferError) {
      console.error('❌ Error transferring binary KYC documents:', transferError);
      // Continue with user creation even if document transfer fails
    }

    // Create KYC profile record for the user
    try {
      console.log('🔍 Starting KYC record creation...');
      console.log('🔍 Admin data received:', adminData);
      console.log('🔍 KYC decision:', adminData.kycDecision);
      
      const { kycDocuments } = await import('@shared/schema');
      
      // Determine initial KYC status based on admin decision
      let initialStatus: 'pending' | 'approved' | 'rejected' = 'pending';
      let initialReason = '';
      
      if (adminData.kycDecision) {
        initialStatus = adminData.kycDecision.status;
        initialReason = adminData.kycDecision.reason || '';
        console.log('🔍 Using admin KYC decision:', initialStatus, initialReason);
      } else {
        initialStatus = 'pending';
        initialReason = 'Documents submitted, awaiting admin verification';
        console.log('🔍 No KYC decision provided, using default pending status');
      }
      
      // Create single KYC profile record (status tracker)
      await db.insert(kycDocuments).values({
        userId: newUser.id,
        documentType: 'kyc_profile',
        documentUrl: '', // Always empty - this is just a status tracker, not a viewable document
        documentNumber: '',
        status: initialStatus,
        rejectionReason: initialStatus === 'rejected' ? initialReason : null,
        reviewedBy: adminData.kycDecision ? 'admin' : null,
        reviewedAt: adminData.kycDecision ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✅ Created KYC profile record for user ${newUser.email} with status: ${initialStatus}`);
      console.log('🔍 KYC record details:', {
        userId: newUser.id,
        documentType: 'kyc_profile',
        status: initialStatus,
        rejectionReason: initialStatus === 'rejected' ? initialReason : null
      });
      
      // Create notification for KYC status change if admin made a decision
      if (adminData.kycDecision) {
        await this.createKYCStatusNotification(newUser.id, adminData.kycDecision.status, adminData.kycDecision.reason);
      }
      
    } catch (kycError) {
      console.error('Error creating KYC profile record:', kycError);
      // Continue with user creation even if KYC record creation fails
    }

    // Send login credentials email
    try {
      const { sendLoginCredentialsEmail } = await import('./emailService');
      // Send the actual password stored in the database
      const passwordForEmail = newUser.password || 'defaultpass123';
      const emailSent = await sendLoginCredentialsEmail(newUser.email!, firstName, passwordForEmail, newUser.userId!);
      if (emailSent) {
        console.log(`Login credentials email sent to ${newUser.email}`);
      } else {
        console.log(`Failed to send email to ${newUser.email} - User can still login`);
      }
    } catch (emailError) {
      console.error('Error sending login credentials email:', emailError);
      // Continue with user creation even if email fails
    }

    // Remove from pending recruits
    await db.delete(pendingRecruits).where(eq(pendingRecruits.id, id));

    return newUser;
  }

  async rejectPendingRecruit(id: string, rejectedBy: string, reason: string): Promise<boolean> {
    // Get the pending recruit data for notifications
    const [recruit] = await db.select().from(pendingRecruits).where(eq(pendingRecruits.id, id));
    
    if (!recruit) {
      return false;
    }

    // Create notifications for all involved parties
    await this.createRejectNotifications(recruit, rejectedBy, reason);
    
    // Update the recruit status to rejected instead of deleting
    const result = await db.update(pendingRecruits)
      .set({
        status: 'rejected',
        uplineDecision: 'rejected',
        rejectionReason: reason,
        rejectedBy: rejectedBy,
        rejectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pendingRecruits.id, id));
    
    return result.rowCount > 0;
  }

  // Create notifications for recruit rejection
  private async createRejectNotifications(recruit: any, rejectedBy: string, reason: string) {
    const { notifications } = await import('@shared/schema');
    
    // Get rejector info
    const rejector = await this.getUser(rejectedBy);
    const rejectorName = rejector ? `${rejector.firstName} ${rejector.lastName}`.trim() : 'Admin';
    
    // Notification for recruiter
    await db.insert(notifications).values({
      userId: recruit.recruiterId,
      type: 'recruit_rejected',
      title: 'Recruit Rejected',
      message: `Your recruit "${recruit.fullName}" has been rejected by ${rejectorName}. Reason: ${reason}`,
      data: {
        recruitId: recruit.id,
        recruitName: recruit.fullName,
        recruitEmail: recruit.email,
        rejectedBy: rejectedBy,
        reason: reason
      }
    });

    // If upline is different from recruiter, notify upline too
    if (recruit.uplineId && recruit.uplineId !== recruit.recruiterId) {
      await db.insert(notifications).values({
        userId: recruit.uplineId,
        type: 'recruit_rejected',
        title: 'Position Decision Rejected',
        message: `Recruit "${recruit.fullName}" that required your position decision has been rejected by ${rejectorName}. Reason: ${reason}`,
        data: {
          recruitId: recruit.id,
          recruitName: recruit.fullName,
          recruitEmail: recruit.email,
          rejectedBy: rejectedBy,
          reason: reason
        }
      });
    }
  }

  // Create notification for KYC status change
  private async createKYCStatusNotification(userId: string, status: 'pending' | 'approved' | 'rejected', reason?: string) {
    try {
      const { notifications } = await import('@shared/schema');
      
      let title = '';
      let message = '';
      
      if (status === 'approved') {
        title = 'KYC Documents Approved';
        message = 'Your KYC documents have been approved by the admin. You can now access all platform features.';
      } else if (status === 'rejected') {
        title = 'KYC Documents Rejected';
        message = reason ? 
          `Your KYC documents have been rejected. Reason: ${reason}. Please update your documents and resubmit.` :
          'Your KYC documents have been rejected. Please update your documents and resubmit.';
      } else if (status === 'pending') {
        title = 'KYC Documents Under Review';
        message = 'Your KYC documents have been submitted and are currently under review by our admin team.';
      }
      
      await db.insert(notifications).values({
        userId: userId,
        type: 'kyc_status_change',
        title: title,
        message: message,
        data: {
          status: status,
          reason: reason || null,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log(`✅ KYC status notification created for user ${userId}: ${status}`);
    } catch (error) {
      console.error('Error creating KYC status notification:', error);
    }
  }

  // Notifications operations
  async getNotifications(userId: string): Promise<any[]> {
    const { notifications } = await import('@shared/schema');
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const { notifications } = await import('@shared/schema');
    const result = await db.update(notifications)
      .set({ read: true })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
    return result.rowCount > 0;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    const { notifications } = await import('@shared/schema');
    const result = await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
    return result.rowCount > 0;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const { notifications } = await import('@shared/schema');
    const [result] = await db.select({ count: sql`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
    return parseInt(result.count as string) || 0;
  }

  async createBroadcastNotification(title: string, message: string): Promise<number> {
    const { notifications } = await import('@shared/schema');
    
    // Get all active users (excluding admins only) - select UUID id for foreign key
    const allUsers = await db.select({ id: users.id })
      .from(users)
      .where(and(
        ne(users.role, 'admin'),
        eq(users.status, 'active')
      ));
    
    if (allUsers.length === 0) {
      return 0;
    }

    // Create notification for each user using UUID id (not display userId)
    const notificationValues = allUsers.map(user => ({
      userId: user.id,  // Use UUID id for foreign key reference
      type: 'broadcast',
      title,
      message,
      read: false,
    }));

    await db.insert(notifications).values(notificationValues);
    
    console.log(`✅ Broadcast notification sent to ${allUsers.length} users`);
    return allUsers.length;
  }

  // Binary MLM Tree operations
  async getBinaryTreeData_legacy(userId: string): Promise<any> {
    // Import and use binary tree service
    const { binaryTreeService } = await import('./binaryTreeService_legacy');
    // Increase depth to 10 to show complete tree including grandchildren
    const treeData = await binaryTreeService.getBinaryTree(userId, 10);
    console.log('=== BINARY TREE DATA (LEGACY) ===');
    console.log('Root user:', userId);
    console.log('Tree structure:', JSON.stringify(treeData, null, 2));
    return treeData;
  }

  async getDirectRecruits_legacy(userId: string): Promise<User[]> {
    // Import and use binary tree service
    const { binaryTreeService } = await import('./binaryTreeService_legacy');
    const binaryUsers = await binaryTreeService.getDirectRecruits(userId);
    
    // Convert BinaryTreeUser to User format
    return binaryUsers.map(bu => ({
      id: bu.id,
      userId: bu.id, // BinaryTreeUser uses id as the display ID
      email: bu.email || null,
      password: '', // Not exposed
      originalPassword: null,
      firstName: bu.firstName,
      lastName: bu.lastName,
      profileImageUrl: null,
      role: 'user' as const,
      status: bu.idStatus === 'Active' ? 'active' as const : 'inactive' as const,
      emailVerified: null,
      lastActiveAt: null,
      sponsorId: bu.sponsorId,
      parentId: bu.parentId,
      leftChildId: bu.leftChildId,
      rightChildId: bu.rightChildId,
      position: bu.position,
      level: bu.level,
      packageAmount: bu.packageAmount,
      registrationDate: bu.registrationDate,
      activationDate: bu.activationDate,
      idStatus: bu.idStatus,
      mobile: null,
      createdAt: bu.registrationDate,
      updatedAt: bu.registrationDate,
      // Add all required fields with default values
      panNumber: null,
      aadhaarNumber: null,
      bankAccountNumber: null,
      bankIFSC: null,
      bankName: null,
      bankAccountHolderName: null,
      dateOfBirth: null,
      address: null,
      city: null,
      state: null,
      pincode: null,
      nominee: null,
      currentRank: null,
      totalBV: null,
      leftBV: null,
      rightBV: null,
      totalDirects: 0,
      leftDirects: 0,
      rightDirects: 0,
      kycStatus: null,
      kycSubmittedAt: null,
      kycApprovedAt: null,
      txnPin: null,
      cryptoWalletAddress: null,
      firstLogin: true,
      passwordChangedAt: null,
      isHiddenId: false,
      kycDeadline: null,
      kycLocked: false,
      lastLoginAt: null,
      order: 0, // Default order for legacy binary tree users
    }));
  }

  async placeUserInBinaryTree(userId: string, sponsorId: string): Promise<void> {
    const { binaryTreeService } = await import('./binaryTreeService_legacy');
    const position = await binaryTreeService.findNextAvailablePosition(sponsorId);
    await binaryTreeService.placeUserInTree(userId, position.parentId, position.position, sponsorId);
  }

  // Place user at specific position decided by upline (with intelligent spillover)
  async placeUserInBinaryTreeAtSpecificPosition(userId: string, uplineId: string, desiredPosition: 'left' | 'right', sponsorId: string): Promise<void> {
    const { binaryTreeService } = await import('./binaryTreeService_legacy');
    
    // Get the upline who made the strategic decision
    const upline = await this.getUser(uplineId);
    if (!upline) {
      throw new Error('Upline not found');
    }

    const uplineUser = await db.select().from(users).where(eq(users.id, uplineId)).limit(1);
    if (!uplineUser.length) {
      throw new Error('Upline not found in database');
    }

    const uplineData = uplineUser[0];

    // Check if desired position under upline is directly available
    const directPositionAvailable = desiredPosition === 'left' ? !uplineData.leftChildId : !uplineData.rightChildId;
    
    if (directPositionAvailable) {
      // Direct placement under upline
      await binaryTreeService.placeUserInTree(userId, uplineId, desiredPosition, sponsorId);
    } else {
      // Strategic spillover placement in the chosen direction
      await binaryTreeService.placeUserInDirectionalSpillover(userId, uplineId, desiredPosition, sponsorId);
    }
  }

  // ===== MULTI-CHILD MLM TREE OPERATIONS (NEW) =====
  async getMultiChildTreeData(userId: string): Promise<any> {
    // Get user data
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get direct children
    const children = await this.getMultiChildDirectRecruits(userId);
    
    // Get grandchildren (up to 2 levels deep)
    const grandchildren = [];
    for (const child of children) {
      const childChildren = await this.getMultiChildDirectRecruits(child.id);
      grandchildren.push(...childChildren);
    }

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        position: user.position,
        order: user.order,
        status: user.status,
        packageAmount: user.packageAmount,
        totalBV: user.totalBV,
        leftBV: user.leftBV,
        rightBV: user.rightBV,
        totalDirects: user.totalDirects,
        leftDirects: user.leftDirects,
        rightDirects: user.rightDirects,
      },
      children: children.map(child => ({
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        email: child.email,
        position: child.position,
        order: child.order,
        status: child.status,
        packageAmount: child.packageAmount,
        totalBV: child.totalBV,
        leftBV: child.leftBV,
        rightBV: child.rightBV,
        totalDirects: child.totalDirects,
        leftDirects: child.leftDirects,
        rightDirects: child.rightDirects,
      })),
      grandchildren: grandchildren.map(grandchild => ({
        id: grandchild.id,
        firstName: grandchild.firstName,
        lastName: grandchild.lastName,
        email: grandchild.email,
        position: grandchild.position,
        order: grandchild.order,
        status: grandchild.status,
        packageAmount: grandchild.packageAmount,
        totalBV: grandchild.totalBV,
        leftBV: grandchild.leftBV,
        rightBV: grandchild.rightBV,
        totalDirects: grandchild.totalDirects,
        leftDirects: grandchild.leftDirects,
        rightDirects: grandchild.rightDirects,
      }))
    };
  }

  async getMultiChildDirectRecruits(userId: string): Promise<User[]> {
    // Normalize userId to Display ID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let normalizedUserId = userId;
    
    if (uuidPattern.test(userId)) {
      const user = await db.select({ userId: users.userId }).from(users).where(eq(users.id, userId)).limit(1);
      normalizedUserId = user[0]?.userId || userId;
    }
    
    // Get all direct children of the user
    const directChildren = await db.select()
      .from(users)
      .where(eq(users.parentId, normalizedUserId))
      .orderBy(asc(users.position), asc(users.order));

    return directChildren;
  }

  async placeUserInMultiChildTree(userId: string, sponsorId: string, uplineId: string, desiredPosition?: 'left' | 'right'): Promise<void> {
    // Helper function to normalize ID to Display ID format
    const normalizeToDisplayId = async (id: string): Promise<string> => {
      if (!id) return id;
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidPattern.test(id)) {
        const user = await db.select({ userId: users.userId }).from(users).where(eq(users.id, id)).limit(1);
        return user[0]?.userId || id;
      }
      return id;
    };
    
    // Normalize both sponsorId and uplineId to Display ID format
    const normalizedSponsorId = await normalizeToDisplayId(sponsorId);
    const normalizedUplineId = await normalizeToDisplayId(uplineId);
    
    let position: 'left' | 'right';
    let order: number;

    if (desiredPosition) {
      // Use the desired position from referral link
      position = desiredPosition;
      
      // Get count for the desired position to determine order
      const countResult = await db.select({ count: sql`count(*)` })
        .from(users)
        .where(and(eq(users.parentId, normalizedUplineId), eq(users.position, desiredPosition)));
      
      order = parseInt(countResult[0]?.count as string) || 0;
    } else {
      // Fallback to auto-balancing if no position specified
      const leftCount = await db.select({ count: sql`count(*)` })
        .from(users)
        .where(and(eq(users.parentId, normalizedUplineId), eq(users.position, 'left')));
      
      const rightCount = await db.select({ count: sql`count(*)` })
        .from(users)
        .where(and(eq(users.parentId, normalizedUplineId), eq(users.position, 'right')));

      const leftChildrenCount = parseInt(leftCount[0]?.count as string) || 0;
      const rightChildrenCount = parseInt(rightCount[0]?.count as string) || 0;

      // Choose side with fewer children (left if equal)
      position = leftChildrenCount <= rightChildrenCount ? 'left' : 'right';
      order = position === 'left' ? leftChildrenCount : rightChildrenCount;
    }

    // Update user with tree position - use normalized Display IDs
    // sponsorId = the person who recruited (referrer)
    // parentId = the person directly above in tree (upline, can differ due to spillover)
    await db.update(users)
      .set({
        sponsorId: normalizedSponsorId,
        parentId: normalizedUplineId,
        position: position,
        order: order,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Update parent's direct counts (use uplineId as they are the direct parent in tree)
    if (position === 'left') {
      await db.update(users)
        .set({ 
          leftDirects: sql`left_directs + 1`,
          totalDirects: sql`total_directs + 1`,
          updatedAt: new Date()
        })
        .where(eq(users.userId, normalizedUplineId));
    } else {
      await db.update(users)
        .set({ 
          rightDirects: sql`right_directs + 1`,
          totalDirects: sql`total_directs + 1`,
          updatedAt: new Date()
        })
        .where(eq(users.userId, normalizedUplineId));
    }
  }

  // ===== PRODUCT OPERATIONS =====
  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductsByType(type: 'first_purchase' | 'second_purchase'): Promise<Product[]> {
    return await db.select().from(products)
      .where(and(eq(products.purchaseType, type), eq(products.isActive, true)))
      .orderBy(desc(products.createdAt));
  }

  async createProduct(data: CreateProduct): Promise<Product> {
    const [product] = await db.insert(products).values(data).returning();
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ===== PURCHASE OPERATIONS =====
  async createPurchase(userId: string, data: CreatePurchase): Promise<Purchase> {
    // Normalize UUID to Display ID for database consistency
    const normalizedUserId = await this.normalizeToDisplayId(userId);
    
    const product = await this.getProductById(data.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Calculate amounts including GST
    const baseAmount = parseFloat(product.price) * data.quantity;
    const gstPercentage = parseFloat(product.gst);
    const gstAmount = (baseAmount * gstPercentage) / 100;
    const totalAmount = baseAmount + gstAmount; // Total amount INCLUDING GST
    const totalBV = parseFloat(product.bv) * data.quantity;

    // CRITICAL: Validate wallet balance for wallet payments
    if (data.paymentMethod === 'wallet') {
      // Get user's wallet balance
      let wallet = await this.getWalletBalance(normalizedUserId);
      if (!wallet) {
        // Create wallet if doesn't exist (with 0 balance)
        wallet = await this.createWalletBalance(normalizedUserId);
      }

      const currentBalance = parseFloat(wallet.balance || '0');
      
      // Check if user has sufficient balance
      if (currentBalance < totalAmount) {
        throw new Error(
          `Insufficient wallet balance. Required: ₹${totalAmount.toFixed(2)}, Available: ₹${currentBalance.toFixed(2)}`
        );
      }

      // Deduct amount from wallet balance
      const newBalance = currentBalance - totalAmount;
      await db.update(walletBalances)
        .set({
          balance: newBalance.toString(),
          updatedAt: new Date()
        })
        .where(eq(walletBalances.userId, normalizedUserId));

      // Create transaction record for wallet deduction
      await db.insert(transactions).values({
        userId: normalizedUserId,
        type: 'purchase' as any,
        amount: totalAmount.toString(),
        description: `Product purchase - ${product.name} (Qty: ${data.quantity}, ₹${baseAmount.toFixed(2)} + GST ${gstPercentage}%)`,
        referenceId: product.id,
        balanceBefore: currentBalance.toString(),
        balanceAfter: newBalance.toString()
      });
    }

    const [purchase] = await db.insert(purchases).values({
      userId: normalizedUserId,  // Use normalized Display ID
      productId: data.productId,
      quantity: data.quantity,
      totalAmount: totalAmount.toString(),
      totalBV: totalBV.toString(),
      paymentMethod: data.paymentMethod,
      paymentStatus: 'completed', // Set to completed since purchase is created when user completes form
      deliveryAddress: data.deliveryAddress,
    }).returning();

    // Process income distribution and BV updates since payment is completed
    await this.processIncomeDistribution(purchase.id);
    
    return purchase;
  }

  async getUserPurchases(userId: string): Promise<Purchase[]> {
    // Normalize UUID to Display ID for consistency
    const normalizedUserId = await this.normalizeToDisplayId(userId);
    
    return await db.select().from(purchases)
      .where(eq(purchases.userId, normalizedUserId))
      .orderBy(desc(purchases.createdAt));
  }

  async getAllPurchasesWithDetails(): Promise<any[]> {
    // Get all purchases with joined user and product data
    const allPurchases = await db
      .select({
        id: purchases.id,
        userId: purchases.userId,
        productId: purchases.productId,
        quantity: purchases.quantity,
        totalAmount: purchases.totalAmount,
        totalBV: purchases.totalBV,
        paymentMethod: purchases.paymentMethod,
        paymentStatus: purchases.paymentStatus,
        deliveryStatus: purchases.deliveryStatus,
        deliveryAddress: purchases.deliveryAddress,
        trackingId: purchases.trackingId,
        createdAt: purchases.createdAt,
        // User details
        userDisplayId: users.userId,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        userMobile: users.mobile,
        // Product details
        productName: products.name,
        productDescription: products.description,
        productCategory: products.category,
        productPrice: products.price,
        productBV: products.bv,
      })
      .from(purchases)
      .leftJoin(users, eq(purchases.userId, users.userId))
      .leftJoin(products, eq(purchases.productId, products.id))
      .orderBy(desc(purchases.createdAt));

    return allPurchases;
  }

  async getPurchaseById(id: string): Promise<Purchase | undefined> {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
    return purchase;
  }

  async updatePurchaseStatus(id: string, status: string): Promise<boolean> {
    const result = await db
      .update(purchases)
      .set({ paymentStatus: status, updatedAt: new Date() })
      .where(eq(purchases.id, id));
    
    // If payment is completed, trigger BV calculations
    if (status === 'completed' && (result.rowCount ?? 0) > 0) {
      console.log(`💰 Payment completed for purchase ${id}, triggering BV calculations`);
      try {
        await this.processIncomeDistribution(id);
        console.log(`✅ BV calculations completed for purchase ${id}`);
      } catch (error) {
        console.error(`❌ Error in BV calculations for purchase ${id}:`, error);
      }
    }
    
    return (result.rowCount ?? 0) > 0;
  }

  async updateDeliveryStatus(id: string, status: string, trackingId?: string): Promise<boolean> {
    const updateData: any = { 
      deliveryStatus: status, 
      updatedAt: new Date() 
    };
    
    // If tracking ID is provided, update it as well
    if (trackingId !== undefined) {
      updateData.trackingId = trackingId;
    }
    
    const result = await db
      .update(purchases)
      .set(updateData)
      .where(eq(purchases.id, id));
    
    return (result.rowCount ?? 0) > 0;
  }

  // ===== WALLET OPERATIONS =====
  async getWalletBalance(userId: string): Promise<WalletBalance | undefined> {
    // Normalize UUID to Display ID for consistency
    const normalizedUserId = await this.normalizeToDisplayId(userId);
    const [wallet] = await db.select().from(walletBalances).where(eq(walletBalances.userId, normalizedUserId));
    return wallet;
  }

  async createWalletBalance(userId: string): Promise<WalletBalance> {
    // Normalize UUID to Display ID for consistency
    const normalizedUserId = await this.normalizeToDisplayId(userId);
    const [wallet] = await db.insert(walletBalances).values({ userId: normalizedUserId }).returning();
    return wallet;
  }

  /**
   * Updates wallet balance with comprehensive validation and error handling.
   * 
   * FUTURE TRANSACTION IMPLEMENTATION:
   * When switching to a database driver that supports transactions (e.g., Neon WebSocket, PostgreSQL),
   * replace the direct operations below with the following transaction-based approach:
   * 
   * ```typescript
   * return await db.transaction(async (tx) => {
   *   // Re-fetch wallet within transaction to get latest values (prevents race conditions)
   *   const [latestWallet] = await tx.select().from(walletBalances).where(eq(walletBalances.userId, userId)).limit(1);
   *   
   *   if (!latestWallet) {
   *     throw new Error('Wallet not found during transaction');
   *   }
   * 
   *   const currentBalance = parseFloat(latestWallet.balance || '0');
   *   const currentEarnings = parseFloat(latestWallet.totalEarnings || '0');
   *   const currentWithdrawals = parseFloat(latestWallet.totalWithdrawals || '0');
   * 
   *   // ... business logic calculations ...
   * 
   *   // Update wallet balance within transaction
   *   await tx.update(walletBalances)
   *     .set(updateData)
   *     .where(eq(walletBalances.userId, userId));
   * 
   *   // Create transaction record within transaction
   *   const [transaction] = await tx.insert(transactions).values({
   *     userId,
   *     type: type as any,
   *     amount,
   *     description,
   *     balanceBefore: currentBalance.toString(),
   *     balanceAfter: updateData.balance || currentBalance.toString(),
   *   }).returning();
   * 
   *   return transaction;
   * });
   * ```
   * 
   * BENEFITS OF TRANSACTION IMPLEMENTATION:
   * - Atomic operations (all succeed or all fail)
   * - Race condition prevention
   * - Data consistency guarantees
   * - Proper isolation levels
   * - Rollback capability on errors
   * 
   * CURRENT IMPLEMENTATION:
   * Uses direct operations with manual validation due to Neon HTTP driver limitations.
   * Includes comprehensive error handling and input validation.
   */
  async updateWalletBalance(userId: string, amount: string, description: string, type: any): Promise<Transaction> {
    // Input validation and sanitization
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Invalid userId: must be a non-empty string');
    }
    
    if (!amount || typeof amount !== 'string' || amount.trim().length === 0) {
      throw new Error('Invalid amount: must be a non-empty string');
    }
    
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      throw new Error('Invalid description: must be a non-empty string');
    }
    
    if (!type || typeof type !== 'string' || type.trim().length === 0) {
      throw new Error('Invalid type: must be a non-empty string');
    }

    // Sanitize and validate amount
    const sanitizedAmount = amount.trim();
    const changeAmount = parseFloat(sanitizedAmount);
    
    // Validate numeric amount
    if (isNaN(changeAmount) || !isFinite(changeAmount)) {
      throw new Error(`Invalid amount format: "${amount}" is not a valid number`);
    }
    
    // Validate amount range (prevent extremely large values)
    if (Math.abs(changeAmount) > 999999999) { // 999 million limit
      throw new Error('Amount exceeds maximum limit of ₹999,999,999');
    }
    
    // Validate amount precision (max 2 decimal places)
    const decimalPlaces = (sanitizedAmount.split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      throw new Error('Amount cannot have more than 2 decimal places');
    }

    let wallet = await this.getWalletBalance(userId);
    if (!wallet) {
      wallet = await this.createWalletBalance(userId);
    }

    // Validate transaction type against whitelist
    const allowedTypes = [
      'fundRequest',
      'withdrawal', 
      'sponsor_income',
      'sales_bonus',
      'sales_incentive',
      'consistency_bonus',
      'franchise_income',
      'car_fund',
      'travel_fund',
      'leadership_fund',
      'house_fund',
      'millionaire_club',
      'royalty_income',
      'purchaseProduct',
      'admin_credit',
      'admin_debit'
    ];
    
    if (!allowedTypes.includes(type)) {
      console.warn(`⚠️ Unknown transaction type: "${type}". Treating as admin operation. Allowed types: ${allowedTypes.join(', ')}`);
      // Don't throw error, just log and continue with default behavior
    }

    // DIRECT OPERATIONS IMPLEMENTATION (due to Neon HTTP driver limitations)
    // TODO: Replace with transaction-based approach when switching to WebSocket driver
    
    try {
      // Re-fetch wallet to get latest values (manual race condition mitigation)
      const [latestWallet] = await db.select().from(walletBalances).where(eq(walletBalances.userId, userId)).limit(1);
      
      if (!latestWallet) {
        throw new Error('Wallet not found for user: ' + userId);
      }

      const currentBalance = parseFloat(latestWallet.balance || '0');
      const currentEarnings = parseFloat(latestWallet.totalEarnings || '0');
      const currentWithdrawals = parseFloat(latestWallet.totalWithdrawals || '0');

      // Additional validation for wallet data integrity
      if (isNaN(currentBalance) || isNaN(currentEarnings) || isNaN(currentWithdrawals)) {
        throw new Error('Invalid wallet data: corrupted balance values detected');
      }

      if (currentBalance < 0 || currentEarnings < 0 || currentWithdrawals < 0) {
        throw new Error('Invalid wallet state: negative values detected');
      }

      // Prepare update data based on transaction type
      const updateData: any = {
        updatedAt: new Date()
      };

    // Scenario 1: Fund Management (fundRequest) - Only affects balance (E-wallet)
    if (type === 'fundRequest') {
      const newBalance = currentBalance + changeAmount;
      
      // Check if user has sufficient balance for debit operations
      if (newBalance < 0) {
        throw new Error(`Insufficient balance. You have ₹${currentBalance} in E-wallet but trying to debit ₹${Math.abs(changeAmount)}`);
      }
      
      updateData.balance = newBalance.toString();
      // totalEarnings and totalWithdrawals remain unchanged
      
      console.log(`💰 Fund Request: Balance ${changeAmount >= 0 ? 'increased' : 'decreased'} by ₹${Math.abs(changeAmount)}`);
    }
    
    // Scenario 2: Withdrawal Management - Only affects totalEarnings and totalWithdrawals
    else if (type === 'withdrawal') {
      const withdrawalAmount = Math.abs(changeAmount);
      
      // Check if user has sufficient earnings to withdraw
      if (withdrawalAmount > currentEarnings) {
        throw new Error(`Insufficient earnings. You have ₹${currentEarnings} in earnings but trying to withdraw ₹${withdrawalAmount}`);
      }
      
      const newEarnings = currentEarnings - withdrawalAmount; // Deduct from income
      const newWithdrawals = currentWithdrawals + withdrawalAmount; // Add to withdrawals
      
      updateData.totalEarnings = newEarnings.toString();
      updateData.totalWithdrawals = newWithdrawals.toString();
      // balance remains unchanged
      
      console.log(`💸 Withdrawal: Earnings decreased by ₹${withdrawalAmount}, Withdrawals increased by ₹${withdrawalAmount}`);
    }
    
    // Scenario 3: MLM Income (sponsor_income, sales_bonus, etc.) - Only affects totalEarnings (Income)
    else if (type === 'sponsor_income' || type === 'sales_bonus' || type === 'sales_incentive' || 
             type === 'consistency_bonus' || type === 'franchise_income' || type === 'car_fund' || 
             type === 'travel_fund' || type === 'leadership_fund' || type === 'house_fund' || 
             type === 'millionaire_club' || type === 'royalty_income') {
      const newEarnings = currentEarnings + Math.max(0, changeAmount); // Only positive amounts add to earnings
      
      updateData.totalEarnings = newEarnings.toString();
      // balance and totalWithdrawals remain unchanged
      
      console.log(`💵 MLM Income (${type}): Earnings increased by ₹${Math.max(0, changeAmount)}`);
    }
    
    // Scenario 4: Product Purchase - Only affects balance (E-wallet)
    else if (type === 'purchaseProduct') {
      const newBalance = currentBalance - changeAmount; // Deduct positive amount from balance
      
      // Check if user has sufficient balance for purchase
      if (newBalance < 0) {
        throw new Error(`Insufficient balance. You have ₹${currentBalance} in E-wallet but trying to purchase for ₹${changeAmount}`);
      }
      
      updateData.balance = newBalance.toString();
      // totalEarnings and totalWithdrawals remain unchanged
      
      console.log(`🛒 Product Purchase: Balance decreased by ₹${changeAmount}`);
    }
    
    // Default case: Admin operations (admin_credit, admin_debit) - Only affects balance (E-wallet)
    else {
      const newBalance = currentBalance + changeAmount;
      updateData.balance = newBalance.toString();
      // totalEarnings and totalWithdrawals remain unchanged
      
      console.log(`⚙️ Admin Operation (${type}): Balance ${changeAmount >= 0 ? 'increased' : 'decreased'} by ₹${Math.abs(changeAmount)}`);
    }

      // Update wallet balance (direct operation)
      const updateResult = await db.update(walletBalances)
        .set(updateData)
        .where(eq(walletBalances.userId, userId));

      // Verify update was successful
      if (!updateResult || updateResult.rowCount === 0) {
        throw new Error('Failed to update wallet balance: no rows affected');
      }

      // Determine transaction type based on amount sign for fundRequest
      const isCredit = parseFloat(amount) >= 0;
      const dbType = type === 'fundRequest' ? (isCredit ? 'admin_credit' : 'admin_debit') :
                     type === 'purchaseProduct' ? 'purchase' : 
                     type as any;

      // Create transaction record (direct operation)
      const [transaction] = await db.insert(transactions).values({
        userId,
        type: dbType,
        amount,
        description,
        balanceBefore: currentBalance.toString(),
        balanceAfter: updateData.balance || currentBalance.toString(),
      }).returning();

      // Verify transaction record was created
      if (!transaction) {
        throw new Error('Failed to create transaction record');
      }

      console.log(`✅ Wallet operation completed successfully: ${type} for user ${userId}`);
      return transaction;

    } catch (error: any) {
      // Comprehensive error handling and logging
      console.error(`❌ Wallet operation failed: ${type} for user ${userId}`, {
        error: error.message,
        userId,
        amount,
        type,
        description
      });

      // Re-throw with enhanced error message
      if (error.message.includes('Invalid wallet data')) {
        throw new Error(`Wallet data corruption detected for user ${userId}. Please contact support.`);
      } else if (error.message.includes('Invalid wallet state')) {
        throw new Error(`Invalid wallet state for user ${userId}. Please contact support.`);
      } else if (error.message.includes('Failed to update')) {
        throw new Error(`Database update failed for user ${userId}. Please try again.`);
      } else if (error.message.includes('Failed to create transaction')) {
        throw new Error(`Transaction record creation failed for user ${userId}. Please try again.`);
      } else {
        throw new Error(`Wallet operation failed: ${error.message}`);
      }
    }
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    // Normalize UUID to Display ID for consistency
    const normalizedUserId = await this.normalizeToDisplayId(userId);
    return await db.select().from(transactions)
      .where(eq(transactions.userId, normalizedUserId))
      .orderBy(desc(transactions.createdAt));
  }

  // ===== WITHDRAWAL OPERATIONS =====
  async createWithdrawalRequest(userId: string, data: CreateWithdrawal): Promise<WithdrawalRequest> {
    const wallet = await this.getWalletBalance(userId);
    if (!wallet || parseFloat(wallet.balance || '0') < parseFloat(data.amount)) {
      throw new Error('Insufficient balance');
    }

    const withdrawalData: any = {
      userId,
      amount: data.amount,
      withdrawalType: data.withdrawalType,
    };

    if (data.withdrawalType === 'bank') {
      withdrawalData.bankDetails = data.bankDetails;
    } else if (data.withdrawalType === 'usdt') {
      withdrawalData.usdtWalletAddress = data.usdtWalletAddress;
      withdrawalData.networkType = data.networkType;
    }

    const [withdrawal] = await db.insert(withdrawalRequests).values(withdrawalData).returning();
    return withdrawal;
  }

  async createUserWithdrawalRequest(data: { userId: string; withdrawalType: 'INR' | 'USD'; amount: string; remarks: string }): Promise<WithdrawalRequest> {
    console.log('=== CREATING USER WITHDRAWAL REQUEST ===');
    console.log('Data received:', data);

    // Find user by display ID (VV0007)
    const user = await db.select().from(users).where(eq(users.userId, data.userId)).limit(1);
    if (!user.length) {
      throw new Error(`User not found with ID: ${data.userId}`);
    }

    const userData = user[0];
    console.log('Found user:', userData.email, userData.firstName, userData.lastName);
    console.log('User internal ID:', userData.id);
    console.log('User display ID:', userData.userId);

    // Check if user has approved KYC
    if (userData.kycStatus !== 'approved') {
      throw new Error(`User KYC is not approved. Current status: ${userData.kycStatus}. User must have approved KYC to create withdrawal requests.`);
    }
    console.log('User KYC status:', userData.kycStatus);

    // Check if user has sufficient balance
    console.log('Looking up wallet for display user ID:', userData.userId);
    
    const wallet = await this.getWalletBalance(userData.userId || '');
    console.log('Wallet lookup result:', wallet);
    
    if (!wallet) {
      throw new Error(`User does not have a wallet. Please create a wallet balance record first.`);
    }
    console.log('Found wallet:', wallet);
    
    const currentBalance = parseFloat(wallet.balance || '0');
    const requestedAmount = parseFloat(data.amount);
    
    if (currentBalance < requestedAmount) {
      throw new Error(`Insufficient balance. User has ${currentBalance} but requested ${requestedAmount}`);
    }
    console.log('User wallet balance:', currentBalance, 'Requested amount:', requestedAmount);

    // Prepare withdrawal data
    const withdrawalData: any = {
      userId: userData.userId, // Use the display user ID (VV0002)
      amount: data.amount,
      withdrawalType: data.withdrawalType, // Store 'INR' or 'USD' directly
      status: 'pending',
      adminNotes: data.remarks,
      processedBy: null, // Will be set when admin processes the request
      processedAt: null, // Will be set when admin processes the request
      transactionId: null, // Will be set when admin processes the request
    };

    // Handle bank details for INR withdrawals
    if (data.withdrawalType === 'INR') {
      // Fetch bank details from users table
      const bankDetails = {
        bankAccountNumber: userData.bankAccountNumber || '',
        bankIFSC: userData.bankIFSC || '',
        bankName: userData.bankName || '',
        bankAccountHolderName: userData.bankAccountHolderName || ''
      };

      // Validate that all required bank details are present
      if (!bankDetails.bankAccountNumber || !bankDetails.bankIFSC || 
          !bankDetails.bankName || !bankDetails.bankAccountHolderName) {
        throw new Error('User does not have complete bank details. Please ensure the user has filled all bank information.');
      }

      withdrawalData.bankDetails = bankDetails;
      console.log('Bank details set for INR withdrawal:', bankDetails);
    } else if (data.withdrawalType === 'USD') {
      // For USD withdrawals, we'll leave space for future logic
      if (userData.cryptoWalletAddress) {
        withdrawalData.usdtWalletAddress = userData.cryptoWalletAddress;
        withdrawalData.networkType = 'TRC20'; // Default network
        console.log('USD withdrawal - using crypto wallet:', userData.cryptoWalletAddress);
      } else {
        throw new Error('User does not have a crypto wallet address configured for USD withdrawals.');
      }
    }

    // Create the withdrawal request
    const [withdrawal] = await db.insert(withdrawalRequests).values(withdrawalData).returning();
    
    console.log('User withdrawal request created successfully:', withdrawal.id);
    return withdrawal;
  }

  async createAdminWithdrawalRequest(data: { userId: string; withdrawalType: 'INR' | 'USD'; amount: string; remarks: string }): Promise<WithdrawalRequest> {
    console.log('=== CREATING ADMIN WITHDRAWAL REQUEST ===');
    console.log('Data received:', data);

    // Find user by userId (display ID like VV0001)
    const user = await db.select().from(users).where(eq(users.userId, data.userId)).limit(1);
    if (!user.length) {
      throw new Error(`User not found with ID: ${data.userId}`);
    }

    const userData = user[0];
    console.log('Found user:', userData.email, userData.firstName, userData.lastName);
    console.log('User internal ID:', userData.id);
    console.log('User display ID:', userData.userId);

    // Check if user has approved KYC
    if (userData.kycStatus !== 'approved') {
      throw new Error(`User KYC is not approved. Current status: ${userData.kycStatus}. User must have approved KYC to create withdrawal requests.`);
    }
    console.log('User KYC status:', userData.kycStatus);

    // Check if user has sufficient balance
    // Note: getWalletBalance expects display user_id (VV0002), not internal UUID
    console.log('Looking up wallet for display user ID:', userData.userId);
    
    // Debug: Let's check what's actually in the wallet_balances table
    const allWallets = await db.select().from(walletBalances);
    console.log('All wallets in database:', allWallets);
    
    const wallet = await this.getWalletBalance(userData.userId || '');
    console.log('Wallet lookup result:', wallet);
    console.log('Wallet is undefined?', wallet === undefined);
    console.log('Wallet is null?', wallet === null);
    
    if (!wallet) {
      throw new Error(`User does not have a wallet. Please create a wallet balance record first.`);
    }
    console.log('Found wallet:', wallet);
    
    const currentBalance = parseFloat(wallet.balance || '0');
    const requestedAmount = parseFloat(data.amount);
    
    if (currentBalance < requestedAmount) {
      throw new Error(`Insufficient balance. User has ${currentBalance} but requested ${requestedAmount}`);
    }
    console.log('User wallet balance:', currentBalance, 'Requested amount:', requestedAmount);

    // Prepare withdrawal data
    const withdrawalData: any = {
      userId: data.userId, // Use the display user ID from form (VV0002), not from database lookup
      amount: data.amount,
      withdrawalType: data.withdrawalType, // Store 'INR' or 'USD' directly, not 'bank' or 'usdt'
      status: 'pending',
      adminNotes: data.remarks,
      processedBy: null, // Will be set when admin processes the request
      processedAt: null, // Will be set when admin processes the request
      transactionId: null, // Will be set when admin processes the request
      // createdAt and updatedAt are handled automatically by schema defaultNow()
      // id is handled automatically by schema gen_random_uuid()
    };

    // Handle bank details for INR withdrawals
    if (data.withdrawalType === 'INR') {
      // Fetch bank details from users table
      const bankDetails = {
        bankAccountNumber: userData.bankAccountNumber || '',
        bankIFSC: userData.bankIFSC || '',
        bankName: userData.bankName || '',
        bankAccountHolderName: userData.bankAccountHolderName || ''
      };

      // Validate that all required bank details are present
      if (!bankDetails.bankAccountNumber || !bankDetails.bankIFSC || 
          !bankDetails.bankName || !bankDetails.bankAccountHolderName) {
        throw new Error('User does not have complete bank details. Please ensure the user has filled all bank information.');
      }

      withdrawalData.bankDetails = bankDetails;
      console.log('Bank details set for INR withdrawal:', bankDetails);
    } else if (data.withdrawalType === 'USD') {
      // For USD withdrawals, we'll leave space for future logic
      // For now, we can use crypto wallet address if available
      if (userData.cryptoWalletAddress) {
        withdrawalData.usdtWalletAddress = userData.cryptoWalletAddress;
        withdrawalData.networkType = 'TRC20'; // Default network
        console.log('USD withdrawal - using crypto wallet:', userData.cryptoWalletAddress);
      } else {
        throw new Error('User does not have a crypto wallet address configured for USD withdrawals.');
      }
    }

    // Create the withdrawal request
    const [withdrawal] = await db.insert(withdrawalRequests).values(withdrawalData).returning();
    
    console.log('Withdrawal request created successfully:', withdrawal.id);
    return withdrawal;
  }

  async getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, userId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getAllWithdrawals(): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests)
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getPendingWithdrawalsWithUserDetails(): Promise<any[]> {
    try {
      console.log('Fetching pending withdrawals with user details...');
      
      // Get pending withdrawal requests with user details
      const result = await db
        .select({
          // Withdrawal request fields
          withdrawalId: withdrawalRequests.id,
          withdrawalUserId: withdrawalRequests.userId,
          withdrawalType: withdrawalRequests.withdrawalType,
          amount: withdrawalRequests.amount,
          status: withdrawalRequests.status,
          bankDetails: withdrawalRequests.bankDetails,
          usdtWalletAddress: withdrawalRequests.usdtWalletAddress,
          networkType: withdrawalRequests.networkType,
          adminNotes: withdrawalRequests.adminNotes,
          createdAt: withdrawalRequests.createdAt,
          updatedAt: withdrawalRequests.updatedAt,
          // User details
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
          userMobile: users.mobile,
          userDisplayId: users.userId
        })
        .from(withdrawalRequests)
        .innerJoin(users, eq(withdrawalRequests.userId, users.userId))
        .where(eq(withdrawalRequests.status, 'pending'))
        .orderBy(desc(withdrawalRequests.createdAt));

      console.log(`Found ${result.length} pending withdrawal requests`);

      // Transform the data to match the expected format
      const transformedData = result.map(row => {
        // Mask bank account number (show only last 4 digits)
        let maskedAccountNumber = '';
        if (row.bankDetails && typeof row.bankDetails === 'object') {
          const bankDetails = row.bankDetails as any;
          if (bankDetails.bankAccountNumber) {
            const accountNumber = bankDetails.bankAccountNumber.toString();
            maskedAccountNumber = '****' + accountNumber.slice(-4);
          }
        }

        return {
          id: row.withdrawalId,
          userId: row.withdrawalUserId,
          userName: `${row.userFirstName} ${row.userLastName}`.trim(),
          userEmail: row.userEmail,
          userMobile: row.userMobile,
          userDisplayId: row.userDisplayId,
          type: row.withdrawalType === 'INR' ? 'Bank Transfer' : 'USDT',
          amount: parseFloat(row.amount || '0'),
          details: row.withdrawalType === 'INR' ? 
            `Account: ${maskedAccountNumber}` : 
            `Wallet: ${row.usdtWalletAddress || 'N/A'}`,
          date: row.createdAt,
          status: row.status,
          adminNotes: row.adminNotes,
          bankDetails: row.bankDetails,
          usdtWalletAddress: row.usdtWalletAddress,
          networkType: row.networkType
        };
      });

      console.log('Transformed data:', transformedData);
      return transformedData;

    } catch (error) {
      console.error('Error fetching pending withdrawals with user details:', error);
      return [];
    }
  }

  async getApprovedWithdrawalsWithUserDetails(): Promise<any[]> {
    try {
      console.log('Fetching approved withdrawals with user details...');
      
      // Get approved withdrawal requests with user details
      const result = await db
        .select({
          // Withdrawal request fields
          withdrawalId: withdrawalRequests.id,
          withdrawalUserId: withdrawalRequests.userId,
          withdrawalType: withdrawalRequests.withdrawalType,
          amount: withdrawalRequests.amount,
          status: withdrawalRequests.status,
          bankDetails: withdrawalRequests.bankDetails,
          usdtWalletAddress: withdrawalRequests.usdtWalletAddress,
          networkType: withdrawalRequests.networkType,
          adminNotes: withdrawalRequests.adminNotes,
          processedBy: withdrawalRequests.processedBy,
          processedAt: withdrawalRequests.processedAt,
          transactionId: withdrawalRequests.transactionId,
          createdAt: withdrawalRequests.createdAt,
          updatedAt: withdrawalRequests.updatedAt,
          // User details
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
          userMobile: users.mobile,
          userDisplayId: users.userId
        })
        .from(withdrawalRequests)
        .innerJoin(users, eq(withdrawalRequests.userId, users.userId))
        .where(eq(withdrawalRequests.status, 'approved'))
        .orderBy(desc(withdrawalRequests.updatedAt)); // Order by approval date (updatedAt when status changed to approved)

      console.log(`Found ${result.length} approved withdrawal requests`);

      // Transform the data to match the expected format
      const transformedData = result.map(row => {
        // Mask bank account number (show only last 4 digits)
        let maskedAccountNumber = '';
        if (row.bankDetails && typeof row.bankDetails === 'object') {
          const bankDetails = row.bankDetails as any;
          if (bankDetails.bankAccountNumber) {
            const accountNumber = bankDetails.bankAccountNumber.toString();
            maskedAccountNumber = '****' + accountNumber.slice(-4);
          }
        }

        return {
          id: row.withdrawalId,
          userId: row.withdrawalUserId,
          userName: `${row.userFirstName} ${row.userLastName}`.trim(),
          userEmail: row.userEmail,
          userMobile: row.userMobile,
          userDisplayId: row.userDisplayId,
          type: row.withdrawalType === 'INR' ? 'Bank Transfer' : 'USDT',
          amount: parseFloat(row.amount || '0'),
          details: row.withdrawalType === 'INR' ? 
            `Account: ${maskedAccountNumber}` : 
            `Wallet: ${row.usdtWalletAddress || 'N/A'}`,
          date: row.updatedAt, // Use updatedAt as the approval date
          status: row.status,
          adminNotes: row.adminNotes,
          processedBy: row.processedBy,
          processedAt: row.processedAt,
          transactionId: row.transactionId,
          bankDetails: row.bankDetails,
          usdtWalletAddress: row.usdtWalletAddress,
          networkType: row.networkType
        };
      });

      console.log('Transformed approved withdrawals data:', transformedData);
      return transformedData;

    } catch (error) {
      console.error('Error fetching approved withdrawals with user details:', error);
      return [];
    }
  }

  async getRejectedWithdrawalsWithUserDetails(): Promise<any[]> {
    try {
      console.log('Fetching rejected withdrawals with user details...');
      
      // Get rejected withdrawal requests with user details
      const result = await db
        .select({
          // Withdrawal request fields
          withdrawalId: withdrawalRequests.id,
          withdrawalUserId: withdrawalRequests.userId,
          withdrawalType: withdrawalRequests.withdrawalType,
          amount: withdrawalRequests.amount,
          status: withdrawalRequests.status,
          bankDetails: withdrawalRequests.bankDetails,
          usdtWalletAddress: withdrawalRequests.usdtWalletAddress,
          networkType: withdrawalRequests.networkType,
          adminNotes: withdrawalRequests.adminNotes,
          processedBy: withdrawalRequests.processedBy,
          processedAt: withdrawalRequests.processedAt,
          transactionId: withdrawalRequests.transactionId,
          createdAt: withdrawalRequests.createdAt,
          updatedAt: withdrawalRequests.updatedAt,
          // User details
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
          userMobile: users.mobile,
          userDisplayId: users.userId
        })
        .from(withdrawalRequests)
        .innerJoin(users, eq(withdrawalRequests.userId, users.userId))
        .where(eq(withdrawalRequests.status, 'rejected'))
        .orderBy(desc(withdrawalRequests.updatedAt)); // Order by rejection date (updatedAt when status changed to rejected)

      console.log(`Found ${result.length} rejected withdrawal requests`);

      // Transform the data to match the expected format
      const transformedData = result.map(row => {
        // Mask bank account number (show only last 4 digits)
        let maskedAccountNumber = '';
        if (row.bankDetails && typeof row.bankDetails === 'object') {
          const bankDetails = row.bankDetails as any;
          if (bankDetails.bankAccountNumber) {
            const accountNumber = bankDetails.bankAccountNumber.toString();
            maskedAccountNumber = '****' + accountNumber.slice(-4);
          }
        }

        return {
          id: row.withdrawalId,
          userId: row.withdrawalUserId,
          userName: `${row.userFirstName} ${row.userLastName}`.trim(),
          userEmail: row.userEmail,
          userMobile: row.userMobile,
          userDisplayId: row.userDisplayId,
          type: row.withdrawalType === 'INR' ? 'Bank Transfer' : 'USDT',
          amount: parseFloat(row.amount || '0'),
          details: row.withdrawalType === 'INR' ? 
            `Account: ${maskedAccountNumber}` : 
            `Wallet: ${row.usdtWalletAddress || 'N/A'}`,
          date: row.updatedAt, // Use updatedAt as the rejection date
          status: row.status,
          reason: row.adminNotes, // Show admin notes as rejection reason
          processedBy: row.processedBy,
          processedAt: row.processedAt,
          transactionId: row.transactionId,
          bankDetails: row.bankDetails,
          usdtWalletAddress: row.usdtWalletAddress,
          networkType: row.networkType
        };
      });

      console.log('Transformed rejected withdrawals data:', transformedData);
      return transformedData;

    } catch (error) {
      console.error('Error fetching rejected withdrawals with user details:', error);
      return [];
    }
  }

  async updateWithdrawalStatus(id: string, status: string, adminNotes?: string): Promise<boolean> {
    try {
      console.log(`=== UPDATING WITHDRAWAL STATUS ===`);
      console.log(`Withdrawal ID: ${id}`);
      console.log(`New Status: ${status}`);
      console.log(`Admin Notes: ${adminNotes}`);

      // First, get the withdrawal request details
      const [withdrawalRequest] = await db
        .select()
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.id, id));

      if (!withdrawalRequest) {
        console.log('Withdrawal request not found');
        return false;
      }

      console.log('Found withdrawal request:', {
        id: withdrawalRequest.id,
        userId: withdrawalRequest.userId,
        amount: withdrawalRequest.amount,
        currentStatus: withdrawalRequest.status
      });

      // Prevent processing already processed withdrawals
      if (withdrawalRequest.status === 'processed') {
        console.log('Withdrawal already processed, skipping wallet operations');
        return false;
      }

      // If status is being changed to 'approved' or 'processed', deduct from wallet
      // Only deduct if the current status is 'pending' (to avoid double deduction)
      if ((status === 'approved' || status === 'processed') && 
          withdrawalRequest.status === 'pending') {
        
        console.log('Processing wallet deduction for withdrawal approval...');
        
        // Get current wallet balance
        const wallet = await this.getWalletBalance(withdrawalRequest.userId);
        if (!wallet) {
          console.log('Wallet not found for user:', withdrawalRequest.userId);
          return false;
        }

        const currentEarnings = parseFloat(wallet.totalEarnings || '0');
        const withdrawalAmount = parseFloat(withdrawalRequest.amount);

        console.log('Wallet details:', {
          currentEarnings,
          withdrawalAmount
        });

        // Check if user has sufficient earnings (not balance)
        if (currentEarnings < withdrawalAmount) {
          console.log('Insufficient earnings for withdrawal');
          throw new Error(`Insufficient earnings. User has ₹${currentEarnings} in earnings but withdrawal is for ₹${withdrawalAmount}`);
        }

        console.log('Processing withdrawal using updateWalletBalance function...');

        // Use our secure updateWalletBalance function for withdrawal
        // Pass negative amount to record as deduction in transaction
        await this.updateWalletBalance(
          withdrawalRequest.userId,
          (-withdrawalAmount).toString(), // Negative amount for transaction record
          `Withdrawal approved - ${withdrawalRequest.withdrawalType}`,
          'withdrawal'
        );

        console.log('Withdrawal processed successfully using updateWalletBalance');
      }

      // Update withdrawal request status
      const updateData: any = { 
        status, 
        updatedAt: new Date() 
      };
      if (adminNotes) updateData.adminNotes = adminNotes;
      if (status === 'processed') updateData.processedAt = new Date();

      const result = await db
        .update(withdrawalRequests)
        .set(updateData)
        .where(eq(withdrawalRequests.id, id));

      console.log('Withdrawal request status updated successfully');
      return (result.rowCount ?? 0) > 0;

    } catch (error) {
      console.error('Error updating withdrawal status:', error);
      throw error;
    }
  }

  // ===== KYC OPERATIONS =====
  async getUserKYCDocuments(userId: string): Promise<KYCDocument[]> {
    return await db.select().from(kycDocuments)
      .where(eq(kycDocuments.userId, userId))
      .orderBy(desc(kycDocuments.createdAt));
  }

  async createKYCDocument(userId: string, data: CreateKYC): Promise<KYCDocument> {
    const [kyc] = await db.insert(kycDocuments).values({
      userId,
      ...data,
    }).returning();
    
    // Update user KYC submission timestamp
    await db.update(users)
      .set({ kycSubmittedAt: new Date() })
      .where(eq(users.id, userId));
    
    return kyc;
  }

  async createKYCDocumentBinary(userId: string, data: {
    documentType: string;
    documentData: string;
    documentContentType: string;
    documentFilename: string;
    documentSize: number;
    documentNumber?: string;
  }): Promise<KYCDocument> {
    console.log('🗄️ Creating KYC document in database:');
    console.log('  - userId:', userId);
    console.log('  - documentType:', data.documentType);
    console.log('  - documentSize:', data.documentSize);
    console.log('  - documentNumber:', data.documentNumber);
    
    try {
      const [kyc] = await db.insert(kycDocuments).values({
        userId,
        documentType: data.documentType,
        documentData: data.documentData,
        documentContentType: data.documentContentType,
        documentFilename: data.documentFilename,
        documentSize: data.documentSize,
        documentNumber: data.documentNumber,
              // Set a placeholder URL since documentUrl is required by schema
      documentUrl: `data:${data.documentContentType};base64,placeholder`,
      }).returning();
      
      console.log('  ✅ KYC document created successfully with ID:', kyc.id);
      
      // Update user KYC submission timestamp
      await db.update(users)
        .set({ kycSubmittedAt: new Date() })
        .where(eq(users.id, userId));
      
      console.log('  ✅ User KYC submission timestamp updated');
      
      // CRITICAL FIX: If user was previously rejected, uploading a NEW document should move them to pending
      // Check user's current KYC status
      const [currentUser] = await db.select({ kycStatus: users.kycStatus })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (currentUser && currentUser.kycStatus === 'rejected') {
        // User was rejected - uploading a NEW document means they want to re-verify
        // Move them to pending status so admin can review the new document
        console.log(`🔄 User ${userId} was rejected - NEW document uploaded, moving to PENDING status`);
        
        // Update users.kyc_status to pending
        await db.update(users)
          .set({
            kycStatus: 'pending' as const,
            kycApprovedAt: null,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
        
        console.log(`  ✅ Updated users.kyc_status to 'pending' for user ${userId}`);
        
        // Also update kyc_profile document to match
        const kycProfileDocs = await db.select()
          .from(kycDocuments)
          .where(and(
            eq(kycDocuments.userId, userId),
            eq(kycDocuments.documentType, 'kyc_profile')
          ))
          .limit(1);
        
        if (kycProfileDocs.length > 0) {
          await db.update(kycDocuments)
            .set({
              status: 'pending' as const,
              rejectionReason: null,  // Clear rejection reason on new upload
              updatedAt: new Date()
            })
            .where(eq(kycDocuments.id, kycProfileDocs[0].id));
          
          console.log(`  ✅ Updated kyc_profile.status to 'pending' for user ${userId}`);
        } else {
          console.log(`  ⚠️ WARNING: kyc_profile document not found for user ${userId}`);
        }
        
        // Create notification for re-verification request
        const { notifications } = await import('@shared/schema');
        await db.insert(notifications).values({
          userId: userId,
          type: 'kyc_status_change',
          title: 'KYC Re-verification Request Submitted',
          message: 'Your new KYC document has been uploaded and submitted for re-verification. The request is now in pending status for admin review.',
          data: { 
            kycStatus: 'pending', 
            isReverification: true,
            previousStatus: 'rejected'
          }
        });
        console.log(`  📧 Created re-verification notification for user ${userId}`);
      }
      
      return kyc;
    } catch (error) {
      console.error('  ❌ Error creating KYC document:', error);
      throw error;
    }
  }

  async getKYCDocumentById(id: string): Promise<KYCDocument | null> {
    const [document] = await db.select().from(kycDocuments).where(eq(kycDocuments.id, id));
    return document || null;
  }

  async updateKYCDocument(id: string, data: any): Promise<KYCDocument> {
    // First, get the current document and user to check their status
    const [currentDoc] = await db.select()
      .from(kycDocuments)
      .where(eq(kycDocuments.id, id));

    if (!currentDoc) {
      throw new Error('KYC document not found');
    }

    // Get current user's KYC status to check if this is a re-verification request
    const [currentUser] = await db.select()
      .from(users)
      .where(eq(users.id, currentDoc.userId));

    const wasRejected = currentUser?.kycStatus === 'rejected';
    const isPending = currentUser?.kycStatus === 'pending';
    // Check if the document being re-uploaded was previously rejected or pending
    const docWasRejected = currentDoc.status === 'rejected';
    const docWasPending = currentDoc.status === 'pending';
    console.log(`🔄 Updating KYC document ${id} for user ${currentDoc.userId}. User was rejected: ${wasRejected}, User is pending: ${isPending}, Doc was rejected: ${docWasRejected}, Doc was pending: ${docWasPending}`);

    const updateData: any = {
      status: 'pending' as const, // Reset status to pending when updated
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      updatedAt: new Date(),
    };

    // Handle binary data update
    if (data.documentData) {
      updateData.documentData = data.documentData;
      updateData.documentContentType = data.documentContentType;
      updateData.documentFilename = data.documentFilename;
      updateData.documentSize = data.documentSize;
      // Keep placeholder URL when using binary data (required by DB constraint)
      updateData.documentUrl = `data:${data.documentContentType};base64,placeholder`;
    }

    // Handle URL data update (legacy)
    if (data.documentUrl) {
      updateData.documentUrl = data.documentUrl;
      // Clear binary fields when using URL
      updateData.documentData = null;
      updateData.documentContentType = null;
      updateData.documentFilename = null;
      updateData.documentSize = null;
    }

    if (data.documentType) {
      updateData.documentType = data.documentType;
    }

    if (data.documentNumber !== undefined) {
      updateData.documentNumber = data.documentNumber;
    }

    await db
      .update(kycDocuments)
      .set(updateData)
      .where(eq(kycDocuments.id, id));

    // Get the updated document to extract userId
    const [updatedDoc] = await db.select().from(kycDocuments).where(eq(kycDocuments.id, id));
    
    if (updatedDoc) {
      // Recalculate overall KYC status for the user
      // EXCLUDE kyc_profile from calculation as it's just a status tracker
      const allUserKYC = await db.select({ status: kycDocuments.status })
        .from(kycDocuments)
        .where(and(
          eq(kycDocuments.userId, updatedDoc.userId),
          ne(kycDocuments.documentType, 'kyc_profile')
        ));
      
      // Determine overall KYC status
      let overallKYCStatus = 'pending';
      
      // FIX: If user is re-uploading documents (was rejected OR currently pending),
      // OR if the document being re-uploaded was previously rejected or pending,
      // keep them in pending status to allow multiple document re-uploads
      // without reverting back to rejected status
      if (wasRejected || isPending || docWasRejected || docWasPending) {
        overallKYCStatus = 'pending';
        console.log(`🔄 Re-verification/update request detected for user ${updatedDoc.userId} - keeping status as pending (wasRejected: ${wasRejected}, isPending: ${isPending}, docWasRejected: ${docWasRejected}, docWasPending: ${docWasPending})`);
      } else {
        // Normal logic for new users or approved users re-uploading approved documents
        // (should be rare - usually means updating an approved document)
        if (allUserKYC.some(doc => doc.status === 'rejected')) {
          overallKYCStatus = 'rejected';
        } else if (allUserKYC.length > 0 && allUserKYC.every(doc => doc.status === 'approved')) {
          overallKYCStatus = 'approved';
        }
      }
      
      // Update user's overall KYC status
      await db.update(users)
        .set({
          kycStatus: overallKYCStatus as 'pending' | 'approved' | 'rejected',
          kycApprovedAt: overallKYCStatus === 'approved' ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(users.id, updatedDoc.userId));
      
      // FIX #3: Sync kyc_profile document to match overall status after re-upload
      const kycProfileDocs = await db.select()
        .from(kycDocuments)
        .where(and(
          eq(kycDocuments.userId, updatedDoc.userId),
          eq(kycDocuments.documentType, 'kyc_profile')
        ))
        .limit(1);

      if (kycProfileDocs.length > 0) {
        await db.update(kycDocuments)
          .set({
            status: overallKYCStatus as 'pending' | 'approved' | 'rejected',
            rejectionReason: null,  // Clear rejection reason on re-upload
            updatedAt: new Date()
          })
          .where(eq(kycDocuments.id, kycProfileDocs[0].id));
        
        console.log(`🔄 Updated kyc_profile to ${overallKYCStatus} after document re-upload`);
      }
      
      // Create notification for re-verification request
      if (overallKYCStatus === 'pending' && (wasRejected || isPending || docWasRejected || docWasPending)) {
        const { notifications } = await import('@shared/schema');
        await db.insert(notifications).values({
          userId: updatedDoc.userId,
          type: 'kyc_status_change',
          title: 'KYC Re-verification Request Submitted',
          message: 'Your KYC documents have been submitted for re-verification after rejection. The request is now back in pending status for admin review.',
          data: { 
            kycStatus: 'pending', 
            isReverification: true,
            previousStatus: 'rejected'
          }
        });
        console.log(`📧 Created re-verification notification for user ${updatedDoc.userId}`);
      } else if (overallKYCStatus === 'pending') {
        const { notifications } = await import('@shared/schema');
        await db.insert(notifications).values({
          userId: updatedDoc.userId,
          type: 'kyc_status_change',
          title: 'KYC Document Updated',
          message: 'Your KYC document has been updated and is pending admin review.',
          data: { kycStatus: 'pending' }
        });
      }
      
      console.log(`✅ Updated KYC document ${id} and recalculated overall status for user ${updatedDoc.userId}: ${overallKYCStatus}`);
    }
    
    return updatedDoc!;
  }

  // Fix existing KYC data where users have mixed document statuses
  async fixExistingKYCStatuses(): Promise<void> {
    console.log('🔧 Starting KYC status fix for existing data...');
    
    try {
      // Get all users with rejected KYC status
      const rejectedUsers = await db.select()
        .from(users)
        .where(eq(users.kycStatus, 'rejected'));
      
      console.log(`📊 Found ${rejectedUsers.length} users with rejected KYC status`);
      
      for (const user of rejectedUsers) {
        // Get all KYC documents for this user
        const userDocs = await db.select({ status: kycDocuments.status })
          .from(kycDocuments)
          .where(eq(kycDocuments.userId, user.id));
        
        // Check if user has any pending documents
        const hasPendingDocs = userDocs.some(doc => doc.status === 'pending');
        
        if (hasPendingDocs) {
          // If user has pending documents but overall status is rejected,
          // this means they have re-uploaded documents - fix their status
          await db.update(users)
            .set({
              kycStatus: 'pending' as const,
              kycApprovedAt: null,
              updatedAt: new Date()
            })
            .where(eq(users.id, user.id));
          
          console.log(`✅ Fixed KYC status for user ${user.id} (${user.email}) - changed from rejected to pending`);
          
          // Create notification for the fixed status
          const { notifications } = await import('@shared/schema');
          await db.insert(notifications).values({
            userId: user.id,
            type: 'kyc_status_change',
            title: 'KYC Status Updated',
            message: 'Your KYC status has been updated to pending due to re-uploaded documents. Your request is now back in the pending queue for admin review.',
            data: { 
              kycStatus: 'pending', 
              isReverification: true,
              previousStatus: 'rejected',
              wasAutoFixed: true
            }
          });
        }
      }
      
      console.log('✅ KYC status fix completed');
    } catch (error) {
      console.error('❌ Error fixing KYC statuses:', error);
      throw error;
    }
  }

  // Clean up duplicate KYC documents - keep only the most recent document of each type per user
  async cleanupDuplicateKYCDocuments(): Promise<void> {
    console.log('🧹 Starting KYC document cleanup...');
    
    try {
      // Get all KYC documents grouped by user and document type
      const allDocuments = await db.select()
        .from(kycDocuments)
        .orderBy(kycDocuments.userId, kycDocuments.documentType, desc(kycDocuments.createdAt));
      
      const documentsByUserAndType: { [key: string]: KYCDocument[] } = {};
      
      // Group documents by user and type
      allDocuments.forEach(doc => {
        const key = `${doc.userId}-${doc.documentType}`;
        if (!documentsByUserAndType[key]) {
          documentsByUserAndType[key] = [];
        }
        documentsByUserAndType[key].push(doc);
      });
      
      let totalDeleted = 0;
      
      // For each user-document type combination, keep only the most recent document
      for (const [key, docs] of Object.entries(documentsByUserAndType)) {
        if (docs.length > 1) {
          // Sort by creation date (most recent first)
          docs.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          
          // Keep the first (most recent) document, delete the rest
          const [keepDoc, ...deleteDocs] = docs;
          
          console.log(`🧹 Cleaning up ${deleteDocs.length} duplicate documents for user ${keepDoc.userId}, type ${keepDoc.documentType}`);
          
          for (const docToDelete of deleteDocs) {
            await db.delete(kycDocuments).where(eq(kycDocuments.id, docToDelete.id));
            totalDeleted++;
          }
        }
      }
      
      console.log(`✅ KYC document cleanup completed. Deleted ${totalDeleted} duplicate documents.`);
    } catch (error) {
      console.error('❌ Error cleaning up KYC documents:', error);
      throw error;
    }
  }

  // Consolidate mismatched document types to standard types
  async consolidateDocumentTypes(): Promise<void> {
    console.log('🔄 Starting document type consolidation...');
    
    try {
      // Get all documents with non-standard types
      const { or } = await import('drizzle-orm');
      const mismatchedDocs = await db.select()
        .from(kycDocuments)
        .where(
          or(
            eq(kycDocuments.documentType, 'aadhaar_front'),
            eq(kycDocuments.documentType, 'aadhaar_back'),
            eq(kycDocuments.documentType, 'bank_details'),
            eq(kycDocuments.documentType, 'kyc_profile')
          )
        );
      
      console.log(`📊 Found ${mismatchedDocs.length} documents with mismatched types`);
      
      for (const doc of mismatchedDocs) {
        let newType = doc.documentType;
        
        // Map to standard types
        if (doc.documentType === 'aadhaar_front') {
          newType = 'aadhaar_front';
        } else if (doc.documentType === 'aadhaar_back') {
          newType = 'aadhaar_back';
        } else if (doc.documentType === 'bank_details') {
          newType = 'bank_details';
        } else if (doc.documentType === 'kyc_profile') {
          newType = 'photo';
        }
        
        // Update the document type
        await db.update(kycDocuments)
          .set({ documentType: newType })
          .where(eq(kycDocuments.id, doc.id));
        
        console.log(`✅ Updated document ${doc.id} from ${doc.documentType} to ${newType}`);
      }
      
      console.log('✅ Document type consolidation completed');
    } catch (error) {
      console.error('❌ Error consolidating document types:', error);
      throw error;
    }
  }

  async getAllPendingKYC(): Promise<any[]> {
    try {
      console.log('🔍 getAllPendingKYC called');
      const { kycDocuments, users } = await import('@shared/schema');
      const { desc, eq, and, isNotNull, inArray } = await import('drizzle-orm');
      console.log('📚 Schema imported successfully');
      
      // Get ALL KYC documents with user information (restore original working logic)
      const result = await db
        .select({
          kycId: kycDocuments.id,
          userId: kycDocuments.userId,
          documentType: kycDocuments.documentType,
          documentUrl: kycDocuments.documentUrl,
          documentNumber: kycDocuments.documentNumber,
          status: kycDocuments.status,
          rejectionReason: kycDocuments.rejectionReason,
          reviewedBy: kycDocuments.reviewedBy,
          reviewedAt: kycDocuments.reviewedAt,
          createdAt: kycDocuments.createdAt,
          updatedAt: kycDocuments.updatedAt,
          // User details
          userUserId: users.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          userStatus: users.status,
          userKycStatus: users.kycStatus, // Add user's overall KYC status
          // User document URLs for display (from users table)
          profileImageUrl: users.profileImageUrl,
          panNumber: users.panNumber,
          aadhaarNumber: users.aadhaarNumber
        })
        .from(kycDocuments)
        .innerJoin(users, eq(kycDocuments.userId, users.id))
        .where(and(
          isNotNull(users.id), // Ensure user exists
          inArray(users.status, ['active', 'pending']) // Include both active and pending users
        ))
        .orderBy(desc(kycDocuments.createdAt));
      
      console.log('📊 Database query result:', result.length, 'KYC documents found');
      console.log('🔍 Raw query result:', result);
      
      // Group documents by user to create one row per user
      const userKYCData: { [key: string]: any } = {};
      
      result.forEach((doc) => {
        const userId = doc.userId;
        
        if (!userKYCData[userId]) {
          // Initialize user data
          userKYCData[userId] = {
            kycId: doc.kycId,
            userId: doc.userId,
            userUserId: doc.userUserId,
            firstName: doc.firstName,
            lastName: doc.lastName,
            email: doc.email,
            userStatus: doc.userStatus,
            kycStatus: doc.userKycStatus, // Use user's overall KYC status, not individual document status
            rejectionReason: doc.rejectionReason,
            reviewedBy: doc.reviewedBy,
            reviewedAt: doc.reviewedAt,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            documents: {
              panCard: { url: doc.documentType === 'pan_card' ? doc.documentUrl : '', number: doc.panNumber || '', status: doc.documentType === 'pan_card' ? doc.status : 'pending' },
              aadhaarFront: { url: doc.documentType === 'aadhaar_front' ? doc.documentUrl : '', number: doc.aadhaarNumber || '', status: doc.documentType === 'aadhaar_front' ? doc.status : 'pending' },
              aadhaarBack: { url: doc.documentType === 'aadhaar_back' ? doc.documentUrl : '', number: doc.aadhaarNumber || '', status: doc.documentType === 'aadhaar_back' ? doc.status : 'pending' },
              bankStatement: { url: doc.documentType === 'bank_details' ? doc.documentUrl : '', status: doc.documentType === 'bank_details' ? doc.status : 'pending' },
              photo: { url: doc.documentType === 'photo' ? doc.documentUrl : (doc.profileImageUrl || ''), status: doc.documentType === 'photo' ? doc.status : 'pending' }
            }
          };
        } else {
          // Update documents with the latest status for each document type
          if (doc.documentType === 'pan_card') {
            userKYCData[userId].documents.panCard = { 
              url: doc.documentUrl, 
              number: doc.documentNumber || doc.panNumber || '', 
              status: doc.status 
            };
          } else if (doc.documentType === 'aadhaar_front') {
            userKYCData[userId].documents.aadhaarFront = { 
              url: doc.documentUrl, 
              number: doc.documentNumber || doc.aadhaarNumber || '', 
              status: doc.status 
            };
          } else if (doc.documentType === 'aadhaar_back') {
            userKYCData[userId].documents.aadhaarBack = { 
              url: doc.documentUrl, 
              number: doc.documentNumber || doc.aadhaarNumber || '', 
              status: doc.status 
            };
          } else if (doc.documentType === 'bank_details') {
            userKYCData[userId].documents.bankStatement = { 
              url: doc.documentUrl, 
              status: doc.status 
            };
          } else if (doc.documentType === 'photo') {
            userKYCData[userId].documents.photo = { 
              url: doc.documentUrl, 
              status: doc.status 
            };
          }
          
          // Don't override the user's overall KYC status - it should come from the users table
          // The individual document statuses are already captured in the documents object above
        }
      });
      
      const finalResult = Object.values(userKYCData);
      console.log('👥 Final result:', finalResult.length, 'users with KYC data');
      console.log('🔍 Final result details:', finalResult);
      return finalResult;
      
    } catch (error) {
      console.error('❌ Error fetching pending KYC:', error);
      return [];
    }
  }

  // ===== KYC OPERATIONS =====
  // Update KYC status for a user's profile
  async updateKYCStatus(kycId: string, status: 'pending' | 'approved' | 'rejected', reason?: string): Promise<boolean> {
    try {
      const { kycDocuments, users } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      // First, get the user ID and document type from the KYC record
      const kycRecord = await db.select({ 
        userId: kycDocuments.userId,
        documentType: kycDocuments.documentType 
      })
        .from(kycDocuments)
        .where(eq(kycDocuments.id, kycId))
        .limit(1);
      
      if (kycRecord.length === 0) {
        console.error('KYC record not found:', kycId);
        return false;
      }
      
      const userId = kycRecord[0].userId;
      const documentType = kycRecord[0].documentType;
      
      // Update the specific KYC document
      const result = await db.update(kycDocuments)
        .set({
          status: status,
          rejectionReason: status === 'rejected' ? reason : null,
          reviewedBy: 'admin',
          reviewedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(kycDocuments.id, kycId));
      
      const success = (result.rowCount ?? 0) > 0;
      
      if (success) {
        // Check if all KYC documents for this user are now approved
        // EXCLUDE kyc_profile from calculation as it's just a status tracker
        const allUserKYC = await db.select({ status: kycDocuments.status })
          .from(kycDocuments)
          .where(and(
            eq(kycDocuments.userId, userId),
            ne(kycDocuments.documentType, 'kyc_profile')
          ));
        
        // Determine overall KYC status
        let overallKYCStatus = 'pending';
        if (allUserKYC.some(doc => doc.status === 'rejected')) {
          overallKYCStatus = 'rejected';
        } else if (allUserKYC.length > 0 && allUserKYC.every(doc => doc.status === 'approved')) {
          overallKYCStatus = 'approved';
        }
        
        // Get the current overall KYC status before updating
        const currentUser = await db.select({ kycStatus: users.kycStatus })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        const currentOverallStatus = currentUser[0]?.kycStatus || 'pending';
        
        // Update user's overall KYC status
        await db.update(users)
          .set({
            kycStatus: overallKYCStatus as 'pending' | 'approved' | 'rejected',
            kycApprovedAt: overallKYCStatus === 'approved' ? new Date() : null,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
        
        // FIX #1: Sync kyc_profile document to match overall status
        const kycProfileDocs = await db.select()
          .from(kycDocuments)
          .where(and(
            eq(kycDocuments.userId, userId),
            eq(kycDocuments.documentType, 'kyc_profile')
          ))
          .limit(1);

        if (kycProfileDocs.length > 0) {
          await db.update(kycDocuments)
            .set({
              status: overallKYCStatus as 'pending' | 'approved' | 'rejected',
              rejectionReason: overallKYCStatus === 'rejected' ? reason : null,
              reviewedBy: 'admin',
              reviewedAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(kycDocuments.id, kycProfileDocs[0].id));
          
          console.log(`✅ Synced kyc_profile document to ${overallKYCStatus}`);
        }
        
        // Only create notification if the overall KYC status actually changed
        if (currentOverallStatus !== overallKYCStatus) {
          console.log(`📢 KYC status changed from ${currentOverallStatus} to ${overallKYCStatus} - sending notification`);
          await this.createKYCStatusNotification(userId, overallKYCStatus as 'pending' | 'approved' | 'rejected', reason);
        } else {
          console.log(`📝 KYC status unchanged (${overallKYCStatus}) - no notification sent`);
        }
        
        console.log(`✅ Updated KYC status for user ${userId}: ${status} (overall: ${overallKYCStatus})`);
      }
      
      return success;
    } catch (error) {
      console.error('Error updating KYC status:', error);
      return false;
    }
  }

  // Create KYC records for existing users who don't have individual document records
  async createKYCRecordsForExistingUser(userId: string, userData: any): Promise<void> {
    try {
      const { kycDocuments } = await import('@shared/schema');
      
      // Check if user already has KYC records
      const existingRecords = await db.select().from(kycDocuments)
        .where(eq(kycDocuments.userId, userId));
      
      if (existingRecords.length > 0) {
        console.log(`User ${userId} already has ${existingRecords.length} KYC records`);
        return;
      }
      
      // Create individual KYC document records from user data
      const kycRecords = [];
      
      // PAN Card
      if (userData.panCardUrl) {
        kycRecords.push({
          userId: userId,
          documentType: 'pan_card',
          documentUrl: userData.panCardUrl,
          documentNumber: userData.panNumber || '',
          status: 'pending' as const,
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Aadhaar Card
      if (userData.aadhaarFrontUrl) {
        kycRecords.push({
          userId: userId,
          documentType: 'aadhaar_front',
          documentUrl: userData.aadhaarFrontUrl,
          documentNumber: userData.aadhaarNumber || '',
          status: 'pending' as const,
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      if (userData.aadhaarBackUrl) {
        kycRecords.push({
          userId: userId,
          documentType: 'aadhaar_back',
          documentUrl: userData.aadhaarBackUrl,
          documentNumber: userData.aadhaarNumber || '',
          status: 'pending' as const,
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Bank Statement
      if (userData.bankStatementUrl) {
        kycRecords.push({
          userId: userId,
          documentType: 'bank_details',
          documentUrl: userData.bankStatementUrl,
          documentNumber: '',
          status: 'pending' as const,
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Photo
      if (userData.profileImageUrl) {
        kycRecords.push({
          userId: userId,
          documentType: 'photo',
          documentUrl: userData.profileImageUrl,
          documentNumber: '',
          status: 'pending' as const,
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Insert all KYC records
      if (kycRecords.length > 0) {
        await db.insert(kycDocuments).values(kycRecords);
        console.log(`✅ Created ${kycRecords.length} KYC document records for existing user ${userId}`);
      }
      
    } catch (error) {
      console.error('Error creating KYC records for existing user:', error);
    }
  }

  // Get user KYC information for profile
  async getUserKYCInfo(userId: string): Promise<any> {
    try {
      const { kycDocuments, users } = await import('@shared/schema');
      
      // FIX #2: Get user's overall KYC status from users table (source of truth)
      const [userData] = await db.select({ 
        kycStatus: users.kycStatus,
        kycApprovedAt: users.kycApprovedAt,
        kycSubmittedAt: users.kycSubmittedAt
      })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      // Get all KYC documents for the user
      const documents = await db.select().from(kycDocuments)
        .where(eq(kycDocuments.userId, userId))
        .orderBy(desc(kycDocuments.createdAt));
      
      // Get the main KYC profile record (for rejection reason if needed)
      const kycProfile = documents.find(doc => doc.documentType === 'kyc_profile');
      
      // Get individual document statuses
      const panCard = documents.find(doc => doc.documentType === 'pan_card');
      const aadhaarFront = documents.find(doc => doc.documentType === 'aadhaar_front');
      const aadhaarBack = documents.find(doc => doc.documentType === 'aadhaar_back');
      const bankStatement = documents.find(doc => doc.documentType === 'bank_details');
      const photo = documents.find(doc => doc.documentType === 'photo');
      
      // Use user's kyc_status as the overall status (single source of truth)
      const overallStatus = userData?.kycStatus || 'pending';
      
      return {
        overallStatus: overallStatus,
        overallReason: kycProfile?.rejectionReason || '',
        documents: {
          panCard: {
            status: panCard?.status || 'pending',
            url: panCard?.documentUrl || '',
            documentData: panCard?.documentData || '',
            documentType: panCard?.documentContentType || '',
            reason: panCard?.rejectionReason || ''
          },
          aadhaarFront: {
            status: aadhaarFront?.status || 'pending',
            url: aadhaarFront?.documentUrl || '',
            documentData: aadhaarFront?.documentData || '',
            documentType: aadhaarFront?.documentContentType || '',
            reason: aadhaarFront?.rejectionReason || ''
          },
          aadhaarBack: {
            status: aadhaarBack?.status || 'pending',
            url: aadhaarBack?.documentUrl || '',
            documentData: aadhaarBack?.documentData || '',
            documentType: aadhaarBack?.documentContentType || '',
            reason: aadhaarBack?.rejectionReason || ''
          },
          bankStatement: {
            status: bankStatement?.status || 'pending',
            url: bankStatement?.documentUrl || '',
            documentData: bankStatement?.documentData || '',
            documentType: bankStatement?.documentContentType || '',
            reason: bankStatement?.rejectionReason || ''
          },
          photo: {
            status: photo?.status || 'pending',
            url: photo?.documentUrl || '',
            documentData: photo?.documentData || '',
            documentType: photo?.documentContentType || '',
            reason: photo?.rejectionReason || ''
          }
        },
        lastUpdated: userData?.kycApprovedAt || userData?.kycSubmittedAt || kycProfile?.updatedAt || kycProfile?.createdAt
      };
    } catch (error) {
      console.error('Error getting user KYC info:', error);
      return {
        overallStatus: 'pending',
        overallReason: 'Unable to load KYC information',
        documents: {},
        lastUpdated: null
      };
    }
  }

  // ===== RANK OPERATIONS =====
  async getUserRankHistory(userId: string): Promise<RankAchievement[]> {
    return await db.select().from(rankAchievements)
      .where(eq(rankAchievements.userId, userId))
      .orderBy(desc(rankAchievements.achievedAt));
  }

  async createRankAchievement(userId: string, rank: any, teamBV: string, leftBV: string, rightBV: string): Promise<RankAchievement> {
    // Check rank eligibility and calculate bonus
    const bonus = this.calculateRankBonus(rank, teamBV);
    
    const [achievement] = await db.insert(rankAchievements).values({
      userId,
      rank,
      teamBV,
      leftBV,
      rightBV,
      bonus: bonus.toString(),
    }).returning();

    // Update user's current rank
    await db.update(users)
      .set({ currentRank: rank })
      .where(eq(users.userId, userId));

    // NOTE: Rank achievement bonus is handled by productionBVEngine.ts
    // The bonus is credited to the SPONSOR (not the user who achieved the rank)
    // This prevents duplicate bonus crediting

    return achievement;
  }

  private calculateRankBonus(rank: any, teamBV: string): number {
    const bv = parseFloat(teamBV);
    const bonuses: { [key: string]: number } = {
      'Executive': 0,
      'Bronze Star': 5000,
      'Gold Star': 10000,
      'Emerald Star': 36000,
      'Ruby Star': 90000,
      'Diamond': 225000,
      'Vice President': 360000,
      'President': 810000,
      'Ambassador': 1620000,
      'Deputy Director': 2500000,
      'Director': 10000000,
      'Founder': 35000000,
    };
    return bonuses[rank] || 0;
  }

  async checkRankEligibility(userId: string): Promise<{ eligible: boolean; newRank?: any; teamBV: string }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const bvStats = await this.calculateUserBV(userId);
    const teamBV = parseFloat(bvStats.totalBV);

    // Rank eligibility criteria based on business plan
    const rankCriteria: { [key: string]: number } = {
      'Executive': 0,
      'Bronze Star': 125000,
      'Gold Star': 250000,
      'Emerald Star': 900000,
      'Ruby Star': 1800000,
      'Diamond': 4500000,
      'Vice President': 9000000,
      'President': 27000000,
      'Ambassador': 81000000,
      'Deputy Director': 243000000,
      'Director': 900000000,
      'Founder': 2700000000,
    };

    const ranks = Object.keys(rankCriteria);
    const currentRankIndex = ranks.indexOf(user.currentRank || 'Executive');
    
    for (let i = ranks.length - 1; i > currentRankIndex; i--) {
      const rank = ranks[i];
      if (teamBV >= rankCriteria[rank]) {
        return { eligible: true, newRank: rank as any, teamBV: teamBV.toString() };
      }
    }

    return { eligible: false, teamBV: teamBV.toString() };
  }

  // ===== BV CALCULATION OPERATIONS =====
  async calculateUserBV(userId: string): Promise<{ totalBV: string; leftBV: string; rightBV: string }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    // Calculate own BV from purchases
    const userPurchases = await this.getUserPurchases(userId);
    const ownBV = userPurchases
      .filter(p => p.paymentStatus === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.totalBV), 0);

    // Calculate left leg BV
    let leftBV = 0;
    if (user.leftChildId) {
      const leftStats = await this.calculateUserBV(user.leftChildId);
      leftBV = parseFloat(leftStats.totalBV);
    }

    // Calculate right leg BV
    let rightBV = 0;
    if (user.rightChildId) {
      const rightStats = await this.calculateUserBV(user.rightChildId);
      rightBV = parseFloat(rightStats.totalBV);
    }

    const totalBV = ownBV + leftBV + rightBV;

    return {
      totalBV: totalBV.toString(),
      leftBV: leftBV.toString(),
      rightBV: rightBV.toString(),
    };
  }

  async updateUserBVStats(userId: string): Promise<void> {
    const bvStats = await this.calculateUserBV(userId);
    
    await db.update(users)
      .set({
        totalBV: bvStats.totalBV,
        leftBV: bvStats.leftBV,
        rightBV: bvStats.rightBV,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async processIncomeDistribution(purchaseId: string): Promise<void> {
    const purchase = await this.getPurchaseById(purchaseId);
    if (!purchase) return;

    const buyer = await this.getUser(purchase.userId);
    if (!buyer) return;

    // Get product to retrieve sponsor income percentage
    const product = await this.getProductById(purchase.productId);
    const sponsorIncomePercentage = product?.sponsorIncomePercentage 
      ? parseFloat(product.sponsorIncomePercentage) 
      : 10; // Default to 10% if not specified

    console.log(`🔄 Processing income distribution for purchase: ${purchaseId} (Sponsor Income: ${sponsorIncomePercentage}%)`);

    // Import production BV engine
    const { productionBVEngine } = await import('./productionBVEngine');
    
    try {
      // Process BV calculations using production engine
      await productionBVEngine.processPurchase({
        purchaseId: purchase.id,
        userId: buyer.userId!, // Display ID (VV0001)
        bvAmount: purchase.totalBV,
        monthId: productionBVEngine.getCurrentMonthId(),
        sponsorIncomePercentage: sponsorIncomePercentage
      });
      
      console.log(`✅ BV calculations completed for purchase: ${purchaseId}`);
    } catch (error) {
      console.error(`❌ Error in BV calculations for purchase ${purchaseId}:`, error);
      // Continue with existing logic as fallback
    }

    // Update BV stats for the buyer and uplines (existing logic as backup)
    await this.updateUserBVStats(purchase.userId);
    
    // Update upline BV stats (recursive)
    let currentUser = buyer;
    while (currentUser.parentId) {
      await this.updateUserBVStats(currentUser.parentId);
      const parentUser = await this.getUser(currentUser.parentId);
      if (!parentUser) break;
      currentUser = parentUser;
    }

    // Check rank eligibility for buyer and sponsor
    const buyerRankCheck = await this.checkRankEligibility(purchase.userId);
    if (buyerRankCheck.eligible && buyerRankCheck.newRank) {
      await this.createRankAchievement(
        purchase.userId,
        buyerRankCheck.newRank,
        buyerRankCheck.teamBV,
        (await this.calculateUserBV(purchase.userId)).leftBV,
        (await this.calculateUserBV(purchase.userId)).rightBV
      );
    }
  }

  // ===== FRANCHISE OPERATIONS =====
  async createFranchiseRequest(userId: string, data: CreateFranchiseRequest): Promise<FranchiseRequest> {
    // Calculate investment details based on franchise type
    const franchiseDetails = this.getFranchiseDetails(data.franchiseType);
    
    const [request] = await db.insert(franchiseRequests).values({
      userId,
      franchiseType: data.franchiseType,
      investmentAmount: franchiseDetails.amount.toString(),
      businessVolume: franchiseDetails.bv.toString(),
      sponsorIncome: franchiseDetails.sponsorIncome.toString(),
      businessPlan: data.businessPlan,
    }).returning();

    return request;
  }

  private getFranchiseDetails(type: any): { amount: number; bv: number; sponsorIncome: number } {
    const details: { [key: string]: { amount: number; bv: number; sponsorIncome: number } } = {
      'Mini Franchise': { amount: 250000, bv: 62500, sponsorIncome: 12500 },
      'Basic Franchise': { amount: 500000, bv: 125000, sponsorIncome: 25000 },
      'Smart Franchise': { amount: 1000000, bv: 250000, sponsorIncome: 50000 },
      'Growth Franchise': { amount: 2500000, bv: 625000, sponsorIncome: 125000 },
      'Master Franchise': { amount: 5000000, bv: 1250000, sponsorIncome: 250000 },
      'Super Franchise': { amount: 10000000, bv: 2500000, sponsorIncome: 500000 },
    };
    return details[type] || details['Mini Franchise'];
  }

  async getUserFranchiseRequests(userId: string): Promise<FranchiseRequest[]> {
    return await db.select().from(franchiseRequests)
      .where(eq(franchiseRequests.userId, userId))
      .orderBy(desc(franchiseRequests.createdAt));
  }

  async getAllFranchiseRequests(): Promise<FranchiseRequest[]> {
    return await db.select().from(franchiseRequests)
      .orderBy(desc(franchiseRequests.createdAt));
  }

  async updateFranchiseRequestStatus(id: string, status: string, adminNotes?: string): Promise<boolean> {
    const updateData: any = { status, updatedAt: new Date() };
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (status === 'approved') updateData.reviewedAt = new Date();

    const result = await db
      .update(franchiseRequests)
      .set(updateData)
      .where(eq(franchiseRequests.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ===== SUPPORT OPERATIONS =====
  async createSupportTicket(userId: string, data: CreateSupportTicket): Promise<SupportTicket> {
    const [ticket] = await db.insert(supportTickets).values({
      userId,
      ...data,
    }).returning();
    return ticket;
  }

  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    return await db.select().from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getAllTickets(): Promise<SupportTicket[]> {
    return await db.select().from(supportTickets)
      .orderBy(desc(supportTickets.createdAt));
  }

  async updateTicketStatus(id: string, status: any, resolution?: string): Promise<boolean> {
    const updateData: any = { status, updatedAt: new Date() };
    if (resolution) {
      updateData.resolution = resolution;
      if (status === 'resolved') updateData.resolvedAt = new Date();
    }

    const result = await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ===== ACHIEVERS OPERATIONS =====
  async getAchieversByType(type: string, period: string): Promise<Achiever[]> {
    return await db.select().from(achievers)
      .where(and(eq(achievers.achievementType, type), eq(achievers.period, period)))
      .orderBy(achievers.position);
  }

  async createAchiever(userId: string, type: string, position: number, amount?: string): Promise<Achiever> {
    const [achiever] = await db.insert(achievers).values({
      userId,
      achievementType: type,
      position,
      amount,
      period: 'monthly',
      periodDate: new Date(),
    }).returning();

    return achiever;
  }

  // ===== CHEQUE OPERATIONS =====
  async getUserCheques(userId: string): Promise<Cheque[]> {
    return await db.select().from(cheques)
      .where(eq(cheques.userId, userId))
      .orderBy(desc(cheques.issuedDate));
  }

  async createCheque(userId: string, amount: string, purpose: string): Promise<Cheque> {
    const chequeNumber = `CHQ${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const [cheque] = await db.insert(cheques).values({
      userId,
      chequeNumber,
      amount,
      bankName: 'Voltvera Company Bank',
      issuedDate: new Date(),
      purpose,
    }).returning();

    return cheque;
  }

  // ===== NEWS OPERATIONS =====
  async getAllNews(): Promise<News[]> {
    return await db.select().from(news)
      .orderBy(desc(news.publishedAt));
  }

  async getActiveNews(): Promise<News[]> {
    const now = new Date();
    return await db.select().from(news)
      .where(and(
        eq(news.isActive, true),
        or(
          sql`${news.expiresAt} IS NULL`,
          sql`${news.expiresAt} > ${now}`
        )
      ))
      .orderBy(desc(news.publishedAt));
  }

  async createNews(data: CreateNews, createdBy: string): Promise<News> {
    const [newsItem] = await db.insert(news).values({
      ...data,
      createdBy,
    }).returning();
    return newsItem;
  }

  async updateNews(id: string, updates: Partial<News>): Promise<News | undefined> {
    const [newsItem] = await db
      .update(news)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(news.id, id))
      .returning();
    return newsItem;
  }

  // Additional user management methods
  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async updateUserStatus(userId: string, status: string): Promise<User | undefined> {
    // Validate status value
    const validStatuses = ['invited', 'registered', 'active', 'inactive', 'pending', 'rejected', 'suspended'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    const [updatedUser] = await db
      .update(users)
      .set({ 
        status: status as 'invited' | 'registered' | 'active' | 'inactive' | 'pending' | 'rejected' | 'suspended',
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  // Financial operations for admin
  async getAllWalletBalances(): Promise<WalletBalance[]> {
    return await db.select().from(walletBalances);
  }

  async getAllWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests).orderBy(desc(withdrawalRequests.createdAt));
  }

  // Income reports
  async getIncomeReports(filters?: {
    transactionTypes?: string[];
    startDate?: string;
    endDate?: string;
    userId?: string;
  }): Promise<any[]> {
    const conditions = [];
    
    // Filter by transaction types
    if (filters?.transactionTypes && filters.transactionTypes.length > 0) {
      conditions.push(inArray(transactions.type, filters.transactionTypes as any));
    }
    
    // Filter by date range
    if (filters?.startDate) {
      conditions.push(gte(transactions.createdAt, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(transactions.createdAt, new Date(filters.endDate)));
    }
    
    // Filter by user ID (optional)
    if (filters?.userId) {
      conditions.push(eq(transactions.userId, filters.userId));
    }
    
    // Get transactions with user details
    const query = db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        userDisplayId: users.userId,
        userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        userEmail: users.email,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        referenceId: transactions.referenceId,
        balanceBefore: transactions.balanceBefore,
        balanceAfter: transactions.balanceAfter,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.userId))
      .orderBy(desc(transactions.createdAt));
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    
    return await query;
  }

  // Referral links and recruitment
  async createReferralLink(data: CreateReferralLink & { token: string }): Promise<ReferralLink> {
    const [referralLink] = await db
      .insert(referralLinks)
      .values(data)
      .returning();
    return referralLink;
  }

  async getReferralLink(token: string): Promise<ReferralLink | undefined> {
    try {
      const [referralLink] = await db
        .select()
        .from(referralLinks)
        .where(eq(referralLinks.token, token));
      return referralLink;
    } catch (error) {
      console.error('Error getting referral link:', error);
      return undefined;
    }
  }

  async markReferralLinkAsUsed(token: string, usedBy: string): Promise<boolean> {
    try {
      const [updated] = await db
        .update(referralLinks)
        .set({
          isUsed: true,
          usedBy,
          usedAt: new Date()
        })
        .where(eq(referralLinks.token, token))
        .returning();
      return !!updated;
    } catch (error) {
      console.error('Error marking referral link as used:', error);
      return false;
    }
  }

  async getUserReferralLinks(userId: string): Promise<ReferralLink[]> {
    return await db
      .select()
      .from(referralLinks)
      .where(eq(referralLinks.generatedBy, userId))
      .orderBy(desc(referralLinks.createdAt));
  }

  // Recruitment requests
  async createRecruitmentRequest(data: CreateRecruitmentRequest): Promise<RecruitmentRequest> {
    const [request] = await db
      .insert(recruitmentRequests)
      .values(data)
      .returning();
    return request;
  }

  async getRecruitmentRequest(id: string): Promise<RecruitmentRequest | undefined> {
    const [request] = await db
      .select()
      .from(recruitmentRequests)
      .where(eq(recruitmentRequests.id, id));
    return request;
  }

  async updateRecruitmentRequestStatus(id: string, status: string, approvedBy?: string): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };
      
      if (approvedBy) {
        updateData.approvedBy = approvedBy;
        updateData.approvedAt = new Date();
      }

      const [updated] = await db
        .update(recruitmentRequests)
        .set(updateData)
        .where(eq(recruitmentRequests.id, id))
        .returning();
      return !!updated;
    } catch (error) {
      console.error('Error updating recruitment request status:', error);
      return false;
    }
  }

  async getRecruitmentRequests(filters?: { status?: string; generatedBy?: string }): Promise<RecruitmentRequest[]> {
    let query = db.select().from(recruitmentRequests);
    
    if (filters?.status) {
      query = query.where(eq(recruitmentRequests.status, filters.status)) as typeof query;
    }
    
    return await query.orderBy(desc(recruitmentRequests.createdAt));
  }

  // Founder-specific operations
  async getFounderStats(): Promise<{
    totalUsers: number;
    hiddenIds: number;
    totalRevenue: string;
    networkBalance: string;
    leftLegUsers: number;
    rightLegUsers: number;
  }> {
    try {
      const totalUsers = await db.select().from(users);
      const hiddenIds = await db.select().from(users).where(eq(users.isHiddenId, true));
      
      // Calculate basic stats
      const stats = {
        totalUsers: totalUsers.length,
        hiddenIds: hiddenIds.length,
        totalRevenue: '0.00', // Would be calculated from actual transactions
        networkBalance: '0.00', // Would be calculated from wallet balances
        leftLegUsers: 0, // Would be calculated from binary tree structure
        rightLegUsers: 0, // Would be calculated from binary tree structure
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting founder stats:', error);
      return {
        totalUsers: 0,
        hiddenIds: 0,
        totalRevenue: '0.00',
        networkBalance: '0.00',
        leftLegUsers: 0,
        rightLegUsers: 0,
      };
    }
  }

  async getHiddenIds(): Promise<User[]> {
    try {
      return await db
        .select()
        .from(users)
        .where(eq(users.isHiddenId, true))
        .orderBy(desc(users.createdAt));
    } catch (error) {
      console.error('Error getting hidden IDs:', error);
      return [];
    }
  }

  async overridePlacement(userId: string, newParentId: string, position: string): Promise<boolean> {
    try {
      // This would implement the actual placement override logic
      // For now, just a placeholder
      console.log(`Override placement: User ${userId} -> Parent ${newParentId} at ${position}`);
      return true;
    } catch (error) {
      console.error('Error overriding placement:', error);
      return false;
    }
  }

  async updatePendingRecruitDetails(recruitId: string, details: { fullName: string; email: string; status: string }): Promise<boolean> {
    try {
      const result = await db.update(pendingRecruits)
        .set({
          fullName: details.fullName,
          email: details.email,
          status: details.status,
          updatedAt: new Date()
        })
        .where(eq(pendingRecruits.id, recruitId));
      
      return true;
    } catch (error) {
      console.error('Error updating pending recruit details:', error);
      return false;
    }
  }
  
  // Get all referral links
  async getReferralLinks(): Promise<ReferralLink[]> {
    try {
      return await db
        .select()
        .from(referralLinks)
        .orderBy(desc(referralLinks.createdAt));
    } catch (error) {
      console.error('Error getting referral links:', error);
      return [];
    }
  }

  // Financial operations for admin
  async getAllUsersForPlacement(): Promise<User[]> {
    try {
      // Get all active users for admin to choose as parents
      const allUsers = await db
        .select()
        .from(users)
        .where(eq(users.status, 'active'))
        .orderBy(desc(users.createdAt));
      
      return allUsers;
    } catch (error) {
      console.error('Error getting users for placement:', error);
      return [];
    }
  }

  async createUserWithStrategicPlacement(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    mobile?: string;
    packageAmount: string;
    parentId: string;
    position: 'left' | 'right';
    sponsorId: string;
    profileData?: any;
  }): Promise<User & { originalPassword: string }> {
    try {
      // Store password in plaintext (no hashing)
      
      // Helper function to normalize ID to Display ID format
      const normalizeToDisplayId = async (id: string): Promise<string> => {
        if (!id) return id;
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (uuidPattern.test(id)) {
          const user = await db.select({ userId: users.userId }).from(users).where(eq(users.id, id)).limit(1);
          return user[0]?.userId || id;
        }
        return id;
      };
      
      // Normalize parentId and sponsorId to Display ID format
      const normalizedParentId = await normalizeToDisplayId(data.parentId);
      const normalizedSponsorId = await normalizeToDisplayId(data.sponsorId);
      
      // Get parent user to calculate level - look up by Display ID
      const parentUser = await db.select().from(users).where(eq(users.userId, normalizedParentId)).limit(1);
      if (!parentUser.length) {
        throw new Error(`Parent user not found with ID: ${normalizedParentId}`);
      }
      
      const parentLevel = parseInt(parentUser[0].level || '0');
      const userLevel = (parentLevel + 1).toString();
      
      // Generate unique user ID
      const userId = `VV${String(Date.now()).slice(-4)}`;
      
      // Create the user with strategic placement
      console.log('🔍 Creating strategic user with originalPassword:', data.password);
      console.log('🔍 Using normalized IDs - parentId:', normalizedParentId, 'sponsorId:', normalizedSponsorId);
      
      const [newUser] = await db.insert(users).values({
        userId: userId, // Add the userId field
        email: data.email,
        password: data.password, // Store password in plaintext
        originalPassword: data.password, // Store original password in database
        firstName: data.firstName,
        lastName: data.lastName,
        mobile: data.mobile || null,
        packageAmount: data.packageAmount,
        parentId: normalizedParentId,
        position: data.position,
        sponsorId: normalizedSponsorId,
        level: userLevel,
        status: 'active',
        role: 'user',
        registrationDate: new Date(),
        activationDate: new Date(),
        idStatus: 'Active',
        ...data.profileData,
      }).returning();
      
      console.log('✅ Strategic user created, originalPassword in result:', newUser.originalPassword);
      
      // Update parent's child reference (LEGACY - commented out)
      // if (data.position === 'left') {
      //   await db.update(users)
      //     .set({ leftChildId: newUser.id })
      //     .where(eq(users.id, data.parentId));
      // } else {
      //   await db.update(users)
      //     .set({ rightChildId: newUser.id })
      //     .where(eq(users.id, data.parentId));
      // }

      // Place user in multi-child tree (NEW)
      await this.placeUserInMultiChildTree(newUser.id, normalizedSponsorId, normalizedParentId, data.position as 'left' | 'right');
      
      // Create wallet balance for the new user
      await this.createWalletBalance(userId);
      
      console.log(`User created with strategic placement: ${newUser.email} under ${data.parentId} at ${data.position} position`);
      
      // Return user with original password for admin viewing
      return {
        ...newUser,
        originalPassword: data.password
      };
    } catch (error) {
      console.error('Error creating user with strategic placement:', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const storage = new DatabaseStorage();
