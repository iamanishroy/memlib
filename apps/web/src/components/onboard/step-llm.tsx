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
import { LLM_PROVIDERS } from "./providers";
import { IconCheck, IconLoader2, IconX } from "@tabler/icons-react";

export function StepLlm({
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
  const selectedProvider = LLM_PROVIDERS.find((p) => p.id === provider);
  const selectedModel = selectedProvider?.models.find((m) => m.id === model);
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
          type: "llm",
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
          onValueChange={(val) => {
            if (val) onProviderChange(val);
            onModelChange("");
            onBaseUrlChange("");
            setTestResult(null);
          }}
        >
          <SelectTrigger className="mt-1.5 w-full !bg-card border-border/60 rounded-md">
            {selectedProvider ? (
              <span className="flex items-center gap-2">
                {selectedProvider.icon}
                {selectedProvider.name}
              </span>
            ) : (
              <SelectValue placeholder="Select provider" />
            )}
          </SelectTrigger>
          <SelectContent>
            {LLM_PROVIDERS.map((p) => (
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
        <Label htmlFor="llm-key">API Key</Label>
        <Input
          id="llm-key"
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
            <Label htmlFor="llm-base-url">Base URL</Label>
            <Input
              id="llm-base-url"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="mt-1.5 font-mono text-xs !bg-card border-border/60"
            />
          </div>
          <div>
            <Label htmlFor="llm-model-custom">Model</Label>
            <Input
              id="llm-model-custom"
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              placeholder="e.g. gpt-4o, llama-3.1-70b"
              className="mt-1.5 font-mono text-xs !bg-card border-border/60"
            />
          </div>
        </>
      )}
      {selectedProvider && !isCustom && selectedProvider.models.length > 0 && (
        <div>
          <Label>Model</Label>
          <Select value={model} onValueChange={(v) => v && onModelChange(v)}>
            <SelectTrigger className="mt-1.5 w-full !bg-card border-border/60 rounded-md">
              {selectedModel ? (
                <span>{selectedModel.name}</span>
              ) : (
                <SelectValue placeholder="Select model" />
              )}
            </SelectTrigger>
            <SelectContent>
              {selectedProvider.models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
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
            !model ||
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
        disabled={
          !provider || !apiKey.trim() || !model || (isCustom && !baseUrl.trim())
        }
        onClick={onContinue}
      >
        Continue
      </Button>
    </div>
  );
}
