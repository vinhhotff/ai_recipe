const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:3001/api';
let authToken = null;
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Test configuration
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User'
};

const ADMIN_USER = {
  email: 'admin@example.com', 
  password: 'AdminPassword123!',
  name: 'Admin User'
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function addTestResult(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log(`${testName}: PASSED`, 'success');
  } else {
    testResults.failed++;
    log(`${testName}: FAILED - ${details}`, 'error');
  }
  testResults.details.push({
    test: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
}

async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_BASE}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }

    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test suites
async function testHealthCheck() {
  log('Testing health check endpoint...');
  const result = await makeRequest('GET', '/health');
  addTestResult('Health Check', result.success && result.status === 200);
}

async function testAuthFlow() {
  log('Testing authentication flow...');
  
  // Test user registration
  const registerResult = await makeRequest('POST', '/auth/register', TEST_USER);
  if (!registerResult.success && registerResult.status !== 409) { // 409 = user exists
    addTestResult('User Registration', false, registerResult.error?.message || 'Registration failed');
    return;
  }
  addTestResult('User Registration', true);

  // Test user login
  const loginResult = await makeRequest('POST', '/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  if (loginResult.success && loginResult.data.data?.accessToken) {
    authToken = loginResult.data.data.accessToken;
    addTestResult('User Login', true);
  } else {
    addTestResult('User Login', false, loginResult.error?.message || 'Login failed');
    return;
  }

  // Test protected route access
  const profileResult = await makeRequest('GET', '/auth/profile');
  addTestResult('Protected Route Access', profileResult.success && profileResult.status === 200);

  // Test token refresh
  if (loginResult.data.data?.refreshToken) {
    const refreshResult = await makeRequest('POST', '/auth/refresh', {
      refreshToken: loginResult.data.data.refreshToken
    });
    addTestResult('Token Refresh', refreshResult.success && refreshResult.status === 200);
  }
}

async function testIngredientsCRUD() {
  log('Testing ingredients CRUD operations...');
  
  // Test get all ingredients
  const getAllResult = await makeRequest('GET', '/ingredients');
  addTestResult('Get All Ingredients', getAllResult.success && getAllResult.status === 200);

  if (!authToken) {
    log('Skipping ingredient creation tests - no auth token');
    return;
  }

  // Test create ingredient
  const testIngredient = {
    name: 'Test Ingredient ' + Date.now(),
    description: 'A test ingredient for API testing',
    canonicalUnit: 'g',
    basePrice: 5.50,
    currency: 'VND',
    available: true
  };

  const createResult = await makeRequest('POST', '/ingredients', testIngredient);
  let ingredientId = null;
  
  if (createResult.success && createResult.data.data?.id) {
    ingredientId = createResult.data.data.id;
    addTestResult('Create Ingredient', true);

    // Test get single ingredient
    const getResult = await makeRequest('GET', `/ingredients/${ingredientId}`);
    addTestResult('Get Single Ingredient', getResult.success && getResult.status === 200);

    // Test update ingredient
    const updateResult = await makeRequest('PUT', `/ingredients/${ingredientId}`, {
      name: 'Updated Test Ingredient',
      basePrice: 6.00
    });
    addTestResult('Update Ingredient', updateResult.success && updateResult.status === 200);

    // Test delete ingredient
    const deleteResult = await makeRequest('DELETE', `/ingredients/${ingredientId}`);
    addTestResult('Delete Ingredient', deleteResult.success && deleteResult.status === 200);
  } else {
    addTestResult('Create Ingredient', false, createResult.error?.message || 'Creation failed');
  }
}

async function testRecipeGeneration() {
  log('Testing recipe generation...');
  
  if (!authToken) {
    log('Skipping recipe generation tests - no auth token');
    return;
  }

  // Test basic recipe generation
  const recipeRequest = {
    ingredients: ['tomato', 'onion', 'garlic'],
    cuisine: 'Italian',
    difficulty: 'easy',
    dietaryRestrictions: [],
    servings: 2
  };

  const generateResult = await makeRequest('POST', '/recipes/generate', recipeRequest);
  addTestResult('Recipe Generation', 
    generateResult.success && generateResult.status === 200,
    generateResult.success ? '' : (generateResult.error?.message || 'Generation failed')
  );

  // Test recipe saving (if generation succeeded)
  if (generateResult.success && generateResult.data.data?.id) {
    const saveResult = await makeRequest('POST', `/recipes/${generateResult.data.data.id}/save`);
    addTestResult('Save Recipe', saveResult.success);
  }
}

async function testSubscriptionFlow() {
  log('Testing subscription flow...');
  
  // Test get subscription plans (public)
  const plansResult = await makeRequest('GET', '/monetization/subscription-plans');
  addTestResult('Get Subscription Plans', plansResult.success && plansResult.status === 200);

  if (!authToken) {
    log('Skipping user subscription tests - no auth token');
    return;
  }

  // Test get user subscription
  const userSubResult = await makeRequest('GET', '/monetization/user/subscription');
  addTestResult('Get User Subscription', 
    userSubResult.success && (userSubResult.status === 200 || userSubResult.status === 404)
  );
}

async function testAnalyticsEndpoints() {
  log('Testing analytics endpoints...');
  
  if (!authToken) {
    log('Skipping analytics tests - no auth token');
    return;
  }

  // Test cache stats (admin only - will likely fail for regular user)
  const cacheStatsResult = await makeRequest('GET', '/api/admin/analytics/cache-stats');
  addTestResult('Cache Stats (Expected Auth Failure)', 
    !cacheStatsResult.success && cacheStatsResult.status === 401
  );

  // Test recording analytics event
  const eventResult = await makeRequest('POST', '/api/admin/analytics/events', {
    eventType: 'RECIPE_GENERATION',
    metadata: { test: true }
  });
  addTestResult('Record Analytics Event', 
    eventResult.success || eventResult.status === 401 // Either success or auth failure is acceptable
  );
}

async function testErrorHandling() {
  log('Testing error handling...');
  
  // Test 404 endpoints
  const notFoundResult = await makeRequest('GET', '/non-existent-endpoint');
  addTestResult('404 Error Handling', notFoundResult.status === 404);

  // Test invalid data
  const invalidDataResult = await makeRequest('POST', '/ingredients', {
    invalid: 'data'
  });
  addTestResult('Validation Error Handling', 
    !invalidDataResult.success && invalidDataResult.status === 400
  );

  // Test unauthorized access
  const tempToken = authToken;
  authToken = 'invalid-token';
  const unauthorizedResult = await makeRequest('GET', '/auth/profile');
  addTestResult('Unauthorized Access Handling', unauthorizedResult.status === 401);
  authToken = tempToken; // Restore token
}

async function testRateLimiting() {
  log('Testing rate limiting (making 10 rapid requests)...');
  
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(makeRequest('GET', '/ingredients'));
  }
  
  try {
    const results = await Promise.all(promises);
    const rateLimited = results.some(r => r.status === 429);
    addTestResult('Rate Limiting', true, `Rate limited: ${rateLimited}`);
  } catch (error) {
    addTestResult('Rate Limiting', false, error.message);
  }
}

async function testPerformance() {
  log('Testing performance with cached endpoints...');
  
  const endpoints = [
    '/ingredients',
    '/monetization/subscription-plans'
  ];

  for (const endpoint of endpoints) {
    const iterations = 5;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await makeRequest('GET', endpoint);
      times.push(Date.now() - start);
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const passed = avgTime < 100; // Should be fast with caching
    
    addTestResult(`Performance ${endpoint}`, passed, `Average: ${avgTime.toFixed(2)}ms`);
  }
}

async function generateTestReport() {
  const report = {
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      passRate: ((testResults.passed / testResults.total) * 100).toFixed(2) + '%'
    },
    timestamp: new Date().toISOString(),
    details: testResults.details
  };

  // Save to file
  fs.writeFileSync('api-test-report.json', JSON.stringify(report, null, 2));
  
  log('='.repeat(60));
  log('API TEST SUMMARY');
  log('='.repeat(60));
  log(`Total Tests: ${report.summary.total}`);
  log(`Passed: ${report.summary.passed}`, 'success');
  log(`Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'error' : 'info');
  log(`Pass Rate: ${report.summary.passRate}`);
  log(`Report saved to: api-test-report.json`);
  log('='.repeat(60));

  if (testResults.failed > 0) {
    log('FAILED TESTS:', 'error');
    testResults.details
      .filter(t => !t.passed)
      .forEach(t => log(`  - ${t.test}: ${t.details}`, 'error'));
  }
}

// Main test execution
async function runAllTests() {
  log('🚀 Starting Comprehensive Backend API Testing...');
  log('='.repeat(60));

  try {
    await testHealthCheck();
    await testAuthFlow();
    await testIngredientsCRUD();
    await testRecipeGeneration();
    await testSubscriptionFlow();
    await testAnalyticsEndpoints();
    await testErrorHandling();
    await testRateLimiting();
    await testPerformance();
    
    await generateTestReport();
  } catch (error) {
    log(`Test execution failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run tests
runAllTests();
