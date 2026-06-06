// src/seed.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DatabaseSeederService } from './database-seeder.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const seeder = app.get(DatabaseSeederService);

    try {
        await seeder.seed();
        console.log(' Seeding hoàn tất thành công!');
    } catch (error) {
        console.error(' Lỗi trong quá trình Seeding!', error);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();