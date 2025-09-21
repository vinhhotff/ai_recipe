import React from 'react';
import { useCoreRecipe, type CoreRecipe } from '../hooks/useCoreRecipes';

interface CoreRecipeDetailProps {
  recipeId?: string;
  recipe?: CoreRecipe;
  onEdit?: (recipe: CoreRecipe) => void;
  onBack?: () => void;
}

export const CoreRecipeDetail: React.FC<CoreRecipeDetailProps> = ({
  recipeId,
  recipe: propRecipe,
  onEdit,
  onBack,
}) => {
  const { 
    data: recipeResponse, 
    isLoading, 
    error 
  } = useCoreRecipe(recipeId || '');

  const recipe = propRecipe || recipeResponse?.data;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className=\"bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto\">
        <div className=\"animate-pulse space-y-6\">
          <div className=\"h-8 bg-gray-200 rounded w-3/4\"></div>
          <div className=\"h-4 bg-gray-200 rounded w-1/2\"></div>
          <div className=\"h-32 bg-gray-200 rounded\"></div>
          <div className=\"h-40 bg-gray-200 rounded\"></div>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className=\"bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto text-center\">
        <div className=\"text-red-600\">
          <h3 className=\"text-lg font-semibold mb-2\">Có lỗi xảy ra</h3>
          <p className=\"mb-4\">Không thể tải thông tin công thức. Vui lòng thử lại.</p>
          {onBack && (
            <button
              onClick={onBack}
              className=\"px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700\"
            >
              ← Quay lại
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className=\"bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto\">
      {/* Header */}
      <div className=\"flex flex-col sm:flex-row justify-between items-start mb-6 space-y-4 sm:space-y-0\">
        <div className=\"flex-1\">
          <h1 className=\"text-3xl font-bold text-gray-900 mb-2\">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className=\"text-gray-600 text-lg mb-4\">
              {recipe.description}
            </p>
          )}
          <div className=\"flex flex-wrap items-center text-sm text-gray-500 space-x-4\">
            <span>{recipe.ingredients.length} nguyên liệu</span>
            <span>{recipe.steps.length} bước</span>
            <span>Tạo: {formatDate(recipe.createdAt)}</span>
            {recipe.updatedAt !== recipe.createdAt && (
              <span>Cập nhật: {formatDate(recipe.updatedAt)}</span>
            )}
          </div>
        </div>
        
        <div className=\"flex items-center space-x-3\">
          {onBack && (
            <button
              onClick={onBack}
              className=\"px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50\"
            >
              ← Quay lại
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(recipe)}
              className=\"px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700\"
            >
              Chỉnh sửa
            </button>
          )}
        </div>
      </div>

      <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-8\">
        {/* Main Content */}
        <div className=\"lg:col-span-2 space-y-8\">
          {/* Ingredients */}
          <div>
            <h2 className=\"text-2xl font-semibold text-gray-900 mb-4\">
              Nguyên liệu
            </h2>
            <div className=\"bg-gray-50 rounded-lg p-4\">
              <div className=\"space-y-3\">
                {recipe.ingredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className=\"flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0\"
                  >
                    <span className=\"font-medium text-gray-900\">
                      {ingredient.ingredient.name}
                    </span>
                    <span className=\"text-gray-600\">
                      {ingredient.quantity} {ingredient.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Steps */}
          <div>
            <h2 className=\"text-2xl font-semibold text-gray-900 mb-4\">
              Các bước thực hiện
            </h2>
            <div className=\"space-y-4\">
              {recipe.steps.map((step, index) => (
                <div key={index} className=\"flex items-start space-x-4\">
                  <div className=\"flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm\">
                    {index + 1}
                  </div>
                  <div className=\"flex-1\">
                    <p className=\"text-gray-900 leading-relaxed\">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className=\"space-y-6\">
          {/* Nutrition Information */}
          {recipe.nutrition && (
            <div>
              <h3 className=\"text-lg font-semibold text-gray-900 mb-3\">
                Thông tin dinh dưỡng
              </h3>
              <div className=\"bg-blue-50 rounded-lg p-4 space-y-3\">
                {recipe.nutrition.calories && (
                  <div className=\"flex justify-between\">
                    <span className=\"text-gray-700\">Calories:</span>
                    <span className=\"font-medium text-gray-900\">
                      {recipe.nutrition.calories}
                    </span>
                  </div>
                )}
                {recipe.nutrition.protein && (
                  <div className=\"flex justify-between\">
                    <span className=\"text-gray-700\">Protein:</span>
                    <span className=\"font-medium text-gray-900\">
                      {recipe.nutrition.protein}g
                    </span>
                  </div>
                )}
                {recipe.nutrition.fat && (
                  <div className=\"flex justify-between\">
                    <span className=\"text-gray-700\">Fat:</span>
                    <span className=\"font-medium text-gray-900\">
                      {recipe.nutrition.fat}g
                    </span>
                  </div>
                )}
                {recipe.nutrition.carbs && (
                  <div className=\"flex justify-between\">
                    <span className=\"text-gray-700\">Carbs:</span>
                    <span className=\"font-medium text-gray-900\">
                      {recipe.nutrition.carbs}g
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recipe Info */}
          <div>
            <h3 className=\"text-lg font-semibold text-gray-900 mb-3\">
              Thông tin công thức
            </h3>
            <div className=\"bg-gray-50 rounded-lg p-4 space-y-3\">
              <div className=\"flex justify-between\">
                <span className=\"text-gray-700\">Số nguyên liệu:</span>
                <span className=\"font-medium text-gray-900\">
                  {recipe.ingredients.length}
                </span>
              </div>
              <div className=\"flex justify-between\">
                <span className=\"text-gray-700\">Số bước:</span>
                <span className=\"font-medium text-gray-900\">
                  {recipe.steps.length}
                </span>
              </div>
              {recipe.totalCost && (
                <div className=\"flex justify-between\">
                  <span className=\"text-gray-700\">Chi phí ước tính:</span>
                  <span className=\"font-medium text-gray-900\">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(Number(recipe.totalCost))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className=\"text-lg font-semibold text-gray-900 mb-3\">
              Hành động
            </h3>
            <div className=\"space-y-2\">
              <button
                onClick={() => window.print()}
                className=\"w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm\"
              >
                🖨️ In công thức
              </button>
              <button
                onClick={() => {
                  const text = `${recipe.title}\\n\\nNguyên liệu:\\n${recipe.ingredients.map(ing => `- ${ing.ingredient.name}: ${ing.quantity} ${ing.unit}`).join('\\n')}\\n\\nCách làm:\\n${recipe.steps.map((step, i) => `${i + 1}. ${step}`).join('\\n')}`;
                  navigator.clipboard.writeText(text);
                  alert('Đã sao chép công thức vào clipboard!');
                }}
                className=\"w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm\"
              >
                📋 Sao chép
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
