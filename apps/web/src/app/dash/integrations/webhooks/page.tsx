"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

export default function WebhooksPage() {
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
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <p className="text-muted-foreground">
          Configure event notifications to external services.
        </p>
      </div>

      <div className="draft">
        <h2>UI Plan</h2>
        <ul>
          <li>
            "Add Webhook" button — configure endpoint URL + events to listen for
          </li>
          <li>
            Table of webhooks — URL, events, status (active/paused), created
            date
          </li>
          <li>
            Event types: memory.created, memory.updated, memory.deleted,
            connection.discovered, recall.completed
          </li>
          <li>Test webhook button — sends a test payload</li>
          <li>
            Delivery log — recent webhook deliveries with status codes +
            response times
          </li>
          <li>Retry failed deliveries</li>
          <li>Secret key for payload verification (HMAC signing)</li>
        </ul>
      </div>
    </div>
  );
}
