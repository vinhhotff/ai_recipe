import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  errors?: Record<string, string>;
}

export interface ApiError {
  success: false;
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  error?: any;
}

// Import mock data
import { 
  mockSubscriptionPlans, 
  mockUserSubscription, 
  mockUsers, 
  mockRecipes, 
  mockComments,
  mockDashboardMetrics,
  mockUserAnalytics,
  mockRecipeAnalytics,
  mockEngagementAnalytics,
  mockSystemHealth
} from './mockData';

class ApiClientWithFallback {
  private client: AxiosInstance;
  private baseURL: string;
  private isBackendAvailable: boolean = true;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 30000; // 30 seconds

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 5000, // Shorter timeout for faster fallback
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.checkBackendHealth();
  }

  private setupInterceptors() {
    // Response interceptor for error handling and fallback detection
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Backend is working
        this.isBackendAvailable = true;
        return response;
      },
      async (error: AxiosError) => {
        // Check if this is a network/connection error
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || !error.response) {
          console.warn('🔄 Backend unavailable, switching to mock data mode');
          this.isBackendAvailable = false;
        }

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401) {
          this.handleAuthFailure();
        }
        
        return Promise.reject(error);
      }
    );
  }

  private handleAuthFailure() {
    window.dispatchEvent(new CustomEvent('auth:logout'));
    if (!window.location.pathname.includes('/auth')) {
      window.location.href = '/auth/login';
    }
  }

  // Check backend health periodically
  private async checkBackendHealth() {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isBackendAvailable;
    }

    try {
      // Use subscription plans endpoint as health check since /health doesn't exist
      await axios.get(`${this.baseURL}/monetization/subscription-plans`, { 
        timeout: 3000,
        headers: { 'Accept': 'application/json' }
      });
      this.isBackendAvailable = true;
      console.log('✅ Backend is online and healthy');
    } catch (error) {
      this.isBackendAvailable = false;
      // Only log once to avoid spam
      if (!sessionStorage.getItem('backend_offline_logged')) {
        console.log('❌ Backend is unavailable, using mock data');
        sessionStorage.setItem('backend_offline_logged', 'true');
      }
    }

    this.lastHealthCheck = now;
    return this.isBackendAvailable;
  }

  // Generic request method with fallback logic
  private async requestWithFallback<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    data?: any,
    fallbackFn?: () => T,
    config?: any
  ): Promise<T> {
    // Always try real API first
    try {
      const response = await this.client.request({
        method,
        url,
        data,
        ...config,
      });
      
      // Mark backend as available and return real data
      this.isBackendAvailable = true;
      
      // Handle different response formats from backend
      const responseData = response.data;
      
      // If backend returns data directly (not wrapped), wrap it for consistency
      if (Array.isArray(responseData) || (typeof responseData === 'object' && !responseData.success && !responseData.data)) {
        return {
          success: true,
          message: 'Data fetched successfully',
          data: responseData
        };
      }
      
      // If already wrapped format, return as-is
      return responseData;
    } catch (error) {
      // Check if this is a network/connection error that should trigger fallback
      const isNetworkError = axios.isAxiosError(error) && (
        error.code === 'ECONNREFUSED' || 
        error.code === 'ERR_NETWORK' || 
        error.code === 'ENOTFOUND' ||
        error.code === 'ERR_CONNECTION_REFUSED' ||
        !error.response
      );
      
      // If it's a network error, mark backend as unavailable
      if (isNetworkError) {
        this.isBackendAvailable = false;
      }
      
      // If backend is down and we have fallback data, use it
      if ((!this.isBackendAvailable || isNetworkError) && fallbackFn) {
        return fallbackFn();
      }

      // If no fallback available, throw the original error
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = error.response?.data || {
          success: false,
          statusCode: error.response?.status || 500,
          timestamp: new Date().toISOString(),
          path: url,
          method,
          message: error.message,
        };
        throw apiError;
      }
      throw error;
    }
  }

  // Helper to create paginated response
  private createPaginatedResponse<T>(
    data: T[], 
    page: number = 1, 
    limit: number = 10
  ): ApiResponse<T[]> {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);
    
    return {
      success: true,
      message: 'Data fetched successfully',
      data: paginatedData,
      meta: {
        total: data.length,
        page,
        limit,
        totalPages: Math.ceil(data.length / limit),
      },
    };
  }

  // Auth methods
  async login(email: string, password: string) {
    return this.requestWithFallback(
      'POST',
      '/auth/login',
      { email, password },
      () => {
        // Mock login response
        const mockUser = {
          id: '1',
          email,
          firstName: 'Mock',
          lastName: 'User',
          role: 'MEMBER',
        };
        
        // Store mock auth state
        localStorage.setItem('mockAuth', JSON.stringify(mockUser));
        window.dispatchEvent(new CustomEvent('auth:login', { detail: { user: mockUser } }));
        
        return {
          success: true,
          message: 'Login successful (mock)',
          user: mockUser,
        };
      }
    );
  }

  async register(userData: { email: string; password: string; name: string }) {
    return this.requestWithFallback(
      'POST',
      '/auth/register',
      userData,
      () => ({
        success: true,
        message: 'Registration successful (mock)',
        data: {
          id: Date.now().toString(),
          email: userData.email,
          firstName: userData.name.split(' ')[0],
          lastName: userData.name.split(' ').slice(1).join(' '),
          role: 'MEMBER',
        },
      })
    );
  }

  async logout() {
    try {
      await this.requestWithFallback('POST', '/auth/logout', null, () => ({}));
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      localStorage.removeItem('mockAuth');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }

  async getProfile() {
    return this.requestWithFallback(
      'GET',
      '/auth/me',
      null,
      () => {
        const mockAuth = localStorage.getItem('mockAuth');
        if (mockAuth) {
          return {
            success: true,
            message: 'Profile fetched (mock)',
            data: JSON.parse(mockAuth),
          };
        }
        throw new Error('Not authenticated');
      }
    );
  }

  // Subscription methods with fallback
  async getSubscriptionPlans() {
    return this.requestWithFallback(
      'GET',
      '/monetization/subscription-plans',
      null,
      () => ({
        success: true,
        message: 'Subscription plans fetched (mock)',
        data: mockSubscriptionPlans,
      })
    );
  }

  async getUserSubscription() {
    return this.requestWithFallback(
      'GET',
      '/monetization/user/subscription',
      null,
      () => ({
        success: true,
        message: 'User subscription fetched (mock)',
        data: mockUserSubscription,
      })
    );
  }

  async createSubscription(planId: string, billingCycle: 'MONTHLY' | 'YEARLY') {
    return this.requestWithFallback(
      'POST',
      '/monetization',
      { planId, billingCycle, autoRenew: true },
      () => ({
        success: true,
        message: 'Subscription created successfully (mock)',
        data: {
          ...mockUserSubscription,
          planId,
          billingCycle,
        },
      })
    );
  }

  // Recipe methods with fallback
  async getRecipes(filters?: any) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();

    return this.requestWithFallback(
      'GET',
      `/recipes${queryString ? `?${queryString}` : ''}`,
      null,
      () => {
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;
        return this.createPaginatedResponse(mockRecipes, page, limit);
      }
    );
  }

  async getRecipe(id: string) {
    return this.requestWithFallback(
      'GET',
      `/recipes/${id}`,
      null,
      () => ({
        success: true,
        message: 'Recipe fetched (mock)',
        data: mockRecipes.find(r => r.id === id) || mockRecipes[0],
      })
    );
  }

  async createRecipe(data: any) {
    return this.requestWithFallback(
      'POST',
      '/recipes',
      data,
      () => ({
        success: true,
        message: 'Recipe created successfully (mock)',
        data: {
          id: Date.now().toString(),
          ...data,
          author: { firstName: 'Mock', lastName: 'User' },
          createdAt: new Date().toISOString(),
        },
      })
    );
  }

  async generateRecipe(data: any) {
    return this.requestWithFallback(
      'POST',
      '/recipes/generate',
      data,
      () => ({
        success: true,
        message: 'Recipe generated successfully (mock)',
        data: {
          id: Date.now().toString(),
          title: `AI Generated Recipe with ${data.ingredients?.join(', ')}`,
          description: 'This is a mock AI-generated recipe',
          ingredients: data.ingredients || ['Mock ingredient 1', 'Mock ingredient 2'],
          instructions: ['Step 1: Prepare ingredients', 'Step 2: Cook', 'Step 3: Serve'],
          cuisine: data.cuisine || 'International',
          difficulty: data.difficulty || 'Medium',
          prepTime: 15,
          cookTime: 30,
          servings: data.servings || 4,
          createdByAI: true,
          author: { firstName: 'AI', lastName: 'Chef' },
          createdAt: new Date().toISOString(),
        },
      })
    );
  }

  async getIngredientSuggestions(ingredients: string[]) {
    return this.requestWithFallback(
      'GET',
      `/recipes/suggestions/ingredients?ingredients=${ingredients.join(',')}`,
      null,
      () => ({
        success: true,
        message: 'Ingredient suggestions fetched (mock)',
        data: {
          suggestions: ['Salt', 'Pepper', 'Garlic', 'Onion', 'Olive Oil'],
          relatedIngredients: ['Herbs', 'Spices', 'Seasonings'],
        },
      })
    );
  }

  // Admin methods with fallback
  async getAdminDashboardOverview() {
    return this.requestWithFallback(
      'GET',
      '/admin/dashboard/overview',
      null,
      () => ({
        success: true,
        message: 'Dashboard overview fetched (mock)',
        data: mockDashboardMetrics,
      })
    );
  }

  async getAdminUserAnalytics(timeRange: string = '30d') {
    return this.requestWithFallback(
      'GET',
      `/admin/analytics/users?timeRange=${timeRange}`,
      null,
      () => ({
        success: true,
        message: 'User analytics fetched (mock)',
        data: mockUserAnalytics,
      })
    );
  }

  async getAdminRecipeAnalytics(timeRange: string = '30d') {
    return this.requestWithFallback(
      'GET',
      `/admin/analytics/recipes?timeRange=${timeRange}`,
      null,
      () => ({
        success: true,
        message: 'Recipe analytics fetched (mock)',
        data: mockRecipeAnalytics,
      })
    );
  }

  async getAdminEngagementAnalytics(timeRange: string = '30d') {
    return this.requestWithFallback(
      'GET',
      `/admin/analytics/engagement?timeRange=${timeRange}`,
      null,
      () => ({
        success: true,
        message: 'Engagement analytics fetched (mock)',
        data: mockEngagementAnalytics,
      })
    );
  }

  async getSystemHealth() {
    return this.requestWithFallback(
      'GET',
      '/admin/system/health',
      null,
      () => ({
        success: true,
        message: 'System health fetched (mock)',
        data: mockSystemHealth,
      })
    );
  }

  async getAdminUsers(filters?: any) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();

    return this.requestWithFallback(
      'GET',
      `/admin/users${queryString ? `?${queryString}` : ''}`,
      null,
      () => {
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        return this.createPaginatedResponse(mockUsers, page, limit);
      }
    );
  }

  async updateUserRole(userId: string, role: string) {
    return this.requestWithFallback(
      'PATCH',
      `/admin/users/${userId}/role`,
      { role },
      () => ({
        success: true,
        message: `User role updated to ${role} (mock)`,
        data: { id: userId, role },
      })
    );
  }

  async toggleUserStatus(userId: string, isActive: boolean) {
    return this.requestWithFallback(
      'PATCH',
      `/admin/users/${userId}/status`,
      { isActive },
      () => ({
        success: true,
        message: `User status updated (mock)`,
        data: { id: userId, isActive },
      })
    );
  }

  async deleteUser(userId: string) {
    return this.requestWithFallback(
      'DELETE',
      `/admin/users/${userId}`,
      null,
      () => ({
        success: true,
        message: 'User deleted successfully (mock)',
        data: { id: userId },
      })
    );
  }

  async getAdminFlaggedRecipes(filters?: any) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();

    return this.requestWithFallback(
      'GET',
      `/admin/recipes/flagged${queryString ? `?${queryString}` : ''}`,
      null,
      () => {
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const flaggedRecipes = mockRecipes.filter(r => r.isFlagged);
        return this.createPaginatedResponse(flaggedRecipes, page, limit);
      }
    );
  }

  async approveRecipe(recipeId: string) {
    return this.requestWithFallback(
      'POST',
      `/admin/recipes/${recipeId}/approve`,
      null,
      () => ({
        success: true,
        message: 'Recipe approved successfully (mock)',
        data: { id: recipeId, isApproved: true },
      })
    );
  }

  // Utility method to check backend status
  public async isBackendOnline(): Promise<boolean> {
    return await this.checkBackendHealth();
  }

  // Method to get current backend status
  public getBackendStatus(): { isOnline: boolean; lastCheck: Date } {
    return {
      isOnline: this.isBackendAvailable,
      lastCheck: new Date(this.lastHealthCheck),
    };
  }
}

// Export singleton instance
export const apiClientWithFallback = new ApiClientWithFallback();
export default apiClientWithFallback;
