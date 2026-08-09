import { Card, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-0">
        <CardTitle>{label}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <div className="flex items-end justify-between px-5 pb-5">
        <CardValue>{value}</CardValue>
        {trend && (
          <span className={cn("text-xs font-medium", trend.positive ? "text-emerald-400" : "text-red-400")}>
            {trend.positive ? "+" : ""}
            {trend.value}
          </span>
        )}
      </div>
    </Card>
  );
}
