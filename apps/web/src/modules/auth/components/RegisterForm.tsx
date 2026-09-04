"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { register as registerUser } from "@/modules/auth/auth-api";
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
const registerSchema = z.object({
  name: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(data: RegisterFormValues) {
    setServerError(null);
    try {
      await registerUser(data);
      // /auth/register ตอบกลับเป็นข้อมูล user ไม่ใช่ token -> ต้องให้ผู้ใช้ login เองอีกครั้ง
      setIsDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (error) {
      // เช่น อีเมลซ้ำ -> backend ตอบ 409 พร้อมข้อความ โชว์ให้ user เห็น
      setServerError(
        error instanceof ApiError ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
      );
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">สมัครสมาชิก</CardTitle>
        <CardDescription>กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้ใหม่</CardDescription>
      </CardHeader>
      <CardContent>
        {isDone ? (
          <p className="text-sm text-muted-foreground">
            สมัครสมาชิกสำเร็จ กำลังพาไปหน้าเข้าสู่ระบบ...
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
            <div className="grid gap-1.5">
              <Label htmlFor="name">ชื่อ</Label>
              <Input id="name" {...registerField("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...registerField("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <PasswordInput id="password" {...registerField("password")} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {serverError && <p className="text-sm text-destructive">⚠ {serverError}</p>}

            <Button type="submit" disabled={isSubmitting} className="w-full h-10 font-bold">
              {isSubmitting ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              มีบัญชีอยู่แล้ว?{" "}
              <Link href="/login" className="text-primary hover:underline">
                เข้าสู่ระบบ
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
