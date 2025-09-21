import { 
  Injectable, 
  CanActivate, 
  ExecutionContext, 
  ForbiddenException,
  SetMetadata
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageService } from '../services/usage.service';
import { FeatureType } from '../dto';

// Decorator to mark endpoints with required feature type
export const RequireFeature = (featureType: FeatureType) => 
  SetMetadata('featureType', featureType);

// Decorator to mark premium-only features
export const RequirePremium = (feature: string) => 
  SetMetadata('premiumFeature', feature);

@Injectable()
export class PaywallGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usageService: UsageService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false; // Should be handled by AuthGuard first
    }

    // Check for feature type requirement
    const requiredFeature = this.reflector.get<FeatureType>(
      'featureType',
      context.getHandler()
    );

    if (requiredFeature) {
      try {
        // Use enforceFeatureAccess which throws ForbiddenException if not allowed
        await this.usageService.enforceFeatureAccess(user.id, requiredFeature);
        return true;
      } catch (error) {
        if (error instanceof ForbiddenException) {
          // Re-throw with enhanced paywall message
          const usageCheck = await this.usageService.checkUsage(user.id, requiredFeature);
          throw new ForbiddenException({
            message: usageCheck.message || 'Feature access denied',
            suggestedPlan: usageCheck.suggestedPlan,
            featureType: requiredFeature,
            remainingQuota: usageCheck.remainingQuota,
            totalQuota: usageCheck.totalQuota,
            isPaywallError: true
          });
        }
        throw error;
      }
    }

    // Check for premium feature requirement
    const premiumFeature = this.reflector.get<string>(
      'premiumFeature',
      context.getHandler()
    );

    if (premiumFeature) {
      const hasAccess = await this.usageService.hasFeatureAccess(user.id, premiumFeature as any);
      
      if (!hasAccess) {
        const planName = await this.getPlanName(user.id);
        throw new ForbiddenException({
          message: `${premiumFeature} is only available for premium subscribers`,
          suggestedPlan: planName === 'Free' ? 'Pro' : 'Premium',
          premiumFeature,
          isPaywallError: true
        });
      }
    }

    return true;
  }

  private async getPlanName(userId: string): Promise<string> {
    try {
      const summary = await this.usageService.getUserUsageSummary(userId);
      return summary.planName;
    } catch {
      return 'Free';
    }
  }
}

// Interceptor to automatically update usage after successful requests
import { NestInterceptor, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class UsageTrackingInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private usageService: UsageService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    const featureType = this.reflector.get<FeatureType>(
      'featureType',
      context.getHandler()
    );

    return next.handle().pipe(
      tap(async () => {
        // Only update usage after successful completion
        if (user && featureType) {
          try {
            await this.usageService.updateUsage(user.id, { 
              featureType, 
              amount: 1 
            });
          } catch (error) {
            // Log but don't fail the request if usage update fails
            console.warn('Failed to update usage:', error.message);
          }
        }
      })
    );
  }
}

// Middleware function for quick subscription status check
import { Request, Response, NextFunction } from 'express';

export function subscriptionMiddleware() {
  return async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    if (req.user) {
      // Add subscription status to request for easy access
      try {
        // This would be injected in a real NestJS middleware
        // For now, this is a placeholder for the concept
        req.user.subscriptionStatus = {
          isActive: false, // Would be fetched from service
          planName: 'Free',
          quotas: {}
        };
      } catch (error) {
        // Don't fail the request if subscription check fails
        console.warn('Subscription check failed:', error.message);
      }
    }
    next();
  };
}
