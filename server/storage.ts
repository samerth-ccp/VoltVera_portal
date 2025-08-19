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
import { eq, ilike, or, desc } from "drizzle-orm";
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
        referredBy: recruiterId,
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
      .where(eq(users.referredBy, userId))
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
        .where(eq(users.referredBy, currentUserId));
      
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

  // Pending recruits operations (new workflow)
  async createPendingRecruit(data: RecruitUser, recruiterId: string): Promise<PendingRecruit> {
    const [pendingRecruit] = await db.insert(pendingRecruits).values({
      email: data.email,
      fullName: data.fullName,
      mobile: data.mobile,
      recruiterId,
      status: 'pending',
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

  async approvePendingRecruit(id: string, adminData: { packageAmount: string; position: string }): Promise<User> {
    // Get the pending recruit
    const [pendingRecruit] = await db.select().from(pendingRecruits).where(eq(pendingRecruits.id, id));
    if (!pendingRecruit) {
      throw new Error('Pending recruit not found');
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
      referredBy: pendingRecruit.recruiterId,
      packageAmount: adminData.packageAmount,
      position: adminData.position,
      registrationDate: pendingRecruit.createdAt,
      activationDate: new Date(),
      idStatus: 'Active',
      role: 'user',
      status: 'active',
      password: await bcrypt.hash('defaultpass123', 10), // Generate default password
    }).returning();

    // Remove from pending recruits
    await db.delete(pendingRecruits).where(eq(pendingRecruits.id, id));

    return newUser;
  }

  async rejectPendingRecruit(id: string): Promise<boolean> {
    const result = await db.delete(pendingRecruits).where(eq(pendingRecruits.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
