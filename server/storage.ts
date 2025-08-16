import {
  users,
  type User,
  type UpsertUser,
  type CreateUser,
  type UpdateUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmailAndPassword(email: string, password: string): Promise<User | undefined>;
  
  // User management operations
  getAllUsers(search?: string): Promise<User[]>;
  createUser(user: CreateUser): Promise<User>;
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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmailAndPassword(email: string, password: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user && user.password === password) {
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
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        status: 'pending',
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
    const result = await db
      .update(users)
      .set({ 
        password: newPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
