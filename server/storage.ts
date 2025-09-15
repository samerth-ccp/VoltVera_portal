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
import { eq, ilike, or, desc, and, sql, gte, lte } from "drizzle-orm";

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
  searchUsers(query: string, filters: {
    searchType?: 'id' | 'name' | 'bv' | 'rank';
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
  }>;
  
  // Binary MLM Tree operations
  getBinaryTreeData(userId: string): Promise<any>;
  getDirectRecruits(userId: string): Promise<User[]>;
  placeUserInBinaryTree(userId: string, sponsorId: string): Promise<void>;
  
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
  getPurchaseById(id: string): Promise<Purchase | undefined>;
  updatePurchaseStatus(id: string, status: string): Promise<boolean>;
  
  // Wallet operations
  getWalletBalance(userId: string): Promise<WalletBalance | undefined>;
  createWalletBalance(userId: string): Promise<WalletBalance>;
  updateWalletBalance(userId: string, amount: string, description: string, type: any): Promise<Transaction>;
  getUserTransactions(userId: string): Promise<Transaction[]>;
  
  // Withdrawal operations
  createWithdrawalRequest(userId: string, data: CreateWithdrawal): Promise<WithdrawalRequest>;
  getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]>;
  getAllWithdrawals(): Promise<WithdrawalRequest[]>;
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
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
          .where(eq(users.id, user.sponsorId))
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

  // Generate next sequential user ID like VV0001, VV0002, etc.
  async generateNextUserId(): Promise<string> {
    const result = await db.select({ userId: users.userId })
      .from(users)
      .where(sql`${users.userId} LIKE 'VV%'`)
      .orderBy(sql`${users.userId} DESC`)
      .limit(1);
    
    if (result.length === 0) {
      return 'VV0001'; // First user
    }
    
    const lastUserId = result[0].userId;
    if (lastUserId) {
      const numPart = parseInt(lastUserId.substring(2));
      const nextNum = numPart + 1;
      return `VV${nextNum.toString().padStart(4, '0')}`;
    }
    
    return 'VV0001';
  }

  async createUser(userData: CreateUser): Promise<User & { originalPassword?: string }> {
    // Generate sequential user ID
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
    
    return {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.status === 'active').length,
      adminUsers: allUsers.filter(u => u.role === 'admin').length,
      pendingUsers: allUsers.filter(u => u.status === 'pending').length,
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
    searchType?: 'id' | 'name' | 'bv' | 'rank';
    status?: string;
    role?: string;
    kycStatus?: string;
    dateFilterType?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<(User & { sponsorUserId: string | null })[]> {
    let searchConditions: any[] = [];
    
    // Only add search conditions if query is provided and not empty
    if (query && query.trim()) {
      // Build search conditions based on search type
      if (filters.searchType === 'id') {
        searchConditions.push(ilike(users.id, `%${query}%`));
      } else if (filters.searchType === 'name') {
        searchConditions.push(
          or(
            ilike(users.firstName, `%${query}%`),
            ilike(users.lastName, `%${query}%`),
            ilike(sql`concat(${users.firstName}, ' ', ${users.lastName})`, `%${query}%`)
          )
        );
      } else if (filters.searchType === 'bv') {
        // Search by BV amount - cast decimal to text
        searchConditions.push(ilike(sql`${users.totalBV}::text`, `%${query}%`));
      } else if (filters.searchType === 'rank') {
        searchConditions.push(ilike(sql`${users.currentRank}::text`, `%${query}%`));
      } else {
        // Default: search across multiple fields
        searchConditions.push(
          or(
            ilike(users.id, `%${query}%`),
            ilike(users.firstName, `%${query}%`),
            ilike(users.lastName, `%${query}%`),
            ilike(users.email, `%${query}%`),
            ilike(sql`${users.currentRank}::text`, `%${query}%`)
          )
        );
      }
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
    
    // Add date filtering conditions
    if (filters.dateFilterType && filters.dateFrom && filters.dateTo) {
      const dateFrom = new Date(filters.dateFrom);
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999); // Include the entire end date
      
      let dateField;
      switch (filters.dateFilterType) {
        case 'registration':
          dateField = users.registrationDate;
          break;
        case 'activation':
          dateField = users.activationDate;
          break;
        default:
          dateField = users.registrationDate;
      }
      
      filterConditions.push(
        and(
          gte(dateField, dateFrom),
          lte(dateField, dateTo)
        )
      );
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
          .where(eq(users.id, user.sponsorId))
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
    const [userStats, kycCount, withdrawalCount, franchiseCount] = await Promise.all([
      this.getUserStats(),
      db.select({ count: sql<number>`count(*)` }).from(kycDocuments).where(eq(kycDocuments.status, 'pending')),
      db.select({ count: sql<number>`count(*)` }).from(withdrawalRequests).where(eq(withdrawalRequests.status, 'pending')),
      db.select({ count: sql<number>`count(*)` }).from(franchiseRequests).where(eq(franchiseRequests.status, 'pending'))
    ]);
    
    // Calculate total BV in system
    const allUsers = await db.select({ totalBV: users.totalBV }).from(users);
    const totalBV = allUsers.reduce((sum, user) => sum + parseFloat(user.totalBV || '0'), 0);
    
    // Calculate monthly income (placeholder - would need transaction history)
    const monthlyIncome = '125000.00'; // This would be calculated from actual transactions
    
    return {
      totalUsers: userStats.totalUsers,
      activeUsers: userStats.activeUsers,
      pendingKYC: kycCount[0]?.count || 0,
      withdrawalRequests: withdrawalCount[0]?.count || 0,
      franchiseRequests: franchiseCount[0]?.count || 0,
      totalBV: totalBV.toFixed(2),
      monthlyIncome
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
    return await db.select()
      .from(users)
      .where(eq(users.sponsorId, userId))
      .orderBy(desc(users.createdAt));
  }

  async getDownline(userId: string, levels: number = 10): Promise<User[]> {
    const allMembers: User[] = [];
    const visited = new Set<string>();
    
    const getLevel = async (currentUserId: string, currentLevel: number): Promise<void> => {
      if (currentLevel > levels || visited.has(currentUserId)) return;
      visited.add(currentUserId);
      
      // Use binary tree structure (leftChildId, rightChildId) instead of sponsorId
      const currentUser = await db.select().from(users).where(eq(users.id, currentUserId)).limit(1);
      if (!currentUser.length) return;
      
      const user = currentUser[0];
      
      // Check left child
      if (user.leftChildId) {
        const leftChild = await db.select().from(users).where(eq(users.id, user.leftChildId)).limit(1);
        if (leftChild.length && !allMembers.find(m => m.id === leftChild[0].id)) {
          allMembers.push(leftChild[0]);
          await getLevel(leftChild[0].id, currentLevel + 1);
        }
      }
      
      // Check right child
      if (user.rightChildId) {
        const rightChild = await db.select().from(users).where(eq(users.id, user.rightChildId)).limit(1);
        if (rightChild.length && !allMembers.find(m => m.id === rightChild[0].id)) {
          allMembers.push(rightChild[0]);
          await getLevel(rightChild[0].id, currentLevel + 1);
        }
      }
    };
    
    await getLevel(userId, 1);
    return allMembers.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getTeamStats(userId: string): Promise<{
    directRecruits: number;
    totalDownline: number;
    activeMembers: number;
  }> {
    const directMembers = await this.getTeamMembers(userId);
    const allDownline = await this.getDownline(userId);
    
    return {
      directRecruits: directMembers.length,
      totalDownline: allDownline.length,
      activeMembers: allDownline.filter(u => u.status === 'active').length,
    };
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


  async approvePendingRecruit(id: string, adminData: { packageAmount: string; position?: string; kycDecision?: { status: 'approved' | 'rejected'; reason?: string } }): Promise<User> {
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
    const recruiter = await this.getUser(pendingRecruit.recruiterId);
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
    
    // Generate sequential user ID
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
      profileImageUrl: pendingRecruit.profileImageUrl,
    }).returning();

    // Place user in binary tree at the final position
    if (!pendingRecruit.uplineId) {
      throw new Error('Upline ID is required for position placement');
    }
    await this.placeUserInBinaryTreeAtSpecificPosition(newUser.id, pendingRecruit.uplineId, finalPosition as 'left' | 'right', pendingRecruit.recruiterId);

    // Transfer KYC documents if available from comprehensive registration
    if (pendingRecruit.panCardUrl || pendingRecruit.aadhaarCardUrl || 
        pendingRecruit.bankStatementUrl || pendingRecruit.profileImageUrl) {
      const { kycDocuments } = await import('@shared/schema');
      
      // Transfer PAN card
      if (pendingRecruit.panCardUrl) {
        await db.insert(kycDocuments).values({
          userId: newUser.id,
          documentType: 'pan',
          documentUrl: pendingRecruit.panCardUrl,
          documentNumber: pendingRecruit.panNumber,
          status: 'pending'
        });
      }
      
      // Transfer Aadhaar card  
      if (pendingRecruit.aadhaarCardUrl) {
        await db.insert(kycDocuments).values({
          userId: newUser.id,
          documentType: 'aadhaar',
          documentUrl: pendingRecruit.aadhaarCardUrl,
          documentNumber: pendingRecruit.aadhaarNumber,
          status: 'pending'
        });
      }
      
      // Transfer bank statement
      if (pendingRecruit.bankStatementUrl) {
        await db.insert(kycDocuments).values({
          userId: newUser.id,
          documentType: 'bank_statement',
          documentUrl: pendingRecruit.bankStatementUrl,
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
      
      // Create single KYC profile record
      await db.insert(kycDocuments).values({
        userId: newUser.id,
        documentType: 'kyc_profile',
        documentUrl: pendingRecruit.profileImageUrl || '',
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
      // If comprehensive registration, user already set their password, just send account activation
      const passwordForEmail = pendingRecruit.password ? 'Your chosen password' : 'defaultpass123';
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

  // Binary MLM Tree operations
  async getBinaryTreeData(userId: string): Promise<any> {
    // Import and use binary tree service
    const { binaryTreeService } = await import('./binaryTreeService');
    // Increase depth to 10 to show complete tree including grandchildren
    const treeData = await binaryTreeService.getBinaryTree(userId, 10);
    console.log('=== BINARY TREE DATA ===');
    console.log('Root user:', userId);
    console.log('Tree structure:', JSON.stringify(treeData, null, 2));
    return treeData;
  }

  async getDirectRecruits(userId: string): Promise<User[]> {
    // Import and use binary tree service
    const { binaryTreeService } = await import('./binaryTreeService');
    const binaryUsers = await binaryTreeService.getDirectRecruits(userId);
    
    // Convert BinaryTreeUser to User format
    return binaryUsers.map(bu => ({
      id: bu.id,
      userId: bu.userId || null,
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
      dateOfBirth: null,
      address: null,
      city: null,
      state: null,
      pincode: null,
      currentRank: null,
      totalBV: null,
      leftBV: null,
      rightBV: null,
      kycStatus: null,
      kycSubmittedAt: null,
      kycApprovedAt: null,
      isHiddenId: false,
      lastLoginAt: null,
    }));
  }

  async placeUserInBinaryTree(userId: string, sponsorId: string): Promise<void> {
    const { binaryTreeService } = await import('./binaryTreeService');
    const position = await binaryTreeService.findNextAvailablePosition(sponsorId);
    await binaryTreeService.placeUserInTree(userId, position.parentId, position.position, sponsorId);
  }

  // Place user at specific position decided by upline (with intelligent spillover)
  async placeUserInBinaryTreeAtSpecificPosition(userId: string, uplineId: string, desiredPosition: 'left' | 'right', sponsorId: string): Promise<void> {
    const { binaryTreeService } = await import('./binaryTreeService');
    
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
    const product = await this.getProductById(data.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const totalAmount = parseFloat(product.price) * data.quantity;
    const totalBV = parseFloat(product.bv) * data.quantity;

    const [purchase] = await db.insert(purchases).values({
      userId,
      productId: data.productId,
      quantity: data.quantity,
      totalAmount: totalAmount.toString(),
      totalBV: totalBV.toString(),
      paymentMethod: data.paymentMethod,
      deliveryAddress: data.deliveryAddress,
    }).returning();

    // Process income distribution and BV updates
    await this.processIncomeDistribution(purchase.id);
    
    return purchase;
  }

  async getUserPurchases(userId: string): Promise<Purchase[]> {
    return await db.select().from(purchases)
      .where(eq(purchases.userId, userId))
      .orderBy(desc(purchases.createdAt));
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
    return (result.rowCount ?? 0) > 0;
  }

  // ===== WALLET OPERATIONS =====
  async getWalletBalance(userId: string): Promise<WalletBalance | undefined> {
    const [wallet] = await db.select().from(walletBalances).where(eq(walletBalances.userId, userId));
    return wallet;
  }

  async createWalletBalance(userId: string): Promise<WalletBalance> {
    const [wallet] = await db.insert(walletBalances).values({ userId }).returning();
    return wallet;
  }

  async updateWalletBalance(userId: string, amount: string, description: string, type: any): Promise<Transaction> {
    let wallet = await this.getWalletBalance(userId);
    if (!wallet) {
      wallet = await this.createWalletBalance(userId);
    }

    const currentBalance = parseFloat(wallet.balance);
    const changeAmount = parseFloat(amount);
    const newBalance = currentBalance + changeAmount;

    // Update wallet balance
    await db.update(walletBalances)
      .set({ 
        balance: newBalance.toString(),
        totalEarnings: type === 'withdrawal' ? wallet.totalEarnings : (parseFloat(wallet.totalEarnings) + Math.max(0, changeAmount)).toString(),
        totalWithdrawals: type === 'withdrawal' ? (parseFloat(wallet.totalWithdrawals) + Math.abs(changeAmount)).toString() : wallet.totalWithdrawals,
        updatedAt: new Date()
      })
      .where(eq(walletBalances.userId, userId));

    // Create transaction record
    const [transaction] = await db.insert(transactions).values({
      userId,
      type,
      amount,
      description,
      balanceBefore: currentBalance.toString(),
      balanceAfter: newBalance.toString(),
    }).returning();

    return transaction;
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  // ===== WITHDRAWAL OPERATIONS =====
  async createWithdrawalRequest(userId: string, data: CreateWithdrawal): Promise<WithdrawalRequest> {
    const wallet = await this.getWalletBalance(userId);
    if (!wallet || parseFloat(wallet.balance) < parseFloat(data.amount)) {
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

  async getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, userId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getAllWithdrawals(): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests)
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async updateWithdrawalStatus(id: string, status: string, adminNotes?: string): Promise<boolean> {
    const updateData: any = { status, updatedAt: new Date() };
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (status === 'processed') updateData.processedAt = new Date();

    const result = await db
      .update(withdrawalRequests)
      .set(updateData)
      .where(eq(withdrawalRequests.id, id));
    return (result.rowCount ?? 0) > 0;
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
    console.log(`🔄 Updating KYC document ${id} for user ${currentDoc.userId}. Was rejected: ${wasRejected}`);

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
      // Clear URL when using binary data
      updateData.documentUrl = null;
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
      const allUserKYC = await db.select({ status: kycDocuments.status })
        .from(kycDocuments)
        .where(eq(kycDocuments.userId, updatedDoc.userId));
      
      // Determine overall KYC status
      let overallKYCStatus = 'pending';
      
      // If this is a re-verification request (user was previously rejected), 
      // always set to pending to bring it back for admin review
      if (wasRejected) {
        overallKYCStatus = 'pending';
        console.log(`🔄 Re-verification request detected for user ${updatedDoc.userId} - setting status to pending`);
      } else {
        // Normal logic for non-rejected users
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
      
      // Create notification for re-verification request
      if (overallKYCStatus === 'pending' && wasRejected) {
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
            eq(kycDocuments.documentType, 'bank_cancelled_cheque'),
            eq(kycDocuments.documentType, 'kyc_profile')
          )
        );
      
      console.log(`📊 Found ${mismatchedDocs.length} documents with mismatched types`);
      
      for (const doc of mismatchedDocs) {
        let newType = doc.documentType;
        
        // Map to standard types
        if (doc.documentType === 'aadhaar_front' || doc.documentType === 'aadhaar_back') {
          newType = 'aadhaar';
        } else if (doc.documentType === 'bank_cancelled_cheque') {
          newType = 'bank_statement';
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
              panCard: { url: doc.documentType === 'pan' ? doc.documentUrl : '', number: doc.panNumber || '', status: doc.documentType === 'pan' ? doc.status : 'pending' },
              aadhaarCard: { url: doc.documentType === 'aadhaar' ? doc.documentUrl : '', number: doc.aadhaarNumber || '', status: doc.documentType === 'aadhaar' ? doc.status : 'pending' },
              bankStatement: { url: doc.documentType === 'bank_statement' ? doc.documentUrl : '', status: doc.documentType === 'bank_statement' ? doc.status : 'pending' },
              photo: { url: doc.documentType === 'photo' ? doc.documentUrl : (doc.profileImageUrl || ''), status: doc.documentType === 'photo' ? doc.status : 'pending' }
            }
          };
        } else {
          // Update documents with the latest status for each document type
          if (doc.documentType === 'pan') {
            userKYCData[userId].documents.panCard = { 
              url: doc.documentUrl, 
              number: doc.documentNumber || doc.panNumber || '', 
              status: doc.status 
            };
          } else if (doc.documentType === 'aadhaar') {
            userKYCData[userId].documents.aadhaarCard = { 
              url: doc.documentUrl, 
              number: doc.documentNumber || doc.aadhaarNumber || '', 
              status: doc.status 
            };
          } else if (doc.documentType === 'bank_statement') {
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
        const allUserKYC = await db.select({ status: kycDocuments.status })
          .from(kycDocuments)
          .where(eq(kycDocuments.userId, userId));
        
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
        
        // Only create notification if the overall KYC status actually changed
        if (currentOverallStatus !== overallKYCStatus) {
          console.log(`📢 KYC status changed from ${currentOverallStatus} to ${overallKYCStatus} - sending notification`);
          await this.createKYCStatusNotification(userId, overallKYCStatus, reason);
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
          documentType: 'pan',
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
      if (userData.aadhaarCardUrl) {
        kycRecords.push({
          userId: userId,
          documentType: 'aadhaar',
          documentUrl: userData.aadhaarCardUrl,
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
          documentType: 'bankStatement',
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
      const { kycDocuments } = await import('@shared/schema');
      
      // Get all KYC documents for the user
      const documents = await db.select().from(kycDocuments)
        .where(eq(kycDocuments.userId, userId))
        .orderBy(desc(kycDocuments.createdAt));
      
      // Get the main KYC profile record
      const kycProfile = documents.find(doc => doc.documentType === 'kyc_profile');
      
      // Get individual document statuses
      const panCard = documents.find(doc => doc.documentType === 'pan');
      const aadhaarCard = documents.find(doc => doc.documentType === 'aadhaar');
      const bankStatement = documents.find(doc => doc.documentType === 'bank_statement');
      const photo = documents.find(doc => doc.documentType === 'photo');
      
      return {
        overallStatus: kycProfile?.status || 'pending',
        overallReason: kycProfile?.rejectionReason || '',
        documents: {
          panCard: {
            status: panCard?.status || 'pending',
            url: panCard?.documentUrl || '',
            documentData: panCard?.documentData || '', // ✅ Added documentData
            documentType: panCard?.documentContentType || '',
            reason: panCard?.rejectionReason || ''
          },
          aadhaarCard: {
            status: aadhaarCard?.status || 'pending',
            url: aadhaarCard?.documentUrl || '',
            documentData: aadhaarCard?.documentData || '', // ✅ Added documentData
            documentType: aadhaarCard?.documentContentType || '',
            reason: aadhaarCard?.rejectionReason || ''
          },
          bankStatement: {
            status: bankStatement?.status || 'pending',
            url: bankStatement?.documentUrl || '',
            documentData: bankStatement?.documentData || '', // ✅ Added documentData
            documentType: bankStatement?.documentContentType || '',
            reason: bankStatement?.rejectionReason || ''
          },
          photo: {
            status: photo?.status || 'pending',
            url: photo?.documentUrl || '',
            documentData: photo?.documentData || '', // ✅ Added documentData
            documentType: photo?.documentContentType || '',
            reason: photo?.rejectionReason || ''
          }
        },
        lastUpdated: kycProfile?.updatedAt || kycProfile?.createdAt
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
      .where(eq(users.id, userId));

    // Credit rank achievement bonus
    if (bonus > 0) {
      await this.updateWalletBalance(userId, bonus.toString(), `Rank Achievement Bonus - ${rank}`, 'admin_credit');
    }

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
      'Wise President': 360000,
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
      'Wise President': 9000000,
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
    if (!buyer || !buyer.sponsorId) return;

    // 10% sponsor income to direct sponsor
    const sponsorIncome = parseFloat(purchase.totalBV) * 0.1;
    await this.updateWalletBalance(
      buyer.sponsorId,
      sponsorIncome.toString(),
      `Sponsor Income from ${buyer.firstName} ${buyer.lastName}`,
      'sponsor_income'
    );

    // Update BV stats for the buyer and uplines
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
      
      // Get parent user to calculate level
      const parentUser = await db.select().from(users).where(eq(users.id, data.parentId)).limit(1);
      if (!parentUser.length) {
        throw new Error('Parent user not found');
      }
      
      const parentLevel = parseInt(parentUser[0].level || '0');
      const userLevel = (parentLevel + 1).toString();
      
      // Generate unique user ID
      const userId = `VV${String(Date.now()).slice(-4)}`;
      
      // Create the user with strategic placement
      console.log('🔍 Creating strategic user with originalPassword:', data.password);
      
      const [newUser] = await db.insert(users).values({
        userId: userId, // Add the userId field
        email: data.email,
        password: data.password, // Store password in plaintext
        originalPassword: data.password, // Store original password in database
        firstName: data.firstName,
        lastName: data.lastName,
        mobile: data.mobile || null,
        packageAmount: data.packageAmount,
        parentId: data.parentId,
        position: data.position,
        sponsorId: data.sponsorId,
        level: userLevel,
        status: 'active',
        role: 'user',
        registrationDate: new Date(),
        activationDate: new Date(),
        idStatus: 'Active',
        ...data.profileData,
      }).returning();
      
      console.log('✅ Strategic user created, originalPassword in result:', newUser.originalPassword);
      
      // Update parent's child reference
      if (data.position === 'left') {
        await db.update(users)
          .set({ leftChildId: newUser.id })
          .where(eq(users.id, data.parentId));
      } else {
        await db.update(users)
          .set({ rightChildId: newUser.id })
          .where(eq(users.id, data.parentId));
      }
      
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
