import React, { useState } from 'react';
import { CoreRecipeList } from './CoreRecipeList';
import { CoreRecipeForm } from './CoreRecipeForm';
import { CoreRecipeDetail } from './CoreRecipeDetail';
import { RecipeDetailModal } from './RecipeDetailModal';
import { type CoreRecipe } from '../hooks/useCoreRecipes';

type ViewMode = 'list' | 'create' | 'edit';

export const CoreRecipeManager: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<CoreRecipe | null>(null);
  const [modalRecipeId, setModalRecipeId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateNew = () => {
    setSelectedRecipe(null);
    setViewMode('create');
  };

  const handleEdit = (recipe: CoreRecipe) => {
    setSelectedRecipe(recipe);
    setViewMode('edit');
  };

  const handleView = (recipe: CoreRecipe) => {
    setSelectedRecipe(recipe);
    setViewMode('detail'); // Kếp lại cho nút "Xem" truyền thống
  };

  const handleCardClick = (recipeId: string) => {
    setModalRecipeId(recipeId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalRecipeId(null);
  };

  const handleBack = () => {
    setSelectedRecipe(null);
    setViewMode('list');
  };

  const handleSuccess = () => {
    setSelectedRecipe(null);
    setViewMode('list');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {viewMode === 'list' && (
          <CoreRecipeList
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onView={handleView}
            onCardClick={handleCardClick}
          />
        )}
        
        {(viewMode === 'create' || viewMode === 'edit') && (
          <CoreRecipeForm
            recipe={viewMode === 'edit' ? selectedRecipe || undefined : undefined}
            onSuccess={handleSuccess}
            onCancel={handleBack}
          />
        )}
        
        {viewMode === 'detail' && selectedRecipe && (
          <CoreRecipeDetail
            recipe={selectedRecipe}
            onEdit={handleEdit}
            onBack={handleBack}
          />
        )}
        
        {/* Modal cho chi tiết recipe */}
        {modalRecipeId && (
          <RecipeDetailModal
            recipeId={modalRecipeId}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
};
