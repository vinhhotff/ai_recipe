import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogger');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, url, ip } = req;
    const userAgent = req.get('User-Agent') || '';

    // Log request
    this.logger.log(`${method} ${url} - ${ip} - ${userAgent}`);

    // Capture response details
    const originalSend = res.send;
    res.send = function (body) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const contentLength = Buffer.isBuffer(body) ? body.length : JSON.stringify(body || '').length;
      
      // Log response
      const logLevel = res.statusCode >= 400 ? 'error' : res.statusCode >= 300 ? 'warn' : 'log';
      const logger = new Logger('RequestLogger');
      
      logger[logLevel](`${method} ${url} - ${res.statusCode} - ${duration}ms - ${contentLength} bytes`);
      
      // Track performance metrics
      if (duration > 1000) {
        logger.warn(`Slow request: ${method} ${url} took ${duration}ms`);
      }
      
      return originalSend.call(this, body);
    };

    next();
  }
}
