"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login } from "@/lib/auth-api";
import { setTokens } from "@/lib/auth-storage";
import { ApiError } from "@/lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// zod schema = ที่เดียวที่ประกาศ validation rule แล้ว TypeScript type ถูก infer ให้อัตโนมัติ
const loginSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormValues) {
    setServerError(null);
    try {
      const tokens = await login(data);
      setTokens(tokens);
      router.push("/products"); // login สำเร็จ -> ไปหน้ารายการสินค้า
    } catch (error) {
      // อีเมล/รหัสผ่านผิด -> backend ตอบ 401 พร้อมข้อความ โชว์ให้ user เห็น
      setServerError(
        error instanceof ApiError ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
      );
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">เข้าสู่ระบบ</CardTitle>
        <CardDescription>กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบ</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
          <div className="grid gap-1.5">
            <Label htmlFor="email">อีเมล</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <PasswordInput id="password" {...register("password")} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-destructive">⚠ {serverError}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full h-10 font-bold">
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="text-primary hover:underline">
              สมัครสมาชิก
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
