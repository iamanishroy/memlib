"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function DashRedirect() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      router.replace("/auth");
      return;
    }

    // Fetch user's projects and redirect
    fetch("/api/projects")
      .then((res) => res.json())
      .then((projects) => {
        if (projects.length > 0) {
          router.replace(`/dash/${projects[0].id}`);
        } else {
          router.replace("/onboard");
        }
      })
      .catch(() => {
        router.replace("/onboard");
      });
  }, [session, isPending, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}
