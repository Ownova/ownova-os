import "server-only";

/**
 * Which outreach channels are legally defensible for a lead, based on where they are.
 *
 * This exists because the answer genuinely differs by country and getting it wrong is expensive.
 * Saudi Arabia's PDPL Article 25 and the CST Anti-Spam Regulation require *prior consent* for
 * commercial email; SDAIA issued 48 enforcement decisions in 2025-26 covering exactly that, with
 * fines reaching ~USD 1.33M (doubled for repeat offences) and imprisonment available. The UAE, by
 * contrast, permits a legitimate-interest basis much like GDPR. The USA's CAN-SPAM is opt-out, so
 * cold email is lawful there provided the message carries a working unsubscribe, a physical
 * postal address and honest headers.
 *
 * The flag is advisory, not enforcement — nothing here blocks a send. It exists so that whoever
 * is looking at a lead in CRM can see, without having to remember six legal regimes, whether
 * emailing this person cold is a reasonable thing to do.
 *
 * Not legal advice. If outreach volume becomes significant, get it reviewed by a lawyer in the
 * relevant jurisdiction.
 */
export type OutreachChannel = "cold_email" | "linkedin" | "form_consent";

export interface OutreachRule {
  /** ISO-ish country label as stored on the lead. */
  country: string;
  coldEmail: "yes" | "caution" | "no";
  note: string;
}

const RULES: Record<string, OutreachRule> = {
  "United States": {
    country: "United States",
    coldEmail: "yes",
    note: "CAN-SPAM is opt-out. Cold email is lawful with a working unsubscribe, a physical postal address and honest subject/from lines.",
  },
  "United Arab Emirates": {
    country: "United Arab Emirates",
    coldEmail: "caution",
    note: "PDPL allows a legitimate-interest basis for B2B. Defensible, but keep it relevant, low-volume and easy to opt out of.",
  },
  Qatar: {
    country: "Qatar",
    coldEmail: "no",
    note: "PDPPL is consent-based. Use LinkedIn or drive them to the questionnaire — the form submission is your consent record.",
  },
  Kuwait: {
    country: "Kuwait",
    coldEmail: "no",
    note: "CITRA's DPPR is consent-based and imprisonment is an available sanction. LinkedIn or inbound only.",
  },
  Oman: {
    country: "Oman",
    coldEmail: "no",
    note: "PDPL requires express consent and became fully enforceable in 2026. LinkedIn or inbound only.",
  },
  "Saudi Arabia": {
    country: "Saudi Arabia",
    coldEmail: "no",
    note: "Strictest of the six. PDPL Art. 25 + CST Anti-Spam require prior consent, actively enforced by SDAIA. Do not cold email — use LinkedIn or send them to the questionnaire.",
  },
};

/** Unknown countries default to the cautious answer rather than the convenient one. */
const UNKNOWN: OutreachRule = {
  country: "Unknown",
  coldEmail: "no",
  note: "Country not identified. Treat as consent-required until you know where they are.",
};

export function outreachRuleFor(country?: string | null): OutreachRule {
  if (!country) return UNKNOWN;
  return RULES[country.trim()] ?? UNKNOWN;
}

/** Countries we currently source leads from, for the scraper's target list. */
export const TARGET_COUNTRIES = Object.keys(RULES);
