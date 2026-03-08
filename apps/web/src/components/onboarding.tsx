"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconChevronRight,
  IconCircleCheckFilled,
  IconCircleDashed,
  IconLoader2,
} from "@tabler/icons-react";
import { cn } from "@memz/ui/lib/utils";
import { Button } from "@memz/ui/components/button";
import { Input } from "@memz/ui/components/input";
import { Label } from "@memz/ui/components/label";
import {
  Collapsible,
  CollapsibleContent,
} from "@memz/ui/components/collapsible";
import { Logo } from "@/components/sidebar/logo";
import llmModelsData from "@/lib/llm-models.json";

const EMBEDDING_PROVIDERS = [
  { id: "gemini", name: "Google Gemini" },
  { id: "openai", name: "OpenAI" },
];

const LLM_PROVIDERS = Object.entries(llmModelsData).map(([id, data]) => ({
  id,
  name: data.name,
  models: data.models,
}));

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export function Onboarding() {
  const router = useRouter();

  // Form state
  const [projectName, setProjectName] = useState("");
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [embeddingProvider, setEmbeddingProvider] = useState("");
  const [embeddingApiKey, setEmbeddingApiKey] = useState("");
  const [llmProvider, setLlmProvider] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("");

  const [migrating, setMigrating] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);

  const [openStepId, setOpenStepId] = useState("project-name");

  const selectedLlmProvider = LLM_PROVIDERS.find((p) => p.id === llmProvider);

  // Derive step completion
  const stepDefs: OnboardingStep[] = [
    {
      id: "project-name",
      title: "Name your project",
      description: "Choose a name for your memz project.",
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

  const handleStepClick = (stepId: string) => {
    if (stepId === "migrate" && !canMigrate()) return;
    setOpenStepId(openStepId === stepId ? "" : stepId);
  };

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
          llmProvider,
          llmApiKey,
          llmModel,
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

  // Progress circle
  function CircularProgress() {
    const progress =
      stepDefs.length > 0
        ? ((stepDefs.length - remainingCount) / stepDefs.length) * 100
        : 0;
    const strokeDashoffset = 100 - progress;

    return (
      <svg
        className="-rotate-90 scale-y-[-1]"
        height="14"
        width="14"
        viewBox="0 0 14 14"
      >
        <circle
          className="stroke-muted"
          cx="7"
          cy="7"
          fill="none"
          r="6"
          strokeWidth="2"
          pathLength="100"
        />
        <circle
          className="stroke-primary"
          cx="7"
          cy="7"
          fill="none"
          r="6"
          strokeWidth="2"
          pathLength="100"
          strokeDasharray="100"
          strokeLinecap="round"
          style={{ strokeDashoffset }}
        />
      </svg>
    );
  }

  function StepIndicator({ completed }: { completed: boolean }) {
    if (completed) {
      return (
        <IconCircleCheckFilled
          className="mt-1 size-4.5 shrink-0 text-primary"
          aria-hidden="true"
        />
      );
    }
    return (
      <IconCircleDashed
        className="mt-1 size-5 shrink-0 stroke-muted-foreground/40"
        strokeWidth={2}
        aria-hidden="true"
      />
    );
  }

  function advanceToNext(currentId: string) {
    const idx = stepDefs.findIndex((s) => s.id === currentId);
    if (idx < stepDefs.length - 1) {
      setOpenStepId(stepDefs[idx + 1]!.id);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <Logo className="h-10 w-10" />
          <span className="text-xl font-semibold text-foreground">memz</span>
        </div>

        <div className="w-full rounded-lg border bg-card p-4 text-card-foreground shadow-xs">
          {/* Header */}
          <div className="mb-4 mr-2 flex flex-col justify-between sm:flex-row sm:items-center">
            <h3 className="ml-2 font-semibold text-foreground text-balance">
              Set up your project
            </h3>
            <div className="mt-2 flex items-center justify-end sm:mt-0">
              <CircularProgress />
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
                    onClick={() => handleStepClick(step.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleStepClick(step.id);
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

                                {/* Step 1: Project Name */}
                                {step.id === "project-name" && (
                                  <div
                                    className="mt-3 space-y-3"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div>
                                      <Label htmlFor="project-name">
                                        Project Name
                                      </Label>
                                      <Input
                                        id="project-name"
                                        value={projectName}
                                        onChange={(e) =>
                                          setProjectName(e.target.value)
                                        }
                                        placeholder="My Project"
                                        className="mt-1.5 bg-background"
                                      />
                                    </div>
                                    <Button
                                      size="sm"
                                      disabled={!projectName.trim()}
                                      onClick={() =>
                                        advanceToNext("project-name")
                                      }
                                    >
                                      Continue
                                    </Button>
                                  </div>
                                )}

                                {/* Step 2: Database */}
                                {step.id === "database" && (
                                  <div
                                    className="mt-3 space-y-3"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div>
                                      <Label htmlFor="database-url">
                                        PostgreSQL URL
                                      </Label>
                                      <Input
                                        id="database-url"
                                        value={databaseUrl}
                                        onChange={(e) =>
                                          setDatabaseUrl(e.target.value)
                                        }
                                        placeholder="postgres://user:pass@host:5432/db"
                                        className="mt-1.5 font-mono text-xs bg-background"
                                      />
                                    </div>
                                    <Button
                                      size="sm"
                                      disabled={!databaseUrl.trim()}
                                      onClick={() => advanceToNext("database")}
                                    >
                                      Continue
                                    </Button>
                                  </div>
                                )}

                                {/* Step 3: Embedding */}
                                {step.id === "embedding" && (
                                  <div
                                    className="mt-3 space-y-3"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div>
                                      <Label htmlFor="embedding-provider">
                                        Provider
                                      </Label>
                                      <select
                                        id="embedding-provider"
                                        value={embeddingProvider}
                                        onChange={(e) =>
                                          setEmbeddingProvider(e.target.value)
                                        }
                                        className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      >
                                        <option value="">
                                          Select provider
                                        </option>
                                        {EMBEDDING_PROVIDERS.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <Label htmlFor="embedding-key">
                                        API Key
                                      </Label>
                                      <Input
                                        id="embedding-key"
                                        type="password"
                                        value={embeddingApiKey}
                                        onChange={(e) =>
                                          setEmbeddingApiKey(e.target.value)
                                        }
                                        placeholder="sk-..."
                                        className="mt-1.5 font-mono text-xs bg-background"
                                      />
                                    </div>
                                    <Button
                                      size="sm"
                                      disabled={
                                        !embeddingProvider ||
                                        !embeddingApiKey.trim()
                                      }
                                      onClick={() => advanceToNext("embedding")}
                                    >
                                      Continue
                                    </Button>
                                  </div>
                                )}

                                {/* Step 4: LLM */}
                                {step.id === "llm" && (
                                  <div
                                    className="mt-3 space-y-3"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div>
                                      <Label htmlFor="llm-provider">
                                        Provider
                                      </Label>
                                      <select
                                        id="llm-provider"
                                        value={llmProvider}
                                        onChange={(e) => {
                                          setLlmProvider(e.target.value);
                                          setLlmModel("");
                                        }}
                                        className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      >
                                        <option value="">
                                          Select provider
                                        </option>
                                        {LLM_PROVIDERS.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <Label htmlFor="llm-key">API Key</Label>
                                      <Input
                                        id="llm-key"
                                        type="password"
                                        value={llmApiKey}
                                        onChange={(e) =>
                                          setLlmApiKey(e.target.value)
                                        }
                                        placeholder="sk-..."
                                        className="mt-1.5 font-mono text-xs bg-background"
                                      />
                                    </div>
                                    {selectedLlmProvider && (
                                      <div>
                                        <Label htmlFor="llm-model">Model</Label>
                                        <select
                                          id="llm-model"
                                          value={llmModel}
                                          onChange={(e) =>
                                            setLlmModel(e.target.value)
                                          }
                                          className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        >
                                          <option value="">Select model</option>
                                          {selectedLlmProvider.models.map(
                                            (m) => (
                                              <option key={m.id} value={m.id}>
                                                {m.name}
                                              </option>
                                            ),
                                          )}
                                        </select>
                                      </div>
                                    )}
                                    <Button
                                      size="sm"
                                      disabled={
                                        !llmProvider ||
                                        !llmApiKey.trim() ||
                                        !llmModel
                                      }
                                      onClick={() => advanceToNext("llm")}
                                    >
                                      Continue
                                    </Button>
                                  </div>
                                )}

                                {/* Step 5: Migrate */}
                                {step.id === "migrate" && (
                                  <div
                                    className="mt-3 space-y-3"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {!migrating &&
                                      !migrationError &&
                                      !setupComplete && (
                                        <Button
                                          size="sm"
                                          disabled={!canMigrate()}
                                          onClick={handleMigrate}
                                        >
                                          Create project & migrate
                                        </Button>
                                      )}
                                    {migrating && (
                                      <div className="flex items-center gap-2 py-2">
                                        <IconLoader2 className="size-4 animate-spin text-primary" />
                                        <span className="text-sm text-muted-foreground">
                                          Running migrations...
                                        </span>
                                      </div>
                                    )}
                                    {migrationError && (
                                      <div className="space-y-2">
                                        <p className="text-sm text-destructive">
                                          {migrationError}
                                        </p>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setMigrationError(null);
                                            setOpenStepId("database");
                                          }}
                                        >
                                          Go back and fix
                                        </Button>
                                      </div>
                                    )}
                                    {setupComplete && (
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <IconCircleCheckFilled className="size-4 text-primary" />
                                          <span className="text-sm font-medium text-primary">
                                            Project{" "}
                                            <strong>{projectName}</strong> is
                                            ready!
                                          </span>
                                        </div>
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            router.push(`/dash/${projectId}`)
                                          }
                                        >
                                          Go to Dashboard
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
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
