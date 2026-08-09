import { query, isAwsDbConfigured } from "@/lib/aws/db";
import {
  revenueByMonth as mockRevenueByMonth,
  clientGrowth as mockClientGrowth,
  recentActivity as mockRecentActivity,
  dashboardStats as mockDashboardStats,
} from "@/lib/mock-data";
import { getRecentActivity as getRecentActivityFromLog } from "@/lib/data/activity";
import { toCurrencyTotals, type CurrencyTotals } from "@/lib/money";
import type { ActivityItem } from "@/types";

export interface DashboardStats {
  // Money figures are kept per currency rather than summed. The agency invoices in USD, PKR,
  // AED, EUR and GBP, and adding those together produces a meaningless number (see lib/money.ts).
  monthlyRevenue: CurrencyTotals;
  annualRevenue: CurrencyTotals;
  outstanding: CurrencyTotals;
  activeClients: number;
  activeProjects: number;
  teamMembers: number;
  pendingTasks: number;
  /** Invoices past their due date and not yet settled. */
  overdueInvoices: number;
  /** Calendar events of type 'meeting' in the next 7 days. */
  upcomingMeetings: number;
  /**
   * Percentage change in revenue vs the previous calendar month. Null when last month had no
   * revenue at all, since "up from zero" isn't a meaningful percentage -- the UI hides the
   * trend badge in that case rather than printing a fake number.
   */
  revenueChangePct: number | null;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!isAwsDbConfigured) return mockDashboardStats();

  const [
    revenueRows,
    outstandingRows,
    [clientsCount],
    [projectsCount],
    [teamCount],
    [tasksCount],
    [overdueCount],
    [meetingsCount],
  ] = await Promise.all([
    // Payments carry no currency of their own -- they inherit it from the invoice they settle,
    // hence the join.
    query<{ currency: string; monthly: number; annual: number; prev_month: number }>(
      `select i.currency::text as currency,
         coalesce(sum(p.amount) filter (where date_trunc('month', p.paid_at) = date_trunc('month', now())), 0) as monthly,
         coalesce(sum(p.amount) filter (where p.paid_at >= date_trunc('year', now())), 0) as annual,
         coalesce(sum(p.amount) filter (
           where date_trunc('month', p.paid_at) = date_trunc('month', now() - interval '1 month')
         ), 0) as prev_month
       from payments p join invoices i on i.id = p.invoice_id
       where p.status = 'paid'
       group by 1`
    ),
    query<{ currency: string; total: number }>(
      `select currency, coalesce(sum(total_amount), 0) as total from (
         select i.id, i.currency::text as currency,
                sum(ii.quantity * ii.rate - ii.discount + ii.tax) as total_amount
         from invoices i join invoice_items ii on ii.invoice_id = i.id
         where i.status in ('pending', 'overdue', 'partially_paid')
         group by i.id, i.currency
       ) t group by currency`
    ),
    query<{ count: number }>(`select count(*)::int as count from clients where stage <> 'lost'`),
    query<{ count: number }>(`select count(*)::int as count from projects where status in ('in_progress', 'planning')`),
    query<{ count: number }>(`select count(*)::int as count from users`),
    query<{ count: number }>(`select count(*)::int as count from project_tasks where status <> 'done'`),
    query<{ count: number }>(
      `select count(*)::int as count from invoices
       where status in ('pending', 'overdue', 'partially_paid') and due_date < current_date`
    ),
    query<{ count: number }>(
      `select count(*)::int as count from calendar_events
       where type = 'meeting'
         and event_date >= current_date
         and event_date < current_date + interval '7 days'`
    ),
  ]);

  const monthlyRevenue = toCurrencyTotals(
    revenueRows.map((r) => ({ currency: r.currency, amount: Number(r.monthly) }))
  );
  const annualRevenue = toCurrencyTotals(
    revenueRows.map((r) => ({ currency: r.currency, amount: Number(r.annual) }))
  );
  const outstanding = toCurrencyTotals(
    outstandingRows.map((r) => ({ currency: r.currency, amount: Number(r.total) }))
  );

  // The month-over-month trend only makes sense within a single currency, so it is computed for
  // the currency with the largest current-month revenue and suppressed when books are mixed.
  const byMonthly = [...revenueRows].sort((a, b) => Number(b.monthly) - Number(a.monthly));
  const lead = byMonthly[0];
  const leadMonthly = Number(lead?.monthly ?? 0);
  const leadPrev = Number(lead?.prev_month ?? 0);
  const singleCurrency = revenueRows.length <= 1;

  return {
    monthlyRevenue,
    annualRevenue,
    outstanding,
    activeClients: clientsCount?.count ?? 0,
    activeProjects: projectsCount?.count ?? 0,
    teamMembers: teamCount?.count ?? 0,
    pendingTasks: tasksCount?.count ?? 0,
    overdueInvoices: overdueCount?.count ?? 0,
    upcomingMeetings: meetingsCount?.count ?? 0,
    revenueChangePct:
      singleCurrency && leadPrev > 0 ? ((leadMonthly - leadPrev) / leadPrev) * 100 : null,
  };
}

/** Last 6 calendar months (oldest first), e.g. ["Mar", "Apr", ..., "Aug"]. */
function last6MonthLabels(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-US", { month: "short" }) });
  }
  return out;
}

export async function getRevenueByMonth(): Promise<{ month: string; revenue: number; expenses: number }[]> {
  if (!isAwsDbConfigured) return mockRevenueByMonth;

  const [revenueRows, expenseRows] = await Promise.all([
    query<{ y: number; m: number; total: number }>(
      `select extract(year from paid_at)::int as y, extract(month from paid_at)::int as m, sum(amount) as total
       from payments where status = 'paid' and paid_at >= now() - interval '6 months'
       group by 1, 2`
    ),
    query<{ y: number; m: number; total: number }>(
      `select extract(year from spent_on)::int as y, extract(month from spent_on)::int as m, sum(amount) as total
       from expenses where spent_on >= now() - interval '6 months'
       group by 1, 2`
    ),
  ]);

  const revenueByKey = new Map(revenueRows.map((r) => [`${r.y}-${r.m - 1}`, Number(r.total)]));
  const expensesByKey = new Map(expenseRows.map((r) => [`${r.y}-${r.m - 1}`, Number(r.total)]));

  return last6MonthLabels().map(({ key, label }) => ({
    month: label,
    revenue: revenueByKey.get(key) ?? 0,
    expenses: expensesByKey.get(key) ?? 0,
  }));
}

export async function getClientGrowth(): Promise<{ month: string; clients: number }[]> {
  if (!isAwsDbConfigured) return mockClientGrowth;

  const months = last6MonthLabels();
  const windowStart = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

  const [[baseline], newClientRows] = await Promise.all([
    query<{ count: number }>(`select count(*)::int as count from clients where created_at < :windowStart`, { windowStart }),
    query<{ y: number; m: number; count: number }>(
      `select extract(year from created_at)::int as y, extract(month from created_at)::int as m, count(*)::int as count
       from clients where created_at >= :windowStart group by 1, 2`,
      { windowStart }
    ),
  ]);

  const newByKey = new Map(newClientRows.map((r) => [`${r.y}-${r.m - 1}`, r.count]));
  let running = baseline?.count ?? 0;
  return months.map(({ key, label }) => {
    running += newByKey.get(key) ?? 0;
    return { month: label, clients: running };
  });
}

/**
 * Activity now comes from the real audit_log (see lib/data/activity.ts), written to by each
 * create action. Mock events are only used when there's no database configured at all.
 */
export async function getRecentActivity(): Promise<ActivityItem[]> {
  if (!isAwsDbConfigured) return mockRecentActivity;
  return getRecentActivityFromLog();
}
