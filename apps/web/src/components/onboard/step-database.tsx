import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function StepDatabase({
  value,
  onChange,
  onContinue,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
      <div>
        <Label htmlFor="database-url">PostgreSQL URL</Label>
        <Input
          id="database-url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="postgres://user:pass@host:5432/db"
          className="mt-1.5 font-mono text-xs !bg-card border-border/60"
        />
      </div>
      <Button size="sm" disabled={!value.trim()} onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}
