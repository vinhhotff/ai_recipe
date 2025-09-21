const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for JWT
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Pantry endpoints
  async getPantryItems() {
    return this.request('/pantry');
  }

  async addPantryItem(item: any) {
    return this.request('/pantry', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updatePantryItem(id: string, item: any) {
    return this.request(`/pantry/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(item),
    });
  }

  async deletePantryItem(id: string) {
    return this.request(`/pantry/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    return this.request('/pantry/upload-image', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  // Recipe endpoints
  async generateRecipe(request: any) {
    return this.request('/recipes/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getRecipeRequests() {
    return this.request('/recipes/requests');
  }

  async getRecipeRequest(id: string) {
    return this.request(`/recipes/requests/${id}`);
  }

  async getRecipe(id: string) {
    return this.request(`/recipes/${id}`);
  }

  async getRecipeBySlug(slug: string) {
    return this.request(`/recipes/slug/${slug}`);
  }

  // Create SSE connection for progress updates
  createProgressStream(jobId: string) {
    return new EventSource(`${this.baseURL}/recipes/stream/${jobId}`, {
      withCredentials: true,
    });
  }

  // Core Recipe endpoints
  async getCoreRecipes(params?: { page?: number; limit?: number; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const queryString = searchParams.toString();
    const endpoint = `/core-recipes${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  async getCoreRecipe(id: string) {
    return this.request(`/core-recipes/${id}`);
  }

  async createCoreRecipe(recipe: any) {
    return this.request('/core-recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
  }

  async updateCoreRecipe(id: string, recipe: any) {
    return this.request(`/core-recipes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(recipe),
    });
  }

  async deleteCoreRecipe(id: string) {
    return this.request(`/core-recipes/${id}`, {
      method: 'DELETE',
    });
  }

  async getIngredients() {
    return this.request('/core-recipes/ingredients');
  }

  // Ingredient pricing endpoints
  async getAllIngredients() {
    return this.request('/ingredients');
  }

  async getIngredient(id: string) {
    return this.request(`/ingredients/${id}`);
  }

  async createIngredient(ingredient: any) {
    return this.request('/ingredients', {
      method: 'POST',
      body: JSON.stringify(ingredient),
    });
  }

  async updateIngredient(id: string, ingredient: any) {
    return this.request(`/ingredients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(ingredient),
    });
  }

  async deleteIngredient(id: string) {
    return this.request(`/ingredients/${id}`, {
      method: 'DELETE',
    });
  }

  async getAvailableUnits() {
    return this.request('/ingredients/units');
  }

  async computeRecipeCost(ingredients: any[], currency: string = 'VND') {
    return this.request('/ingredients/compute-recipe-cost', {
      method: 'POST',
      body: JSON.stringify({ ingredients, currency }),
    });
  }

  // AI Recipe Generation endpoints
  async generateAIRecipe(generateDto: {
    ingredients: { name: string; quantity: string; unit: string }[];
    preferences?: {
      diet?: string;
      difficulty?: string;
      timeLimit?: number;
      servings?: number;
      tags?: string[];
    };
    currency?: string;
  }) {
    return this.request('/recipes/generate', {
      method: 'POST',
      body: JSON.stringify(generateDto),
    });
  }

  async getRecipeGenerationHistory() {
    return this.request('/recipes/suggestions/history');
  }

  async getGenerationJobStatus(jobId: string) {
    return this.request(`/recipes/jobs/${jobId}/status`);
  }

  // Video Generation endpoints
  async generateRecipeVideo(generateDto: {
    recipeId: string;
    style?: string;
    narration?: boolean;
    voice?: string;
    resolution?: string;
    maxDuration?: number;
    backgroundMusic?: boolean;
    musicGenre?: string;
  }) {
    return this.request('/videos/generate', {
      method: 'POST',
      body: JSON.stringify(generateDto),
    });
  }

  async getVideoStatus(videoId: string) {
    return this.request(`/videos/${videoId}`);
  }

  async getRecipeVideos(recipeId: string, userOnly?: boolean) {
    const params = userOnly ? '?userOnly=true' : '';
    return this.request(`/videos/recipe/${recipeId}${params}`);
  }

  async getUserVideoStats() {
    return this.request('/videos/stats/user');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);