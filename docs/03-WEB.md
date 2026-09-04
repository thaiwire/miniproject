# คู่มือ Frontend — `apps/web` (Next.js)

เอกสารนี้พาไล่อ่านโค้ดฝั่งเว็บ ตามลำดับที่ผู้ใช้จะเจอจริง ตั้งแต่หน้า login ไปจนถึงหน้ารายการสินค้าที่มี sidebar/topbar ครบ

ควรอ่าน [00-OVERVIEW.md](./00-OVERVIEW.md), [01-MAIN-PROJECT.md](./01-MAIN-PROJECT.md) และ [02-API.md](./02-API.md) ก่อน โดยเฉพาะ [02-API.md Step 11 (Auth/RBAC)](./02-API.md#step-11-authrbac) เพราะฝั่งนี้ต้องเชื่อม JWT token เข้ากับ backend ที่อธิบายไว้แล้ว

---

## Step 0: Next.js App Router คืออะไร (สรุปสั้น ๆ สำหรับมือใหม่)

โปรเจกต์นี้ใช้ Next.js แบบ **App Router** (โฟลเดอร์ `src/app/`) กติกาสำคัญที่ต่างจาก React ทั่วไปคือ:

1. **Routing มาจากชื่อโฟลเดอร์ ไม่ใช่การตั้ง config** — โฟลเดอร์ `app/products/new/` จะกลายเป็น URL `/products/new` โดยอัตโนมัติ ไฟล์ที่ชื่อ `page.tsx` ในโฟลเดอร์นั้นคือเนื้อหาของหน้านั้น
2. **โฟลเดอร์ที่ชื่อมีวงเล็บ เช่น `(authenticated)/` คือ "route group"** — ไม่กระทบ URL เลย (ไม่ใช่ `/authenticated/products`) มีไว้แค่จัดกลุ่มหน้าที่ต้องใช้ layout เดียวกัน (ดู Step 4)
3. **Component มี 2 ประเภท**: **Server Component** (default) รันบนเซิร์ฟเวอร์เท่านั้น ไม่มี state/event handler ได้ กับ **Client Component** (ต้องมี `"use client"` บรรทัดแรกของไฟล์) รันในเบราว์เซอร์ ใช้ `useState`, `onClick` ฯลฯ ได้
4. Server Component ดีตรงที่ยิง fetch ข้อมูลได้ตรง ๆ แบบ `async/await` โดยไม่ต้องใช้ `useEffect` — แต่ในแอปนี้ **หน้าที่ต้อง login ก่อนแทบทั้งหมดกลายเป็น Client Component** ด้วยเหตุผลเรื่อง token storage (อธิบายละเอียดใน Step 3)

## Step 1: ติดตั้ง Tailwind CSS + shadcn/ui

หน้าตาทั้งแอป (sidebar สีเข้ม, การ์ดขาวมีเงา, ปุ่ม/input ที่ดีไซน์สม่ำเสมอ) มาจาก **Tailwind CSS v4** ผสมกับ **shadcn/ui** — คนละอย่างกัน แต่ทำงานร่วมกัน:

- **Tailwind** — เขียน style ผ่าน className ตรง ๆ ในโค้ด (เช่น `className="flex gap-2 rounded-lg bg-blue-600"`) แทนการเขียนไฟล์ `.css` แยก
- **shadcn/ui** — ไม่ใช่ library ที่ `npm install` แล้วจบเหมือน library ทั่วไป แต่เป็นเครื่องมือที่ "copy" โค้ด component (Button, Input, Card, ...) มาไว้ในโปรเจกต์เราตรง ๆ ที่ [src/components/ui/](../apps/web/src/components/ui/) ทำให้แก้ style ของ component เหล่านี้ได้อิสระเต็มที่ (ไม่ใช่ config จากภายนอกที่แก้ไม่ได้)

### 1.1 ไฟล์ config ที่เกี่ยวข้อง

- [postcss.config.mjs](../apps/web/postcss.config.mjs) — บอก build tool ให้ประมวลผล Tailwind
- [components.json](../apps/web/components.json) — shadcn ใช้ไฟล์นี้จำ path/style ที่เลือกไว้ตอน setup
- [src/lib/utils.ts](../apps/web/src/lib/utils.ts) — export ฟังก์ชัน `cn()` ที่ shadcn component แทบทุกตัวใช้รวม className หลายอันเข้าด้วยกันแบบฉลาด (จัดการ className ที่ซ้ำ/ขัดแย้งกันให้) — ไฟล์นี้อยู่ใน `lib/` เพราะเป็นของกลางที่ทุก module ใช้ร่วมกันจริง ๆ ไม่ผูกกับ feature ไหนโดยเฉพาะ (ดูกติกาแบ่ง `modules/` vs `lib/` เต็ม ๆ ใน [00-OVERVIEW.md](./00-OVERVIEW.md#21-ทำไม-appswebsrc-ถึงมีทั้ง-modules-และ-componentslib))
- [src/app/globals.css](../apps/web/src/app/globals.css) — จุดเดียวที่ import Tailwind (`@import "tailwindcss";`) และประกาศ **สี** ของทั้งระบบผ่าน CSS variable (`--primary`, `--card`, `--destructive`, ...) แทนที่จะเขียนเลขสีกระจายอยู่ทั่วโค้ด

ตัวอย่างจาก `globals.css` — ปรับสี primary ให้เป็นน้ำเงินแทนสี default (เกือบดำ) ที่ shadcn สร้างให้:

```css
:root {
  --primary: oklch(0.546 0.215 262.88); /* blue-600 (#2563eb) */
  --primary-foreground: oklch(0.985 0 0);
  /* ... */
}
```

**ทำไมต้องแก้ตรงนี้ที่เดียว**: component ที่ใช้ `bg-primary` (เช่น ปุ่ม submit ทุกปุ่มในแอป) จะเปลี่ยนสีตามทันทีโดยไม่ต้องไปไล่แก้ทีละไฟล์ — นี่คือประโยชน์ของ **design token** (ตัวแปรสีกลาง) แทนการ hardcode สี

### 1.2 shadcn component ที่ใช้ในโปรเจกต์นี้

อยู่ที่ [src/components/ui/](../apps/web/src/components/ui/): `button.tsx`, `input.tsx`, `label.tsx`, `card.tsx`, `dropdown-menu.tsx`, `avatar.tsx` — component เหล่านี้เขียนเสร็จแล้ว **ไม่ต้องแก้** ปกติ (ใช้งานผ่าน import ตรง ๆ) ยกเว้นจะปรับดีไซน์เฉพาะจุด

> **มือใหม่ต้องรู้**: ปกติแอปที่ใช้ shadcn จะสร้าง component ผ่านคำสั่ง `npx shadcn@latest add <ชื่อ>` (เช่น `npx shadcn@latest add button`) ไม่ใช่เขียนเองตั้งแต่ศูนย์ — ถ้าต้องการ component เพิ่ม (เช่น `dialog`, `select`) ให้รันคำสั่งนี้แทนการเขียนเอง

## Step 2: Root Layout — [src/app/layout.tsx](../apps/web/src/app/layout.tsx)

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "Mini Product App",
  description: "ตัวอย่าง Next.js + NestJS + TypeScript",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={cn("font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
```

- นี่คือ "โครงกระดาษ" ที่ครอบ**ทุกหน้า**ในเว็บ ไม่ว่าจะเป็น `/login` หรือ `/products` — `{children}` คือเนื้อหาของแต่ละหน้าที่จะถูกเสียบเข้ามา
- **จงใจให้ไฟล์นี้เรียบง่ายที่สุด** — ไม่มี sidebar, ไม่มี auth logic ใด ๆ อยู่ที่นี่เลย เพราะหน้า `/login`/`/register` **ไม่ควรมี sidebar** ส่วนหน้าที่ต้องมี sidebar ถูกแยกไปจัดการที่ route group ต่างหาก (ดู Step 4) — เป็นการแบ่งความรับผิดชอบ (separation of concerns) ให้ชัดเจนตั้งแต่ชั้นบนสุด
- **`Geist({...})`** — โหลด font จาก Google Fonts ผ่านกลไกของ Next.js (จะ optimize/cache ให้อัตโนมัติ) แล้วผูกเข้ากับตัวแปร CSS `--font-sans` ที่ Tailwind อ่านต่อ

## Step 3: เก็บ JWT Token ไว้ที่ไหน — [src/lib/auth-storage.ts](../apps/web/src/lib/auth-storage.ts)

นี่คือการตัดสินใจสำคัญที่สุดของฝั่งเว็บ เพราะกระทบโครงสร้างทั้งแอป

```typescript
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export function setTokens(tokens: AuthTokens): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// decode payload ของ JWT ตรง ๆ แบบ base64url (ไม่ verify signature ฝั่ง client)
// ใช้แค่โชว์ email/role ใน UI เท่านั้น -> การตรวจสอบสิทธิ์จริงเกิดที่ backend เสมอ
export function getCurrentUser(): DecodedUser | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payloadBase64 = token.split(".")[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return { email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}
```

### ทำไมเลือก `localStorage` แทน httpOnly cookie

โปรเจกต์นี้เรียก API แบบ **client-side fetch ตรงไปยัง NestJS** ทุกจุด (`localhost:3001` → `localhost:3000` คนละ origin) ถ้าเก็บ token เป็น httpOnly cookie จะมีปัญหา: **JavaScript อ่าน httpOnly cookie ไม่ได้เลยตามนิยาม** (นั่นคือจุดประสงค์ของ httpOnly — กัน XSS ขโมย cookie) ทำให้ Client Component ที่ต้องแนบ token เข้า header เองไม่สามารถอ่านค่ามาใช้ได้ ต้องเพิ่ม "proxy layer" (Next.js Route Handler คั่นกลาง) ซึ่งเพิ่มความซับซ้อนเกินความจำเป็นสำหรับโปรเจกต์สอนนี้

การใช้ `localStorage` ทำให้ทุกจุดที่ยิง API (ผ่าน `apiFetch` ดู Step 5) อ่าน token แบบเดียวกันได้หมด **แลกมาด้วย**: หน้าที่เคยเป็น Server Component ที่ `await getProducts()` ตรง ๆ (แบบเดิมของโปรเจกต์นี้) ต้อง**เปลี่ยนเป็น Client Component** ทั้งหมด เพราะ Server Component รันบน Node.js ไม่มี `window`/`localStorage` ให้อ่าน (ดูผลกระทบเต็ม ๆ ใน Step 6)

- **`typeof window === "undefined"` guard ทุกฟังก์ชัน** — กันพังตอนโค้ดถูกเรียกจากบริบทที่ไม่มี browser (เช่นตอน Next.js render หน้าแรกฝั่ง server ก่อนส่งมาให้ browser)
- **`getCurrentUser()`** — JWT ทุกใบ (ไม่ว่าใครออกก็ตาม) **decode payload ได้อิสระโดยไม่ต้องมี secret** เพราะ signature (ส่วนที่ยืนยันความถูกต้อง) แยกจาก payload (ข้อมูล) ต่างหาก โค้ดนี้แค่ `atob()` (built-in ของ browser แปลง base64 → string) ตัดตอน "payload" ออกมาอ่านตรง ๆ **ห้ามเอาค่านี้ไปใช้ตัดสินใจเรื่องสิทธิ์ฝั่ง client** (เช่น ซ่อนปุ่มตาม role) เพราะปลอมได้ง่าย — ใช้แค่โชว์ email ใน UI เท่านั้น การตรวจสอบจริงเกิดที่ backend ผ่าน `JwtAuthGuard`/`RolesGuard` เสมอ

## Step 4: Route Group แยกหน้าที่ต้อง Login vs ไม่ต้อง — [src/app/(authenticated)/layout.tsx](../apps/web/src/app/(authenticated)/layout.tsx)

โครงสร้างโฟลเดอร์ปัจจุบัน:

```
src/app/
├── layout.tsx              ← root layout (Step 2) ครอบทุกหน้า
├── page.tsx                ← "/" redirect ไป /products
├── login/page.tsx          ← ไม่ต้อง login, ไม่มี sidebar (render <LoginForm /> จาก modules/auth)
├── register/page.tsx       ← ไม่ต้อง login, ไม่มี sidebar (render <RegisterForm /> จาก modules/auth)
└── (authenticated)/        ← route group: ไม่กระทบ URL แต่แชร์ layout เดียวกัน
    ├── layout.tsx           ← เช็ค token + sidebar + topbar (ไฟล์นี้)
    ├── products/page.tsx    ← "/products" (render <ProductList /> จาก modules/products)
    ├── products/new/page.tsx← "/products/new" (render <ProductForm /> จาก modules/products)
    └── profile/page.tsx     ← "/profile" (render <ProfileForm /> จาก modules/profile)
```

**หมายเหตุ**: `app/` มีหน้าที่แค่ "ประกาศ route" เท่านั้น component ที่มี logic จริงทั้งหมดย้ายไปอยู่ใน `src/modules/<ชื่อ feature>/components/` แล้ว (ดู Step 6.2 และ [00-OVERVIEW.md](./00-OVERVIEW.md#21-ทำไม-appswebsrc-ถึงมีทั้ง-modules-และ-componentslib) สำหรับกติกาการจัดโครงสร้างแบบ module-based)

```tsx
"use client";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // เริ่มด้วย false เสมอ (ตรงกับ server ที่ไม่มี localStorage ให้อ่าน) กันปัญหา hydration mismatch
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setHasToken(true);
  }, [router]);

  if (!hasToken) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 bg-gray-100 p-8">{children}</main>
      </div>
    </div>
  );
}
```

### 4.1 ทำไมต้องเป็น route group

`(products)`, `(authenticated)` ที่มีวงเล็บคือชื่อโฟลเดอร์พิเศษของ Next.js — **ไม่ปรากฏใน URL** หน้า `products/page.tsx` ที่อยู่ใต้ `(authenticated)/` จึงยังคงเป็น URL `/products` เหมือนเดิมเป๊ะ ๆ ประโยชน์คือทุกหน้าใต้ folder นี้ **แชร์ layout เดียวกันโดยอัตโนมัติ** (มี sidebar/topbar/auth guard ให้ฟรี) โดยไม่ต้องเขียนโค้ดเช็คซ้ำในทุกหน้า และหน้า `/login`/`/register` ที่อยู่ **นอก** route group นี้ก็ไม่ได้รับ sidebar ไปด้วยความสม่ำเสมอ

### 4.2 กลไก Auth Guard — ทำไมต้องซับซ้อนขนาดนี้

จุดที่มือใหม่งงบ่อยที่สุด: ทำไมไม่เขียนแค่ `if (!getAccessToken()) return null;` ตรง ๆ ในบรรทัดแรกของ component เลย?

**คำตอบ: จะเกิด hydration mismatch** — Next.js render หน้าเว็บ **สองรอบ**: รอบแรกบนเซิร์ฟเวอร์ (สร้าง HTML ส่งมาให้ก่อน) แล้วรอบสองบน browser (เพื่อผูก event handler ต่าง ๆ เรียกว่า "hydrate") ถ้าอ่าน `localStorage` ตรง ๆ ตอน render:
- รอบที่ 1 (server) → ไม่มี `window` → `getAccessToken()` คืน `null` เสมอ → render `null`
- รอบที่ 2 (client, มี token จริงอยู่) → `getAccessToken()` คืน token จริง → render sidebar เต็มรูปแบบ

React เจอ HTML ที่ไม่ตรงกันระหว่างสองรอบนี้ แล้ว throw error "Hydration failed" ทันที วิธีแก้คือ:
1. **`useState(false)` เริ่มต้นเป็น `false` เสมอ** — รับประกันว่า render รอบแรก (ทั้ง server และ client ตอน hydrate) ได้ผลลัพธ์เดียวกัน (คือ `null`) เสมอ ไม่มี mismatch
2. **เช็ค token จริงใน `useEffect`** — effect รันหลัง hydrate เสร็จแล้วเท่านั้น (รันเฉพาะฝั่ง client) จึงปลอดภัยที่จะอ่าน `localStorage` ตรงนี้ แล้วค่อย `setHasToken(true)` เพื่อ render เนื้อหาจริงในรอบถัดไป

## Step 5: การเรียก API จากฝั่งเว็บ — [src/lib/api.ts](../apps/web/src/lib/api.ts)

ไฟล์นี้เป็น "ตัวกลาง" ทุกการเรียก API ต้องผ่านฟังก์ชันนี้ ไม่มีที่ไหนใน component ที่เรียก `fetch` ตรง ๆ

```typescript
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken(); // null ถ้ายังไม่ login หรือ token หมดอายุแล้วถูกลบไปแล้ว

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  // token หมดอายุ/ไม่ถูกต้อง -> เคลียร์ทิ้งแล้วบังคับ login ใหม่ทันที (ไม่ทำ silent refresh retry เพื่อความง่าย)
  if (res.status === 401) {
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("กรุณาเข้าสู่ระบบใหม่", 401);
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(
      errorBody?.message?.toString() ?? `Request failed: ${res.status}`,
      res.status,
      errorBody,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
```

จุดสำคัญที่เพิ่มมาจากเดิม:

- **แนบ `Authorization: Bearer <token>` อัตโนมัติทุก request** — component ที่เรียก `apiFetch` (เช่น `getProducts()`) ไม่ต้องรู้เรื่อง token เลย ฟังก์ชันนี้จัดการให้เบ็ดเสร็จที่จุดเดียว ถ้าวันหน้าต้องเปลี่ยนวิธีแนบ token ก็แก้ที่นี่ที่เดียวพอ
- **เช็ค `res.status === 401` ก่อนเช็ค `res.ok` ทั่วไป** — 401 หมายถึง "token ใช้ไม่ได้แล้ว" (หมดอายุ หรือไม่มี token) ซึ่งควร**บังคับ login ใหม่ทันที** ต่างจาก error ทั่วไป (400, 404) ที่แค่โชว์ message ให้ user เห็นในฟอร์มพอ
- **`window.location.href = "/login"` ไม่ใช่ `router.push`** — เพราะ `apiFetch` เป็นฟังก์ชันธรรมดา ไม่ใช่ React component จึงเรียก hook อย่าง `useRouter()` ไม่ได้ ต้องใช้ browser API ตรง ๆ แทน (แลกกับการ reload หน้าทั้งหน้า ซึ่งยอมรับได้เพราะกรณีนี้คือ "session หมดอายุ" อยู่แล้ว)

## Step 6: หน้ารายการสินค้า (Client Component แบบ Fetch-on-mount) — [src/modules/products/components/ProductList.tsx](../apps/web/src/modules/products/components/ProductList.tsx)

```tsx
"use client";

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getProducts();
      setProducts(result.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
      {/* ... */}
      <DeleteProductButton productId={product.id} onDeleted={fetchProducts} />
    </div>
  );
}
```

### 6.1 ทำไมไม่ใช้ Server Component แบบเดิม

โปรเจกต์นี้เคยมี `products/page.tsx` เป็น **Server Component** ที่ `await getProducts()` ตรง ๆ ตอน request time (ไม่ต้อง `useEffect`) — เป็นวิธีที่ดีกว่าในหลาย ๆ ทาง แต่**ใช้ไม่ได้อีกต่อไป** เพราะเหตุผลเดียวกับ Step 3: token อยู่ใน `localStorage` ซึ่ง Server Component (รันบน Node.js) อ่านไม่ได้ ถ้ายังใช้ Server Component ต่อ จะไม่มีทางแนบ `Authorization` header ตอนเรียก `GET /products` ได้เลย แล้วจะโดน backend ตอบ 401 ทันที (ดู [02-API.md](./02-API.md) เรื่อง `JwtAuthGuard`)

ทางแก้คือย้าย logic การ fetch ทั้งหมดมาไว้ใน **Client Component** ที่ fetch ข้อมูล**หลัง mount** ผ่าน `useEffect` แทน — เสียความเร็วไปเล็กน้อย (ต้อง render หน้าเปล่าก่อนแล้วค่อยเห็นข้อมูล ไม่ใช่มีข้อมูลมาพร้อม HTML ตั้งแต่แรก) แลกกับการที่ทุก fetch call เรียกผ่าน `apiFetch` เดียวกันได้ ไม่ต้องมี logic แยกสำหรับ Server กับ Client

### 6.2 ทำไม `page.tsx` แยกจาก `ProductList.tsx`

```tsx
// app/(authenticated)/products/page.tsx
export default function ProductsPage() {
  return <ProductList />;
}
```

`page.tsx` เป็น Server Component เปล่า ๆ ที่ทำหน้าที่แค่ "ประกาศ route" ส่วน logic จริงทั้งหมดอยู่ใน `ProductList.tsx` (Client Component) — เป็น pattern เดียวกับที่ `products/new/page.tsx` render `<ProductForm />` มาตั้งแต่แรก คือแยก "หน้าตา/routing" ออกจาก "logic ที่ต้อง interactive" เสมอ

### 6.3 `fetchProducts` กับ `onDeleted` — ปัญหาที่ `router.refresh()` เดิมแก้ไม่ได้อีกแล้ว

ของเดิมตอน `products/page.tsx` ยังเป็น Server Component, `DeleteProductButton` เรียก `router.refresh()` หลังลบสำเร็จ ซึ่งสั่งให้ Server Component ข้างบน fetch ข้อมูลใหม่ — **แต่ตอนนี้ไม่มี Server Component ที่ fetch อะไรอีกแล้ว** `router.refresh()` จึงไม่มีผลอะไรเลย

ทางแก้: ส่งฟังก์ชัน `fetchProducts` (ที่มาจาก `ProductList`) ลงไปเป็น prop ชื่อ `onDeleted` ให้ `DeleteProductButton` เรียกกลับขึ้นมาแทน — เป็น pattern พื้นฐานของ React ที่เรียกว่า **"lifting state up"**: component ลูก (`DeleteProductButton`) ไม่ต้องรู้ว่า parent จะ refresh ข้อมูลยังไง แค่เรียก callback ที่ parent ส่งมาให้พอ

## Step 7: ปุ่มลบสินค้า — [src/modules/products/components/DeleteProductButton.tsx](../apps/web/src/modules/products/components/DeleteProductButton.tsx)

```tsx
"use client";

interface DeleteProductButtonProps {
  productId: number;
  onDeleted: () => void;
}

export default function DeleteProductButton({ productId, onDeleted }: DeleteProductButtonProps) {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  async function handleDelete() {
    if (!confirm("ยืนยันการลบสินค้านี้หรือไม่?")) return;

    setIsDeleting(true);
    try {
      await deleteProduct(productId);
      onDeleted();
    } catch (error) {
      alert(error instanceof Error ? error.message : "ลบไม่สำเร็จ");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
      {isDeleting ? "กำลังลบ..." : "ลบ"}
    </Button>
  );
}
```

- **`Button variant="destructive"`** — shadcn `Button` component รองรับหลาย variant (`default`, `outline`, `destructive`, `ghost`, ...) ผ่าน prop เดียว ไม่ต้องเขียน className สีแดงเอง — `destructive` คือ convention สำหรับปุ่มที่ทำ action อันตราย/ย้อนกลับไม่ได้ (ลบข้อมูล)
- **`useState<boolean>(false)` (`isDeleting`)** — ใช้ปิดปุ่มระหว่างรอ API ตอบกลับ (ป้องกันกดซ้ำ) และเปลี่ยนข้อความปุ่มเป็น "กำลังลบ..." ให้ผู้ใช้รู้ว่าระบบกำลังทำงาน
- **`onDeleted()`** — ดูรายละเอียดที่ Step 6.3

## Step 8: หน้า Login — [src/app/login/page.tsx](../apps/web/src/app/login/page.tsx) + [src/modules/auth/components/LoginForm.tsx](../apps/web/src/modules/auth/components/LoginForm.tsx)

```tsx
// app/login/page.tsx
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <LoginForm />
    </main>
  );
}
```

หน้านี้อยู่ **นอก** `(authenticated)/` จึงไม่มี sidebar — จัดกลางจอเต็มหน้าจอตามภาพตัวอย่าง theme ที่ผู้ใช้ต้องการ

### 8.1 `LoginForm.tsx` — โครงสร้างเดียวกับ `ProductForm` เดิม แต่เพิ่ม auth

```typescript
const loginSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

async function onSubmit(data: LoginFormValues) {
  setServerError(null);
  try {
    const tokens = await login(data);
    setTokens(tokens);
    router.push("/products");
  } catch (error) {
    setServerError(error instanceof ApiError ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
  }
}
```

- ใช้ react-hook-form + zod แบบเดียวกับ `ProductForm` ทุกประการ (ดู [Step 12](#step-12-ฟอร์มเพิ่มสินค้า--srccomponentsproductformtsx) เรื่อง `z.infer`) — โปรเจกต์นี้ยึด pattern เดียวสำหรับทุกฟอร์มเพื่อให้คาดเดาได้ ไม่ต้องเรียนรู้วิธีใหม่ทุกครั้งที่เจอฟอร์มใหม่
- **`login(data)`** — เรียกจาก [src/modules/auth/auth-api.ts](../apps/web/src/modules/auth/auth-api.ts) ไปที่ `POST /auth/login` (endpoint `@Public()` ไม่ต้องมี token) ได้ `AuthTokens` กลับมา (`accessToken` + `refreshToken`)
- **`setTokens(tokens)`** — บันทึกลง `localStorage` (ดู Step 3) แล้ว **`router.push("/products")`** — ทันทีที่ไปถึงหน้านั้น `AuthenticatedLayout` (Step 4) จะเช็คเจอ token แล้วปล่อยให้เข้าได้

### 8.2 ปุ่มดู/ซ่อนรหัสผ่าน — [src/components/ui/password-input.tsx](../apps/web/src/components/ui/password-input.tsx)

```tsx
const PasswordInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input type={isVisible ? "text" : "password"} className={cn("pr-9", className)} ref={ref} {...props} />
        <button
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
          tabIndex={-1}
          aria-label={isVisible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        >
          {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);
```

- **`React.forwardRef`** — จำเป็นเพราะ react-hook-form's `register("password")` ต้องการ `ref` ตรงไปที่ `<input>` จริง ๆ (เพื่อจัดการ focus, validation ฯลฯ) การห่อ `Input` ไว้อีกชั้นด้วย `PasswordInput` โดยไม่ forward ref จะทำให้ react-hook-form ผูก ref ผิดจุด (ไปติดที่ `<div>` ครอบแทน)
- **`type={isVisible ? "text" : "password"}`** — สลับ HTML attribute `type` ไปมา คือกลไกทั้งหมดของฟีเจอร์นี้ ตัวเบราว์เซอร์เองเป็นคนซ่อน/โชว์ตัวอักษรตาม `type` อยู่แล้ว โค้ดแค่สลับค่านี้
- **`tabIndex={-1}` บนปุ่ม** — กันไม่ให้กด Tab แล้วโฟกัสมาที่ปุ่มนี้ (ซึ่งจะรบกวนลำดับการกรอกฟอร์มปกติ: email → password → submit) ปุ่มนี้กดด้วยเมาส์/แตะเท่านั้น
- ใช้ `<PasswordInput>` แทน `<Input type="password">` เดิมในทั้ง 3 ที่: `LoginForm`, `RegisterForm`, `ProfileForm`

## Step 9: หน้าสมัครสมาชิก — [src/app/register/page.tsx](../apps/web/src/app/register/page.tsx) + [src/modules/auth/components/RegisterForm.tsx](../apps/web/src/modules/auth/components/RegisterForm.tsx)

```typescript
async function onSubmit(data: RegisterFormValues) {
  setServerError(null);
  try {
    await registerUser(data);
    // /auth/register ตอบกลับเป็นข้อมูล user ไม่ใช่ token -> ต้องให้ผู้ใช้ login เองอีกครั้ง
    setIsDone(true);
    setTimeout(() => router.push("/login"), 1500);
  } catch (error) {
    setServerError(error instanceof ApiError ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
  }
}
```

จุดที่ต่างจาก login ชัดเจน:

- **`POST /auth/register` ไม่คืน token** (คืนแค่ข้อมูล `User`) เพราะ backend ออกแบบให้แยกขั้นตอน "สมัคร" กับ "เข้าสู่ระบบ" — สอดคล้องกับที่ [02-API.md Step 11.7](./02-API.md#117-authcontroller--srcauthauthcontrollerts) อธิบายไว้ว่า `RegisterDto` ไม่มี field `role` เลย (backend บังคับเป็น `STAFF` เสมอ กัน privilege escalation) การแยก endpoint ยังทำให้ backend เขียน logic แยกกันชัดเจนระหว่าง "สร้าง user ใหม่" กับ "ออก JWT ให้"
- **`setIsDone(true)` + `setTimeout(..., 1500)`** — โชว์ข้อความ "สมัครสมาชิกสำเร็จ" ค้างไว้ 1.5 วินาทีก่อน redirect ไป `/login` ให้ผู้ใช้เห็นผลลัพธ์ชัดเจนก่อนเปลี่ยนหน้า (ถ้า redirect ทันทีจะรู้สึกเหมือนไม่มีอะไรเกิดขึ้น)
- ใน JSX มีเงื่อนไข `{isDone ? <p>...</p> : <form>...</form>}` สลับระหว่างข้อความสำเร็จกับฟอร์ม แทนการโชว์ทั้งสองอย่างพร้อมกัน

## Step 10: Sidebar, Topbar และเมนูผู้ใช้

โครงสร้าง layout ของหน้าที่ login แล้ว (จาก `AuthenticatedLayout` ใน Step 4):

```
┌─────────────┬─────────────────────────────┐
│             │  Topbar (ขาว, ชิดขวา = UserMenu) │
│  Sidebar    ├─────────────────────────────┤
│  (เข้ม)      │                             │
│             │  {children} (เนื้อหาแต่ละหน้า)   │
│             │                             │
└─────────────┴─────────────────────────────┘
```

### 10.1 Sidebar — [src/components/layout/Sidebar.tsx](../apps/web/src/components/layout/Sidebar.tsx)

```tsx
"use client";

const NAV_ITEMS = [
  { href: "/products", label: "รายการสินค้า" },
  { href: "/products/new", label: "+ เพิ่มสินค้า" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-slate-900 p-4">
      <div className="px-2 py-3 text-lg font-bold text-white">Mini Product App</div>
      <nav className="mt-4 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- **`usePathname()`** — hook ของ Next.js คืน URL path ปัจจุบัน (เช่น `/products`) ใช้เทียบกับ `item.href` เพื่อรู้ว่าเมนูไหน "active" อยู่ (ทำให้ต้องเป็น Client Component เพราะ hook ตัวนี้ใช้ได้เฉพาะฝั่ง client)
- **`cn(...)`** จาก `@/lib/utils` — เลือก className ตามเงื่อนไข `isActive` แบบอ่านง่าย (สีน้ำเงินตอน active, เทาตอนไม่ active)

### 10.2 Topbar — [src/components/layout/Topbar.tsx](../apps/web/src/components/layout/Topbar.tsx)

```tsx
export default function Topbar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-border bg-white px-6">
      <UserMenu variant="light" />
    </header>
  );
}
```

component สั้นมาก เพราะหน้าที่หลักคือเป็น "กรอบ" ที่จัดตำแหน่ง `UserMenu` ไว้ชิดขวา (`justify-end`) — พื้นหลังขาวมีเส้นขอบล่างบาง ๆ (`border-b`) แยกจาก sidebar สีเข้มด้านซ้ายให้ชัดเจน

### 10.3 เมนูผู้ใช้แบบ Dropdown — [src/components/layout/UserMenu.tsx](../apps/web/src/components/layout/UserMenu.tsx)

```tsx
interface UserMenuProps {
  variant?: "light" | "dark";
}

export default function UserMenu({ variant = "light" }: UserMenuProps) {
  const router = useRouter();
  const user = getCurrentUser();

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(/* สีตาม variant */)}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
          {user?.email?.[0]?.toUpperCase() ?? "?"}
        </span>
        <span className="truncate">{user?.email ?? "ผู้ใช้งาน"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>แก้ไขโปรไฟล์</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>ออกจากระบบ</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- **`prop variant`** — component นี้ถูกออกแบบให้ใช้ซ้ำได้ทั้งบนพื้นขาว (topbar, `variant="light"`) และพื้นเข้ม (ถ้าย้ายกลับไปไว้ใน sidebar ในอนาคต, `variant="dark"`) โดยไม่ต้องเขียน component แยกสองตัว — เปลี่ยนแค่ className ของ trigger ตาม prop
- **`user?.email?.[0]?.toUpperCase()`** — เอาตัวอักษรแรกของ email มาทำ avatar วงกลมแบบง่าย ๆ (ไม่ต้องมีระบบอัปโหลดรูปโปรไฟล์จริง) ใช้ optional chaining (`?.`) เผื่อกรณี `getCurrentUser()` คืน `null` (เช่น token เสียหรือ decode ไม่ได้)
- **`DropdownMenuGroup` ครอบ `DropdownMenuLabel`** — เป็น requirement เฉพาะของ shadcn เวอร์ชันที่ใช้ในโปรเจกต์นี้ (สร้างจาก [Base UI](https://base-ui.com/) ไม่ใช่ Radix UI ที่ตัวอย่าง shadcn ส่วนใหญ่บนอินเทอร์เน็ตใช้) — ถ้าใช้ `DropdownMenuLabel` เดี่ยว ๆ โดยไม่มี `DropdownMenuGroup` ครอบจะ error ตอน runtime ทันที (มือใหม่เจอปัญหานี้บ่อยเวลา copy โค้ดตัวอย่างจากเว็บอื่นมาใช้ตรง ๆ)
- **"แก้ไขโปรไฟล์" และ "ออกจากระบบ"** — สองปุ่มนี้เป็นทางเข้าเดียวของฟีเจอร์ profile และ logout ในทั้งแอป

## Step 11: หน้าแก้ไขโปรไฟล์ — [src/app/(authenticated)/profile/page.tsx](../apps/web/src/app/(authenticated)/profile/page.tsx) + [src/modules/profile/components/ProfileForm.tsx](../apps/web/src/modules/profile/components/ProfileForm.tsx)

```typescript
const profileSchema = z.object({
  name: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  password: z.union([z.literal(""), z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")]),
});

useEffect(() => {
  async function load() {
    try {
      const profile = await getProfile();
      setUser(profile);
      reset({ name: profile.name, password: "" });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }
  load();
}, [reset]);

async function onSubmit(data: ProfileFormValues) {
  const updated = await updateProfile({
    name: data.name,
    ...(data.password ? { password: data.password } : {}),
  });
  setUser(updated);
  reset({ name: updated.name, password: "" });
  setSuccessMessage("บันทึกข้อมูลสำเร็จ");
}
```

จุดที่ต่างจากฟอร์มอื่น ๆ ในแอป:

- **`z.union([z.literal(""), z.string().min(8, ...)])`** — กฎ validation ของ password ในหน้านี้คือ "ว่างก็ได้ (ไม่เปลี่ยนรหัสผ่าน) หรือถ้าจะกรอกต้องอย่างน้อย 8 ตัวอักษร" `z.union` รวมสองความเป็นไปได้เข้าด้วยกัน (ต่างจาก `LoginForm`/`RegisterForm` ที่ password เป็น required เสมอ)
- **ฟอร์มนี้ต้อง `useEffect` โหลดข้อมูลเดิมก่อน** (`getProfile()`) เพราะต้องรู้ชื่อปัจจุบันมาใส่ในฟอร์มให้แก้ไข ต่างจาก `RegisterForm` ที่เริ่มจากฟอร์มเปล่า
- **`...(data.password ? { password: data.password } : {})`** — spread แบบมีเงื่อนไข ถ้า `data.password` เป็น string ว่าง (falsy) จะไม่ใส่ key `password` เข้าไปใน object ที่ส่งไป backend เลย ทำให้ `UpdateProfileDto` ฝั่ง backend เห็นว่า field นี้ไม่ได้ส่งมา (`undefined`) จึงไม่แตะรหัสผ่านเดิม (ดู [02-API.md](./02-API.md) เรื่อง `UserService.updateProfile`)
- **อีเมลเป็น `<Input disabled>`** — แสดงให้เห็นแต่แก้ไม่ได้ เพราะอีเมลผูกกับการ login โดยตรง เปลี่ยนได้จะกระทบระบบ auth ทั้งหมด (โปรเจกต์นี้เลือกไม่รองรับการเปลี่ยนอีเมลเพื่อความง่าย)

## Step 12: ฟอร์มเพิ่มสินค้า — [src/modules/products/components/ProductForm.tsx](../apps/web/src/modules/products/components/ProductForm.tsx)

ไฟล์นี้เป็นต้นแบบของฟอร์มทุกฟอร์มในแอป (login/register/profile ก็เลียนแบบโครงสร้างนี้) รวม 3 concept: **zod** (schema validation), **react-hook-form** (จัดการ form state), และการเรียก API ผ่าน shadcn component

### 12.1 กำหนด schema ด้วย zod

```typescript
const productSchema = z.object({
  name: z.string().min(2, "ชื่อสินค้าต้องมีอย่างน้อย 2 ตัวอักษร"),
  price: z.coerce.number().min(0, "ราคาขายต้องไม่ติดลบ"),
  costPrice: z.coerce.number().min(0, "ต้นทุนต้องไม่ติดลบ"),
  stock: z.coerce.number().int("ต้องเป็นจำนวนเต็ม").min(0, "สต๊อกต้องไม่ติดลบ"),
});
type ProductFormInput = z.input<typeof productSchema>;
type ProductFormOutput = z.output<typeof productSchema>;
```

- **`z.object({...})`** — ประกาศกฎ validation ครั้งเดียว แล้ว TypeScript type จะถูก **infer อัตโนมัติ** จาก schema นี้ (ไม่ต้องเขียน `interface` แยกต่างหากให้ตรงกับกฎ validation เหมือนสมัยก่อน)
- **`z.coerce.number()`** — ช่วง input ของ HTML `<input type="number">` ที่ browser ส่งค่ามาจริง ๆ เป็น **string** เสมอ `z.coerce.number()` จะพยายามแปลง string นั้นเป็น number ให้ก่อนเช็ค validation
- **`z.input<...>` vs `z.output<...>`** — เพราะมี `z.coerce`, type "ก่อนแปลง" (input) กับ "หลังแปลง" (output) **ไม่เหมือนกัน** จึงต้องแยก type สองตัวนี้ให้ react-hook-form ใช้คนละจุด (สังเกตว่า `LoginForm`/`RegisterForm`/`ProfileForm` ใช้แค่ `z.infer` ตัวเดียว เพราะไม่มี `z.coerce` ในฟอร์มพวกนั้น — ทุก field เป็น string ล้วนอยู่แล้ว)

### 12.2 ผูกกับ react-hook-form และ submit

```typescript
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
} = useForm<ProductFormInput, unknown, ProductFormOutput>({
  resolver: zodResolver(productSchema),
  defaultValues: { name: "", price: 0, costPrice: 0, stock: 0 },
});

async function onSubmit(data: ProductFormOutput) {
  setServerError(null);
  try {
    await createProduct(data);
    router.push("/products"); // เพิ่มสำเร็จ -> กลับไปหน้า list
  } catch (error) {
    setServerError(error instanceof ApiError ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
  }
}
```

- **`useForm<...>`** รับ generic 3 ตัว: type ของ input ดิบ, context (ไม่ใช้ในที่นี้จึงเป็น `unknown`), type ของ output หลัง validate
- **สังเกตว่าไม่มี `router.refresh()` ต่อท้าย `router.push()` อีกแล้ว** (ต่างจากเวอร์ชันเก่าของเอกสารนี้) เพราะหน้า `/products` ไม่ใช่ Server Component แล้ว (ดู Step 6) — `ProductList` จะ fetch ข้อมูลใหม่เองตอน mount ทุกครั้งที่ navigate เข้ามาอยู่แล้ว ไม่ต้องสั่ง refresh ซ้ำ

### 12.3 ส่วน render — ใช้ shadcn component แทน HTML ดิบ

```tsx
<form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
  <div className="grid gap-1.5">
    <Label htmlFor="name">ชื่อสินค้า</Label>
    <Input id="name" {...register("name")} />
    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
  </div>
  {/* ... price, costPrice, stock เหมือนกัน ... */}

  {serverError && <p className="text-sm text-destructive">⚠ {serverError}</p>}

  <Button type="submit" disabled={isSubmitting} className="w-full h-10 font-bold">
    {isSubmitting ? "กำลังบันทึก..." : "บันทึกสินค้า"}
  </Button>
</form>
```

- **`<Label>`, `<Input>`, `<Button>`** — แทนที่ `<label>`, `<input>`, `<button>` ดิบเดิม เป็น component จาก [src/components/ui/](../apps/web/src/components/ui/) (ดู Step 1.2) ให้หน้าตาสม่ำเสมอทั่วทั้งแอปโดยอัตโนมัติ
- **`className="grid gap-5"` / `className="grid gap-1.5"`** — ใช้ CSS Grid ของ Tailwind จัดระยะห่างแนวตั้งระหว่าง field แทนการเขียน margin เอง (`gap` จัดการช่องว่างระหว่างลูกทุกตัวให้พร้อมกัน)
- **`{...register('name')}`** — spread props (`name`, `onChange`, `onBlur`, `ref`) ที่ react-hook-form ต้องใช้ผูกกับ input ตัวนี้ ทำงานได้ปกติกับ `<Input>` ของ shadcn เพราะ component นี้ forward ref ให้ (เหมือนที่ `PasswordInput` ทำใน Step 8.2)
- **`disabled={isSubmitting}`** — ปิดปุ่มระหว่างรอ backend ตอบกลับ กัน double-submit

> **ทำไมต้อง validate ทั้งสองฝั่ง (frontend ด้วย zod, backend ด้วย class-validator)?**
> Frontend validate เพื่อ **UX** — บอก user ทันทีโดยไม่ต้องรอ network round-trip
> Backend validate เพื่อ **ความปลอดภัย** — เพราะ frontend validation สามารถถูกข้ามได้ง่าย ๆ (ปิด JS, ยิง request ตรงด้วย curl/Postman) backend จึงต้องเช็คซ้ำเสมอ ห้ามเชื่อ frontend อย่างเดียว

## Step 13: ทดสอบฝั่งเว็บด้วยตัวเอง

1. เปิด `http://localhost:3001` ทั้งที่ยังไม่ login — ควรถูก redirect ไป `/login` (ผ่าน `/` → `/products` → `AuthenticatedLayout` เจอไม่มี token → เด้งไป `/login`)
2. กด "ยังไม่มีบัญชี? สมัครสมาชิก" ไปหน้า `/register` กรอกข้อมูลแล้วสมัคร — ควรเห็นข้อความสำเร็จค้าง 1.5 วินาทีแล้วเด้งไป `/login` อัตโนมัติ (Step 9)
3. Login ด้วยบัญชีที่เพิ่งสมัคร — ควรเห็นหน้า `/products` พร้อม sidebar เข้ม + topbar ขาว + เมนูมุมขวาบนโชว์อีเมลตัวเอง (Step 10)
4. ลองพิมพ์รหัสผ่านตอน login/register/profile แล้วกดไอคอนรูปตา — ตัวอักษรควรสลับซ่อน/โชว์ได้ (Step 8.2)
5. กด "+ เพิ่มสินค้า" กรอกชื่อสินค้าแค่ 1 ตัวอักษร — ควรเห็น error ทันทีโดยที่ยังไม่ยิง request (zod validate ฝั่ง client, Step 12.1) แต่ถ้า user ที่ login เป็น role `STAFF` (ไม่ใช่ `ADMIN`) การกด submit แม้ข้อมูลถูกต้องก็ควรเจอ error 403 จาก backend (ดู [02-API.md](./02-API.md) เรื่อง `@Roles(Role.ADMIN)`)
6. กด "ลบ" ที่แถวสินค้าใดก็ได้ — ยืนยัน dialog แล้วแถวนั้นควรหายไปจากตารางทันทีโดยไม่ reload หน้า (ทดสอบ `onDeleted` callback, Step 6.3/7)
7. คลิกเมนูมุมขวาบน → "แก้ไขโปรไฟล์" — ควรเห็นฟอร์มที่มีชื่อปัจจุบันกรอกไว้ให้แล้ว ลองแก้ชื่อแล้วบันทึก ควรเห็นข้อความ "บันทึกข้อมูลสำเร็จ" (Step 11)
8. คลิกเมนูมุมขวาบน → "ออกจากระบบ" — ควรเด้งกลับ `/login` แล้วถ้าลองกด back หรือพิมพ์ URL `/products` เองควรถูกเด้งกลับ `/login` อีกครั้ง (ทดสอบว่า token ถูกลบจริง)
9. ลองปิด backend (`Ctrl+C` ที่ terminal ของ `dev:api`) แล้ว login/สร้างสินค้าอีกครั้ง — ควรเห็น error message แสดงใต้ปุ่ม (ทดสอบ error handling ผ่าน `ApiError`)
10. ที่หน้า `/products` กด "ออกรายงาน PDF" (มุมขวาบนของตาราง) — ต้องรัน `npm run dev:report` ไว้ก่อน (ดู [01-MAIN-PROJECT.md](./01-MAIN-PROJECT.md) Step 3.6) ควรเห็น tab ใหม่เปิดขึ้นมาแสดงไฟล์ PDF รายชื่อสินค้า (ไม่ใช่ดาวน์โหลดไฟล์อัตโนมัติ) รายละเอียดเต็ม ๆ อยู่ใน [04-REPORT.md](./04-REPORT.md)

---

**สรุปเส้นทางข้อมูลทั้งหมด** (ครบทั้ง 4 เอกสาร): ผู้ใช้กรอกอีเมล/รหัสผ่านที่ `LoginForm` → zod validate ฝั่ง client → `login()` เรียก `apiFetch` (ไม่มี token ตอนนี้ เพราะยังไม่ login) → ยิง `POST /auth/login` → NestJS's `AuthService.validateUser()` เช็ค bcrypt hash → ออก JWT คืนมาเป็น `AuthTokens` → `setTokens()` เก็บลง `localStorage` → `router.push('/products')` → `AuthenticatedLayout` เช็คเจอ token → render `Sidebar`/`Topbar`/`ProductList` → `ProductList` เรียก `getProducts()` ผ่าน `apiFetch` ซึ่งตอนนี้แนบ `Authorization: Bearer <token>` อัตโนมัติ → ยิง `GET /products` → ผ่าน `JwtAuthGuard` (เช็ค token ถูกต้อง) → `ProductService.findAll()` ดึงข้อมูลแบบแบ่งหน้า → ตอบกลับเป็น `PaginatedResult<Product>` → หน้าเว็บ render ตาราง

ทุก type ที่ปรากฏตลอดเส้นทางนี้ (`LoginInput`, `AuthTokens`, `Product`, `PaginatedResult`) มาจาก `packages/shared-types` เดียวกันทั้งหมด — นี่คือเหตุผลที่แท้จริงว่าทำไมโปรเจกต์นี้ถึงจัดเป็น monorepo แทนที่จะแยก repo ของ web กับ api ออกจากกัน และเหตุผลที่ token storage (Step 3) กลายเป็นจุดตัดสินใจที่กระเทือนถึงโครงสร้างเกือบทุกไฟล์ในฝั่งเว็บ — เป็นตัวอย่างที่ดีว่า **การตัดสินใจสถาปัตยกรรมเล็ก ๆ จุดเดียวสามารถส่งผลกระทบเป็นวงกว้างได้** ถ้าเลือกผิดจังหวะ

---

**ต่อไป**: อ่าน [04-REPORT.md](./04-REPORT.md) เพื่อดูว่าปุ่ม "ออกรายงาน PDF" ที่หน้า `/products` เชื่อมไปเรียก report service (.NET) อย่างไร
