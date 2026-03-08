"use client";

import { SidebarInset, SidebarProvider } from "@memz/ui/components/sidebar";
import { DashboardSidebar } from "@/components/sidebar/app-sidebar";
import { Onboarding01 } from "@/components/onboarding";

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
          {/* {children} */}

          <Onboarding01 />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
