"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

export default function AnalyticsPage() {
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
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Usage statistics and memory analytics.
        </p>
      </div>

      <div className="draft">
        <h2>UI Plan</h2>
        <ul>
          <li>
            Overview stats — total memories, recalls this week, connections
            discovered, storage used
          </li>
          <li>
            Memory creation chart — line/bar graph over time
            (daily/weekly/monthly)
          </li>
          <li>Recall frequency chart — how often you search your memories</li>
          <li>Top tags/topics — word cloud or bar chart of most-used tags</li>
          <li>
            Memory source breakdown — pie chart (manual, API, Chrome extension,
            etc.)
          </li>
          <li>Connection growth over time</li>
          <li>API usage — requests/day chart, endpoint breakdown</li>
          <li>Export analytics data as CSV</li>
        </ul>
      </div>
    </div>
  );
}
