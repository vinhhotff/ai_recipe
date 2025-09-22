import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, Clock, Users, ChefHat } from 'lucide-react';
import { Recipe } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';

interface RecipeCardProps {
  recipe: Recipe;
  onLike?: () => void;
  onSave?: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onLike, onSave }) => {
  const { user, canLikeRecipe, canSaveRecipe, isGuest } = useAuth();
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async () => apiClient.toggleLikeRecipe(recipe.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', recipe.id] });
      toast.success(recipe.userInteractions?.isLiked ? 'Recipe unliked' : 'Recipe liked!');
      onLike?.();
    },
    onError: (error: any) => {
      if (error.statusCode === 403 && isGuest()) {
        toast.error('Please register to like recipes');
      } else {
        toast.error(error.message || 'Failed to toggle like');
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => apiClient.toggleSaveRecipe(recipe.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', recipe.id] });
      queryClient.invalidateQueries({ queryKey: ['saved-recipes'] });
      toast.success(recipe.userInteractions?.isSaved ? 'Recipe removed from saved' : 'Recipe saved!');
      onSave?.();
    },
    onError: (error: any) => {
      if (error.statusCode === 403 && isGuest()) {
        toast.error('Please register to save recipes');
      } else {
        toast.error(error.message || 'Failed to toggle save');
      }
    },
  });

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!canLikeRecipe()) {
      toast.error('Please register to like recipes');
      return;
    }
    
    likeMutation.mutate();
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!canSaveRecipe()) {
      toast.error('Please register to save recipes');
      return;
    }
    
    saveMutation.mutate();
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <Link to={`/recipes/${recipe.id}`} className="block">
        <CardHeader className="p-0">
          {recipe.imageUrl ? (
            <div className="w-full h-48 overflow-hidden rounded-t-lg">
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-t-lg">
              <ChefHat className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {recipe.createdByAI && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                AI Generated
              </span>
            )}
            {recipe.difficulty && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                recipe.difficulty === 'easy' 
                  ? 'bg-green-100 text-green-800'
                  : recipe.difficulty === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {recipe.difficulty}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{recipe.title}</h3>
          
          {recipe.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{recipe.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {recipe.servings} servings
            </div>
            {(recipe.prepTime || recipe.cookTime) && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
              </div>
            )}
            {recipe.totalCalories && (
              <div className="text-xs">
                {recipe.caloriesPer || Math.round(recipe.totalCalories / recipe.servings)} cal/serving
              </div>
            )}
          </div>

          {recipe.cuisine && (
            <div className="text-sm text-blue-600 mb-2">{recipe.cuisine}</div>
          )}

          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {recipe.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
              {recipe.tags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  +{recipe.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {recipe.createdBy && (
            <div className="text-xs text-gray-500 mb-2">
              by {recipe.createdBy.name || recipe.createdBy.email}
            </div>
          )}
        </CardContent>
      </Link>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            {recipe._count?.likes || 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            {recipe._count?.comments || 0}
          </span>
          <span className="flex items-center gap-1">
            <Bookmark className="h-4 w-4" />
            {recipe._count?.savedBy || 0}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={likeMutation.isPending}
            className={`p-2 ${recipe.userInteractions?.isLiked ? 'text-red-600' : ''}`}
          >
            <Heart 
              className={`h-4 w-4 ${
                recipe.userInteractions?.isLiked ? 'fill-current' : ''
              }`} 
            />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className={`p-2 ${recipe.userInteractions?.isSaved ? 'text-blue-600' : ''}`}
          >
            <Bookmark 
              className={`h-4 w-4 ${
                recipe.userInteractions?.isSaved ? 'fill-current' : ''
              }`} 
            />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
