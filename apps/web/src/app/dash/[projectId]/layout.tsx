"use client";

import { createContext, useContext } from "react";

type ProjectContextType = {
  projectId: string;
};

const ProjectContext = createContext<ProjectContextType | null>(null);

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within a ProjectProvider");
  return ctx;
}

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  // In Next.js 15, params is a Promise in layouts but we need it sync for context.
  // Use React.use() to unwrap it.
  const { projectId } = require("react").use(params);

  return (
    <ProjectContext.Provider value={{ projectId }}>
      {children}
    </ProjectContext.Provider>
  );
}
