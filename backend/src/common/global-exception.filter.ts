import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const { status, message, error } = this.getErrorDetails(exception);
    
    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(process.env.NODE_ENV === 'development' && { error })
    };

    // Log error details
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} - ${status} - ${message}`);
    }

    response.status(status).json(errorResponse);
  }

  private getErrorDetails(exception: unknown): { status: number; message: string; error?: any } {
    // Handle NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        message: exception.message,
        error: exception.getResponse()
      };
    }

    // Handle Prisma errors
    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception);
    }

    // Handle validation errors
    if (exception instanceof Error) {
      if (exception.message.includes('validation')) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          error: exception.message
        };
      }

      // Handle JWT errors
      if (exception.message.includes('jwt') || exception.message.includes('token')) {
        return {
          status: HttpStatus.UNAUTHORIZED,
          message: 'Authentication failed',
          error: exception.message
        };
      }
    }

    // Default to internal server error
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: exception instanceof Error ? exception.message : 'Unknown error'
    };
  }

  private handlePrismaError(exception: PrismaClientKnownRequestError): { status: number; message: string; error?: any } {
    switch (exception.code) {
      case 'P2002':
        // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          message: 'Resource already exists',
          error: `Duplicate value for field: ${exception.meta?.target || 'unknown'}`
        };
      
      case 'P2025':
        // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          error: 'The requested resource does not exist'
        };
      
      case 'P2003':
        // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference',
          error: 'Referenced resource does not exist'
        };
      
      case 'P2014':
        // Required relation missing
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Missing required data',
          error: 'Required related data is missing'
        };
      
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error',
          error: exception.message
        };
    }
  }
}
