import type { AuthTokens } from "@mini-project/shared-types";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

interface DecodedUser {
  email: string;
  role: string;
}

// เก็บ token ใน localStorage เพราะทุก fetch ของแอปนี้ยิงจาก Client Component ตรงไปที่ NestJS
// (คนละ origin กับ Next.js) — httpOnly cookie ใช้ไม่ได้กับ pattern นี้เพราะ browser อ่านไม่ได้เอง
// ต้อง guard typeof window เสมอ เพราะไฟล์นี้อาจถูก import เข้าไปในโค้ดที่ยังรันฝั่ง server ได้

export function setTokens(tokens: AuthTokens): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// decode payload ของ JWT ตรง ๆ แบบ base64url (ไม่ verify signature ฝั่ง client)
// ใช้แค่โชว์ email/role ใน UI เท่านั้น -> การตรวจสอบสิทธิ์จริงเกิดที่ backend เสมอ ห้ามเชื่อค่านี้เพื่อ authorize อะไรฝั่ง client
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
