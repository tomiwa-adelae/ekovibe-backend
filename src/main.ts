import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://www.ekovibe.com.ng',
    'http://localhost:3001',
    'http://192.168.1.250:3000',
    'http://192.168.0.109:3000',
  ].filter(Boolean);

  // app.enableCors({

  //   origin: (origin, callback) => {
  //     // Allow requests with no origin (like mobile apps or curl)
  //     if (!origin) return callback(null, true);

  //     if (allowedOrigins.includes(origin)) {
  //       callback(null, true);
  //     } else {
  //       callback(new Error('Not allowed by CORS'));
  //     }
  //   },
  //   credentials: true,
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  // });
  app.enableCors({
    origin: 'https://www.ekovibe.com.ng',
    // process.env.FRONTEND_URL,
    // 'http://localhost:3001' ||
    // 'http://192.168.1.250:3000',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
