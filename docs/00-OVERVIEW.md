# คู่มือโปรเจกต์ Mini Project — ภาพรวม

เอกสารชุดนี้เขียนสำหรับ **โปรแกรมเมอร์มือใหม่** ที่เพิ่งเข้ามาดูโปรเจกต์นี้เป็นครั้งแรก
อธิบายทีละขั้นตอนว่าโครงสร้างเป็นอย่างไร แต่ละส่วนทำหน้าที่อะไร และเชื่อมกันอย่างไร

## เอกสารทั้งหมดในชุดนี้

| ไฟล์ | เนื้อหา |
|---|---|
| [00-OVERVIEW.md](./00-OVERVIEW.md) | ไฟล์นี้ — ภาพรวมทั้งระบบ, monorepo คืออะไร, ภาพรวม data flow |
| [01-MAIN-PROJECT.md](./01-MAIN-PROJECT.md) | Root workspace, shared-types package, วิธีรันทั้งระบบ |
| [02-API.md](./02-API.md) | Backend (NestJS) แบบ step-by-step |
| [03-WEB.md](./03-WEB.md) | Frontend (Next.js) แบบ step-by-step |
| [04-REPORT.md](./04-REPORT.md) | Report service (ASP.NET Core + FastReport) แบบ step-by-step |

แนะนำให้อ่านตามลำดับ 00 → 01 → 02 → 03 → 04 เพราะแต่ละไฟล์อ้างอิงความเข้าใจจากไฟล์ก่อนหน้า

---

## 1. โปรเจกต์นี้คืออะไร

เป็นระบบจัดการสินค้า (Product) พื้นฐาน — เพิ่ม/ดู/ลบสินค้า — ประกอบด้วย:

- **หน้าเว็บ (Frontend)** ให้ผู้ใช้กรอกฟอร์ม ดูตาราง กดลบ ออกรายงาน
- **API (Backend)** รับ request จากหน้าเว็บ ตรวจสอบข้อมูล แล้วอ่าน/เขียนฐานข้อมูล
- **Report service** ออกรายงานสินค้าเป็น PDF (ASP.NET Core + FastReport แยกโปรเซสต่างหาก ดู [04-REPORT.md](./04-REPORT.md))
- **ฐานข้อมูล SQL Server** เก็บข้อมูลสินค้าจริง

ฝั่ง frontend/backend หลักเขียนด้วย **TypeScript** และแชร์ "รูปแบบข้อมูล" (types) ผ่าน package กลาง ส่วน report service เขียนด้วย **C# (.NET 8)** เพราะใช้ไลบรารีออกรายงาน FastReport ที่เป็น .NET เท่านั้น

## 2. โครงสร้างโฟลเดอร์แบบย่อ

```
mini-project/                  ← root ของ monorepo (มี package.json ตัวเดียวคุมทั้งหมด)
├── package.json                ← ประกาศ workspaces + สคริปต์รวม
│
├── apps/                       ← "แอปที่รันได้จริง" แต่ละตัว
│   ├── api/                    ← Backend: NestJS + TypeORM + MSSQL
│   │   └── src/
│   │       ├── main.ts             จุดเริ่มโปรแกรม (bootstrap server)
│   │       ├── app.module.ts       module หลัก ผูกทุกอย่างเข้าด้วยกัน
│   │       ├── config/             อ่านค่า .env (database, jwt)
│   │       ├── database/           TypeORM DataSource + migration files
│   │       ├── common/             ของกลางที่ใช้ข้าม module (pagination DTO, error filter)
│   │       ├── product/            feature module: CRUD สินค้า + transaction demo
│   │       ├── user/               feature module: บัญชีผู้ใช้
│   │       └── auth/               feature module: login/JWT/guard/role
│   │
│   ├── web/                    ← Frontend: Next.js (App Router) + React + Tailwind/shadcn
│   │   └── src/
│   │       ├── app/                หน้าเว็บต่าง ๆ (routing ตามชื่อโฟลเดอร์เท่านั้น ไม่มี logic)
│   │       │   ├── login/, register/    หน้าไม่ต้อง login
│   │       │   └── (authenticated)/     route group: /products, /profile ที่ต้อง login ก่อน
│   │       ├── modules/             ★ โค้ดจัดกลุ่มตาม feature/domain (ดู 2.1)
│   │       │   ├── auth/                auth-api.ts + components/{LoginForm,RegisterForm}.tsx
│   │       │   ├── products/            product-api.ts + components/{ProductList,ProductForm,DeleteProductButton}.tsx
│   │       │   ├── profile/             user-api.ts + components/ProfileForm.tsx
│   │       │   └── reports/             report-api.ts (เรียก apps/report)
│   │       ├── components/
│   │       │   ├── layout/          Sidebar/Topbar/UserMenu (โครงหน้าเว็บ ใช้ข้าม module)
│   │       │   └── ui/               shadcn component (Button, Input, Card, ...)
│   │       └── lib/                 ของกลางที่ใช้ข้าม module จริง ๆ เท่านั้น: api.ts (fetch client กลาง), auth-storage.ts (JWT), utils.ts
│   │
│   └── report/                 ← Report service: ASP.NET Core 8 + FastReport.OpenSource (C#)
│       ├── Program.cs               จุดเริ่มโปรแกรม, JWT auth, CORS, endpoint /reports/products
│       ├── Services/                ProductClient (เรียก apps/api), ProductsReportService (สร้าง PDF)
│       ├── Reports/                 ไฟล์ template .frx ของ FastReport
│       └── Models/                  DTO รับข้อมูลจาก apps/api (mirror ของ shared-types)
│
└── packages/                   ← โค้ดที่ใช้ร่วมกันระหว่าง apps (ไม่รันเอง)
    └── shared-types/           ← TypeScript interface กลาง (Product, CreateProductInput, ...)
```

**หลักการจำง่าย ๆ**: `apps/` = โปรแกรมที่สั่งรันได้ (มี `dev`/`start` script), `packages/` = ไลบรารีภายในที่ apps อื่นเอาไปใช้ แต่ตัวมันเองไม่ได้ "รัน" เป็นเซิร์ฟเวอร์หรือเว็บ

`apps/report` เป็น .NET ไม่ใช่ npm workspace (ไม่มี `package.json`) จึงรันแยกด้วยคำสั่งของตัวเอง (`npm run dev:report` ที่ root แค่ห่อ `dotnet run` ให้) — ดู [04-REPORT.md](./04-REPORT.md)

### 2.1 ทำไม `apps/web/src` ถึงมีทั้ง `modules/` และ `components/`/`lib/`

โปรเจกต์นี้จัดโค้ดฝั่งเว็บแบบ **module-based** (จัดตาม feature/domain) แทนการแยกแค่ตามประเภทไฟล์ (`components/` รวมทุกอย่าง, `lib/` รวมทุกอย่าง) — เหตุผลคือระบบแบบ ERP มักมีหลาย domain (สินค้า, รายงาน, ผู้ใช้, ในอนาคตอาจมีคลังสินค้า/บัญชี) ที่โตไม่เท่ากัน การรวมทุกอย่างไว้ในโฟลเดอร์แบนราบเดียวจะหาไฟล์ยากขึ้นเรื่อย ๆ เมื่อโปรเจกต์โต

กติกาแบ่งว่าไฟล์ไหนควรอยู่ที่ไหน:

| ตำแหน่ง | เก็บอะไร | ตัวอย่าง |
|---|---|---|
| `modules/<ชื่อ>/` | โค้ดที่เกี่ยวกับ feature นั้นโดยเฉพาะ — ทั้ง API client (`*-api.ts`) และ component | `modules/products/product-api.ts`, `modules/products/components/ProductList.tsx` |
| `components/layout/` | ส่วนโครงหน้าเว็บที่ใช้ข้าม module ทุกหน้า (ไม่ได้เป็นของ feature ไหนโดยเฉพาะ) | `Sidebar.tsx`, `Topbar.tsx`, `UserMenu.tsx` |
| `components/ui/` | shadcn component ดิบ ๆ ไม่มี business logic | `Button.tsx`, `Input.tsx` |
| `lib/` | โค้ดพื้นฐานที่ทุก module ต้องใช้ร่วมกันจริง ๆ เท่านั้น | `api.ts` (fetch client กลาง), `auth-storage.ts` (JWT), `utils.ts` (`cn()`) |

**module หนึ่งยัง import จาก module อื่นได้** ถ้า feature นั้นต้องใช้จริง ๆ (เช่น `modules/products/components/ProductList.tsx` เรียก `modules/reports/report-api.ts` เพื่อโชว์ปุ่ม "ออกรายงาน PDF") — กติกาไม่ได้ห้ามข้าม module เด็ดขาด แค่กันไม่ให้ของเฉพาะ feature ไปกองรวมอยู่ใน `lib/`/`components/` แบบไม่มีเจ้าของชัดเจน

## 3. ทำไมต้องแยกเป็น 3 โปรเจกต์ย่อย (monorepo)?

| แบบเก่า (แยก repo) | แบบนี้ (monorepo) |
|---|---|
| frontend, backend คนละ repo | อยู่ repo เดียว จัดการ version ร่วมกันง่าย |
| ต้อง copy-paste type ของ Product ไว้ 2 ที่ | ประกาศ type ครั้งเดียวใน `shared-types` แล้ว import ใช้ทั้งคู่ |
| แก้ backend แล้วลืมแก้ frontend ตาม เจอ bug ตอน runtime | ถ้า shape ข้อมูลไม่ตรงกัน TypeScript แจ้ง error ตอน **compile** ทันที |
| ต้อง clone/setup หลาย repo | `npm install` ครั้งเดียวที่ root ได้ทุกโปรเจกต์ |

โปรเจกต์นี้ใช้ **npm workspaces** (ดูใน [01-MAIN-PROJECT.md](./01-MAIN-PROJECT.md)) เป็นกลไกจัดการ monorepo

## 4. ภาพรวม Data Flow (ข้อมูลวิ่งอย่างไรตอนเพิ่มสินค้า 1 ชิ้น)

```
┌─────────────────────┐        1. กรอกฟอร์ม + submit
│   Browser (ผู้ใช้)    │ ─────────────────────────────────┐
└─────────────────────┘                                    │
          ▲                                                 ▼
          │ 6. redirect ไปหน้า list                ┌─────────────────────┐
          │    + แสดงสินค้าใหม่                     │  apps/web (Next.js) │
          │                                          │  modules/products/    │
          │                                          │  → product-api.ts    │
          │                                          └─────────────────────┘
          │                                                    │ 2. fetch()
          │                                                    │  POST /products
          │                                                    ▼
          │                                          ┌─────────────────────┐
          │                                          │  apps/api (NestJS)   │
          │                                          │  ProductController   │
          │                                          │  → ValidationPipe    │  3. เช็ค DTO (name, price, ...)
          │                                          │  → ProductService    │  4. บันทึกผ่าน TypeORM
          │                                          └─────────────────────┘
          │                                                    │
          │                                                    ▼
          │                                          ┌─────────────────────┐
          └──────────────────────────────────────────│   SQL Server DB     │
              5. ตอบกลับ JSON (ProductResponseDto)     │   ตาราง products     │
                                                        └─────────────────────┘
```

ทั้งฝั่ง frontend (`CreateProductInput`) และฝั่ง backend (`CreateProductDto`) ใช้ **shape เดียวกัน** ที่มาจาก `packages/shared-types` — นี่คือหัวใจของการแชร์ type ใน monorepo

> **หมายเหตุ**: diagram ข้างต้นเป็นเส้นทางพื้นฐานของ CRUD ตอนเริ่มโปรเจกต์ ปัจจุบันทั้ง `apps/api` และ `apps/web` เชื่อม auth เข้าด้วยกันครบแล้ว — ทุก request ต้องแนบ JWT token (เก็บใน `localStorage` ฝั่งเว็บ) ก่อนถึงจะถึง `ProductController` ได้ ยกเว้น endpoint ที่ `@Public()` (login/register) และผู้ใช้ต้อง login ผ่านหน้า `/login` ก่อนถึงจะเข้าหน้า `/products` ได้ รายละเอียดเต็ม ๆ อยู่ใน [02-API.md](./02-API.md) (Step 11) และ [03-WEB.md](./03-WEB.md) (Step 3-4)

## 5. เทคโนโลยีหลักที่ใช้

| ส่วน | เทคโนโลยี | หน้าที่ |
|---|---|---|
| Backend framework | [NestJS](https://nestjs.com/) | จัดโครงสร้าง API แบบ module/controller/service |
| ORM | [TypeORM](https://typeorm.io/) | แปลง class TypeScript ↔ ตารางในฐานข้อมูล + migration |
| Database | SQL Server (mssql) | เก็บข้อมูลจริง |
| Validation (backend) | class-validator | เช็คข้อมูลที่ client ส่งเข้ามาก่อนบันทึก |
| Authentication | @nestjs/jwt, @nestjs/passport, bcrypt | Login ด้วย JWT + hash รหัสผ่าน |
| Testing | vitest, @nestjs/testing, supertest | Unit test + e2e test |
| Frontend framework | [Next.js](https://nextjs.org/) (App Router) | Routing + Server/Client Component |
| UI library | React 19 | สร้าง component |
| Styling | Tailwind CSS v4 + shadcn/ui | Utility-class CSS + component ที่ copy เข้าโปรเจกต์ (ไม่ใช่ npm package ปิด) |
| Form | react-hook-form + zod | จัดการฟอร์มและ validation ฝั่ง client |
| Type sharing | npm workspaces + shared-types | แชร์ type ระหว่าง web กับ api |
| Report service | ASP.NET Core 8 (Minimal API) + FastReport.OpenSource | ออกรายงานสินค้าเป็นไฟล์ PDF แยกโปรเซสจาก apps/api |

## 6. เริ่มต้นใช้งานแบบเร็วที่สุด

```bash
npm install
npm run build:shared
npm run dev:api
```

`npm run dev:api` จะรัน migration ที่ค้างอยู่ให้อัตโนมัติ (`migrationsRun: true`) ต้องมีไฟล์ `apps/api/.env` ที่ตั้งค่า `DB_*` และ `JWT_*` ครบก่อน (ดูตัวอย่างที่ [apps/api/.env.example](../apps/api/.env.example))

แล้วเปิดอีก terminal:

```bash
npm run dev:web
```

จากนั้นเปิดเบราว์เซอร์ที่ `http://localhost:3001` — จะถูก redirect ไปหน้า `/login` อัตโนมัติเพราะยังไม่มี token กด "สมัครสมาชิก" เพื่อสร้างบัญชีก่อน (จะได้ role `STAFF` เสมอ) แล้ว login เข้าใช้งาน — รายละเอียดเต็ม ๆ ว่าคำสั่งแต่ละอันทำอะไร อยู่ใน [01-MAIN-PROJECT.md](./01-MAIN-PROJECT.md), ฝั่ง backend auth อยู่ใน [02-API.md](./02-API.md) (Step 11 และ Step 15), ฝั่งเว็บอยู่ใน [03-WEB.md](./03-WEB.md) (Step 3-4, 8-9)

ถ้าอยากทดสอบปุ่ม "ออกรายงาน PDF" ที่หน้า `/products` ด้วย ต้องเปิด terminal ที่ 3 แล้วรัน `npm run dev:report` เพิ่ม (ต้องมี .NET 8 SDK ติดตั้งไว้ก่อน) — รายละเอียดเต็ม ๆ อยู่ใน [04-REPORT.md](./04-REPORT.md)

---

**ต่อไป**: อ่าน [01-MAIN-PROJECT.md](./01-MAIN-PROJECT.md) เพื่อเข้าใจ root project และ shared-types ก่อนลงลึกที่ api/web
