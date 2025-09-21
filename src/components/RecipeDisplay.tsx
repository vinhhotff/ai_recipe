import React, { useState } from 'react';
import { 
  Clock, Users, Zap, DollarSign, Share2, Download, 
  ShoppingCart, ChefHat, Star, Timer 
} from 'lucide-react';
import { GeneratedRecipe } from '../types';

interface RecipeDisplayProps {
  recipe: GeneratedRecipe;
}

export const RecipeDisplay: React.FC<RecipeDisplayProps> = ({ recipe }) => {
  const [activeTab, setActiveTab] = useState<'recipe' | 'shopping' | 'nutrition'>('recipe');
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);

  const toggleStep = (stepOrder: number) => {
    setCheckedSteps(prev => 
      prev.includes(stepOrder)
        ? prev.filter(s => s !== stepOrder)
        : [...prev, stepOrder]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Dễ';
      case 'medium': return 'Trung bình';
      case 'hard': return 'Khó';
      default: return difficulty;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Recipe Header */}
      <div className="relative">
        {recipe.imageUrl && (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.title}
            className="w-full h-64 object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{recipe.title}</h1>
          {recipe.description && (
            <p className="text-gray-200 text-lg">{recipe.description}</p>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <button className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
            <Share2 className="w-5 h-5 text-gray-700" />
          </button>
          <button className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
            <Download className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Recipe Stats */}
      <div className="p-6 border-b border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <Users className="w-6 h-6 text-gray-500 mx-auto mb-1" />
            <p className="text-sm text-gray-600">Khẩu phần</p>
            <p className="font-semibold">{recipe.servings}</p>
          </div>
          <div className="text-center">
            <Clock className="w-6 h-6 text-gray-500 mx-auto mb-1" />
            <p className="text-sm text-gray-600">Thời gian</p>
            <p className="font-semibold">{recipe.estimatedTimeMinutes} phút</p>
          </div>
          <div className="text-center">
            <Zap className="w-6 h-6 text-gray-500 mx-auto mb-1" />
            <p className="text-sm text-gray-600">Calories</p>
            <p className="font-semibold">{recipe.caloriesPerServing}/khẩu phần</p>
          </div>
          {recipe.estimatedCostVND && (
            <div className="text-center">
              <DollarSign className="w-6 h-6 text-gray-500 mx-auto mb-1" />
              <p className="text-sm text-gray-600">Chi phí</p>
              <p className="font-semibold">{formatCurrency(recipe.estimatedCostVND)}</p>
            </div>
          )}
          <div className="text-center">
            <ChefHat className="w-6 h-6 text-gray-500 mx-auto mb-1" />
            <p className="text-sm text-gray-600">Độ khó</p>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
              {getDifficultyText(recipe.difficulty)}
            </span>
          </div>
        </div>

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {recipe.tags.map((tag) => (
              <span 
                key={tag}
                className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'recipe', label: 'Công thức', icon: ChefHat },
            { key: 'shopping', label: 'Mua sắm', icon: ShoppingCart },
            { key: 'nutrition', label: 'Dinh dưỡng', icon: Star }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'recipe' && (
          <div className="space-y-8">
            {/* Ingredients */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Nguyên liệu ({recipe.ingredients.length})
              </h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                      <span className="font-medium text-gray-900">{ingredient.name}</span>
                      <span className="text-gray-600">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Steps */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Cách làm ({recipe.steps.length} bước)
              </h3>
              <div className="space-y-4">
                {recipe.steps.map((step) => (
                  <div 
                    key={step.order}
                    className={`border border-gray-200 rounded-xl p-4 transition-colors ${
                      checkedSteps.includes(step.order) ? 'bg-green-50 border-green-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <button
                        onClick={() => toggleStep(step.order)}
                        className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold text-sm transition-colors ${
                          checkedSteps.includes(step.order)
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 text-gray-600 hover:border-orange-500'
                        }`}
                      >
                        {checkedSteps.includes(step.order) ? '✓' : step.order}
                      </button>
                      <div className="flex-1">
                        <p className={`text-gray-900 leading-relaxed ${
                          checkedSteps.includes(step.order) ? 'line-through opacity-75' : ''
                        }`}>
                          {step.text}
                        </p>
                        
                        <div className="flex items-center space-x-4 mt-2">
                          {step.durationMinutes && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <Timer className="w-4 h-4" />
                              <span>{step.durationMinutes} phút</span>
                            </div>
                          )}
                          {step.tips && (
                            <div className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
                              💡 {step.tips}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shopping' && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Danh sách mua sắm
            </h3>
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="space-y-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <label key={index} className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <span className="flex-1 text-gray-900">
                      {ingredient.name} - {ingredient.quantity} {ingredient.unit}
                    </span>
                  </label>
                ))}
              </div>
              
              {recipe.estimatedCostVND && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Tổng ước tính:</span>
                    <span className="text-xl font-bold text-orange-600">
                      {formatCurrency(recipe.estimatedCostVND)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Thông tin dinh dưỡng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Tổng quan</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Calories tổng:</span>
                    <span className="font-semibold">{recipe.totalCalories} kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Calories/khẩu phần:</span>
                    <span className="font-semibold">{recipe.caloriesPerServing} kcal</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Macronutrients</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Protein:</span>
                    <span className="font-semibold">{recipe.nutrition.protein_g}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Chất béo:</span>
                    <span className="font-semibold">{recipe.nutrition.fat_g}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Carbs:</span>
                    <span className="font-semibold">{recipe.nutrition.carbs_g}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Chất xơ:</span>
                    <span className="font-semibold">{recipe.nutrition.fiber_g}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Natri:</span>
                    <span className="font-semibold">{recipe.nutrition.sodium_mg}mg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};