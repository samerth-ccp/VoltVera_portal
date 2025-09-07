import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function debugKYC() {
  try {
    console.log('🔍 Debugging KYC Database...\n');
    
    // Test the KYC list endpoint
    console.log('📋 Testing KYC list endpoint...');
    const response = await fetch(`${BASE_URL}/api/admin/kyc`);
    
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ KYC data received: Array(${data.length})`);
      console.log('📊 Sample data:', JSON.stringify(data.slice(0, 2), null, 2));
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}`);
    }
    
    // Test the debug endpoint
    console.log('\n🔍 Testing KYC debug endpoint...');
    const debugResponse = await fetch(`${BASE_URL}/api/admin/kyc/debug`);
    
    console.log(`Debug response status: ${debugResponse.status}`);
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('✅ Debug data received:');
      console.log(`   Total KYC Records: ${debugData.totalKYCRecords}`);
      console.log(`   Total Users: ${debugData.totalUsers}`);
      console.log(`   Users with KYC: ${debugData.usersWithKYC}`);
    } else {
      const errorText = await debugResponse.text();
      console.log(`❌ Debug error: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

debugKYC();
