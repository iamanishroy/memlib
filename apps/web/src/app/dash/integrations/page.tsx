"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function IntegrationsPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/auth");
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded || !userId) return null;

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
