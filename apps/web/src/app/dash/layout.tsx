"use client";

import { TopNav } from "@/components/top-nav";

export default function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh w-full flex-col">
      <TopNav />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
