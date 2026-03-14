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
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto w-full h-full">{children}</div>
      </main>
    </div>
  );
}
