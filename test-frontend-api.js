import axios from 'axios';

// Test API connectivity from frontend perspective
async function testFrontendAPI() {
  console.log('Testing Frontend → Backend API Connectivity...\n');
  
  const baseURL = 'http://localhost:3001/api';
  const client = axios.create({
    baseURL,
    timeout: 5000,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000',
    },
  });

  const tests = [
    {
      name: 'Health Check',
      method: 'GET',
      url: '/api/health',
      expected: 'ok'
    },
    {
      name: 'Get Subscription Plans',
      method: 'GET', 
      url: '/monetization/subscription-plans',
      expected: 'success'
    },
    {
      name: 'Get Ingredients',
      method: 'GET',
      url: '/ingredients',
      expected: 'success'
    }
  ];

  let allPassed = true;

  for (const test of tests) {
    try {
      console.log(`🧪 Testing: ${test.name}`);
      console.log(`   ${test.method} ${baseURL}${test.url}`);
      
      const response = await client.request({
        method: test.method,
        url: test.url
      });

      const statusOk = response.status >= 200 && response.status < 300;
      let hasExpectedField = false;
      
      if (test.expected === 'ok') {
        hasExpectedField = response.data.status === 'ok';
      } else if (test.name === 'Get Subscription Plans') {
        // Subscription plans endpoint returns array directly (different format)
        hasExpectedField = Array.isArray(response.data) && response.data.length > 0;
      } else {
        hasExpectedField = response.data.success === true;
      }

      if (statusOk && hasExpectedField) {
        console.log(`   ✅ PASSED (${response.status})`);
      } else {
        console.log(`   ❌ FAILED - Status: ${response.status}`);
        console.log(`   Expected field check failed. Response format:`, 
          typeof response.data === 'object' ? Object.keys(response.data) : typeof response.data);
        allPassed = false;
      }
      
      // Log CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
        'Access-Control-Allow-Credentials': response.headers['access-control-allow-credentials']
      };
      console.log(`   CORS: ${JSON.stringify(corsHeaders)}`);
      
    } catch (error) {
      console.log(`   ❌ FAILED - ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data:`, error.response.data);
      }
      allPassed = false;
    }
    console.log('');
  }

  console.log(allPassed ? 
    '🎉 All API tests PASSED - Frontend can connect to Backend!' : 
    '⚠️  Some API tests FAILED - Check configuration'
  );
  
  return allPassed;
}

// Run tests
testFrontendAPI()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Test runner failed:', err);
    process.exit(1);
  });
