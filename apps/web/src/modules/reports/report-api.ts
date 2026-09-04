import { getAccessToken } from "@/lib/auth-storage";

const REPORT_API_URL = process.env.NEXT_PUBLIC_REPORT_API_URL ?? "http://localhost:5100";

export interface ProductReportFilter {
  minId?: number;
  maxId?: number;
}

// ไม่ใช้ apiFetch เดิม (lib/api.ts) เพราะฟังก์ชันนั้นสมมติว่า response เป็น JSON เสมอ (เรียก res.json())
// แต่ endpoint นี้ตอบกลับเป็น PDF binary (blob) และอยู่คนละ origin (apps/report ไม่ใช่ apps/api)
export async function previewProductsReport(filter?: ProductReportFilter): Promise<void> {
  // เปิด tab เปล่าไว้ก่อน "ทันที" ตอนยัง sync อยู่ในมือของ user click event
  // ถ้าไปเรียก window.open() หลัง await fetch/blob แล้ว browser หลายตัวจะมองว่าไม่ใช่ user gesture อีกต่อไป
  // แล้วบล็อกเป็น popup ทันที -> เปิด tab ว่างไว้ก่อน แล้วค่อยเปลี่ยน location ทีหลังเมื่อได้ URL จริง
  const newTab = window.open("", "_blank");

  const params = new URLSearchParams();
  if (filter?.minId !== undefined) params.set("minId", String(filter.minId));
  if (filter?.maxId !== undefined) params.set("maxId", String(filter.maxId));
  const query = params.toString();

  const token = getAccessToken();
  const res = await fetch(`${REPORT_API_URL}/reports/products${query ? `?${query}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    newTab?.close(); // ปิด tab เปล่าทิ้งถ้าออกรายงานไม่สำเร็จ ไม่ปล่อยค้างไว้เฉย ๆ
    if (res.status === 401) throw new Error("กรุณาเข้าสู่ระบบใหม่");
    if (res.status === 400) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message ?? "เงื่อนไขไม่ถูกต้อง");
    }
    throw new Error("ออกรายงานไม่สำเร็จ");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  // ไม่ revoke URL ทันที เพราะ tab ใหม่ยังโหลดเนื้อหาจาก blob URL นี้อยู่ -> ปล่อยให้ browser จัดการเองตอนปิด tab
  if (newTab) {
    newTab.location.href = url;
  } else {
    // เผื่อ popup blocker บล็อกไปแล้วตั้งแต่ต้น (เช่น browser เข้มงวดเป็นพิเศษ) fallback เป็นเปิด tab ใหม่ตรง ๆ
    window.open(url, "_blank");
  }
}
