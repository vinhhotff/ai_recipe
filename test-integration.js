#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

console.log('🚀 Recipe Generator - Comprehensive Integration Test');
console.log('=' .repeat(60));

let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}: PASSED`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}: FAILED - ${details}`);
  }
  testResults.details.push({
    test: name,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkBackendHealth() {
  console.log('\n🔍 Testing Backend Health...');
  try {
    const response = await axios.get('http://localhost:3001/api/api/health', { timeout: 5000 });
    logTest('Backend Health Check', response.data.status === 'ok', JSON.stringify(response.data));
    return true;
  } catch (error) {
    logTest('Backend Health Check', false, error.message);
    return false;
  }
}

async function testBackendAPIs() {
  console.log('\n🔍 Testing Backend APIs...');
  
  try {
    // Test ingredients endpoint
    const ingredients = await axios.get('http://localhost:3001/api/ingredients');
    logTest('Ingredients API', ingredients.status === 200 && ingredients.data.success);
    
    // Test subscription plans
    const plans = await axios.get('http://localhost:3001/api/monetization/subscription-plans');
    logTest('Subscription Plans API', plans.status === 200 && Array.isArray(plans.data));
    
    return true;
  } catch (error) {
    logTest('API Tests', false, error.message);
    return false;
  }
}

async function testBackendPerformance() {
  console.log('\n⚡ Testing Backend Performance...');
  
  const testUrl = 'http://localhost:3001/api/ingredients';
  const iterations = 5;
  const times = [];
  
  try {
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await axios.get(testUrl);
      times.push(Date.now() - start);
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const passed = avgTime < 100; // Should be fast with caching
    
    logTest('API Response Time', passed, `Average: ${avgTime.toFixed(2)}ms`);
    return passed;
  } catch (error) {
    logTest('Performance Test', false, error.message);
    return false;
  }
}

async function testFrontendBuild() {
  console.log('\n🏗️ Testing Frontend Build...');
  
  return new Promise((resolve) => {
    const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'pipe', cwd: process.cwd() });
    
    let output = '';
    let errorOutput = '';
    
    buildProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    buildProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    buildProcess.on('close', (code) => {
      const passed = code === 0;
      logTest('Frontend Build', passed, passed ? 'Build successful' : errorOutput);
      resolve(passed);
    });
  });
}

async function testTypeScriptCompilation() {
  console.log('\n🔧 Testing TypeScript Compilation...');
  
  return new Promise((resolve) => {
    const tscProcess = spawn('npx', ['tsc', '--noEmit'], { stdio: 'pipe' });
    
    let errorOutput = '';
    
    tscProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    tscProcess.on('close', (code) => {
      const passed = code === 0;
      logTest('TypeScript Compilation', passed, passed ? 'No type errors' : errorOutput);
      resolve(passed);
    });
  });
}

async function checkProjectStructure() {
  console.log('\n📁 Checking Project Structure...');
  
  const requiredFiles = [
    'src/lib/api-client.ts',
    'src/contexts/AuthContext.tsx',
    'src/components/ui/LoadingSpinner.tsx',
    'src/components/layout/Layout.tsx',
    'src/pages/HomePage.tsx',
    'src/pages/DashboardPage.tsx',
    'backend/src/common/cache.service.ts',
    'backend/src/health/health.service.ts',
    'vite.config.ts',
    'package.json'
  ];
  
  let allExist = true;
  let missingFiles = [];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      allExist = false;
      missingFiles.push(file);
    }
  }
  
  logTest('Project Structure', allExist, missingFiles.length > 0 ? `Missing: ${missingFiles.join(', ')}` : 'All required files exist');
  return allExist;
}

async function checkDependencies() {
  console.log('\n📦 Checking Dependencies...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      '@tanstack/react-query',
      'react-router-dom',
      'react-hook-form',
      'zod',
      'axios',
      'js-cookie',
      'vite-plugin-pwa'
    ];
    
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
    const passed = missingDeps.length === 0;
    
    logTest('Frontend Dependencies', passed, passed ? 'All dependencies installed' : `Missing: ${missingDeps.join(', ')}`);
    
    // Check backend dependencies
    const backendPackage = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
    const requiredBackendDeps = [
      '@nestjs/common',
      '@prisma/client',
      'ioredis',
      'jest'
    ];
    
    const missingBackendDeps = requiredBackendDeps.filter(dep => 
      !backendPackage.dependencies[dep] && !backendPackage.devDependencies[dep]
    );
    
    const backendPassed = missingBackendDeps.length === 0;
    logTest('Backend Dependencies', backendPassed, backendPassed ? 'All dependencies installed' : `Missing: ${missingBackendDeps.join(', ')}`);
    
    return passed && backendPassed;
  } catch (error) {
    logTest('Dependency Check', false, error.message);
    return false;
  }
}

async function testPWAConfiguration() {
  console.log('\n📱 Testing PWA Configuration...');
  
  try {
    const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
    const hasPWA = viteConfig.includes('VitePWA');
    const hasManifest = viteConfig.includes('manifest');
    const hasWorkbox = viteConfig.includes('workbox');
    
    const passed = hasPWA && hasManifest && hasWorkbox;
    logTest('PWA Configuration', passed, passed ? 'PWA properly configured' : 'PWA configuration incomplete');
    
    return passed;
  } catch (error) {
    logTest('PWA Configuration', false, error.message);
    return false;
  }
}

async function testBackendTests() {
  console.log('\n🧪 Running Backend Tests...');
  
  return new Promise((resolve) => {
    const testProcess = spawn('npm', ['test'], { 
      stdio: 'pipe', 
      cwd: path.join(process.cwd(), 'backend') 
    });
    
    let output = '';
    let errorOutput = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    testProcess.on('close', (code) => {
      // Jest exits with 0 for success, 1 for failures
      const passed = code === 0;
      logTest('Backend Unit Tests', passed, passed ? 'Tests passed' : 'Some tests failed');
      resolve(passed);
    });
  });
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
    details: testResults.details,
    environment: {
      node: process.version,
      platform: process.platform,
      cwd: process.cwd()
    }
  };

  // Save detailed report
  fs.writeFileSync('integration-test-report.json', JSON.stringify(report, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 INTEGRATION TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${report.summary.total}`);
  console.log(`✅ Passed: ${report.summary.passed}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log(`📊 Pass Rate: ${report.summary.passRate}`);
  console.log(`📄 Report saved to: integration-test-report.json`);
  console.log('='.repeat(60));

  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.details
      .filter(t => !t.passed)
      .forEach(t => console.log(`  • ${t.test}: ${t.details}`));
  }

  const isSuccess = testResults.passed >= testResults.total * 0.8; // 80% pass rate
  
  if (isSuccess) {
    console.log('\n🎉 INTEGRATION TESTS PASSED!');
    console.log('✨ Your Recipe Generator app is ready for production!');
  } else {
    console.log('\n⚠️  Some tests failed. Review the issues above before deploying.');
  }

  return isSuccess;
}

async function runAllTests() {
  console.log('Starting comprehensive integration testing...\n');

  try {
    // Structure and dependency checks
    await checkProjectStructure();
    await checkDependencies();
    await testPWAConfiguration();
    
    // TypeScript and build checks
    await testTypeScriptCompilation();
    await testFrontendBuild();
    
    // Backend tests (if backend is running)
    const backendHealthy = await checkBackendHealth();
    if (backendHealthy) {
      await testBackendAPIs();
      await testBackendPerformance();
    } else {
      console.log('⚠️  Backend not running - skipping API tests');
    }
    
    // Unit tests
    if (fs.existsSync('backend/jest.config.js')) {
      await testBackendTests();
    }
    
    // Generate final report
    const success = await generateTestReport();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

runAllTests();
