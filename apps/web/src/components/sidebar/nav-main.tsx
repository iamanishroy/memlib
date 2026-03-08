"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@memz/ui/components/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuItem as SidebarMenuSubItem,
  useSidebar,
} from "@memz/ui/components/sidebar";
import { cn } from "@memz/ui/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useState, useEffect } from "react";

export type Route = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  link: string;
  subs?: {
    title: string;
    link: string;
    icon?: React.ReactNode;
  }[];
};

export default function DashboardNavigation({ routes }: { routes: Route[] }) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const pathname = usePathname();
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);

  // Auto-open the collapsible that contains the active sub-route
  useEffect(() => {
    for (const route of routes) {
      if (route.subs?.some((sub) => pathname === sub.link)) {
        setOpenCollapsible(route.id);
        break;
      }
    }
  }, [pathname, routes]);

  const isActive = (link: string) => pathname === link;
  const isParentActive = (route: Route) =>
    pathname === route.link || route.subs?.some((sub) => pathname === sub.link);

  return (
    <SidebarMenu className="gap-1">
      {routes.map((route) => {
        const isOpen = !isCollapsed && openCollapsible === route.id;
        const hasSubRoutes = !!route.subs?.length;
        const parentActive = isParentActive(route);

        return (
          <SidebarMenuItem key={route.id}>
            {hasSubRoutes ? (
              <Collapsible
                open={isOpen}
                onOpenChange={(open) =>
                  setOpenCollapsible(open ? route.id : null)
                }
                className="w-full"
              >
                <CollapsibleTrigger
                  render={
                    <SidebarMenuButton
                      isActive={!!parentActive}
                      className={cn(
                        "flex w-full items-center rounded-lg px-2 transition-colors",
                        isCollapsed && "justify-center",
                      )}
                    />
                  }
                >
                  {route.icon}
                  {!isCollapsed && (
                    <span className="ml-2 flex-1 text-sm font-medium">
                      {route.title}
                    </span>
                  )}
                  {!isCollapsed && hasSubRoutes && (
                    <span className="ml-auto">
                      {isOpen ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </span>
                  )}
                </CollapsibleTrigger>

                {!isCollapsed && (
                  <CollapsibleContent>
                    <SidebarMenuSub className="my-1 ml-3.5 ">
                      {route.subs?.map((subRoute) => (
                        <SidebarMenuSubItem
                          key={`${route.id}-${subRoute.title}`}
                          className="h-auto"
                        >
                          <SidebarMenuSubButton
                            isActive={isActive(subRoute.link)}
                            render={
                              <Link
                                href={subRoute.link as any}
                                prefetch={true}
                                className="flex items-center rounded-md px-4 py-1.5 text-sm font-medium"
                              />
                            }
                          >
                            {subRoute.title}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </Collapsible>
            ) : (
              <SidebarMenuButton
                tooltip={route.title}
                isActive={isActive(route.link)}
                render={
                  <Link
                    href={route.link as any}
                    prefetch={true}
                    className={cn(
                      "flex items-center rounded-lg px-2 transition-colors",
                      isCollapsed && "justify-center",
                    )}
                  />
                }
              >
                {route.icon}
                {!isCollapsed && (
                  <span className="ml-2 text-sm font-medium">
                    {route.title}
                  </span>
                )}
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
