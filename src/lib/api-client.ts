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

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401) {
          this.handleAuthFailure();
        }
        return Promise.reject(error);
      }
    );
  }


  private handleAuthFailure() {
    // Trigger auth state update
    window.dispatchEvent(new CustomEvent('auth:logout'));
    // Redirect to login if not already there
    if (!window.location.pathname.includes('/auth')) {
      window.location.href = '/auth/login';
    }
  }

  // Generic request method
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    data?: any,
    config?: any
  ): Promise<T> {
    try {
      const response = await this.client.request({
        method,
        url,
        data,
        ...config,
      });
      return response.data;
    } catch (error) {
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

  // HTTP methods
  async get<T>(url: string, config?: any): Promise<T> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.request<T>('PUT', url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.request<T>('PATCH', url, data, config);
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.post<any>('/auth/login', { email, password });
    
    if (response.user) {
      // Backend uses HTTP-only cookies, no need to store tokens manually
      window.dispatchEvent(new CustomEvent('auth:login', { detail: response }));
    }
    
    return response;
  }

  async register(userData: { email: string; password: string; name: string }) {
    return this.post<ApiResponse>('/auth/register', userData);
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }

  async getProfile() {
    return this.get<ApiResponse>('/auth/me');
  }

  // Ingredients
  async getIngredients() {
    return this.get<ApiResponse>('/ingredients');
  }

  async createIngredient(data: any) {
    return this.post<ApiResponse>('/ingredients', data);
  }

  async updateIngredient(id: string, data: any) {
    return this.patch<ApiResponse>(`/ingredients/${id}`, data);
  }

  async deleteIngredient(id: string) {
    return this.delete<ApiResponse>(`/ingredients/${id}`);
  }

  async computeRecipeCost(ingredients: Array<{ ingredientId: string; quantity: number; unit: string }>) {
    return this.post<ApiResponse>('/ingredients/compute-recipe-cost', { ingredients });
  }

  // New Recipe Management System
  async getRecipes(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    cuisine?: string;
    difficulty?: string;
    tags?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    createdByAI?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();
    return this.get<ApiResponse>(`/recipes${queryString ? `?${queryString}` : ''}`);
  }

  async getRecipe(id: string) {
    return this.get<ApiResponse>(`/recipes/${id}`);
  }

  async createRecipe(data: any) {
    return this.post<ApiResponse>('/recipes', data);
  }

  async updateRecipe(id: string, data: any) {
    return this.patch<ApiResponse>(`/recipes/${id}`, data);
  }

  async deleteRecipe(id: string) {
    return this.delete<ApiResponse>(`/recipes/${id}`);
  }

  async generateRecipe(data: {
    ingredients: string[];
    cuisine?: string;
    difficulty?: string;
    servings?: number;
    maxTime?: number;
    dietaryRestrictions?: string;
    preferredTags?: string[];
  }) {
    return this.post<ApiResponse>('/recipes/generate', data);
  }

  async getIngredientSuggestions(ingredients: string[]) {
    const ingredientsStr = ingredients.join(',');
    return this.get<ApiResponse>(`/recipes/suggestions/ingredients?ingredients=${ingredientsStr}`);
  }

  async toggleLikeRecipe(recipeId: string) {
    return this.post<ApiResponse>(`/recipes/${recipeId}/like`);
  }

  async toggleSaveRecipe(recipeId: string) {
    return this.post<ApiResponse>(`/recipes/${recipeId}/save`);
  }

  async getSavedRecipes(page = 1, limit = 10) {
    return this.get<ApiResponse>(`/recipes/saved?page=${page}&limit=${limit}`);
  }

  // Comments
  async getRecipeComments(recipeId: string) {
    return this.get<ApiResponse>(`/recipes/${recipeId}/comments`);
  }

  async createRecipeComment(recipeId: string, data: { content: string; parentCommentId?: string }) {
    return this.post<ApiResponse>(`/recipes/${recipeId}/comments`, data);
  }

  async updateRecipeComment(recipeId: string, commentId: string, data: { content: string }) {
    return this.patch<ApiResponse>(`/recipes/${recipeId}/comments/${commentId}`, data);
  }

  async deleteRecipeComment(recipeId: string, commentId: string) {
    return this.delete<ApiResponse>(`/recipes/${recipeId}/comments/${commentId}`);
  }

  async getUserComments(page = 1, limit = 10) {
    return this.get<ApiResponse>(`/user/comments?page=${page}&limit=${limit}`);
  }

  // Admin endpoints
  async getAdminDashboardOverview() {
    return this.get<ApiResponse>('/admin/dashboard/overview');
  }

  async getAdminUserAnalytics(timeRange = '30d') {
    return this.get<ApiResponse>(`/admin/analytics/users?timeRange=${timeRange}`);
  }

  async getAdminRecipeAnalytics(timeRange = '30d') {
    return this.get<ApiResponse>(`/admin/analytics/recipes?timeRange=${timeRange}`);
  }

  async getAdminEngagementAnalytics(timeRange = '30d') {
    return this.get<ApiResponse>(`/admin/analytics/engagement?timeRange=${timeRange}`);
  }

  async getAdminTrendingRecipes(limit = 10, timeRange = '30d') {
    return this.get<ApiResponse>(`/admin/recipes/trending?limit=${limit}&timeRange=${timeRange}`);
  }

  async getAdminUsers(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();
    return this.get<ApiResponse>(`/admin/users${queryString ? `?${queryString}` : ''}`);
  }

  async updateUserRole(userId: string, role: string) {
    return this.patch<ApiResponse>(`/admin/users/${userId}/role`, { role });
  }

  async toggleUserStatus(userId: string, isActive: boolean) {
    return this.patch<ApiResponse>(`/admin/users/${userId}/status`, { isActive });
  }

  async deleteUser(userId: string) {
    return this.delete<ApiResponse>(`/admin/users/${userId}`);
  }

  async getAdminFlaggedRecipes(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    cuisine?: string;
    flagged?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();
    return this.get<ApiResponse>(`/admin/recipes/flagged${queryString ? `?${queryString}` : ''}`);
  }

  async approveRecipe(recipeId: string) {
    return this.post<ApiResponse>(`/admin/recipes/${recipeId}/approve`);
  }

  async deleteRecipeAsAdmin(recipeId: string) {
    return this.delete<ApiResponse>(`/admin/recipes/${recipeId}`);
  }

  async getAdminFlaggedComments(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
    flagged?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();
    return this.get<ApiResponse>(`/admin/comments/flagged${queryString ? `?${queryString}` : ''}`);
  }

  async deleteComment(commentId: string) {
    return this.delete<ApiResponse>(`/admin/comments/${commentId}`);
  }

  async unflagComment(commentId: string) {
    return this.patch<ApiResponse>(`/admin/comments/${commentId}/unflag`);
  }

  async getSystemHealth() {
    return this.get<ApiResponse>('/admin/system/health');
  }

  // Subscriptions
  async getSubscriptionPlans() {
    return this.get<ApiResponse>('/monetization/subscription-plans');
  }

  async getUserSubscription() {
    return this.get<ApiResponse>('/monetization/user/subscription');
  }

  async createSubscription(planId: string, billingCycle: 'MONTHLY' | 'YEARLY') {
    return this.post<ApiResponse>('/monetization', {
      planId,
      billingCycle,
      autoRenew: true,
    });
  }

  // Usage
  async checkUsage(featureType: string) {
    return this.get<ApiResponse>(`/monetization/usage/check/${featureType}`);
  }

  async updateUsage(featureType: string, amount = 1) {
    return this.post<ApiResponse>('/monetization/usage/update', {
      featureType,
      amount,
    });
  }

  // Health check
  async healthCheck() {
    return this.get('/health');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
