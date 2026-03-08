"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@memz/ui/components/sidebar";
import { cn } from "@memz/ui/lib/utils";
import { motion } from "framer-motion";
import {
  Brain,
  Home,
  Key,
  LinkIcon,
  Palette,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Webhook,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/sidebar/logo";
import type { Route } from "./nav-main";
import DashboardNavigation from "@/components/sidebar/nav-main";
import { ProjectSwitcher } from "@/components/sidebar/team-switcher";
import { UserButton } from "@clerk/nextjs";

const dashboardRoutes: Route[] = [
  {
    id: "home",
    title: "Home",
    icon: <Home className="size-4" />,
    link: "/dash",
  },
  {
    id: "memories",
    title: "Memories",
    icon: <Brain className="size-4" />,
    link: "/dash/memories",
  },
  {
    id: "recall",
    title: "Recall",
    icon: <Search className="size-4" />,
    link: "/dash/recall",
  },
  {
    id: "integrations",
    title: "Integrations",
    icon: <Zap className="size-4" />,
    link: "/dash/integrations",
    subs: [
      {
        title: "API Keys",
        link: "/dash/integrations/api-keys",
        icon: <Key className="size-4" />,
      },
      {
        title: "Webhooks",
        link: "/dash/integrations/webhooks",
        icon: <Webhook className="size-4" />,
      },
      {
        title: "Connected Apps",
        link: "/dash/integrations/apps",
        icon: <LinkIcon className="size-4" />,
      },
    ],
  },
  {
    id: "insights",
    title: "Insights",
    icon: <Sparkles className="size-4" />,
    link: "/dash/insights",
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: <TrendingUp className="size-4" />,
    link: "/dash/analytics",
  },
  {
    id: "settings",
    title: "Settings",
    icon: <Settings className="size-4" />,
    link: "/dash/settings",
    subs: [
      { title: "General", link: "/dash/settings" },
      { title: "Memory Rules", link: "/dash/settings/rules" },
      { title: "Consolidation", link: "/dash/settings/consolidation" },
      { title: "Appearance", link: "/dash/settings/appearance" },
    ],
  },
];

const projects = [
  { name: "Personal", logo: Logo, plan: "Free" },
  { name: "Work", logo: Logo, plan: "Free" },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

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
          <UserButton />
          <SidebarTrigger />
        </motion.div>
      </SidebarHeader>
      <SidebarContent className="gap-4 px-2 py-4">
        <DashboardNavigation routes={dashboardRoutes} />
      </SidebarContent>
      <SidebarFooter className="px-2">
        <ProjectSwitcher projects={projects} />
      </SidebarFooter>
    </Sidebar>
  );
}
