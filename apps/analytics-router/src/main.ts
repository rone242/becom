import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AnalyticsRouter');
  const app = await NestFactory.create(AppModule, {
    // Suppress verbose logs in production; use a structured logger in prod
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global validation — strips unknown fields, transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS — only allow the Next.js frontend and the main API internally
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
      process.env.MAIN_API_URL ?? 'http://localhost:4000',
    ],
    credentials: true,
  });

  // Swagger docs for admin & event endpoints
  const config = new DocumentBuilder()
    .setTitle('Analytics Router')
    .setDescription(
      'Enterprise event analytics microservice — routes frontend events to Facebook CAPI, GA4, and TikTok CAPI.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-internal-key' }, 'InternalKey')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  // All routes live under /api (e.g. POST /api/event, GET /api/admin/integrations)
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 4001;
  await app.listen(port);
  logger.log(`🚀 Analytics Router running on http://localhost:${port}/api`);
  logger.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
