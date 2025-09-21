/**
 * EXAMPLE: Integration of Paywall Guards with Recipe Generation
 * 
 * This file shows how to integrate the monetization system with existing services.
 * Apply these patterns to your actual recipe, video, and community controllers.
 */

import { Controller, Post, UseGuards, UseInterceptors, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaywallGuard, RequireFeature, RequirePremium, UsageTrackingInterceptor } from '../guards/paywall.guard';
import { FeatureType } from '../dto';

// Example DTO (would come from your actual recipe module)
class GenerateRecipeDto {
  ingredients: string[];
  preferences?: any;
}

@ApiTags('Recipe Generation (With Paywall)')
@Controller('api/recipes')
@UseGuards(JwtAuthGuard) // First check auth
export class RecipePaywallExampleController {

  // Example 1: Basic Recipe Generation (requires quota check)
  @Post('generate')
  @UseGuards(PaywallGuard) // Then check paywall
  @UseInterceptors(UsageTrackingInterceptor) // Track usage after success
  @RequireFeature(FeatureType.RECIPE_GENERATION) // Require recipe generation quota
  @ApiSecurity('bearer')
  @ApiOperation({ 
    summary: 'Generate AI recipe (requires subscription quota)',
    description: 'Uses 1 recipe generation from user\'s monthly quota'
  })
  async generateRecipe(
    @Request() req,
    @Body() generateDto: GenerateRecipeDto
  ) {
    // Your existing recipe generation logic here
    // The paywall guard already checked quota and the interceptor will decrement it
    
    return {
      success: true,
      message: 'Recipe generated successfully',
      data: {
        title: 'AI Generated Recipe',
        ingredients: generateDto.ingredients,
        steps: ['Step 1', 'Step 2', 'Step 3'],
        // ... other recipe data
      }
    };
  }

  // Example 2: Premium Recipe Templates (requires premium subscription)
  @Post('generate/premium')
  @UseGuards(PaywallGuard)
  @UseInterceptors(UsageTrackingInterceptor)
  @RequireFeature(FeatureType.RECIPE_GENERATION)
  @RequirePremium('premiumTemplates') // Also requires premium feature
  @ApiSecurity('bearer')
  @ApiOperation({ 
    summary: 'Generate recipe with premium templates (Pro/Premium only)',
    description: 'Access to premium recipe templates and advanced AI features'
  })
  async generatePremiumRecipe(
    @Request() req,
    @Body() generateDto: GenerateRecipeDto & { template: string }
  ) {
    // Premium recipe generation logic
    return {
      success: true,
      message: 'Premium recipe generated successfully',
      data: {
        title: 'Premium AI Recipe',
        template: generateDto.template,
        ingredients: generateDto.ingredients,
        steps: ['Advanced Step 1', 'Premium Step 2'],
        nutritionAnalysis: { /* premium nutrition data */ },
        customizations: { /* premium customization options */ }
      }
    };
  }

  // Example 3: Manual usage check (alternative approach)
  @Post('generate/manual-check')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('bearer')
  @ApiOperation({ 
    summary: 'Generate recipe with manual usage check',
    description: 'Alternative approach using manual usage checking'
  })
  async generateRecipeManual(
    @Request() req,
    @Body() generateDto: GenerateRecipeDto
  ) {
    // Manual approach - inject UsageService and check manually
    // const usageService = this.usageService;
    // await usageService.checkAndUpdateUsage(req.user.id, FeatureType.RECIPE_GENERATION);
    
    // Your recipe generation logic here
    
    return {
      success: true,
      message: 'Recipe generated with manual check',
      data: { /* recipe data */ }
    };
  }
}

/**
 * VIDEO GENERATION EXAMPLE
 */
@ApiTags('Video Generation (With Paywall)')
@Controller('api/videos')
@UseGuards(JwtAuthGuard)
export class VideoPaywallExampleController {

  @Post('generate')
  @UseGuards(PaywallGuard)
  @UseInterceptors(UsageTrackingInterceptor)
  @RequireFeature(FeatureType.VIDEO_GENERATION)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Generate recipe video (requires subscription quota)' })
  async generateVideo(
    @Request() req,
    @Body() videoDto: { recipeId: string; style: string }
  ) {
    // Video generation logic
    return {
      success: true,
      message: 'Video generation started',
      data: {
        videoId: 'video-123',
        status: 'PROCESSING',
        estimatedTime: '5-10 minutes'
      }
    };
  }
}

/**
 * COMMUNITY FEATURES EXAMPLE
 */
@ApiTags('Community (With Paywall)')
@Controller('api/community')
@UseGuards(JwtAuthGuard)
export class CommunityPaywallExampleController {

  @Post('recipes')
  @UseGuards(PaywallGuard)
  @UseInterceptors(UsageTrackingInterceptor)
  @RequireFeature(FeatureType.COMMUNITY_POST)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Create community recipe post (requires quota)' })
  async createCommunityRecipe(
    @Request() req,
    @Body() recipeDto: any
  ) {
    // Community recipe creation logic
    return {
      success: true,
      message: 'Community recipe created',
      data: { recipeId: 'community-recipe-123' }
    };
  }

  @Post('comments')
  @UseGuards(PaywallGuard)
  @UseInterceptors(UsageTrackingInterceptor)
  @RequireFeature(FeatureType.COMMUNITY_COMMENT)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Add comment (requires quota)' })
  async addComment(
    @Request() req,
    @Body() commentDto: any
  ) {
    // Comment creation logic
    return {
      success: true,
      message: 'Comment added',
      data: { commentId: 'comment-123' }
    };
  }

  // Premium community features
  @Post('meal-plans')
  @UseGuards(PaywallGuard)
  @UseInterceptors(UsageTrackingInterceptor)
  @RequireFeature(FeatureType.COMMUNITY_POST)
  @RequirePremium('exportToPdf') // Premium feature example
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Create meal plan with PDF export (Premium only)' })
  async createMealPlanWithExport(
    @Request() req,
    @Body() mealPlanDto: any
  ) {
    // Meal plan creation with premium features
    return {
      success: true,
      message: 'Meal plan created with PDF export capability',
      data: { 
        mealPlanId: 'meal-plan-123',
        pdfUrl: 'https://example.com/meal-plan-123.pdf'
      }
    };
  }
}

/**
 * ERROR HANDLING EXAMPLE
 * 
 * When paywall guards throw ForbiddenException, your global error handler
 * should catch these and return user-friendly paywall responses:
 */

/*
// In your global exception filter:
if (exception.getResponse()?.isPaywallError) {
  const response = exception.getResponse();
  return {
    success: false,
    error: 'PAYWALL_BLOCKED',
    message: response.message,
    paywall: {
      featureType: response.featureType,
      remainingQuota: response.remainingQuota,
      totalQuota: response.totalQuota,
      suggestedPlan: response.suggestedPlan,
      upgradeUrl: '/subscription/plans'
    }
  };
}
*/

/**
 * INTEGRATION CHECKLIST:
 * 
 * 1. ✅ Add PaywallGuard to controllers that need quota checking
 * 2. ✅ Add UsageTrackingInterceptor to automatically decrement usage
 * 3. ✅ Use @RequireFeature() decorator to specify which feature type
 * 4. ✅ Use @RequirePremium() decorator for premium-only features
 * 5. ⏰ Update your existing controllers with these patterns
 * 6. ⏰ Test paywall responses in frontend
 * 7. ⏰ Handle paywall errors gracefully in UI
 */
