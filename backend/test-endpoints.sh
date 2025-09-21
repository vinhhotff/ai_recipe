#!/bin/bash

# Backend API Endpoint Testing Script
echo "🧪 Testing Backend API Endpoints..."

BASE_URL="http://localhost:3001/api"

# Test basic endpoints
echo "📋 Testing Basic Endpoints..."
echo "✅ Ingredients:"
curl -s "${BASE_URL}/ingredients" | jq '.success' || echo "❌ Failed"

echo "✅ Ingredients Units:"
curl -s "${BASE_URL}/ingredients/units" | jq '.success' || echo "❌ Failed" 

echo "✅ Auth endpoints:"
echo "  - Register (should return validation error):"
curl -s -X POST "${BASE_URL}/auth/register" -H "Content-Type: application/json" -d '{}' | jq '.message' || echo "❌ Failed"

echo "  - Login (should return validation error):"
curl -s -X POST "${BASE_URL}/auth/login" -H "Content-Type: application/json" -d '{}' | jq '.message' || echo "❌ Failed"

# Test monetization endpoints  
echo "📊 Testing Monetization Endpoints..."
echo "✅ Subscription Plans:"
curl -s "${BASE_URL}/api/subscriptions/plans" | jq '.length' 2>/dev/null || echo "❌ No plans or error"

echo "✅ Subscription Status (no auth - should fail):"
curl -s "${BASE_URL}/api/subscriptions/user" | jq '.statusCode' || echo "❌ Failed"

# Test analytics endpoints
echo "📈 Testing Analytics Endpoints..."
echo "✅ Analytics Overview (admin - should fail without auth):"
curl -s "${BASE_URL}/api/admin/analytics/overview" | jq '.statusCode' || echo "❌ Failed"

# Test recipe generation endpoints
echo "🍳 Testing Recipe Generation..."
echo "✅ Recipe Generation History (should fail without auth):"
curl -s "${BASE_URL}/recipes/suggestions/history" | jq '.statusCode' || echo "❌ Failed"

# Test video generation
echo "🎥 Testing Video Generation..."
echo "✅ Video stats (should fail without auth):"
curl -s "${BASE_URL}/videos/stats/user" | jq '.statusCode' || echo "❌ Failed"

# Test pantry endpoints
echo "🥬 Testing Pantry Management..."
echo "✅ Pantry items (should fail without auth):"
curl -s "${BASE_URL}/pantry" | jq '.statusCode' || echo "❌ Failed"

echo ""
echo "🔍 Testing API Documentation..."
curl -s "${BASE_URL}/docs" -o /dev/null -w "Status: %{http_code}" && echo " ✅" || echo " ❌"

echo ""
echo "🚀 Backend API Testing Complete!"
echo "✅ = Working, ❌ = Issue, 📊 = Data dependent"
