import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Database, User } from "lucide-react";

interface StatsBarProps {
  totalMemories: number;
  namespaceCount: number;
  entityCount: number;
  loading?: boolean;
}

const icons = [Brain, Database, User];
const colors = [
  "text-violet-500",
  "text-blue-500",
  "text-emerald-500",
];

export function StatsBar({
  totalMemories,
  namespaceCount,
  entityCount,
  loading,
}: StatsBarProps) {
  const items = [
    { label: "Total Memories", value: totalMemories },
    { label: "Namespaces", value: namespaceCount },
    { label: "Entities", value: entityCount },
  ];

  return (
    <div className="grid grid-cols-1 divide-y bg-border divide-border overflow-hidden rounded-lg md:grid-cols-3 md:divide-x md:divide-y-0">
      {items.map((item, i) => {
        const Icon = icons[i]!;
        return (
          <Card
            key={item.label}
            className="rounded-none border-0 shadow-sm py-0"
          >
            <CardContent className="p-4 sm:p-5">
              <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                <Icon className={`size-4 ${colors[i]}`} />
                {item.label}
              </CardTitle>
              {loading ? (
                <Skeleton className="h-8 w-16 mt-2" />
              ) : (
                <div className="mt-1 tabular-nums text-2xl font-semibold text-primary">
                  {item.value.toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
