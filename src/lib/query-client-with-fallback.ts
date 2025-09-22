import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Create query client with enhanced error handling for fallback scenarios
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce retry attempts when using mock data
      retry: (failureCount, error: any) => {
        // If error message indicates mock data usage, don't retry
        if (error?.message?.includes('(mock)') || error?.message?.includes('mock data')) {
          return false;
        }
        
        // For network errors, retry up to 2 times
        if (error?.code === 'ECONNREFUSED' || error?.code === 'ERR_NETWORK') {
          return failureCount < 2;
        }
        
        // For other errors, retry once
        return failureCount < 1;
      },
      
      // Cache successful responses for longer when using mock data
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      
      // Handle network errors gracefully
      onError: (error: any) => {
        // Don't show error toasts for mock data responses
        if (error?.message?.includes('(mock)') || error?.message?.includes('mock data')) {
          return;
        }
        
        // Show generic network error
        if (error?.code === 'ECONNREFUSED' || error?.code === 'ERR_NETWORK') {
          toast.info('Đang sử dụng dữ liệu demo (backend chưa khởi động)');
          return;
        }
        
        // Show other errors
        if (error?.message && !error.message.includes('401')) {
          toast.error(`Có lỗi xảy ra: ${error.message}`);
        }
      },
    },
    
    mutations: {
      // Handle mutation errors for fallback scenarios
      onError: (error: any) => {
        // Show success message for mock mutations
        if (error?.message?.includes('(mock)')) {
          toast.success('Thao tác thành công (dữ liệu demo)');
          return;
        }
        
        // Show error message for real failures
        if (error?.message) {
          toast.error(`Có lỗi xảy ra: ${error.message}`);
        } else {
          toast.error('Có lỗi xảy ra, vui lòng thử lại');
        }
      },
      
      onSuccess: (data: any) => {
        // Show success message for mock mutations
        if (data?.message?.includes('(mock)')) {
          toast.success(data.message);
        }
      },
    },
  },
});

export default queryClient;
