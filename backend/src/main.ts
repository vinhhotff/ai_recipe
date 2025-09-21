import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: [
      configService.get('FRONTEND_URL') || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control'
    ],
    credentials: true,
    optionsSuccessStatus: 200
  });

  // Rate limiting
  app.use(
    rateLimit({
      windowMs: (configService.get('RATE_LIMIT_TTL') || 60) * 1000,
      max: configService.get('RATE_LIMIT_LIMIT') || 100,
      message: 'Too many requests from this IP, please try again later.',
    }),
  );

  // Global middleware and filters
  app.use(new RequestLoggerMiddleware().use.bind(new RequestLoggerMiddleware()));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Recipe Generator API')
      .setDescription('AI-powered recipe generation API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get('PORT') || 3001;
  await app.listen(port);
  
  logger.log(`🚀 Recipe Generator API is running on: http://localhost:${port}`);
  if (configService.get('NODE_ENV') !== 'production') {
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  }
  logger.log(`⚡ Cache enabled: ${configService.get('REDIS_ENABLED', 'true')}`);
}

bootstrap();