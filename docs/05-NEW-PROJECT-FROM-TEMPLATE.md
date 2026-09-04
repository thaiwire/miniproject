# คู่มือ: ใช้ mini-project เป็นต้นแบบสร้างโปรเจกต์ใหม่ (เช่น ระบบขายปลีก)

เอกสารนี้อธิบายวิธี copy โครงสร้างของ mini-project ออกไปเป็น repo ใหม่ที่เป็นอิสระ 100% (ไม่ใช่ branch/fork ที่ยังผูกกับ repo เดิม) สำหรับสร้างระบบอื่น เช่น **ระบบขายปลีก (POS/retail)** — เลือกแนวทางนี้แทนการทำ starter template/generator เพราะระบบขายปลีกมี business logic ต่างจากระบบสินค้าเดิมมาก (มี transaction การขาย, ลูกค้า, ส่วนลด ฯลฯ) การ copy โครงไปแก้ไขอิสระเหมาะกว่าการพยายามทำ generator ที่ต้องรองรับหลายเคสตั้งแต่ยังไม่รู้ความต้องการจริงครบ

ควรอ่าน [00-OVERVIEW.md](./00-OVERVIEW.md) ทั้งฉบับก่อน โดยเฉพาะหัวข้อ 2.1-2.3 (module-based structure + หลาย dev ทำงานร่วมกัน) เพราะแนวทางในเอกสารนี้อ้างอิงโครงสร้างนั้นเป็นฐาน

---

## Step 1: แยกไฟล์เป็น 2 กลุ่ม — "โครงที่เอาไปใช้ซ้ำได้" กับ "ของเฉพาะสินค้า"

ก่อน copy ต้องรู้ก่อนว่าไฟล์ไหนคือ **scaffolding** (auth, pagination, error handling, monorepo config — ใช้ได้กับทุกระบบ) และไฟล์ไหนคือ **business logic เฉพาะของระบบสินค้า** (ต้องลบทิ้งหรือเขียนใหม่ทั้งหมดสำหรับระบบขายปลีก)

### 1.1 ฝั่ง `apps/api` (NestJS)

| โฟลเดอร์/ไฟล์ | เก็บไว้ (scaffolding) | ลบ/เขียนใหม่ (เฉพาะสินค้า) |
|---|---|---|
| `src/auth/` | ✅ ทั้งหมด — JWT, login/register, guard, role, decorator (ดู [02-API.md Step 11](./02-API.md#step-11-authrbac)) | |
| `src/common/` | ✅ ทั้งหมด — `PaginationQueryDto`, `AllExceptionsFilter` (ดู Step 13-14) | ยกเว้น `minId`/`maxId` ใน `PaginationQueryDto` ถ้าระบบใหม่ไม่ต้องกรองช่วง id แบบเดียวกัน (ลบทิ้งได้ หรือเก็บไว้เผื่อใช้) |
| `src/config/` | ✅ ทั้งหมด — `database.config.ts`, `jwt.config.ts` (ปรับแค่ชื่อ default database) | |
| `src/database/` | ✅ โครง `data-source.ts` + วิธีตั้ง migration (ดู [02-API.md Step 10](./02-API.md#step-10-migration-เลิกใช้-synchronize)) | ❌ ไฟล์ migration เดิมทั้งหมด (`InitialSchema`, `AddProductsTable`, ...) ต้องลบแล้วสร้างใหม่ให้ตรงกับ schema ของระบบขายปลีก |
| `src/user/` | ✅ ทั้งหมด — โครง user/profile ใช้ข้ามระบบได้ (ปรับ field ตามต้องการ) | |
| `src/product/` | | ❌ ลบทั้งโฟลเดอร์ — เอาไว้เป็น**ตัวอย่างอ้างอิง**เวลาสร้าง feature module ใหม่ (เช่น `sale/`, `customer/`) เพราะโครง Controller/Service/DTO/Entity ในนี้เป็น pattern ที่ทำซ้ำได้ (ดู 1.3) แต่ตัว entity/business logic เองใช้กับระบบขายปลีกไม่ได้ตรง ๆ |
| `src/app.module.ts` | ✅ โครง (ConfigModule, TypeOrmModule, global guard) | ต้องเอา `ProductModule` ออก แล้วใส่ module ใหม่ของระบบขายปลีกเข้าไปแทน |

### 1.2 ฝั่ง `apps/web` (Next.js)

| โฟลเดอร์/ไฟล์ | เก็บไว้ (scaffolding) | ลบ/เขียนใหม่ (เฉพาะสินค้า) |
|---|---|---|
| `src/modules/auth/` | ✅ ทั้งหมด — LoginForm, RegisterForm, auth-api.ts | |
| `src/modules/profile/` | ✅ ทั้งหมด | |
| `src/lib/` | ✅ ทั้งหมด — `api.ts` (fetch client กลาง), `auth-storage.ts` (JWT), `utils.ts` | |
| `src/components/ui/` | ✅ ทั้งหมด — shadcn component ดิบ ไม่มี business logic เลย | |
| `src/components/layout/` | ✅ โครง Topbar/UserMenu | ต้องแก้ `Sidebar.tsx`'s `NAV_ITEMS` ให้เป็นเมนูของระบบใหม่ (ดู [00-OVERVIEW.md 2.2](./00-OVERVIEW.md#22-ถ้า-module-เดียวโตจนมีเมนู-20-เมนู-ต้องออกแบบยังไง-แนวทางสำหรับ-ระบบย่อย-ในอนาคต) ถ้าระบบใหม่มีหลายระบบย่อย) |
| `src/app/(authenticated)/layout.tsx` | ✅ ทั้งหมด — auth guard pattern (ดู [03-WEB.md Step 4](./03-WEB.md#step-4-route-group-แยกหน้าที่ต้อง-login-vs-ไม่ต้อง--srcappauthenticatedlayouttsx)) | |
| `src/modules/products/`, `src/modules/reports/` | | ❌ ลบทั้งสองโฟลเดอร์ — เป็นตัวอย่างอ้างอิงเวลาสร้าง module ใหม่ของระบบขายปลีก (เช่น `modules/sales/`, `modules/customers/`) |
| `src/app/(authenticated)/products/` | | ❌ ลบทั้งโฟลเดอร์ route |

### 1.3 ฝั่ง `apps/report` (.NET) และ `packages/shared-types`

- **`apps/report`** — เก็บโครงทั้งหมดไว้ (JWT validation, CORS, DotNetEnv config pattern — ดู [04-REPORT.md](./04-REPORT.md)) แต่ `Models/ProductDto.cs`, `Services/ProductClient.cs`, `Services/ProductsReportService.cs`, `Reports/ProductsReport.frx` ต้องเขียนใหม่ให้ตรงกับ entity ของระบบใหม่ (เช่น รายงานการขายรายวัน แทนรายงานสินค้า)
- **`packages/shared-types/src/pagination.ts`** — ✅ เก็บทั้งหมด (`PaginationQuery`, `PaginationMeta`, `PaginatedResult<T>` เป็น generic ใช้ได้ทุกระบบ)
- **`packages/shared-types/src/user.ts`** — ✅ เก็บไว้ ปรับ field ตามต้องการ
- **`packages/shared-types/src/product.ts`** — ❌ ลบ แล้วสร้างไฟล์ type ใหม่ตาม domain ของระบบขายปลีก (เช่น `sale.ts`, `customer.ts`) ตาม pattern เดียวกัน (`export * from "./sale"` ใน `index.ts`)

## Step 2: ลำดับขั้นตอนการ copy จริง

```bash
# 1. copy ทั้งโฟลเดอร์ไปที่ path ใหม่ (นอก mini-project เดิม)
cp -r /path/to/mini-project /path/to/retail-project
cd /path/to/retail-project

# 2. ตัดการเชื่อมกับ git เดิม แล้วเริ่ม repo ใหม่ที่สะอาด
rm -rf .git
git init
```

> ⚠️ **เรื่องที่ต้องระวังเป็นพิเศษ**: อย่าลืมเช็คว่าไม่มี `.git` ซ้อนอยู่ข้างในโฟลเดอร์ย่อยไหนอีก (เช่นที่เคยเกิดปัญหากับ `apps/web/.git` ในโปรเจกต์นี้มาก่อน — ดูรายละเอียดที่ `git log` ของ mini-project ถ้าอยากอ้างอิงว่าปัญหาหน้าตาเป็นยังไง) รัน `find . -name ".git" -type d` เช็คให้ชัวร์ก่อน commit ครั้งแรกของ repo ใหม่

```bash
# 3. ลบไฟล์เฉพาะสินค้าตาม Step 1
rm -rf apps/api/src/product
rm -rf apps/web/src/modules/products apps/web/src/modules/reports
rm -rf "apps/web/src/app/(authenticated)/products"
rm packages/shared-types/src/product.ts

# 4. ลบ migration เดิม (schema ของระบบสินค้าใช้กับระบบใหม่ไม่ได้)
rm apps/api/src/database/migrations/*.ts
```

```bash
# 5. แก้ config ที่ผูกกับชื่อโปรเจกต์เดิม
#    - root package.json: "name": "mini-project" -> "name": "retail-project"
#    - apps/*/package.json: เปลี่ยน @mini-project/* -> @retail-project/* ทุกจุด (รวม import path ในโค้ด)
#    - packages/shared-types/package.json: เปลี่ยนชื่อ package
#    - apps/report/report.csproj: ปรับชื่อ assembly ถ้าต้องการ (กัน namespace ชนกับ FastReport.Report เหมือนที่ 04-REPORT.md Step 4.2 อธิบายไว้)
```

```bash
# 6. .env — copy .env.example ทุกไฟล์เป็น .env แล้วใส่ค่าจริงของระบบใหม่
#    (database ใหม่, JWT_SECRET ใหม่ที่ apps/api กับ apps/report ต้องตรงกัน — ดู 04-REPORT.md Step 2.2)
cp apps/api/.env.example apps/api/.env
cp apps/report/.env.example apps/report/.env
cp apps/web/.env.local.example apps/web/.env.local  # ถ้ามีไฟล์ตัวอย่างนี้
```

```bash
# 7. ติดตั้งและ build ให้ผ่านก่อนเริ่มเขียนโค้ดใหม่ (verify ว่าโครงยังสมบูรณ์หลังลบ)
npm install
npm run build:shared
npm run build:api
npm run build:web
cd apps/report && dotnet build && cd ../..
```

## Step 3: สร้าง feature module แรกของระบบใหม่ โดยเลียนแบบ `product`/`products` เดิม

หลังลบของเดิมออกแล้ว ให้สร้าง module แรกของระบบขายปลีก (เช่น "การขาย"/`sale`) โดยทำตามโครงเดียวกับที่ `ProductModule`/`modules/products` เคยเป็น — **นี่คือเหตุผลที่แนะนำให้ลบ ไม่ใช่แก้ทับ**: การอ่าน pattern เดิมเป็นตัวอย่างแล้วเขียนใหม่ทำให้เข้าใจว่าทำไมแต่ละไฟล์มีหน้าที่อะไร (ตามที่ [02-API.md](./02-API.md)/[03-WEB.md](./03-WEB.md) อธิบายไว้ทีละ Step) ดีกว่าแก้ทับโค้ดเดิมที่อาจหลงเหลือ logic ของสินค้าปนอยู่

### 3.1 Backend — โครงไฟล์ที่ต้องมีต่อ 1 feature module (อ้างอิงจาก `src/product/`)

```
src/sale/
├── sale.module.ts              (เทียบเท่า product.module.ts — ดู 02-API.md Step 4)
├── sale.entity.ts              (เทียบเท่า product.entity.ts — ดู Step 5)
├── sale.controller.ts          (เทียบเท่า product.controller.ts — ดู Step 8)
├── sale.service.ts             (เทียบเท่า product.service.ts — ดู Step 7)
└── dto/
    ├── create-sale.dto.ts      (เทียบเท่า create-product.dto.ts — ดู Step 6.1)
    ├── update-sale.dto.ts      (เทียบเท่า update-product.dto.ts — ดู Step 6.2)
    └── sale-response.dto.ts    (เทียบเท่า product-response.dto.ts — ดู Step 6.3 สำคัญมากถ้ามี field ที่ไม่ควรหลุดออกไป เช่น ต้นทุน/ margin)
```

แล้วเพิ่ม `SaleModule` เข้า `imports` ของ `app.module.ts` แทนที่ `ProductModule` เดิม

### 3.2 Frontend — โครงไฟล์ที่ต้องมีต่อ 1 module (อ้างอิงจาก `modules/products/`)

```
src/modules/sales/
├── sale-api.ts                          (เทียบเท่า product-api.ts — ดู 03-WEB.md Step 5 เรื่อง apiFetch)
└── components/
    ├── SaleList.tsx                      (เทียบเท่า ProductList.tsx — ดู Step 6)
    ├── SaleForm.tsx                      (เทียบเท่า ProductForm.tsx — ดู Step 12)
    └── DeleteSaleButton.tsx              (เทียบเท่า DeleteProductButton.tsx — ดู Step 7)
```

แล้วสร้าง route ที่ `src/app/(authenticated)/sales/page.tsx` (render `<SaleList />`) และเพิ่มเมนูใน `Sidebar.tsx`'s `NAV_ITEMS` — ถ้าระบบขายปลีกมีเมนูเยอะ (สินค้า, ลูกค้า, ใบเสร็จ, รายงานยอดขาย ฯลฯ) ให้ใช้แนวทาง module ≥ 20 เมนูตาม [00-OVERVIEW.md 2.2](./00-OVERVIEW.md#22-ถ้า-module-เดียวโตจนมีเมนู-20-เมนู-ต้องออกแบบยังไง-แนวทางสำหรับ-ระบบย่อย-ในอนาคต) ตั้งแต่เริ่มออกแบบเลย แทนที่จะเริ่มแบนราบแล้วมา refactor ทีหลัง (ต่างจาก mini-project เดิมที่เริ่มเล็กแล้วค่อยโต)

### 3.3 shared-types — ประกาศ type กลางของ domain ใหม่

```typescript
// packages/shared-types/src/sale.ts
export interface Sale {
  id: number;
  customerId: number;
  totalAmount: number;
  createdAt: string;
}
export interface CreateSaleInput { /* ... */ }
```

แล้วเพิ่ม `export * from "./sale";` ใน `index.ts` (ดู [01-MAIN-PROJECT.md Step 2.2](./01-MAIN-PROJECT.md#22-เปิด-srcindexts)) — อย่าลืม `npm run build:shared` ทุกครั้งที่แก้ไฟล์ในนี้ก่อนไป dev ต่อที่ `apps/api`/`apps/web`

## Step 4: เอกสารในโปรเจกต์ใหม่ก็ต้อง "แยกอิสระ" เหมือนกัน

`docs/` ชุดนี้ (00-04) เขียนอ้างอิงถึง "สินค้า"/"รายงานสินค้า" ทุกจุด — ถ้า copy ไปทั้งชุดจะกลายเป็นเอกสารที่พูดถึงฟีเจอร์ที่ไม่มีอยู่แล้วในระบบใหม่ แนะนำให้:

1. เก็บ **00-OVERVIEW.md, 01-MAIN-PROJECT.md** ไว้เกือบทั้งหมด (พูดถึง monorepo/workspaces/shared-types ซึ่งเป็น scaffolding) แต่แก้ตัวอย่าง data flow (หัวข้อ 4 ของ 00-OVERVIEW.md) จาก "เพิ่มสินค้า" เป็น flow ของระบบใหม่ (เช่น "บันทึกการขาย")
2. เขียน **02-API.md, 03-WEB.md ใหม่** โดยใช้โครง Step-by-step เดิมเป็นแม่แบบ (Step 0 อธิบาย concept, ไล่ทีละไฟล์จริงของระบบใหม่) แทนที่จะพยายามแก้ไฟล์เดิมทีละจุด เพราะเนื้อหาแทบทั้งหมดผูกกับ `ProductEntity`/`ProductController` โดยตรง
3. **04-REPORT.md** เก็บโครง Step 0-2 ไว้ได้ (อธิบาย FastReport, JWT cross-validation, popup-blocker pattern ซึ่งเป็นความรู้ทั่วไป) แต่ Step 3-5 (ProductClient, ProductsReportService, .frx) ต้องเขียนใหม่ตาม entity จริงของระบบใหม่
4. **ลบเอกสารนี้ (05-NEW-PROJECT-FROM-TEMPLATE.md) ออกจาก repo ใหม่** — มีประโยชน์แค่ตอนกำลัง copy เท่านั้น ไม่มีประโยชน์อีกต่อไปหลังโปรเจกต์ใหม่เริ่มพัฒนาแล้ว

---

**สรุปหลักการ**: ของที่ **generic พอที่จะใช้ข้ามระบบได้จริง** (auth, pagination, error handling, JWT cross-service validation, monorepo/workspace config, FastReport plumbing) ให้เก็บไว้เป็นฐาน ส่วนของที่**ผูกกับ domain สินค้าโดยตรง** (`ProductEntity`, `product-api.ts`, รายงานสินค้า) ให้ลบทิ้งแล้วสร้างใหม่ตาม pattern เดียวกัน — วิธีนี้ได้ทั้งความเร็ว (ไม่ต้องเขียน auth/pagination ใหม่) และความสะอาด (ไม่มี business logic เก่าตกค้างปนอยู่ในระบบใหม่)
