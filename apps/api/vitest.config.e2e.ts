import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-e2e.ts'],
    // e2e ทุกไฟล์แชร์ DB จริงตัวเดียวกัน (mini_project_db_test) และแต่ละไฟล์ DELETE ข้อมูลทดสอบของตัวเองก่อน/หลังรัน
    // ถ้าปล่อยให้รันพร้อมกันหลายไฟล์ (default ของ vitest) จะแย่งกัน DELETE/INSERT ข้อมูลชุดเดียวกัน ทำให้ test สุ่ม fail
    // จึงบังคับรันทีละไฟล์ (ยอมแลกความเร็วเพื่อความเสถียรของ e2e suite)
    fileParallelism: false,
  },
});
