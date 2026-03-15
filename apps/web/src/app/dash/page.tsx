"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";

async function fetchProjects() {
  const res = await fetch("/api/projects");
  if (!res.ok) throw new Error("Failed to fetch projects");
  return (await res.json()) as { id: string }[];
}

export default function DashRedirect() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    enabled: !!session,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/auth");
      return;
    }
    if (projects) {
      if (projects.length > 0) {
        router.replace(`/dash/${projects[0]!.id}`);
      } else {
        router.replace("/onboard");
      }
    }
  }, [session, isPending, projects, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}
