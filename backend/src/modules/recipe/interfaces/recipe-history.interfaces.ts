export interface RecipeHistoryItem {
  id: string;
  title: string;
  slug: string;
  servings: number;
  totalCalories: number;
  caloriesPer: number;
  ingredients: any;
  steps: any;
  nutrition?: any;
  imageUrl?: string;
  estimatedCost?: number;
  difficulty?: string;
  tags?: any;
  videoUrl?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Interaction stats
  likeCount: number;
  commentCount: number;
  isLikedByUser: boolean;
}

export interface PaginatedRecipeHistory {
  data: RecipeHistoryItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RecipeFilters {
  search?: string;
  difficulty?: string;
  minCalories?: number;
  maxCalories?: number;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface RecipeStats {
  totalRecipes: number;
  publicRecipes: number;
  privateRecipes: number;
  totalLikes: number;
  totalComments: number;
  averageCaloriesPerRecipe: number;
  mostPopularRecipe?: {
    id: string;
    title: string;
    likeCount: number;
  };
  recentActivity: {
    recipesThisWeek: number;
    recipesThisMonth: number;
  };
}
