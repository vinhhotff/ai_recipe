export interface User {
  id: string;
  email: string;
  name: string;
  role: 'GUEST' | 'MEMBER' | 'ADMIN';
  prefs?: {
    diet: Diet;
    allergies: string[];
    units: 'metric' | 'imperial';
  };
  createdAt: string;
  updatedAt: string;
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

// Comment và Like system
export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  recipeId: string;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
  parentId?: string;
}

export interface Like {
  id: string;
  userId: string;
  userName: string;
  recipeId: string;
  createdAt: string;
}

export interface RecipeInteraction {
  likes: Like[];
  comments: Comment[];
  likeCount: number;
  commentCount: number;
  isLikedByCurrentUser: boolean;
}

// New Recipe Management System Types
export interface Recipe {
  id: string;
  title: string;
  slug: string;
  description?: string;
  servings: number;
  totalCalories?: number;
  caloriesPer?: number;
  ingredients: Array<{
    name: string;
    quantity: string;
    unit: string;
  }>;
  steps: string[];
  nutrition?: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber?: number;
  };
  imageUrl?: string;
  videoUrl?: string;
  estimatedCost?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  cuisine?: string;
  prepTime?: number;
  cookTime?: number;
  createdById?: string;
  createdByAI: boolean;
  isPublic: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    likes: number;
    comments: number;
    savedBy: number;
  };
  userInteractions?: {
    isLiked: boolean;
    isSaved: boolean;
  };
  comments?: RecipeComment[];
  likes?: RecipeLike[];
}

export interface RecipeComment {
  id: string;
  userId: string;
  recipeId: string;
  content: string;
  parentCommentId?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
  };
  replies?: RecipeComment[];
}

export interface RecipeLike {
  id: string;
  userId: string;
  recipeId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export interface RecipeFilters {
  search?: string;
  cuisine?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string;
  sortBy?: 'createdAt' | 'title' | 'totalCalories' | 'difficulty';
  sortOrder?: 'asc' | 'desc';
  createdByAI?: boolean;
  page?: number;
  limit?: number;
}

export interface GenerateRecipeRequest {
  ingredients: string[];
  cuisine?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  servings?: number;
  maxTime?: number;
  dietaryRestrictions?: string;
  preferredTags?: string[];
}

export interface CreateRecipeRequest {
  title: string;
  description?: string;
  servings: number;
  totalCalories?: number;
  caloriesPer?: number;
  ingredients: Array<{
    name: string;
    quantity: string;
    unit: string;
  }>;
  steps: string[];
  nutrition?: object;
  imageUrl?: string;
  videoUrl?: string;
  estimatedCost?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  cuisine?: string;
  prepTime?: number;
  cookTime?: number;
  createdByAI?: boolean;
  isPublic?: boolean;
}

export interface UpdateRecipeRequest extends Partial<CreateRecipeRequest> {
  // All fields from CreateRecipeRequest are optional for updates
}
