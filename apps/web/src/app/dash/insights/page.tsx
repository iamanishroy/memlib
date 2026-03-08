"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function InsightsPage() {
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
