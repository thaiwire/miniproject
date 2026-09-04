// รันไฟล์นี้ด้วย `npm run test:e2e` เท่านั้น (ชี้ไปที่ mini_project_db_test ผ่าน test/setup-e2e.ts)
// ห้ามรันใส่ dev/production database เด็ดขาด เพราะจะสร้าง/ลบข้อมูลสินค้าจริงระหว่างเทส
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { AllExceptionsFilter } from './../src/common/filters/all-exceptions.filter.js';

describe('Product (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    dataSource = moduleFixture.get(DataSource);

    // ล้างข้อมูลทดสอบเก่าก่อนเริ่ม (idempotent ถ้ารันซ้ำ)
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM users');

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'e2e-admin@test.com', password: 'password123', name: 'Admin' });
    // /auth/register บังคับ role เป็น STAFF เสมอ (กัน privilege escalation) -> เทสนี้ promote ตรง ๆ ผ่าน DB
    // เพื่อจำลอง admin ที่มีอยู่แล้วในระบบจริง (สร้างครั้งแรกผ่าน seed/DBA ไม่ใช่ endpoint สาธารณะ)
    await dataSource.query(`UPDATE users SET role = 'admin' WHERE email = 'e2e-admin@test.com'`);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'e2e-staff@test.com', password: 'password123', name: 'Staff' });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2e-admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.accessToken;

    const staffLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2e-staff@test.com', password: 'password123' });
    staffToken = staffLogin.body.accessToken;
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM products');
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM users');
    await app.close();
  });

  it('full CRUD flow: create -> list (paginated) -> get -> update -> delete', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Widget', price: 100, costPrice: 50, stock: 20 })
      .expect(201);

    expect(createRes.body).not.toHaveProperty('costPrice'); // ต้นทุนห้ามหลุดออกไปใน response
    const id = createRes.body.id;

    const listRes = await request(app.getHttpServer())
      .get('/products?page=1&limit=10')
      .set('Authorization', `Bearer ${staffToken}`) // อ่านได้ทุก role ที่ login แล้ว
      .expect(200);

    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.meta).toEqual({ page: 1, limit: 10, totalItems: 1, totalPages: 1 });

    await request(app.getHttpServer())
      .get(`/products/${id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    const updateRes = await request(app.getHttpServer())
      .patch(`/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stock: 99 })
      .expect(200);
    expect(updateRes.body.stock).toBe(99);

    await request(app.getHttpServer())
      .delete(`/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('should return a consistent error envelope for a missing product (404)', async () => {
    const res = await request(app.getHttpServer())
      .get('/products/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body).toMatchObject({
      statusCode: 404,
      error: 'NotFoundException',
      path: '/products/999999',
    });
    expect(res.body.timestamp).toBeDefined();
  });

  it('should reject product creation from a STAFF token (403)', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Widget', price: 100, costPrice: 50, stock: 20 })
      .expect(403);
  });

  it('adjustStock: should commit a valid adjustment and roll back an invalid one', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Widget', price: 100, costPrice: 50, stock: 10 });
    const id = createRes.body.id;

    const okRes = await request(app.getHttpServer())
      .patch(`/products/${id}/stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ delta: -3 })
      .expect(200);
    expect(okRes.body.stock).toBe(7);

    await request(app.getHttpServer())
      .patch(`/products/${id}/stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ delta: -999 })
      .expect(400);

    // rollback ต้องทำงานจริง -> stock ต้องยังเป็น 7 ไม่ใช่ค่าติดลบหรือค่าอื่น
    const finalRes = await request(app.getHttpServer())
      .get(`/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(finalRes.body.stock).toBe(7);
  });
});
