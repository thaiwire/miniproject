import UserMenu from "@/components/layout/UserMenu";

export default function Topbar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-border bg-white px-6">
      <UserMenu variant="light" />
    </header>
  );
}
