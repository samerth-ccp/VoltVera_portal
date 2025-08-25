import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  pgEnum,
  boolean,
  decimal,
  integer,
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

// Rank enum for MLM progression
export const rankEnum = pgEnum('rank', ['Executive', 'Bronze Star', 'Gold Star', 'Emerald Star', 'Ruby Star', 'Diamond', 'Wise President', 'President', 'Ambassador', 'Deputy Director', 'Director', 'Founder']);

// Transaction type enum
export const transactionTypeEnum = pgEnum('transaction_type', ['sponsor_income', 'sales_incentive', 'sales_bonus', 'consistency_bonus', 'franchise_income', 'car_fund', 'travel_fund', 'leadership_fund', 'house_fund', 'millionaire_club', 'royalty_income', 'withdrawal', 'purchase', 'admin_credit', 'admin_debit']);

// KYC status enum
export const kycStatusEnum = pgEnum('kyc_status', ['pending', 'approved', 'rejected']);

// Purchase type enum  
export const purchaseTypeEnum = pgEnum('purchase_type', ['first_purchase', 'second_purchase']);

// Franchise type enum
export const franchiseTypeEnum = pgEnum('franchise_type', ['Mini Franchise', 'Basic Franchise', 'Smart Franchise', 'Growth Franchise', 'Master Franchise', 'Super Franchise']);

// Ticket status enum
export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'resolved', 'closed']);

// Ticket category enum
export const ticketCategoryEnum = pgEnum('ticket_category', ['Payment', 'Product', 'ID', 'Technical', 'General']);

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
  packageAmount: decimal("package_amount", { precision: 10, scale: 2 }).default('0.00'),
  registrationDate: timestamp("registration_date").defaultNow(),
  activationDate: timestamp("activation_date"),
  idStatus: varchar("id_status").default('Inactive'),
  mobile: varchar("mobile"),
  
  // Enhanced Profile Fields
  panNumber: varchar("pan_number"),
  aadhaarNumber: varchar("aadhaar_number"),
  bankAccountNumber: varchar("bank_account_number"),
  bankIFSC: varchar("bank_ifsc"),
  bankName: varchar("bank_name"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  pincode: varchar("pincode"),
  dateOfBirth: timestamp("date_of_birth"),
  
  // MLM Business Fields
  currentRank: rankEnum("current_rank").default('Executive'),
  totalBV: decimal("total_bv", { precision: 12, scale: 2 }).default('0.00'),
  leftBV: decimal("left_bv", { precision: 12, scale: 2 }).default('0.00'),
  rightBV: decimal("right_bv", { precision: 12, scale: 2 }).default('0.00'),
  totalDirects: integer("total_directs").default(0),
  leftDirects: integer("left_directs").default(0),
  rightDirects: integer("right_directs").default(0),
  
  // KYC Status
  kycStatus: kycStatusEnum("kyc_status").default('pending'),
  kycSubmittedAt: timestamp("kyc_submitted_at"),
  kycApprovedAt: timestamp("kyc_approved_at"),
  
  // Password change tracking
  firstLogin: boolean("first_login").default(true),
  passwordChangedAt: timestamp("password_changed_at"),
  
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

// Pending recruits table for upline position decision workflow
export const pendingRecruits = pgTable("pending_recruits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  fullName: varchar("full_name").notNull(),
  mobile: varchar("mobile"),
  recruiterId: varchar("recruiter_id").notNull(),
  uplineId: varchar("upline_id"), // Parent of the recruiter who decides position
  packageAmount: varchar("package_amount").default('0.00'),
  position: varchar("position"), // Will be set by upline decision
  uplineDecision: varchar("upline_decision").default('pending'), // 'pending', 'approved', 'rejected'
  uplineDecisionAt: timestamp("upline_decision_at"),
  status: varchar("status").default('awaiting_upline'), // 'awaiting_upline', 'awaiting_admin', 'approved', 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  rejectionReason: varchar("rejection_reason"), // Why it was rejected
  rejectedBy: varchar("rejected_by"), // User ID who rejected it
  rejectedAt: timestamp("rejected_at"), // When it was rejected
});

// Notifications table for tracking system events
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Who receives the notification
  type: varchar("type").notNull(), // 'recruit_rejected', 'recruit_approved', 'position_decided', etc.
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // Additional data (recruit info, etc.)
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products table for MLM business
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  bv: decimal("bv", { precision: 10, scale: 2 }).notNull(), // Business Volume
  gst: decimal("gst", { precision: 5, scale: 2 }).notNull(), // GST percentage
  category: varchar("category").notNull(), // 'water_purifier', 'led', 'fan', etc.
  purchaseType: purchaseTypeEnum("purchase_type").notNull(),
  imageUrl: varchar("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User purchases table
export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").default(1),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  totalBV: decimal("total_bv", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method"),
  paymentStatus: varchar("payment_status").default('pending'),
  transactionId: varchar("transaction_id"),
  deliveryAddress: text("delivery_address"),
  deliveryStatus: varchar("delivery_status").default('pending'),
  trackingId: varchar("tracking_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet balances table
export const walletBalances = pgTable("wallet_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  balance: decimal("balance", { precision: 12, scale: 2 }).default('0.00'),
  totalEarnings: decimal("total_earnings", { precision: 12, scale: 2 }).default('0.00'),
  totalWithdrawals: decimal("total_withdrawals", { precision: 12, scale: 2 }).default('0.00'),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transactions table for all financial activities
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  referenceId: varchar("reference_id"), // Purchase ID, User ID who generated the income, etc.
  balanceBefore: decimal("balance_before", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),
  metadata: jsonb("metadata"), // Additional transaction data
  createdAt: timestamp("created_at").defaultNow(),
});

// Withdrawal requests table
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  withdrawalType: varchar("withdrawal_type").notNull().default('bank'), // 'bank', 'usdt'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default('pending'), // 'pending', 'approved', 'rejected', 'processed'
  bankDetails: jsonb("bank_details"), // Now optional for USDT withdrawals
  usdtWalletAddress: varchar("usdt_wallet_address"), // For USDT withdrawals
  networkType: varchar("network_type"), // 'TRC20', 'ERC20', 'BEP20' for USDT
  adminNotes: text("admin_notes"),
  processedBy: varchar("processed_by"),
  processedAt: timestamp("processed_at"),
  transactionId: varchar("transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// KYC documents table
export const kycDocuments = pgTable("kyc_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  documentType: varchar("document_type").notNull(), // 'pan', 'aadhaar', 'bank_statement', 'photo'
  documentUrl: varchar("document_url").notNull(),
  documentNumber: varchar("document_number"),
  status: kycStatusEnum("status").default('pending'),
  rejectionReason: text("rejection_reason"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rank achievements table
export const rankAchievements = pgTable("rank_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  rank: rankEnum("rank").notNull(),
  achievedAt: timestamp("achieved_at").defaultNow(),
  teamBV: decimal("team_bv", { precision: 12, scale: 2 }).notNull(),
  leftBV: decimal("left_bv", { precision: 12, scale: 2 }).notNull(),
  rightBV: decimal("right_bv", { precision: 12, scale: 2 }).notNull(),
  bonus: decimal("bonus", { precision: 10, scale: 2 }).default('0.00'),
  metadata: jsonb("metadata"), // Additional achievement data
});

// Franchise requests table
export const franchiseRequests = pgTable("franchise_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  franchiseType: franchiseTypeEnum("franchise_type").notNull(),
  investmentAmount: decimal("investment_amount", { precision: 10, scale: 2 }).notNull(),
  businessVolume: decimal("business_volume", { precision: 10, scale: 2 }).notNull(),
  sponsorIncome: decimal("sponsor_income", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default('pending'), // 'pending', 'approved', 'rejected'
  businessPlan: text("business_plan"),
  adminNotes: text("admin_notes"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Support tickets table
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  category: ticketCategoryEnum("category").notNull(),
  subject: varchar("subject").notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").default('open'),
  priority: varchar("priority").default('medium'), // 'low', 'medium', 'high', 'urgent'
  assignedTo: varchar("assigned_to"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Achievers table for tracking top performers
export const achievers = pgTable("achievers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  achievementType: varchar("achievement_type").notNull(), // 'top_earner', 'rank_achiever', 'bonanza_winner'
  position: integer("position").notNull(), // 1st, 2nd, 3rd, etc.
  amount: decimal("amount", { precision: 10, scale: 2 }),
  period: varchar("period").notNull(), // 'monthly', 'quarterly', 'yearly'
  periodDate: timestamp("period_date").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cheques table
export const cheques = pgTable("cheques", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  chequeNumber: varchar("cheque_number").notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  bankName: varchar("bank_name").notNull(),
  issuedDate: timestamp("issued_date").notNull(),
  clearanceDate: timestamp("clearance_date"),
  status: varchar("status").default('issued'), // 'issued', 'cleared', 'bounced', 'cancelled'
  purpose: text("purpose"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// News and announcements table
export const news = pgTable("news", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  type: varchar("type").default('announcement'), // 'announcement', 'promotion', 'update', 'warning'
  priority: varchar("priority").default('normal'), // 'low', 'normal', 'high', 'urgent'
  isActive: boolean("is_active").default(true),
  publishedAt: timestamp("published_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by").notNull(),
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
  firstName: true,
  lastName: true,
  role: true,
  sponsorId: true,
}).extend({
  // Password is optional for admin-created users (auto-generated)
  password: z.string().optional(),
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

// Schema for rejecting recruits with reason
export const rejectRecruitSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

// Schema for notifications
export const createNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  message: true,
  data: true,
});

// Schema for products
export const createProductSchema = createInsertSchema(products).pick({
  name: true,
  description: true,
  price: true,
  bv: true,
  gst: true,
  category: true,
  purchaseType: true,
  imageUrl: true,
}).extend({
  name: z.string().min(1, "Product name is required"),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Valid price is required"),
  bv: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Valid BV is required"),
  gst: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Valid GST is required"),
});

// Schema for purchases
export const createPurchaseSchema = createInsertSchema(purchases).pick({
  productId: true,
  quantity: true,
  paymentMethod: true,
  deliveryAddress: true,
}).extend({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  deliveryAddress: z.string().min(10, "Complete delivery address is required"),
});

// Schema for withdrawal requests
export const createWithdrawalSchema = z.object({
  withdrawalType: z.enum(['bank', 'usdt'], { required_error: "Withdrawal type is required" }),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Valid amount is required"),
  // Bank details (required for bank withdrawals)
  bankDetails: z.object({
    accountNumber: z.string().min(1, "Account number is required"),
    ifscCode: z.string().min(1, "IFSC code is required"),
    bankName: z.string().min(1, "Bank name is required"),
    accountHolderName: z.string().min(1, "Account holder name is required"),
  }).optional(),
  // USDT details (required for USDT withdrawals)
  usdtWalletAddress: z.string().optional(),
  networkType: z.enum(['TRC20', 'ERC20', 'BEP20']).optional(),
}).refine((data) => {
  if (data.withdrawalType === 'bank') {
    return data.bankDetails !== undefined;
  }
  if (data.withdrawalType === 'usdt') {
    return data.usdtWalletAddress && data.networkType;
  }
  return false;
}, {
  message: "Please provide required details based on withdrawal type",
  path: ["withdrawalType"]
});

// Schema for KYC document upload
export const createKYCSchema = createInsertSchema(kycDocuments).pick({
  documentType: true,
  documentUrl: true,
  documentNumber: true,
}).extend({
  documentType: z.enum(['pan', 'aadhaar', 'bank_statement', 'photo']),
  documentUrl: z.string().url("Valid document URL is required"),
  documentNumber: z.string().optional(),
});

// Schema for franchise requests
export const createFranchiseRequestSchema = createInsertSchema(franchiseRequests).pick({
  franchiseType: true,
  businessPlan: true,
}).extend({
  businessPlan: z.string().min(50, "Business plan must be at least 50 characters"),
});

// Schema for support tickets
export const createSupportTicketSchema = createInsertSchema(supportTickets).pick({
  category: true,
  subject: true,
  description: true,
  priority: true,
}).extend({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

// Schema for news/announcements
export const createNewsSchema = createInsertSchema(news).pick({
  title: true,
  content: true,
  type: true,
  priority: true,
  publishedAt: true,
  expiresAt: true,
}).extend({
  title: z.string().min(5, "Title must be at least 5 characters"),
  content: z.string().min(20, "Content must be at least 20 characters"),
  type: z.enum(['announcement', 'promotion', 'update', 'warning']).default('announcement'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

// Schema for enhanced user profile update
export const updateUserProfileSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  mobile: true,
  panNumber: true,
  aadhaarNumber: true,
  bankAccountNumber: true,
  bankIFSC: true,
  bankName: true,
  address: true,
  city: true,
  state: true,
  pincode: true,
  dateOfBirth: true,
}).extend({
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Valid 10-digit mobile number is required").optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Valid PAN number is required (e.g. ABCDE1234F)").optional(),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Valid 12-digit Aadhaar number is required").optional(),
  pincode: z.string().regex(/^\d{6}$/, "Valid 6-digit pincode is required").optional(),
}).partial();

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

// Type exports
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type RecruitUser = z.infer<typeof recruitUserSchema>;
export type SignupUser = z.infer<typeof signupUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type CreateToken = z.infer<typeof createTokenSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;
export type CreateProduct = z.infer<typeof createProductSchema>;
export type CreatePurchase = z.infer<typeof createPurchaseSchema>;
export type CreateWithdrawal = z.infer<typeof createWithdrawalSchema>;
export type CreateKYC = z.infer<typeof createKYCSchema>;
export type CreateFranchiseRequest = z.infer<typeof createFranchiseRequestSchema>;
export type CreateSupportTicket = z.infer<typeof createSupportTicketSchema>;
export type CreateNews = z.infer<typeof createNewsSchema>;

// Table select types
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type WalletBalance = typeof walletBalances.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type KYCDocument = typeof kycDocuments.$inferSelect;
export type RankAchievement = typeof rankAchievements.$inferSelect;
export type FranchiseRequest = typeof franchiseRequests.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type Achiever = typeof achievers.$inferSelect;
export type Cheque = typeof cheques.$inferSelect;
export type News = typeof news.$inferSelect;
export type PendingRecruit = typeof pendingRecruits.$inferSelect;
export type EmailToken = typeof emailTokens.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

// Enum types
export type UserRole = typeof users.$inferSelect.role;
export type UserStatus = typeof users.$inferSelect.status;
export type Rank = typeof users.$inferSelect.currentRank;
export type TransactionType = typeof transactions.$inferSelect.type;
export type KYCStatus = typeof kycDocuments.$inferSelect.status;
export type PurchaseType = typeof products.$inferSelect.purchaseType;
export type FranchiseType = typeof franchiseRequests.$inferSelect.franchiseType;
export type TicketStatus = typeof supportTickets.$inferSelect.status;
export type TicketCategory = typeof supportTickets.$inferSelect.category;
