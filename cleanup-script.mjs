import { DatabaseStorage } from './server/storage.ts';

async function runCleanup() {
  try {
    console.log('🧹 Starting cleanup...');
    const storage = new DatabaseStorage();
    
    // First cleanup duplicates
    await storage.cleanupDuplicateKYCDocuments();
    
    // Then fix KYC statuses
    await storage.fixExistingKYCStatuses();
    
    console.log('✅ All cleanup completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  process.exit(0);
}

runCleanup();
