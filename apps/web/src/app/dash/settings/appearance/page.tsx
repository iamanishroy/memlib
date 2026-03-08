"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

export default function AppearancePage() {
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
        <h1 className="text-2xl font-bold">Appearance</h1>
        <p className="text-muted-foreground">
          Customize the look and feel of your workspace.
        </p>
      </div>

      <div className="draft">
        <h2>UI Plan</h2>
        <ul>
          <li>
            Theme selector — Light / Dark / System (replaces the old header
            toggle)
          </li>
          <li>Accent color picker — choose primary accent color</li>
          <li>Font size — small / default / large / extra large</li>
          <li>Sidebar position — left / right</li>
          <li>Sidebar style — floating / inset / default</li>
          <li>Compact mode toggle — reduce padding and spacing</li>
          <li>
            Memory card layout — list view / grid view / compact view default
          </li>
          <li>Code block theme — for memories containing code snippets</li>
          <li>Preview pane — live preview of changes before saving</li>
        </ul>
      </div>
    </div>
  );
}
