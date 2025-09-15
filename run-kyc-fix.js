import { DatabaseStorage } from './server/storage.ts';

async function runFix() {
  try {
    console.log('🚀 Running KYC status fix...');
    const storage = new DatabaseStorage();
    await storage.fixExistingKYCStatuses();
    console.log('✅ Fix completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  process.exit(0);
}

runFix();
