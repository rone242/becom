import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AnalyticsRouter');
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  // CORS — allow Next.js frontend
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
      process.env.MAIN_API_URL ?? 'http://localhost:4000',
    ],
    credentials: true,
  });

  // Swagger docs — JWT Bearer only (no InternalKey)
  const config = new DocumentBuilder()
    .setTitle('Analytics Router')
    .setDescription('Event analytics microservice — routes events to Facebook CAPI, GA4, TikTok CAPI. Events are stored in Redis (10-min TTL) then dispatched asynchronously.')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 4001;
  await app.listen(port);
  logger.log(`🚀 Analytics Router running on http://localhost:${port}/api`);
  logger.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
