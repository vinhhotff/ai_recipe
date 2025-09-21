import React, { useState } from 'react';
import { Users, Clock, DollarSign, Heart, Zap } from 'lucide-react';
import { Diet, RecipeRequest } from '../types';

interface RecipeFormProps {
  onSubmit: (request: RecipeRequest) => void;
  isLoading: boolean;
  ingredients: string[];
}

export const RecipeForm: React.FC<RecipeFormProps> = ({
  onSubmit,
  isLoading,
  ingredients
}) => {
  const [servings, setServings] = useState(2);
  const [calories, setCalories] = useState<number | undefined>(undefined);
  const [maxTime, setMaxTime] = useState<number | undefined>(undefined);
  const [diet, setDiet] = useState<Diet>('NONE');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [budget, setBudget] = useState<number | undefined>(undefined);
  const [imageGeneration, setImageGeneration] = useState(true);

  const commonAllergies = [
    'Đậu phộng', 'Sữa', 'Trứng', 'Hải sản', 'Đậu nành', 'Lúa mì', 'Hạt cây'
  ];

  const dietOptions = [
    { value: 'NONE', label: 'Không hạn chế', icon: '🍽️' },
    { value: 'VEGETARIAN', label: 'Chay (có trứng/sữa)', icon: '🥗' },
    { value: 'VEGAN', label: 'Thuần chay', icon: '🌱' },
    { value: 'KETO', label: 'Keto', icon: '🥑' },
    { value: 'PALEO', label: 'Paleo', icon: '🍖' },
    { value: 'PESCETARIAN', label: 'Pescetarian', icon: '🐟' },
    { value: 'HALAL', label: 'Halal', icon: '☪️' },
  ] as const;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const request: RecipeRequest = {
      id: Date.now().toString(),
      ingredients,
      calories,
      servings,
      maxTimeMinutes: maxTime,
      diet,
      exclude: allergies,
      budgetVND: budget,
      locale: 'vi-VN',
      imageGeneration
    };

    onSubmit(request);
  };

  const toggleAllergy = (allergy: string) => {
    setAllergies(prev => 
      prev.includes(allergy) 
        ? prev.filter(a => a !== allergy)
        : [...prev, allergy]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Tạo công thức nấu ăn
        </h2>
        <p className="text-gray-600">
          Điều chỉnh các thông số để AI tạo công thức phù hợp với nhu cầu của bạn
        </p>
      </div>

      {/* Basic Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Số người ăn
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="number"
              min="1"
              max="20"
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value))}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Calo mục tiêu (tùy chọn)
          </label>
          <div className="relative">
            <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="number"
              min="100"
              max="5000"
              value={calories || ''}
              onChange={(e) => setCalories(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="vd: 800"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thời gian tối đa (phút)
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="number"
              min="5"
              max="480"
              value={maxTime || ''}
              onChange={(e) => setMaxTime(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="vd: 30"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* Diet Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Chế độ ăn
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {dietOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDiet(option.value)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                diet === option.value
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{option.icon}</div>
              <div className="text-xs font-medium">{option.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Dị ứng / Không ăn
        </label>
        <div className="flex flex-wrap gap-2">
          {commonAllergies.map((allergy) => (
            <button
              key={allergy}
              type="button"
              onClick={() => toggleAllergy(allergy)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                allergies.includes(allergy)
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {allergy}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ngân sách (VND, tùy chọn)
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="number"
            min="10000"
            max="1000000"
            step="10000"
            value={budget || ''}
            onChange={(e) => setBudget(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="vd: 100000"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Ước tính chi phí mua nguyên liệu
        </p>
      </div>

      {/* Options */}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="imageGeneration"
          checked={imageGeneration}
          onChange={(e) => setImageGeneration(e.target.checked)}
          className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
        />
        <label htmlFor="imageGeneration" className="text-sm font-medium text-gray-700">
          Tạo ảnh minh họa món ăn bằng AI
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || ingredients.length === 0}
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-red-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Đang tạo công thức...</span>
          </div>
        ) : (
          `🤖 Tạo công thức với ${ingredients.length} nguyên liệu`
        )}
      </button>

      {ingredients.length === 0 && (
        <p className="text-center text-sm text-red-500 mt-2">
          Vui lòng thêm ít nhất 1 nguyên liệu để tạo công thức
        </p>
      )}
    </form>
  );
};