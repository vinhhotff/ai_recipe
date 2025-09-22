import { Injectable, Logger } from '@nestjs/common';
import { AppWebSocketGateway } from './websocket.gateway';

@Injectable()
export class WebSocketService {
  private logger: Logger = new Logger('WebSocketService');

  constructor(private webSocketGateway: AppWebSocketGateway) {}

  // User-related notifications
  notifyUserRegistration(userData) {
    this.webSocketGateway.broadcastToAdmins('user-registered', {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      id: userData.id,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`📤 User registration notification sent: ${userData.email}`);
  }

  // Recipe-related notifications
  notifyRecipeSubmitted(recipeData) {
    this.webSocketGateway.broadcastToAdmins('recipe-submitted', {
      title: recipeData.title,
      id: recipeData.id,
      authorId: recipeData.authorId,
      author: recipeData.author,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`📤 Recipe submission notification sent: ${recipeData.title}`);
  }

  notifyRecipeApproved(recipeData) {
    // Notify the recipe author
    this.webSocketGateway.sendNotificationToUser(recipeData.authorId, {
      type: 'recipe_approved',
      title: 'Recipe Approved!',
      message: `Your recipe "${recipeData.title}" has been approved`,
      data: recipeData,
    });

    // Also notify admins
    this.webSocketGateway.broadcastToAdmins('recipe-approved', recipeData);

    this.logger.log(`📤 Recipe approval notification sent: ${recipeData.title}`);
  }

  notifyRecipeFlagged(recipeData, reason: string) {
    this.webSocketGateway.broadcastToAdmins('recipe-flagged', {
      ...recipeData,
      reason,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`📤 Recipe flagged notification sent: ${recipeData.title}`);
  }

  // Comment-related notifications
  notifyNewComment(commentData) {
    // Notify recipe author if someone else commented
    if (commentData.authorId !== commentData.recipeAuthorId) {
      this.webSocketGateway.sendNotificationToUser(commentData.recipeAuthorId, {
        type: 'comment_added',
        title: 'New Comment',
        message: `${commentData.author} commented on your recipe "${commentData.recipeTitle}"`,
        data: commentData,
      });
    }

    this.logger.log(`📤 Comment notification sent for recipe: ${commentData.recipeTitle}`);
  }

  // System notifications
  sendSystemAlert(alert: { title: string; message: string; priority?: 'low' | 'medium' | 'high' }) {
    this.webSocketGateway.sendSystemNotification({
      type: 'system_alert',
      title: alert.title,
      message: alert.message,
      priority: alert.priority || 'medium',
    });

    this.logger.log(`📤 System alert sent: ${alert.title}`);
  }

  // Admin dashboard updates
  updateDashboardMetrics(metrics) {
    this.webSocketGateway.sendDashboardUpdate(metrics);
    this.logger.log(`📊 Dashboard metrics updated`);
  }

  // Real-time user activity
  trackUserActivity(activity: {
    userId: string;
    action: string;
    resource?: string;
    details?;
  }) {
    this.webSocketGateway.sendUserActivity({
      ...activity,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`👤 User activity tracked: ${activity.userId} - ${activity.action}`);
  }

  // Connection stats
  getConnectionStats() {
    return this.webSocketGateway.getConnectionStats();
  }

  // Broadcast custom event
  broadcastCustomEvent(event: string, data, target: 'all' | 'admins' = 'all') {
    if (target === 'admins') {
      this.webSocketGateway.broadcastToAdmins(event, data);
    } else {
      this.webSocketGateway.broadcastToAll(event, data);
    }

    this.logger.log(`📡 Custom event broadcast: ${event} (${target})`);
  }
}
