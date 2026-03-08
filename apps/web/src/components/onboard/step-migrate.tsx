import { IconCircleCheckFilled, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export function StepMigrate({
  migrating,
  migrationError,
  setupComplete,
  projectName,
  canMigrate,
  onMigrate,
  onGoBack,
  onGoToDashboard,
}: {
  migrating: boolean;
  migrationError: string | null;
  setupComplete: boolean;
  projectName: string;
  canMigrate: boolean;
  onMigrate: () => void;
  onGoBack: () => void;
  onGoToDashboard: () => void;
}) {
  return (
    <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
      {!migrating && !migrationError && !setupComplete && (
        <Button size="sm" disabled={!canMigrate} onClick={onMigrate}>
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
          <p className="text-sm text-destructive">{migrationError}</p>
          <Button variant="outline" size="sm" onClick={onGoBack}>
            Go back and fix
          </Button>
        </div>
      )}
      {setupComplete && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <IconCircleCheckFilled className="size-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Project <strong>{projectName}</strong> is ready!
            </span>
          </div>
          <Button size="sm" onClick={onGoToDashboard}>
            Go to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
