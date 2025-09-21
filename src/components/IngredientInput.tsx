import React, { useState } from 'react';
import { Camera, Upload, Plus, X, Check } from 'lucide-react';
import { apiClient } from '../lib/api';
import { PantryItem } from '../types';

interface IngredientInputProps {
  ingredients: PantryItem[];
  onIngredientsChange: (ingredients: PantryItem[]) => void;
}

export const IngredientInput: React.FC<IngredientInputProps> = ({
  ingredients,
  onIngredientsChange
}) => {
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedIngredients, setRecognizedIngredients] = useState<PantryItem[]>([]);
  const [showRecognized, setShowRecognized] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    
    try {
      const result = await apiClient.uploadImage(file);
      
      const recognizedItems: PantryItem[] = result.recognized.map((item: any, index: number) => ({
        id: `recognized-${index}`,
        name: item.name,
        normalized: item.normalized,
        quantity: 1,
        unit: 'quả',
        note: `Confidence: ${Math.round(item.confidence * 100)}%`
      }));
      
      setRecognizedIngredients(recognizedItems);
      setShowRecognized(true);
    } catch (error) {
      console.error('Image recognition failed:', error);
      // Show error message to user
    } finally {
      setIsProcessing(false);
    }
  };

  const addManualIngredient = () => {
    if (!manualInput.trim()) return;

    const newIngredient: PantryItem = {
      id: Date.now().toString(),
      name: manualInput.trim(),
      normalized: manualInput.trim().toLowerCase().replace(/\s+/g, '_'),
      note: 'Thêm thủ công'
    };

    onIngredientsChange([...ingredients, newIngredient]);
    setManualInput('');
  };

  const confirmRecognizedIngredients = () => {
    onIngredientsChange([...ingredients, ...recognizedIngredients]);
    setShowRecognized(false);
    setRecognizedIngredients([]);
  };

  const removeIngredient = (id: string) => {
    onIngredientsChange(ingredients.filter(ing => ing.id !== id));
  };

  const updateRecognizedIngredient = (id: string, updates: Partial<PantryItem>) => {
    setRecognizedIngredients(prev => 
      prev.map(ing => ing.id === id ? { ...ing, ...updates } : ing)
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Nhập nguyên liệu
        </h3>

        {/* Image Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Chụp ảnh nguyên liệu</p>
                  </>
                )}
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isProcessing}
              />
            </label>
          </div>

          <div>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Tải ảnh từ thiết bị</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isProcessing}
              />
            </label>
          </div>
        </div>

        {/* Manual Input */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addManualIngredient()}
            placeholder="Nhập nguyên liệu (vd: cà chua 2 quả, thịt bò 300g)"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
          <button
            onClick={addManualIngredient}
            className="px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Recognized Ingredients Confirmation */}
      {showRecognized && (
        <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
          <h4 className="text-lg font-semibold text-green-900 mb-4">
            Nguyên liệu được nhận diện
          </h4>
          <div className="space-y-3 mb-4">
            {recognizedIngredients.map((ingredient) => (
              <div key={ingredient.id} className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                <input
                  type="text"
                  value={ingredient.name}
                  onChange={(e) => updateRecognizedIngredient(ingredient.id, { name: e.target.value })}
                  className="flex-1 px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <input
                  type="number"
                  value={ingredient.quantity || ''}
                  onChange={(e) => updateRecognizedIngredient(ingredient.id, { quantity: parseFloat(e.target.value) })}
                  className="w-20 px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <input
                  type="text"
                  value={ingredient.unit || ''}
                  onChange={(e) => updateRecognizedIngredient(ingredient.id, { unit: e.target.value })}
                  className="w-16 px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
            ))}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={confirmRecognizedIngredients}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận</span>
            </button>
            <button
              onClick={() => setShowRecognized(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Current Ingredients */}
      {ingredients.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Nguyên liệu hiện tại ({ingredients.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {ingredients.map((ingredient) => (
              <div 
                key={ingredient.id}
                className="flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 py-2 rounded-full"
              >
                <span className="text-sm font-medium">
                  {ingredient.name}
                  {ingredient.quantity && ingredient.unit && 
                    ` ${ingredient.quantity} ${ingredient.unit}`
                  }
                </span>
                <button
                  onClick={() => removeIngredient(ingredient.id)}
                  className="text-orange-600 hover:text-orange-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};