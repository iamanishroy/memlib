"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

export default function ConsolidationPage() {
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
        <h1 className="text-2xl font-bold">Consolidation</h1>
        <p className="text-muted-foreground">
          Configure memory consolidation and synthesis.
        </p>
      </div>

      <div className="draft">
        <h2>UI Plan</h2>
        <ul>
          <li>
            Consolidation schedule — how often AI reviews and synthesizes
            memories (daily/weekly/manual)
          </li>
          <li>
            Consolidation history — log of past consolidation runs with
            summaries
          </li>
          <li>Merge similar memories — threshold slider for similarity</li>
          <li>Summary generation — auto-create summaries of memory clusters</li>
          <li>
            Knowledge graph rebuild — trigger re-analysis of all connections
          </li>
          <li>"Consolidate Now" button — run on demand</li>
          <li>Consolidation scope — all memories vs. selected tags/sources</li>
          <li>Preview mode — see what would be consolidated before applying</li>
        </ul>
      </div>
    </div>
  );
}
