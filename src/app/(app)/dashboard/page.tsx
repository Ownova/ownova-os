import { DollarSign, Wallet, Users, FolderKanban, UsersRound, ListChecks } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ClientGrowthChart } from "@/components/dashboard/client-growth-chart";
import { ProjectStatusCards } from "@/components/dashboard/project-status";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AIInsightsPanel } from "@/components/dashboard/ai-insights";
import { formatCurrency } from "@/lib/utils";
import { getDashboardStats, getRevenueByMonth, getClientGrowth, getRecentActivity } from "@/lib/data/dashboard";
import { getProjects } from "@/lib/data/projects";

export default async function DashboardPage() {
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
        <StatCard label="Monthly Revenue" value={formatCurrency(stats.monthlyRevenue)} icon={DollarSign} trend={{ value: "12.4%", positive: true }} />
        <StatCard label="Annual Revenue" value={formatCurrency(stats.annualRevenue)} icon={DollarSign} />
        <StatCard label="Outstanding Payments" value={formatCurrency(stats.outstanding)} icon={Wallet} trend={{ value: "3 overdue", positive: false }} />
        <StatCard label="Active Clients" value={String(stats.activeClients)} icon={Users} />
        <StatCard label="Active Projects" value={String(stats.activeProjects)} icon={FolderKanban} />
        <StatCard label="Team Members" value={String(stats.teamMembers)} icon={UsersRound} />
        <StatCard label="Pending Tasks" value={String(stats.pendingTasks)} icon={ListChecks} />
        <StatCard label="Upcoming Meetings" value="4 this week" icon={Users} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <RevenueChart revenueByMonth={revenueByMonth} />
          <ClientGrowthChart clientGrowth={clientGrowth} />
        </div>
        <div className="space-y-4">
          <AIInsightsPanel />
          <ActivityFeed recentActivity={recentActivity} />
        </div>
      </div>

      <ProjectStatusCards projects={projects} />
    </div>
  );
}
