"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

export default function InsightsPage() {
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
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-muted-foreground">
          AI-generated insights from your memories.
        </p>
      </div>

      <div className="draft">
        <h2>UI Plan</h2>
        <ul>
          <li>Daily/weekly insight digest — AI-summarized highlights</li>
          <li>Insight cards — each with a title, summary, related memories</li>
          <li>
            Types: patterns detected, knowledge gaps, topic summaries, trending
            themes
          </li>
          <li>"Generate Insights" button — trigger on-demand analysis</li>
          <li>Insight timeline — chronological list of past insights</li>
          <li>Actionable suggestions — "You haven't revisited X in 30 days"</li>
          <li>Bookmark/dismiss individual insights</li>
          <li>Share insight as a summary document</li>
        </ul>
      </div>
    </div>
  );
}
