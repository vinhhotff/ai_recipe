import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { queryClient } from './lib/query-client-with-fallback';

import { AuthProvider } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DevelopmentBanner } from '@/components/DevelopmentBanner';
// Removed status indicator imports
// import { BackendStatusIndicator } from '@/components/ui/BackendStatusIndicator';
// import { WebSocketStatus } from '@/components/WebSocketStatus';

// Pages
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import IngredientsPage from '@/pages/IngredientsPage';
import RecipeGeneratorPage from '@/pages/RecipeGeneratorPage';
import RecipesPage from '@/pages/RecipesPage';
import SubscriptionPlansPage from '@/pages/SubscriptionPlansPage';
import ProfilePage from '@/pages/ProfilePage';
import FallbackDemoPage from '@/pages/FallbackDemoPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Admin Components
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { AdminRecipeManagement } from '@/components/admin/AdminRecipeManagement';
import { AdminCommentManagement } from '@/components/admin/AdminCommentManagement';

// Query client with automatic fallback to mock data is imported

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <Router>
          <div className="min-h-screen bg-gray-50">
            <DevelopmentBanner />
            
            {/* Status Indicators - Disabled
            <div className="fixed top-16 right-4 z-50 bg-white rounded-lg shadow-md p-3 space-y-2">
              <div className="flex items-center gap-2">
                <BackendStatusIndicator showLabel={true} />
              </div>
              <div className="flex items-center gap-2">
                <WebSocketStatus showText={true} />
              </div>
            </div>
            */}
            
            <Toaster 
              position="top-right" 
              richColors
              expand={true}
              duration={4000}
            />
            
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/subscription/plans" element={<SubscriptionPlansPage />} />
              <Route path="/demo/fallback" element={<FallbackDemoPage />} />
              
              {/* Protected Routes */}
              <Route path="/app" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="ingredients" element={<IngredientsPage />} />
                <Route path="recipe-generator" element={<RecipeGeneratorPage />} />
                <Route path="recipes" element={<RecipesPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
              
              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUserManagement />} />
                <Route path="recipes" element={<AdminRecipeManagement />} />
                <Route path="comments" element={<AdminCommentManagement />} />
              </Route>
              
              {/* Catch all route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
          </Router>
        </WebSocketProvider>
      </AuthProvider>
      
      {/* React Query Devtools - only in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export default App;
