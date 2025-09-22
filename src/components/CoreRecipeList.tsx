import React, { useState } from 'react';
import { 
  useCoreRecipes, 
  useDeleteCoreRecipe, 
  type CoreRecipe 
} from '../hooks/useCoreRecipes';

interface CoreRecipeListProps {
  onEdit?: (recipe: CoreRecipe) => void;
  onView?: (recipe: CoreRecipe) => void;
  onCreateNew?: () => void;
  onCardClick?: (recipeId: string) => void; // Thêm prop để handle click vào card
}

export const CoreRecipeList: React.FC<CoreRecipeListProps> = ({
  onEdit,
  onView,
  onCreateNew,
  onCardClick,
}) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { 
    data: recipesResponse, 
    isLoading, 
    error 
  } = useCoreRecipes({ 
    page, 
    limit: 10, 
    search: search || undefined 
  });

  const deleteMutation = useDeleteCoreRecipe();

  const recipes = recipesResponse?.data || [];
  const meta = recipesResponse?.meta;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1); // Reset to first page when searching
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa công thức "${title}"?`)) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting recipe:', error);
        alert('Có lỗi xảy ra khi xóa công thức. Vui lòng thử lại.');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-red-600 text-center">
          <h3 className="text-lg font-semibold mb-2">Có lỗi xảy ra</h3>
          <p>Không thể tải danh sách công thức. Vui lòng thử lại.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-gray-900">
          Danh sách công thức ({meta?.total || 0})
        </h2>
        
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Tạo công thức mới
          </button>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex space-x-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm kiếm theo tên công thức..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Tìm kiếm
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setPage(1);
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Xóa
            </button>
          )}
        </div>
      </form>

      {/* Recipe List */}
      {recipes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <h3 className="text-lg font-medium mb-2">
            {search ? 'Không tìm thấy công thức nào' : 'Chưa có công thức nào'}
          </h3>
          <p className="mb-4">
            {search 
              ? `Không có công thức nào khớp với "${search}"`
              : 'Bắt đầu bằng cách tạo công thức đầu tiên của bạn!'
            }
          </p>
          {onCreateNew && !search && (
            <button
              onClick={onCreateNew}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Tạo công thức đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
                onCardClick ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/30' : ''
              }`}
              onClick={onCardClick ? () => onCardClick(recipe.id) : undefined}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start space-y-2 sm:space-y-0">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-blue-600 transition-colors">
                    {recipe.title}
                  </h3>
                  {recipe.description && (
                    <p className="text-gray-600 mb-2 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center text-sm text-gray-500 space-x-4">
                    <span>{recipe.ingredients.length} nguyên liệu</span>
                    <span>{recipe.steps.length} bước</span>
                    {recipe.nutrition?.calories && (
                      <span>{recipe.nutrition.calories} calories</span>
                    )}
                    <span>Tạo: {formatDate(recipe.createdAt)}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {onView && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Ngăn event bubbling
                        onView(recipe);
                      }}
                      className="px-3 py-1 text-blue-600 border border-blue-200 rounded hover:bg-blue-50 text-sm"
                    >
                      Xem
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Ngăn event bubbling
                        onEdit(recipe);
                      }}
                      className="px-3 py-1 text-green-600 border border-green-200 rounded hover:bg-green-50 text-sm"
                    >
                      Sửa
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Ngăn event bubbling
                      handleDelete(recipe.id, recipe.title);
                    }}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteMutation.isPending ? '...' : 'Xóa'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Hiển thị {((meta.page - 1) * meta.limit) + 1} - {Math.min(meta.page * meta.limit, meta.total)} trong tổng số {meta.total} công thức
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Trước
            </button>
            
            <span className="px-4 py-2 text-sm font-medium">
              Trang {page} / {meta.totalPages}
            </span>
            
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
