import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Globe, MapPin, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getClientById, getClientNotes } from "@/lib/data/clients";
import { outreachRuleFor } from "@/lib/intake/compliance";
import { LeadWorkspace } from "@/components/crm/lead-workspace";
import { requireInternalPage } from "@/lib/auth-guard";

/**
 * The lead detail page — where you actually work a lead.
 *
 * This did not exist when leads were first imported, so the business briefs the scraper writes
 * were being stored in `client_notes` with nothing to display them. Clicking a card did nothing
 * and there was no way to see a phone number. Everything worth knowing about a lead now lives on
 * one screen, next to the buttons that act on it.
 */
const stageVariant: Record<string, "secondary" | "default" | "success" | "warning" | "destructive"> = {
  lead: "secondary",
  contacted: "default",
  meeting: "default",
  proposal_sent: "warning",
  negotiation: "warning",
  won: "success",
  lost: "destructive",
};

const ruleStyle = {
  yes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  caution: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  no: "border-red-500/30 bg-red-500/10 text-red-400",
} as const;

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireInternalPage();

  const { id } = await params;
  const [client, notes] = await Promise.all([getClientById(id), getClientNotes(id)]);
  if (!client) return notFound();

  const rule = outreachRuleFor(client.country);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        href="/crm"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to CRM
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {client.company && client.company !== client.name && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {client.company}
              </span>
            )}
            {client.industry && (
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" /> {client.industry}
              </span>
            )}
            {client.country && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {client.country}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={stageVariant[client.stage] ?? "secondary"}>
            {client.stage.replace("_", " ")}
          </Badge>
          {client.source && <Badge variant="outline">{client.source.replace("_", " ")}</Badge>}
        </div>
      </div>

      {/* Compliance guidance, spelled out rather than just colour-coded. Whoever is about to
          email this person should not have to remember six legal regimes. */}
      <div className={`rounded-xl border p-3 text-sm ${ruleStyle[rule.coldEmail]}`}>
        <p className="font-semibold">
          {rule.coldEmail === "yes"
            ? "Cold email is lawful here"
            : rule.coldEmail === "caution"
              ? "Cold email with care"
              : "Do not cold email"}
        </p>
        <p className="mt-0.5 opacity-90">{rule.note}</p>
      </div>

      <LeadWorkspace client={client} />

      {/* --- What we know about them ------------------------------------------------------ */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Background &amp; history
          </p>

          {client.address && (
            <p className="text-sm text-muted-foreground">
              <MapPin className="mr-1 inline h-3.5 w-3.5" />
              {client.address}
            </p>
          )}
          {client.website ? (
            <p className="text-sm text-muted-foreground">
              <Globe className="mr-1 inline h-3.5 w-3.5" />
              <a
                href={client.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {client.website}
              </a>
              {client.website.startsWith("http://") && (
                <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-400">
                  HTTP only — shows as &ldquo;Not secure&rdquo;
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm">
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium text-emerald-400">
                No website — strongest opening
              </span>
            </p>
          )}

          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing recorded yet. Log a note above after you make contact.
            </p>
          ) : (
            <ul className="space-y-3 pt-1">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg border border-border/70 p-3">
                  <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {n.author} · {formatDate(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
