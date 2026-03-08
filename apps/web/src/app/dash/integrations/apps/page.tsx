"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ConnectedAppsPage() {
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
        <h1 className="text-2xl font-bold">Connected Apps</h1>
        <p className="text-muted-foreground">
          Manage third-party app integrations.
        </p>
      </div>

      <div className="draft">
        <h2>UI Plan</h2>
        <ul>
          <li>
            App marketplace grid — available integrations (Notion, Slack,
            Obsidian, Chrome, etc.)
          </li>
          <li>
            Each app card: icon, name, description, "Connect" / "Connected"
            status
          </li>
          <li>Connected apps section — currently active integrations</li>
          <li>Per-app settings — sync frequency, data scope, permissions</li>
          <li>Disconnect app with confirmation</li>
          <li>Sync status — last synced time, items synced count</li>
          <li>Manual sync trigger button</li>
        </ul>
      </div>
    </div>
  );
}
