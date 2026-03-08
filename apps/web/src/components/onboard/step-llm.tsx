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

export function StepLlm({
  provider,
  apiKey,
  model,
  onProviderChange,
  onApiKeyChange,
  onModelChange,
  onContinue,
}: {
  provider: string;
  apiKey: string;
  model: string;
  onProviderChange: (v: string) => void;
  onApiKeyChange: (v: string) => void;
  onModelChange: (v: string) => void;
  onContinue: () => void;
}) {
  const selectedProvider = LLM_PROVIDERS.find((p) => p.id === provider);
  const selectedModel = selectedProvider?.models.find((m) => m.id === model);

  return (
    <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
      <div>
        <Label>Provider</Label>
        <Select
          value={provider}
          onValueChange={(val) => {
            if (val) onProviderChange(val);
            onModelChange("");
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
      {selectedProvider && (
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
      <Button
        size="sm"
        disabled={!provider || !apiKey.trim() || !model}
        onClick={onContinue}
      >
        Continue
      </Button>
    </div>
  );
}
