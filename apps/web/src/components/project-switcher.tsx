"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Folder, Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

type Project = {
  id: string;
  name: string;
};

async function fetchProjects() {
  const res = await fetch("/api/projects");
  if (!res.ok) throw new Error("Failed to fetch projects");
  return (await res.json()) as Project[];
}

export function ProjectSwitcher() {
  const router = useRouter();
  const params = useParams();
  const currentProjectId = params?.projectId as string | undefined;

  const { data: projects = [], isLoading: loading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    staleTime: Infinity,
  });

  const activeProject = projects.find((p) => p.id === currentProjectId);

  if (loading) {
    return <Skeleton className="h-8 w-32" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 px-2 text-sm font-medium"
          />
        }
      >
        <Folder className="size-4 text-muted-foreground" />
        <span className="truncate max-w-[120px]">
          {activeProject?.name || "Select Project"}
        </span>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48 rounded-lg" align="start">
        <DropdownMenuGroup className="gap-1">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Projects
          </DropdownMenuLabel>
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => router.push(`/dash/${project.id}`)}
              className="gap-2 p-2"
            >
              <div className="flex size-5 items-center justify-center rounded-sm border">
                <Folder className="size-3 shrink-0" />
              </div>
              {project.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 p-2"
          onClick={() => router.push("/onboard")}
        >
          <div className="flex size-5 items-center justify-center rounded-md border bg-background">
            <Plus className="size-3" />
          </div>
          <span className="text-muted-foreground">New project</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
