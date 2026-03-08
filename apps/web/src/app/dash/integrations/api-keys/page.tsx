"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ApiKeysPage() {
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
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-muted-foreground">
          Manage your API keys for programmatic access.
        </p>
      </div>

      <div className="draft">
        <h2>UI Plan</h2>
        <ul>
          <li>
            "Create API Key" button — generates new key with name + permissions
          </li>
          <li>
            Table of existing keys — name, prefix (sk_...xxxx), created date,
            last used, status
          </li>
          <li>Copy key to clipboard action</li>
          <li>Revoke/delete key with confirmation dialog</li>
          <li>Key permissions — read-only, read-write, admin scopes</li>
          <li>Usage stats per key — requests today/this month</li>
          <li>Rate limit configuration per key</li>
        </ul>
      </div>
    </div>
  );
}
