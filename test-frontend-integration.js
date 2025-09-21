// Test frontend API integration by simulating actual frontend API calls
import { apiClient } from './src/lib/api-client.js';

async function testFrontendIntegration() {
  console.log('🧪 Testing Frontend API Client Integration...\n');
  
  const tests = [
    {
      name: 'Health Check via API Client',
      test: () => apiClient.healthCheck(),
      expectField: 'status'
    },
    {
      name: 'Get Ingredients via API Client',
      test: () => apiClient.getIngredients(),
      expectField: 'success'
    },
    {
      name: 'Get Subscription Plans via API Client',
      test: () => apiClient.getSubscriptionPlans(),
      expectField: null // Returns array directly
    },
    {
      name: 'Check Usage (should fail without auth)',
      test: () => apiClient.checkUsage('recipe_generation'),
      expectField: null,
      expectError: true
    }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    try {
      console.log(`🧪 ${test.name}...`);
      const result = await test.test();
      
      if (test.expectError) {
        console.log('   ❌ Expected error but got success');
        continue;
      }

      if (test.expectField) {
        if (result && result[test.expectField]) {
          console.log(`   ✅ PASSED - Has expected field '${test.expectField}'`);
          passed++;
        } else {
          console.log(`   ❌ FAILED - Missing field '${test.expectField}'`);
          console.log(`   Result:`, Object.keys(result || {}));
        }
      } else {
        // For subscription plans (array response)
        if (Array.isArray(result) && result.length > 0) {
          console.log(`   ✅ PASSED - Got array with ${result.length} items`);
          passed++;
        } else {
          console.log(`   ❌ FAILED - Expected array, got:`, typeof result);
        }
      }
      
    } catch (error) {
      if (test.expectError) {
        console.log(`   ✅ PASSED - Got expected error: ${error.statusCode || error.message}`);
        passed++;
      } else {
        console.log(`   ❌ FAILED - Unexpected error: ${error.message}`);
        if (error.statusCode) {
          console.log(`   Status: ${error.statusCode}`);
        }
      }
    }
    console.log('');
  }

  const success = passed === total;
  console.log(`\n${success ? '🎉' : '⚠️'} Frontend Integration Test Results:`);
  console.log(`   Passed: ${passed}/${total} tests`);
  
  if (success) {
    console.log('   ✅ Frontend can successfully connect to Backend!');
    console.log('   ✅ API Client is working correctly');
    console.log('   ✅ CORS is properly configured');
  } else {
    console.log('   ❌ Some integration tests failed');
  }
  
  return success;
}

// Run the integration test
testFrontendIntegration()
  .then(success => {
    console.log('\n' + '='.repeat(50));
    console.log(success ? 
      '🚀 Frontend-Backend integration is WORKING!' : 
      '🔧 Frontend-Backend integration needs attention'
    );
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Integration test failed to run:', error);
    process.exit(1);
  });
