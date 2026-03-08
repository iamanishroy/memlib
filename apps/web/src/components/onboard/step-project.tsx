import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function StepProject({
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
        <Label htmlFor="project-name">Project Name</Label>
        <Input
          id="project-name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="My Project"
          className="mt-1.5 !bg-card border-border/60"
        />
      </div>
      <Button size="sm" disabled={!value.trim()} onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}
