#!/usr/bin/env node

/**
 * Script to fix existing KYC statuses where users have mixed document statuses
 * This addresses the issue where users have re-uploaded documents but their
 * overall KYC status is still 'rejected'
 */

const { DatabaseStorage } = require('./server/storage.ts');

async function main() {
  console.log('🚀 Starting KYC status fix script...');
  
  try {
    const storage = new DatabaseStorage();
    
    // Run the fix
    await storage.fixExistingKYCStatuses();
    
    console.log('✅ KYC status fix completed successfully!');
    console.log('📝 Check the logs above for details on which users were fixed.');
    
  } catch (error) {
    console.error('❌ Error running KYC status fix:', error);
    process.exit(1);
  }
}

// Run the script
main();
