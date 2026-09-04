"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/auth-storage";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

// route group นี้ครอบทุกหน้าที่ต้อง login ก่อน (/products, /products/new, /profile)
// เช็ค token ฝั่ง client เพราะ token เก็บใน localStorage ซึ่ง middleware.ts (รันฝั่ง server) อ่านไม่ได้
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  // เริ่มด้วย false เสมอ (ตรงกับ server ที่ไม่มี localStorage ให้อ่าน) กันปัญหา hydration mismatch
  // -> ถ้าอ่าน localStorage ตรง ๆ ตอน render จะได้ค่าไม่ตรงกันระหว่าง server-rendered HTML กับ client ตอน hydrate
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ต้อง sync กับ localStorage ซึ่งเป็น external source ที่ SSR อ่านไม่ได้
    setHasToken(true);
  }, [router]);

  // ยังไม่มี token (หรือยังไม่เช็คเสร็จ) -> ไม่ render เนื้อหาที่ควรถูกป้องกันไว้ก่อน (กัน flash ของข้อมูลระหว่างรอ redirect)
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
