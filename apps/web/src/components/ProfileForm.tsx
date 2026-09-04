"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getProfile, updateProfile, uploadAvatar } from "@/lib/user-api";
import { ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { User } from "@mini-project/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB ตรงกับขีดจำกัดฝั่ง backend (ดู user.controller.ts)
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

// zod schema = ที่เดียวที่ประกาศ validation rule แล้ว TypeScript type ถูก infer ให้อัตโนมัติ
// password เป็น optional -> กรอกเฉพาะตอนอยากเปลี่ยนรหัสผ่านเท่านั้น ปล่อยว่างไว้ = ไม่เปลี่ยน
const profileSchema = z.object({
  name: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  password: z.union([z.literal(""), z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")]),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileForm() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", password: "" },
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
    setServerError(null);
    setSuccessMessage(null);
    try {
      // ไม่ส่ง password ไปถ้าปล่อยว่างไว้ -> backend รู้ว่าไม่ต้องเปลี่ยนรหัสผ่าน
      const updated = await updateProfile({
        name: data.name,
        ...(data.password ? { password: data.password } : {}),
      });
      setUser(updated);
      reset({ name: updated.name, password: "" });
      setSuccessMessage("บันทึกข้อมูลสำเร็จ");
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
      );
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset input เผื่อเลือกไฟล์เดิมซ้ำ event change จะได้ fire อีกครั้ง
    if (!file) return;

    setAvatarError(null);
    // validate ฝั่ง client ก่อนเพื่อ UX (บอก error ทันทีไม่ต้องรอ network) — backend validate ซ้ำเสมอเพื่อความปลอดภัย
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError("รองรับเฉพาะไฟล์ JPEG, PNG, WEBP เท่านั้น");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("ไฟล์ต้องมีขนาดไม่เกิน 2MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const updated = await uploadAvatar(file);
      setUser(updated); // อัปเดต state ทันทีไม่ต้อง reload หน้า
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">กำลังโหลด...</p>;
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarImage
            src={user?.avatarUrl ? `${API_URL}${user.avatarUrl}` : undefined}
          />
          <AvatarFallback>{user?.email?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploadingAvatar ? "กำลังอัปโหลด..." : "เปลี่ยนรูปโปรไฟล์"}
          </Button>
          {avatarError && <p className="mt-1 text-sm text-destructive">{avatarError}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="email">อีเมล</Label>
          <Input id="email" value={user?.email ?? ""} disabled />
          <p className="text-xs text-muted-foreground">แก้ไขอีเมลไม่ได้ (ผูกกับการเข้าสู่ระบบ)</p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="name">ชื่อ</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password">รหัสผ่านใหม่</Label>
          <PasswordInput
            id="password"
            placeholder="เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-destructive">⚠ {serverError}</p>}
        {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full h-10 font-bold">
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
        </Button>
      </form>
    </div>
  );
}
