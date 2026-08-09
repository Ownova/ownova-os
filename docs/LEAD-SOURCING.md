# Ownova OS — Lead Sourcing

Free lead generation for the six target markets, into the same CRM the questionnaire feeds.

---

## The uncomfortable finding first

**Cold email is not lawful everywhere you want to sell.** This was checked before anything was
built, because the penalties are not trivial.

| Market | Cold email without prior consent | Basis |
|---|---|---|
| **United States** | **Yes** | CAN-SPAM is opt-out. Needs a working unsubscribe, a physical postal address, honest headers. Up to $53,088 per non-compliant email. |
| **United Arab Emirates** | **With care** | PDPL permits a legitimate-interest basis, similar to GDPR. Most permissive in the GCC. |
| **Qatar** | **No** | PDPPL is consent-based. |
| **Kuwait** | **No** | CITRA's DPPR is consent-based. Imprisonment is an available sanction. |
| **Oman** | **No** | PDPL requires express consent; fully enforceable from 2026. |
| **Saudi Arabia** | **No** | PDPL Art. 25 + CST Anti-Spam require prior consent. SDAIA issued 48 enforcement decisions in 2025–26 covering marketing without consent. Fines to ~USD 1.33M, doubled for repeat offences. |

Not legal advice. If volume grows, have it reviewed locally.

### What to do instead in the consent-required markets

**The questionnaire already solves this.** Someone filling in the Discovery Questionnaire is the
consent event. So for Saudi, Qatar, Kuwait and Oman the play is:

- **LinkedIn** — governed by LinkedIn's terms, not anti-spam law, which is why it's the standard
  GCC channel
- **Geo-targeted ads and content** pointing at the questionnaire
- **WhatsApp only after they've opted in** — it counts as a personal communication channel under
  these regimes

Then the pipeline in `LEAD-PIPELINE-SETUP.md` takes over: form → CRM lead → booking → draft
quotation.

Every scraped lead carries its country, and CRM shows a colour-coded badge — green "Cold email
OK", amber "Email with care", red "No cold email" — so nobody has to hold six legal regimes in
their head while working the pipeline. Unknown countries default to red.

---

## The extractor

`tools/maps-lead-extractor.js` — paste into the browser console on a Google Maps **search
results** page. No API key, no scraping service, no monthly cost.

### Using it

1. Search Google Maps, e.g. `dental clinics in Dubai`
2. Open DevTools → Console (F12)
3. Open the script, set `COUNTRY` (must match the table above **exactly**) and `INDUSTRY`
4. Paste, press Enter, wait
5. Check https://os.ownova.org/crm

It reports how many were new vs already known, and tells you how many have **no website at all**
— which is where to start.

### Known limits, stated plainly

- **Google Maps rarely exposes email addresses.** You get name, phone, website, rating, address.
  That's fine: phone and LinkedIn are the better GCC channels anyway, and the website field is
  the actual signal.
- **Scraping Maps is against Google's ToS.** Civil matter, public data, your call. The practical
  risk is a temporary IP block.
- **Pacing is deliberate.** `SCROLL_DELAY_MS` is set to look like a human reading results. Lower
  it and you'll get rate-limited — that's the main way this stops working.
- **Address parsing is best-effort.** Google's card markup changes; the name, phone and website
  are reliable, the address sometimes isn't.

### Re-running is safe

The Maps place URL is the dedupe key, so running the same search next month updates existing
leads rather than creating duplicates. Enrichment only fills blanks — a phone number someone
corrected by hand is never overwritten by a scrape.

---

## What to search for

The goal isn't "businesses" — it's businesses showing a **visible symptom** Ownova fixes.

**Strongest signal: no website, or an obviously dated one.** A clinic with 400 reviews and no
website is losing bookings to whoever ranks above them, and they already know it.

Search patterns worth running per city:

| Search | Why it's a good fit |
|---|---|
| `dental clinics in <city>` | High volume, appointment-driven, booking automation is an easy sell |
| `real estate agencies in <city>` | Lead-heavy, drowning in manual follow-up |
| `law firms in <city>` | Document workflows, high value per client |
| `accounting firms in <city>` | Invoicing and reporting — exactly Ownova's stack |
| `logistics companies in <city>` | Dashboards and tracking |
| `medical centers in <city>` | Scheduling, records, reminders |
| `marketing agencies in <city>` | They resell — one win becomes several |

Cities worth covering: Dubai, Abu Dhabi, Sharjah, Riyadh, Jeddah, Dammam, Doha, Kuwait City,
Muscat. For the USA, target metros rather than the whole country — Houston, Dallas, Miami,
Chicago — because "in USA" returns nothing useful.

**Work in batches.** One search, review what lands in CRM, then decide whether that segment is
worth more. A CRM with 5,000 untouched scraped leads is worse than one with 50 you actually
contacted.

---

## Before you send anything

Cold-emailing scraped addresses **from the `ownova.org` SES identity will put invoice delivery at
risk**. Scraped lists carry high bounce and complaint rates, AWS monitors both, and a suspended
SES account takes your invoicing down with it.

Outbound needs a **separate warmed sending domain** — something like `ownova-outreach.com`, warmed
over 2–3 weeks at low volume. The scraper writing into Ownova OS is completely safe; it's just
database rows. It's the *sending* that needs isolating.
