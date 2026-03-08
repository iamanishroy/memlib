"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

export default function IntegrationsPage() {
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
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect external services and manage API access.
        </p>
      </div>

      <div className="draft">
        <h2>UI Plan</h2>
        <ul>
          <li>
            Overview cards — API Keys count, active webhooks, connected apps
          </li>
          <li>
            Quick access links to sub-pages (API Keys, Webhooks, Connected Apps)
          </li>
          <li>Integration health status — green/yellow/red indicators</li>
          <li>Recent API activity log</li>
          <li>Usage quota display — API calls used / limit</li>
        </ul>
      </div>
    </div>
  );
}
