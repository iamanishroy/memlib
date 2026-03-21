"use client";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ProjectSwitcher } from "@/components/project-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import UserMenu from "@/components/user-menu";
import { Brain, Home, Key, Settings } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const tabs = [
  { id: "home", label: "Home", icon: Home, path: "" },
  { id: "memories", label: "Memories", icon: Brain, path: "/memories" },
  { id: "api-keys", label: "API Keys", icon: Key, path: "/api-keys" },
  {
    id: "configurations",
    label: "Configurations",
    icon: Settings,
    path: "/configurations",
  },
];

export function TopNav() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params?.projectId as string | undefined;
  const base = projectId ? `/dash/${projectId}` : "/dash";

  function isActive(tabPath: string) {
    if (tabPath === "") {
      // Home is active only on exact base path
      return pathname === base || pathname === `${base}/`;
    }
    return pathname.startsWith(`${base}${tabPath}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="flex h-14 items-center gap-4 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm hidden sm:inline">
            MemLib
          </span>
        </Link>

        {/* Divider */}
        <div className="h-5 w-px bg-border shrink-0" />

        {/* Project Switcher */}
        <ProjectSwitcher />

        {/* Divider */}
        <div className="h-5 w-px bg-border shrink-0" />

        {/* Tabs */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.id}
                href={`${base}${tab.path}` as any}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <Icon className="size-4" />
                <span className="hidden md:inline">{tab.label}</span>
                {/* {active && (
                  <span className="absolute -bottom-[calc(0.5rem+1px)] left-3 right-3 h-[2px] rounded-full bg-foreground" />
                )} */}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Docs + Theme Toggle + User Menu */}
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Docs
        </a>
        <ModeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
