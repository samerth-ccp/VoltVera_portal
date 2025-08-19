import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);

// User status enum
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending']);

// User storage table with Binary MLM structure
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default('user').notNull(),
  status: userStatusEnum("status").default('pending').notNull(), // Default to pending for email verification
  emailVerified: timestamp("email_verified"),
  lastActiveAt: timestamp("last_active_at"),
  
  // Binary MLM Structure
  sponsorId: varchar("sponsor_id"), // Person who recruited them (referrer)
  parentId: varchar("parent_id"),   // Direct parent in binary tree (may differ due to spillover)
  leftChildId: varchar("left_child_id"),
  rightChildId: varchar("right_child_id"),
  position: varchar("position"), // 'left' or 'right' position under parent
  level: varchar("level").default('0'), // Depth in the binary tree
  
  // Team Management Fields
  packageAmount: varchar("package_amount").default('0.00'),
  registrationDate: timestamp("registration_date").defaultNow(),
  activationDate: timestamp("activation_date"),
  idStatus: varchar("id_status").default('Inactive'),
  mobile: varchar("mobile"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email verification and password reset tokens
export const emailTokens = pgTable("email_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  type: varchar("type").notNull(), // 'signup' or 'password_reset'
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pending recruits table for admin processing workflow
export const pendingRecruits = pgTable("pending_recruits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  fullName: varchar("full_name").notNull(),
  mobile: varchar("mobile"),
  recruiterId: varchar("recruiter_id").notNull(),
  packageAmount: varchar("package_amount").default('0.00'),
  position: varchar("position").default('Left'),
  status: varchar("status").default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema for upserting users (used by Replit Auth)
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

// Schema for team recruitment (user submits basic info to pending_recruits)
export const recruitUserSchema = createInsertSchema(pendingRecruits).pick({
  email: true,
  fullName: true,
  mobile: true,
}).extend({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  mobile: z.string().optional(),
});

// Schema for creating user invitations (admin function) - no password field
export const createUserInvitationSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  packageAmount: true,
  position: true,
  mobile: true,
}).extend({
  fullName: z.string().min(1, "Full name is required"),
}).transform(data => ({
  email: data.email,
  firstName: data.fullName.split(' ')[0],
  lastName: data.fullName.split(' ').slice(1).join(' ') || '',
  role: data.role,
}));

// Schema for creating users with password (admin function)
export const createUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  role: true,
  sponsorId: true,
});

// Keep only the first recruitUserSchema definition above

// Schema for completing user invitation (user sets password)
export const completeInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Schema for user signup (email verification required)
export const signupUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
}).extend({
  fullName: z.string().min(1, "Full name is required"),
}).transform(data => ({
  email: data.email,
  password: data.password,
  firstName: data.fullName.split(' ')[0],
  lastName: data.fullName.split(' ').slice(1).join(' ') || '',
}));

// Schema for email token operations
export const createTokenSchema = createInsertSchema(emailTokens).pick({
  email: true,
  token: true,
  type: true,
  expiresAt: true,
});

// Schema for password reset
export const passwordResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

// Schema for updating users
export const updateUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  emailVerified: true,
  lastActiveAt: true,
}).partial();

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type RecruitUser = z.infer<typeof recruitUserSchema>;
export type SignupUser = z.infer<typeof signupUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type CreateToken = z.infer<typeof createTokenSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;
export type User = typeof users.$inferSelect;
export type PendingRecruit = typeof pendingRecruits.$inferSelect;
export type EmailToken = typeof emailTokens.$inferSelect;
export type UserRole = typeof users.$inferSelect.role;
export type UserStatus = typeof users.$inferSelect.status;
