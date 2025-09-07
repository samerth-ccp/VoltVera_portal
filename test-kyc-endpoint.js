import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testKYCEndpoint() {
  try {
    console.log('🔐 Logging in as admin...');
    
    // Login first
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@voltverashop.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    // Get session cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    const sessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : '';
    
    console.log('✅ Login successful');
    
    // Test KYC list endpoint
    console.log('\n📋 Testing KYC list endpoint...');
    const kycListResponse = await fetch(`${BASE_URL}/api/admin/kyc`, {
      headers: { 'Cookie': sessionCookie }
    });
    
    if (!kycListResponse.ok) {
      throw new Error(`KYC list failed: ${kycListResponse.status}`);
    }
    
    const kycList = await kycListResponse.json();
    console.log(`✅ KYC list retrieved. Found ${kycList.length} users.`);
    
    if (kycList.length > 0) {
      const firstUser = kycList[0];
      console.log(`\n📄 Testing KYC documents endpoint for user: ${firstUser.userId}`);
      
      // Test KYC documents endpoint
      const documentsResponse = await fetch(`${BASE_URL}/api/admin/kyc/${firstUser.userId}/documents`, {
        headers: { 'Cookie': sessionCookie }
      });
      
      if (!documentsResponse.ok) {
        const errorText = await documentsResponse.text();
        console.error(`❌ KYC documents failed: ${documentsResponse.status}`);
        console.error(`Error: ${errorText}`);
        return;
      }
      
      const documents = await documentsResponse.json();
      console.log(`✅ KYC documents retrieved successfully! Found ${documents.length} documents.`);
      
      documents.forEach((doc, index) => {
        console.log(`   Document ${index + 1}: ${doc.documentType} (${doc.status})`);
      });
    }
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testKYCEndpoint();
