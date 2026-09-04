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
| [05-NEW-PROJECT-FROM-TEMPLATE.md](./05-NEW-PROJECT-FROM-TEMPLATE.md) | วิธี copy โครงนี้ไปสร้างโปรเจกต์ใหม่ (เช่น ระบบขายปลีก) เป็น repo อิสระ — เริ่มจากฐานข้อมูลเปล่า |
| [06-EXISTING-DATABASE-ADOPTION.md](./06-EXISTING-DATABASE-ADOPTION.md) | วิธีนำโครงนี้ไปครอบฐานข้อมูล SQL Server ที่มีข้อมูลจริงอยู่แล้ว (schema เดิมไม่ตรงกับ mini-project) รวมถึงกรณีมีตารางหลักร้อยตาราง |

แนะนำให้อ่านตามลำดับ 00 → 01 → 02 → 03 → 04 เพราะแต่ละไฟล์อ้างอิงความเข้าใจจากไฟล์ก่อนหน้า — ส่วน 05/06 อ่านแยกเฉพาะตอนจะเริ่มโปรเจกต์ใหม่จากโครงนี้เท่านั้น (05 = ฐานข้อมูลเปล่า, 06 = มีฐานข้อมูล/ข้อมูลอยู่ก่อนแล้ว)

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

### 2.2 ถ้า module เดียวโตจนมีเมนู 20+ เมนู ต้องออกแบบยังไง (แนวทางสำหรับ "ระบบย่อย" ในอนาคต)

โครงสร้าง `modules/<ชื่อ>/` ในหัวข้อ 2.1 เหมาะกับ module ขนาดเล็ก-กลาง (เช่น `products`, `auth`, `profile`, `reports` ที่มีอยู่ตอนนี้ — แต่ละ module มีไม่กี่หน้าจอ) แต่ถ้าจะขยายระบบให้เป็น ERP เต็มรูปแบบ ที่แต่ละ **module folder แทนทั้ง "ระบบย่อย"** (เช่น `accounting/`, `inventory/`, `purchasing/`) ซึ่งแต่ละระบบย่อยมีเมนูย่อยของตัวเองไม่น้อยกว่า 20 เมนู โครงสร้างแบบแบนราบเดิม (`modules/accounting/components/*.tsx` รวมกันหมด, `accounting-api.ts` ไฟล์เดียว) จะเริ่มหาไฟล์ยากและ merge conflict บ่อยขึ้นเรื่อย ๆ เมื่อหลายคนแก้ module เดียวกันพร้อมกัน — ต้องเพิ่ม**ชั้นการจัดกลุ่มที่สอง**ภายใน module นั้น โดยใช้กติกาเดียวกับ 2.1 ซ้ำอีกระดับ (จัดตาม sub-feature ไม่ใช่ตามประเภทไฟล์):

```
modules/accounting/                    ← "ระบบย่อย" บัญชี (1 module folder = 1 ระบบย่อยใน ERP)
├── invoices/                           ← sub-feature: ใบแจ้งหนี้ (เมนูของตัวเอง)
│   ├── invoice-api.ts
│   └── components/
│       ├── InvoiceList.tsx
│       ├── InvoiceForm.tsx
│       └── InvoiceDetail.tsx
├── payments/                           ← sub-feature: การรับ/จ่ายเงิน
│   ├── payment-api.ts
│   └── components/{PaymentList,PaymentForm}.tsx
├── journal-entries/                    ← sub-feature: สมุดรายวัน
│   └── ...
├── ledger/                             ← sub-feature: บัญชีแยกประเภท
│   └── ...
│                                        (รวมแล้ว 20+ เมนูกระจายอยู่ใน sub-feature เหล่านี้)
├── shared/                             ← ใช้ร่วมกัน "เฉพาะภายใน accounting module" เท่านั้น
│   ├── types.ts                         (เช่น AccountType enum ที่ invoices/payments/ledger ใช้ร่วมกัน)
│   └── components/AccountPicker.tsx     (dropdown เลือกบัญชี ใช้ซ้ำหลาย sub-feature)
└── routes.ts                           ← ประกาศเมนู/nav item ทั้งหมดของ module นี้ไว้ที่เดียว
```

หลักการสำคัญ 3 ข้อ (เป็นกติกาเดียวกับ 2.1 แต่ประยุกต์ใช้อีกชั้น):

1. **แบ่งย่อยตาม sub-feature ไม่ใช่ตามประเภทไฟล์** — `invoices/`, `payments/`, `ledger/` แต่ละอันมี `*-api.ts` และ `components/` ของตัวเอง เหมือนที่ `modules/products/` มีของตัวเองแยกจาก `modules/auth/` — เป็นกฎเดิมที่ทำซ้ำอีกระดับ ไม่ใช่แนวคิดใหม่
2. **`shared/` ของ module ≠ `lib/` ของทั้งแอป** — `modules/accounting/shared/` เก็บของที่ใช้ร่วมกัน**เฉพาะภายใน accounting** เท่านั้น (เช่น `AccountPicker` ที่ invoices กับ ledger ต่างก็ต้องใช้) ถ้า module อื่น (เช่น `inventory`) ก็ต้องใช้ `AccountPicker` เหมือนกัน **ค่อย** ยกขึ้นไปที่ `lib/`หรือ `components/` ระดับแอปทีหลัง — อย่ายกขึ้นไปข้างบนล่วงหน้าก่อนมีเหตุผลจริง (YAGNI) เพราะจะทำให้ `lib/` บวมด้วยของที่จริง ๆ ใช้แค่ module เดียว
3. **`routes.ts` ต่อ module แทนการยัดทุกเมนูลง `Sidebar.tsx` ตรง ๆ** — pattern ปัจจุบันที่ [Sidebar.tsx](../apps/web/src/components/layout/Sidebar.tsx) เก็บ `NAV_ITEMS` เป็น array เดียวแบน ๆ (ดู [03-WEB.md Step 10.1](./03-WEB.md#101-sidebar--srccomponentslayoutsidebartsx)) ใช้ได้ตอนมีไม่กี่เมนู แต่พอแต่ละระบบย่อยมี 20+ เมนู การ hardcode ทุกเมนูของทุกระบบย่อยลง array เดียวจะทำให้ไฟล์นั้นกลายเป็นจุดที่ทุกทีมต้องมาแก้ร่วมกัน (merge conflict บ่อย) แนวทางที่ scale ได้คือให้แต่ละ module export `routes.ts`/`nav.ts` ของตัวเอง แล้วให้ `Sidebar.tsx` แค่ import มา flatten รวมกัน — ยังเปิดทางให้กรองเมนูตาม role/สิทธิ์ผู้ใช้ต่อ module ได้ในอนาคตโดยไม่ต้องแตะ `Sidebar.tsx` เลย

**ฝั่ง backend (`apps/api`) ก็ต้องขยายตามหลักการเดียวกัน** — NestJS รองรับ **nested module** อยู่แล้วโดย native ไม่ต้องแนะนำ pattern ใหม่: `AccountingModule` จะ `imports: [InvoicesModule, PaymentsModule, LedgerModule]` แทนที่จะเป็น module เดียวที่มี controller/service 20 กว่าตัวแบนราบเหมือนที่ `ProductModule`/`UserModule`/`AuthModule` เป็นอยู่ตอนนี้ (ดู [02-API.md Step 2.3](./02-API.md#23-feature-modules-และ-global-guard)) — แต่ละ sub-module ย่อย (`InvoicesModule` ฯลฯ) มี controller/service/entity ของตัวเอง เหมือนที่ `ProductModule` มีของตัวเองแยกจาก `UserModule`

> **เมื่อไหร่ควรเริ่มทำแบบนี้**: อย่าเริ่ม nested structure ล่วงหน้าก่อนมี module ที่โตจริง ๆ — ตอนนี้ทั้ง `modules/products`, `modules/auth`, `modules/profile`, `modules/reports` ยังเล็กพอที่โครงสร้างแบนราบใน 2.1 เพียงพออยู่ ให้ใช้แนวทางในหัวข้อนี้ **เมื่อมี module ไหนเริ่มมีมากกว่า 1 sub-feature ที่แต่ละอันมีหน้าจอ/route ของตัวเองชัดเจน** ไม่ใช่ทำไปพร้อมกันทุก module ตั้งแต่แรก (premature abstraction จะทำให้โปรเจกต์เล็กดูซับซ้อนเกินจำเป็น)

### 2.3 หลาย dev ทำงานพร้อมกันในระบบ ERP เดียวกัน — โครงสร้างนี้ช่วยยังไง

โครงสร้าง module-based (2.1) และ nested sub-feature (2.2) ไม่ได้มีไว้แค่จัดไฟล์ให้สวย แต่เป็นกลไกหลักที่ทำให้**หลายคน/หลายทีมแก้โค้ดพร้อมกันได้โดยชนกันน้อยที่สุด** — ไม่มีเครื่องมือพิเศษเพิ่มเติม อาศัยแค่ขอบเขตของโฟลเดอร์ที่ชัดเจนอยู่แล้ว:

1. **แบ่งความเป็นเจ้าของตามขอบเขต module/sub-feature** — 1 คนหรือ 1 ทีมย่อยรับผิดชอบ 1 ระบบย่อย (เช่น `modules/accounting/`) หรือถ้าทีมใหญ่พอ รับผิดชอบระดับ sub-feature เดียว (เช่น แค่ `modules/accounting/invoices/`) เพราะ `invoices/` กับ `modules/inventory/` ไม่มีไฟล์ทับกันเลยตามการออกแบบใน 2.1/2.2 สองคนที่ทำงานคนละระบบย่อยจึงแทบไม่มีทาง merge conflict กันเลย ต่างจากโครงสร้างแบนราบเดิมที่ทุกคนต้องมาแก้ `components/`/`lib/` ก้อนเดียวกันตลอด
2. **ตั้งชื่อ branch ตามขอบเขต module ไม่ใช่ตามคนหรือ sprint** — เช่น `feat/accounting-invoices` ไม่ใช่ `feat/john-week3` — ทำให้เห็นจาก branch name ได้ทันทีว่ากระทบไฟล์ส่วนไหน ช่วยตอน code review และตอนต้องย้อน commit กลับ (revert) แบบเจาะจงเฉพาะ feature นั้น
3. **`packages/shared-types` ต้องระวังเป็นพิเศษ** — เป็นจุดเดียวที่ทุก module (และ `apps/api`) พึ่งพาร่วมกัน (ดูหัวข้อ 3) การแก้ type ที่นี่กระทบเป็นวงกว้างข้าม module ทันที ควรปฏิบัติเหมือนแก้ public API: PR ที่แตะไฟล์นี้ควรแจ้ง reviewer จากทุก module ที่ใช้ type ที่เปลี่ยน และต้องรัน `npm run build:shared` (ดู [01-MAIN-PROJECT.md](./01-MAIN-PROJECT.md)) ให้ผ่านก่อน merge เสมอ เพราะ `dist/` ที่ไม่ทันสมัยจะทำให้ module อื่นเห็น type ผิดเงียบ ๆ
4. **backend ได้ขอบเขตเดียวกันฟรีจาก NestJS nested module** — ตามที่อธิบายใน 2.2 คนที่ทำ `InvoicesModule` กับคนที่ทำ `PaymentsModule` แทบไม่ต้องแตะไฟล์เดียวกันเลยนอกจากบรรทัด `imports: [...]` ใน `AccountingModule` (เพิ่ม module ใหม่เข้า array) ซึ่งเป็นจุดชนกันที่เล็กและแก้ conflict ง่ายมาก เทียบกับถ้าทุกคนต้องแก้ controller/serviceไฟล์เดียวกันตลอด
5. **CI ที่ scale ตาม module ได้ (ทำเมื่อจำเป็นจริง)** — เมื่อจำนวน module มากขึ้นจนรัน lint/test ทั้ง monorepo ทุก PR ช้าเกินไป ค่อยปรับ CI ให้รันเฉพาะ workspace/module ที่ไฟล์ในนั้นถูกแก้ (npm workspaces รองรับ `-w <package>` อยู่แล้วตามที่ใช้ใน root `package.json` — ดู [01-MAIN-PROJECT.md](./01-MAIN-PROJECT.md)) ไม่ต้องรีบทำตั้งแต่โปรเจกต์ยังเล็ก

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
