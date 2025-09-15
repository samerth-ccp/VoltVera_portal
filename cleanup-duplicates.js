import { DatabaseStorage } from './server/storage.ts';

async function cleanupDuplicates() {
  try {
    console.log('🧹 Starting KYC document cleanup...');
    const storage = new DatabaseStorage();
    await storage.cleanupDuplicateKYCDocuments();
    console.log('✅ Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
  process.exit(0);
}

cleanupDuplicates();
