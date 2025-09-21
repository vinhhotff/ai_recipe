import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertCircle, Loader } from 'lucide-react';
import { apiClient } from '../lib/api';
import { JobProgress as JobProgressType } from '../types';

interface JobProgressProps {
  jobId: string;
  onComplete: (recipe: any) => void;
}

export const JobProgress: React.FC<JobProgressProps> = ({ jobId, onComplete }) => {
  const [progress, setProgress] = useState<JobProgressType>({
    status: 'PENDING',
    progress: 0,
    message: 'Đang khởi tạo...'
  });

  useEffect(() => {
    // Connect to SSE stream for real-time progress
    const eventSource = apiClient.createProgressStream(jobId);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress({
          status: data.status,
          progress: data.progress,
          message: data.message
        });
        
        if (data.status === 'DONE') {
          // Fetch the completed recipe
          fetchCompletedRecipe();
          eventSource.close();
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setProgress({
        status: 'FAILED',
        progress: 0,
        message: 'Có lỗi xảy ra khi xử lý yêu cầu'
      });
      eventSource.close();
    };
    
    const fetchCompletedRecipe = async () => {
      try {
        // In a real implementation, you would get the request ID from the job
        // For now, we'll simulate a completed recipe
        const mockRecipe = {
          id: jobId,
          title: 'Gà rim cà chua nhanh',
          description: 'Món gà rim cà chua đơn giản, phù hợp cho bữa cơm gia đình',
          servings: 2,
          totalCalories: 720,
          caloriesPerServing: 360,
          estimatedCostVND: 85000,
          difficulty: 'easy' as const,
          estimatedTimeMinutes: 35,
          tags: ['vietnamese', 'quick', 'healthy'],
          ingredients: [
            { name: 'Thịt gà', normalized: 'chicken_breast', quantity: 300, unit: 'g' },
            { name: 'Cà chua', normalized: 'tomato', quantity: 2, unit: 'quả' },
            { name: 'Hành tây', normalized: 'onion', quantity: 1, unit: 'củ' },
            { name: 'Tỏi', normalized: 'garlic', quantity: 3, unit: 'tép' },
          ],
          steps: [
            { order: 1, text: 'Rửa sạch thịt gà, cắt thành miếng vừa ăn. Ướp với muối, tiêu trong 10 phút.', durationMinutes: 10 },
            { order: 2, text: 'Cà chua rửa sạch, cắt múi cau. Hành tây thái lát, tỏi băm nhỏ.', durationMinutes: 5 },
            { order: 3, text: 'Đun chảo với một chút dầu, phi thơm tỏi và hành tây.', durationMinutes: 2 },
            { order: 4, text: 'Cho thịt gà vào xào trên lửa lớn cho đến khi chín đều, khoảng 7-8 phút.', durationMinutes: 8 },
          ],
          nutrition: {
            protein_g: 45,
            fat_g: 12,
            carbs_g: 18,
            fiber_g: 4,
            sodium_mg: 850
          },
          imageUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
          imageGenerationRequested: true
        };
        
        onComplete(mockRecipe);
      } catch (error) {
        console.error('Error fetching completed recipe:', error);
      }
    };
    
    return () => {
      eventSource.close();
    };
  }, [jobId, onComplete]);

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'PENDING':
        return <Clock className="w-6 h-6 text-orange-500" />;
      case 'RUNNING':
        return <Loader className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'DONE':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'FAILED':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'PENDING':
        return 'bg-orange-500';
      case 'RUNNING':
        return 'bg-blue-500';
      case 'DONE':
        return 'bg-green-500';
      case 'FAILED':
        return 'bg-red-500';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          {getStatusIcon()}
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {progress.status === 'DONE' ? 'Công thức đã sẵn sàng!' : 'Đang xử lý yêu cầu'}
        </h3>
        
        <p className="text-gray-600 mb-6">{progress.message}</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${progress.progress}%` }}
          ></div>
        </div>
        
        <p className="text-sm text-gray-500">
          {progress.progress}% hoàn thành
        </p>
      </div>
    </div>
  );
};