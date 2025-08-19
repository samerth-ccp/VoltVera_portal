import { db } from "./db";
import { users } from "@shared/schema";
import { eq, isNull, or } from "drizzle-orm";

export interface BinaryTreeUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  sponsorId: string | null;
  parentId: string | null;
  leftChildId: string | null;
  rightChildId: string | null;
  position: string | null;
  level: string | null;
  packageAmount: string | null;
  registrationDate: Date | null;
  activationDate: Date | null;
  idStatus: string | null;
}

export class BinaryTreeService {
  /**
   * Find the next available position in the binary tree for placement
   * Uses "balanced spilling" - places new users to maintain tree balance
   */
  async findNextAvailablePosition(sponsorId: string): Promise<{ parentId: string; position: 'left' | 'right' }> {
    // Start with the sponsor as the potential parent
    const sponsor = await db.select().from(users).where(eq(users.id, sponsorId)).limit(1);
    
    if (!sponsor.length) {
      throw new Error("Sponsor not found");
    }

    // Check if sponsor has open positions
    const sponsorUser = sponsor[0];
    
    // If sponsor has no left child, place there
    if (!sponsorUser.leftChildId) {
      return { parentId: sponsorId, position: 'left' };
    }
    
    // If sponsor has no right child, place there
    if (!sponsorUser.rightChildId) {
      return { parentId: sponsorId, position: 'right' };
    }

    // Both positions under sponsor are filled, use spillover
    return await this.findSpilloverPosition(sponsorId);
  }

  /**
   * Find spillover position using breadth-first search for balance
   */
  private async findSpilloverPosition(sponsorId: string): Promise<{ parentId: string; position: 'left' | 'right' }> {
    const queue = [sponsorId];
    
    while (queue.length > 0) {
      const currentUserId = queue.shift()!;
      
      const currentUser = await db.select().from(users).where(eq(users.id, currentUserId)).limit(1);
      
      if (!currentUser.length) continue;
      
      const user = currentUser[0];
      
      // Check if current user has an open left position
      if (!user.leftChildId) {
        return { parentId: currentUserId, position: 'left' };
      }
      
      // Check if current user has an open right position
      if (!user.rightChildId) {
        return { parentId: currentUserId, position: 'right' };
      }
      
      // Add children to queue for next level check
      if (user.leftChildId) queue.push(user.leftChildId);
      if (user.rightChildId) queue.push(user.rightChildId);
    }
    
    // Fallback: place under sponsor as left child (should not happen in normal flow)
    return { parentId: sponsorId, position: 'left' };
  }

  /**
   * Place a user in the binary tree at the specified position
   */
  async placeUserInTree(userId: string, parentId: string, position: 'left' | 'right', sponsorId: string): Promise<void> {
    // Get parent level to calculate new user level
    const parentUser = await db.select().from(users).where(eq(users.id, parentId)).limit(1);
    
    if (!parentUser.length) {
      throw new Error("Parent user not found");
    }
    
    const parentLevel = parseInt(parentUser[0].level || '0');
    const userLevel = (parentLevel + 1).toString();
    
    // Update the new user with tree position
    await db.update(users)
      .set({
        sponsorId: sponsorId,
        parentId: parentId,
        position: position,
        level: userLevel,
      })
      .where(eq(users.id, userId));

    // Update parent's child reference
    if (position === 'left') {
      await db.update(users)
        .set({ leftChildId: userId })
        .where(eq(users.id, parentId));
    } else {
      await db.update(users)
        .set({ rightChildId: userId })
        .where(eq(users.id, parentId));
    }
  }

  /**
   * Get the binary tree structure starting from a user
   */
  async getBinaryTree(userId: string, depth: number = 3): Promise<BinaryTreeUser | null> {
    if (depth <= 0) return null;
    
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!userResult.length) return null;
    
    const user = userResult[0];
    
    const treeUser: BinaryTreeUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      sponsorId: user.sponsorId,
      parentId: user.parentId,
      leftChildId: user.leftChildId,
      rightChildId: user.rightChildId,
      position: user.position,
      level: user.level,
      packageAmount: user.packageAmount,
      registrationDate: user.registrationDate,
      activationDate: user.activationDate,
      idStatus: user.idStatus,
    };

    return treeUser;
  }

  /**
   * Get all team members under a sponsor (entire downline)
   */
  async getTeamMembers(sponsorId: string): Promise<BinaryTreeUser[]> {
    const downline = await this.getDownlineRecursive(sponsorId);
    return downline;
  }

  private async getDownlineRecursive(userId: string, visited = new Set<string>()): Promise<BinaryTreeUser[]> {
    if (visited.has(userId)) return [];
    visited.add(userId);

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user.length) return [];

    const currentUser = user[0];
    const result: BinaryTreeUser[] = [];

    // Add left child and its downline
    if (currentUser.leftChildId) {
      const leftChild = await this.getBinaryTree(currentUser.leftChildId);
      if (leftChild) {
        result.push(leftChild);
        const leftDownline = await this.getDownlineRecursive(currentUser.leftChildId, visited);
        result.push(...leftDownline);
      }
    }

    // Add right child and its downline
    if (currentUser.rightChildId) {
      const rightChild = await this.getBinaryTree(currentUser.rightChildId);
      if (rightChild) {
        result.push(rightChild);
        const rightDownline = await this.getDownlineRecursive(currentUser.rightChildId, visited);
        result.push(...rightDownline);
      }
    }

    return result;
  }

  /**
   * Get direct recruits only (left and right children)
   */
  async getDirectRecruits(userId: string): Promise<BinaryTreeUser[]> {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user.length) return [];

    const result: BinaryTreeUser[] = [];
    const currentUser = user[0];

    if (currentUser.leftChildId) {
      const leftChild = await this.getBinaryTree(currentUser.leftChildId);
      if (leftChild) result.push(leftChild);
    }

    if (currentUser.rightChildId) {
      const rightChild = await this.getBinaryTree(currentUser.rightChildId);
      if (rightChild) result.push(rightChild);
    }

    return result;
  }
}

export const binaryTreeService = new BinaryTreeService();