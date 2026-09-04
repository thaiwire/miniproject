import { getAccessToken, clearTokens } from "./auth-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getAccessToken(); // null ถ้ายังไม่ login หรือ token หมดอายุแล้วถูกลบไปแล้ว
  const isFormData = options?.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      // FormData (เช่น อัปโหลดไฟล์) ต้องให้ browser ตั้ง Content-Type เอง (multipart/form-data พร้อม boundary)
      // ถ้าเราตั้ง "application/json" ทับไป backend จะ parse multipart body ไม่ออก
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  // token หมดอายุ/ไม่ถูกต้อง -> เคลียร์ทิ้งแล้วบังคับ login ใหม่ทันที (ไม่ทำ silent refresh retry เพื่อความง่าย)
  if (res.status === 401) {
    clearTokens();
    // apiFetch เป็นฟังก์ชันธรรมดา ไม่ใช่ component จึงเรียก useRouter() ไม่ได้ -> ใช้ full page navigation แทน
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
    throw new ApiError("กรุณาเข้าสู่ระบบใหม่", 401);
  }

  // backend ตอบ error (400, 404, ฯลฯ) -> throw พร้อมข้อความจาก backend
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(
      errorBody?.message?.toString() ?? `Request failed: ${res.status}`,
      res.status,
      errorBody,
    );
  }

  // DELETE ตอบ 204 No Content -> ไม่มี body ให้ parse
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
