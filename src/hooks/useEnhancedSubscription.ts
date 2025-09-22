import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClientWithFallback } from '../lib/api-client-with-fallback';
import { toast } from 'sonner';
import { SubscriptionPlan, UserSubscription } from './useSubscriptionPlans';

// Enhanced subscription hook with better UX for fallback scenarios
export const useEnhancedSubscriptionPlans = () => {
  return useQuery<SubscriptionPlan[], Error>({
    queryKey: ['subscription-plans-enhanced'],
    queryFn: async () => {
      const response = await apiClientWithFallback.getSubscriptionPlans();
      return response?.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
  });
};

// Enhanced user subscription hook
export const useEnhancedUserSubscription = () => {
  return useQuery<UserSubscription | null, Error>({
    queryKey: ['user-subscription-enhanced'],
    queryFn: async () => {
      try {
        const response = await apiClientWithFallback.getUserSubscription();
        if (response?.success && response?.data) {
          return response.data as UserSubscription;
        }
        return null;
      } catch (error: any) {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: false, // Don't retry if user doesn't have subscription
  });
};

// Enhanced subscription creation with better UX
export const useEnhancedSubscribeToPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { planId: string; billingCycle: 'MONTHLY' | 'YEARLY' }) => {
      const response = await apiClientWithFallback.createSubscription(data.planId, data.billingCycle);
      return response?.data || response;
    },
    onMutate: async (variables) => {
      // Show loading state
      toast.loading('Đang tạo gói đăng ký...');
    },
    onSuccess: (data, variables) => {
      // Dismiss loading toast
      toast.dismiss();
      
      // Show success message
      if (data && typeof data === 'object' && 'message' in data && data.message?.includes('(mock)')) {
        toast.success('✅ Gói đăng ký được tạo thành công (Demo mode)');
        toast.info('💡 Trong môi trường thật, bạn sẽ được chuyển đến trang thanh toán');
      } else {
        toast.success('✅ Gói đăng ký được tạo thành công!');
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user-subscription-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: any) => {
      toast.dismiss();
      if (error?.message?.includes('(mock)')) {
        toast.success('Gói đăng ký được tạo (Demo mode)');
      } else {
        toast.error(`Lỗi tạo gói đăng ký: ${error?.message || 'Vui lòng thử lại'}`);
      }
    },
  });
};

// Hook to check if user can perform subscription actions
export const useSubscriptionPermissions = () => {
  const { data: userSubscription, isLoading } = useEnhancedUserSubscription();

  return {
    isLoading,
    hasActiveSubscription: !!userSubscription && userSubscription.status === 'ACTIVE',
    canUpgrade: !userSubscription || userSubscription.status !== 'ACTIVE',
    canDowngrade: !!userSubscription && userSubscription.status === 'ACTIVE',
    currentPlan: userSubscription?.plan,
    usageQuota: userSubscription?.usageQuota,
  };
};

export default {
  useEnhancedSubscriptionPlans,
  useEnhancedUserSubscription,
  useEnhancedSubscribeToPlan,
  useSubscriptionPermissions,
};
