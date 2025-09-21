import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

// Types
export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  canonicalUnit: string;
  basePrice?: string;
  currency: string;
  available: boolean;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: string;
  unit: string;
}

export interface IngredientCostBreakdown {
  ingredientId: string;
  ingredientName: string;
  quantity: string;
  unit: string;
  pricePerUnit: string;
  totalCost: string;
  currency: string;
  missingPrice: boolean;
}

export interface RecipeCostResponse {
  ingredients: IngredientCostBreakdown[];
  totalCost: string;
  currency: string;
  hasMissingPrices: boolean;
  missingPriceIngredients: string[];
}

export interface IngredientsResponse {
  success: boolean;
  message: string;
  data: Ingredient[];
}

export interface UnitsResponse {
  success: boolean;
  message: string;
  data: {
    weight: string[];
    volume: string[];
    count: string[];
  };
}

// Query keys
const QUERY_KEYS = {
  ingredients: ['ingredients'] as const,
  ingredient: (id: string) => ['ingredients', id] as const,
  units: ['ingredients', 'units'] as const,
  recipeCost: (ingredients: RecipeIngredient[], currency: string) => 
    ['recipe-cost', ingredients, currency] as const,
};

// Custom hook for debouncing
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hooks
export const useIngredients = () => {
  return useQuery<IngredientsResponse>({
    queryKey: QUERY_KEYS.ingredients,
    queryFn: () => apiClient.getAllIngredients(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useIngredient = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.ingredient(id),
    queryFn: () => apiClient.getIngredient(id),
    enabled: !!id,
  });
};

export const useAvailableUnits = () => {
  return useQuery<UnitsResponse>({
    queryKey: QUERY_KEYS.units,
    queryFn: () => apiClient.getAvailableUnits(),
    staleTime: 30 * 60 * 1000, // 30 minutes - units don't change often
  });
};

export const useCreateIngredient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ingredient: any) => apiClient.createIngredient(ingredient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ingredients });
    },
  });
};

export const useUpdateIngredient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ingredient }: { id: string; ingredient: any }) =>
      apiClient.updateIngredient(id, ingredient),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ingredients });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ingredient(id) });
    },
  });
};

export const useDeleteIngredient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteIngredient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ingredients });
    },
  });
};

// Recipe cost computation with debouncing
export const useComputeRecipeCost = (
  ingredients: RecipeIngredient[],
  currency: string = 'VND',
  debounceMs: number = 300
) => {
  // Debounce the ingredients to avoid too many API calls
  const debouncedIngredients = useDebounce(ingredients, debounceMs);
  
  // Only compute cost if we have valid ingredients
  const hasValidIngredients = useMemo(() => {
    return debouncedIngredients.length > 0 && 
           debouncedIngredients.some(ing => 
             ing.ingredientId && 
             ing.quantity && 
             parseFloat(ing.quantity) > 0 && 
             ing.unit
           );
  }, [debouncedIngredients]);

  return useQuery<RecipeCostResponse>({
    queryKey: QUERY_KEYS.recipeCost(debouncedIngredients, currency),
    queryFn: () => {
      // Filter out invalid ingredients
      const validIngredients = debouncedIngredients.filter(ing => 
        ing.ingredientId && 
        ing.quantity && 
        parseFloat(ing.quantity) > 0 && 
        ing.unit
      );
      
      return apiClient.computeRecipeCost(validIngredients, currency);
    },
    enabled: hasValidIngredients,
    staleTime: 2 * 60 * 1000, // 2 minutes - prices don't change very often
    retry: 1,
  });
};

// Utility hooks
export const useIngredientOptions = () => {
  const { data: ingredientsResponse, isLoading } = useIngredients();
  
  const options = useMemo(() => {
    if (!ingredientsResponse?.data) return [];
    
    return ingredientsResponse.data
      .filter(ingredient => ingredient.available && !ingredient.isDeleted)
      .map(ingredient => ({
        value: ingredient.id,
        label: ingredient.name,
        unit: ingredient.canonicalUnit,
        hasPrice: !!ingredient.basePrice,
      }));
  }, [ingredientsResponse]);

  return { options, isLoading };
};

export const useUnitOptions = () => {
  const { data: unitsResponse } = useAvailableUnits();
  
  const options = useMemo(() => {
    if (!unitsResponse?.data) return [];
    
    const { weight, volume, count } = unitsResponse.data;
    
    return [
      { group: 'Trọng lượng', options: weight.map(unit => ({ value: unit, label: unit })) },
      { group: 'Thể tích', options: volume.map(unit => ({ value: unit, label: unit })) },
      { group: 'Số lượng', options: count.map(unit => ({ value: unit, label: unit })) },
    ];
  }, [unitsResponse]);

  return options;
};

// Format currency helper
export const formatCurrency = (amount: string | number, currency: string = 'VND'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '0 ₫';
  
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(numAmount);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(numAmount);
};
