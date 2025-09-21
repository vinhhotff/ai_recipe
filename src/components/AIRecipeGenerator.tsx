import React, { useState } from 'react';
import { 
  ChefHat, 
  Clock, 
  Users, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Star,
  DollarSign
} from 'lucide-react';
import { 
  useGenerateRecipe, 
  useAIGenerationAvailable,
  validateGenerationRequest,
  formatCost,
  estimateGenerationTime,
  type InputIngredient,
  type RecipePreferences,
  type GeneratedRecipeResponse 
} from '../hooks/useAIRecipeGeneration';
import { PantryItem } from '../types';

interface AIRecipeGeneratorProps {
  ingredients: PantryItem[];
  onRecipeGenerated?: (recipe: GeneratedRecipeResponse) => void;
}

export const AIRecipeGenerator: React.FC<AIRecipeGeneratorProps> = ({
  ingredients,
  onRecipeGenerated
}) => {
  const [preferences, setPreferences] = useState<RecipePreferences>({
    diet: 'none',
    difficulty: 'easy',
    servings: 2,
    timeLimit: 30
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipeResponse | null>(null);

  const { mutate: generateRecipe, isPending, error, isSuccess } = useGenerateRecipe();
  const { isAvailable, reason } = useAIGenerationAvailable();

  // Convert PantryItem to InputIngredient format
  const formatIngredients = (items: PantryItem[]): InputIngredient[] => {
    return items.map(item => ({
      name: item.name,
      quantity: item.quantity?.toString() || '1',
      unit: item.unit || 'pcs'
    }));
  };

  const handleGenerateRecipe = () => {
    const inputIngredients = formatIngredients(ingredients);
    
    const request = {
      ingredients: inputIngredients,
      preferences,
      currency: 'VND' as const
    };

    const validation = validateGenerationRequest(request);
    
    if (!validation.isValid) {
      alert(`Lỗi: ${validation.errors.join(', ')}`);
      return;
    }

    generateRecipe(request, {
      onSuccess: (recipe) => {
        setGeneratedRecipe(recipe);
        onRecipeGenerated?.(recipe);
      }
    });
  };

  const estimatedTime = estimateGenerationTime(ingredients.length);

  if (!isAvailable) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-yellow-600" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-900">
              AI Recipe Generator không khả dụng
            </h3>
            <p className="text-yellow-700">
              {reason || 'Tính năng tạo công thức AI hiện không khả dụng.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (generatedRecipe) {
    return (
      <div className="space-y-6">
        {/* Generated Recipe Display */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="text-xl font-bold text-green-900">
                  Công thức đã tạo thành công!
                </h3>
                <p className="text-green-700">
                  Thời gian xử lý: {(generatedRecipe.processingTimeMs / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
            <button
              onClick={() => setGeneratedRecipe(null)}
              className="px-4 py-2 bg-white text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
            >
              Tạo công thức mới
            </button>
          </div>

          {/* Recipe Title and Info */}
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
            <h4 className="text-2xl font-bold text-gray-900 mb-4">
              {generatedRecipe.title}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center space-x-2 text-gray-600">
                <Users className="w-5 h-5" />
                <span>{generatedRecipe.servings} phần</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="w-5 h-5" />
                <span>{generatedRecipe.estimatedTime} phút</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Star className="w-5 h-5" />
                <span className="capitalize">{generatedRecipe.difficulty}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <DollarSign className="w-5 h-5" />
                <span>{formatCost(generatedRecipe.totalCost, generatedRecipe.currency)} {generatedRecipe.currency}</span>
              </div>
            </div>

            {/* Missing Prices Warning */}
            {generatedRecipe.hasMissingPrices && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-amber-900 mb-1">
                      Một số nguyên liệu chưa có giá
                    </h5>
                    <p className="text-amber-700 text-sm">
                      {generatedRecipe.missingPriceIngredients.join(', ')} - 
                      Tổng giá có thể chưa chính xác hoàn toàn.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Nutrition */}
            {generatedRecipe.nutrition && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h5 className="font-semibold text-blue-900 mb-3">Thông tin dinh dưỡng (ước tính)</h5>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600 font-medium">Calories:</span>
                    <p className="text-blue-800 font-bold">{generatedRecipe.nutrition.calories}</p>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Protein:</span>
                    <p className="text-blue-800 font-bold">{generatedRecipe.nutrition.protein}g</p>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Fat:</span>
                    <p className="text-blue-800 font-bold">{generatedRecipe.nutrition.fat}g</p>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Carbs:</span>
                    <p className="text-blue-800 font-bold">{generatedRecipe.nutrition.carbs}g</p>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Fiber:</span>
                    <p className="text-blue-800 font-bold">{generatedRecipe.nutrition.fiber}g</p>
                  </div>
                </div>
              </div>
            )}

            {/* Ingredients */}
            <div className="mb-6">
              <h5 className="font-semibold text-gray-900 mb-3">Nguyên liệu cần:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {generatedRecipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div>
                      <span className="font-medium text-gray-900">
                        {ingredient.ingredientName}
                      </span>
                      <span className="text-gray-600 ml-2">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    </div>
                    <div className="text-right">
                      {ingredient.totalCost ? (
                        <span className="text-green-600 font-medium">
                          {formatCost(ingredient.totalCost, ingredient.currency)}
                        </span>
                      ) : (
                        <span className="text-amber-600 text-sm">Chưa có giá</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cooking Steps */}
            <div>
              <h5 className="font-semibold text-gray-900 mb-3">Hướng dẫn nấu:</h5>
              <div className="space-y-3">
                {generatedRecipe.steps.map((step, index) => (
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
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">AI Recipe Generator</h3>
          <p className="text-gray-600">
            Tạo công thức nấu ăn từ {ingredients.length} nguyên liệu có sẵn
          </p>
        </div>
      </div>

      {ingredients.length === 0 ? (
        <div className="text-center py-8">
          <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-500 mb-2">
            Chưa có nguyên liệu nào
          </h4>
          <p className="text-gray-400">
            Hãy thêm nguyên liệu để bắt đầu tạo công thức
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Preferences */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Khẩu phần
              </label>
              <select
                value={preferences.servings}
                onChange={(e) => setPreferences(prev => ({ ...prev, servings: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              >
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num} người</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thời gian
              </label>
              <select
                value={preferences.timeLimit}
                onChange={(e) => setPreferences(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              >
                <option value={15}>15 phút</option>
                <option value={30}>30 phút</option>
                <option value={45}>45 phút</option>
                <option value={60}>1 giờ</option>
                <option value={90}>1.5 giờ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Độ khó
              </label>
              <select
                value={preferences.difficulty}
                onChange={(e) => setPreferences(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              >
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chế độ ăn
              </label>
              <select
                value={preferences.diet}
                onChange={(e) => setPreferences(prev => ({ ...prev, diet: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              >
                <option value="none">Bình thường</option>
                <option value="vegetarian">Chay</option>
                <option value="vegan">Thuần chay</option>
                <option value="halal">Halal</option>
              </select>
            </div>
          </div>

          {/* Advanced Preferences */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              {showAdvanced ? 'Ẩn tùy chọn nâng cao' : 'Hiển thị tùy chọn nâng cao'}
            </button>
            
            {showAdvanced && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yêu cầu đặc biệt (các tag)
                </label>
                <input
                  type="text"
                  placeholder="nhanh, đơn giản, ít dầu mỡ..."
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                    setPreferences(prev => ({ ...prev, tags }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cách nhau bằng dấu phẩy
                </p>
              </div>
            )}
          </div>

          {/* Generation Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm text-blue-700">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Dự kiến: ~{Math.ceil(estimatedTime / 1000)}s</span>
              </div>
              <div className="flex items-center space-x-2">
                <ChefHat className="w-4 h-4" />
                <span>{ingredients.length} nguyên liệu</span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <h5 className="font-semibold text-red-900">Lỗi tạo công thức</h5>
                  <p className="text-red-700 text-sm">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerateRecipe}
            disabled={isPending || ingredients.length === 0}
            className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang tạo công thức...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Tạo công thức AI</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
