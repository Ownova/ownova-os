export type Role =
  | "admin"
  | "ceo"
  | "manager"
  | "sales"
  | "marketing"
  | "finance"
  | "developer"
  | "client";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  avatarUrl?: string;
}

export type PipelineStage =
  | "lead"
  | "contacted"
  | "meeting"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "lost";

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  stage: PipelineStage;
  value: number;
  owner: string;
  tags: string[];
  lastActivity: string;
  createdAt: string;
}

export type ProjectStatus = "planning" | "in_progress" | "review" | "completed" | "on_hold";

export interface Project {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  status: ProjectStatus;
  budget: number;
  spent: number;
  startDate: string;
  dueDate: string;
  progress: number;
  team: string[];
  description: string;
}

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  dueDate: string;
  labels: string[];
}

export type InvoiceStatus =
  | "draft"
  | "pending"
  | "paid"
  | "partially_paid"
  | "cancelled"
  | "overdue";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  discount: number;
  tax: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  status: InvoiceStatus;
  currency: "USD" | "PKR" | "AED" | "EUR" | "GBP";
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  notes?: string;
  total: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: "bank_transfer" | "stripe" | "paypal" | "wise" | "payoneer" | "cash";
  status: "paid" | "pending" | "partial" | "refunded" | "overdue";
  date: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
}

export type QuotationStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

export interface Quotation {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  status: QuotationStatus;
  currency: Invoice["currency"];
  issueDate: string;
  validUntil: string;
  items: InvoiceItem[];
  terms?: string;
  total: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "meeting" | "deadline" | "invoice_due" | "task";
  relatedTo?: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  folder: "Contracts" | "Invoices" | "Quotations" | "Brand Assets" | "Client Files";
  sizeKb: number;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
}

export interface ActivityItem {
  id: string;
  type: "invoice" | "client" | "project" | "task" | "payment";
  message: string;
  timestamp: string;
}
