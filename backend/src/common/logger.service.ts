import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class AppLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    this.initializeLogger();
  }

  private initializeLogger() {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    
    // Custom format with structured logging
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, stack, context, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          context,
          ...(stack && { stack }),
          ...(Object.keys(meta).length && { meta }),
        });
      })
    );

    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        level: isProduction ? 'info' : 'debug',
        format: isProduction ? logFormat : winston.format.simple(),
      }),
    ];

    // File transports for production
    if (isProduction) {
      // Application logs
      transports.push(
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
          format: logFormat,
        })
      );

      // Error logs
      transports.push(
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
          format: logFormat,
        })
      );

      // Performance logs
      transports.push(
        new DailyRotateFile({
          filename: 'logs/performance-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '7d',
          level: 'info',
          format: logFormat,
        })
      );
    }

    this.logger = winston.createLogger({
      level: isProduction ? 'info' : 'debug',
      format: logFormat,
      transports,
      // Handle uncaught exceptions
      exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' }),
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' }),
      ],
    });
  }

  log(message: string, context?: string, meta?: any) {
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, stack?: string, context?: string, meta?: any) {
    this.logger.error(message, { stack, context, ...meta });
  }

  warn(message: string, context?: string, meta?: any) {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: any) {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: any) {
    this.logger.verbose(message, { context, ...meta });
  }

  // Custom methods for specific use cases
  logPerformance(operation: string, duration: number, meta?: any) {
    this.logger.info(`Performance: ${operation}`, {
      context: 'Performance',
      operation,
      duration,
      ...meta,
    });
  }

  logUserActivity(userId: string, action: string, meta?: any) {
    this.logger.info(`User Activity: ${action}`, {
      context: 'UserActivity',
      userId,
      action,
      ...meta,
    });
  }

  logAIUsage(userId: string, model: string, tokensUsed: number, cost: number) {
    this.logger.info('AI Usage', {
      context: 'AIUsage',
      userId,
      model,
      tokensUsed,
      cost,
    });
  }

  logSecurityEvent(event: string, userId?: string, ip?: string, meta?: any) {
    this.logger.warn(`Security Event: ${event}`, {
      context: 'Security',
      event,
      userId,
      ip,
      ...meta,
    });
  }

  logSystemMetrics(metrics: any) {
    this.logger.info('System Metrics', {
      context: 'SystemMetrics',
      ...metrics,
    });
  }
}
