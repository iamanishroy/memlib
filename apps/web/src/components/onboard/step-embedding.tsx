"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMBEDDING_PROVIDERS } from "./providers";
import { IconCheck, IconLoader2, IconX } from "@tabler/icons-react";

export function StepEmbedding({
  provider,
  apiKey,
  model,
  baseUrl,
  onProviderChange,
  onApiKeyChange,
  onModelChange,
  onBaseUrlChange,
  onContinue,
}: {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  onProviderChange: (v: string) => void;
  onApiKeyChange: (v: string) => void;
  onModelChange: (v: string) => void;
  onBaseUrlChange: (v: string) => void;
  onContinue: () => void;
}) {
  const selected = EMBEDDING_PROVIDERS.find((p) => p.id === provider);
  const selectedModel = selected?.models.find((m) => m.id === model);
  const isCustom = provider === "custom";
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);

  async function handleTestKey() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "embedding",
          provider,
          apiKey,
          model: model || undefined,
          baseUrl: baseUrl || undefined,
        }),
      });
      const result = await res.json();
      setTestResult(result);
    } catch {
      setTestResult({ valid: false, error: "Network error" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
      <div>
        <Label>Provider</Label>
        <Select
          value={provider}
          onValueChange={(v) => {
            if (v) onProviderChange(v);
            onModelChange("");
            setTestResult(null);
          }}
        >
          <SelectTrigger className="mt-1.5 w-full !bg-card border-border/60 rounded-md">
            {selected ? (
              <span className="flex items-center gap-2">
                {selected.icon}
                {selected.name}
              </span>
            ) : (
              <SelectValue placeholder="Select provider" />
            )}
          </SelectTrigger>
          <SelectContent>
            {EMBEDDING_PROVIDERS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  {p.icon}
                  {p.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="embedding-key">API Key</Label>
        <Input
          id="embedding-key"
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="sk-..."
          className="mt-1.5 font-mono text-xs !bg-card border-border/60"
        />
      </div>
      {isCustom && (
        <>
          <div>
            <Label htmlFor="emb-base-url">Base URL</Label>
            <Input
              id="emb-base-url"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="mt-1.5 font-mono text-xs !bg-card border-border/60"
            />
          </div>
          <div>
            <Label htmlFor="emb-model">Model</Label>
            <Input
              id="emb-model"
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              placeholder="e.g. text-embedding-3-small"
              className="mt-1.5 font-mono text-xs !bg-card border-border/60"
            />
          </div>
        </>
      )}
      {selected && !isCustom && selected.models.length > 0 && (
        <div>
          <Label>Model</Label>
          <Select value={model} onValueChange={(v) => v && onModelChange(v)}>
            <SelectTrigger className="mt-1.5 w-full !bg-card border-border/60 rounded-md">
              {selectedModel ? (
                <span>
                  {selectedModel.name}{" "}
                  <span className="text-muted-foreground text-xs">
                    ({selectedModel.dimensions}d)
                  </span>
                </span>
              ) : (
                <SelectValue placeholder="Select model" />
              )}
            </SelectTrigger>
            <SelectContent>
              {selected.models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}{" "}
                  <span className="text-muted-foreground">
                    ({m.dimensions}d)
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={
            !provider ||
            !apiKey.trim() ||
            testing ||
            (isCustom && !baseUrl.trim())
          }
          onClick={handleTestKey}
        >
          {testing ? (
            <IconLoader2 className="size-3.5 animate-spin mr-1" />
          ) : null}
          Test Key
        </Button>
        {testResult && (
          <span
            className={`flex items-center gap-1 text-xs ${testResult.valid ? "text-green-500" : "text-destructive"}`}
          >
            {testResult.valid ? (
              <>
                <IconCheck className="size-3.5" /> Valid
              </>
            ) : (
              <>
                <IconX className="size-3.5" /> {testResult.error || "Invalid"}
              </>
            )}
          </span>
        )}
      </div>
      <Button
        size="sm"
        disabled={!provider || !apiKey.trim() || (isCustom && !baseUrl.trim())}
        onClick={onContinue}
      >
        Continue
      </Button>
    </div>
  );
}
