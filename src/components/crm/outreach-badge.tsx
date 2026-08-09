import { Mail, MessageSquare, ShieldAlert } from "lucide-react";

/**
 * Shows, at a glance, whether cold-emailing this lead is lawful where they are.
 *
 * Cold email rules differ sharply across the markets Ownova sells into, and the differences are
 * not intuitive — the USA is permissive, Saudi Arabia is not. Nobody should have to hold six
 * legal regimes in their head while working a pipeline, so the judgement lives next to the lead.
 *
 * Mirrors src/lib/intake/compliance.ts. Duplicated deliberately: that module is server-only
 * (it imports "server-only"), and this renders in a client component.
 */
const RULES: Record<string, { level: "yes" | "caution" | "no"; note: string }> = {
  "United States": {
    level: "yes",
    note: "CAN-SPAM is opt-out. Cold email is fine with a working unsubscribe and a postal address.",
  },
  "United Arab Emirates": {
    level: "caution",
    note: "PDPL allows a legitimate-interest basis for B2B. Keep it relevant and easy to opt out of.",
  },
  Qatar: { level: "no", note: "PDPPL is consent-based. Use LinkedIn or send them the questionnaire." },
  Kuwait: { level: "no", note: "CITRA DPPR is consent-based; imprisonment is an available sanction." },
  Oman: { level: "no", note: "PDPL requires express consent and is fully enforceable from 2026." },
  "Saudi Arabia": {
    level: "no",
    note: "PDPL Art. 25 + CST Anti-Spam require prior consent, actively enforced by SDAIA. Do not cold email.",
  },
};

const STYLES = {
  yes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  caution: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  no: "border-red-500/30 bg-red-500/10 text-red-400",
} as const;

const LABELS = {
  yes: "Cold email OK",
  caution: "Email with care",
  no: "No cold email",
} as const;

export function OutreachBadge({ country }: { country?: string }) {
  // Unknown country defaults to the cautious answer, not the convenient one.
  // Written as an explicit ternary rather than `(country && RULES[country]) ?? fallback`, which
  // yields "" for an empty-string country instead of the fallback object.
  const rule: { level: "yes" | "caution" | "no"; note: string } = country
    ? RULES[country] ?? {
        level: "no",
        note: `${country} isn't in the compliance list — treat as consent-required until checked.`,
      }
    : {
        level: "no",
        note: "Country unknown — treat as consent-required until you know where they are.",
      };

  const Icon = rule.level === "yes" ? Mail : rule.level === "caution" ? MessageSquare : ShieldAlert;

  return (
    <span
      title={`${country ?? "Unknown country"} — ${rule.note}`}
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${STYLES[rule.level]}`}
    >
      <Icon className="h-3 w-3" />
      {LABELS[rule.level]}
    </span>
  );
}
