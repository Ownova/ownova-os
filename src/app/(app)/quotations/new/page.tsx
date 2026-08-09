import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuotationForm } from "@/components/quotations/quotation-form";
import { getClients } from "@/lib/data/clients";
import { requireInternalPage } from "@/lib/auth-guard";

export default async function NewQuotationPage() {
  await requireInternalPage();

  const clients = await getClients();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        href="/quotations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Quotations
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">New Quotation</h1>
        <p className="text-sm text-muted-foreground">Auto-numbered, convertible into an invoice once accepted.</p>
      </div>
      <QuotationForm clients={clients} />
    </div>
  );
}
