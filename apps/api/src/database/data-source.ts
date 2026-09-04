import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// TypeORM CLI ไม่ผ่าน Nest bootstrap เลย -> ConfigModule ใช้ไม่ได้ที่นี่ ต้องโหลด .env เอง
dotenv.config();

// DataSource ตัวนี้แยกจาก TypeOrmModule.forRootAsync ใน app.module.ts โดยเจตนา
// ตัวนี้มีไว้ให้ CLI คำสั่ง migration:generate/migration:run/migration:revert ใช้เท่านั้น
// ตอน runtime จริงแอปยังใช้ค่าที่มาจาก ConfigService ผ่าน app.module.ts เหมือนเดิม
export const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '1433', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
});
