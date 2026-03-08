"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MemoriesPage() {
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
        <h1 className="text-2xl font-bold">Memories</h1>
        <p className="text-muted-foreground">
          Browse and manage your stored memories.
        </p>
      </div>

      <div className="draft">
        <h2>UI Plan</h2>
        <ul>
          <li>
            Search bar at top — full-text + semantic search across all memories
          </li>
          <li>
            Filter controls — by date, tags, source, type (text, image, link,
            note)
          </li>
          <li>Memory list/grid view toggle</li>
          <li>
            Each memory card shows: title/preview, timestamp, tags, source,
            connection count
          </li>
          <li>Click to expand memory detail view (side panel or modal)</li>
          <li>Bulk actions — select multiple, tag, delete, export</li>
          <li>FAB or button to manually add a new memory</li>
          <li>Infinite scroll or pagination</li>
          <li>Empty state with illustration when no memories exist</li>
        </ul>
      </div>
    </div>
  );
}
