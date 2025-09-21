const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

const testEndpoints = [
  { name: 'Ingredients', url: `${API_BASE}/ingredients` },
  { name: 'Subscription Plans', url: `${API_BASE}/monetization/subscription-plans` },
];

async function testCachePerformance() {
  console.log('🚀 Testing Redis Cache Performance...\n');

  for (const endpoint of testEndpoints) {
    console.log(`📊 Testing ${endpoint.name}:`);

    // First request - should hit database and populate cache
    const start1 = Date.now();
    try {
      const response1 = await axios.get(endpoint.url);
      const time1 = Date.now() - start1;
      console.log(`  First request (DB + Cache): ${time1}ms - Status: ${response1.status}`);
    } catch (error) {
      console.log(`  First request failed: ${error.response?.status || error.message}`);
      continue;
    }

    // Second request - should hit cache
    const start2 = Date.now();
    try {
      const response2 = await axios.get(endpoint.url);
      const time2 = Date.now() - start2;
      console.log(`  Second request (Cache): ${time2}ms - Status: ${response2.status}`);
    } catch (error) {
      console.log(`  Second request failed: ${error.response?.status || error.message}`);
      continue;
    }

    // Third request - should also hit cache
    const start3 = Date.now();
    try {
      const response3 = await axios.get(endpoint.url);
      const time3 = Date.now() - start3;
      console.log(`  Third request (Cache): ${time3}ms - Status: ${response3.status}`);
    } catch (error) {
      console.log(`  Third request failed: ${error.response?.status || error.message}`);
    }

    console.log();
  }

  // Test cache statistics if available
  try {
    console.log('📈 Cache Statistics:');
    const cacheStats = await axios.get(`${API_BASE}/analytics/admin/cache-stats`);
    console.log('  Cache is enabled:', cacheStats.data?.data?.enabled || 'unknown');
  } catch (error) {
    console.log('  Cache stats not available');
  }

  console.log('\n✅ Performance test completed!');
}

// Add some concurrent request testing
async function testConcurrentRequests() {
  console.log('\n🔄 Testing Concurrent Cache Performance...');
  
  const promises = [];
  const testUrl = `${API_BASE}/ingredients`;
  
  // Send 10 concurrent requests
  for (let i = 0; i < 10; i++) {
    promises.push(axios.get(testUrl));
  }
  
  const start = Date.now();
  try {
    const results = await Promise.all(promises);
    const totalTime = Date.now() - start;
    
    console.log(`  10 concurrent requests completed in ${totalTime}ms`);
    console.log(`  Average per request: ${(totalTime / 10).toFixed(2)}ms`);
    console.log(`  All successful: ${results.every(r => r.status === 200)}`);
  } catch (error) {
    console.log(`  Concurrent test failed: ${error.message}`);
  }
}

async function runTests() {
  try {
    await testCachePerformance();
    await testConcurrentRequests();
  } catch (error) {
    console.error('Test error:', error.message);
    process.exit(1);
  }
}

runTests();
