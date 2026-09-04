import { apiFetch } from "@/lib/api";
import type { LoginInput, RegisterInput, AuthTokens, User } from "@mini-project/shared-types";

export function login(input: LoginInput): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// สมัครสมาชิกได้ role เป็น STAFF เสมอ (ฝั่ง backend บังคับ ไม่ให้ client กำหนดเอง)
// endpoint นี้ตอบกลับเป็นข้อมูล user (ไม่ใช่ token) -> ต้อง login แยกอีกครั้งหลังสมัครสำเร็จ
export function register(input: RegisterInput): Promise<User> {
  return apiFetch<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
