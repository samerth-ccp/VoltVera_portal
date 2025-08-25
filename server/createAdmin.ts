import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { users } from "@shared/schema";
import bcrypt from "bcrypt";

async function createAdminUser() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    console.log("Creating admin user...");
    
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const adminUser = {
      id: "admin-demo",
      email: "admin@voltverashop.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "admin" as const,
      status: "active" as const,
      emailVerified: new Date(),
      registrationDate: new Date(),
      level: "0",
      packageAmount: "0.00",
      currentRank: "Executive" as const,
      totalBV: "0.00",
      leftBV: "0.00",
      rightBV: "0.00",
      totalDirects: 0,
      leftDirects: 0,
      rightDirects: 0,
      kycStatus: "pending" as const,
      firstLogin: true,
      position: "Left" as const,
      idStatus: "Inactive" as const,
    };
    
    await db.insert(users).values(adminUser).onConflictDoUpdate({
      target: users.id,
      set: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });
    
    console.log("✅ Admin user created successfully!");
    console.log("Email: admin@voltverashop.com");
    console.log("Password: admin123");
    
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdminUser();
}