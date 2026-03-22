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

export function StepEmbedding({
  provider,
  apiKey,
  onProviderChange,
  onApiKeyChange,
  onContinue,
}: {
  provider: string;
  apiKey: string;
  onProviderChange: (v: string) => void;
  onApiKeyChange: (v: string) => void;
  onContinue: () => void;
}) {
  const selected = EMBEDDING_PROVIDERS.find((p) => p.id === provider);

  return (
    <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
      <div>
        <Label>Provider</Label>
        <Select
          value={provider}
          onValueChange={(v) => v && onProviderChange(v)}
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
        {selected && (
          <p className="mt-1 text-xs text-muted-foreground">
            Uses {selected.models[0]?.name ?? "default model"} ({selected.models[0]?.dimensions ?? 1536}d)
          </p>
        )}
      </div>
      <Button
        size="sm"
        disabled={!provider || !apiKey.trim()}
        onClick={onContinue}
      >
        Continue
      </Button>
    </div>
  );
}
