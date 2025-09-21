import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ChefHat, 
  Utensils, 
  BookOpen, 
  TrendingUp, 
  Plus,
  Clock,
  Star,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

const DashboardPage: React.FC = () => {
  const { user, hasUsageLeft } = useAuth();

  // Fetch user's recent recipes
  const { data: recentRecipes, isLoading: recipesLoading } = useQuery({
    queryKey: ['recipes', 'recent'],
    queryFn: () => apiClient.getUserRecipes(1, 6),
    enabled: !!user,
  });

  // Fetch ingredients count
  const { data: ingredientsData, isLoading: ingredientsLoading } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => apiClient.getIngredients(),
    enabled: !!user,
  });

  const quickActions = [
    {
      title: 'Generate Recipe',
      description: 'Create a new recipe from your ingredients',
      icon: ChefHat,
      href: '/app/recipe-generator',
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-white',
      disabled: !hasUsageLeft('recipe_generation'),
    },
    {
      title: 'Manage Ingredients',
      description: 'Update your pantry and ingredient list',
      icon: Utensils,
      href: '/app/ingredients',
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-white',
      disabled: false,
    },
    {
      title: 'View Recipes',
      description: 'Browse your saved recipe collection',
      icon: BookOpen,
      href: '/app/recipes',
      color: 'bg-purple-500 hover:bg-purple-600',
      textColor: 'text-white',
      disabled: false,
    },
  ];

  const stats = [
    {
      name: 'Available Ingredients',
      value: ingredientsData?.data?.length || 0,
      icon: Utensils,
      color: 'text-green-600 bg-green-100',
      loading: ingredientsLoading,
    },
    {
      name: 'Saved Recipes',
      value: recentRecipes?.meta?.total || 0,
      icon: BookOpen,
      color: 'text-purple-600 bg-purple-100',
      loading: recipesLoading,
    },
    {
      name: 'Recipes Remaining',
      value: user?.subscription?.usageQuota?.recipeGenerationsLeft || 0,
      icon: ChefHat,
      color: 'text-blue-600 bg-blue-100',
      loading: false,
    },
    {
      name: 'Videos Remaining',
      value: user?.subscription?.usageQuota?.videoGenerationsLeft || 0,
      icon: TrendingUp,
      color: 'text-orange-600 bg-orange-100',
      loading: false,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-blue-100">
          Ready to create something delicious? Let's see what we can cook up today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className={cn('p-2 rounded-lg', stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subscription Status */}
      {user?.subscription && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Current Plan: {user.subscription.planName}
              </h3>
              <p className="text-gray-600">
                {user.subscription.status === 'ACTIVE' ? 'Active' : user.subscription.status}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-2">Usage this month</div>
              <div className="flex space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {user.subscription.usageQuota.recipeGenerationsLeft}
                  </div>
                  <div className="text-xs text-gray-500">Recipes left</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {user.subscription.usageQuota.videoGenerationsLeft}
                  </div>
                  <div className="text-xs text-gray-500">Videos left</div>
                </div>
              </div>
            </div>
          </div>
          
          {(user.subscription.usageQuota.recipeGenerationsLeft <= 2 || 
            user.subscription.usageQuota.videoGenerationsLeft <= 1) && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-800">
                You're running low on usage. Consider upgrading your plan for unlimited access!
              </p>
              <Link
                to="/subscription/plans"
                className="text-yellow-600 hover:text-yellow-500 text-sm font-medium"
              >
                View Plans →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className={cn(
                'block p-6 rounded-lg transition-all duration-200 transform hover:scale-105',
                action.disabled 
                  ? 'bg-gray-100 cursor-not-allowed opacity-50' 
                  : `${action.color} ${action.textColor} shadow-lg`
              )}
              onClick={(e) => action.disabled && e.preventDefault()}
            >
              <action.icon className="w-8 h-8 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
              <p className={action.disabled ? 'text-gray-500' : 'opacity-90'}>
                {action.disabled ? 'Not available on current plan' : action.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Recipes */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Recipes</h2>
          <Link
            to="/app/recipes"
            className="text-blue-600 hover:text-blue-500 font-medium flex items-center"
          >
            View all <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>

        {recipesLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : recentRecipes?.data?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentRecipes.data.slice(0, 6).map((recipe: any, index: number) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center mb-2">
                    <ChefHat className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">
                      {recipe.cuisine || 'International'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {recipe.title || `Recipe ${index + 1}`}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{recipe.cookingTime || '30 min'}</span>
                    <Star className="w-4 h-4 ml-3 mr-1" />
                    <span>{recipe.difficulty || 'Medium'}</span>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {recipe.description || 'A delicious recipe generated just for you.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes yet</h3>
            <p className="text-gray-600 mb-4">
              Start by generating your first recipe from your available ingredients!
            </p>
            <Link
              to="/app/recipe-generator"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Recipe
            </Link>
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Pro Tips</h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
            <p className="text-gray-700">
              Keep your ingredient list updated for more accurate recipe suggestions.
            </p>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
            <p className="text-gray-700">
              Try different cuisine types to discover new flavors and cooking techniques.
            </p>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3"></div>
            <p className="text-gray-700">
              Save recipes you love to build your personal cookbook.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
