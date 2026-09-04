# คู่มือ Backend — `apps/api` (NestJS)

เอกสารนี้พาไล่อ่านโค้ด backend ทีละไฟล์ ตามลำดับที่ request วิ่งผ่านจริง ตั้งแต่โปรแกรมเริ่มทำงาน จนถึงตอนบันทึกข้อมูลลงฐานข้อมูล

ควรอ่าน [00-OVERVIEW.md](./00-OVERVIEW.md) และ [01-MAIN-PROJECT.md](./01-MAIN-PROJECT.md) ก่อน

---

## Step 0: NestJS คืออะไร (สรุปสั้น ๆ สำหรับมือใหม่)

NestJS เป็น framework สำหรับสร้าง backend ด้วย TypeScript โครงสร้างหลักมี 3 ชิ้นส่วนที่ต้องรู้จัก:

| ชิ้นส่วน | หน้าที่ | เปรียบเทียบ |
|---|---|---|
| **Module** | รวมกลุ่ม Controller + Service ที่เกี่ยวข้องกันไว้ด้วยกัน | เหมือน "แผนก" ในบริษัท |
| **Controller** | รับ HTTP request (GET/POST/...) กำหนด route | เหมือน "พนักงานต้อนรับ" รับเรื่องจากลูกค้า |
| **Service** | มี business logic จริง (คุยกับฐานข้อมูล ฯลฯ) | เหมือน "ฝ่ายปฏิบัติงาน" ที่ทำงานจริง |

Controller **ไม่ควร**คุยกับฐานข้อมูลตรง ๆ — ต้องเรียกผ่าน Service เสมอ นี่คือหลัก **separation of concerns**

## Step 1: จุดเริ่มต้นโปรแกรม — [src/main.ts](../apps/api/src/main.ts)

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: 'http://localhost:3001' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

ไล่ทีละบรรทัด:

1. **`NestFactory.create(AppModule)`** — สร้างแอปพลิเคชันจาก `AppModule` (module รากของทั้งระบบ ดู Step 2)
2. **`app.enableCors({ origin: 'http://localhost:3001' })`** — เปิด **CORS** (Cross-Origin Resource Sharing)
   - เบราว์เซอร์บล็อกไม่ให้เว็บที่ origin หนึ่ง (`localhost:3001`) เรียก API ของอีก origin หนึ่ง (`localhost:3000`) โดยอัตโนมัติ เพื่อความปลอดภัย
   - บรรทัดนี้คือการ "อนุญาตพิเศษ" ให้เฉพาะ origin `localhost:3001` (เว็บของเรา) เรียกเข้ามาได้
   - **มือใหม่มักพลาดตรงนี้**: ถ้าลืมเปิด CORS หรือระบุ origin ผิด จะเจอ error สีแดงในเบราว์เซอร์ประมาณ "CORS policy: No 'Access-Control-Allow-Origin'..." ทั้งที่ backend รันปกติดี
3. **`ValidationPipe`** — ตัวเช็คข้อมูลที่ client ส่งเข้ามาแบบ **global** (ใช้กับทุก endpoint อัตโนมัติ โดยไม่ต้องเขียนซ้ำในแต่ละ controller)
   - `whitelist: true` — field ไหนไม่ได้ประกาศไว้ใน DTO จะถูก "ตัดทิ้ง" เงียบ ๆ (ไม่ error แค่ไม่เก็บ)
   - `forbidNonWhitelisted: true` — ถ้ามี field เกินมาที่ไม่รู้จัก จะโยน error 400 ทันที (เข้มกว่า whitelist เฉย ๆ)
   - `transform: true` — แปลง type ให้อัตโนมัติ เช่น query string `"5"` → number `5` ก่อนส่งเข้า controller
4. **`app.useGlobalFilters(new AllExceptionsFilter())`** — ครอบทุก error ในระบบให้ตอบกลับเป็น format เดียวกันเสมอ ดูรายละเอียดเต็ม ๆ ใน [Step 14](#step-14-global-error-handling)
5. **`app.listen(process.env.PORT ?? 3000)`** — เริ่มฟัง request ที่ port จาก env variable `PORT` ถ้าไม่ได้ตั้งค่าไว้ใช้ 3000 เป็นค่า default

## Step 2: Module หลัก — [src/app.module.ts](../apps/api/src/app.module.ts)

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const db = configService.get('database', { infer: true });
        return {
          type: 'mssql' as const,
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          entities: [ProductEntity, UserEntity],
          migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
          migrationsRun: true,
          synchronize: false,
          options: {
            encrypt: false,
            trustServerCertificate: true,
          },
        };
      },
    }),

    ProductModule,
    UserModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

นี่คือ "แม่บ้าน" ที่ผูกทุกอย่างเข้าด้วยกันตอน bootstrap

### 2.1 `ConfigModule.forRoot(...)`

โหลดค่าจากไฟล์ `.env` เข้ามาเป็น config object ที่เรียกใช้งานได้ผ่าน `ConfigService`
- `isGlobal: true` — ทำให้ทุก module ในระบบ inject `ConfigService` ได้เลยโดยไม่ต้อง import `ConfigModule` ซ้ำในแต่ละ module
- `load: [databaseConfig, jwtConfig]` — ระบุ "config factory function" หลายตัว (ดู Step 3 และ Step 11) ที่จะแปลง env variables ดิบ ๆ ให้เป็น object ที่มี type ชัดเจน คนละไฟล์คนละเรื่อง (database, jwt) ตาม convention "หนึ่งไฟล์ต่อหนึ่งเรื่อง"

### 2.2 `TypeOrmModule.forRootAsync(...)`

เชื่อมต่อฐานข้อมูล SQL Server ผ่าน TypeORM ใช้ `forRootAsync` (ไม่ใช่ `forRoot` เฉย ๆ) เพราะต้อง **รอ** ConfigService โหลดค่า .env เสร็จก่อนถึงจะรู้ host/port/password ที่จะเชื่อมต่อ

ส่วนที่เปลี่ยนไปจากตอนแรกของโปรเจกต์ (ดูเหตุผลเต็ม ๆ ใน [Step 10: Migration](#step-10-migration-เลิกใช้-synchronize)):

```typescript
entities: [ProductEntity, UserEntity],     // import class ตรง ๆ แทน glob path string
migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
migrationsRun: true,                       // apply migration ที่ค้างอยู่อัตโนมัติทุกครั้งที่ boot
synchronize: false,                        // ⚠️ ปิดแล้ว! ห้าม auto sync schema อีกต่อไป
```

- **`entities: [ProductEntity, UserEntity]`** — เดิมใช้ glob path string (`__dirname + '/**/*.entity{.ts,.js}'`) ให้ TypeORM ค้นหาไฟล์ entity เองอัตโนมัติ แต่วิธีนี้มีข้อเสียซ่อนอยู่: ตอนรัน test ผ่าน vitest (ที่โหลดไฟล์ `.ts` ตรง ๆ โดยไม่ compile ก่อน) TypeORM จะพยายาม `require()` ไฟล์ `.ts` ตรง ๆ ซึ่ง Node.js อ่าน syntax ของ TypeScript (เช่น decorator) ไม่ออก ทำให้ต่อ database ไม่ได้ การ import class ตรง ๆ แบบนี้แก้ปัญหาได้เพราะผ่าน module system ปกติของภาษา (เหมือนที่ `ProductModule`/`UserModule` import entity ของตัวเองอยู่แล้ว)
- **`migrationsRun: true`** — ให้แอปรัน migration ที่ยังไม่ได้ apply โดยอัตโนมัติทุกครั้งที่ boot คล้ายความสะดวกของ `synchronize: true` เดิม แต่ปลอดภัยกว่า เพราะเปลี่ยนแปลง schema ผ่านไฟล์ migration ที่ถูก review แล้วเท่านั้น ไม่ใช่ auto-diff แบบเดา
- **`synchronize: false`** — ปิดแล้ว ห้าม auto sync schema อีกต่อไป ต้องแก้ schema ผ่าน migration เท่านั้น

- `options.encrypt: false` และ `trustServerCertificate: true` เป็นการปิดการเข้ารหัสการเชื่อมต่อ เหมาะกับ dev/internal network เท่านั้น ไม่ควรใช้กับฐานข้อมูลที่เปิดสู่ public internet

### 2.3 Feature Modules และ Global Guard

- **`ProductModule` / `UserModule` / `AuthModule`** — feature module 3 ตัว รวม controller/service ของแต่ละเรื่องไว้ (ดู Step 4 เป็นต้นไป และ Step 11)
- **`{ provide: APP_GUARD, useClass: JwtAuthGuard }` / `RolesGuard`** — เปิด guard แบบ **global** สองชั้น: ทุก request ต้องผ่าน `JwtAuthGuard` (เช็ค login) ก่อน แล้วค่อยผ่าน `RolesGuard` (เช็คสิทธิ์) endpoint ไหนไม่อยากบังคับ login ต้องติด `@Public()` เอง — ดูรายละเอียดเต็ม ๆ ใน [Step 11: Auth/RBAC](#step-11-authrbac)

## Step 3: อ่านค่า .env แบบ type-safe — [src/config/database.config.ts](../apps/api/src/config/database.config.ts)

```typescript
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface AppConfig {
  port: number;
  database: DatabaseConfig;
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? '192.9.200.132',
    port: parseInt(process.env.DB_PORT ?? '1433', 10),
    username: process.env.DB_USERNAME ?? 'sa',
    password: process.env.DB_PASSWORD ?? '@twp1234#',
    database: process.env.DB_DATABASE ?? 'mini_project_db',
  },
});
```

รูปแบบนี้เรียกว่า **config factory** — ฟังก์ชันที่ return object config โดยอ่านจาก `process.env` (env variables ดิบเป็น string ทั้งหมด) แล้วแปลงเป็น type ที่ถูกต้อง เช่น `parseInt(...)` แปลง port จาก string เป็น number

ไฟล์นี้ต้องมีคู่กับไฟล์ [.env](../apps/api/.env) ที่ root ของ `apps/api`:

```
DB_HOST=192.9.200.132
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD="@twp1234#"
DB_DATABASE=mini_project_db
PORT=3000

JWT_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRES_IN=7d
```

ตัวแปร `JWT_*` เพิ่มมาสำหรับระบบ auth (ดู [Step 11](#step-11-authrbac)) — โปรเจกต์นี้มี [.env.example](../apps/api/.env.example) เป็น template ที่ปลอดภัย (ไม่มี secret จริง) ให้ copy ไปเป็น `.env` แล้วใส่ค่าจริงของเครื่องตัวเอง

> ⚠️ **ข้อควรระวังสำคัญสำหรับมือใหม่**: สังเกตว่าในโค้ดข้างต้นมีการใส่ username/password ฐานข้อมูลจริงเป็นค่า **default fallback** (`?? 'sa'`, `?? '@twp1234#'`) ต่อจาก `??` ไว้ในซอร์สโค้ด นี่คือ **anti-pattern ด้านความปลอดภัย** — ถ้า push โค้ดนี้ขึ้น Git repository (โดยเฉพาะ public repo) รหัสผ่านฐานข้อมูลจะรั่วไหลทันที
>
> **แนวทางที่ถูกต้อง**: ค่า secret (password, API key) ไม่ควรมี default อยู่ในโค้ด ควร throw error ทันทีถ้า env variable ไม่ถูกตั้งค่า เช่น:
> ```typescript
> password: process.env.DB_PASSWORD ?? (() => { throw new Error('DB_PASSWORD is required') })(),
> ```
> และไฟล์ `.env` ต้องอยู่ใน `.gitignore` เสมอ ไม่ commit ขึ้น repository

## Step 4: Feature Module ของสินค้า — [src/product/product.module.ts](../apps/api/src/product/product.module.ts)

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity])],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
```

- **`TypeOrmModule.forFeature([ProductEntity])`** — ลงทะเบียนว่า module นี้จะใช้งาน Repository ของ `ProductEntity` ทำให้ `ProductService` สามารถ `@InjectRepository(ProductEntity)` มาใช้ได้ (ดู Step 6)
- **`controllers: [ProductController]`** — บอก Nest ว่า module นี้มี controller ตัวไหนบ้าง
- **`providers: [ProductService]`** — บอก Nest ว่า module นี้มี service (สิ่งที่ inject ได้) ตัวไหนบ้าง

## Step 5: Entity — [src/product/product.entity.ts](../apps/api/src/product/product.entity.ts)

Entity คือ class ที่ **แทนตารางในฐานข้อมูล** แต่ละ property ในนี้จะกลายเป็น column จริง

```typescript
@Entity('products') // ชื่อตารางในฐานข้อมูลจะเป็น "products"
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 255 })
  name: string; // ใช้ nvarchar ไม่ใช่ varchar เพราะต้องรองรับภาษาไทย/unicode

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'cost_price' })
  costPrice: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

จุดที่ควรสังเกต:

- **`@Entity('products')`** — decorator บอก TypeORM ว่า class นี้ผูกกับตารางชื่อ `products`
- **`@PrimaryGeneratedColumn()`** — primary key ที่ auto-increment (SQL Server จะจัดการเลข id ให้เอง)
- **`nvarchar` ไม่ใช่ `varchar`** — เพราะข้อมูลภาษาไทยต้องใช้ Unicode, `varchar` ปกติเก็บ Unicode ไม่ได้ถูกต้อง (จุดนี้มือใหม่ที่ทำระบบรองรับภาษาไทยพลาดบ่อยมาก)
- **`{ name: 'cost_price' }`** — กำหนดชื่อ column ในฐานข้อมูลเป็น snake_case (`cost_price`) ในขณะที่ property ฝั่ง TypeScript เป็น camelCase (`costPrice`) — เป็น convention ที่นิยม (DB ใช้ snake_case, โค้ดใช้ camelCase)
- **`@CreateDateColumn()`** — TypeORM จะเซ็ตค่าวันที่ให้อัตโนมัติตอน insert แถวใหม่ ไม่ต้องเขียนโค้ดเซ็ตเอง

## Step 6: DTO (Data Transfer Object) — โฟลเดอร์ `src/product/dto/`

DTO คือ class ที่กำหนด "รูปร่างข้อมูล" ที่ยอมให้เข้า/ออกจาก API แต่ละ endpoint — สำคัญมากเพราะเป็นตัวป้องกันไม่ให้ Entity (ที่ผูกกับ DB ตรง ๆ) หลุดออกไปเป็น public API โดยตรง

### 6.1 [dto/create-product.dto.ts](../apps/api/src/product/dto/create-product.dto.ts) — ข้อมูลตอนสร้างสินค้าใหม่

```typescript
import { IsString, MinLength, IsNumber, Min, IsInt } from 'class-validator';
import { CreateProductInput } from '@mini-project/shared-types';

export class CreateProductDto implements CreateProductInput {
  @IsString()
  @MinLength(2, { message: 'ชื่อสินค้าต้องมีอย่างน้อย 2 ตัวอักษร' })
  name: string;

  @IsNumber()
  @Min(0, { message: 'ราคาขายต้องไม่ติดลบ' })
  price: number;

  @IsNumber()
  @Min(0, { message: 'ต้นทุนต้องไม่ติดลบ' })
  costPrice: number;

  @IsInt()
  @Min(0, { message: 'จำนวนสต๊อกต้องไม่ติดลบ' })
  stock: number;
}
```

จุดสำคัญ:
- **`implements CreateProductInput`** — บังคับให้ class นี้มี field ตรงกับ type จาก `shared-types` เป๊ะ ๆ ถ้า field ไม่ตรง TypeScript จะ error ตอน compile ทันที (นี่คือประโยชน์ของการแชร์ type ข้าม frontend/backend ตามที่อธิบายใน [00-OVERVIEW.md](./00-OVERVIEW.md))
- **decorator จาก `class-validator`** (`@IsString`, `@Min`, ...) — คือกฎ validation ที่ `ValidationPipe` (ที่เปิดไว้ใน `main.ts`) จะเอาไปเช็คอัตโนมัติทุกครั้งที่มี request เข้า endpoint ที่ใช้ DTO นี้ ถ้าข้อมูลไม่ผ่าน จะตอบ 400 พร้อม `message` ที่กำหนดไว้ทันที (ไม่ต้องเขียน `if` เช็คเองใน controller/service เลย)

### 6.2 [dto/update-product.dto.ts](../apps/api/src/product/dto/update-product.dto.ts) — ข้อมูลตอนแก้ไข

```typescript
export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

`PartialType(CreateProductDto)` เป็น helper ของ NestJS ที่สร้าง DTO ใหม่จาก `CreateProductDto` โดยทำให้ **ทุก field เป็น optional** พร้อม validation decorator เดิมยังใช้งานอยู่ (ถ้าส่งมาต้องผ่านกฎเดิม แต่จะไม่ส่งมาก็ได้) — ประหยัดโค้ด ไม่ต้องเขียน DTO ใหม่ซ้ำ

### 6.3 [dto/product-response.dto.ts](../apps/api/src/product/dto/product-response.dto.ts) — ข้อมูลตอนส่งกลับไปหา client

```typescript
export class ProductResponseDto implements Omit<SharedProduct, 'createdAt'> {
  id: number;
  name: string;
  price: number;
  stock: number;
  createdAt: Date;

  static fromEntity(product: ProductEntity): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = product.id;
    dto.name = product.name;
    dto.price = product.price;
    dto.stock = product.stock;
    dto.createdAt = product.createdAt;
    return dto;
    // สังเกต: ไม่ copy costPrice มา -> ข้อมูลนี้ไม่มีวันหลุดออกไปให้ client เห็นเด็ดขาด
  }
}
```

นี่คือแนวคิดสำคัญที่สุดของการมี DTO แยกจาก Entity: **`ProductEntity` มี `costPrice` แต่ `ProductResponseDto` ไม่มี**

ถ้า controller ส่ง `ProductEntity` ออกไปตรง ๆ โดยไม่แปลงผ่าน DTO นี้ก่อน ข้อมูลต้นทุนสินค้า (ซึ่งเป็นความลับทางธุรกิจ ไม่ควรให้ลูกค้าเห็น) จะหลุดออกไปกับ JSON response ทันที การมี static method `fromEntity()` ที่ "เลือก" เฉพาะ field ที่ปลอดภัยมา copy คือวิธีป้องกันปัญหานี้แบบ explicit และ type-safe

## Step 7: Service — [src/product/product.service.ts](../apps/api/src/product/product.service.ts)

Service คือที่อยู่ของ business logic จริง คุยกับฐานข้อมูลผ่าน TypeORM Repository

```typescript
@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<[ProductEntity[], number]> {
    return this.productRepo.findAndCount({
      order: { id: 'ASC' },
      skip: query.skip,
      take: query.limit,
    });
  }

  async findOne(id: number): Promise<ProductEntity> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`ไม่พบสินค้า id: ${id}`);
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<ProductEntity> {
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async update(id: number, dto: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: number): Promise<void> {
    const result = await this.productRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`ไม่พบสินค้า id: ${id}`);
    }
  }

  // ดู Step 12 สำหรับ adjustStock() — ตัวอย่างการใช้ transaction
}
```

อธิบายทีละ method:

- **`@Injectable()`** — บอก NestJS ว่า class นี้เป็น provider ที่สามารถ inject เข้าไปในที่อื่นได้ (dependency injection)
- **`@InjectRepository(ProductEntity)`** — ขอ Repository ของ `ProductEntity` มาใช้ (มาจากการลงทะเบียนไว้ใน `ProductModule` ด้วย `forFeature`) — `Repository<T>` คือ object ที่มี method สำเร็จรูปสำหรับ query DB เช่น `find`, `findOne`, `save`, `delete`
- **`DataSource`** — inject เข้ามาเพิ่มเพื่อขอ `QueryRunner` สำหรับทำ transaction เอง (ดู Step 12) ไม่เกี่ยวกับ 5 method หลักด้านบน แต่เตรียมไว้ใช้ใน `adjustStock`
- **`findAll(query)`** — เดิมคืนสินค้าทั้งหมดแบบไม่จำกัด ตอนนี้เปลี่ยนเป็นรับ `PaginationQueryDto` และใช้ `findAndCount` (แทน `find` เฉย ๆ) ที่คืนค่าเป็น tuple `[รายการ, จำนวนทั้งหมด]` พร้อมกันในคำสั่งเดียว — ดูรายละเอียดเต็ม ๆ ใน [Step 13: Pagination](#step-13-pagination)
- **`findOne`** — ถ้าหาไม่เจอ throw `NotFoundException` ทันที (NestJS จะแปลง exception ประเภทนี้เป็น HTTP 404 อัตโนมัติ) — และ method อื่นที่ต้องใช้ id (เช่น `update`) ก็เรียก `findOne` ซ้ำเพื่อได้พฤติกรรม 404 แบบเดียวกันฟรี ๆ
- **`create`** — `productRepo.create(dto)` สร้าง entity instance ในหน่วยความจำก่อน (ยังไม่บันทึกลง DB) แล้ว `save(product)` คือคำสั่งที่ยิง SQL `INSERT` จริง
- **`update`** — ดึงของเดิมมาก่อน (`findOne`) แล้ว `Object.assign` เอา field ใหม่ทับของเดิม จากนั้น `save` ซึ่ง TypeORM จะรู้เองว่านี่คือ `UPDATE` (เพราะ entity มี `id` อยู่แล้ว) ไม่ใช่ `INSERT`
- **`remove`** — เช็ค `result.affected === 0` เพื่อรู้ว่ามีแถวถูกลบจริงหรือไม่ ถ้าไม่มี (id ไม่มีอยู่จริง) ก็ throw 404 เหมือนกัน

## Step 8: Controller — [src/product/product.controller.ts](../apps/api/src/product/product.controller.ts)

Controller คือจุดที่กำหนด route และรับ request เข้ามา แล้วส่งต่อให้ Service ทำงาน

```typescript
@Controller('products') // ทุก route ในนี้ขึ้นต้นด้วย /products
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get() // อ่านได้ทุก role ที่ login แล้ว
  async findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const [products, totalItems] = await this.productService.findAll(query);
    const dtos = products.map((p) => ProductResponseDto.fromEntity(p));
    return PaginatedResponseDto.create(dtos, query.page, query.limit, totalItems);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ProductResponseDto> {
    const product = await this.productService.findOne(id);
    return ProductResponseDto.fromEntity(product);
  }

  @Post()
  @Roles(Role.ADMIN) // เฉพาะ ADMIN สร้างสินค้าใหม่ได้
  async create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    const product = await this.productService.create(dto);
    return ProductResponseDto.fromEntity(product);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.update(id, dto);
    return ProductResponseDto.fromEntity(product);
  }

  @Patch(':id/stock')
  @Roles(Role.ADMIN)
  async adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.adjustStock(id, dto.delta);
    return ProductResponseDto.fromEntity(product);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.productService.remove(id);
  }
}
```

ตาราง route ทั้งหมดที่ controller นี้เปิดให้ใช้ (ทุก path ขึ้นต้นด้วย `/products` เพราะ `@Controller('products')`):

| HTTP Method | Path | ใครเรียกได้ | ทำอะไร |
|---|---|---|---|
| GET | `/products` | ทุก role ที่ login แล้ว | ดึงสินค้าแบบแบ่งหน้า |
| GET | `/products/:id` | ทุก role ที่ login แล้ว | ดึงสินค้าชิ้นเดียวตาม id |
| POST | `/products` | ADMIN เท่านั้น | สร้างสินค้าใหม่ |
| PATCH | `/products/:id` | ADMIN เท่านั้น | แก้ไขสินค้าบางส่วน |
| PATCH | `/products/:id/stock` | ADMIN เท่านั้น | ปรับสต๊อก (ตัวอย่าง transaction) |
| DELETE | `/products/:id` | ADMIN เท่านั้น | ลบสินค้า |

จุดที่ควรสังเกต:

- **`@Query() query: PaginationQueryDto`** — เปลี่ยนจากไม่รับ parameter อะไรเลย เป็นรับ query string `?page=&limit=` ผ่าน DTO เดียวกับที่ใช้ทั่วทั้งระบบ (ดู Step 13)
- **`@Roles(Role.ADMIN)`** — decorator ใหม่ที่ระบุว่า endpoint นี้ต้องมี role เป็น `ADMIN` เท่านั้นถึงจะเรียกได้ (ดู Step 11) สังเกตว่า `findAll`/`findOne` **ไม่มี** `@Roles()` เลย เพราะแค่ login (role อะไรก็ได้) ก็เรียกดูได้ ส่วน endpoint ที่แก้ไขข้อมูล (create/update/adjustStock/remove) จำกัดเฉพาะ ADMIN
- **`@Param('id', ParseIntPipe)`** — `:id` จาก URL เป็น string เสมอ (เช่น `"5"`) `ParseIntPipe` แปลงเป็น `number` ให้อัตโนมัติ **และ**ถ้าใครส่ง id ที่ไม่ใช่ตัวเลข (เช่น `/products/abc`) จะตอบ 400 ให้ทันทีโดยไม่ต้องเขียนโค้ดเช็คเอง
- **`@Body() dto: CreateProductDto`** — Nest แปลง JSON body ของ request เป็น instance ของ `CreateProductDto` โดยอัตโนมัติ แล้ว `ValidationPipe` (ที่ตั้งไว้ global ใน `main.ts`) จะเช็ค validation decorator ทั้งหมดก่อนโค้ดใน method นี้จะถูกรันด้วยซ้ำ — ถ้าไม่ผ่านจะไม่มีทางเข้ามาถึงบรรทัด `this.productService.create(dto)` เลย
- **`adjustStock`** — endpoint ใหม่ที่ไม่ได้เป็นส่วนหนึ่งของ CRUD ปกติ แต่สาธิต pattern การใช้ transaction (ดู Step 12)
- **ทุก method คืนค่าเป็น `ProductResponseDto`** (ไม่ใช่ `ProductEntity` ตรง ๆ) — ตอกย้ำเรื่อง Step 6.3 ว่า controller คือจุดที่ "แปลงร่าง" ข้อมูลก่อนออกจากระบบเสมอ
- **`@HttpCode(204)` บน `remove`** — ปกติ Nest จะตอบ 200 โดย default แต่ REST convention สำหรับ DELETE ที่สำเร็จและไม่มีข้อมูลจะส่งกลับคือ **204 No Content** จึงต้อง override ด้วย decorator นี้

## Step 9: ทดสอบ API ด้วยตัวเอง (พื้นฐาน — ยังไม่มี auth)

> ⚠️ ตั้งแต่ตอนนี้ทุก endpoint (ยกเว้นที่ติด `@Public()`) ต้องแนบ JWT token ด้วย ถ้าลองยิงแบบข้างล่างนี้เฉย ๆ จะได้ 401 — อ่าน [Step 11](#step-11-authrbac) ก่อนเพื่อเข้าใจว่าทำไม แล้วดูตัวอย่าง curl ที่แนบ token ได้ใน [Step 15](#step-15-ทดสอบทั้งระบบด้วย-curl-แบบครบวงจร)

หลังรัน `npm run dev:api` แล้ว ลองยิง request ด้วย `curl` ดูได้:

```bash
curl http://localhost:3000/
```

ลองส่ง field แปลก ๆ ไปที่ endpoint ที่ต้อง login ดูผล `whitelist`/`forbidNonWhitelisted` (จะเจอ 401 ก่อน เพราะยังไม่แนบ token — เป็นตัวอย่างให้เห็นว่า validation error กับ auth error หน้าตาต่างกันอย่างไร):

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"เสื้อยืด","price":199,"costPrice":100,"stock":50,"secretField":"xxx"}'
```

## Step 10: Migration (เลิกใช้ `synchronize`)

โปรเจกต์นี้เริ่มต้นด้วย `synchronize: true` (ดู [00-OVERVIEW.md](./00-OVERVIEW.md)) ซึ่งสะดวกตอนหัดเขียนแต่อันตรายกับข้อมูลจริง ตอนนี้เปลี่ยนมาใช้ **migration** แล้ว มาดูว่าเปลี่ยนไปอย่างไรและทำไม

### 10.1 ทำไมต้องมี DataSource แยกอีกตัว — [src/database/data-source.ts](../apps/api/src/database/data-source.ts)

```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

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
```

เหตุผลที่ต้องมี `DataSource` อีกตัวแยกจาก `TypeOrmModule.forRootAsync` ใน `app.module.ts`: **TypeORM CLI (คำสั่ง migration:generate/run/revert) ไม่ได้ผ่าน NestJS bootstrap เลย** มันเป็นโปรแกรมแยกที่รันตรง ๆ จาก terminal จึงเรียก `ConfigService` ของ Nest ไม่ได้ ต้องโหลด `.env` เองด้วย `dotenv.config()` แล้วสร้าง `DataSource` ของตัวเองสำหรับ CLI โดยเฉพาะ — ตอน runtime จริงแอปยังใช้ค่าที่มาจาก `ConfigService` ผ่าน `app.module.ts` เหมือนเดิมไม่เกี่ยวกัน

### 10.2 คำสั่ง migration ที่เพิ่มเข้ามาใน [package.json](../apps/api/package.json)

```json
"typeorm": "typeorm-ts-node-commonjs -d src/database/data-source.ts",
"migration:generate": "npm run typeorm -- migration:generate",
"migration:run": "npm run typeorm -- migration:run",
"migration:revert": "npm run typeorm -- migration:revert"
```

- **`migration:generate <path>`** — เทียบ (diff) ระหว่าง Entity ปัจจุบันในโค้ด กับ schema จริงในฐานข้อมูล แล้ว generate ไฟล์ migration ที่มีคำสั่ง SQL สำหรับปรับ schema ให้ตรงกับ Entity ให้อัตโนมัติ
- **`migration:run`** — apply migration ทุกไฟล์ที่ยังไม่เคยรัน (TypeORM จดจำว่าไฟล์ไหนรันไปแล้วในตาราง `migrations` ที่มันสร้างขึ้นเองในฐานข้อมูล)
- **`migration:revert`** — ย้อนกลับ migration ล่าสุด 1 ไฟล์ (เรียก method `down()` ของ migration นั้น)

### 10.3 หน้าตาไฟล์ migration ที่ generate ออกมา — [src/database/migrations/](../apps/api/src/database/migrations/)

```typescript
export class InitialSchema1788502951922 implements MigrationInterface {
    name = 'InitialSchema1788502951922'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" (...)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
    }
}
```

- **`up()`** — สิ่งที่เกิดขึ้นตอน apply migration (เช่น สร้างตาราง เพิ่ม column)
- **`down()`** — สิ่งที่เกิดขึ้นตอน revert migration (ต้องเป็นคำสั่งที่ "ย้อนกลับ" `up()` เสมอ เช่น ถ้า `up()` สร้างตาราง `down()` ต้องลบตารางนั้น)
- ชื่อไฟล์และ class ขึ้นต้นด้วย timestamp (`1788502951922`) เพื่อให้ TypeORM รู้ **ลำดับ** ว่า migration ไหนต้องรันก่อนหลัง

> **มือใหม่ต้องรู้**: หลัง `migration:generate` เสร็จ **ต้องเปิดไฟล์ที่ generate มาอ่านด้วยตาก่อนเสมอ** ก่อนรัน `migration:run` จริง โดยเฉพาะถ้าฐานข้อมูลมีข้อมูลอยู่แล้ว ต้องมั่นใจว่าไม่มีคำสั่ง `DROP`/`ALTER` ที่จะทำลายข้อมูลเดิมโดยไม่ตั้งใจ — TypeORM generate ให้ตาม diff ที่มันเห็น แต่ไม่รู้ "เจตนา" ของเรา

### 10.4 ขั้นตอนจริงที่ใช้ตอนย้ายจาก `synchronize` มา migration

1. ปิด `synchronize: true` เป็น `false` ใน `app.module.ts` (แต่ก่อนปิดต้อง generate migration baseline ให้ตรงกับ schema ปัจจุบันก่อน ไม่งั้นจะเสียการ track schema ไป)
2. รัน `npm run migration:generate -- src/database/migrations/InitialSchema` — เพราะตอนนั้นตาราง `products` มีอยู่แล้วจาก `synchronize` เดิม TypeORM diff แล้วพบว่ามีแค่ `UserEntity` ที่เป็นตารางใหม่ (`ProductEntity`ไม่มีอะไรเปลี่ยน)
3. ตรวจไฟล์ migration ที่ได้ ยืนยันว่าไม่มีคำสั่งแตะ `products`
4. รัน `npm run migration:run` เพื่อสร้างตาราง `users` จริงในฐานข้อมูล
5. เปิด `synchronize: false` และเพิ่ม `migrations`/`migrationsRun: true` ใน `app.module.ts`

## Step 11: Auth/RBAC

ระบบนี้มี **User** (บัญชีผู้ใช้) และ **Role** (สิทธิ์) แบบง่าย 2 ระดับ: `ADMIN` (แก้ไขข้อมูลได้) กับ `STAFF` (ดูอย่างเดียว) ยืนยันตัวตนด้วย **JWT** (JSON Web Token)

### 11.1 ภาพรวม concept สำหรับมือใหม่

| คำศัพท์ | ความหมาย |
|---|---|
| **Authentication** | "คุณคือใคร" — พิสูจน์ตัวตนผ่าน email/password ตอน login |
| **Authorization** | "คุณทำอะไรได้บ้าง" — เช็คว่า role ของคุณมีสิทธิ์เรียก endpoint นี้หรือไม่ |
| **JWT (JSON Web Token)** | token ที่เข้ารหัสข้อมูลผู้ใช้ (userId, email, role) ไว้ในตัวเอง ฝั่ง server ตรวจสอบได้โดยไม่ต้อง query DB ทุกครั้ง |
| **Access token** | token อายุสั้น (15 นาที) ใช้แนบไปกับทุก request เพื่อพิสูจน์ตัวตน |
| **Refresh token** | token อายุยาว (7 วัน) ใช้แลก access token ใหม่โดยไม่ต้อง login ซ้ำ |

### 11.2 User Entity — [src/user/user.entity.ts](../apps/api/src/user/user.entity.ts)

```typescript
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'nvarchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'nvarchar', length: 255 })
  name: string;

  @Column({ type: 'nvarchar', length: 50, default: Role.STAFF })
  role: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

- **`email: { unique: true }`** — บังคับไม่ให้มี email ซ้ำกันในระบบ ระดับฐานข้อมูล (ไม่ใช่แค่เช็คใน service)
- **`passwordHash`** — เก็บเฉพาะ **hash** ของรหัสผ่าน ไม่เก็บ plaintext เด็ดขาด (ดู 11.3)
- **`role: Role`** — ใช้ enum `Role` (ดู 11.4) แทนการเก็บเป็น string อิสระ ป้องกันการพิมพ์ผิดหรือใส่ค่าที่ไม่มีอยู่จริง

### 11.3 Hash รหัสผ่านด้วย bcrypt — [src/user/user.service.ts](../apps/api/src/user/user.service.ts)

```typescript
async create(input: { email: string; password: string; name: string; role?: Role }) {
  const existing = await this.findByEmail(input.email);
  if (existing) {
    throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = this.userRepo.create({
    email: input.email,
    passwordHash,
    name: input.name,
    role: input.role ?? Role.STAFF,
  });
  return this.userRepo.save(user);
}
```

- **`bcrypt.hash(password, SALT_ROUNDS)`** — แปลงรหัสผ่านเป็น hash แบบทางเดียว (one-way) คือ**ถอดกลับเป็นรหัสผ่านเดิมไม่ได้เลย** ต่อให้ฐานข้อมูลรั่วไหล คนร้ายก็เอา hash ไปแปลงกลับเป็นรหัสผ่านไม่ได้โดยตรง — ต้องลองสุ่ม (brute force) ซึ่ง bcrypt ถูกออกแบบมาให้ทำช้ามาก ๆ โดยเจตนา (ปรับความช้าได้ด้วย `SALT_ROUNDS`)
- **`role: input.role ?? Role.STAFF`** — สังเกตว่า signature ของ `create` รับ `role?: Role` เป็น optional และ default เป็น `STAFF` เสมอถ้าไม่ระบุ — เหตุผลสำคัญอยู่ที่ 11.6

### 11.4 Role อยู่ฝั่ง API เท่านั้น — [src/auth/enums/role.enum.ts](../apps/api/src/auth/enums/role.enum.ts)

```typescript
export enum Role {
  ADMIN = 'admin',
  STAFF = 'staff',
}
```

สังเกตว่า `Role` ไม่ได้อยู่ใน `packages/shared-types` เหมือน `Product`/`User` type อื่น ๆ เพราะ `shared-types` เดิมมีแต่ `interface`/`type` ล้วน ๆ (ไม่มีโค้ดที่รันจริงตอน runtime) แต่ `enum` ของ TypeScript จะ compile ออกมาเป็น JavaScript object จริง ๆ ถ้าใส่ไว้ใน shared-types จะเปลี่ยนธรรมชาติของ package นั้นทันที เนื่องจาก scope ตอนนี้การเช็คสิทธิ์เป็นเรื่องฝั่ง backend ล้วน (frontend ยังไม่ต้องรู้ role เพื่อซ่อน/โชว์ UI) จึงเก็บไว้ที่ API ก่อน — ถ้าวันหน้า frontend ต้องใช้ค่อยย้ายออกไปทีหลัง

### 11.5 JWT Strategy — [src/auth/strategies/jwt.strategy.ts](../apps/api/src/auth/strategies/jwt.strategy.ts)

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService<{ jwt: JwtConfig }, true>) {
    const jwtConfig = configService.get('jwt', { infer: true });
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.accessSecret,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
```

- library `passport` เป็นมาตรฐานสำหรับทำ authentication ใน Node.js — `passport-jwt` คือ "strategy" (วิธีการ) แบบหนึ่งที่บอกว่า "เอา token จาก header `Authorization: Bearer <token>` มาตรวจสอบด้วย secret key"
- **`validate(payload)`** — ถูกเรียกอัตโนมัติหลัง passport ตรวจสอบ signature ของ token ผ่านแล้ว (ยังไม่หมดอายุ, เซ็นด้วย secret ที่ถูกต้อง) ค่าที่ return จาก method นี้จะถูกแนบไปที่ `request.user` ให้ guard/controller อื่นเรียกใช้ต่อได้
- มี strategy คู่กันอีกตัวคือ [jwt-refresh.strategy.ts](../apps/api/src/auth/strategies/jwt-refresh.strategy.ts) ที่ใช้ secret **คนละตัว** กับ access token โดยเจตนา — ถ้า access token หลุด จะเอาไปสวมรอยเป็น refresh token ไม่ได้

### 11.6 Guard และ Decorator — [src/auth/guards/](../apps/api/src/auth/guards/) และ [src/auth/decorators/](../apps/api/src/auth/decorators/)

```typescript
// public.decorator.ts
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// roles.decorator.ts
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

`SetMetadata` คือกลไกของ NestJS ในการ "แปะป้าย" ข้อมูลเพิ่มเติมไว้ที่ method/class โดยไม่กระทบ logic การทำงาน แล้วให้ guard อ่านป้ายนั้นออกมาทีหลังผ่าน `Reflector`

```typescript
// jwt-auth.guard.ts
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true; // ข้าม auth ไปเลยถ้าติด @Public()
    }
    return super.canActivate(context); // ไม่งั้นเช็ค JWT ตามปกติ
  }
}
```

- **`JwtAuthGuard`** ถูกลงทะเบียนเป็น **global guard** ใน `app.module.ts` (ผ่าน `APP_GUARD`) แปลว่า **ทุก endpoint ต้อง login ก่อนโดย default** endpoint ไหนอยากเปิดให้เรียกได้โดยไม่ login (เช่น `/auth/login`) ต้องแปะ `@Public()` เอาไว้ชัดเจน — เป็นแนวทาง "ปลอดภัยไว้ก่อน" (secure by default) ที่แนะนำ เพราะถ้าลืมใส่ guard ให้ endpoint ใหม่ มันจะปลอดภัยอยู่แล้วโดยอัตโนมัติ ต่างจากแนวทาง "เปิดไว้ก่อนแล้วค่อยปิดทีหลัง" ที่พลาดง่ายกว่ามาก
- **`RolesGuard`** ทำงานคล้ายกัน แต่เช็ค `@Roles(Role.ADMIN)` แทน ถ้า endpoint ไม่มี `@Roles()` เลยถือว่าเปิดให้ทุก role ที่ login แล้วเข้าถึงได้

### 11.7 AuthController — [src/auth/auth.controller.ts](../apps/api/src/auth/auth.controller.ts)

```typescript
@Controller('auth')
export class AuthController {
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.userService.create(dto);
    return UserResponseDto.fromEntity(user);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
```

จุดสำคัญที่สุด: **`RegisterDto` ไม่มี field `role` เลย** ผู้สมัครกำหนด role ของตัวเองไม่ได้ (`UserService.create` set เป็น `STAFF` เสมอตามที่เห็นใน 11.3) นี่คือการป้องกัน **privilege escalation** — ถ้าเปิดให้ client ส่ง `role: "admin"` มาตอนสมัครได้ ใครก็สมัครเป็น admin เองได้ทันที ซึ่งเป็นช่องโหว่ความปลอดภัยร้ายแรง ในระบบจริง บัญชี ADMIN คนแรกมักสร้างผ่าน seed script หรือ DBA ตรง ๆ ไม่ใช่ endpoint สาธารณะ

## Step 12: Transaction — ตัวอย่างจาก [ProductService.adjustStock](../apps/api/src/product/product.service.ts)

```typescript
async adjustStock(id: number, delta: number): Promise<ProductEntity> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const product = await queryRunner.manager.findOne(ProductEntity, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!product) {
      throw new NotFoundException(`ไม่พบสินค้า id: ${id}`);
    }

    const newStock = product.stock + delta;
    if (newStock < 0) {
      throw new BadRequestException('สต๊อกสินค้าจะติดลบ ไม่สามารถทำรายการได้');
    }

    product.stock = newStock;
    await queryRunner.manager.save(product);

    await queryRunner.commitTransaction();
    return product;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

### 12.1 Transaction คืออะไร และทำไมต้องใช้

**Transaction** คือการรวมหลายคำสั่งฐานข้อมูลให้เป็น "หน่วยเดียว" ที่ต้อง**สำเร็จพร้อมกันทั้งหมด หรือไม่สำเร็จเลยสักคำสั่ง** (all-or-nothing) ตัวอย่างในระบบ ERP จริง: การตัดสต๊อกสินค้าพร้อมกับบันทึกรายการเคลื่อนไหวสต๊อก ถ้าตัดสต๊อกสำเร็จแต่บันทึกประวัติล้มเหลว ข้อมูลจะไม่ตรงกัน (สต๊อกลดแต่ไม่มีหลักฐานว่าลดเพราะอะไร) transaction ป้องกันปัญหานี้โดยการันตีว่าถ้ามีขั้นตอนใดพัง **ทุกอย่างจะถูกย้อนกลับหมด** เหมือนไม่เคยเกิดอะไรขึ้น

`adjustStock` ในที่นี้เป็นตัวอย่างสาธิต pattern (ยังไม่ได้ผูกกับตารางที่สองจริง ๆ) แต่โครงสร้างครบทุกขั้นตอนที่ต้องใช้ซ้ำได้เลยเวลามี flow จริงที่ต้องแตะหลายตารางพร้อมกัน

### 12.2 ไล่ทีละขั้นตอน

1. **`createQueryRunner()` + `connect()` + `startTransaction()`** — ขอ connection แยกจาก pool มาเปิด transaction (ต้องใช้ `queryRunner.manager` ทำ query ต่อจากนี้ ไม่ใช่ `productRepo` ปกติ เพราะต้องการให้ query ทั้งหมดอยู่ใน transaction เดียวกัน)
2. **`lock: { mode: 'pessimistic_write' }`** — "ล็อก" แถวที่กำลังอ่านไว้ ไม่ให้ transaction อื่นมาแก้พร้อมกัน ป้องกัน **race condition**: ถ้าไม่ล็อก แล้วมี 2 คนตัดสต๊อกพร้อมกันในเวลาไล่เลี่ยกัน ทั้งคู่อาจอ่านค่าตั้งต้นเดียวกัน (เช่น stock=10) แล้วคำนวณแยกกัน ผลลัพธ์สุดท้ายอาจผิดจากที่ควรจะเป็น
3. **ตรวจเงื่อนไข business logic** (`newStock < 0`) — ถ้าไม่ผ่าน throw error ทันที เพื่อให้ตกลงไปที่ `catch` block
4. **`queryRunner.manager.save(product)`** — เขียนค่าใหม่ (ยังไม่ commit จริง แค่อยู่ใน transaction ที่เปิดค้างไว้)
5. **`commitTransaction()`** — ยืนยันการเปลี่ยนแปลงทั้งหมดจริงลงฐานข้อมูล เกิดขึ้นก็ต่อเมื่อไม่มี error ระหว่างทางเลย
6. **`catch (err) { rollbackTransaction(); throw err; }`** — มี error ที่จุดไหนก็ตาม (ไม่ว่าจะ throw เองหรือ DB error) ย้อนกลับทุกอย่างที่ทำไปในขั้นตอน 3-4 ทันที แล้ว throw error ต่อให้ controller จัดการ (ซึ่งจะไปเข้า `AllExceptionsFilter` ใน Step 14)
7. **`finally { release() }`** — คืน connection กลับ pool เสมอ **ไม่ว่าจะสำเร็จหรือ fail** ถ้าลืมขั้นตอนนี้จะเกิด **connection leak** (connection ค้างอยู่ไม่ถูกปล่อยคืน) ซึ่งสุดท้ายจะทำให้ต่อฐานข้อมูลไม่ได้อีกเมื่อ connection ในระบบเต็ม

## Step 13: Pagination

### 13.1 ทำไมต้องมี pagination

`ProductService.findAll()` เดิมดึงสินค้า**ทั้งหมด**มาในครั้งเดียว ใช้ได้กับข้อมูลไม่กี่สิบรายการตอน dev แต่ระบบจริงที่มีสินค้าเป็นหมื่นเป็นแสนรายการ การดึงทั้งหมดมาในครั้งเดียวจะทำให้ response ช้ามาก กิน memory เยอะ และ frontend ต้อง render รายการยาวเกินจำเป็น **Pagination** คือการแบ่งผลลัพธ์เป็นหน้า ๆ (page) ให้ client ขอทีละหน้า

### 13.2 [src/common/dto/pagination-query.dto.ts](../apps/api/src/common/dto/pagination-query.dto.ts)

```typescript
export class PaginationQueryDto implements PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'page ต้องมากกว่าหรือเท่ากับ 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'limit ต้องมากกว่าหรือเท่ากับ 1' })
  @Max(100, { message: 'limit ต้องไม่เกิน 100 ต่อครั้ง' })
  limit: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'minId ต้องมากกว่าหรือเท่ากับ 1' })
  minId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'maxId ต้องมากกว่าหรือเท่ากับ 1' })
  maxId?: number;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
```

- **`@Type(() => Number)`** — จุดที่ต่างจาก DTO อื่นที่เจอมาก่อนหน้านี้ (`CreateProductDto` ฯลฯ) เพราะ DTO เหล่านั้นรับข้อมูลผ่าน `@Body()` ที่ Nest แปลง type ให้อัตโนมัติ แต่ query string (`?page=2&limit=10`) เป็น **string เสมอ** ไม่ว่าจะพิมพ์อะไรมา จึงต้องสั่ง `class-transformer` แปลงเป็น number ด้วยตัวเองก่อน `class-validator` จะเช็คถูก (ทำงานร่วมกับ `transform: true` ใน `ValidationPipe` ที่ตั้งไว้ global)
- **`@Max(100)`** — จำกัดไม่ให้ client ขอข้อมูลทีละมากเกินไปในครั้งเดียว (ป้องกันการใช้งานฐานข้อมูลหนักเกินจำเป็นโดยตั้งใจหรือไม่ตั้งใจก็ตาม)
- **`page: number = 1`** — ค่า default ถ้าไม่ส่ง query string มาเลย (เช่น `GET /products` เฉย ๆ) จะได้หน้า 1 ขนาด 20 รายการ
- **`get skip()`** — getter ที่คำนวณจำนวนแถวที่ต้อง "ข้าม" จาก page/limit เช่น page=3, limit=10 → ข้าม 20 แถวแรก (แสดงแถวที่ 21-30)
- **`minId?` / `maxId?`** — เพิ่มเข้ามาสำหรับฟีเจอร์ "ออกรายงานสินค้าตามช่วงรหัส" (ดู [03-WEB.md](./03-WEB.md) และ [04-REPORT.md](./04-REPORT.md)) เป็น `optional` ทั้งคู่ (ไม่ใส่มา = ไม่กรอง id เลย เหมือนพฤติกรรมเดิมทุกประการ) รายละเอียดว่ากรองยังไงอยู่ที่ 13.4

### 13.3 [src/common/dto/paginated-response.dto.ts](../apps/api/src/common/dto/paginated-response.dto.ts)

```typescript
export class PaginatedResponseDto<T> implements PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;

  static create<T>(data: T[], page: number, limit: number, totalItems: number) {
    const dto = new PaginatedResponseDto<T>();
    dto.data = data;
    dto.meta = {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
    return dto;
  }
}
```

- **`<T>`** — generic type ทำให้ DTO นี้ห่อข้อมูลแบบไหนก็ได้ ไม่ผูกกับ `Product` โดยเฉพาะ (ถ้ามี `OrderResponseDto` ในอนาคตก็ใช้ `PaginatedResponseDto<OrderResponseDto>` ได้เลยไม่ต้องเขียนซ้ำ)
- **`meta.totalPages`** — คำนวณจาก `Math.ceil(totalItems / limit)` เพื่อให้ frontend รู้ว่ามีกี่หน้าทั้งหมด โดยไม่ต้องคำนวณเอง

Response ตัวอย่างของ `GET /products?page=1&limit=2`:

```json
{
  "data": [
    { "id": 1, "name": "เสื้อยืด", "price": 199, "stock": 50, "createdAt": "..." },
    { "id": 2, "name": "กางเกง", "price": 299, "stock": 30, "createdAt": "..." }
  ],
  "meta": { "page": 1, "limit": 2, "totalItems": 5, "totalPages": 3 }
}
```

### 13.4 กรองช่วง id — [src/product/product.service.ts](../apps/api/src/product/product.service.ts)

ฟีเจอร์ "ออกรายงานสินค้าตามช่วงรหัส" ที่หน้าเว็บ (ดู [03-WEB.md](./03-WEB.md) Step 12) ต้องการให้ `GET /products` กรองเฉพาะสินค้าที่ `id` อยู่ในช่วงที่กำหนดได้ — ใช้ query param `minId`/`maxId` เดียวกับที่ประกาศไว้ใน `PaginationQueryDto` (13.2)

```typescript
async findAll(query: PaginationQueryDto): Promise<[ProductEntity[], number]> {
  if (
    query.minId !== undefined &&
    query.maxId !== undefined &&
    query.minId > query.maxId
  ) {
    throw new BadRequestException('minId ต้องไม่มากกว่า maxId');
  }

  return this.productRepo.findAndCount({
    where: this.buildWhere(query.minId, query.maxId),
    order: { id: 'ASC' },
    skip: query.skip,
    take: query.limit,
  });
}

private buildWhere(minId?: number, maxId?: number): FindOptionsWhere<ProductEntity> {
  if (minId !== undefined && maxId !== undefined) {
    return { id: Between(minId, maxId) };
  }
  if (minId !== undefined) {
    return { id: MoreThanOrEqual(minId) };
  }
  if (maxId !== undefined) {
    return { id: LessThanOrEqual(maxId) };
  }
  return {}; // ไม่กรอง id เลย -> เหมือนพฤติกรรมเดิม
}
```

- **`Between` / `MoreThanOrEqual` / `LessThanOrEqual`** — TypeORM operator สำเร็จรูปสำหรับสร้างเงื่อนไข `WHERE` แบบช่วงตัวเลข ต้องเลือกให้ตรงกับว่า client ส่ง `minId`/`maxId` มาแบบไหน: ส่งมาทั้งคู่ใช้ `Between` (ต้องการ 2 ค่าเสมอ ใช้กับแค่ค่าเดียวไม่ได้), ส่งมาแค่ `minId` ใช้ `MoreThanOrEqual`, แค่ `maxId` ใช้ `LessThanOrEqual`
- **เช็ค `minId > maxId` ก่อนคิวรี** — ถ้าผู้ใช้กรอกช่วงกลับด้าน (เช่น minId=50, maxId=10) ให้ตอบ 400 ทันทีก่อนแตะฐานข้อมูลเลย ไม่ปล่อยให้เงียบ ๆ กลายเป็น "ไม่มีข้อมูล" ซึ่งจะทำให้ผู้ใช้สับสนว่าเป็น bug หรือแค่ไม่มีสินค้าในช่วงนั้นจริง ๆ

> ⚠️ **จุดที่พลาดได้ง่ายที่สุดของฟีเจอร์นี้**: ตอน implement ครั้งแรกเคยเขียน `where: { id: this.buildIdRangeFilter(...) }` โดยให้ helper คืน `undefined` ตรง ๆ เวลาไม่มีการกรอง (`return undefined;`) ผลคือพอไม่ได้ส่ง `minId`/`maxId` มาเลย (การใช้งานปกติทั่วไป) จะได้ `where: { id: undefined }` ซึ่ง TypeORM **throw error ทันที**: `TypeORMError: Undefined value encountered in property 'ProductEntity.id' of a where condition` (กลายเป็น 500 ผ่าน `AllExceptionsFilter`) ทำให้หน้ารายการสินค้าปกติพังไปด้วยทั้งที่ไม่ได้เกี่ยวกับฟีเจอร์กรองช่วงเลย — TypeORM ต้องการให้ **ไม่มี key `id` เลย** ใน object ถ้าไม่ต้องการกรอง ไม่ใช่มี key แต่ค่าเป็น `undefined` วิธีแก้คือให้ `buildWhere` คืน `{}` (object เปล่า ไม่มี key `id`) แทนที่จะคืน `{ id: undefined }` — บทเรียนคือเวลาสร้างเงื่อนไข `where` แบบไดนามิกใน TypeORM ต้อง **ประกอบทั้ง object** แบบมีเงื่อนไข ไม่ใช่แค่ประกอบ**ค่าใน key เดียว**แล้วปล่อยให้เป็น `undefined`

## Step 14: Global Error Handling

### 14.1 ปัญหาที่แก้ — [src/common/filters/all-exceptions.filter.ts](../apps/api/src/common/filters/all-exceptions.filter.ts)

ก่อนหน้านี้แต่ละ error (เช่น `NotFoundException` จาก service, validation error จาก `ValidationPipe`) มี**รูปร่าง response ไม่เหมือนกันเป๊ะ** ทำให้ frontend ต้อง handle เคสต่าง ๆ แยกกัน `AllExceptionsFilter` แก้ปัญหานี้โดยครอบทุก error ในระบบให้ตอบกลับด้วย format เดียวกันเสมอ

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่ภายหลัง';
    if (isHttpException) {
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : (body as any).message ?? exception.message;
    } else {
      console.error(exception); // log ฝั่ง server แต่ไม่ส่งรายละเอียดออกไปให้ client
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: isHttpException ? exception.constructor.name : 'InternalServerError',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 14.2 ไล่ทีละส่วน

- **`@Catch()`** ไม่ระบุ type ใด ๆ ในวงเล็บ — แปลว่าครอบ**ทุก** exception ที่เกิดขึ้นในระบบ ทั้งที่ตั้งใจ throw เอง (`NotFoundException`, `BadRequestException`) และที่ไม่คาดคิด (bug, database connection พัง ฯลฯ)
- **`exception instanceof HttpException`** — แยกสองกรณี: ถ้าเป็น `HttpException` (หรือ subclass เช่น `NotFoundException`) แปลว่าเราตั้งใจ throw เอง มี status code และ message ที่ถูกต้องอยู่แล้ว ดึงออกมาใช้ตรง ๆ ได้ แต่ถ้าไม่ใช่ (เช่น error ธรรมดาจาก bug) ให้ตอบเป็น **500** เสมอ พร้อม message กลาง ๆ ที่ไม่เปิดเผยรายละเอียดภายใน
- **ทำไมต้องซ่อนรายละเอียด error ที่ไม่คาดคิด**: ถ้าส่ง stack trace หรือ error message ดิบ ๆ ออกไปให้ client เห็น อาจรั่วไหลข้อมูลอ่อนไหว เช่น โครงสร้างฐานข้อมูล, path ของไฟล์ในเซิร์ฟเวอร์ — เป็นข้อมูลที่มีประโยชน์กับผู้โจมตีระบบ จึง `console.error(exception)` ไว้ให้ทีมพัฒนาดู log ฝั่ง server เท่านั้น ส่วน client เห็นแค่ข้อความทั่วไป
- **response shape เดียวกันทุกครั้ง**: `statusCode`, `message`, `error`, `path`, `timestamp` — frontend เขียน error handler แบบเดียวใช้ได้กับทุก endpoint

ตัวอย่าง response ของ validation error (จาก `ValidationPipe`):
```json
{
  "statusCode": 400,
  "message": ["limit ต้องไม่เกิน 100 ต่อครั้ง"],
  "error": "BadRequestException",
  "path": "/products?limit=500",
  "timestamp": "2026-09-04T06:26:27.096Z"
}
```

## Step 15: ทดสอบทั้งระบบด้วย curl แบบครบวงจร

ตอนนี้ทุก endpoint (ยกเว้นที่ `@Public()`) ต้องมี token ก่อนถึงจะเรียกได้ ลองไล่ทำตามลำดับนี้:

```bash
# 1. สมัครสมาชิก (ได้ role เป็น staff เสมอ)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123","name":"Admin"}'
```

```bash
# 2. Login เพื่อขอ token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
# เก็บ accessToken จาก response ไว้ใช้ในขั้นตอนถัดไป
```

```bash
# 3. เรียก endpoint ที่ต้อง login โดยไม่แนบ token -> ต้องได้ 401
curl http://localhost:3000/products
```

```bash
# 4. เรียกพร้อมแนบ token -> ได้ 200
curl http://localhost:3000/products \
  -H "Authorization: Bearer <accessToken จากขั้นตอน 2>"
```

```bash
# 5. ลองสร้างสินค้าด้วย token ของ role STAFF (default ตอนสมัคร) -> ต้องได้ 403
#    เพราะ POST /products ติด @Roles(Role.ADMIN) ไว้
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer <accessToken ของ STAFF>" \
  -H "Content-Type: application/json" \
  -d '{"name":"เสื้อยืด","price":199,"costPrice":100,"stock":50}'
```

> **หมายเหตุ**: ในระบบจริงบัญชี ADMIN คนแรกต้องถูก promote ผ่านการแก้ข้อมูลในฐานข้อมูลตรง ๆ (หรือ seed script) เพราะ `/auth/register` บังคับ role เป็น `STAFF` เสมอตามที่อธิบายไว้ใน [Step 11.7](#117-authcontroller--srcauthauthcontrollerts) — ถ้าอยากทดสอบ endpoint ที่ต้องใช้ ADMIN ต้องรัน SQL คล้าย ๆ `UPDATE users SET role = 'admin' WHERE email = '...'` ก่อน

```bash
# 6. ทดสอบ pagination
curl "http://localhost:3000/products?page=1&limit=2" \
  -H "Authorization: Bearer <accessToken>"
```

```bash
# 6.1 ทดสอบกรองช่วง id (ดู Step 13.4)
curl "http://localhost:3000/products?minId=1&maxId=5" \
  -H "Authorization: Bearer <accessToken>"

# ส่งช่วงกลับด้าน (minId มากกว่า maxId) -> ต้องได้ 400
curl "http://localhost:3000/products?minId=50&maxId=10" \
  -H "Authorization: Bearer <accessToken>"
```

```bash
# 7. ทดสอบ transaction (ต้องเป็น ADMIN token) — ลองปรับสต๊อกให้ติดลบดูว่า rollback จริงไหม
curl -X PATCH http://localhost:3000/products/1/stock \
  -H "Authorization: Bearer <accessToken ของ ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"delta":-999999}'
# ควรได้ 400 พร้อม error format จาก AllExceptionsFilter แล้ว stock ต้องไม่เปลี่ยนแปลงเลย
```

## Step 16: รัน automated test

โปรเจกต์มี test 2 ระดับ ทั้งคู่ใช้ [vitest](https://vitest.dev/) เป็นตัวรัน (ดูโครงสร้างและ convention เดิมที่ [apps/api/vitest.config.ts](../apps/api/vitest.config.ts) และ [vitest.config.e2e.ts](../apps/api/vitest.config.e2e.ts))

### 16.1 Unit test — mock dependency ทุกตัว ไม่แตะฐานข้อมูลจริง

```bash
npm run test -w @mini-project/api
```

ตัวอย่างจาก [src/product/product.service.spec.ts](../apps/api/src/product/product.service.spec.ts) — mock `Repository<ProductEntity>` และ `DataSource` ทั้งคู่:

```typescript
{
  provide: getRepositoryToken(ProductEntity),
  useValue: { find: vi.fn(), findAndCount: vi.fn(), findOne: vi.fn(), /* ... */ },
},
{
  provide: DataSource,
  useValue: { createQueryRunner: vi.fn(() => queryRunnerMock) },
},
```

- **`getRepositoryToken(ProductEntity)`** — token พิเศษของ `@nestjs/typeorm` ที่ใช้ระบุว่า "นี่คือ mock ของ `Repository<ProductEntity>` ที่ปกติมาจาก `@InjectRepository`" ทำให้ทดสอบ service ได้โดยไม่ต้องต่อฐานข้อมูลจริงเลย เร็วมากและรันซ้ำได้ทุกที่
- ตัวอย่างการทดสอบ transaction (ดู Step 12): mock ทุก method ของ `queryRunner` (`connect`, `startTransaction`, `commitTransaction`, `rollbackTransaction`, `release`) แล้วยืนยันด้วย `expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled()` ว่า rollback ถูกเรียกจริงตอนเกิด error — เป็นวิธีทดสอบ transaction logic โดยไม่ต้องต่อฐานข้อมูลจริงเลย

### 16.2 E2E test — ยิง HTTP request จริงเข้า NestJS app ทั้งตัว ผ่านฐานข้อมูลทดสอบแยกต่างหาก

```bash
npm run test:e2e -w @mini-project/api
```

**ทำไมต้องมีฐานข้อมูลแยก**: e2e test เดิม (`app.e2e-spec.ts`) ต่อฐานข้อมูล dev ตัวเดียวกับที่ใช้พัฒนาจริง ซึ่งเสี่ยงข้อมูลทดสอบไปปนกับข้อมูลจริง โปรเจกต์นี้แก้โดยสร้างฐานข้อมูลชื่อ `mini_project_db_test` แยกต่างหาก (คนละตัวกับ `mini_project_db` ที่ใช้ตอน dev) ตั้งค่าไว้ใน [.env.test](../apps/api/.env.test) แล้วให้ [test/setup-e2e.ts](../apps/api/test/setup-e2e.ts) โหลดไฟล์นี้แทน `.env` ปกติก่อน test จะรัน:

```typescript
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
```

ไฟล์นี้ถูกลงทะเบียนเป็น `setupFiles` ใน `vitest.config.e2e.ts` — รันก่อนไฟล์ test ทุกไฟล์เสมอ

> ⚠️ ก่อนรัน `test:e2e` ครั้งแรก ต้องสร้างฐานข้อมูล `mini_project_db_test` บน SQL Server ก่อน (สร้างครั้งเดียว) แล้วรัน migration ใส่มันด้วย:
> ```bash
> # ตั้ง env ชั่วคราวให้ชี้ไป test DB ก่อนรัน migration (เพราะ data-source.ts อ่านจาก .env ปกติ)
> export DB_DATABASE=mini_project_db_test
> npm run migration:run -w @mini-project/api
> ```

ตัวอย่างจาก [test/product.e2e-spec.ts](../apps/api/test/product.e2e-spec.ts) — เทส flow เต็มรูปแบบ พร้อม login จริงเพื่อขอ token มาแนบ:

```typescript
const adminLogin = await request(app.getHttpServer())
  .post('/auth/login')
  .send({ email: 'e2e-admin@test.com', password: 'password123' });
adminToken = adminLogin.body.accessToken;

// ...

await request(app.getHttpServer())
  .post('/products')
  .set('Authorization', `Bearer ${adminToken}`)
  .send({ name: 'Widget', price: 100, costPrice: 50, stock: 20 })
  .expect(201);
```

- **`beforeAll`/`afterAll` ลบข้อมูลทดสอบ** — ทุกไฟล์ e2e เริ่มและจบด้วย `DELETE FROM products` / `DELETE FROM users` เพื่อไม่ให้ข้อมูลทดสอบสะสมค้างจากการรันครั้งก่อน ๆ
- **`fileParallelism: false`** ใน `vitest.config.e2e.ts` — บังคับให้ไฟล์ e2e รันทีละไฟล์ (ไม่รันพร้อมกัน) เพราะทุกไฟล์แชร์ฐานข้อมูลทดสอบตัวเดียวกัน ถ้าปล่อยให้รันพร้อมกันจะแย่งกัน `DELETE`/`INSERT` ข้อมูลชุดเดียวกัน ทำให้ test สุ่ม fail แบบจับสาเหตุยาก (flaky test)

---

**ต่อไป**: อ่าน [03-WEB.md](./03-WEB.md) เพื่อดูฝั่ง frontend ที่เรียกใช้ API ชุดนี้
