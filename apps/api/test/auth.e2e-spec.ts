// รันไฟล์นี้ด้วย `npm run test:e2e` เท่านั้น (ชี้ไปที่ mini_project_db_test ผ่าน test/setup-e2e.ts)
// ห้ามรันใส่ dev/production database เด็ดขาด เพราะจะสร้าง/ลบข้อมูลผู้ใช้จริงระหว่างเทส
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { AllExceptionsFilter } from './../src/common/filters/all-exceptions.filter.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

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
  });

  beforeEach(async () => {
    // ล้างข้อมูล user ทดสอบก่อนแต่ละเทส กัน email ซ้ำข้าม test run
    await dataSource.query('DELETE FROM users');
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM users');
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user with STAFF role by default (never client-supplied)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'newuser@test.com', password: 'password123', name: 'New User' })
        .expect(201);

      expect(res.body.email).toBe('newuser@test.com');
      expect(res.body.role).toBe('staff');
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should reject a duplicate email with 409', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dup@test.com', password: 'password123', name: 'First' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dup@test.com', password: 'password123', name: 'Second' })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'login@test.com', password: 'password123', name: 'Login User' });
    });

    it('should return access and refresh tokens for correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@test.com', password: 'password123' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should return 401 for a wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@test.com', password: 'wrong-password' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.path).toBe('/auth/login');
    });
  });

  describe('Global guard behavior', () => {
    it('should reject a protected route with no token (401)', async () => {
      const res = await request(app.getHttpServer()).get('/products').expect(401);
      expect(res.body.statusCode).toBe(401);
    });

    it('should allow the public health-check route with no token', async () => {
      await request(app.getHttpServer()).get('/').expect(200);
    });

    it('should reject an ADMIN-only route when using a STAFF token (403)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'staffonly@test.com', password: 'password123', name: 'Staff' });
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'staffonly@test.com', password: 'password123' });
      const token = loginRes.body.accessToken;

      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', price: 10, costPrice: 5, stock: 1 })
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });
  });
});
