import {
  users,
  emailTokens,
  pendingRecruits,
  type User,
  type UpsertUser,
  type CreateUser,
  type RecruitUser,
  type UpdateUser,
  type SignupUser,
  type EmailToken,
  type CreateToken,
  type PendingRecruit,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmailAndPassword(email: string, password: string): Promise<User | undefined>;
  
  // User management operations
  getAllUsers(search?: string): Promise<User[]>;
  createUser(user: CreateUser): Promise<User>;
  recruitUser(recruitData: RecruitUser, recruiterId: string): Promise<User>;
  updateUser(id: string, updates: UpdateUser): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    pendingUsers: number;
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
  rejectPendingRecruit(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmailAndPassword(email: string, password: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
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

  async createUser(userData: CreateUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword
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

  async getUserStats() {
    const allUsers = await db.select().from(users);
    
    return {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.status === 'active').length,
      adminUsers: allUsers.filter(u => u.role === 'admin').length,
      pendingUsers: allUsers.filter(u => u.status === 'pending').length,
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

  async getUserByToken(token: string): Promise<{ user: User; tokenType: string } | undefined> {
    const [tokenData] = await db
      .select()
      .from(emailTokens)
      .where(eq(emailTokens.token, token));
    
    if (!tokenData) return undefined;
    
    // Check if token is expired  
    if (tokenData.expiresAt < new Date()) {
      await this.deleteEmailToken(token);
      return undefined;
    }
    
    const user = await this.getUserByEmail(tokenData.email);
    if (!user) return undefined;
    
    return { user, tokenType: tokenData.type };
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

  // Pending recruits operations (upline decision workflow)
  async createPendingRecruit(data: RecruitUser, recruiterId: string): Promise<PendingRecruit> {
    // Find the upline (parent) of the recruiter
    const recruiter = await this.getUser(recruiterId);
    if (!recruiter) {
      throw new Error('Recruiter not found');
    }

    // Find the appropriate upline with available positions
    let uplineId = recruiterId; // Start with the recruiter themselves
    
    // Check if recruiter has available positions
    const recruiterAvailability = await this.getAvailablePositions(recruiterId);
    if (!recruiterAvailability.left && !recruiterAvailability.right) {
      // If recruiter is full, use their parent as upline
      uplineId = recruiter.parentId || recruiterId;
    }

    // Always require upline decision - no auto-assignment
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

  async getPendingRecruits(recruiterId?: string): Promise<PendingRecruit[]> {
    let query = db.select().from(pendingRecruits).orderBy(desc(pendingRecruits.createdAt));
    
    if (recruiterId) {
      query = query.where(eq(pendingRecruits.recruiterId, recruiterId)) as typeof query;
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
        
        // For position recommendations, use direct children only
        const leftDirectStats = upline?.leftChildId ? { count: 1, volume: parseFloat((await this.getUser(upline.leftChildId))?.packageAmount || '0') } : { count: 0, volume: 0 };
        const rightDirectStats = upline?.rightChildId ? { count: 1, volume: parseFloat((await this.getUser(upline.rightChildId))?.packageAmount || '0') } : { count: 0, volume: 0 };
        
        // Get available positions
        const availablePositions = await this.getAvailablePositions(uplineId);
        
        // Calculate strategic recommendations based on direct children
        const weakerLeg = leftDirectStats.count <= rightDirectStats.count ? 'left' : 'right';
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
            balanceRatio: leftDirectStats.count === 0 && rightDirectStats.count === 0 ? 1 : 
              Math.min(leftDirectStats.count, rightDirectStats.count) / Math.max(leftDirectStats.count, rightDirectStats.count, 1)
          },
          availablePositions,
          strategicRecommendation: {
            recommendedPosition: weakerLeg,
            reason: `Build the weaker ${weakerLeg} leg to balance your binary structure`,
            impactAnalysis: {
              leftChoice: `Left leg would have ${leftDirectStats.count + 1} direct child`,
              rightChoice: `Right leg would have ${rightDirectStats.count + 1} direct child`
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
  async uplineDecidePosition(pendingRecruitId: string, uplineId: string, decision: 'approved' | 'rejected', position?: 'left' | 'right'): Promise<void> {
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

  async approvePendingRecruit(id: string, adminData: { packageAmount: string }): Promise<User> {
    // Get the pending recruit
    const [pendingRecruit] = await db.select().from(pendingRecruits).where(eq(pendingRecruits.id, id));
    if (!pendingRecruit) {
      throw new Error('Pending recruit not found');
    }

    // Check if upline has approved the position
    if (pendingRecruit.status !== 'awaiting_admin' || pendingRecruit.uplineDecision !== 'approved') {
      throw new Error('Recruit must be approved by upline first');
    }

    if (!pendingRecruit.position) {
      throw new Error('Position must be set by upline before admin approval');
    }

    // Check if user already exists
    const existingUser = await this.getUserByEmail(pendingRecruit.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Create the user with approved data
    const names = pendingRecruit.fullName.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || '';

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
      password: await bcrypt.hash('defaultpass123', 10), // Generate default password
    }).returning();

    // Place user in binary tree at the position decided by upline
    if (!pendingRecruit.uplineId) {
      throw new Error('Upline ID is required for position placement');
    }
    await this.placeUserInBinaryTreeAtSpecificPosition(newUser.id, pendingRecruit.uplineId, pendingRecruit.position as 'left' | 'right', pendingRecruit.recruiterId);

    // Remove from pending recruits
    await db.delete(pendingRecruits).where(eq(pendingRecruits.id, id));

    return newUser;
  }

  async rejectPendingRecruit(id: string): Promise<boolean> {
    const result = await db.delete(pendingRecruits).where(eq(pendingRecruits.id, id));
    return result.rowCount > 0;
  }

  // Binary MLM Tree operations
  async getBinaryTreeData(userId: string): Promise<any> {
    // Import and use binary tree service
    const { binaryTreeService } = await import('./binaryTreeService');
    return await binaryTreeService.getBinaryTree(userId, 3);
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

  // Place user at specific position decided by upline
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

    // Check if desired position under upline is available
    if (desiredPosition === 'left' && uplineData.leftChildId) {
      throw new Error('Left position under upline is already occupied');
    }
    if (desiredPosition === 'right' && uplineData.rightChildId) {
      throw new Error('Right position under upline is already occupied');
    }

    // Place the user at the specific position under the upline
    await binaryTreeService.placeUserInTree(userId, uplineId, desiredPosition, sponsorId);
  }
}

export const storage = new DatabaseStorage();
