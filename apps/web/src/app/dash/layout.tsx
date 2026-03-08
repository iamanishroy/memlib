"use client";

import { SidebarInset, SidebarProvider } from "@memz/ui/components/sidebar";
import { DashboardSidebar } from "@/components/sidebar/app-sidebar";

export default function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="relative flex h-dvh w-full">
        <DashboardSidebar />
        <SidebarInset className="flex flex-col overflow-auto">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
