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
import { eq, ilike, or, desc, and, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
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
  getAllUsers(search?: string): Promise<User[]>;
  searchUsers(query: string, filters: {
    searchType?: 'id' | 'name' | 'bv' | 'rank';
    status?: string;
    role?: string;
    kycStatus?: string;
  }): Promise<User[]>;
  createUser(user: CreateUser): Promise<User>;
  recruitUser(recruitData: RecruitUser, recruiterId: string): Promise<User>;
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
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByUserIdAndPassword(userId: string, password: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.userId, userId));
    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        return user;
      }
    }
    return undefined;
  }

  // Additional user management operations
  async getAllUsers(search?: string): Promise<User[]> {
    let query = db.select().from(users).orderBy(desc(users.createdAt));
    
    if (search) {
      query = query.where(
        or(
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      ) as typeof query;
    }
    
    return await query;
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

  async createUser(userData: CreateUser): Promise<User> {
    // Generate sequential user ID
    const userId = await this.generateNextUserId();
    
    // Hash password before storing (use nanoid if not provided)
    const hashedPassword = await bcrypt.hash(userData.password || "defaultpass123", 10);
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        userId,
        password: hashedPassword,
        status: userData.status || 'active', // Use provided status or default to active for admin-created users
        emailVerified: new Date(),
        lastActiveAt: new Date()
      })
      .returning();
    return user;
  }

  async recruitUser(recruitData: RecruitUser, recruiterId: string): Promise<User> {
    // Hash a temporary password (will be replaced when user accepts invitation)
    const tempPassword = nanoid(16);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const [user] = await db
      .insert(users)
      .values({
        ...recruitData,
        password: hashedPassword,
        sponsorId: recruiterId,
        status: 'pending'
      })
      .returning();
    return user;
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
  }): Promise<User[]> {
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
    
    // Combine all conditions
    const allConditions = [...searchConditions, ...filterConditions];
    
    let searchQuery = db.select().from(users).orderBy(desc(users.createdAt));
    
    if (allConditions.length > 0) {
      searchQuery = searchQuery.where(and(...allConditions)) as typeof searchQuery;
    }
    
    return await searchQuery;
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
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Email verification and signup methods
  async createSignupUser(userData: SignupUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
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

  async getDownline(userId: string, levels: number = 5): Promise<User[]> {
    const allMembers: User[] = [];
    const visited = new Set<string>();
    
    const getLevel = async (currentUserId: string, currentLevel: number): Promise<void> => {
      if (currentLevel > levels || visited.has(currentUserId)) return;
      visited.add(currentUserId);
      
      const directMembers = await db.select()
        .from(users)
        .where(eq(users.sponsorId, currentUserId));
      
      for (const member of directMembers) {
        if (!allMembers.find(m => m.id === member.id)) {
          allMembers.push(member);
          await getLevel(member.id, currentLevel + 1);
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

  // Pending recruits operations (simplified - recruiter handles own approvals)
  async createPendingRecruit(data: RecruitUser, recruiterId: string): Promise<PendingRecruit> {
    // Find the recruiter
    console.log('Looking for recruiter with ID:', recruiterId);
    const recruiter = await this.getUser(recruiterId);
    console.log('Recruiter found:', !!recruiter, recruiter?.email);
    if (!recruiter) {
      throw new Error(`Recruiter not found with ID: ${recruiterId}`);
    }

    // SIMPLIFIED: Recruiter is always the upline for their own recruits
    // This eliminates the need for founder approval - recruiter decides positions directly
    const uplineId = recruiterId;

    console.log('=== RECRUIT CREATION (SIMPLIFIED) ===');
    console.log('Recruiter:', recruiter.email);
    console.log('Upline (same as recruiter):', uplineId);

    // Recruiter handles their own position decisions
    const [pendingRecruit] = await db.insert(pendingRecruits).values({
      email: data.email,
      fullName: data.fullName,
      mobile: data.mobile,
      recruiterId,
      uplineId,
      status: 'awaiting_upline',
      uplineDecision: 'pending',
    }).returning();
    return pendingRecruit;
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
      dateOfBirth?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      panNumber?: string;
      aadhaarNumber?: string;
      bankAccountNumber?: string;
      bankIFSC?: string;
      bankName?: string;
      panCardUrl?: string;
      aadhaarCardUrl?: string;
      bankStatementUrl?: string;
      profileImageUrl?: string;
    },
    recruiterId: string,
    placementSide: string
  ): Promise<PendingRecruit> {
    const recruiter = await this.getUser(recruiterId);
    if (!recruiter) {
      throw new Error(`Recruiter not found with ID: ${recruiterId}`);
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create pending recruit with all comprehensive data
    const [pendingRecruit] = await db.insert(pendingRecruits).values({
      email: data.email,
      fullName: data.fullName,
      mobile: data.mobile,
      recruiterId,
      uplineId: recruiterId, // For simplified MLM structure
      packageAmount: data.packageAmount || '0.00',
      position: placementSide,
      status: 'awaiting_admin',
      uplineDecision: 'approved', // Auto-approve upline decision for full registrations
      // Store all the comprehensive registration data
      password: hashedPassword,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      panNumber: data.panNumber,
      aadhaarNumber: data.aadhaarNumber,
      bankAccountNumber: data.bankAccountNumber,
      bankIFSC: data.bankIFSC,
      bankName: data.bankName,
      panCardUrl: data.panCardUrl,
      aadhaarCardUrl: data.aadhaarCardUrl,
      bankStatementUrl: data.bankStatementUrl,
      profileImageUrl: data.profileImageUrl,
    }).returning();

    return pendingRecruit;
  }

  async getPendingRecruits(recruiterId?: string): Promise<PendingRecruit[]> {
    let query = db.select().from(pendingRecruits)
      .where(eq(pendingRecruits.status, 'awaiting_admin'))
      .orderBy(desc(pendingRecruits.createdAt));
    
    if (recruiterId) {
      query = query.where(and(
        eq(pendingRecruits.status, 'awaiting_admin'),
        eq(pendingRecruits.recruiterId, recruiterId)
      )) as typeof query;
    }
    
    return await query;
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
      updateData.status = 'awaiting_admin'; // Move to admin approval stage
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

  async approvePendingRecruit(id: string, adminData: { packageAmount: string; position?: string }): Promise<User> {
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

    // Check if upline has approved the position
    if (pendingRecruit.status !== 'awaiting_admin' || pendingRecruit.uplineDecision !== 'approved') {
      console.log('ERROR: Recruit not ready for admin approval');
      throw new Error('Recruit must be approved by upline first');
    }

    if (!pendingRecruit.position) {
      console.log('ERROR: No position set by upline');
      throw new Error('Position must be set by upline before admin approval');
    }

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

    // Use stored password if available (comprehensive registration), otherwise generate default
    const passwordToUse = pendingRecruit.password || await bcrypt.hash('defaultpass123', 10);
    
    const [newUser] = await db.insert(users).values({
      email: pendingRecruit.email,
      firstName,
      lastName,
      mobile: pendingRecruit.mobile,
      sponsorId: pendingRecruit.recruiterId,
      packageAmount: adminData.packageAmount,
      position: pendingRecruit.position, // Use position decided by upline
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

    // Place user in binary tree at the position decided by upline
    if (!pendingRecruit.uplineId) {
      throw new Error('Upline ID is required for position placement');
    }
    await this.placeUserInBinaryTreeAtSpecificPosition(newUser.id, pendingRecruit.uplineId, pendingRecruit.position as 'left' | 'right', pendingRecruit.recruiterId);

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

    // Send login credentials email
    try {
      const { sendLoginCredentialsEmail } = await import('./emailService');
      // If comprehensive registration, user already set their password, just send account activation
      const passwordForEmail = pendingRecruit.password ? 'Your chosen password' : 'defaultpass123';
      const emailSent = await sendLoginCredentialsEmail(newUser.email!, firstName, passwordForEmail);
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
    const treeData = await binaryTreeService.getBinaryTree(userId, 5);
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
      email: bu.email || '',
      password: '', // Not exposed
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
    const [kyc] = await db.insert(kycDocuments).values({
      userId,
      documentType: data.documentType,
      documentData: data.documentData,
      documentContentType: data.documentContentType,
      documentFilename: data.documentFilename,
      documentSize: data.documentSize,
      documentNumber: data.documentNumber,
      // Keep documentUrl null for new binary storage
      documentUrl: null,
    }).returning();
    
    // Update user KYC submission timestamp
    await db.update(users)
      .set({ kycSubmittedAt: new Date() })
      .where(eq(users.id, userId));
    
    return kyc;
  }

  async getKYCDocumentById(id: string): Promise<KYCDocument | null> {
    const [document] = await db.select().from(kycDocuments).where(eq(kycDocuments.id, id));
    return document || null;
  }

  async updateKYCDocument(id: string, data: any): Promise<KYCDocument> {
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

    const [updatedDoc] = await db.select().from(kycDocuments).where(eq(kycDocuments.id, id));
    return updatedDoc!;
  }

  async updateKYCStatus(id: string, status: any, rejectionReason?: string): Promise<boolean> {
    const updateData: any = { status, reviewedAt: new Date(), updatedAt: new Date() };
    if (rejectionReason) updateData.rejectionReason = rejectionReason;

    const result = await db
      .update(kycDocuments)
      .set(updateData)
      .where(eq(kycDocuments.id, id));

    // If approved, update user KYC status
    if (status === 'approved') {
      const [kyc] = await db.select().from(kycDocuments).where(eq(kycDocuments.id, id));
      if (kyc) {
        await db.update(users)
          .set({ kycStatus: 'approved', kycApprovedAt: new Date() })
          .where(eq(users.id, kyc.userId));
      }
    }

    return (result.rowCount ?? 0) > 0;
  }

  async getAllPendingKYC(): Promise<KYCDocument[]> {
    return await db.select().from(kycDocuments)
      .where(eq(kycDocuments.status, 'pending'))
      .orderBy(desc(kycDocuments.createdAt));
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
    const [updatedUser] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
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
}

export const storage = new DatabaseStorage();
