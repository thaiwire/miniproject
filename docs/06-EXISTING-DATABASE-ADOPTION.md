# คู่มือ: นำโครง mini-project ไปใช้กับฐานข้อมูล SQL Server ที่มีข้อมูลอยู่แล้ว

เอกสารนี้ต่างจาก [05-NEW-PROJECT-FROM-TEMPLATE.md](./05-NEW-PROJECT-FROM-TEMPLATE.md) ตรงที่สถานการณ์นี้ **มีฐานข้อมูลจริงที่มีข้อมูลอยู่แล้ว** (ไม่ใช่เริ่มจาก schema เปล่า) และ schema เดิม**ไม่ตรงกับที่ mini-project คาดหวังไว้เลย** (ไม่ใช่ `users`/`products` แบบ camelCase↔snake_case ที่ TypeORM entity ในโปรเจกต์นี้ผูกไว้) — เรียกสถานการณ์แบบนี้ว่า **brownfield adoption** (เอาโครง/สถาปัตยกรรมไปครอบระบบเดิมที่มีอยู่ก่อน) ต่างจาก greenfield (เริ่มจากศูนย์) ที่ 05 อธิบายไว้

ความเสี่ยงหลักของสถานการณ์นี้คือ **ข้อมูลจริงของคนอื่น** — ทุกขั้นตอนในเอกสารนี้ต้องระวังไม่ให้ TypeORM ไปแก้/ลบ/ทับ schema เดิมโดยไม่ตั้งใจ ควรอ่าน [02-API.md Step 10](./02-API.md#step-10-migration-เลิกใช้-synchronize) เรื่อง migration ก่อน เพราะหลักการ "ห้ามใช้ `synchronize: true` กับข้อมูลจริง" ที่อธิบายไว้ที่นั่นสำคัญกว่าเดิมมากในสถานการณ์นี้

---

## Step 0: กฎเหล็กข้อเดียวที่ต้องยึดตลอดทั้งกระบวนการ

> **ห้ามให้ TypeORM เขียนอะไรลงฐานข้อมูลจริงจนกว่าจะแน่ใจ 100%** — ปิด `synchronize: false` ไว้ตลอด (mini-project ปิดไว้อยู่แล้วโดย default — ดู [02-API.md Step 2.2](./02-API.md#22-typeormoduleforrootasync)) และห้ามรัน `migration:run` กับฐานข้อมูลจริงจนกว่าจะทดสอบผ่านกับฐานข้อมูล**สำเนา**ก่อนเสมอ

เหตุผล: `synchronize: true` (ที่ mini-project เคยใช้ตอนเริ่มโปรเจกต์ ก่อนเปลี่ยนมาใช้ migration — ดู [02-API.md Step 10](./02-API.md#step-10-migration-เลิกใช้-synchronize)) จะ **auto-diff entity กับ schema จริงแล้วแก้ตารางให้ตรงกันทันที** ซึ่งรวมถึงการ `DROP COLUMN`/`DROP TABLE` ถ้า entity ไม่มี field/ตารางนั้น — กับฐานข้อมูลที่มีข้อมูลจริงอยู่แล้ว นี่คือความเสี่ยงข้อมูลหายระดับสูงสุดที่เป็นไปได้

## Step 1: สำรวจ schema เดิมก่อนเขียนโค้ดสักบรรทัด

ห้ามเดา field/type ของตารางเดิม ต้องดึงข้อมูลจริงออกมาก่อน:

```sql
-- ดูรายชื่อตารางทั้งหมด
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';

-- ดู column + type ของแต่ละตาราง (รันทีละตาราง)
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ชื่อตาราง';

-- ดู primary key / foreign key ที่มีอยู่
SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME = 'ชื่อตาราง';
```

จดสิ่งเหล่านี้ไว้ต่อทุกตารางที่จะเอามาต่อกับระบบใหม่:

- ชื่อ column จริง (`snake_case`? `camelCase`? ภาษาไทยปนอังกฤษ?) — mini-project เดิมตั้งใจใช้ DB เป็น `snake_case` (เช่น `cost_price`, `created_at`) แต่ TypeScript property เป็น `camelCase` ผ่าน `@Column({ name: '...' })` (ดู [02-API.md Step 5](./02-API.md#step-5-entity--srcproductproductentityts)) — ถ้า schema เดิมใช้ convention อื่น ต้องตั้ง `name` ให้ตรงกับของจริงเท่านั้น ห้ามยึดตาม convention เดิมของ mini-project
- primary key เป็น `IDENTITY` (auto-increment แบบเดียวกับ `@PrimaryGeneratedColumn()`) หรือเป็น GUID/composite key แบบอื่น — ถ้าไม่ใช่ auto-increment ธรรมดา ต้องใช้ decorator อื่นของ TypeORM (`@PrimaryColumn()`, `@Generated('uuid')` ฯลฯ)
- nullable column ไหนบ้าง — ต้องตรงกับ `nullable: true/false` ใน `@Column()` เป๊ะ ๆ ไม่งั้น TypeORM จะ validate ผิดจากที่ database บังคับจริง
- มี foreign key ผูกกับตารางที่ไม่ได้อยู่ใน scope ของระบบใหม่หรือไม่ (เช่นตารางเก่าที่ระบบ legacy อื่นยังใช้อยู่) — สำคัญมากสำหรับ Step 3

## Step 2: เขียน Entity ให้ตรงกับของจริง ไม่ใช่ตามที่ mini-project เคยมี

`ProductEntity`/`UserEntity` เดิมของ mini-project (ดู [02-API.md Step 5](./02-API.md#step-5-entity--srcproductproductentityts), [Step 11.2](./02-API.md#112-user-entity--srcuseruserentityts)) เป็นแค่**ตัวอย่างของวิธีเขียน entity** ไม่ใช่ template ที่ต้อง copy ไปตรง ๆ — เขียน entity ใหม่ทั้งหมดให้ตรงกับสิ่งที่สำรวจได้ใน Step 1:

```typescript
// ตัวอย่าง: ตารางเดิมชื่อ "TBL_CUSTOMER" ไม่ใช่ "customers" แบบ mini-project
@Entity('TBL_CUSTOMER')  // ชื่อตารางจริงในฐานข้อมูลเดิม ไม่ใช่ชื่อที่ "ควรจะเป็น"
export class CustomerEntity {
  @PrimaryColumn({ name: 'CUST_ID' })  // ถ้า PK เดิมไม่ใช่ auto-increment มาตรฐาน
  custId: number;

  @Column({ name: 'CUST_NAME', type: 'nvarchar', length: 200, nullable: true })
  custName: string | null;  // nullable: true ต้องมี | null ใน type ด้วย ไม่งั้น TypeScript หลอกตัวเองว่าไม่มีทาง null

  // ...
}
```

จุดที่ต่างจากการสร้าง entity ใหม่แบบ greenfield ([05-NEW-PROJECT-FROM-TEMPLATE.md](./05-NEW-PROJECT-FROM-TEMPLATE.md) Step 3.1):

- **`@Entity('ชื่อตารางจริง')`** ต้องตรงกับที่มีอยู่แล้วเป๊ะ ๆ (ตัวพิมพ์เล็ก-ใหญ่มีผลกับ SQL Server บาง collation)
- **ทุก `@Column` ต้องมี `name:` กำกับ** ถ้าชื่อ column จริงไม่ตรงกับชื่อ TypeScript property ที่อยากตั้ง (ไม่ต้องเปลี่ยนชื่อ column จริงเพื่อให้ตรงกับ convention ของ mini-project — คนละเรื่องกับ `synchronize`/migration แต่ก็เป็นการแก้ schema ที่มีความเสี่ยงเหมือนกัน)
- **`nullable` ต้องตรงกับของจริง** — ถ้าฐานข้อมูลเดิมอนุญาต NULL แต่ entity ประกาศเป็น non-nullable TypeORM จะยัง query ได้ปกติ (ไม่ error ตอน build) แต่จะพังตอน runtime ถ้าเจอแถวที่มีค่า NULL จริง ๆ (`Cannot read property of null`)

## Step 3: อย่าใช้ `migration:generate` กับฐานข้อมูลเดิมที่มีข้อมูลอยู่แล้วในรอบแรก

`migration:generate` (ที่ [02-API.md Step 10.2](./02-API.md#102-คำสั่ง-migration-ที่เพิ่มเข้ามาใน-packagejson) อธิบายไว้) ทำงานโดย **diff entity กับ schema จริง แล้วสร้างไฟล์ migration ที่มีคำสั่งปรับให้ตรงกัน** — ถ้า entity เขียนไม่ตรงกับของจริง 100% (ซึ่งเกิดขึ้นได้ง่ายมากในรอบแรกที่ยังสำรวจไม่ครบ) มันจะ generate คำสั่ง `ALTER TABLE`/`DROP COLUMN` ที่ไม่ได้ตั้งใจออกมา

**แนวทางที่ปลอดภัยกว่าสำหรับ brownfield**:

1. เขียน entity ให้ตรงกับ schema จริงตาม Step 2 ก่อน (ไม่ generate migration เลยในขั้นนี้)
2. ตั้ง `synchronize: false` และ**ไม่ระบุ `migrations`/`migrationsRun`** ใน `TypeOrmModule.forRootAsync` เลยในช่วงแรก — ให้แอปแค่ **อ่าน** ข้อมูลผ่าน entity ที่เขียนไว้ โดยไม่พยายามจัดการ schema เลย
3. ทดสอบว่า entity ตรงกับ schema จริงหรือไม่ ผ่านการรัน query จริงเทียบผลลัพธ์ (เช่น `findAndCount()` แล้วเทียบจำนวนแถวกับ `SELECT COUNT(*)` ตรง ๆ)
4. **ค่อยเริ่มใช้ migration** เมื่อต้องเพิ่ม column ใหม่ที่ mini-project ต้องการแต่ schema เดิมไม่มี (เช่น ต้องเพิ่มระบบ role/JWT ให้ตาราง user เดิม) — ตอนนั้นค่อย `migration:generate` ซึ่งควรจะ diff แค่ "ส่วนที่เพิ่มใหม่จริง ๆ" เพราะ entity ที่เหลือ sync กับของจริงแล้วตั้งแต่ Step 1-3

> ⚠️ **ทดสอบทุกอย่างกับฐานข้อมูลสำเนาก่อนเสมอ** — สร้างฐานข้อมูลใหม่ (เช่น `BACKUP DATABASE` แล้ว `RESTORE` เป็นชื่ออื่น หรือ export/import ผ่าน SSMS) แล้วชี้ `DB_DATABASE` ใน `.env` ไปที่สำเนานั้นตลอดช่วงพัฒนา ต่อเมื่อมั่นใจแล้วเท่านั้นถึงค่อยสลับไปชี้ฐานข้อมูลจริง — เหมือนกับที่ mini-project เองก็แยก `mini_project_db` (dev) กับ `mini_project_db_test` (e2e test) ไว้คนละฐานข้อมูล (ดู [02-API.md Step 16.2](./02-API.md#162-e2e-test--ยิง-http-request-จริงเข้า-nestjs-app-ทั้งตัว-ผ่านฐานข้อมูลทดสอบแยกต่างหาก))

## Step 4: ระบบ auth ใหม่จะผูกกับ user เดิมยังไง

mini-project's auth (JWT + bcrypt + role — ดู [02-API.md Step 11](./02-API.md#step-11-authrbac)) ผูกกับ `UserEntity` ที่มี `passwordHash`, `role` เป็น field เฉพาะของมันเอง — ถ้าตาราง user เดิมของระบบเก่าไม่มี field พวกนี้ (เช่น ระบบเก่าใช้ password เข้ารหัสคนละแบบ หรือไม่มีแนวคิด role เลย) มีตัวเลือกหลัก 2 แบบ:

| แนวทาง | เหมาะกับ | ข้อควรระวัง |
|---|---|---|
| **A. เพิ่ม column ใหม่ลงตาราง user เดิม** (`password_hash`, `role`) ผ่าน migration | ถ้าทีมอื่นที่ดูแลระบบเดิมไม่ได้ใช้ตารางนี้อย่างเข้มงวด หรือคุยตกลงกันได้ว่าจะแก้ schema ร่วมกัน | ต้องเช็คกับเจ้าของระบบเดิมก่อนเสมอว่ามีระบบอื่นพึ่งพา schema เดิมอยู่หรือไม่ — เพิ่ม column ใหม่ (ไม่ลบ/ไม่แก้ของเดิม) เป็นการเปลี่ยนแปลงที่ปลอดภัยสุดในบรรดา schema change ทั้งหมด แต่ก็ยังเป็นการเปลี่ยน schema ที่ระบบอื่นอาจไม่รู้ตัว |
| **B. สร้างตารางใหม่แยกต่างหาก** (เช่น `auth_credentials`) ที่ผูกกับตาราง user เดิมผ่าน foreign key | ถ้าตาราง user เดิมเป็นของระบบอื่นที่ยังใช้งานอยู่ ไม่อยากแตะ schema เดิมเลย | ต้อง `JOIN` เพิ่มทุกครั้งที่ query ผู้ใช้ + login/register logic ซับซ้อนขึ้นเล็กน้อย แต่ **ไม่กระทบระบบเดิมแม้แต่นิดเดียว** |

**แนะนำแนวทาง B เป็นค่าเริ่มต้นสำหรับ brownfield** โดยเฉพาะถ้าไม่แน่ใจว่ามีระบบอื่นพึ่งพาตาราง user เดิมอยู่หรือไม่ — เขียน `AuthCredentialEntity` ใหม่ที่มี `userId` (foreign key ไปตาราง user เดิม), `passwordHash`, `role` แล้วให้ `AuthService.validateUser()` (ดู [02-API.md Step 11](./02-API.md#step-11-authrbac)) query ผ่าน entity ใหม่นี้แทนที่จะแก้ `UserEntity` เดิมตรง ๆ

## Step 5: ตัดสินใจว่าจะครอบทั้งฐานข้อมูล หรือเริ่มจาก 1 โมดูลก่อน

ฐานข้อมูลเดิมมักมีหลายสิบตารางที่ไม่เกี่ยวกับ scope ที่ต้องการใช้ mini-project ครอบ — **ไม่ต้องเขียน entity ให้ครบทุกตาราง** เขียนเฉพาะตารางที่ module แรกที่จะพัฒนาต้องใช้จริง (เหมือนหลักการ "อย่าเริ่ม nested structure ล่วงหน้า" ใน [00-OVERVIEW.md 2.2](./00-OVERVIEW.md#22-ถ้า-module-เดียวโตจนมีเมนู-20-เมนู-ต้องออกแบบยังไง-แนวทางสำหรับ-ระบบย่อย-ในอนาคต)) แล้วค่อยเพิ่ม entity ใหม่ทีละตัวตามที่ module ใหม่ ๆ ต้องการ

## Step 6: ฐานข้อมูลมีมากกว่า 300 ตาราง — สำรวจด้วยมือทีละตารางแบบ Step 1 ไม่ทันแล้ว

Step 1 (รัน `INFORMATION_SCHEMA.COLUMNS` ทีละตาราง) ใช้ได้จริงตอนมีไม่กี่สิบตารางที่เกี่ยวข้อง แต่ฐานข้อมูลระดับองค์กรที่มี 300+ ตารางมักมาพร้อมปัญหาที่การสำรวจด้วยมือแก้ไม่ทัน: ไม่รู้ว่าตารางไหน**ยังใช้งานจริง** ตารางไหน**เป็นของเก่าที่เลิกใช้แล้วแต่ไม่มีใครลบ** และความสัมพันธ์ (foreign key) ระหว่างตารางซับซ้อนเกินกว่าจะไล่ดูทีละตารางได้ครบ — ต้องเปลี่ยนวิธีคิดจาก "สำรวจให้ครบ" เป็น **"หา subset ที่เกี่ยวข้องแล้วสำรวจแค่ subset นั้นให้ลึก"**

### 6.1 ใช้ query ดึงภาพรวมทั้งฐานข้อมูลออกมาก่อน แทนการไล่ทีละตาราง

```sql
-- นับจำนวนแถวคร่าว ๆ ทุกตารางพร้อมกัน (ใช้ sys.dm_db_partition_stats แทน SELECT COUNT(*) ทีละตาราง เพราะเร็วกว่ามากเวลามีตารางเยอะ)
SELECT
  t.name AS table_name,
  SUM(p.rows) AS approx_row_count
FROM sys.tables t
JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0, 1)
GROUP BY t.name
ORDER BY approx_row_count DESC;

-- หาตารางที่ "กำพร้า" ไม่มี foreign key ทั้งเข้าและออกเลย -> มักเป็นตารางเก่าที่เลิกใช้ หรือตาราง lookup แยกเดี่ยว ๆ
SELECT t.name
FROM sys.tables t
WHERE t.object_id NOT IN (SELECT parent_object_id FROM sys.foreign_keys)
  AND t.object_id NOT IN (SELECT referenced_object_id FROM sys.foreign_keys);

-- ไล่ดู foreign key graph ทั้งหมด เพื่อหากลุ่มตารางที่ผูกกันเป็น "โดเมน" เดียวกัน
SELECT
  fk.name AS fk_name,
  tp.name AS parent_table,
  tr.name AS referenced_table
FROM sys.foreign_keys fk
JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
ORDER BY referenced_table;
```

- **`approx_row_count` เรียงมาก→น้อย** — ตารางที่มีแถวเป็นล้านมักเป็นตาราง transaction หลักที่ระบบใช้งานจริงต่อเนื่อง (ควรอยู่ในกลุ่มที่ต้องสำรวจละเอียด) ส่วนตารางที่มี 0 แถวหรือแถวน้อยมาก ๆ ค้างมานาน มักเป็นตารางทดลอง/เลิกใช้แล้ว (ตัดออกจาก scope ได้ก่อน ถ้าคุยกับเจ้าของระบบแล้วยืนยันว่าไม่ได้ใช้จริง)
- **ตารางกำพร้า (ไม่มี FK เข้า/ออกเลย)** — ให้ตั้งคำถามกับเจ้าของระบบเดิมทุกตัวว่ายังใช้อยู่จริงไหม ก่อนจะเสียเวลาเขียน entity ให้มัน
- **FK graph** — ใช้แบ่งตารางทั้งหมดเป็น "กลุ่มโดเมน" (เช่น กลุ่มลูกค้า/คำสั่งซื้อ ผูกกันเป็นกลุ่มหนึ่ง, กลุ่ม HR ผูกกันอีกกลุ่มหนึ่ง) — ปกติ SSMS มีฟีเจอร์ **Database Diagrams** ที่ generate ภาพ ER diagram จาก FK จริงในฐานข้อมูลให้อัตโนมัติ ใช้ดูภาพรวมได้เร็วกว่าอ่านผลลัพธ์ query เป็น text ล้วน ๆ

### 6.2 ใช้ TypeORM CLI generate entity ทั้งหมดจากฐานข้อมูลจริง แทนการเขียนมือทีละตัว

แทนที่จะเขียน entity มือทีละไฟล์ตาม Step 2 (ซึ่งไม่ไหวกับหลักร้อยตาราง) ให้ใช้เครื่องมือ generate entity จาก schema จริงโดยอัตโนมัติก่อน แล้วค่อยรีวิว/แก้ไขเฉพาะตารางที่จะใช้จริง:

```bash
npx typeorm-model-generator -h <host> -d <database> -u <username> -x <password> -e mssql -o ./generated-entities
```

- เครื่องมือนี้ **อ่านอย่างเดียว ไม่แก้ schema** (ปลอดภัยตามกฎเหล็กใน Step 0) แค่ query metadata ของฐานข้อมูลแล้ว generate ไฟล์ `.entity.ts` ให้ครบทุกตาราง พร้อม `@Column({ name: ... })`/`nullable`/relation ที่ถูกต้องตาม schema จริงอัตโนมัติ (แก้ปัญหาที่ Step 2 ต้องทำมือทีละ field)
- ได้ entity มาเป็น**จุดตั้งต้นให้รีวิว** ไม่ใช่เอาไปใช้ตรง ๆ ทั้งหมด — **คัดมาเฉพาะตารางที่ module แรกต้องใช้จริง** (ตาม Step 5) ย้ายเข้า `src/<module>/` แล้วลบไฟล์ที่ generate มาแต่ไม่เกี่ยวข้องทิ้งไป อย่า import entity ทั้ง 300+ ตัวเข้า `app.module.ts` พร้อมกันเด็ดขาด (ทั้งช้าตอน build และเสี่ยง TypeORM พยายาม resolve relation ของตารางที่ไม่ได้ตั้งใจจะใช้)
- ตรวจ column/type ที่ generate มาซ้ำอีกรอบเสมอ โดยเฉพาะตารางที่มี column type แปลก ๆ (เช่น `sql_variant`, `xml`, custom CLR type) เพราะ generator บางตัวแปลง type พวกนี้ผิดหรือข้ามไปเงียบ ๆ

### 6.3 อย่าพยายามทำความเข้าใจทั้ง 300 ตารางก่อนเริ่มเขียนโค้ด

หลักการ "เริ่มจาก 1 module" ใน Step 5 สำคัญกว่าเดิมมากในสถานการณ์นี้ — วิธีที่ใช้ได้จริง:

1. เลือก **1 business flow ที่ชัดเจนที่สุด** ที่ทีมต้องการเริ่มทำก่อน (เช่น "ดูรายการคำสั่งซื้อ")
2. ไล่ FK graph (6.1) จากตารางหลักของ flow นั้นออกไป **เฉพาะตารางที่เชื่อมตรง ๆ ไม่กี่ชั้น** (เช่น orders → order_items → products — ไม่ต้องไล่ไปถึง HR/accounting ที่ไม่เกี่ยวกัน)
3. generate entity เฉพาะกลุ่มตารางนั้น (6.2) แล้วรีวิวให้ละเอียดตาม Step 2
4. ทำ module แรกให้เสร็จสมบูรณ์ ทดสอบผ่านจริง ก่อนค่อยขยายไปตารางกลุ่มถัดไป

การพยายาม "ทำความเข้าใจทั้งฐานข้อมูลให้ครบก่อน" กับฐานข้อมูลระดับนี้มักไม่มีวันจบ (schema ใหญ่ขนาดนี้มักมีส่วนที่เอกสารไม่ครบ/คนเขียนออกไปจากทีมแล้ว) — ใช้ pattern เดียวกับที่ [00-OVERVIEW.md 2.2](./00-OVERVIEW.md#22-ถ้า-module-เดียวโตจนมีเมนู-20-เมนู-ต้องออกแบบยังไง-แนวทางสำหรับ-ระบบย่อย-ในอนาคต) แนะนำเรื่องไม่ทำ nested structure ล่วงหน้า: ขยาย scope ตามที่ module จริงต้องการ ไม่ใช่ตามจำนวนตารางที่มีอยู่

## Step 7: ลำดับขั้นตอนทั้งหมดสรุปเป็น checklist

1. สำรวจ schema จริงของทุกตารางที่เกี่ยวข้อง (Step 1) — ถ้ามีมากกว่า ~50-100 ตาราง ให้เริ่มจากภาพรวม/FK graph ก่อน (Step 6.1) แทนการไล่ทีละตาราง
2. สร้างฐานข้อมูลสำเนา (backup/restore เป็นชื่ออื่น) ไว้พัฒนา — ห้ามต่อฐานข้อมูลจริงตั้งแต่วันแรก
3. Copy โครง mini-project ตาม [05-NEW-PROJECT-FROM-TEMPLATE.md](./05-NEW-PROJECT-FROM-TEMPLATE.md) (ลบ `product`/`products` module ทิ้ง เก็บ auth/pagination/error-handling scaffolding ไว้)
4. เขียน (หรือ generate แล้วรีวิว — Step 6.2) entity ใหม่ให้ตรงกับ schema จริง (Step 2) — ตั้ง `synchronize: false`, ยังไม่ต้องมี `migrations`/`migrationsRun` ในช่วงนี้
5. ตัดสินใจแนวทาง auth (Step 4) — แนะนำแนวทาง B (ตารางแยก) ถ้าไม่แน่ใจว่าระบบอื่นพึ่งพา schema เดิมอยู่
6. ทดสอบ query ผ่าน entity เทียบกับข้อมูลจริงให้มั่นใจว่า mapping ถูกต้องครบ (Step 3.3)
7. ค่อยเริ่มใช้ migration เมื่อต้องเพิ่ม schema ใหม่จริง ๆ (auth table, column ใหม่) — รันกับฐานข้อมูลสำเนาก่อนเสมอ
8. เมื่อทุกอย่างผ่านการทดสอบกับสำเนาแล้วเท่านั้น ถึงสลับ `.env` ไปชี้ฐานข้อมูลจริง — และควรมีแผน backup ก่อน `migration:run` ครั้งแรกกับฐานข้อมูลจริงเสมอ ไม่ว่าจะมั่นใจแค่ไหนก็ตาม

---

**สรุปหลักการ**: ความต่างที่สำคัญที่สุดจากการเริ่มโปรเจกต์ใหม่แบบ greenfield ([05-NEW-PROJECT-FROM-TEMPLATE.md](./05-NEW-PROJECT-FROM-TEMPLATE.md)) คือทิศทางของความไว้วางใจ — greenfield ออกแบบ schema ให้ตรงกับโค้ดได้เลย แต่ brownfield ต้อง **ให้โค้ด (entity) ตามหลัง schema จริงเสมอ** ไม่ใช่ทางกลับกัน และทุกคำสั่งที่มีสิทธิ์แก้ schema (`synchronize`, `migration:run`) ต้องผ่านการทดสอบกับสำเนาก่อนแตะข้อมูลจริงทุกครั้งไม่มีข้อยกเว้น
