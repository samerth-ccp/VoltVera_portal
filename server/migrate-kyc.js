#!/usr/bin/env node

/**
 * KYC Migration Script
 * 
 * This script creates KYC profile records for existing users who don't have them.
 * Run this once to migrate existing users to the new KYC system.
 */

const { storage } = require('./storage');

async function migrateKYCForAllUsers() {
  try {
    console.log('🚀 Starting KYC migration for all existing users...');
    
    // Get all active users
    const users = await storage.getAllUsers();
    console.log(`📊 Found ${users.length} users to process`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        await storage.createKYCRecordsForExistingUser(user.id, user);
        processedCount++;
        console.log(`✅ Processed user ${user.userId} (${user.email})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing user ${user.userId}:`, error);
      }
    }
    
    console.log('\n🎉 KYC migration completed!');
    console.log(`📈 Results:`);
    console.log(`   - Processed: ${processedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Total: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Error during KYC migration:', error);
  }
}

// Run the migration
migrateKYCForAllUsers().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Migration script failed:', error);
  process.exit(1);
});
