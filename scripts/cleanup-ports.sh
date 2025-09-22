#!/bin/bash

# Script to clean up ports before starting development

echo "🧹 Cleaning up development ports..."

# Kill any processes on commonly used development ports
echo "Checking port 3000 (React dev server)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "Port 3000 is free"

echo "Checking port 3001 (API server)..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "Port 3001 is free"

echo "Checking HMR ports..."
lsof -ti:24678 | xargs kill -9 2>/dev/null || echo "Port 24678 is free"
lsof -ti:24679 | xargs kill -9 2>/dev/null || echo "Port 24679 is free"

# Kill any vite processes
echo "Cleaning up Vite processes..."
pkill -f "vite" 2>/dev/null || echo "No Vite processes running"

echo "✅ Port cleanup complete! You can now run 'npm run dev'"
