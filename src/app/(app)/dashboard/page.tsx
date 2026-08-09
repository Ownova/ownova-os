import { DollarSign, Wallet, Users, FolderKanban, UsersRound, ListChecks } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { MoneyStatCard } from "@/components/dashboard/money-stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ClientGrowthChart } from "@/components/dashboard/client-growth-chart";
import { ProjectStatusCards } from "@/components/dashboard/project-status";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AIInsightsPanel } from "@/components/dashboard/ai-insights";
import { getDashboardStats, getRevenueByMonth, getClientGrowth, getRecentActivity } from "@/lib/data/dashboard";
import { getProjects } from "@/lib/data/projects";
import { requireInternalPage } from "@/lib/auth-guard";

export default async function DashboardPage() {
  await requireInternalPage();

  const [stats, revenueByMonth, clientGrowth, recentActivity, projects] = await Promise.all([
    getDashboardStats(),
    getRevenueByMonth(),
    getClientGrowth(),
    getRecentActivity(),
    getProjects(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground">Everything about the agency, at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyStatCard
          label="Monthly Revenue"
          totals={stats.monthlyRevenue}
          icon={DollarSign}
          trend={
            stats.revenueChangePct === null
              ? undefined
              : { value: `${Math.abs(stats.revenueChangePct).toFixed(1)}%`, positive: stats.revenueChangePct >= 0 }
          }
        />
        <MoneyStatCard label="Annual Revenue" totals={stats.annualRevenue} icon={DollarSign} />
        <MoneyStatCard
          label="Outstanding Payments"
          totals={stats.outstanding}
          icon={Wallet}
          trend={stats.overdueInvoices > 0 ? { value: `${stats.overdueInvoices} overdue`, positive: false } : undefined}
        />
        <StatCard label="Active Clients" value={String(stats.activeClients)} icon={Users} />
        <StatCard label="Active Projects" value={String(stats.activeProjects)} icon={FolderKanban} />
        <StatCard label="Team Members" value={String(stats.teamMembers)} icon={UsersRound} />
        <StatCard label="Pending Tasks" value={String(stats.pendingTasks)} icon={ListChecks} />
        <StatCard
          label="Upcoming Meetings"
          value={stats.upcomingMeetings === 1 ? "1 this week" : `${stats.upcomingMeetings} this week`}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <RevenueChart revenueByMonth={revenueByMonth} />
          <ClientGrowthChart clientGrowth={clientGrowth} />
        </div>
        <div className="space-y-4">
          <AIInsightsPanel stats={stats} />
          <ActivityFeed recentActivity={recentActivity} />
        </div>
      </div>

      <ProjectStatusCards projects={projects} />
    </div>
  );
}
