import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  ChefHat, 
  MessageCircle, 
  Heart, 
  TrendingUp, 
  Calendar,
  Activity,
  Shield,
  Wifi,
  WifiOff
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DashboardMetrics {
  totalUsers: number;
  totalRecipes: number;
  totalComments: number;
  totalLikes: number;
  newUsersToday: number;
  newRecipesToday: number;
  userGrowthWeekly: number;
  recipeGrowthWeekly: number;
}

interface TopRecipe {
  id: string;
  title: string;
  author: string;
  likes: number;
  comments: number;
  saves: number;
  createdAt: string;
}

export const AdminDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const { isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState('30d');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['admin-dashboard-overview'],
    queryFn: apiClient.getAdminDashboardOverview,
    enabled: isAdmin(),
  });

  const { data: userAnalytics, isLoading: userAnalyticsLoading } = useQuery({
    queryKey: ['admin-user-analytics', timeRange],
    queryFn: () => apiClient.getAdminUserAnalytics(timeRange),
    enabled: isAdmin(),
  });

  const { data: recipeAnalytics, isLoading: recipeAnalyticsLoading } = useQuery({
    queryKey: ['admin-recipe-analytics', timeRange],
    queryFn: () => apiClient.getAdminRecipeAnalytics(timeRange),
    enabled: isAdmin(),
  });

  const { data: engagementAnalytics, isLoading: engagementLoading } = useQuery({
    queryKey: ['admin-engagement-analytics', timeRange],
    queryFn: () => apiClient.getAdminEngagementAnalytics(timeRange),
    enabled: isAdmin(),
  });

  const { data: systemHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: apiClient.getSystemHealth,
    enabled: isAdmin(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Real-time updates via WebSocket
  useEffect(() => {
    const handleDashboardUpdate = (event: CustomEvent) => {
      console.log('Dashboard metrics update received:', event.detail);
      setLastUpdate(new Date());
      
      // Invalidate and refetch dashboard data
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['admin-recipe-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['admin-engagement-analytics'] });
    };

    const handleUserActivity = (event: CustomEvent) => {
      console.log('User activity update:', event.detail);
      // Could be used to show live activity feed
    };

    // Listen for WebSocket events
    window.addEventListener('dashboard-update', handleDashboardUpdate as EventListener);
    window.addEventListener('user-activity', handleUserActivity as EventListener);

    return () => {
      window.removeEventListener('dashboard-update', handleDashboardUpdate as EventListener);
      window.removeEventListener('user-activity', handleUserActivity as EventListener);
    };
  }, [queryClient]);

  if (!isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-24 w-24 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this dashboard.</p>
        </div>
      </div>
    );
  }

  const metrics = overviewData?.data?.metrics as DashboardMetrics | undefined;
  const topRecipes = overviewData?.data?.topRecipes as TopRecipe[] | undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-700 font-medium">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700 font-medium">Offline</span>
                </>
              )}
            </div>
          </div>
          <p className="text-gray-600">Monitor and manage your Recipe Management System</p>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()}
            {isConnected && <span className="ml-2">• Real-time updates enabled</span>}
          </p>
        </div>
        
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* System Health */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                  systemHealth.data.database.status === 'healthy' 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                }`} />
                <p className="text-sm text-gray-600">Database</p>
                <p className="font-medium">{systemHealth.data.database.status}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="font-medium">{Math.floor(systemHealth.data.performance.uptime / 3600)}h</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Memory Usage</p>
                <p className="font-medium">
                  {Math.round(systemHealth.data.performance.memoryUsage.heapUsed / 1024 / 1024)}MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {overviewLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{metrics.newUsersToday} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recipes</CardTitle>
              <ChefHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalRecipes.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{metrics.newRecipesToday} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalComments.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Engagement activity
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalLikes.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                User appreciation
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>User Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            {userAnalyticsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : userAnalytics?.data ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Role Distribution</h4>
                  <div className="space-y-2">
                    {userAnalytics.data.roleDistribution.map((role: any) => (
                      <div key={role.role} className="flex justify-between">
                        <span className="capitalize">{role.role.toLowerCase()}</span>
                        <span className="font-medium">{role.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Active Users</h4>
                  <p className="text-2xl font-bold">{userAnalytics.data.activeUsers}</p>
                  <p className="text-sm text-gray-600">Users who created content or interacted</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Recipe Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Recipe Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            {recipeAnalyticsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : recipeAnalytics?.data ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Creation Type</h4>
                  <div className="space-y-2">
                    {recipeAnalytics.data.typeDistribution.map((type: any) => (
                      <div key={type.type} className="flex justify-between">
                        <span>{type.type}</span>
                        <span className="font-medium">{type.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Top Cuisines</h4>
                  <div className="space-y-2">
                    {recipeAnalytics.data.cuisineDistribution.slice(0, 5).map((cuisine: any) => (
                      <div key={cuisine.cuisine} className="flex justify-between">
                        <span>{cuisine.cuisine}</span>
                        <span className="font-medium">{cuisine.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Top Recipes */}
      {topRecipes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Recipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Recipe</th>
                    <th className="text-left py-2">Author</th>
                    <th className="text-center py-2">Likes</th>
                    <th className="text-center py-2">Comments</th>
                    <th className="text-center py-2">Saves</th>
                    <th className="text-left py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {topRecipes.map((recipe) => (
                    <tr key={recipe.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <div className="font-medium">{recipe.title}</div>
                      </td>
                      <td className="py-3 text-gray-600">{recipe.author}</td>
                      <td className="py-3 text-center">{recipe.likes}</td>
                      <td className="py-3 text-center">{recipe.comments}</td>
                      <td className="py-3 text-center">{recipe.saves}</td>
                      <td className="py-3 text-gray-600">
                        {new Date(recipe.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement Analytics */}
      {engagementAnalytics?.data && (
        <Card>
          <CardHeader>
            <CardTitle>Top Engaging Recipes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {engagementAnalytics.data.topEngagingRecipes.slice(0, 5).map((recipe: any) => (
                <div key={recipe.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{recipe.title}</h4>
                    <p className="text-sm text-gray-600">by {recipe.author}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{recipe.totalEngagement}</div>
                    <div className="text-xs text-gray-600">
                      {recipe.likes}❤️ {recipe.comments}💬 {recipe.saves}🔖
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
