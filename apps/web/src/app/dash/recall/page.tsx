"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

export default function RecallPage() {
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
        <h1 className="text-2xl font-bold">Recall</h1>
        <p className="text-muted-foreground">
          Search and retrieve your memories with AI.
        </p>
      </div>

      <div className="draft">
        <h2>UI Plan</h2>
        <ul>
          <li>
            Large search/query input — natural language queries ("What did I
            learn about React last week?")
          </li>
          <li>AI-powered semantic search results with relevance scores</li>
          <li>Result cards with highlighted matching snippets</li>
          <li>Suggested follow-up queries based on results</li>
          <li>Filter by date range, memory type, tags</li>
          <li>Recent recall history — past queries and their results</li>
          <li>Pin/bookmark important recall results</li>
          <li>
            "Ask AI" mode — conversational recall with context from your
            memories
          </li>
        </ul>
      </div>
    </div>
  );
}
