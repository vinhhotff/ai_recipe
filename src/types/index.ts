export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  prefs?: {
    diet: Diet;
    allergies: string[];
    units: 'metric' | 'imperial';
  };
}

export interface PantryItem {
  id: string;
  name: string;
  normalized: string;
  quantity?: number;
  unit?: string;
  note?: string;
}

export interface RecipeRequest {
  id: string;
  ingredients: string[];
  calories?: number;
  servings: number;
  maxTimeMinutes?: number;
  diet: Diet;
  exclude: string[];
  budgetVND?: number;
  locale: string;
  imageGeneration: boolean;
}

export interface GeneratedRecipe {
  id: string;
  title: string;
  description?: string;
  servings: number;
  totalCalories: number;
  caloriesPerServing: number;
  estimatedCostVND?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTimeMinutes: number;
  tags: string[];
  ingredients: Ingredient[];
  steps: RecipeStep[];
  nutrition: NutritionInfo;
  imagePrompt?: string;
  imageUrl?: string;
  imageGenerationRequested: boolean;
}

export interface Ingredient {
  name: string;
  normalized: string;
  quantity: number;
  unit: string;
  note?: string;
}

export interface RecipeStep {
  order: number;
  text: string;
  durationMinutes?: number;
  tips?: string;
}

export interface NutritionInfo {
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
  sodium_mg: number;
}

export type Diet = 'NONE' | 'VEGETARIAN' | 'VEGAN' | 'KETO' | 'PALEO' | 'PESCETARIAN' | 'HALAL';

export type RecipeStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';

export interface JobProgress {
  status: RecipeStatus;
  progress: number;
  message: string;
  recipe?: GeneratedRecipe;
}