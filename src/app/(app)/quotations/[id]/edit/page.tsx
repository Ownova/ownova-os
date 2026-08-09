import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QuotationForm } from "@/components/quotations/quotation-form";
import { getClients } from "@/lib/data/clients";
import { getQuotationById } from "@/lib/data/quotations";
import { requireInternalPage } from "@/lib/auth-guard";

/**
 * Edit a draft quotation.
 *
 * This is the other half of the automated pipeline: a booked call creates an empty draft, and
 * this is where the scope agreed on that call gets typed in before you press Send.
 *
 * Sent quotations redirect back to the detail view. The client is holding a PDF with that number
 * on it, and quietly changing the figures behind a document someone has already received is how
 * disputes start — the server action refuses too, this just avoids showing a form that can't save.
 */
export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireInternalPage();

  const { id } = await params;
  const [quotation, clients] = await Promise.all([getQuotationById(id), getClients()]);
  if (!quotation) return notFound();
  if (quotation.status !== "draft") redirect(`/quotations/${id}`);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        href={`/quotations/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to {quotation.number}
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit {quotation.number}</h1>
        <p className="text-sm text-muted-foreground">
          {quotation.items.length === 0
            ? "This draft was created automatically when the call was booked. Add the scope you agreed."
            : "Changes apply to the draft only — nothing has been sent to the client yet."}
        </p>
      </div>
      <QuotationForm clients={clients} quotation={quotation} />
    </div>
  );
}
