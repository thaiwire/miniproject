import ProfileForm from "@/modules/profile/components/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
      <h1 className="mb-1 text-xl font-bold">แก้ไขโปรไฟล์</h1>
      <p className="mb-4 text-sm text-muted-foreground">ปรับปรุงชื่อและรหัสผ่านของบัญชีคุณ</p>
      <ProfileForm />
    </div>
  );
}
