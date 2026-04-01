// src/seed.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DatabaseSeederService } from './modules/users/database-seeder.service';

async function bootstrap() {
    // 1. Tạo NestJS Context (Không gọi app.listen() để mở port)
    const app = await NestFactory.createApplicationContext(AppModule);

    // 2. Lấy Seeder Service ra từ bộ nhớ của NestJS
    const seeder = app.get(DatabaseSeederService);

    try {
        // 3. Thực thi kịch bản tạo dữ liệu
        await seeder.seed();
        console.log('✅ Seeding hoàn tất thành công!');
    } catch (error) {
        console.error('❌ Lỗi trong quá trình Seeding!', error);
    } finally {
        // 4. Đóng ứng dụng và ngắt kết nối Database
        await app.close();
        process.exit(0);
    }
}

bootstrap();