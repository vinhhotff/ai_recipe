import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

// Types for AI Recipe Generation
export interface InputIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface RecipePreferences {
  diet?: 'none' | 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'pescetarian' | 'halal';
  difficulty?: 'easy' | 'medium' | 'hard';
  timeLimit?: number;
  servings?: number;
  tags?: string[];
}

export interface GenerateRecipeRequest {
  ingredients: InputIngredient[];
  preferences?: RecipePreferences;
  currency?: 'VND' | 'USD';
}

export interface GeneratedIngredient {
  ingredientName: string;
  quantity: string;
  unit: string;
  pricePerUnit?: string;
  totalCost?: string;
  currency: string;
  missingPrice: boolean;
}

export interface GeneratedNutrition {
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
}

export interface GeneratedRecipeResponse {
  recipeId: string;
  title: string;
  steps: string[];
  ingredients: GeneratedIngredient[];
  totalCost: string;
  currency: string;
  nutrition?: GeneratedNutrition;
  servings: number;
  estimatedTime: number;
  difficulty: string;
  hasMissingPrices: boolean;
  missingPriceIngredients: string[];
  generatedAt: string;
  processingTimeMs: number;
}

export interface SuggestionHistory {
  id: string;
  inputIngredients: InputIngredient[];
  preferences?: RecipePreferences;
  status: string;
  recipeTitle?: string;
  totalCost?: string;
  createdAt: string;
  completedAt?: string;
}

// React Query Keys
export const AI_RECIPE_KEYS = {
  all: ['ai-recipes'] as const,
  generate: (request: GenerateRecipeRequest) => ['ai-recipes', 'generate', request] as const,
  history: () => ['ai-recipes', 'history'] as const,
  jobStatus: (jobId: string) => ['ai-recipes', 'job-status', jobId] as const,
};

/**
 * Hook to generate recipe using AI
 */
export function useGenerateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: GenerateRecipeRequest): Promise<GeneratedRecipeResponse> => {
      const response = await apiClient.generateAIRecipe(request);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to generate recipe');
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate history to refresh the list
      queryClient.invalidateQueries({ queryKey: AI_RECIPE_KEYS.history() });
      
      // You could also add the generated recipe to cache if needed
      console.log('Recipe generated successfully:', data.title);
    },
    onError: (error) => {
      console.error('Recipe generation failed:', error);
    },
  });
}

/**
 * Hook to get recipe generation history
 */
export function useRecipeGenerationHistory(enabled: boolean = true) {
  return useQuery({
    queryKey: AI_RECIPE_KEYS.history(),
    queryFn: async (): Promise<SuggestionHistory[]> => {
      const response = await apiClient.getRecipeGenerationHistory();
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch history');
      }
      
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get job status (for async processing)
 */
export function useGenerationJobStatus(jobId: string, enabled: boolean = false) {
  return useQuery({
    queryKey: AI_RECIPE_KEYS.jobStatus(jobId),
    queryFn: async () => {
      const response = await apiClient.getGenerationJobStatus(jobId);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch job status');
      }
      
      return response.data;
    },
    enabled: enabled && !!jobId,
    refetchInterval: (data) => {
      // Stop polling if job is completed or failed
      if (data?.status === 'done' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
    staleTime: 0, // Always fetch fresh data for job status
  });
}

/**
 * Hook to check if AI recipe generation is available
 */
export function useAIGenerationAvailable() {
  // For now, always return true since we have mock implementation
  // Later, this could check API health or user permissions
  return {
    isAvailable: true,
    reason: null as string | null,
  };
}

/**
 * Utility function to validate ingredients before generation
 */
export function validateGenerationRequest(request: GenerateRecipeRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!request.ingredients || request.ingredients.length === 0) {
    errors.push('At least one ingredient is required');
  }

  request.ingredients?.forEach((ingredient, index) => {
    if (!ingredient.name?.trim()) {
      errors.push(`Ingredient ${index + 1}: Name is required`);
    }
    if (!ingredient.quantity?.trim()) {
      errors.push(`Ingredient ${index + 1}: Quantity is required`);
    }
    if (!ingredient.unit?.trim()) {
      errors.push(`Ingredient ${index + 1}: Unit is required`);
    }
    
    const quantity = parseFloat(ingredient.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      errors.push(`Ingredient ${index + 1}: Quantity must be a positive number`);
    }
  });

  if (request.preferences?.timeLimit && request.preferences.timeLimit < 5) {
    errors.push('Time limit must be at least 5 minutes');
  }

  if (request.preferences?.servings && request.preferences.servings < 1) {
    errors.push('Servings must be at least 1');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Utility function to estimate generation time
 */
export function estimateGenerationTime(ingredientCount: number): number {
  // Base time + ingredient complexity
  const baseTime = 2000; // 2 seconds
  const perIngredientTime = 500; // 500ms per ingredient
  
  return baseTime + (ingredientCount * perIngredientTime);
}

/**
 * Format cost display utility
 */
export function formatCost(cost: string | number, currency: string = 'VND'): string {
  const numericCost = typeof cost === 'string' ? parseFloat(cost) : cost;
  
  if (isNaN(numericCost)) {
    return '0';
  }

  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN').format(Math.round(numericCost));
  } else if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numericCost);
  }

  return numericCost.toString();
}
