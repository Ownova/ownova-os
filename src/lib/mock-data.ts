import type {
  Client,
  Project,
  Invoice,
  Expense,
  ActivityItem,
  TeamMember,
  ProjectTask,
  Quotation,
  Payment,
  CalendarEvent,
  DocumentFile,
} from "@/types";

// Demo/seed data. This mirrors the shape of the Supabase schema in supabase/migrations/0001_init.sql
// so it can be swapped for real queries once NEXT_PUBLIC_SUPABASE_URL is configured.

export const teamMembers: TeamMember[] = [
  { id: "tm_1", name: "Ayesha Khan", email: "ayesha@ownova.org", role: "ceo", department: "Leadership" },
  { id: "tm_2", name: "Bilal Ahmed", email: "bilal@ownova.org", role: "sales", department: "Sales" },
  { id: "tm_3", name: "Hina Raza", email: "hina@ownova.org", role: "developer", department: "Engineering" },
  { id: "tm_4", name: "Omar Farooq", email: "omar@ownova.org", role: "marketing", department: "Marketing" },
  { id: "tm_5", name: "Sara Malik", email: "sara@ownova.org", role: "finance", department: "Finance" },
];

export const clients: Client[] = [
  {
    id: "cl_1",
    name: "John Carter",
    company: "Brightline Retail",
    email: "john@brightline.com",
    phone: "+1 415 555 0142",
    stage: "negotiation",
    value: 18500,
    owner: "Bilal Ahmed",
    tags: ["meta-ads", "priority"],
    lastActivity: "2026-08-03",
    createdAt: "2026-06-12",
  },
  {
    id: "cl_2",
    name: "Maria Lopez",
    company: "NovaFit Studios",
    email: "maria@novafit.io",
    phone: "+1 212 555 0110",
    stage: "won",
    value: 42000,
    owner: "Ayesha Khan",
    tags: ["web-dev", "automation"],
    lastActivity: "2026-08-01",
    createdAt: "2026-05-02",
  },
  {
    id: "cl_3",
    name: "Tariq Iqbal",
    company: "Iqbal Textiles",
    email: "tariq@iqbaltex.pk",
    phone: "+92 300 1234567",
    stage: "proposal_sent",
    value: 9500,
    owner: "Bilal Ahmed",
    tags: ["chatbot"],
    lastActivity: "2026-07-29",
    createdAt: "2026-07-01",
  },
  {
    id: "cl_4",
    name: "Emily Chen",
    company: "Chen & Co Law",
    email: "emily@chenlaw.com",
    phone: "+1 646 555 0199",
    stage: "meeting",
    value: 6200,
    owner: "Ayesha Khan",
    tags: ["automation"],
    lastActivity: "2026-07-27",
    createdAt: "2026-07-15",
  },
  {
    id: "cl_5",
    name: "David Osei",
    company: "Osei Logistics",
    email: "david@oseilogistics.com",
    phone: "+44 20 7946 0958",
    stage: "contacted",
    value: 15000,
    owner: "Bilal Ahmed",
    tags: ["mobile-app"],
    lastActivity: "2026-07-25",
    createdAt: "2026-07-10",
  },
  {
    id: "cl_6",
    name: "Priya Nair",
    company: "Nair Wellness",
    email: "priya@nairwellness.com",
    phone: "+91 98765 43210",
    stage: "lead",
    value: 4000,
    owner: "Omar Farooq",
    tags: ["social-media"],
    lastActivity: "2026-07-22",
    createdAt: "2026-07-20",
  },
  {
    id: "cl_7",
    name: "James Walsh",
    company: "Walsh Realty",
    email: "james@walshrealty.com",
    phone: "+1 617 555 0176",
    stage: "lost",
    value: 8000,
    owner: "Bilal Ahmed",
    tags: ["meta-ads"],
    lastActivity: "2026-07-10",
    createdAt: "2026-06-18",
  },
];

export const projects: Project[] = [
  {
    id: "pr_1",
    name: "NovaFit Website Rebuild",
    clientId: "cl_2",
    clientName: "NovaFit Studios",
    status: "in_progress",
    budget: 42000,
    spent: 21500,
    startDate: "2026-06-01",
    dueDate: "2026-09-15",
    progress: 55,
    team: ["Hina Raza", "Omar Farooq"],
    description: "Full site rebuild on Next.js with booking automation and CRM sync.",
  },
  {
    id: "pr_2",
    name: "Iqbal Textiles WhatsApp Bot",
    clientId: "cl_3",
    clientName: "Iqbal Textiles",
    status: "planning",
    budget: 9500,
    spent: 800,
    startDate: "2026-08-01",
    dueDate: "2026-09-01",
    progress: 10,
    team: ["Hina Raza"],
    description: "WhatsApp ordering assistant with inventory lookups.",
  },
  {
    id: "pr_3",
    name: "Brightline Retail Meta Ads",
    clientId: "cl_1",
    clientName: "Brightline Retail",
    status: "review",
    budget: 18500,
    spent: 17200,
    startDate: "2026-06-20",
    dueDate: "2026-08-10",
    progress: 90,
    team: ["Omar Farooq", "Bilal Ahmed"],
    description: "Q3 Meta Ads campaign management and creative testing.",
  },
  {
    id: "pr_4",
    name: "Osei Logistics Driver App",
    clientId: "cl_5",
    clientName: "Osei Logistics",
    status: "on_hold",
    budget: 15000,
    spent: 2000,
    startDate: "2026-07-15",
    dueDate: "2026-10-30",
    progress: 8,
    team: ["Hina Raza"],
    description: "Mobile app for driver dispatch and delivery tracking.",
  },
];

export const projectTasks: ProjectTask[] = [
  { id: "tk_1", projectId: "pr_1", title: "Design system in Figma", status: "done", priority: "high", assignee: "Omar Farooq", dueDate: "2026-06-20", labels: ["design"] },
  { id: "tk_2", projectId: "pr_1", title: "Booking flow integration", status: "in_progress", priority: "high", assignee: "Hina Raza", dueDate: "2026-08-10", labels: ["dev"] },
  { id: "tk_3", projectId: "pr_1", title: "CRM webhook sync", status: "todo", priority: "medium", assignee: "Hina Raza", dueDate: "2026-08-20", labels: ["dev", "integration"] },
  { id: "tk_4", projectId: "pr_3", title: "Creative refresh", status: "in_review", priority: "urgent", assignee: "Omar Farooq", dueDate: "2026-08-06", labels: ["ads"] },
  { id: "tk_5", projectId: "pr_2", title: "Menu & inventory schema", status: "todo", priority: "medium", assignee: "Hina Raza", dueDate: "2026-08-12", labels: ["dev"] },
];

export const invoices: Invoice[] = [
  {
    id: "inv_1",
    number: "INV-2026-0001",
    clientId: "cl_2",
    clientName: "NovaFit Studios",
    status: "paid",
    currency: "USD",
    issueDate: "2026-07-01",
    dueDate: "2026-07-15",
    items: [{ id: "i1", description: "Website Rebuild - Milestone 1", quantity: 1, rate: 15000, discount: 0, tax: 0 }],
    total: 15000,
  },
  {
    id: "inv_2",
    number: "INV-2026-0002",
    clientId: "cl_1",
    clientName: "Brightline Retail",
    status: "pending",
    currency: "USD",
    issueDate: "2026-07-20",
    dueDate: "2026-08-10",
    items: [{ id: "i2", description: "Meta Ads Management - July", quantity: 1, rate: 6200, discount: 0, tax: 0 }],
    total: 6200,
  },
  {
    id: "inv_3",
    number: "INV-2026-0003",
    clientId: "cl_3",
    clientName: "Iqbal Textiles",
    status: "overdue",
    currency: "USD",
    issueDate: "2026-06-15",
    dueDate: "2026-06-30",
    items: [{ id: "i3", description: "WhatsApp Bot - Deposit", quantity: 1, rate: 2500, discount: 0, tax: 0 }],
    total: 2500,
  },
  {
    id: "inv_4",
    number: "INV-2026-0004",
    clientId: "cl_5",
    clientName: "Osei Logistics",
    status: "draft",
    currency: "GBP",
    issueDate: "2026-08-01",
    dueDate: "2026-08-20",
    items: [{ id: "i4", description: "Driver App - Discovery Sprint", quantity: 1, rate: 3000, discount: 0, tax: 0 }],
    total: 3000,
  },
  {
    id: "inv_6",
    number: "OWNOVA-2026-002",
    clientId: "cl_1",
    clientName: "John (Mallae Car)",
    clientPhone: "+971 58 553 6642",
    clientEmail: "bai254497767@gmail.com",
    status: "pending",
    currency: "PKR",
    issueDate: "2026-08-07",
    dueDate: "2026-08-14",
    serviceLabel: "Growth Social Media Management Plan",
    engagement: "Monthly Retainer + One-Time Setup",
    items: [
      {
        id: "i6a",
        description:
          "Growth Social Media Management Plan\n12 designed social media posts\n2 reels\nCaption writing\nHashtag research\nMonthly performance report",
        quantity: 1,
        rate: 75000,
        discount: 0,
        tax: 0,
      },
      {
        id: "i6b",
        description:
          "Pixel Setup Code & Instructions\nTracking pixel implementation code with step-by-step installation instructions — one-time setup.",
        quantity: 1,
        rate: 37000,
        discount: 0,
        tax: 0,
      },
    ],
    notes:
      "Deliverables are scheduled across the billing month per the agreed content calendar. Revisions are included as per plan scope.",
    total: 112000,
  },
  {
    id: "inv_5",
    number: "INV-2026-0005",
    clientId: "cl_2",
    clientName: "NovaFit Studios",
    status: "partially_paid",
    currency: "USD",
    issueDate: "2026-07-25",
    dueDate: "2026-08-08",
    items: [{ id: "i5", description: "Website Rebuild - Milestone 2", quantity: 1, rate: 12000, discount: 0, tax: 0 }],
    total: 12000,
  },
];

export const expenses: Expense[] = [
  { id: "ex_1", category: "AI Tools", description: "Claude + OpenAI subscriptions", amount: 480, date: "2026-08-01" },
  { id: "ex_2", category: "Hosting", description: "Vercel + Supabase", amount: 220, date: "2026-08-01" },
  { id: "ex_3", category: "Ads", description: "LinkedIn awareness campaign", amount: 900, date: "2026-07-28" },
  { id: "ex_4", category: "Salary", description: "Contractor payroll", amount: 12500, date: "2026-07-31" },
  { id: "ex_5", category: "Subscriptions", description: "Figma + Notion + Linear", amount: 160, date: "2026-07-15" },
];

export const quotations: Quotation[] = [
  {
    id: "qt_1",
    number: "QTN-2026-0001",
    clientId: "cl_4",
    clientName: "Chen & Co Law",
    status: "sent",
    currency: "USD",
    issueDate: "2026-07-28",
    validUntil: "2026-08-28",
    items: [
      { id: "qi1", description: "Client intake automation build", quantity: 1, rate: 5200, discount: 0, tax: 0 },
      { id: "qi2", description: "Document generation workflow", quantity: 1, rate: 1000, discount: 0, tax: 0 },
    ],
    terms: "50% deposit to begin. Balance on delivery. Valid 30 days.",
    total: 6200,
  },
  {
    id: "qt_2",
    number: "QTN-2026-0002",
    clientId: "cl_6",
    clientName: "Nair Wellness",
    status: "draft",
    currency: "USD",
    issueDate: "2026-08-02",
    validUntil: "2026-09-02",
    items: [{ id: "qi3", description: "Social media management - 3 months", quantity: 3, rate: 1350, discount: 50, tax: 0 }],
    terms: "Monthly billing. Cancel with 30 days notice.",
    total: 4000,
  },
  {
    id: "qt_3",
    number: "QTN-2026-0003",
    clientId: "cl_5",
    clientName: "Osei Logistics",
    status: "accepted",
    currency: "GBP",
    issueDate: "2026-07-05",
    validUntil: "2026-08-05",
    items: [{ id: "qi4", description: "Driver app - discovery & design sprint", quantity: 1, rate: 3000, discount: 0, tax: 0 }],
    total: 3000,
  },
  {
    id: "qt_4",
    number: "QTN-2026-0004",
    clientId: "cl_7",
    clientName: "Walsh Realty",
    status: "declined",
    currency: "USD",
    issueDate: "2026-06-20",
    validUntil: "2026-07-20",
    items: [{ id: "qi5", description: "Meta Ads retainer - Q3", quantity: 1, rate: 8000, discount: 0, tax: 0 }],
    total: 8000,
  },
];

export const payments: Payment[] = [
  { id: "pm_1", invoiceId: "inv_1", amount: 15000, method: "bank_transfer", status: "paid", date: "2026-07-12" },
  { id: "pm_2", invoiceId: "inv_5", amount: 6000, method: "stripe", status: "partial", date: "2026-08-02" },
  { id: "pm_3", invoiceId: "inv_2", amount: 6200, method: "wise", status: "pending", date: "2026-08-10" },
  { id: "pm_4", invoiceId: "inv_3", amount: 2500, method: "payoneer", status: "overdue", date: "2026-06-30" },
  { id: "pm_5", invoiceId: "inv_1", amount: 500, method: "paypal", status: "refunded", date: "2026-07-18" },
];

export const calendarEvents: CalendarEvent[] = [
  { id: "ev_1", title: "Kickoff call — Chen & Co Law", date: "2026-08-06", type: "meeting", relatedTo: "Chen & Co Law" },
  { id: "ev_2", title: "INV-2026-0002 due", date: "2026-08-10", type: "invoice_due", relatedTo: "Brightline Retail" },
  { id: "ev_3", title: "Brightline Meta Ads delivery", date: "2026-08-10", type: "deadline", relatedTo: "Brightline Retail" },
  { id: "ev_4", title: "Booking flow integration due", date: "2026-08-10", type: "task", relatedTo: "NovaFit Studios" },
  { id: "ev_5", title: "Weekly team standup", date: "2026-08-12", type: "meeting" },
  { id: "ev_6", title: "Menu & inventory schema due", date: "2026-08-12", type: "task", relatedTo: "Iqbal Textiles" },
  { id: "ev_7", title: "INV-2026-0004 due", date: "2026-08-20", type: "invoice_due", relatedTo: "Osei Logistics" },
  { id: "ev_8", title: "CRM webhook sync due", date: "2026-08-20", type: "task", relatedTo: "NovaFit Studios" },
  { id: "ev_9", title: "Quarterly finance review", date: "2026-08-27", type: "meeting" },
];

export const documents: DocumentFile[] = [
  { id: "dc_1", name: "NovaFit_MSA_signed.pdf", folder: "Contracts", sizeKb: 412, uploadedBy: "Ayesha Khan", uploadedAt: "2026-05-04", version: 2 },
  { id: "dc_2", name: "INV-2026-0001.pdf", folder: "Invoices", sizeKb: 88, uploadedBy: "Sara Malik", uploadedAt: "2026-07-01", version: 1 },
  { id: "dc_3", name: "QTN-2026-0001.pdf", folder: "Quotations", sizeKb: 94, uploadedBy: "Bilal Ahmed", uploadedAt: "2026-07-28", version: 1 },
  { id: "dc_4", name: "Ownova_Logo_Pack.zip", folder: "Brand Assets", sizeKb: 3820, uploadedBy: "Omar Farooq", uploadedAt: "2026-04-11", version: 3 },
  { id: "dc_5", name: "Brightline_creative_v4.fig", folder: "Client Files", sizeKb: 15200, uploadedBy: "Omar Farooq", uploadedAt: "2026-07-22", version: 4 },
  { id: "dc_6", name: "Iqbal_Textiles_NDA.pdf", folder: "Contracts", sizeKb: 205, uploadedBy: "Ayesha Khan", uploadedAt: "2026-07-02", version: 1 },
];

export const revenueByMonth = [
  { month: "Mar", revenue: 24000, expenses: 14000 },
  { month: "Apr", revenue: 28500, expenses: 15200 },
  { month: "May", revenue: 31200, expenses: 16800 },
  { month: "Jun", revenue: 39800, expenses: 18100 },
  { month: "Jul", revenue: 45600, expenses: 19750 },
  { month: "Aug", revenue: 21000, expenses: 9200 },
];

export const clientGrowth = [
  { month: "Mar", clients: 12 },
  { month: "Apr", clients: 15 },
  { month: "May", clients: 19 },
  { month: "Jun", clients: 24 },
  { month: "Jul", clients: 29 },
  { month: "Aug", clients: 31 },
];

export const recentActivity: ActivityItem[] = [
  { id: "ac_1", type: "invoice", message: "Invoice INV-2026-0001 marked as Paid by NovaFit Studios", timestamp: "2026-08-04T10:20:00Z" },
  { id: "ac_2", type: "client", message: "New lead added: Priya Nair (Nair Wellness)", timestamp: "2026-08-04T08:05:00Z" },
  { id: "ac_3", type: "project", message: "Brightline Retail Meta Ads moved to Review", timestamp: "2026-08-03T16:40:00Z" },
  { id: "ac_4", type: "task", message: "Hina Raza completed 'Design system in Figma'", timestamp: "2026-08-03T11:00:00Z" },
  { id: "ac_5", type: "payment", message: "Partial payment of $6,000 received from NovaFit Studios", timestamp: "2026-08-02T14:15:00Z" },
];

export function dashboardStats() {
  const monthlyRevenue = revenueByMonth[revenueByMonth.length - 1].revenue;
  const annualRevenue = revenueByMonth.reduce((sum, m) => sum + m.revenue, 0);
  const outstanding = invoices
    .filter((i) => ["pending", "overdue", "partially_paid"].includes(i.status))
    .reduce((sum, i) => sum + i.total, 0);
  const activeClients = clients.filter((c) => !["lost"].includes(c.stage)).length;
  const activeProjects = projects.filter((p) => p.status === "in_progress" || p.status === "planning").length;
  const pendingTasks = projectTasks.filter((t) => t.status !== "done").length;
  const overdueInvoices = invoices.filter((i) => i.status === "overdue").length;
  const prevMonthRevenue = revenueByMonth[revenueByMonth.length - 2]?.revenue ?? 0;

  return {
    monthlyRevenue,
    annualRevenue,
    outstanding,
    activeClients,
    activeProjects,
    teamMembers: teamMembers.length,
    pendingTasks,
    overdueInvoices,
    upcomingMeetings: calendarEvents.filter((e) => e.type === "meeting").length,
    revenueChangePct:
      prevMonthRevenue > 0 ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : null,
  };
}
