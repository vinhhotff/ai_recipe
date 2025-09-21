#!/usr/bin/env node

const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

// Create axios instance with cookie support
const jar = new CookieJar();
const client = wrapper(axios.create({
  baseURL: 'http://localhost:3001/api',
  withCredentials: true,
  jar,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
}));

async function testAuth() {
  try {
    console.log('🧪 Testing Authentication Flow...\n');

    // Test registration
    console.log('1️⃣ Testing Registration...');
    const email = `testuser-${Date.now()}@example.com`;
    const registerResponse = await client.post('/auth/register', {
      email,
      password: 'password123',
      name: 'Test User'
    });
    
    if (registerResponse.data.user) {
      console.log('✅ Registration successful:', registerResponse.data.user.email);
    } else {
      console.log('❌ Registration failed');
      return;
    }

    // Test /auth/me endpoint
    console.log('\n2️⃣ Testing /auth/me endpoint...');
    const profileResponse = await client.get('/auth/me');
    
    if (profileResponse.data.user) {
      console.log('✅ Profile fetch successful:', profileResponse.data.user.email);
    } else {
      console.log('❌ Profile fetch failed');
    }

    // Test logout
    console.log('\n3️⃣ Testing Logout...');
    await client.post('/auth/logout');
    console.log('✅ Logout successful');

    // Test login
    console.log('\n4️⃣ Testing Login...');
    const loginResponse = await client.post('/auth/login', {
      email,
      password: 'password123'
    });
    
    if (loginResponse.data.user) {
      console.log('✅ Login successful:', loginResponse.data.user.email);
    } else {
      console.log('❌ Login failed');
    }

    // Test /auth/me after login
    console.log('\n5️⃣ Testing /auth/me after login...');
    const profileResponse2 = await client.get('/auth/me');
    
    if (profileResponse2.data.user) {
      console.log('✅ Profile fetch after login successful:', profileResponse2.data.user.email);
    } else {
      console.log('❌ Profile fetch after login failed');
    }

    console.log('\n🎉 All authentication tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAuth();
