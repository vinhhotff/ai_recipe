import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import { RecipeCard } from './RecipeCard';
import { RecipeFilters } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Pagination } from '@/components/ui/Pagination';
import { Link } from 'react-router-dom';

export const RecipeList: React.FC = () => {
  const { canCreateRecipe } = useAuth();
  const [filters, setFilters] = useState<RecipeFilters>({
    page: 1,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['recipes', filters],
    queryFn: () => apiClient.getRecipes(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const recipes = data?.data || [];
  const meta = data?.meta;

  const handleFilterChange = (key: keyof RecipeFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1,
    }));
  };

  const handleSearch = (searchTerm: string) => {
    handleFilterChange('search', searchTerm || undefined);
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load recipes. Please try again.</p>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
          <p className="text-gray-600">Discover amazing recipes from our community</p>
        </div>
        
        {canCreateRecipe() && (
          <div className="flex gap-2">
            <Link to="/recipes/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Recipe
              </Button>
            </Link>
            <Link to="/recipes/generate">
              <Button variant="outline">
                AI Generate
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Simple Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search recipes..."
          value={filters.search || ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 max-w-md"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Results */}
      {!isLoading && (
        <>
          {recipes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {filters.search 
                  ? 'No recipes found matching your search.'
                  : 'No recipes available yet.'}
              </div>
              {canCreateRecipe() && (
                <div className="space-x-2">
                  <Link to="/recipes/create">
                    <Button>
                      Create First Recipe
                    </Button>
                  </Link>
                  <Link to="/recipes/generate">
                    <Button variant="outline">
                      Generate with AI
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Results count */}
              {meta && (
                <div className="text-sm text-gray-600">
                  Showing {(meta.page - 1) * meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} recipes
                </div>
              )}

              {/* Recipe Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {recipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex justify-center">
                  <Pagination
                    currentPage={meta.page}
                    totalPages={meta.totalPages}
                    onPageChange={(page) => handleFilterChange('page', page)}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
