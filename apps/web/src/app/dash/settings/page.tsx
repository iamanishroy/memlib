"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
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
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          General account and workspace settings.
        </p>
      </div>

      <div className="draft">
        <h2>UI Plan — General Settings</h2>
        <ul>
          <li>Profile section — name, email, avatar (synced from Clerk)</li>
          <li>Workspace settings — name, description</li>
          <li>Default memory privacy — public/private/workspace</li>
          <li>Language and timezone preferences</li>
          <li>
            Notification preferences — email digests, in-app notifications
          </li>
          <li>Data export — download all memories as JSON/CSV</li>
          <li>Danger zone — delete workspace, delete all memories</li>
        </ul>
      </div>
    </div>
  );
}
