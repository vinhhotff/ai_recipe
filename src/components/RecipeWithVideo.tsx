import React from 'react';
import { RecipeVideo } from './RecipeVideo';
import { GeneratedRecipeResponse } from '../hooks/useAIRecipeGeneration';

interface RecipeWithVideoProps {
  aiRecipe: GeneratedRecipeResponse;
}

export const RecipeWithVideo: React.FC<RecipeWithVideoProps> = ({ aiRecipe }) => {
  const handleVideoGenerated = (videoId: string) => {
    console.log('Video generated with ID:', videoId);
    // You could show a success toast or update UI state here
  };

  return (
    <div className="space-y-6">
      {/* Recipe Information */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{aiRecipe.title}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center space-x-2 text-gray-600">
            <span>{aiRecipe.servings} phần</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <span>{aiRecipe.estimatedTime} phút</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <span className="capitalize">{aiRecipe.difficulty}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <span>{aiRecipe.totalCost} {aiRecipe.currency}</span>
          </div>
        </div>

        {/* Ingredients */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Nguyên liệu:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiRecipe.ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <span className="font-medium text-gray-900">
                    {ingredient.ingredientName}
                  </span>
                  <span className="text-gray-600 ml-2">
                    {ingredient.quantity} {ingredient.unit}
                  </span>
                </div>
                {ingredient.totalCost && (
                  <div className="text-right">
                    <span className="text-green-600 font-medium">
                      {ingredient.totalCost}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cooking Steps */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Hướng dẫn nấu:</h3>
          <div className="space-y-3">
            {aiRecipe.steps.map((step, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <p className="text-gray-700 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Video Generation Component */}
      <RecipeVideo
        recipeId={aiRecipe.recipeId}
        recipeTitle={aiRecipe.title}
        onVideoGenerated={handleVideoGenerated}
      />
    </div>
  );
};
