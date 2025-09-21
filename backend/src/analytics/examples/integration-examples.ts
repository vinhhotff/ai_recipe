/**
 * EXAMPLE: Integration of Analytics Tracking
 * 
 * This file shows how to integrate analytics tracking into your existing services.
 * Apply these patterns to your actual controllers and services.
 */

import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsEventType } from '../dto';

/**
 * RECIPE SERVICE INTEGRATION
 */
@Injectable()
export class RecipeServiceWithAnalytics {
  constructor(private analyticsService: AnalyticsService) {}

  // Example: Recipe Generation with Analytics
  async generateRecipe(userId: string, ingredients: string[], preferences?: any) {
    const startTime = Date.now();
    
    try {
      // Your existing recipe generation logic here
      const recipe = await this.performRecipeGeneration(ingredients, preferences);
      
      // Record successful recipe generation
      await this.analyticsService.recordRecipeGeneration(userId, {
        recipeId: recipe.id,
        ingredients,
        cost: this.calculateAICost(ingredients.length)
      });

      // Also record model usage for cost tracking
      await this.analyticsService.recordModelUsage(
        userId,
        'gpt-4',
        'recipe-generation',
        this.estimateTokens(ingredients, preferences),
        Date.now() - startTime,
        this.calculateAICost(ingredients.length),
        {
          ingredientCount: ingredients.length,
          hasPreferences: !!preferences,
          recipeId: recipe.id
        }
      );

      return recipe;
    } catch (error) {
      // Record failed recipe generation
      await this.analyticsService.recordEvent(userId, {
        eventType: AnalyticsEventType.RECIPE_GENERATION,
        metadata: {
          ingredients,
          error: error.message,
          processingTime: Date.now() - startTime,
          success: false
        }
      });
      
      throw error;
    }
  }

  private async performRecipeGeneration(ingredients: string[], preferences?: any) {
    // Your actual recipe generation logic
    return { id: 'recipe-123', title: 'Generated Recipe', ingredients };
  }

  private calculateAICost(ingredientCount: number): number {
    // Estimate cost based on token usage
    return ingredientCount * 0.001; // $0.001 per ingredient
  }

  private estimateTokens(ingredients: string[], preferences?: any): number {
    return ingredients.length * 10 + (preferences ? 50 : 0);
  }
}

/**
 * VIDEO GENERATION SERVICE INTEGRATION
 */
@Injectable()
export class VideoServiceWithAnalytics {
  constructor(private analyticsService: AnalyticsService) {}

  async generateVideo(userId: string, recipeId: string, options: any) {
    const startTime = Date.now();

    try {
      // Your video generation logic
      const video = await this.performVideoGeneration(recipeId, options);
      
      // Record successful video generation
      await this.analyticsService.recordVideoGeneration(userId, {
        videoId: video.id,
        recipeId,
        duration: video.duration,
        cost: this.calculateVideoCost(video.duration)
      });

      // Record model usage for AI video generation
      await this.analyticsService.recordModelUsage(
        userId,
        'runway-ml',
        'video-generation',
        null, // No tokens for video models
        Date.now() - startTime,
        this.calculateVideoCost(video.duration),
        {
          recipeId,
          duration: video.duration,
          style: options.style,
          resolution: options.resolution
        }
      );

      return video;
    } catch (error) {
      await this.analyticsService.recordEvent(userId, {
        eventType: AnalyticsEventType.VIDEO_GENERATION,
        metadata: {
          recipeId,
          error: error.message,
          processingTime: Date.now() - startTime,
          success: false
        }
      });
      
      throw error;
    }
  }

  private async performVideoGeneration(recipeId: string, options: any) {
    // Mock video generation
    return { 
      id: 'video-123', 
      recipeId, 
      duration: 60, 
      url: 'https://example.com/video.mp4' 
    };
  }

  private calculateVideoCost(duration: number): number {
    return duration * 0.05; // $0.05 per second
  }
}

/**
 * COMMUNITY SERVICE INTEGRATION
 */
@Injectable()
export class CommunityServiceWithAnalytics {
  constructor(private analyticsService: AnalyticsService) {}

  async createCommunityPost(userId: string, recipeData: any) {
    try {
      // Create the community post
      const post = await this.createPost(userId, recipeData);
      
      // Record community post creation
      await this.analyticsService.recordCommunityPost(userId, {
        postId: post.id,
        recipeId: recipeData.id
      });

      return post;
    } catch (error) {
      await this.analyticsService.recordEvent(userId, {
        eventType: AnalyticsEventType.COMMUNITY_POST,
        metadata: {
          error: error.message,
          success: false
        }
      });
      
      throw error;
    }
  }

  async likeRecipe(userId: string, recipeId: string) {
    try {
      const result = await this.performLike(userId, recipeId);
      
      // Record like event
      await this.analyticsService.recordEvent(userId, {
        eventType: AnalyticsEventType.COMMUNITY_LIKE,
        metadata: {
          recipeId,
          action: 'like'
        }
      });

      return result;
    } catch (error) {
      // Don't record failed likes - they're usually not critical
      throw error;
    }
  }

  async commentOnRecipe(userId: string, recipeId: string, content: string) {
    try {
      const comment = await this.createComment(userId, recipeId, content);
      
      // Record comment event
      await this.analyticsService.recordEvent(userId, {
        eventType: AnalyticsEventType.COMMUNITY_COMMENT,
        metadata: {
          recipeId,
          commentId: comment.id,
          contentLength: content.length
        }
      });

      return comment;
    } catch (error) {
      await this.analyticsService.recordEvent(userId, {
        eventType: AnalyticsEventType.COMMUNITY_COMMENT,
        metadata: {
          recipeId,
          error: error.message,
          success: false
        }
      });
      
      throw error;
    }
  }

  private async createPost(userId: string, recipeData: any) {
    return { id: 'post-123', userId, ...recipeData };
  }

  private async performLike(userId: string, recipeId: string) {
    return { liked: true, recipeId };
  }

  private async createComment(userId: string, recipeId: string, content: string) {
    return { id: 'comment-123', userId, recipeId, content };
  }
}

/**
 * SUBSCRIPTION SERVICE INTEGRATION
 */
@Injectable()
export class SubscriptionServiceWithAnalytics {
  constructor(private analyticsService: AnalyticsService) {}

  async createSubscription(userId: string, planId: string) {
    try {
      const subscription = await this.performSubscriptionCreation(userId, planId);
      
      // Record subscription creation
      await this.analyticsService.recordEvent(userId, {
        eventType: AnalyticsEventType.SUBSCRIPTION_CREATED,
        metadata: {
          planId,
          subscriptionId: subscription.id
        }
      });

      return subscription;
    } catch (error) {
      await this.analyticsService.recordEvent(userId, {
        eventType: AnalyticsEventType.SUBSCRIPTION_CREATED,
        metadata: {
          planId,
          error: error.message,
          success: false
        }
      });
      
      throw error;
    }
  }

  async upgradeSubscription(userId: string, newPlanId: string) {
    try {
      const subscription = await this.performSubscriptionUpgrade(userId, newPlanId);
      
      // Record subscription upgrade
      await this.analyticsService.recordEvent(userId, {
        eventType: AnalyticsEventType.SUBSCRIPTION_UPGRADED,
        metadata: {
          newPlanId,
          subscriptionId: subscription.id
        }
      });

      return subscription;
    } catch (error) {
      // Record failed upgrade
      await this.analyticsService.recordEvent(userId, {
        eventType: AnalyticsEventType.SUBSCRIPTION_UPGRADED,
        metadata: {
          newPlanId,
          error: error.message,
          success: false
        }
      });
      
      throw error;
    }
  }

  async recordPaymentSuccess(userId: string, paymentId: string, amount: number, planId?: string) {
    await this.analyticsService.recordPaymentSuccess(userId, {
      paymentId,
      amount,
      planId
    });
  }

  private async performSubscriptionCreation(userId: string, planId: string) {
    return { id: 'sub-123', userId, planId };
  }

  private async performSubscriptionUpgrade(userId: string, newPlanId: string) {
    return { id: 'sub-123', userId, planId: newPlanId };
  }
}

/**
 * AUTH SERVICE INTEGRATION
 */
@Injectable()
export class AuthServiceWithAnalytics {
  constructor(private analyticsService: AnalyticsService) {}

  async registerUser(email: string, password: string) {
    try {
      const user = await this.performUserRegistration(email, password);
      
      // Record user registration
      await this.analyticsService.recordEvent(user.id, {
        eventType: AnalyticsEventType.USER_REGISTRATION,
        metadata: {
          email,
          registrationMethod: 'email'
        }
      });

      return user;
    } catch (error) {
      // Don't record failed registrations with user data for privacy
      throw error;
    }
  }

  async loginUser(userId: string, sessionId?: string) {
    try {
      // Record user login
      await this.analyticsService.recordEvent(userId, {
        eventType: AnalyticsEventType.USER_LOGIN,
        sessionId,
        metadata: {
          loginMethod: 'password'
        }
      });
    } catch (error) {
      // Don't fail login if analytics fails
      console.warn('Failed to record login event:', error);
    }
  }

  private async performUserRegistration(email: string, password: string) {
    return { id: 'user-123', email };
  }
}

/**
 * MIDDLEWARE INTEGRATION EXAMPLE
 * 
 * You can also create middleware to automatically track certain events
 */
import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AnalyticsMiddleware implements NestMiddleware {
  constructor(private analyticsService: AnalyticsService) {}

  use(req: Request & { user?: any }, res: Response, next: NextFunction) {
    // Track page views for recipe and video views
    if (req.method === 'GET') {
      const userId = req.user?.id;
      
      if (req.path.includes('/recipes/') && req.path !== '/recipes') {
        const recipeId = this.extractRecipeId(req.path);
        if (recipeId) {
          this.analyticsService.recordEvent(userId, {
            eventType: AnalyticsEventType.RECIPE_VIEW,
            metadata: { recipeId }
          }).catch(err => console.warn('Analytics error:', err));
        }
      }
      
      if (req.path.includes('/videos/') && req.path !== '/videos') {
        const videoId = this.extractVideoId(req.path);
        if (videoId) {
          this.analyticsService.recordEvent(userId, {
            eventType: AnalyticsEventType.VIDEO_VIEW,
            metadata: { videoId }
          }).catch(err => console.warn('Analytics error:', err));
        }
      }
    }
    
    next();
  }

  private extractRecipeId(path: string): string | null {
    const match = path.match(/\/recipes\/([^\/]+)/);
    return match ? match[1] : null;
  }

  private extractVideoId(path: string): string | null {
    const match = path.match(/\/videos\/([^\/]+)/);
    return match ? match[1] : null;
  }
}

/**
 * INTEGRATION CHECKLIST:
 * 
 * 1. ✅ Inject AnalyticsService into your existing services
 * 2. ✅ Add event recording calls to key business logic operations
 * 3. ✅ Record both successful and failed operations with appropriate metadata
 * 4. ✅ Use recordModelUsage() for AI operations to track costs
 * 5. ✅ Handle analytics errors gracefully - don't let them break core functionality
 * 6. ✅ Add analytics middleware for automatic page view tracking
 * 7. ⏰ Test analytics data collection in development
 * 8. ⏰ Monitor analytics performance impact
 */
