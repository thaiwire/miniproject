# คู่มือ Report Service — `apps/report` (ASP.NET Core + FastReport)

เอกสารนี้พาไล่อ่านโค้ดของ report service ที่ทำหน้าที่ออกรายงานสินค้าเป็น PDF ตั้งแต่ตอนกดปุ่ม "ออกรายงาน PDF" ที่หน้าเว็บ จนได้ไฟล์ PDF มาแสดงในแท็บใหม่

ควรอ่าน [00-OVERVIEW.md](./00-OVERVIEW.md), [02-API.md](./02-API.md) (โดยเฉพาะ [Step 11: Auth/RBAC](./02-API.md#step-11-authrbac)) และ [03-WEB.md](./03-WEB.md) ก่อน เพราะ service นี้ผูกกับ JWT token เดียวกับที่ `apps/api` ออกให้ และถูกเรียกจากปุ่มในหน้า `/products` ที่ [03-WEB.md](./03-WEB.md) อธิบายไว้แล้ว

---

## Step 0: ทำไม report service ต้องแยกเป็นโปรเจกต์ .NET ต่างหาก

ไลบรารีออกรายงานที่ใช้ในโปรเจกต์นี้คือ **FastReport.OpenSource** (MIT license, ฟรี ไม่มี watermark) ซึ่งเป็นไลบรารี **.NET เท่านั้น** — ไม่มีเวอร์ชัน Node.js/TypeScript ให้ใช้ ทำให้ต้องมีโปรเซสแยกที่เขียนด้วย C# มาทำหน้าที่นี้โดยเฉพาะ แทนที่จะพยายามยัดเข้าไปใน `apps/api` (NestJS)

จุดสำคัญที่ต้องรู้ก่อน:

- **`apps/report` ไม่ใช่ npm workspace** — ไม่มี `package.json` เพราะไม่ใช่โปรเจกต์ Node.js เลย รันด้วย `dotnet` ตรง ๆ (ดู Step 6) npm workspaces (ที่ [01-MAIN-PROJECT.md](./01-MAIN-PROJECT.md) อธิบายไว้) จะมองข้ามโฟลเดอร์นี้ไปเฉย ๆ ไม่ error อะไร
- **ไม่ต่อฐานข้อมูลตรง ๆ** — เรียกข้อมูลสินค้าผ่าน `GET /products` ของ `apps/api` แทน (เหตุผลเต็ม ๆ ใน Step 3)
- **ตรวจ JWT token เดียวกับ `apps/api`** — ไม่มีระบบ login แยก ใช้ secret เดียวกัน (เหตุผลเต็ม ๆ ใน Step 2)

## Step 1: โครงสร้างไฟล์

```
apps/report/
├── report.csproj            ← ประกาศ dependency (เทียบเท่า package.json ของฝั่ง .NET)
├── Program.cs                ← จุดเริ่มโปรแกรม: config, JWT auth, CORS, ประกาศ endpoint
├── .env / .env.example       ← JWT_SECRET, NESTJS_API_BASE_URL (ตาม pattern เดียวกับ apps/api, apps/web)
├── Models/
│   └── ProductDto.cs          ← shape ข้อมูลสินค้าที่รับจาก apps/api (mirror ของ shared-types)
├── Services/
│   ├── ProductClient.cs       ← เรียก GET /products ของ apps/api ผ่าน HttpClient
│   └── ProductsReportService.cs ← โหลด .frx template, bind ข้อมูล, export เป็น PDF
└── Reports/
    └── ProductsReport.frx     ← ไฟล์ template ของ FastReport (layout ของรายงาน)
```

### 1.1 [report.csproj](../apps/report/report.csproj)

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="DotNetEnv" Version="3.2.0" />
    <PackageReference Include="FastReport.OpenSource" Version="2026.2.3" />
    <PackageReference Include="FastReport.OpenSource.Export.PdfSimple" Version="2026.2.3" />
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.11" />
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.29" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.6.2" />
  </ItemGroup>
</Project>
```

- **`Sdk="Microsoft.NET.Sdk.Web"`** — บอกว่านี่คือเว็บโปรเจกต์ (มี Kestrel server ในตัว) ต่างจาก `Microsoft.NET.Sdk` เฉย ๆ ที่ใช้กับ console app หรือ library
- **`FastReport.OpenSource`** — ตัวไลบรารีหลักที่ใช้สร้างรายงาน **ต้องเป็นแพ็กเกจนี้เท่านั้น** ไม่ใช่ `FastReport.Web` หรือ `FastReport.Core` ที่เจอบน NuGet เหมือนกัน เพราะสองตัวนั้นเป็นเวอร์ชันมีลิขสิทธิ์/trial ที่ export ออกมาจะมี watermark ติดหน้ารายงาน (`FastReport.OpenSource` เป็น MIT license ใช้ฟรีไม่มีข้อจำกัดนี้)
- **`FastReport.OpenSource.Export.PdfSimple`** — แพ็กเกจแยกสำหรับ export เป็น PDF โดยเฉพาะ (ตัว core ของ FastReport ไม่ผูก format การ export ไว้ตายตัว ต้องติดตั้งแพ็กเกจ export ที่ต้องการเพิ่มเอง)
- **`Microsoft.AspNetCore.Authentication.JwtBearer`** — ใช้ตรวจสอบ JWT token เดียวกับที่ `apps/api` ออกให้ (ดู Step 2)
- **`DotNetEnv`** — โหลดไฟล์ `.env` (ปกติ ASP.NET Core จะใช้ `appsettings.json` เป็น convention แต่โปรเจกต์นี้เลือกใช้ `.env` แทนเพื่อให้สอดคล้องกับ `apps/api`/`apps/web` ที่ใช้ `.env` ทั้งคู่ — ไม่ต้องเรียนรู้ config pattern ใหม่ข้ามภาษา)

## Step 2: จุดเริ่มโปรแกรม — [Program.cs](../apps/report/Program.cs)

ASP.NET Core (ตั้งแต่ .NET 6 เป็นต้นมา) ใช้ **Minimal API** ได้ — เขียนทุกอย่างในไฟล์เดียวแบบ top-level statements โดยไม่ต้องมี class `Startup` แยกเหมือนเวอร์ชันเก่า เหมาะกับโปรเจกต์นี้ที่มีแค่ 1 endpoint

### 2.1 โหลด .env และตั้งค่า HttpClient

```csharp
DotNetEnv.Env.Load(); // ต้องเรียกก่อน CreateBuilder เสมอ

var builder = WebApplication.CreateBuilder(args);

var nestjsApiUrl = builder.Configuration["NESTJS_API_BASE_URL"] ?? "http://localhost:3000";
builder.Services.AddHttpClient<IProductClient, ProductClient>(client =>
{
    client.BaseAddress = new Uri(nestjsApiUrl);
});
builder.Services.AddScoped<IProductsReportService, ProductsReportService>();
```

- **`DotNetEnv.Env.Load()`** — ต้องรันก่อน `CreateBuilder` เสมอ เพราะ environment variable เป็นหนึ่งใน config source ที่ ASP.NET Core อ่านอัตโนมัติอยู่แล้ว (ผ่าน `builder.Configuration`) การโหลด `.env` เข้า process environment ก่อน จึงทำให้ `builder.Configuration["JWT_SECRET"]` อ่านค่าได้ทันทีโดยไม่ต้องเขียน parser เอง
- **`AddHttpClient<IProductClient, ProductClient>(...)`** — pattern มาตรฐานของ .NET สำหรับสร้าง `HttpClient` ที่ inject เข้า `ProductClient` ได้ (คล้าย `axios` instance ที่ config `baseURL` ไว้ล่วงหน้าใน JS) ผูก `IProductClient` (interface) กับ `ProductClient` (implementation จริง) เพื่อให้ inject ผ่าน interface ได้ (dependency injection แบบเดียวกับที่ NestJS ทำใน [02-API.md](./02-API.md))

### 2.2 ตรวจสอบ JWT ใบเดียวกับ `apps/api`

```csharp
var jwtSecret = builder.Configuration["JWT_SECRET"];
if (string.IsNullOrEmpty(jwtSecret))
{
    throw new InvalidOperationException("JWT_SECRET is not set (ดู .env.example)");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateLifetime = true,
        };
    });
builder.Services.AddAuthorization();
```

จุดที่สำคัญที่สุดของทั้งไฟล์: **`apps/report` ไม่มีระบบ login เป็นของตัวเอง** ผู้ใช้ login ผ่าน `apps/api` เพียงที่เดียว (ดู [02-API.md Step 11](./02-API.md#step-11-authrbac)) แล้วส่ง token เดิมมาที่ `apps/report` ตรง ๆ

- **`JWT_SECRET` ต้องเป็นค่าเดียวกับ `apps/api/.env`** — เพราะ JWT ยืนยันความถูกต้องด้วย signature ที่เซ็นด้วย secret นี้ ถ้า secret ไม่ตรงกัน token ที่ `apps/api` ออกให้จะตรวจสอบไม่ผ่านที่ฝั่งนี้ทันที (throw error ตอน boot เลยถ้าไม่ได้ตั้งค่าไว้ กัน deploy ผิดพลาดแบบเงียบ ๆ)
- **`ValidateIssuer = false` / `ValidateAudience = false`** — ต้องปิดสองอย่างนี้เพราะ `apps/api` เอง**ไม่เคย set** claim `issuer`/`audience` ตอนออก token (ดู `AuthService` ใน [02-API.md](./02-API.md)) ถ้าเปิด validate สองค่านี้ไว้ token ทุกใบจะถูกปฏิเสธหมดทันที ต้อง**ตรงกับพฤติกรรมจริงของฝั่งที่ออก token** เสมอ ไม่ใช่ตั้งตามค่า default หรือ best practice ทั่วไปเฉย ๆ
- **`SymmetricSecurityKey`** — เพราะ `apps/api` เซ็น JWT ด้วย HS256 (symmetric algorithm ใช้ secret เดียวกันทั้งเซ็นและตรวจสอบ) ถ้า `apps/api` เปลี่ยนไปใช้ RS256 (asymmetric) ในอนาคต ฝั่งนี้ต้องเปลี่ยนตามเป็น `RsaSecurityKey` ด้วย

### 2.3 CORS และ endpoint

```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:3001").AllowAnyHeader().AllowAnyMethod());
});

// ...

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/reports/products", async (HttpContext ctx, IProductsReportService reportService, int? minId, int? maxId) =>
{
    if (minId.HasValue && maxId.HasValue && minId > maxId)
    {
        return Results.BadRequest(new { message = "minId ต้องไม่มากกว่า maxId" });
    }

    var token = ctx.Request.Headers.Authorization.ToString().Replace("Bearer ", "");
    var pdfBytes = await reportService.GeneratePdfAsync(token, minId, maxId);
    return Results.File(pdfBytes, "application/pdf", "products-report.pdf");
})
.RequireAuthorization();
```

- **CORS** — เปิดเฉพาะ origin `http://localhost:3001` (`apps/web`) เหมือนกับที่ `apps/api` ทำใน `main.ts` (ดู [02-API.md Step 1](./02-API.md#step-1-จุดเริ่มต้นโปรแกรม--srcmaints)) เพราะ `apps/web` เรียก `apps/report` ตรงจาก browser เช่นกัน (คนละ origin/port: `3001` → `5100`)
- **ลำดับ `UseCors()` → `UseAuthentication()` → `UseAuthorization()`** — ต้องเรียงแบบนี้เสมอใน ASP.NET Core middleware pipeline เพราะแต่ละ middleware ทำงานตามลำดับที่ประกาศ (CORS ต้องเช็คก่อน auth เพื่อให้ preflight request ผ่านได้ก่อนจะไปเจอ auth guard)
- **`app.MapGet(...).RequireAuthorization()`** — Minimal API ผูก authorization เข้ากับแต่ละ route ตรง ๆ (ต่างจาก NestJS ที่ใช้ global guard แบบ `APP_GUARD` ใน [02-API.md](./02-API.md)) เพราะ service นี้มีแค่ endpoint เดียว จึงไม่จำเป็นต้องมีกลไก global guard ที่ซับซ้อนกว่านี้
- **`int? minId, int? maxId` เป็น parameter ของ route handler ตรง ๆ** — Minimal API ของ ASP.NET Core bind query string parameter เข้ากับ parameter ของ lambda โดยอัตโนมัติตามชื่อ (`?minId=1&maxId=5` → `minId`/`maxId`) ไม่ต้องมี attribute หรือ DTO แยกเหมือน NestJS's `@Query() query: PaginationQueryDto` (ดู [02-API.md](./02-API.md)) เพราะ endpoint นี้มีแค่ 2 parameter ที่เป็น optional ธรรมดา — ใช้ `int?` (nullable int) แทน `int` เพื่อให้รู้ได้ว่า "ไม่ได้ส่งมา" (`null`) ต่างจาก "ส่งมาเป็น 0"
- **เช็ค `minId > maxId` ก่อนเรียก `GeneratePdfAsync`** — เหมือนกับที่ `apps/api`'s `ProductService.findAll()` เช็คซ้ำอีกชั้น (ดู [02-API.md Step 13.4](./02-API.md#134-กรองช่วง-id--srcproductproductservicets)) เป็น validation คนละชั้นกัน คนละภาษากัน แต่กฎเดียวกัน — เผื่อมีใครเรียก `apps/report` ตรง ๆ ข้ามฝั่งเว็บมา (เช่นทดสอบด้วย curl/Postman) ก็ยังโดนเช็คอยู่ดี ไม่ต้องพึ่งพา validation ฝั่ง frontend อย่างเดียว
- **`ctx.Request.Headers.Authorization.ToString().Replace("Bearer ", "")`** — ดึง token ดิบจาก header `Authorization: Bearer <token>` ที่ browser แนบมา (ผ่านการตรวจสอบจาก `RequireAuthorization()` แล้วว่า valid) เพื่อส่งต่อไปให้ `ProductClient` เรียก `apps/api` ต่อ (ดู Step 3) — เป็นการ "ส่งต่อ identity เดิม" ไม่ใช้ credential แยกต่างหาก
- **`Results.File(pdfBytes, "application/pdf", "products-report.pdf")`** — ตอบกลับเป็นไฟล์ไบนารี พร้อม `Content-Type: application/pdf` แต่ ASP.NET Core จะแนบ header `Content-Disposition: attachment` มาด้วยโดย default (บอก browser ว่าควร "ดาวน์โหลด" ไฟล์นี้) — header นี้มีผลเฉพาะตอน browser navigate ไปที่ URL นี้ตรง ๆ เท่านั้น เมื่อฝั่งเว็บ fetch มาเป็น `Blob` แล้วสร้าง URL ใหม่เอง (ดู Step 5) header นี้จะไม่ติดไปด้วย ทำให้ยังแสดงผลแบบ inline ในแท็บใหม่ได้ตามที่ต้องการ

## Step 3: เรียกข้อมูลจาก `apps/api` — [Services/ProductClient.cs](../apps/report/Services/ProductClient.cs)

```csharp
public class ProductClient(HttpClient httpClient) : IProductClient
{
    private const int MaxLimit = 100;

    public async Task<List<ProductDto>> GetAllProductsAsync(string bearerToken, int? minId = null, int? maxId = null)
    {
        var queryParams = $"page=1&limit={MaxLimit}";
        if (minId.HasValue) queryParams += $"&minId={minId.Value}";
        if (maxId.HasValue) queryParams += $"&maxId={maxId.Value}";

        using var request = new HttpRequestMessage(HttpMethod.Get, $"/products?{queryParams}");
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<PaginatedProductsDto>();
        return result?.Data ?? [];
    }
}
```

### 3.0 พารามิเตอร์ `minId`/`maxId` — ส่งต่อเงื่อนไขช่วงรหัสไปให้ `apps/api` กรองให้

`GetAllProductsAsync` รับ `minId`/`maxId` เป็น **optional parameter** (`int? minId = null, int? maxId = null`) เพื่อรองรับฟีเจอร์ "ออกรายงานสินค้าตามช่วงรหัส" (ดู [03-WEB.md Step 13](./03-WEB.md#step-13-ออกรายงานสินค้าตามช่วงรหัส--srcappauthenticatedproductsreportpagetsx--srcmodulesreportscomponentsproductrangereportformtsx)) — สังเกตว่า `apps/report` **ไม่ได้กรองข้อมูลเอง** แค่ต่อ query string เพิ่มแล้วส่งต่อให้ `GET /products` ของ `apps/api` เป็นคนกรองจริง (ดู [02-API.md Step 13.4](./02-API.md#134-กรองช่วง-id--srcproductproductservicets)) — เหตุผลเดียวกับ 3.1: ให้ `apps/api` เป็นแหล่งความจริงเดียว (single source of truth) ของ business logic ทั้งหมดเกี่ยวกับข้อมูลสินค้า `apps/report` มีหน้าที่แค่เรียกใช้และ render ผลลัพธ์เป็น PDF เท่านั้น ไม่ตัดสินใจอะไรเกี่ยวกับข้อมูลเอง

### 3.1 ทำไมไม่ต่อฐานข้อมูล SQL Server ตรง ๆ

ตัดสินใจสำคัญของ service นี้: **เรียกผ่าน `GET /products` ของ `apps/api` แทนที่จะต่อ MSSQL เอง** เหตุผลคือ `apps/api` มี business rule "ห้าม `costPrice` หลุดออกไปให้ client เห็น" อยู่แล้ว (ดู `ProductResponseDto.fromEntity()` ใน [02-API.md Step 6.3](./02-API.md#63-dtoproduct-responsedtots--ข้อมูลตอนส่งกลับไปหา-client)) — ถ้า `apps/report` ต่อฐานข้อมูลตรง ๆ จะต้องเขียนกฎเดียวกันนี้ซ้ำอีกที่หนึ่ง เสี่ยงต่อการลืมแล้วทำให้ต้นทุนสินค้าหลุดไปอยู่ในรายงาน PDF โดยไม่ตั้งใจ การเรียกผ่าน API จึงได้กฎนี้มาฟรี — รายงานที่ออกมาจะไม่มี `costPrice` เสมอเพราะ `apps/api` ไม่เคยส่งค่านี้ออกมาให้ตั้งแต่แรก

### 3.2 ข้อจำกัดปัจจุบัน: จำกัดแค่ 100 รายการแรก

`GET /products` ของ `apps/api` แบ่งหน้าสูงสุด 100 รายการต่อครั้ง (ดู [02-API.md](./02-API.md) เรื่อง `PaginationQueryDto`) โค้ดตอนนี้ยิงแค่หน้าเดียว (`page=1&limit=100`) ถ้าสินค้ามีมากกว่า 100 รายการ รายงานจะเห็นแค่ 100 รายการแรก (เรียงตาม `id ASC`) — ยอมรับข้อจำกัดนี้ในรอบแรกเพราะจำนวนสินค้าจริงยังน้อย ถ้าต้องรองรับเกิน 100 รายการในอนาคต ต้องเพิ่ม loop วนเรียกทีละหน้าจนกว่า `meta.page >= meta.totalPages`

### 3.3 ส่งต่อ token เดิม ไม่ใช้ credential แยก

`GetAllProductsAsync(bearerToken)` รับ token ที่ `Program.cs` ดึงมาจาก request ของผู้ใช้จริง แล้วแนบไปกับ request ที่ยิงหา `apps/api` ต่อ — วิธีนี้ทำให้ `apps/api` เห็นว่าเป็น request จากผู้ใช้คนเดิม (role/สิทธิ์เดียวกัน) ไม่ต้องสร้าง service account หรือ API key แยกต่างหากสำหรับการสื่อสารระหว่างสองเซอร์วิสนี้

## Step 4: สร้าง PDF ด้วย FastReport — [Services/ProductsReportService.cs](../apps/report/Services/ProductsReportService.cs)

```csharp
public async Task<byte[]> GeneratePdfAsync(string bearerToken, int? minId = null, int? maxId = null)
{
    var products = await productClient.GetAllProductsAsync(bearerToken, minId, maxId);

    using var report = new FastReport.Report();
    report.Load(Path.Combine(env.ContentRootPath, "Reports", "ProductsReport.frx"));

    var table = BuildProductsTable(products);
    report.RegisterData(table, "Products");

    var dataSource = report.GetDataSource("Products");
    if (dataSource != null)
    {
        dataSource.Enabled = true;
    }

    report.Prepare();

    using var pdfExport = new PDFSimpleExport();
    using var stream = new MemoryStream();
    report.Export(pdfExport, stream);
    return stream.ToArray();
}
```

### 4.1 ขั้นตอนมาตรฐานของ FastReport: Load → RegisterData → Enabled → Prepare → Export

FastReport แยก "โครงรายงาน" (template, ไฟล์ `.frx`) ออกจาก "ข้อมูลจริง" (`DataTable`) เหมือนที่ React แยก JSX (โครง) ออกจาก state (ข้อมูล) — ต้องทำตามลำดับนี้เสมอ:

1. **`report.Load(path)`** — โหลดไฟล์ `.frx` (ดู Step 5) เข้ามาเป็น object ในหน่วยความจำ
2. **`report.RegisterData(table, "Products")`** — "แนะนำ" ข้อมูลจริงให้ report รู้จักภายใต้ชื่อ `"Products"` (ชื่อนี้ต้องตรงกับที่ตั้งไว้ในไฟล์ `.frx` เป๊ะ ๆ)
3. **`report.GetDataSource("Products").Enabled = true`** — ⚠️ **ขั้นตอนที่มือใหม่ลืมบ่อยที่สุด** — แค่ `RegisterData` เฉย ๆ ไม่พอ ต้องเปิด `Enabled` ให้ datasource ด้วยตนเอง ไม่งั้น band (ส่วนของ layout ที่วนซ้ำต่อแถวข้อมูล) จะไม่ถูกผูกกับข้อมูลที่เพิ่ง register ไป **อาการที่เจอ**: โค้ด run ผ่านไม่มี error เลย ได้ไฟล์ PDF กลับมาจริง แต่เปิดดูแล้วมีแค่หัวรายงาน/หัวตาราง ไม่มีแถวข้อมูลเลยสักแถว (เพราะไม่ throw exception ให้เห็นตรง ๆ จึงดีบักยากกว่าที่ควรจะเป็น)
4. **`report.Prepare()`** — คำนวณ layout จริง (จัดหน้า, คำนวณจำนวนหน้า, วนซ้ำ band ตามจำนวนแถวข้อมูล) ให้พร้อม export
5. **`report.Export(new PDFSimpleExport(), stream)`** — แปลงผลลัพธ์ที่ `Prepare()` เตรียมไว้ให้เป็นไฟล์ PDF จริง เขียนลง `MemoryStream` (ไม่เขียนลงไฟล์ในดิสก์ เพราะจะส่งกลับเป็น HTTP response โดยตรง)

### 4.2 ทำไมต้อง `new FastReport.Report()` แบบเขียนเต็ม (fully-qualified)

```csharp
using var report = new FastReport.Report();
```

โปรเจกต์นี้ตั้งชื่อ root namespace ของตัวเองว่า `Report` (มาจากชื่อโปรเจกต์ `report.csproj` — ดู `namespace Report.Services` ด้านบนไฟล์) ซึ่งชนกับชื่อ class `Report` ของ FastReport เอง (`FastReport.Report`) ถ้าเขียนแค่ `new Report()` เฉย ๆ คอมไพเลอร์จะงงว่าหมายถึง namespace ของโปรเจกต์เราเองหรือ class ของ FastReport ต้องเขียนเต็ม `FastReport.Report` เพื่อความชัดเจนเสมอในไฟล์นี้

### 4.3 แปลง `List<ProductDto>` เป็น `DataTable`

```csharp
private static DataTable BuildProductsTable(List<ProductDto> products)
{
    var table = new DataTable("Products");
    table.Columns.Add("Id", typeof(int));
    table.Columns.Add("Name", typeof(string));
    table.Columns.Add("Price", typeof(decimal));
    table.Columns.Add("Stock", typeof(int));
    table.Columns.Add("CreatedAt", typeof(DateTime));

    foreach (var p in products)
    {
        table.Rows.Add(p.Id, p.Name, p.Price, p.Stock, p.CreatedAt);
    }
    return table;
}
```

FastReport (และ ADO.NET โดยรวม) ใช้ `System.Data.DataTable` เป็นรูปแบบข้อมูลมาตรฐานสำหรับ bind กับรายงาน/ตาราง — คล้ายกับ array of objects ใน JS แต่มี schema (ชื่อ+ type ของแต่ละ column) ประกาศไว้ชัดเจนล่วงหน้า ต้องแปลง `List<ProductDto>` (โมเดลข้อมูลปกติของ .NET) ให้เป็น `DataTable` ก่อนเสมอ ไม่มีทาง bind ตรง ๆ ได้

## Step 5: ไฟล์ template — [Reports/ProductsReport.frx](../apps/report/Reports/ProductsReport.frx)

ไฟล์ `.frx` คือรูปแบบ XML ของ FastReport ที่เก็บ "หน้าตา/layout" ของรายงาน แยกจากโค้ด C# โดยสิ้นเชิง — ปกติออกแบบผ่านโปรแกรม FastReport Designer (drag-and-drop แบบเดียวกับ Crystal Reports/SSRS) แต่ในโปรเจกต์นี้เขียน XML ด้วยมือโดยตรงเพราะ layout เรียบง่าย (แค่ตารางเดียว)

โครงสร้างสำคัญของไฟล์:

```xml
<TableDataSource Name="Products" ...>
  <Column Name="Id" DataType="System.Int32"/>
  <Column Name="Name" DataType="System.String"/>
  <Column Name="Price" DataType="System.Decimal"/>
  <Column Name="Stock" DataType="System.Int32"/>
  <Column Name="CreatedAt" DataType="System.DateTime"/>
</TableDataSource>

<ReportPage ...>
  <ReportTitleBand .../>   <!-- หัวรายงาน: ชื่อรายงาน + วันที่ -->
  <PageHeaderBand .../>     <!-- หัวตาราง: ชื่อ column ภาษาไทย -->
  <DataBand DataSource="Products" ...>
    <!-- ผูกกับ [Products.Name], [Products.Price], ... -->
  </DataBand>
  <PageFooterBand .../>     <!-- เลขหน้า -->
</ReportPage>
```

- **`TableDataSource Name="Products"`** — ชื่อนี้ต้องตรงกับ string `"Products"` ที่ใช้ใน `report.RegisterData(table, "Products")` (Step 4.1) เป๊ะ ๆ ทั้งชื่อ datasource และชื่อ column (`Id`, `Name`, `Price`, `Stock`, `CreatedAt`) ต้องตรงกับที่สร้างไว้ใน `DataTable` (Step 4.3) — ถ้าชื่อไม่ตรง FastReport จะหาข้อมูลมา bind ไม่เจอ (เงียบ ๆ เหมือนปัญหาใน Step 4.1 ข้อ 3)
- **`DataBand`** — ส่วนของ layout ที่ **วนซ้ำอัตโนมัติ 1 ครั้งต่อ 1 แถว** ของ datasource ที่ผูกไว้ (คล้าย `.map()` ใน React ที่ render 1 component ต่อ 1 item ของ array)
- **`[Products.FieldName]`** — expression syntax ของ FastReport สำหรับดึงค่าจาก column ของ datasource มาแสดงใน text object แต่ละอัน

## Step 6: วิธีรัน

```bash
cd apps/report
dotnet restore
dotnet run
```

หรือจาก root ของ monorepo (มี script ห่อไว้แล้ว ดู [01-MAIN-PROJECT.md Step 3.6](./01-MAIN-PROJECT.md)):

```bash
npm run dev:report
```

จะได้ service ที่ `http://localhost:5100` ก่อนรันต้องมีไฟล์ `apps/report/.env` (copy จาก `.env.example`) ตั้งค่า:

```
JWT_SECRET=<ค่าเดียวกับ apps/api/.env>
ASPNETCORE_URLS=http://localhost:5100
NESTJS_API_BASE_URL=http://localhost:3000
```

> **ข้อกำหนดเครื่อง**: ต้องมี [.NET 8 SDK](https://dotnet.microsoft.com/download) ติดตั้งไว้ก่อน (`dotnet --version` ควรขึ้น `8.x`) — คนละ runtime กับ Node.js ที่ใช้รัน `apps/api`/`apps/web`

## Step 7: ฝั่งเว็บเรียกใช้อย่างไร — [apps/web/src/modules/reports/report-api.ts](../apps/web/src/modules/reports/report-api.ts)

```typescript
export async function previewProductsReport(): Promise<void> {
  const newTab = window.open("", "_blank");

  const token = getAccessToken();
  const res = await fetch(`${REPORT_API_URL}/reports/products`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    newTab?.close();
    throw new Error(res.status === 401 ? "กรุณาเข้าสู่ระบบใหม่" : "ออกรายงานไม่สำเร็จ");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (newTab) {
    newTab.location.href = url;
  } else {
    window.open(url, "_blank");
  }
}
```

### 7.1 ทำไมเปิดแท็บเปล่าไว้ก่อน `await fetch` แทนที่จะเปิดทีหลัง

จุดที่ดูแปลกที่สุดของฟังก์ชันนี้: `window.open("", "_blank")` ถูกเรียก**ก่อน** `fetch` เสร็จด้วยซ้ำ — นี่คือการแก้ปัญหา **popup blocker** ของเบราว์เซอร์โดยเจตนา:

- เบราว์เซอร์อนุญาตให้ `window.open()` เปิดแท็บใหม่ได้ก็ต่อเมื่อถูกเรียก**ในช่วง synchronous ของ user gesture** (เช่น ในบรรทัดแรก ๆ ของ click handler) เท่านั้น
- ถ้าเรียก `window.open()` **หลัง** `await fetch(...)` เสร็จ เบราว์เซอร์จะมองว่าโค้ดตรงนั้นรันแบบ asynchronous แล้ว "ไม่นับว่าเป็น user gesture อีกต่อไป" แล้วบล็อกเป็น popup ทันที (ผู้ใช้จะไม่เห็นอะไรเกิดขึ้นเลย แถมไม่มี error ให้เห็นชัดเจนด้วย)
- ทางแก้: เปิดแท็บเปล่า (`window.open("", "_blank")`) ทันทีตั้งแต่บรรทัดแรกของฟังก์ชัน (ยังอยู่ใน synchronous call stack ของ click event) เก็บ reference (`newTab`) ไว้ก่อน แล้วค่อยรอ `fetch`/`blob` เสร็จ จากนั้นค่อยเปลี่ยน `newTab.location.href` เป็น URL จริงทีหลัง — วิธีนี้ผ่านเงื่อนไข "ต้องเป็น user gesture" ของเบราว์เซอร์ได้ เพราะแท็บถูกเปิดไปแล้วตั้งแต่ต้น แค่ยังไม่มีเนื้อหา

### 7.2 ทำไมเป็นการ "preview" ในแท็บใหม่ ไม่ใช่ดาวน์โหลดไฟล์อัตโนมัติ

- **`res.blob()`** — อ่าน response body เป็น binary blob (แทนที่จะเป็น JSON แบบที่ `apiFetch` ใน [src/lib/api.ts](../apps/web/src/lib/api.ts) ทำ — จึงต้องเขียนฟังก์ชันแยกไม่ใช้ `apiFetch` เดิม)
- **`URL.createObjectURL(blob)`** — สร้าง URL ชั่วคราว (รูปแบบ `blob:http://localhost:3001/...`) ที่ browser ใช้เข้าถึงข้อมูล blob นี้ได้โดยตรง โดยไม่ต้องอัปโหลดขึ้นเซิร์ฟเวอร์ไหนเลย
- **จุดสำคัญ**: `Content-Disposition: attachment` header ที่ [Program.cs](../apps/report/Program.cs) (Step 2.3) ส่งมาจาก HTTP response ดิบ **ไม่ติดไปกับ blob URL ที่สร้างขึ้นใหม่นี้** เพราะ blob URL เป็นข้อมูลในหน่วยความจำของ browser ล้วน ๆ ไม่ผ่าน HTTP request/response cycle อีกรอบ — เมื่อ `newTab.location.href` ชี้ไปที่ blob URL (ที่มีแค่ `type: application/pdf` ติดมาจาก blob object) เบราว์เซอร์จะใช้ PDF viewer ในตัวแสดงผลแบบ inline แทนที่จะเด้ง dialog ดาวน์โหลด
- **ไม่ `URL.revokeObjectURL()` ทันที** — เพราะแท็บใหม่ยังโหลดเนื้อหาจาก URL นี้อยู่ ถ้า revoke ทันทีข้อมูลจะหายไปก่อนที่แท็บจะโหลดเสร็จ ปล่อยให้ browser จัดการ cleanup memory เองตอนแท็บถูกปิด (garbage collected ตามปกติ)

## Step 8: ทดสอบด้วยตัวเอง

1. รันครบ 3 service: `npm run dev:api`, `npm run dev:web`, `npm run dev:report` (คนละ terminal)
2. Login ที่ `http://localhost:3001/login` แล้วไปหน้า `/products`
3. กด "ออกรายงาน PDF" มุมขวาบนของตาราง — ควรเห็นแท็บใหม่เปิดขึ้นทันที (ไม่ใช่ popup ถูกบล็อก) แล้วแสดง PDF รายชื่อสินค้าทั้งหมด (ไม่มีคอลัมน์ต้นทุน/`costPrice`)
4. ลอง logout แล้วยิง `curl http://localhost:5100/reports/products` ตรง ๆ โดยไม่แนบ token — ควรได้ 401
5. ลองปิด `apps/api` (`Ctrl+C` ที่ terminal ของ `dev:api`) แล้วกด "ออกรายงาน PDF" อีกครั้ง — ควรเห็น error message เพราะ `ProductClient.GetAllProductsAsync` เรียก `apps/api` ไม่ได้ (`response.EnsureSuccessStatusCode()` จะ throw)
6. ยิง `curl "http://localhost:5100/reports/products?minId=1&maxId=1" -H "Authorization: Bearer <token>"` (ดู [03-WEB.md Step 13](./03-WEB.md#step-13-ออกรายงานสินค้าตามช่วงรหัส--srcappauthenticatedproductsreportpagetsx--srcmodulesreportscomponentsproductrangereportformtsx) สำหรับทดสอบผ่านหน้าเว็บโดยตรง) — ควรได้ PDF ที่มีแค่สินค้า id 1
7. ยิง `curl "http://localhost:5100/reports/products?minId=50&maxId=10" -H "Authorization: Bearer <token>"` (ช่วงกลับด้าน) — ควรได้ 400 พร้อม `{"message":"minId ต้องไม่มากกว่า maxId"}`

## Step 9: ถ้าระบบมีรายงานมากกว่า 500 รายงาน ต้องออกแบบโฟลเดอร์/โค้ดยังไง

โครงสร้างปัจจุบัน (Step 1) — `Reports/` เก็บไฟล์ `.frx` แบนราบทั้งหมด, `Services/` มี service class แยกต่อ 1 รายงาน (`ProductsReportService`), `Program.cs` ประกาศ endpoint ทีละบรรทัดด้วยมือ (`app.MapGet("/reports/products", ...)`) — ใช้ได้ตอนมีไม่กี่รายงาน แต่**ไม่ scale ถึง 500 รายงานแน่นอน**: หา `.frx` ไฟล์ไหนเป็นไฟล์ไหนไม่ได้เมื่ออยู่ในโฟลเดอร์เดียวกันหมด, `Program.cs` จะยาวหลายพันบรรทัด, และแก้รายงานหนึ่งเสี่ยงกระทบรายงานอื่นเพราะไม่มีขอบเขตแยกกันชัดเจน

### 9.1 จัดโฟลเดอร์ตามระบบย่อย เหมือนที่ [00-OVERVIEW.md 2.2](./00-OVERVIEW.md#22-ถ้า-module-เดียวโตจนมีเมนู-20-เมนู-ต้องออกแบบยังไง-แนวทางสำหรับ-ระบบย่อย-ในอนาคต) ทำกับฝั่งเว็บ

หลักการเดียวกันทุกประการ แค่ย้ายมาใช้ฝั่ง .NET — จัดกลุ่มตาม**ระบบย่อยของ ERP** (accounting, inventory, hr, sales, ...) ก่อน แล้วค่อยแบ่งย่อยเป็นรายงานแต่ละตัวภายในระบบย่อยนั้น:

```
apps/report/
├── Reports/
│   ├── Accounting/
│   │   ├── InvoiceSummary/
│   │   │   ├── InvoiceSummary.frx
│   │   │   ├── InvoiceSummaryDto.cs
│   │   │   └── InvoiceSummaryService.cs
│   │   ├── MonthlyLedger/
│   │   │   ├── MonthlyLedger.frx
│   │   │   ├── MonthlyLedgerDto.cs
│   │   │   └── MonthlyLedgerService.cs
│   │   └── ... (รายงานอื่นในกลุ่มบัญชี)
│   ├── Inventory/
│   │   ├── StockMovement/
│   │   │   └── ...
│   │   └── ... (รายงานอื่นในกลุ่มคลังสินค้า)
│   ├── HR/
│   │   └── ...
│   └── Products/                      ← รายงานเดิมของโปรเจกต์นี้ (ProductsReport) ก็จัดเข้ากลุ่มเดียวกัน
│       ├── ProductsReport.frx
│       ├── ProductDto.cs
│       └── ProductsReportService.cs
├── Endpoints/
│   ├── AccountingReportEndpoints.cs    ← รวม endpoint ของกลุ่มบัญชีทั้งหมดไว้ที่เดียว
│   ├── InventoryReportEndpoints.cs
│   ├── HRReportEndpoints.cs
│   └── ProductsReportEndpoints.cs
└── Program.cs                          ← สั้นลงเหลือแค่ config + เรียก MapXxxReportEndpoints() ทีละกลุ่ม
```

- **1 รายงาน = 1 โฟลเดอร์ที่มีทั้ง `.frx` + DTO + service อยู่ด้วยกัน** — ย้ายจากที่ Step 1 แยก `Reports/`/`Models/`/`Services/` เป็น 3 โฟลเดอร์คู่ขนานกัน (ต้องเปิด 3 ที่เพื่อดูรายงานเดียว) มาเป็นแบบ **feature folder** ที่ไฟล์ทุกอย่างของรายงานนั้นอยู่ด้วยกันในที่เดียว หาง่ายกว่ามากเมื่อมีเป็นร้อย ๆ รายงาน — เหตุผลเดียวกับที่ `modules/products/` ฝั่งเว็บรวม `product-api.ts` กับ `components/` ไว้ด้วยกัน (ดู [00-OVERVIEW.md 2.1](./00-OVERVIEW.md#21-ทำไม-appswebsrc-ถึงมีทั้ง-modules-และ-componentslib))
- **จัดกลุ่มระดับบนสุดตามระบบย่อย ไม่ใช่ตามประเภทไฟล์** — `Reports/Accounting/`, `Reports/Inventory/` แทนที่จะเป็น `Reports/`, `Models/`, `Services/` แบนราบ — เป็นกติกาเดียวกับที่ [00-OVERVIEW.md 2.2](./00-OVERVIEW.md#22-ถ้า-module-เดียวโตจนมีเมนู-20-เมนู-ต้องออกแบบยังไง-แนวทางสำหรับ-ระบบย่อย-ในอนาคต) แนะนำไว้กับ `modules/accounting/invoices/` ฝั่งเว็บ — คนละภาษา แต่หลักการจัดโครงสร้างเดียวกัน

### 9.2 แยก endpoint ออกจาก `Program.cs` เป็นไฟล์ Extension Method ต่อกลุ่ม

`Program.cs` แบบ Minimal API ที่มีแค่ 1 endpoint (Step 2) เขียน `app.MapGet(...)` ตรง ๆ ในไฟล์เดียวได้สบาย แต่พอมี 500 endpoint จะยาวจัดการไม่ไหว — ใช้ pattern **endpoint group extension method** ของ ASP.NET Core แยกทะเบียน endpoint ออกไปเป็นไฟล์ต่อกลุ่ม:

```csharp
// Endpoints/AccountingReportEndpoints.cs
public static class AccountingReportEndpoints
{
    public static void MapAccountingReportEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/reports/accounting").RequireAuthorization();

        group.MapGet("/invoice-summary", async (IInvoiceSummaryService svc, int? minId, int? maxId) =>
        {
            var pdf = await svc.GeneratePdfAsync(minId, maxId);
            return Results.File(pdf, "application/pdf", "invoice-summary.pdf");
        });

        group.MapGet("/monthly-ledger", async (IMonthlyLedgerService svc, int year, int month) =>
        {
            var pdf = await svc.GeneratePdfAsync(year, month);
            return Results.File(pdf, "application/pdf", "monthly-ledger.pdf");
        });

        // ... รายงานอื่นในกลุ่มบัญชี
    }
}
```

```csharp
// Program.cs — สั้นลงเหลือแค่เรียกแต่ละกลุ่ม
app.MapProductsReportEndpoints();
app.MapAccountingReportEndpoints();
app.MapInventoryReportEndpoints();
app.MapHRReportEndpoints();
```

- **`app.MapGroup("/reports/accounting")`** — ฟีเจอร์ของ ASP.NET Core (ตั้งแต่ .NET 7) สำหรับ**จัดกลุ่ม route ที่มี prefix ร่วมกัน** พร้อมตั้งค่าที่ใช้ร่วมกันได้ครั้งเดียว (เช่น `.RequireAuthorization()` ตั้งที่ group แทนที่ต้องเขียน `.RequireAuthorization()` ต่อท้ายทุก endpoint แบบ Step 2)
- **แยกไฟล์ตามระบบย่อยเหมือน 9.1** — คนที่ดูแลรายงานกลุ่มบัญชีแก้แค่ `AccountingReportEndpoints.cs` ไม่ต้องแตะไฟล์เดียวกับคนที่ดูแลกลุ่มคลังสินค้า — ได้ประโยชน์เรื่องหลาย dev ทำงานพร้อมกันแบบเดียวกับที่ [00-OVERVIEW.md 2.3](./00-OVERVIEW.md#23-หลาย-dev-ทำงานพร้อมกันในระบบ-erp-เดียวกัน--โครงสร้างนี้ช่วยยังไง) อธิบายไว้ฝั่งเว็บ
- **`Program.cs` เหลือแค่ "รายการกลุ่ม"** — เทียบเท่ากับที่ `app.module.ts` ฝั่ง NestJS มีแค่ `imports: [AccountingModule, InventoryModule, ...]` (ดู [02-API.md Step 2.3](./02-API.md#23-feature-modules-และ-global-guard)) ไม่ต้องรู้รายละเอียดว่าแต่ละ module มีกี่ endpoint ข้างใน

### 9.3 Dependency Injection ต้อง register เป็นกลุ่มเช่นกัน ไม่ใช่ทีละ service

Step 2 register service ทีละบรรทัดด้วยมือ (`builder.Services.AddScoped<IProductsReportService, ProductsReportService>();`) — พอมี 500 service จะเป็นอีกจุดที่ `Program.cs` บวมและลืมง่าย ให้เขียน extension method รวม registration ต่อกลุ่มเหมือนกัน:

```csharp
// Reports/Accounting/AccountingReportServiceCollectionExtensions.cs
public static class AccountingReportServiceCollectionExtensions
{
    public static IServiceCollection AddAccountingReportServices(this IServiceCollection services)
    {
        services.AddScoped<IInvoiceSummaryService, InvoiceSummaryService>();
        services.AddScoped<IMonthlyLedgerService, MonthlyLedgerService>();
        // ...
        return services;
    }
}
```

```csharp
// Program.cs
builder.Services.AddProductsReportServices();
builder.Services.AddAccountingReportServices();
builder.Services.AddInventoryReportServices();
```

### 9.4 ทางเลือกที่ต้องพิจารณาเพิ่มเมื่อจำนวนรายงานเยอะขนาดนี้

- **Route ต่อกลุ่มระบบย่อย** — `/reports/accounting/invoice-summary`, `/reports/inventory/stock-movement` แทนที่จะแบนราบทั้งหมดใต้ `/reports/` เฉย ๆ (เหมือนที่ 9.2 ตั้ง prefix ผ่าน `MapGroup`) ทำให้ดู Swagger UI (ที่เปิดไว้อยู่แล้วตาม Step 2) แล้วเห็นกลุ่มชัดเจน ไม่ใช่ endpoint 500 ตัวเรียงกันแบนราบ
- **ตรวจสอบสิทธิ์ต่อรายงาน ไม่ใช่แค่ "login แล้วดูได้หมด"** — ตอนนี้ `RequireAuthorization()` แค่เช็คว่า login (มี token ที่ valid) เท่านั้น (ดู Step 2.3) ไม่ได้เช็ค role/สิทธิ์เฉพาะรายงาน พอมี 500 รายงานที่มักมีระดับความอ่อนไหวต่างกันมาก (เช่น รายงานเงินเดือน HR ไม่ควรให้พนักงานทั่วไปเห็น) ควรเพิ่ม policy-based authorization ของ ASP.NET Core (`.RequireAuthorization("HR.ViewSalaryReport")`) ต่อ endpoint หรือต่อกลุ่ม แทนการเปิดกว้างเหมือนกันหมดแบบตอนนี้
- **แคช/คิวสำหรับรายงานที่หนัก** — รายงานบางตัวในจำนวน 500 นี้อาจ query ข้อมูลจำนวนมาก/ใช้เวลานาน (ต่างจาก `ProductsReport` ที่เบา) ควรแยกแนวทางระหว่าง "รายงานเบาที่ generate สด ๆ ทุกครั้ง" (แบบ pattern เดิมของโปรเจกต์นี้) กับ "รายงานหนักที่ควร generate แบบ async/background job แล้วแจ้งเตือนเมื่อเสร็จ" — ไม่ใช่ทุกรายงานควรใช้ pattern เดียวกับ `ProductsReport`
- **Naming convention ที่บังคับใช้จริงจัง** — เมื่อมี 500 ไฟล์ `.frx` ชื่อไฟล์/namespace ต้องสอดคล้องกันเป๊ะ (เช่น `{ระบบย่อย}/{ชื่อรายงาน}/{ชื่อรายงาน}.frx` เสมอ) ไม่งั้นจะหาไฟล์ไม่เจอทั้งที่โฟลเดอร์จัดกลุ่มไว้ดีแล้วก็ตาม — ควรเขียนเป็นกฎทีมชัดเจนตั้งแต่รายงานที่ 2-3 ไม่ใช่รอให้ถึง 500 แล้วค่อยมาแก้

---

**สรุปเส้นทางข้อมูล**: ผู้ใช้กด "ออกรายงาน PDF" ที่ `ProductList` (`modules/products/components/ProductList.tsx`) → `previewProductsReport()` เปิดแท็บเปล่าไว้ก่อน → `fetch` ไปที่ `apps/report` แนบ JWT token เดิม → `apps/report`'s `JwtAuthGuard`-เทียบเท่า (`RequireAuthorization()`) ตรวจ token ด้วย secret เดียวกับ `apps/api` → ส่งต่อ token เดิมไปเรียก `GET /products` ของ `apps/api` → ได้ข้อมูลสินค้าที่ไม่มี `costPrice` (เพราะ `apps/api` กรองไว้แล้ว) → แปลงเป็น `DataTable` → bind เข้ากับ `ProductsReport.frx` ผ่าน FastReport → export เป็น PDF bytes → ตอบกลับเป็น HTTP response → ฝั่งเว็บอ่านเป็น `Blob` → สร้าง `blob:` URL → ตั้งเป็น `location.href` ของแท็บที่เปิดไว้ → ผู้ใช้เห็น PDF preview ทันที

เอกสารทั้ง 4 ไฟล์ในชุดนี้ครอบคลุมทุกเซอร์วิสในระบบแล้ว: `apps/api` (ข้อมูล+auth), `apps/web` (UI), `packages/shared-types` (type กลางของสองฝั่งแรก), และ `apps/report` (รายงาน — ผูกกับ `apps/api` ผ่าน HTTP + JWT เดียวกัน แต่เป็นคนละภาษา/runtime กันโดยสิ้นเชิง)
