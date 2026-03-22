"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconChevronRight } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Logo } from "@/components/logo";
import { CircularProgress, StepIndicator } from "./progress";
import { StepProject } from "./step-project";
import { StepDatabase } from "./step-database";
import { StepEmbedding } from "./step-embedding";
import { StepLlm } from "./step-llm";
import { StepMigrate } from "./step-migrate";
import type { OnboardingStep } from "./types";

export function Onboarding() {
  const router = useRouter();

  // Form state
  const [projectName, setProjectName] = useState("");
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [embeddingProvider, setEmbeddingProvider] = useState("");
  const [embeddingApiKey, setEmbeddingApiKey] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("");
  const [embeddingBaseUrl, setEmbeddingBaseUrl] = useState("");
  const [llmProvider, setLlmProvider] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmBaseUrl, setLlmBaseUrl] = useState("");

  const [migrating, setMigrating] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [openStepId, setOpenStepId] = useState("project-name");

  const stepDefs: OnboardingStep[] = [
    {
      id: "project-name",
      title: "Name your project",
      description: "Choose a name for your MemLib project.",
      completed: projectName.trim().length > 0 && openStepId !== "project-name",
    },
    {
      id: "database",
      title: "Connect your database",
      description:
        "Provide a PostgreSQL connection URL. This database will store your project's memories.",
      completed: databaseUrl.trim().length > 0 && openStepId !== "database",
    },
    {
      id: "embedding",
      title: "Embedding configuration",
      description: "Select an embedding provider and enter your API key.",
      completed:
        embeddingProvider !== "" &&
        embeddingApiKey.trim().length > 0 &&
        openStepId !== "embedding",
    },
    {
      id: "llm",
      title: "LLM configuration",
      description: "Select your LLM provider, model, and enter your API key.",
      completed:
        llmProvider !== "" &&
        llmApiKey.trim().length > 0 &&
        llmModel !== "" &&
        openStepId !== "llm",
    },
    {
      id: "migrate",
      title: "Migrate database",
      description: "Create tables and indexes in your project database.",
      completed: setupComplete,
    },
  ];

  const completedCount = stepDefs.filter((s) => s.completed).length;
  const remainingCount = stepDefs.length - completedCount;

  function canMigrate() {
    return (
      projectName.trim().length > 0 &&
      databaseUrl.trim().length > 0 &&
      embeddingProvider !== "" &&
      embeddingApiKey.trim().length > 0 &&
      llmProvider !== "" &&
      llmApiKey.trim().length > 0 &&
      llmModel !== ""
    );
  }

  function advanceToNext(currentId: string) {
    const idx = stepDefs.findIndex((s) => s.id === currentId);
    if (idx < stepDefs.length - 1) {
      setOpenStepId(stepDefs[idx + 1]!.id);
    }
  }

  async function handleMigrate() {
    setMigrating(true);
    setMigrationError(null);
    try {
      const createRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          databaseUrl,
          embeddingProvider,
          embeddingApiKey,
          embeddingModel: embeddingModel || undefined,
          embeddingBaseUrl: embeddingBaseUrl || undefined,
          llmProvider,
          llmApiKey,
          llmModel,
          llmBaseUrl: llmBaseUrl || undefined,
        }),
      });
      if (!createRes.ok) {
        const err = (await createRes.json()) as { error?: string };
        throw new Error(err.error || "Failed to create project");
      }
      const project = (await createRes.json()) as { id: string };
      setProjectId(project.id);
      const migrateRes = await fetch(`/api/projects/${project.id}/migrate`, {
        method: "POST",
      });
      if (!migrateRes.ok) {
        const err = (await migrateRes.json()) as { error?: string };
        throw new Error(err.error || "Migration failed");
      }
      setMigrating(false);
      setSetupComplete(true);
    } catch (err) {
      setMigrating(false);
      setMigrationError(err instanceof Error ? err.message : String(err));
    }
  }

  function renderStepContent(stepId: string) {
    switch (stepId) {
      case "project-name":
        return (
          <StepProject
            value={projectName}
            onChange={setProjectName}
            onContinue={() => advanceToNext("project-name")}
          />
        );
      case "database":
        return (
          <StepDatabase
            value={databaseUrl}
            onChange={setDatabaseUrl}
            onContinue={() => advanceToNext("database")}
          />
        );
      case "embedding":
        return (
          <StepEmbedding
            provider={embeddingProvider}
            apiKey={embeddingApiKey}
            model={embeddingModel}
            baseUrl={embeddingBaseUrl}
            onProviderChange={(v) => {
              setEmbeddingProvider(v);
              setEmbeddingModel("");
            }}
            onApiKeyChange={setEmbeddingApiKey}
            onModelChange={setEmbeddingModel}
            onBaseUrlChange={setEmbeddingBaseUrl}
            onContinue={() => advanceToNext("embedding")}
          />
        );
      case "llm":
        return (
          <StepLlm
            provider={llmProvider}
            apiKey={llmApiKey}
            model={llmModel}
            baseUrl={llmBaseUrl}
            onProviderChange={setLlmProvider}
            onApiKeyChange={setLlmApiKey}
            onModelChange={setLlmModel}
            onBaseUrlChange={setLlmBaseUrl}
            onContinue={() => advanceToNext("llm")}
          />
        );
      case "migrate":
        return (
          <StepMigrate
            migrating={migrating}
            migrationError={migrationError}
            setupComplete={setupComplete}
            projectName={projectName}
            canMigrate={canMigrate()}
            onMigrate={handleMigrate}
            onGoBack={() => {
              setMigrationError(null);
              setOpenStepId("database");
            }}
            onGoToDashboard={() => {
              if (projectId) router.push(`/dash/${projectId}`);
            }}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <Logo className="h-10 w-10" />
          <span className="text-xl font-semibold text-foreground">MemLib</span>
        </div>

        <div className="w-full rounded-lg border bg-card p-4 text-card-foreground shadow-xs">
          {/* Header */}
          <div className="mb-4 mr-2 flex flex-col justify-between sm:flex-row sm:items-center">
            <h3 className="ml-2 font-semibold text-foreground text-balance">
              Set up your project
            </h3>
            <div className="mt-2 flex items-center justify-end sm:mt-0">
              <CircularProgress
                completed={completedCount}
                total={stepDefs.length}
              />
              <div className="ml-1.5 mr-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {remainingCount}
                </span>{" "}
                out of{" "}
                <span className="font-medium text-foreground">
                  {stepDefs.length} steps
                </span>{" "}
                left
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-0">
            {stepDefs.map((step, index) => {
              const isOpen = openStepId === step.id;
              const isFirst = index === 0;
              const prevStep = stepDefs[index - 1];
              const isPrevOpen = prevStep && openStepId === prevStep.id;
              const showBorderTop = !isFirst && !isOpen && !isPrevOpen;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "group",
                    isOpen && "rounded-lg",
                    showBorderTop && "border-t border-border",
                  )}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (step.id === "migrate" && !canMigrate()) return;
                      setOpenStepId(isOpen ? "" : step.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        const tag = (e.target as HTMLElement).tagName;
                        if (
                          ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(
                            tag,
                          )
                        )
                          return;
                        e.preventDefault();
                        if (step.id === "migrate" && !canMigrate()) return;
                        setOpenStepId(isOpen ? "" : step.id);
                      }
                    }}
                    className={cn(
                      "block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isOpen && "rounded-lg",
                    )}
                  >
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-lg transition-colors",
                        isOpen && "border border-border bg-muted",
                      )}
                    >
                      <div className="relative flex items-start justify-between gap-3 py-3 pl-4 pr-2">
                        <div className="flex w-full gap-3">
                          <div className="shrink-0">
                            <StepIndicator completed={step.completed} />
                          </div>
                          <div className="mt-0.5 grow">
                            <h4
                              className={cn(
                                "font-semibold",
                                step.completed
                                  ? "text-primary"
                                  : "text-foreground",
                              )}
                            >
                              {step.title}
                            </h4>
                            <Collapsible open={isOpen}>
                              <CollapsibleContent>
                                <p className="text-pretty mt-1 text-sm text-muted-foreground">
                                  {step.description}
                                </p>
                                {renderStepContent(step.id)}
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </div>
                        {!isOpen && (
                          <IconChevronRight
                            className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
