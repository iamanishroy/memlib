"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

export default function DashPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth");
    }
  }, [isPending, session, router]);

  if (isPending || !session) return null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{session.user.name ? `, ${session.user.name}` : ""}!
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="font-medium">Memories</h3>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">Total stored</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-medium">Recalls</h3>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">This week</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-medium">Connections</h3>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">AI-discovered</p>
        </div>
      </div>
    </div>
  );
}
