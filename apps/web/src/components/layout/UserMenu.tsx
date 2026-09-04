"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, clearTokens } from "@/lib/auth-storage";
import { getProfile } from "@/modules/profile/user-api";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface UserMenuProps {
  // "light" ใช้บน topbar พื้นขาว, "dark" ใช้บน sidebar พื้นเข้ม (เผื่อเอากลับไปใช้ที่อื่น)
  variant?: "light" | "dark";
}

export default function UserMenu({ variant = "light" }: UserMenuProps) {
  const router = useRouter();
  // อ่าน email/role จาก JWT payload ตรง ๆ ก่อนเลย (ไม่ต้องรอ network) -> ปุ่มเมนูโชว์ email ได้ทันทีตอน mount
  const user = getCurrentUser();
  // avatarUrl ไม่มีใน JWT payload จึงต้อง fetch /users/me เพิ่มเพื่อเอารูปจริงมาโชว์ (email ยังคงมาจาก JWT เหมือนเดิม)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((profile) => setAvatarUrl(profile.avatarUrl))
      .catch(() => {}); // ดึงรูปไม่สำเร็จก็ไม่เป็นไร แค่ fallback เป็นตัวอักษรแรกของ email เหมือนเดิม
  }, []);

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
          variant === "dark"
            ? "w-full text-slate-400 hover:bg-white/5 hover:text-white"
            : "text-foreground hover:bg-muted",
        )}
      >
        <Avatar size="sm" className="shrink-0 bg-slate-700 text-white">
          <AvatarImage src={avatarUrl ? `${API_URL}${avatarUrl}` : undefined} />
          <AvatarFallback className="bg-slate-700 text-xs font-bold text-white">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{user?.email ?? "ผู้ใช้งาน"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          แก้ไขโปรไฟล์
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
