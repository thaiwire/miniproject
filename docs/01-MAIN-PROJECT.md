# คู่มือ Main Project (Root Workspace)

เอกสารนี้อธิบาย "ตัวคุมกลาง" ของ monorepo — ไฟล์ที่อยู่นอก `apps/` และ `packages/` รวมถึง package กลาง `shared-types`

ก่อนอ่านไฟล์นี้ควรอ่าน [00-OVERVIEW.md](./00-OVERVIEW.md) ก่อน เพื่อให้เห็นภาพรวมว่าทำไมต้องมีชั้นนี้

---

## Step 1: ทำความเข้าใจ root `package.json`

เปิดไฟล์ [package.json](../package.json):

```json
{
  "name": "mini-project",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build:shared": "npm run build -w @mini-project/shared-types",
    "dev:api": "npm run start:dev -w @mini-project/api",
    "dev:web": "npm run dev -w @mini-project/web",
    "build:api": "npm run build -w @mini-project/api",
    "build:web": "npm run build -w @mini-project/web"
  }
}
```

อธิบายทีละบรรทัด:

1. **`"private": true`** — กัน publish ขึ้น npm registry โดยไม่ตั้งใจ (เพราะนี่ไม่ใช่ package ที่จะแจกใคร)
2. **`"workspaces": ["apps/*", "packages/*"]`** — นี่คือหัวใจของ npm workspaces บอก npm ว่า "ทุกโฟลเดอร์ย่อยใน `apps/` และ `packages/` ที่มี `package.json` ของตัวเอง ให้ถือเป็น sub-package ของ workspace นี้"
   - ผลลัพธ์: รัน `npm install` ที่ root ครั้งเดียว → npm จะติดตั้ง dependencies ของ **ทั้ง 3 โปรเจกต์ย่อย** (`api`, `web`, `shared-types`) พร้อมกัน และลิงก์ package ที่อ้างถึงกันเอง (เช่น `web` และ `api` ที่ import `@mini-project/shared-types`) แบบ symlink อัตโนมัติ — ไม่ต้อง publish ขึ้น npm จริง
3. **`scripts`** — สคริปต์ช่วยยิงคำสั่งไปยัง workspace ย่อยโดยไม่ต้อง `cd` เข้าไป ใช้ flag `-w <ชื่อ package>` ของ npm
   - `npm run dev:api` เทียบเท่ากับ `cd apps/api && npm run start:dev`
   - `npm run build:shared` เทียบเท่ากับ `cd packages/shared-types && npm run build`

> **ทำไมต้องรู้เรื่องนี้ก่อน**: มือใหม่มักจะงงว่าทำไมสั่ง `npm install` ที่ folder เดียวแล้วโปรเจกต์ย่อยใช้งานได้หมด — เพราะกลไก workspaces นี่เอง ไม่ต้องเข้าไป `npm install` ทีละโฟลเดอร์

## Step 2: ทำความเข้าใจ `packages/shared-types`

นี่คือ package ที่ **ไม่มี server ไม่มี UI** มีหน้าที่เดียวคือเก็บ TypeScript type/interface ที่ทั้ง `api` และ `web` ต้องใช้ร่วมกัน

โครงสร้าง:

```
packages/shared-types/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts       ← จุดรวม export ("barrel file")
│   └── product.ts      ← type ต่าง ๆ เกี่ยวกับ Product
└── dist/                ← โค้ดที่ compile แล้ว (สร้างจาก src ด้วย tsc)
```

### 2.1 เปิด [src/product.ts](../packages/shared-types/src/product.ts)

```typescript
export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  createdAt: string;
}

export interface CreateProductInput {
  name: string;
  price: number;
  costPrice: number;
  stock: number;
}

export type UpdateProductInput = Partial<CreateProductInput>;
```

สังเกตจุดสำคัญ:

- **`Product`** คือ shape ของข้อมูลที่ **frontend จะได้รับกลับมา** จาก API (response) — สังเกตว่า **ไม่มี `costPrice`** เพราะไม่ต้องการให้ต้นทุนสินค้าหลุดไปถึงฝั่ง client (ดูเหตุผลเต็ม ๆ ใน [02-API.md](./02-API.md) เรื่อง `ProductResponseDto`)
- **`CreateProductInput`** คือ shape ของข้อมูลที่ **frontend ต้องส่งไป** ตอนสร้างสินค้าใหม่ (มี `costPrice` เพราะตอนสร้างต้องกรอกต้นทุนด้วย)
- **`UpdateProductInput`** ใช้ `Partial<...>` ของ TypeScript แปลว่า "ทุก field เป็น optional หมด" — เหมาะกับ PATCH ที่ผู้ใช้จะแก้กี่ field ก็ได้

### 2.2 เปิด [src/index.ts](../packages/shared-types/src/index.ts)

```typescript
export * from "./product";
```

ไฟล์นี้เรียกว่า **barrel file** — รวม export จากทุกไฟล์ในโฟลเดอร์ไว้ที่จุดเดียว ทำให้ฝั่งที่ import ใช้ได้ง่าย ๆ ว่า:

```typescript
import { Product, CreateProductInput } from '@mini-project/shared-types';
```

แทนที่จะต้องรู้ path ลึก ๆ ว่า type อยู่ไฟล์ไหน (ถ้ามีหลาย type ในอนาคต เช่น `user.ts`, `order.ts` ก็แค่เพิ่ม `export * from "./order"` ที่นี่)

### 2.3 ทำไมต้อง build (`dist/`) ทั้งที่มี `src/` อยู่แล้ว?

เปิด [package.json](../packages/shared-types/package.json):

```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json"
  }
}
```

- `main` / `types` ชี้ไปที่ `dist/` ไม่ใช่ `src/` — เพราะ Node.js รันไฟล์ `.js` ไม่ได้รันไฟล์ `.ts` ตรง ๆ
- คำสั่ง `npm run build:shared` (ที่ root) จะสั่ง `tsc` แปลง `.ts` → `.js` + สร้างไฟล์ `.d.ts` (type declaration) ใส่ใน `dist/`
- เมื่อ `api` หรือ `web` เขียน `import { Product } from '@mini-project/shared-types'` มันจะไปอ่านจาก `dist/` ที่ build ไว้แล้ว

> **กฎสำคัญที่มือใหม่มักพลาด**: ถ้าคุณแก้ไฟล์ใน `packages/shared-types/src/` แล้วไปเปิด `api`/`web` ทันที จะ**ไม่เห็นการเปลี่ยนแปลง** เพราะ `dist/` ยังเป็นโค้ดเก่า ต้องรัน `npm run build:shared` ใหม่ทุกครั้งที่แก้ shared-types

## Step 3: ลำดับการรันโปรเจกต์ทั้งหมด (สำคัญมาก — ต้องทำตามลำดับ)

### 3.1 ติดตั้ง dependencies ทั้งหมด

```bash
npm install
```

รันที่ **root เท่านั้น** (ไม่ต้องเข้าไป `apps/api` หรือ `apps/web` แล้ว `npm install` ซ้ำ — เดี๋ยวจะพังเรื่อง symlink ของ workspace)

### 3.2 Build shared-types ก่อนเสมอ

```bash
npm run build:shared
```

**ทำไมต้องทำก่อน**: `api` และ `web` ต่าง import จาก `@mini-project/shared-types` ที่ต้องมี `dist/` อยู่จริงถึงจะ resolve type ได้ ถ้าข้ามขั้นตอนนี้ ทั้ง `api` และ `web` จะ error ทันทีตอน build/dev ว่าหา module ไม่เจอ

### 3.3 ตั้งค่าฐานข้อมูล (สำหรับ api)

ดูรายละเอียดเต็มใน [02-API.md](./02-API.md) หัวข้อ environment variables — ต้องมีไฟล์ `apps/api/.env` ชี้ไปยัง SQL Server ที่รันอยู่

### 3.4 รัน backend

เปิด terminal ที่ 1:

```bash
npm run dev:api
```

จะได้ API ที่ `http://localhost:3000`

### 3.5 รัน frontend

เปิด terminal ที่ 2 (คนละหน้าต่างจาก backend เพราะทั้งคู่ต้องรันค้างไว้พร้อมกัน):

```bash
npm run dev:web
```

จะได้เว็บที่ `http://localhost:3001`

### 3.6 สรุปเป็นตาราง

| ลำดับ | คำสั่ง | รันที่ไหน | ทำอะไร |
|---|---|---|---|
| 1 | `npm install` | root | ติดตั้ง dependency ทุก workspace |
| 2 | `npm run build:shared` | root | compile shared-types → `dist/` |
| 3 | `npm run dev:api` | root (terminal แยก) | เปิด backend port 3000 |
| 4 | `npm run dev:web` | root (terminal แยก) | เปิด frontend port 3001 |

> ทำไม backend อยู่ port 3000 แต่ frontend อยู่ port 3001? เพราะเป็นคนละโปรเซสกัน (คนละ server) รันพร้อมกันบนเครื่องเดียวต้องคนละ port ดู [02-API.md](./02-API.md) เรื่อง CORS ประกอบ ว่าทำไมสอง port คุยกันได้ทั้งที่เป็นคนละ origin

---

**ต่อไป**: อ่าน [02-API.md](./02-API.md) เพื่อลงลึกฝั่ง Backend (NestJS)
