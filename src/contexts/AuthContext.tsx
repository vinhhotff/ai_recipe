import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/api-client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'GUEST' | 'MEMBER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
  subscription?: {
    id: string;
    planId: string;
    planName: string;
    status: string;
    billingCycle: string;
    usageQuota: {
      recipeGenerationsLeft: number;
      videoGenerationsLeft: number;
      communityPostsLeft: number;
      communityCommentsLeft: number;
    };
    planFeatures: {
      maxRecipeGenerations: number;
      maxVideoGenerations: number;
      maxCommunityPosts: number;
      maxCommunityComments: number;
      exportToPdf: boolean;
      aiSuggestions: boolean;
      prioritySupport: boolean;
      premiumTemplates: boolean;
    };
  };
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => void;
  checkFeatureAccess: (feature: string) => boolean;
  hasUsageLeft: (feature: string) => boolean;
  // Role-based permissions
  canCreateRecipe: () => boolean;
  canCommentOnRecipe: () => boolean;
  canLikeRecipe: () => boolean;
  canSaveRecipe: () => boolean;
  canEditRecipe: (recipeAuthorId?: string) => boolean;
  canDeleteRecipe: (recipeAuthorId?: string) => boolean;
  canEditComment: (commentAuthorId: string) => boolean;
  canDeleteComment: (commentAuthorId: string) => boolean;
  isAdmin: () => boolean;
  isMember: () => boolean;
  isGuest: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  // Fetch user profile (will auto-check authentication via cookies)
  const { data: userData, isLoading, refetch } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      try {
        const response = await apiClient.getProfile();
        return response.user;
      } catch (error) {
        // If profile fetch fails, user is not authenticated
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors
      if (error?.statusCode === 401) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Update user state when userData changes
  useEffect(() => {
    if (userData) {
      setUser(userData);
    } else if (!isLoading) {
      setUser(null);
    }
  }, [userData, isLoading]);

  // Listen for auth events from API client
  useEffect(() => {
    const handleAuthLogin = (event: CustomEvent) => {
      setUser(event.detail.user);
      refetch();
    };

    const handleAuthLogout = () => {
      setUser(null);
      queryClient.clear();
    };

    window.addEventListener('auth:login', handleAuthLogin as EventListener);
    window.addEventListener('auth:logout', handleAuthLogout);

    return () => {
      window.removeEventListener('auth:login', handleAuthLogin as EventListener);
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, [refetch, queryClient]);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      
      if (!response.user) {
        throw new Error(response.message || 'Login failed');
      }

      // Set user immediately from response
      setUser(response.user);
      // Refresh query to sync with server
      await refetch();
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (userData: { email: string; password: string; name: string }) => {
    try {
      const response = await apiClient.register(userData);
      
      if (!response.user) {
        throw new Error(response.message || 'Registration failed');
      }
      
      // Set user immediately from response
      setUser(response.user);
      // Refresh query to sync with server
      await refetch();
    } catch (error: any) {
      // Handle different types of errors
      if (error.message && error.message.includes('Email already registered')) {
        throw new Error('Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.');
      } else if (error.message && error.message.includes('password')) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
      } else {
        throw new Error(error.message || 'Đăng ký không thành công. Vui lòng thử lại.');
      }
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
      setUser(null);
      queryClient.clear();
    } catch (error) {
      // Continue with logout even if API call fails
      setUser(null);
      queryClient.clear();
    }
  };

  const refreshUser = () => {
    refetch();
  };

  const checkFeatureAccess = (feature: string): boolean => {
    if (!user?.subscription) return false;
    
    const { planFeatures } = user.subscription;
    
    switch (feature) {
      case 'exportToPdf':
        return planFeatures.exportToPdf;
      case 'aiSuggestions':
        return planFeatures.aiSuggestions;
      case 'prioritySupport':
        return planFeatures.prioritySupport;
      case 'premiumTemplates':
        return planFeatures.premiumTemplates;
      default:
        return false;
    }
  };

  const hasUsageLeft = (feature: string): boolean => {
    if (!user?.subscription) return false;
    
    const { usageQuota, planFeatures } = user.subscription;
    
    switch (feature) {
      case 'recipe_generation':
        return planFeatures.maxRecipeGenerations === -1 || usageQuota.recipeGenerationsLeft > 0;
      case 'video_generation':
        return planFeatures.maxVideoGenerations === -1 || usageQuota.videoGenerationsLeft > 0;
      case 'community_post':
        return planFeatures.maxCommunityPosts === -1 || usageQuota.communityPostsLeft > 0;
      case 'community_comment':
        return planFeatures.maxCommunityComments === -1 || usageQuota.communityCommentsLeft > 0;
      default:
        return false;
    }
  };

  // Role-based permission functions
  const canCreateRecipe = (): boolean => {
    return user?.role === 'MEMBER' || user?.role === 'ADMIN';
  };

  const canCommentOnRecipe = (): boolean => {
    return user?.role === 'MEMBER' || user?.role === 'ADMIN';
  };

  const canLikeRecipe = (): boolean => {
    return user?.role === 'MEMBER' || user?.role === 'ADMIN';
  };

  const canSaveRecipe = (): boolean => {
    return user?.role === 'MEMBER' || user?.role === 'ADMIN';
  };

  const canEditRecipe = (recipeAuthorId?: string): boolean => {
    if (user?.role === 'ADMIN') return true;
    if (user?.role === 'MEMBER' && recipeAuthorId === user.id) return true;
    return false;
  };

  const canDeleteRecipe = (recipeAuthorId?: string): boolean => {
    if (user?.role === 'ADMIN') return true;
    if (user?.role === 'MEMBER' && recipeAuthorId === user.id) return true;
    return false;
  };

  const canEditComment = (commentAuthorId: string): boolean => {
    if (user?.role === 'ADMIN') return true;
    if (user?.id === commentAuthorId) return true;
    return false;
  };

  const canDeleteComment = (commentAuthorId: string): boolean => {
    if (user?.role === 'ADMIN') return true;
    if (user?.id === commentAuthorId) return true;
    return false;
  };

  const isAdmin = (): boolean => user?.role === 'ADMIN';
  const isMember = (): boolean => user?.role === 'MEMBER';
  const isGuest = (): boolean => user?.role === 'GUEST' || !user;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
    checkFeatureAccess,
    hasUsageLeft,
    canCreateRecipe,
    canCommentOnRecipe,
    canLikeRecipe,
    canSaveRecipe,
    canEditRecipe,
    canDeleteRecipe,
    canEditComment,
    canDeleteComment,
    isAdmin,
    isMember,
    isGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

