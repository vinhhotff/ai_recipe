import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClientWithFallback } from '../lib/api-client-with-fallback';
import { mockSubscriptionPlans, mockUserSubscription, isDevelopmentMode } from '../lib/mockData';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  yearlyPrice: string | null;
  billingCycle: 'MONTHLY' | 'YEARLY';
  features: {
    maxRecipeGenerations: number;
    maxVideoGenerations: number;
    maxCommunityPosts: number;
    maxCommunityComments: number;
    premiumTemplates: boolean;
    aiSuggestions: boolean;
    prioritySupport: boolean;
    exportToPdf: boolean;
  };
  isActive: boolean;
  sortOrder: number;
}

export interface UserSubscription {
  id: string;
  planId: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
  startDate: string;
  endDate?: string;
  nextBillingDate?: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  autoRenew: boolean;
  plan: SubscriptionPlan;
  usageQuota: {
    recipeGenerationsLeft: number;
    videoGenerationsLeft: number;
    communityPostsLeft: number;
  };
}

// Fetch all subscription plans with automatic fallback
export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      try {
        const response = await apiClientWithFallback.getSubscriptionPlans();
        return response?.data || [];
      } catch (error) {
        console.error('Subscription plans failed:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Fetch user's current subscription with automatic fallback
export const useUserSubscription = () => {
  return useQuery({
    queryKey: ['user-subscription'],
    queryFn: async () => {
      try {
        const response = await apiClientWithFallback.getUserSubscription();
        if (response?.success && response?.data) {
          return response.data as UserSubscription;
        }
        return null;
      } catch (error) {
        console.warn('User subscription API not available:', error);
        return null;
      }
    },
    retry: false, // Don't retry if user doesn't have subscription
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Subscribe to a plan with automatic fallback
export const useSubscribeToPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { planId: string; billingCycle: 'MONTHLY' | 'YEARLY' }) => {
      const response = await apiClientWithFallback.createSubscription(data.planId, data.billingCycle);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch user subscription data
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
};

// Update subscription
export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { planId: string; billingCycle?: 'MONTHLY' | 'YEARLY' }) => {
      const response = await apiClient.put('/api/monetization/user/subscription', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
    },
  });
};

// Cancel subscription
export const useCancelSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete('/api/monetization/user/subscription');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
    },
  });
};

// Helper function to format price in VND
export const formatPrice = (price: string | number) => {
  const numPrice = typeof price === 'string' ? parseInt(price) : price;
  if (numPrice === 0) return 'Miễn phí';
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(numPrice);
};

// Helper function to get feature display text
export const getFeatureText = (plan: SubscriptionPlan) => {
  const features = [];
  
  if (plan.features.maxRecipeGenerations === -1) {
    features.push('Tạo recipe không giới hạn');
  } else {
    features.push(`${plan.features.maxRecipeGenerations} recipe/tháng`);
  }
  
  if (plan.features.maxVideoGenerations === -1) {
    features.push('Tạo video không giới hạn');
  } else {
    features.push(`${plan.features.maxVideoGenerations} video/tháng`);
  }
  
  if (plan.features.maxCommunityPosts === -1) {
    features.push('Đăng bài không giới hạn');
  } else {
    features.push(`${plan.features.maxCommunityPosts} bài đăng/tháng`);
  }
  
  if (plan.features.premiumTemplates) {
    features.push('Template premium');
  }
  
  if (plan.features.aiSuggestions) {
    features.push('Gợi ý AI thông minh');
  }
  
  if (plan.features.prioritySupport) {
    features.push('Hỗ trợ ưu tiên');
  }
  
  if (plan.features.exportToPdf) {
    features.push('Xuất PDF');
  }
  
  return features;
};
