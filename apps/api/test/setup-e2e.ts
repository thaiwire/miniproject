import * as dotenv from 'dotenv';
import * as path from 'path';

// e2e ต้องต่อ DB คนละตัวกับ dev (mini_project_db_test) เพื่อไม่ให้ข้อมูลทดสอบไปปนกับข้อมูลจริง
// ต้อง config ก่อน import AppModule เสมอ ไม่งั้น process.env จะยังเป็นค่าจาก .env (dev) อยู่
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
