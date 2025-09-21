import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from './logger.service';
import { MetricsService } from './metrics.service';
import { CostTrackingService } from './cost-tracking.service';

export interface Alert {
  id: string;
  type: 'payment_failure' | 'ai_quota_exceeded' | 'server_error' | 'subscription_expiration' | 'performance' | 'security' | 'cost_threshold';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: any;
  userId?: string;
  timestamp: Date;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface AlertRule {
  id: string;
  type: string;
  condition: (data: any) => boolean;
  severity: Alert['severity'];
  title: string;
  messageTemplate: string;
  cooldownMinutes: number;
  enabled: boolean;
}

@Injectable()
export class AlertingService implements OnModuleInit {
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private notificationChannels: Map<string, (alert: Alert) => Promise<void>> = new Map();

  constructor(
    private configService: ConfigService,
    private logger: AppLoggerService,
    private metrics: MetricsService,
    private costTracking: CostTrackingService,
  ) {
    this.initializeAlertRules();
    this.initializeNotificationChannels();
  }

  async onModuleInit() {
    this.startAlertMonitoring();
  }

  private initializeAlertRules() {
    const rules: AlertRule[] = [
      // Payment failure alerts
      {
        id: 'payment_failure_high',
        type: 'payment_failure',
        condition: (data) => data.failureCount > 3,
        severity: 'high',
        title: 'Multiple Payment Failures',
        messageTemplate: 'User {userId} has {failureCount} consecutive payment failures',
        cooldownMinutes: 60,
        enabled: true,
      },
      
      // AI quota exceeded alerts
      {
        id: 'ai_quota_exceeded_daily',
        type: 'ai_quota_exceeded',
        condition: (data) => data.usage >= data.dailyLimit * 0.9,
        severity: 'medium',
        title: 'Daily AI Quota Warning',
        messageTemplate: 'User {userId} has used {usage} of {dailyLimit} daily AI quota',
        cooldownMinutes: 180,
        enabled: true,
      },
      
      {
        id: 'ai_quota_exceeded_monthly',
        type: 'ai_quota_exceeded',
        condition: (data) => data.usage >= data.monthlyLimit,
        severity: 'high',
        title: 'Monthly AI Quota Exceeded',
        messageTemplate: 'User {userId} has exceeded monthly AI quota: {usage}/{monthlyLimit}',
        cooldownMinutes: 1440, // 24 hours
        enabled: true,
      },
      
      // Server error alerts
      {
        id: 'server_error_rate_high',
        type: 'server_error',
        condition: (data) => data.errorRate > 5, // More than 5% error rate
        severity: 'critical',
        title: 'High Error Rate Detected',
        messageTemplate: 'Error rate is {errorRate}% over the last {timeWindow} minutes',
        cooldownMinutes: 30,
        enabled: true,
      },
      
      {
        id: 'server_response_time_high',
        type: 'performance',
        condition: (data) => data.avgResponseTime > 2000, // More than 2 seconds
        severity: 'high',
        title: 'High Response Time',
        messageTemplate: 'Average response time is {avgResponseTime}ms over the last {timeWindow} minutes',
        cooldownMinutes: 15,
        enabled: true,
      },
      
      // Subscription expiration alerts
      {
        id: 'subscription_expiring_soon',
        type: 'subscription_expiration',
        condition: (data) => data.daysUntilExpiry <= 3,
        severity: 'medium',
        title: 'Subscription Expiring Soon',
        messageTemplate: 'User {userId} subscription expires in {daysUntilExpiry} days',
        cooldownMinutes: 1440, // 24 hours
        enabled: true,
      },
      
      // Performance alerts
      {
        id: 'memory_usage_high',
        type: 'performance',
        condition: (data) => data.memoryUsagePercent > 85,
        severity: 'high',
        title: 'High Memory Usage',
        messageTemplate: 'Memory usage is at {memoryUsagePercent}%',
        cooldownMinutes: 30,
        enabled: true,
      },
      
      {
        id: 'cpu_usage_high',
        type: 'performance',
        condition: (data) => data.cpuUsagePercent > 80,
        severity: 'high',
        title: 'High CPU Usage',
        messageTemplate: 'CPU usage is at {cpuUsagePercent}%',
        cooldownMinutes: 15,
        enabled: true,
      },
      
      // Security alerts
      {
        id: 'failed_login_attempts_high',
        type: 'security',
        condition: (data) => data.failedAttempts > 10,
        severity: 'medium',
        title: 'Suspicious Login Activity',
        messageTemplate: '{failedAttempts} failed login attempts from IP {ip}',
        cooldownMinutes: 60,
        enabled: true,
      },
      
      // Cost threshold alerts
      {
        id: 'daily_cost_high',
        type: 'cost_threshold',
        condition: (data) => data.dailyCost > 50,
        severity: 'medium',
        title: 'High Daily Costs',
        messageTemplate: 'Daily costs have reached ${dailyCost}',
        cooldownMinutes: 180,
        enabled: true,
      },
      
      {
        id: 'monthly_cost_critical',
        type: 'cost_threshold',
        condition: (data) => data.monthlyCost > 1000,
        severity: 'critical',
        title: 'Critical Monthly Costs',
        messageTemplate: 'Monthly costs have exceeded $1000: ${monthlyCost}',
        cooldownMinutes: 360,
        enabled: true,
      },
    ];

    rules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  private initializeNotificationChannels() {
    // Email notification channel
    this.notificationChannels.set('email', async (alert: Alert) => {
      try {
        // This would integrate with your email service (SendGrid, AWS SES, etc.)
        this.logger.log(`Email notification sent for alert: ${alert.title}`, 'Alerting');
      } catch (error) {
        this.logger.error(`Failed to send email notification: ${error.message}`, error.stack, 'Alerting');
      }
    });

    // Slack notification channel
    this.notificationChannels.set('slack', async (alert: Alert) => {
      try {
        const webhookUrl = this.configService.get('SLACK_WEBHOOK_URL');
        if (!webhookUrl) return;

        const payload = {
          text: `🚨 ${alert.title}`,
          attachments: [
            {
              color: this.getSlackColor(alert.severity),
              fields: [
                {
                  title: 'Severity',
                  value: alert.severity.toUpperCase(),
                  short: true,
                },
                {
                  title: 'Type',
                  value: alert.type,
                  short: true,
                },
                {
                  title: 'Message',
                  value: alert.message,
                  short: false,
                },
                {
                  title: 'Timestamp',
                  value: alert.timestamp.toISOString(),
                  short: true,
                },
              ],
            },
          ],
        };

        // Send to Slack webhook
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          this.logger.log(`Slack notification sent for alert: ${alert.title}`, 'Alerting');
        } else {
          throw new Error(`Slack webhook returned ${response.status}`);
        }
      } catch (error) {
        this.logger.error(`Failed to send Slack notification: ${error.message}`, error.stack, 'Alerting');
      }
    });

    // SMS notification channel (for critical alerts)
    this.notificationChannels.set('sms', async (alert: Alert) => {
      try {
        if (alert.severity !== 'critical') return;

        // This would integrate with your SMS service (Twilio, AWS SNS, etc.)
        this.logger.log(`SMS notification sent for critical alert: ${alert.title}`, 'Alerting');
      } catch (error) {
        this.logger.error(`Failed to send SMS notification: ${error.message}`, error.stack, 'Alerting');
      }
    });

    // PagerDuty notification channel
    this.notificationChannels.set('pagerduty', async (alert: Alert) => {
      try {
        if (alert.severity !== 'critical') return;

        const integrationKey = this.configService.get('PAGERDUTY_INTEGRATION_KEY');
        if (!integrationKey) return;

        const payload = {
          routing_key: integrationKey,
          event_action: 'trigger',
          payload: {
            summary: alert.title,
            source: 'recipe-app',
            severity: alert.severity,
            component: alert.type,
            custom_details: alert.data,
          },
        };

        const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          this.logger.log(`PagerDuty notification sent for alert: ${alert.title}`, 'Alerting');
        } else {
          throw new Error(`PagerDuty API returned ${response.status}`);
        }
      } catch (error) {
        this.logger.error(`Failed to send PagerDuty notification: ${error.message}`, error.stack, 'Alerting');
      }
    });
  }

  async createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    title: string,
    message: string,
    data?: any,
    userId?: string
  ): Promise<string> {
    const alert: Alert = {
      id: this.generateAlertId(),
      type,
      severity,
      title,
      message,
      data,
      userId,
      timestamp: new Date(),
    };

    this.alerts.set(alert.id, alert);

    // Send notifications
    await this.sendNotifications(alert);

    // Log the alert
    this.logger.warn(`Alert created: ${alert.title}`, 'Alerting', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      userId: alert.userId,
      data: alert.data,
    });

    return alert.id;
  }

  async checkAlert(ruleId: string, data: any): Promise<void> {
    const rule = this.alertRules.get(ruleId);
    if (!rule || !rule.enabled) return;

    // Check cooldown
    const cooldownKey = `${ruleId}:${data.userId || 'system'}`;
    const lastAlertTime = this.cooldowns.get(cooldownKey);
    const now = Date.now();
    
    if (lastAlertTime && (now - lastAlertTime) < (rule.cooldownMinutes * 60 * 1000)) {
      return;
    }

    // Check condition
    if (rule.condition(data)) {
      const message = this.formatMessage(rule.messageTemplate, data);
      
      await this.createAlert(
        rule.type as Alert['type'],
        rule.severity,
        rule.title,
        message,
        data,
        data.userId
      );

      // Set cooldown
      this.cooldowns.set(cooldownKey, now);
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) return;

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.logger.log(`Alert resolved: ${alert.title}`, 'Alerting', {
      alertId: alert.id,
      resolvedAt: alert.resolvedAt,
    });
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  async getAlertHistory(limit = 100): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  private async sendNotifications(alert: Alert): Promise<void> {
    const channels = this.getNotificationChannels(alert.severity);
    
    for (const channel of channels) {
      const notificationFunc = this.notificationChannels.get(channel);
      if (notificationFunc) {
        try {
          await notificationFunc(alert);
        } catch (error) {
          this.logger.error(`Failed to send notification via ${channel}`, error.stack, 'Alerting');
        }
      }
    }
  }

  private getNotificationChannels(severity: Alert['severity']): string[] {
    switch (severity) {
      case 'critical':
        return ['email', 'slack', 'sms', 'pagerduty'];
      case 'high':
        return ['email', 'slack'];
      case 'medium':
        return ['slack'];
      case 'low':
        return [];
      default:
        return ['slack'];
    }
  }

  private getSlackColor(severity: Alert['severity']): string {
    switch (severity) {
      case 'critical':
        return '#ff0000';
      case 'high':
        return '#ff8c00';
      case 'medium':
        return '#ffff00';
      case 'low':
        return '#00ff00';
      default:
        return '#808080';
    }
  }

  private formatMessage(template: string, data: any): string {
    let message = template;
    
    // Replace placeholders with actual values
    Object.keys(data).forEach(key => {
      const placeholder = `{${key}}`;
      const value = data[key];
      message = message.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return message;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startAlertMonitoring() {
    // Check system metrics every 5 minutes
    setInterval(async () => {
      await this.checkSystemMetrics();
    }, 5 * 60 * 1000);

    // Check cost metrics every hour
    setInterval(async () => {
      await this.checkCostMetrics();
    }, 60 * 60 * 1000);

    // Check user quota every 30 minutes
    setInterval(async () => {
      await this.checkUserQuotas();
    }, 30 * 60 * 1000);
  }

  private async checkSystemMetrics(): Promise<void> {
    try {
      const metrics = await this.metrics.getCustomMetrics();
      
      // Check memory usage
      if (metrics.memoryUsageMB) {
        const memoryUsagePercent = (metrics.memoryUsageMB / 1024) * 100; // Assuming 1GB limit
        await this.checkAlert('memory_usage_high', { memoryUsagePercent });
      }
      
      // Check response time
      if (metrics.avgResponseTime) {
        await this.checkAlert('server_response_time_high', {
          avgResponseTime: metrics.avgResponseTime,
          timeWindow: 5,
        });
      }
    } catch (error) {
      this.logger.error('Failed to check system metrics', error.stack, 'Alerting');
    }
  }

  private async checkCostMetrics(): Promise<void> {
    try {
      const dailySummary = await this.costTracking.getSystemCostSummary('daily');
      const monthlySummary = await this.costTracking.getSystemCostSummary('monthly');
      
      await this.checkAlert('daily_cost_high', { dailyCost: dailySummary.totalCost });
      await this.checkAlert('monthly_cost_critical', { monthlyCost: monthlySummary.totalCost });
    } catch (error) {
      this.logger.error('Failed to check cost metrics', error.stack, 'Alerting');
    }
  }

  private async checkUserQuotas(): Promise<void> {
    try {
      // This would check quotas for all users
      // For now, it's a placeholder
      this.logger.log('Checking user quotas', 'Alerting');
    } catch (error) {
      this.logger.error('Failed to check user quotas', error.stack, 'Alerting');
    }
  }

  // Public API for external services to trigger alerts
  async triggerPaymentFailureAlert(userId: string, failureCount: number): Promise<void> {
    await this.checkAlert('payment_failure_high', { userId, failureCount });
  }

  async triggerQuotaExceededAlert(userId: string, usage: number, dailyLimit: number, monthlyLimit: number): Promise<void> {
    await this.checkAlert('ai_quota_exceeded_daily', { userId, usage, dailyLimit });
    await this.checkAlert('ai_quota_exceeded_monthly', { userId, usage, monthlyLimit });
  }

  async triggerSubscriptionExpirationAlert(userId: string, daysUntilExpiry: number): Promise<void> {
    await this.checkAlert('subscription_expiring_soon', { userId, daysUntilExpiry });
  }

  async triggerSecurityAlert(ip: string, failedAttempts: number): Promise<void> {
    await this.checkAlert('failed_login_attempts_high', { ip, failedAttempts });
  }
}
