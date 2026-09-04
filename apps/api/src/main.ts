import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // ใช้ NestExpressApplication (ไม่ใช่ INestApplication เฉย ๆ) เพราะต้องเรียก useStaticAssets() ด้านล่าง
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // เปิด CORS ให้ frontend (คนละ port/domain) เรียก API นี้ได้
  app.enableCors({ origin: 'http://localhost:3001' });

  // เสิร์ฟไฟล์ที่ผู้ใช้ upload ไว้ (เช่น รูปโปรไฟล์) เป็น static file ผ่าน URL /uploads/*
  // __dirname ตอน build แล้วคือ dist/ -> ต้องถอยออกมา 1 ชั้นไปหา uploads/ ที่อยู่คู่กับ dist/ (นอก dist กัน deleteOutDir ลบทิ้งตอน build ใหม่)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  // เปิด validation แบบ global -> ทุก endpoint เช็ค DTO อัตโนมัติ
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ตัด field ที่ไม่ได้ประกาศใน DTO ทิ้ง
      forbidNonWhitelisted: true, // ถ้ามี field เกิน -> error 400 ทันที
      transform: true, // แปลง type อัตโนมัติ เช่น "5" (string) -> 5 (number)
    }),
  );

  // ครอบทุก error ให้ตอบกลับเป็น format เดียวกันเสมอ (statusCode, message, error, path, timestamp)
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `Backend running at http://localhost:${process.env.PORT ?? 3000}`,
  );
}
bootstrap();
