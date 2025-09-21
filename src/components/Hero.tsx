import React from 'react';
import { ChefHat, Sparkles, Camera, Clock, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeroProps {
  onGetStarted: () => void;
  onViewCoreRecipes?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onGetStarted, onViewCoreRecipes }) => {
  const { user } = useAuth();
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-2xl shadow-lg">
              <ChefHat className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Nấu ăn thông minh với{' '}
            <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              AI Recipe
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Chụp ảnh nguyên liệu hoặc nhập thủ công, AI sẽ tạo công thức nấu ăn phù hợp với 
            calories, thời gian, và sở thích của bạn
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:scale-105 transition-transform">
              <div className="bg-orange-100 p-3 rounded-xl w-fit mx-auto mb-4">
                <Camera className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Nhận diện nguyên liệu</h3>
              <p className="text-gray-600 text-sm">Chụp ảnh để AI tự động nhận diện nguyên liệu có trong tủ lạnh</p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:scale-105 transition-transform">
              <div className="bg-green-100 p-3 rounded-xl w-fit mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI tạo công thức</h3>
              <p className="text-gray-600 text-sm">Công thức được tối ưu theo calories, thời gian và chế độ ăn</p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:scale-105 transition-transform">
              <div className="bg-blue-100 p-3 rounded-xl w-fit mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Nhanh & tiện lợi</h3>
              <p className="text-gray-600 text-sm">Chỉ trong vài phút, bạn có công thức chi tiết với ảnh minh họa</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <button
              onClick={onGetStarted}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xl font-semibold px-12 py-4 rounded-2xl shadow-lg hover:from-orange-600 hover:to-red-600 transform hover:scale-105 transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              🚀 Bắt đầu nấu ăn
            </button>
            
            {user && onViewCoreRecipes && (
              <button
                onClick={onViewCoreRecipes}
                className="bg-white text-gray-700 border-2 border-gray-300 text-xl font-semibold px-12 py-4 rounded-2xl shadow-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center space-x-2"
              >
                <BookOpen className="w-6 h-6" />
                <span>Công thức của tôi</span>
              </button>
            )}
          </div>

          <p className="text-gray-500 mt-2 text-sm">
            Miễn phí • Không cần đăng ký • Hỗ trợ tiếng Việt
          </p>
        </div>
      </div>
    </div>
  );
};