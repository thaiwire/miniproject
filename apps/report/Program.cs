using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Report.Services;

// ต้องโหลด .env ก่อน CreateBuilder เสมอ เพราะ environment variable เป็น config source ที่ ASP.NET Core อ่านอัตโนมัติอยู่แล้ว
// ใช้ .env แทน appsettings.json เพื่อให้สอดคล้องกับ apps/api และ apps/web ที่ใช้ .env ทั้งคู่
DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// เรียก GET /products ของ apps/api ผ่าน HttpClient แทนการต่อฐานข้อมูลตรง ๆ (ดู ProductClient.cs)
var nestjsApiUrl = builder.Configuration["NESTJS_API_BASE_URL"] ?? "http://localhost:3000";
builder.Services.AddHttpClient<IProductClient, ProductClient>(client =>
{
    client.BaseAddress = new Uri(nestjsApiUrl);
});
builder.Services.AddScoped<IProductsReportService, ProductsReportService>();

// validate JWT ใบเดียวกับที่ apps/api ออกให้ (JWT_SECRET ต้องตรงกันทั้งสองฝั่ง)
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
            // apps/api ไม่ได้ set issuer/audience claim ตอนออก token -> ฝั่งนี้ก็ไม่ validate สองค่านี้ (ให้ตรงกัน)
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateLifetime = true,
        };
    });
builder.Services.AddAuthorization();

// เปิดให้ apps/web (คนละ origin/port) เรียกเข้ามาได้ เหมือนที่ apps/api ทำไว้ใน main.ts
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:3001").AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/reports/products", async (HttpContext ctx, IProductsReportService reportService, int? minId, int? maxId) =>
{
    if (minId.HasValue && maxId.HasValue && minId > maxId)
    {
        return Results.BadRequest(new { message = "minId ต้องไม่มากกว่า maxId" });
    }

    // ดึง token เดิมจาก request มาส่งต่อให้ apps/api ตอนเรียก GET /products
    // (ใช้ identity เดียวกับผู้ใช้จริง ไม่ต้องมี service-account credential แยก)
    var token = ctx.Request.Headers.Authorization.ToString().Replace("Bearer ", "");
    var pdfBytes = await reportService.GeneratePdfAsync(token, minId, maxId);
    return Results.File(pdfBytes, "application/pdf", "products-report.pdf");
})
.RequireAuthorization();

app.Run();
