import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import type { DashboardStats } from "@/lib/data/dashboard";
import { formatCurrency } from "@/lib/utils";

/**
 * Derives plain-language observations from the real numbers already loaded for the dashboard.
 * These are rule-based, not model-generated -- previously this panel rendered a hardcoded list
 * naming clients that may not exist, which read as real analysis of the account. Anything shown
 * here now traces back to an actual figure.
 */
function buildInsights(stats: DashboardStats): string[] {
  const insights: string[] = [];

  if (stats.overdueInvoices > 0) {
    insights.push(
      `${stats.overdueInvoices} invoice${stats.overdueInvoices === 1 ? " is" : "s are"} past due, ` +
        `totalling ${formatCurrency(stats.outstanding)} outstanding — worth a follow-up.`
    );
  }

  if (stats.revenueChangePct !== null && Math.abs(stats.revenueChangePct) >= 5) {
    const direction = stats.revenueChangePct >= 0 ? "up" : "down";
    insights.push(
      `Revenue is ${direction} ${Math.abs(stats.revenueChangePct).toFixed(1)}% versus last month ` +
        `(${formatCurrency(stats.monthlyRevenue)} so far).`
    );
  }

  if (stats.activeProjects > 0 && stats.pendingTasks / stats.activeProjects > 15) {
    insights.push(
      `${stats.pendingTasks} open tasks across ${stats.activeProjects} active project` +
        `${stats.activeProjects === 1 ? "" : "s"} — worth checking whether scope has crept.`
    );
  }

  if (stats.upcomingMeetings > 0) {
    insights.push(
      `${stats.upcomingMeetings} meeting${stats.upcomingMeetings === 1 ? "" : "s"} scheduled in the next 7 days.`
    );
  }

  return insights;
}

export function AIInsightsPanel({ stats }: { stats: DashboardStats }) {
  const insights = buildInsights(stats);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Sparkles className="h-4 w-4 text-primary" />
        <CardTitle className="text-foreground text-base font-semibold">Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {insights.length === 0 ? (
          <p className="rounded-lg bg-muted/40 p-3 text-sm leading-snug text-muted-foreground">
            Nothing needs attention right now. Insights appear here as invoices, projects, and
            meetings are added.
          </p>
        ) : (
          insights.map((insight, idx) => (
            <p key={idx} className="rounded-lg bg-muted/40 p-3 text-sm leading-snug text-foreground/90">
              {insight}
            </p>
          ))
        )}
      </CardContent>
    </Card>
  );
}
