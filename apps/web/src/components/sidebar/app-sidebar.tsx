"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Brain,
  Home,
  Key,
  Palette,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/sidebar/logo";
import type { Route } from "./nav-main";
import DashboardNavigation from "@/components/sidebar/nav-main";
import { ProjectSwitcher } from "@/components/sidebar/team-switcher";
import UserMenu from "@/components/user-menu";

function useDashboardRoutes(): Route[] {
  const params = useParams();
  const projectId = params?.projectId as string | undefined;
  const base = projectId ? `/dash/${projectId}` : "/dash";

  return [
    {
      id: "home",
      title: "Home",
      icon: <Home className="size-4" />,
      link: base,
    },
    {
      id: "memories",
      title: "Memories",
      icon: <Brain className="size-4" />,
      link: `${base}/memories`,
    },
    {
      id: "recall",
      title: "Recall",
      icon: <Search className="size-4" />,
      link: `${base}/recall`,
    },
    {
      id: "api-keys",
      title: "API Keys",
      icon: <Key className="size-4" />,
      link: `${base}/api-keys`,
    },
    {
      id: "insights",
      title: "Insights",
      icon: <Sparkles className="size-4" />,
      link: `${base}/insights`,
    },
    {
      id: "analytics",
      title: "Analytics",
      icon: <TrendingUp className="size-4" />,
      link: `${base}/analytics`,
    },
    {
      id: "settings",
      title: "Settings",
      icon: <Settings className="size-4" />,
      link: `${base}/settings`,
      subs: [
        { title: "General", link: `${base}/settings` },
        { title: "Memory Rules", link: `${base}/settings/rules` },
        { title: "Consolidation", link: `${base}/settings/consolidation` },
        { title: "Appearance", link: `${base}/settings/appearance` },
      ],
    },
  ];
}

export function DashboardSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const dashboardRoutes = useDashboardRoutes();

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader
        className={cn(
          "flex md:pt-3.5",
          isCollapsed
            ? "flex-col items-center justify-center gap-y-3"
            : "flex-row items-center justify-between",
        )}
      >
        <a href="#" className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          {!isCollapsed && (
            <span className="font-semibold text-black dark:text-white">
              memz
            </span>
          )}
        </a>

        <motion.div
          key={isCollapsed ? "header-collapsed" : "header-expanded"}
          className={cn(
            "flex items-center gap-2",
            isCollapsed ? "flex-col" : "flex-row",
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <UserMenu />
          <SidebarTrigger />
        </motion.div>
      </SidebarHeader>
      <SidebarContent className="gap-4 px-2 py-4">
        <DashboardNavigation routes={dashboardRoutes} />
      </SidebarContent>
      <SidebarFooter className="px-2">
        <ProjectSwitcher />
      </SidebarFooter>
    </Sidebar>
  );
}
