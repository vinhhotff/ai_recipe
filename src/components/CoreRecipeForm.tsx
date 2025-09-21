import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { 
  useCreateCoreRecipe, 
  useUpdateCoreRecipe, 
  useIngredients,
  type CreateRecipeData,
  type CoreRecipe
} from '../hooks/useCoreRecipes';
import {
  useIngredients as usePricingIngredients,
  useComputeRecipeCost,
  useUnitOptions,
  formatCurrency,
  type RecipeIngredient
} from '../hooks/useIngredientPricing';

interface CoreRecipeFormProps {
  recipe?: CoreRecipe;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData extends CreateRecipeData {
  // Form-specific fields if needed
}

export const CoreRecipeForm: React.FC<CoreRecipeFormProps> = ({
  recipe,
  onSuccess,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hooks
  const createMutation = useCreateCoreRecipe();
  const updateMutation = useUpdateCoreRecipe();
  const { data: ingredientsResponse, isLoading: loadingIngredients } = useIngredients();
  const { data: pricingIngredientsResponse, isLoading: loadingPricingIngredients } = usePricingIngredients();
  const unitOptions = useUnitOptions();
  
  const ingredients = ingredientsResponse?.data || [];
  const pricingIngredients = pricingIngredientsResponse?.data || [];
  const isEditing = !!recipe;

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      steps: [''],
      ingredients: [{ ingredientId: '', quantity: '', unit: 'g' }],
      nutrition: {
        calories: undefined,
        protein: undefined,
        fat: undefined,
        carbs: undefined,
      },
    },
  });

  const {
    fields: stepFields,
    append: appendStep,
    remove: removeStep,
  } = useFieldArray({
    control,
    name: 'steps',
  });

  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
  } = useFieldArray({
    control,
    name: 'ingredients',
  });

  // Watch ingredients for live cost calculation
  const watchedIngredients = useWatch({
    control,
    name: 'ingredients',
  }) as { ingredientId: string; quantity: string; unit: string }[];

  // Transform watched ingredients for cost calculation
  const recipeIngredientsForCosting = useMemo(() => {
    return (watchedIngredients || []).map((ing) => ({
      ingredientId: ing.ingredientId || '',
      quantity: ing.quantity || '0',
      unit: ing.unit || 'g',
    }));
  }, [watchedIngredients]);

  // Compute recipe cost with debouncing
  const { 
    data: costData, 
    isLoading: costLoading, 
    error: costError 
  } = useComputeRecipeCost(recipeIngredientsForCosting, 'VND', 500);

  // Populate form when editing
  useEffect(() => {
    if (recipe) {
      reset({
        title: recipe.title,
        description: recipe.description || '',
        steps: recipe.steps.length > 0 ? recipe.steps : [''],
        ingredients: recipe.ingredients.length > 0 
          ? recipe.ingredients.map(ing => ({
              ingredientId: ing.ingredientId,
              quantity: ing.quantity,
              unit: ing.unit,
            }))
          : [{ ingredientId: '', quantity: '', unit: 'g' }],
        nutrition: recipe.nutrition || {
          calories: undefined,
          protein: undefined,
          fat: undefined,
          carbs: undefined,
        },
      });
    }
  }, [recipe, reset]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      // Filter out empty steps
      const filteredSteps = data.steps.filter(step => step.trim() !== '');
      
      // Filter out incomplete ingredients
      const filteredIngredients = data.ingredients.filter(
        ing => ing.ingredientId && ing.quantity && ing.unit
      );

      const submitData = {
        ...data,
        steps: filteredSteps,
        ingredients: filteredIngredients,
      };

      if (isEditing && recipe) {
        await updateMutation.mutateAsync({ id: recipe.id, recipe: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting recipe:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const unitOptions = ['g', 'kg', 'ml', 'l', 'pcs', 'tsp', 'tbsp', 'cup'];

  return (
    <div className=\"bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto\">
      <h2 className=\"text-2xl font-bold mb-6\">
        {isEditing ? 'Chỉnh sửa công thức' : 'Tạo công thức mới'}
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className=\"space-y-6\">
        {/* Title */}
        <div>
          <label htmlFor=\"title\" className=\"block text-sm font-medium text-gray-700 mb-1\">
            Tên công thức *
          </label>
          <input
            {...register('title', { required: 'Tên công thức là bắt buộc' })}
            type=\"text\"
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
            placeholder=\"Ví dụ: Trứng chiên cà chua\"
          />
          {errors.title && (
            <p className=\"text-red-500 text-sm mt-1\">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor=\"description\" className=\"block text-sm font-medium text-gray-700 mb-1\">
            Mô tả
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
            placeholder=\"Mô tả ngắn về công thức...\"
          />
        </div>

        {/* Steps */}
        <div>
          <label className=\"block text-sm font-medium text-gray-700 mb-2\">
            Các bước thực hiện *
          </label>
          <div className=\"space-y-2\">
            {stepFields.map((field, index) => (
              <div key={field.id} className=\"flex items-center space-x-2\">
                <span className=\"text-sm font-medium text-gray-500 min-w-[30px]\">{index + 1}.</span>
                <input
                  {...register(`steps.${index}`, { 
                    required: index === 0 ? 'Ít nhất một bước là bắt buộc' : false 
                  })}
                  type=\"text\"
                  className=\"flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
                  placeholder=\"Nhập bước thực hiện...\"
                />
                {index > 0 && (
                  <button
                    type=\"button\"
                    onClick={() => removeStep(index)}
                    className=\"px-3 py-2 text-red-600 hover:bg-red-50 rounded-md\"
                  >
                    Xóa
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type=\"button\"
            onClick={() => appendStep('')}
            className=\"mt-2 px-4 py-2 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50\"
          >
            + Thêm bước
          </button>
          {errors.steps?.[0] && (
            <p className=\"text-red-500 text-sm mt-1\">{errors.steps[0].message}</p>
          )}
        </div>

        {/* Ingredients */}
        <div>
          <label className=\"block text-sm font-medium text-gray-700 mb-2\">
            Nguyên liệu *
          </label>
          {loadingIngredients || loadingPricingIngredients ? (
            <div className=\"text-gray-500\">Đang tải nguyên liệu...</div>
          ) : (
            <div className=\"space-y-3\">
              {ingredientFields.map((field, index) => {
                const currentIngredientId = watchedIngredients?.[index]?.ingredientId;
                const currentIngredient = pricingIngredients.find(ing => ing.id === currentIngredientId);
                const costBreakdown = costData?.ingredients.find(ing => ing.ingredientId === currentIngredientId);
                
                return (
                  <div key={field.id} className=\"space-y-2\">
                    <div className=\"grid grid-cols-12 gap-2 items-center\">
                      <div className=\"col-span-5\">
                        <select
                          {...register(`ingredients.${index}.ingredientId`, {
                            required: index === 0 ? 'Ít nhất một nguyên liệu là bắt buộc' : false,
                          })}
                          className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
                        >
                          <option value=\"\">Chọn nguyên liệu...</option>
                          {pricingIngredients.map((ingredient) => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name} {!ingredient.basePrice && '(⚠️ chưa có giá)'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className=\"col-span-3\">
                        <input
                          {...register(`ingredients.${index}.quantity`, {
                            required: index === 0 ? 'Số lượng là bắt buộc' : false,
                          })}
                          type=\"number\"
                          step=\"0.001\"
                          min=\"0\"
                          placeholder=\"Số lượng\"
                          className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
                        />
                      </div>
                      <div className=\"col-span-2\">
                        <select
                          {...register(`ingredients.${index}.unit`, {
                            required: index === 0 ? 'Đơn vị là bắt buộc' : false,
                          })}
                          className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
                        >
                          {unitOptions.map((group) => (
                            <optgroup key={group.group} label={group.group}>
                              {group.options.map((unit) => (
                                <option key={unit.value} value={unit.value}>
                                  {unit.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div className=\"col-span-2\">
                        {index > 0 && (
                          <button
                            type=\"button\"
                            onClick={() => removeIngredient(index)}
                            className=\"px-3 py-2 text-red-600 hover:bg-red-50 rounded-md\"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Cost breakdown for this ingredient */}
                    {costBreakdown && (
                      <div className=\"text-sm text-gray-600 ml-2\">
                        {costBreakdown.missingPrice ? (
                          <span className=\"text-orange-600\">⚠️ Chưa có giá cho nguyên liệu này</span>
                        ) : (
                          <span>
                            {formatCurrency(costBreakdown.pricePerUnit)} / {costBreakdown.unit} → {formatCurrency(costBreakdown.totalCost)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <button
            type=\"button\"
            onClick={() => appendIngredient({ ingredientId: '', quantity: '', unit: 'g' })}
            className=\"mt-2 px-4 py-2 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50\"
          >
            + Thêm nguyên liệu
          </button>
          {errors.ingredients?.[0]?.ingredientId && (
            <p className=\"text-red-500 text-sm mt-1\">{errors.ingredients[0].ingredientId.message}</p>
          )}

          {/* Total Cost Display */}
          {costData && (
            <div className=\"mt-4 p-4 bg-gray-50 rounded-lg border\">
              <div className=\"flex justify-between items-center mb-2\">
                <h3 className=\"font-semibold text-gray-900\">Tổng chi phí công thức</h3>
                <div className=\"flex items-center space-x-2\">
                  {costLoading && (
                    <div className=\"animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600\"></div>
                  )}
                  <span className=\"text-lg font-bold text-blue-600\">
                    {formatCurrency(costData.totalCost)}
                  </span>
                </div>
              </div>
              
              {costData.hasMissingPrices && (
                <div className=\"text-sm text-orange-600 mb-2\">
                  ⚠️ {costData.missingPriceIngredients.length} nguyên liệu chưa có giá. Tổng chi phí có thể cao hơn.
                </div>
              )}
              
              <details className=\"text-sm text-gray-600\">
                <summary className=\"cursor-pointer hover:text-gray-800\">Chi tiết giá</summary>
                <div className=\"mt-2 space-y-1\">
                  {costData.ingredients.map((breakdown) => (
                    <div key={breakdown.ingredientId} className=\"flex justify-between\">
                      <span>{breakdown.ingredientName} ({breakdown.quantity} {breakdown.unit})</span>
                      <span className={breakdown.missingPrice ? 'text-orange-600' : ''}>
                        {breakdown.missingPrice ? 'Chưa có giá' : formatCurrency(breakdown.totalCost)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {costError && (
            <div className=\"mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600\">
              Lỗi khi tính giá: {costError.message || 'Không thể tính toán giá'}
            </div>
          )}
        </div>

        {/* Nutrition (Optional) */}
        <div>
          <label className=\"block text-sm font-medium text-gray-700 mb-2\">
            Thông tin dinh dưỡng (tùy chọn)
          </label>
          <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4\">
            <div>
              <label className=\"block text-xs text-gray-600\">Calories</label>
              <input
                {...register('nutrition.calories', { valueAsNumber: true })}
                type=\"number\"
                className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
                placeholder=\"0\"
              />
            </div>
            <div>
              <label className=\"block text-xs text-gray-600\">Protein (g)</label>
              <input
                {...register('nutrition.protein', { valueAsNumber: true })}
                type=\"number\"
                className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
                placeholder=\"0\"
              />
            </div>
            <div>
              <label className=\"block text-xs text-gray-600\">Fat (g)</label>
              <input
                {...register('nutrition.fat', { valueAsNumber: true })}
                type=\"number\"
                className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
                placeholder=\"0\"
              />
            </div>
            <div>
              <label className=\"block text-xs text-gray-600\">Carbs (g)</label>
              <input
                {...register('nutrition.carbs', { valueAsNumber: true })}
                type=\"number\"
                className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
                placeholder=\"0\"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className=\"flex justify-end space-x-4 pt-4\">
          {onCancel && (
            <button
              type=\"button\"
              onClick={onCancel}
              className=\"px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50\"
            >
              Hủy
            </button>
          )}
          <button
            type=\"submit\"
            disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
            className=\"px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed\"
          >
            {isSubmitting || createMutation.isPending || updateMutation.isPending
              ? 'Đang xử lý...'
              : isEditing
              ? 'Cập nhật'
              : 'Tạo công thức'}
          </button>
        </div>
      </form>
    </div>
  );
};
