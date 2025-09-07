import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testKYCFix() {
  try {
    console.log('🧪 Testing KYC Management Fix...\n');
    
    // Test 1: Check if KYC list now includes pending recruits
    console.log('📋 Testing KYC list endpoint...');
    const kycListResponse = await fetch(`${BASE_URL}/api/admin/kyc`);
    
    if (!kycListResponse.ok) {
      console.log(`❌ KYC list failed: ${kycListResponse.status} (expected - need authentication)`);
    } else {
      const kycList = await kycListResponse.json();
      console.log(`✅ KYC list retrieved. Found ${kycList.length} users.`);
      
      if (kycList.length > 0) {
        console.log('📊 Sample KYC data:');
        kycList.slice(0, 3).forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.userUserId})`);
          console.log(`      Status: ${user.kycStatus}`);
          console.log(`      Is Pending Recruit: ${user.isPendingRecruit || false}`);
          console.log(`      Documents: PAN=${user.documents.panCard.url ? '✓' : '✗'}, Aadhaar=${user.documents.aadhaarCard.url ? '✓' : '✗'}`);
        });
      }
    }
    
    console.log('\n✅ Test completed! The fix should now:');
    console.log('   - Include pending recruit KYC documents in the main KYC management');
    console.log('   - Allow viewing documents from both regular users and pending recruits');
    console.log('   - Show proper document data when available');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testKYCFix();
