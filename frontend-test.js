#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Frontend Development Test & Build Script');
console.log('=' .repeat(50));

// Check if dependencies are installed
console.log('📦 Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    '@tanstack/react-query',
    'react-router-dom',
    'react-hook-form',
    'zod',
    'axios',
    'js-cookie'
  ];
  
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length > 0) {
    console.log('❌ Missing dependencies:', missingDeps.join(', '));
    process.exit(1);
  }
  
  console.log('✅ All required dependencies are installed');
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  process.exit(1);
}

// Check critical files exist
console.log('\n📁 Checking critical files...');
const criticalFiles = [
  'src/lib/api-client.ts',
  'src/contexts/AuthContext.tsx',
  'src/lib/utils.ts',
  'src/components/ui/LoadingSpinner.tsx'
];

const missingFiles = criticalFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.log('❌ Missing files:', missingFiles.join(', '));
} else {
  console.log('✅ All critical files exist');
}

// Check Vite configuration
console.log('\n⚙️ Checking Vite configuration...');
try {
  const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
  if (viteConfig.includes('@/')) {
    console.log('✅ Path alias (@/*) is configured');
  } else {
    console.log('⚠️ Path alias might not be configured properly');
  }
} catch (error) {
  console.log('⚠️ Could not read vite.config.ts');
}

// Test TypeScript compilation
console.log('\n🔧 Testing TypeScript compilation...');
const tscProcess = spawn('npx', ['tsc', '--noEmit'], { stdio: 'pipe' });

tscProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

tscProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

tscProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ TypeScript compilation successful');
    
    // Try to build the project
    console.log('\n🏗️ Testing production build...');
    const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
    
    buildProcess.on('close', (buildCode) => {
      if (buildCode === 0) {
        console.log('\n✅ Production build successful!');
        console.log('\n📊 Build Summary:');
        console.log('- TypeScript compilation: ✅');
        console.log('- Production build: ✅');
        console.log('- All dependencies: ✅');
        console.log('\n🚀 Frontend is ready for development and deployment!');
      } else {
        console.log('\n❌ Production build failed');
        process.exit(1);
      }
    });
  } else {
    console.log('❌ TypeScript compilation failed');
    console.log('\n🔧 Common fixes:');
    console.log('1. Check import paths use @/* alias');
    console.log('2. Ensure all TypeScript files have proper types');
    console.log('3. Run: npm run lint to check for issues');
    process.exit(1);
  }
});

// Environment check
console.log('\n🌍 Environment Configuration:');
console.log('- Node version:', process.version);
console.log('- Platform:', process.platform);

if (fs.existsSync('.env.local')) {
  console.log('- Environment file: ✅ .env.local found');
} else {
  console.log('- Environment file: ⚠️ .env.local not found');
  console.log('  Create .env.local with:');
  console.log('  VITE_API_URL=http://localhost:3001/api');
}
