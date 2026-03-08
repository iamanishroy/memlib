"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@memz/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@memz/ui/components/sidebar";
import { ChevronsUpDown, Plus } from "lucide-react";
import * as React from "react";

type Project = {
  name: string;
  logo: React.ElementType;
  plan: string;
};

export function ProjectSwitcher({ projects }: { projects: Project[] }) {
  const { isMobile } = useSidebar();
  const [activeProject, setActiveProject] = React.useState(projects[0]);

  if (!activeProject) return null;

  const Logo = activeProject.logo;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-background text-foreground">
              <Logo className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {activeProject.name}
              </span>
              <span className="truncate text-xs">{activeProject.plan}</span>
            </div>
            <ChevronsUpDown className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg mb-4"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup className="gap-1">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Projects
              </DropdownMenuLabel>
              {projects.map((project, index) => (
                <DropdownMenuItem
                  key={project.name}
                  onClick={() => setActiveProject(project)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <project.logo className="size-4 shrink-0" />
                  </div>
                  {project.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                Add project
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
