# apps/report

ASP.NET Core Web API (.NET 8) สำหรับออกรายงาน PDF ด้วย FastReport.OpenSource เรียกข้อมูลสินค้าจาก `apps/api` แล้วสร้าง PDF ส่งกลับให้ `apps/web`

## Setup

1. คัดลอก `.env.example` เป็น `.env` แล้วใส่ `JWT_SECRET` ให้ตรงกับ `apps/api/.env`
2. `dotnet restore`

## Run

```bash
dotnet run
```

หรือจาก root ของ monorepo: `npm run dev:report`

รันที่ `http://localhost:5100`

## Endpoint

- `GET /reports/products` — ต้องแนบ `Authorization: Bearer <token>` (token เดียวกับที่ login จาก apps/api) คืนไฟล์ PDF รายงานสินค้าทั้งหมด
