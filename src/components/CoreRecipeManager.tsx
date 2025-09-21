import React, { useState } from 'react';
import { CoreRecipeList } from './CoreRecipeList';
import { CoreRecipeForm } from './CoreRecipeForm';
import { CoreRecipeDetail } from './CoreRecipeDetail';
import { type CoreRecipe } from '../hooks/useCoreRecipes';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

export const CoreRecipeManager: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<CoreRecipe | null>(null);

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
    setViewMode('detail');
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
    <div className=\"min-h-screen bg-gray-50 py-8\">
      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
        {viewMode === 'list' && (
          <CoreRecipeList
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onView={handleView}
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
      </div>
    </div>
  );
};
