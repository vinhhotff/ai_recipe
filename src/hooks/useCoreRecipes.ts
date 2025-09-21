import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

// Types
export interface Ingredient {
  id: string;
  name: string;
  description?: string;
}

export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  quantity: string;
  unit: string;
  ingredient: Ingredient;
}

export interface CoreRecipe {
  id: string;
  title: string;
  description?: string;
  steps: string[];
  nutrition?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  };
  totalCost?: number;
  ingredients: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecipeData {
  title: string;
  description?: string;
  steps: string[];
  ingredients: {
    ingredientId: string;
    quantity: string;
    unit: string;
  }[];
  nutrition?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  };
}

export interface UpdateRecipeData extends Partial<CreateRecipeData> {}

export interface RecipesResponse {
  success: boolean;
  message: string;
  data: CoreRecipe[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RecipeResponse {
  success: boolean;
  message: string;
  data: CoreRecipe;
}

export interface IngredientsResponse {
  success: boolean;
  message: string;
  data: Ingredient[];
}

// Query keys
const QUERY_KEYS = {
  coreRecipes: ['core-recipes'] as const,
  coreRecipe: (id: string) => ['core-recipes', id] as const,
  ingredients: ['ingredients'] as const,
};

// Hooks
export const useCoreRecipes = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.coreRecipes, params],
    queryFn: () => apiClient.getCoreRecipes(params),
  });
};

export const useCoreRecipe = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.coreRecipe(id),
    queryFn: () => apiClient.getCoreRecipe(id),
    enabled: !!id,
  });
};

export const useIngredients = () => {
  return useQuery({
    queryKey: QUERY_KEYS.ingredients,
    queryFn: () => apiClient.getIngredients(),
  });
};

export const useCreateCoreRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipe: CreateRecipeData) => apiClient.createCoreRecipe(recipe),
    onSuccess: () => {
      // Invalidate and refetch recipes list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coreRecipes });
    },
  });
};

export const useUpdateCoreRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, recipe }: { id: string; recipe: UpdateRecipeData }) =>
      apiClient.updateCoreRecipe(id, recipe),
    onSuccess: (_, { id }) => {
      // Invalidate and refetch recipes list and specific recipe
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coreRecipes });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coreRecipe(id) });
    },
  });
};

export const useDeleteCoreRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteCoreRecipe(id),
    onSuccess: () => {
      // Invalidate and refetch recipes list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coreRecipes });
    },
  });
};
