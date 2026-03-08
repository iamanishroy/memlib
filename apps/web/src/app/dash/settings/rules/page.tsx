"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MemoryRulesPage() {
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
        <h1 className="text-2xl font-bold">Memory Rules</h1>
        <p className="text-muted-foreground">
          Configure how memories are processed and stored.
        </p>
      </div>

      <div className="draft">
        <h2>UI Plan</h2>
        <ul>
          <li>
            Auto-tagging rules — define rules to auto-tag memories based on
            content
          </li>
          <li>
            Duplicate detection — sensitivity slider (strict/moderate/relaxed)
          </li>
          <li>Auto-categorization — enable/disable AI categorization</li>
          <li>
            Retention policies — auto-archive after X days, auto-delete after Y
            days
          </li>
          <li>Ingestion filters — block certain patterns/sources</li>
          <li>
            Embedding model selection — choose which model generates embeddings
          </li>
          <li>Memory size limits — max characters per memory</li>
          <li>
            Source priority — rank which sources take precedence for dedup
          </li>
        </ul>
      </div>
    </div>
  );
}
