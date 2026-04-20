import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { SearchService } from './modules/search/search.service';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true
  });

  const searchService = app.get(SearchService);
  app.useGlobalInterceptors(new AuditLogInterceptor(searchService));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
