# Ownova OS — Automated Lead Pipeline

How a stranger becomes a lead, a booked call, a calendar entry and a ready-to-send quotation
without anyone re-typing anything.

```
Google Form ──(Apps Script)──┐
                             ├──► os.ownova.org/api/intake/*  ──► Aurora ──► Ownova OS
Cal.com booking ──(webhook)──┤                                        │
Lead scraper (later) ────────┘                                        └──► SES
```

Everything funnels through one authenticated endpoint. Marginal cost: **$0/month** — no Zapier,
no paid Calendly, no new AWS resources.

---

## What happens, step by step

1. Someone completes the **Discovery Questionnaire** on Google Forms.
2. Apps Script fires within ~2 seconds and POSTs the answers to `/api/intake/lead`.
3. Ownova OS creates a **CRM lead** (stage `lead`, never `client`), creates the company if it's
   new, and writes every questionnaire answer to a client note.
4. The form's confirmation screen shows the **Cal.com booking link**.
5. They book. Cal.com POSTs to `/api/intake/booking`.
6. Ownova OS adds a **calendar event**, moves them to stage `meeting`, and prepares a
   **draft quotation** numbered and attached to the right client.
7. You take the call, fill in the scope, press **Send to Client**. They accept →
   **Convert to Invoice** → invoice emails itself with the PDF.

**No invoice is ever sent automatically.** The funnel promises a free, no-obligation
assessment; invoicing before the call would break that promise. A human presses send.

---

## Step 1 — Add the secrets in Amplify

AWS Amplify Console → `ownova-os` → Hosting → **Environment variables** → add both, then
**Redeploy** (env vars only reach the running app on a fresh build):

| Name | Value |
|---|---|
| `INTAKE_SECRET` | `HfrOCckNNPrt-dxlTJe5iflCzzZMNpPgoheq8iFBx6msACs6` |
| `CAL_WEBHOOK_SECRET` | `bFWodUAVz_bHsTht470VYjtXyEvqcy4_cFcRpbtUdmviY32O` |

These were generated with a cryptographic RNG. They are the only thing standing between the
open internet and your CRM, so treat them like passwords: don't paste them into a chat, a
public repo, or a screenshot. Rotating them means changing the value in both Amplify and the
place that sends it (Apps Script / Cal.com), then redeploying.

---

## Step 2 — Google Form → Apps Script

Open the form's response spreadsheet → **Extensions → Apps Script** → replace everything with:

```javascript
// Ownova OS lead intake.
// Fires on every form submission and posts the answers to the CRM.

const OWNOVA_ENDPOINT = 'https://os.ownova.org/api/intake/lead';
const OWNOVA_SECRET   = 'HfrOCckNNPrt-dxlTJe5iflCzzZMNpPgoheq8iFBx6msACs6';

function onOwnovaFormSubmit(e) {
  const payload = { source: 'google_form' };

  // Google sends the *question text* as the key. Those get reworded whenever the form is
  // edited, so map the ones we care about onto stable names and pass the rest through
  // verbatim — the endpoint keeps everything for the client note either way.
  e.response.getItemResponses().forEach(function (item) {
    const question = item.getItem().getTitle();
    const answer   = item.getResponse();
    if (!answer) return;

    const q = question.toLowerCase();
    if (q.indexOf('email') > -1)                              payload.email   = answer;
    else if (q.indexOf('name') > -1 && q.indexOf('company') === -1 && q.indexOf('brand') === -1)
                                                              payload.name    = answer;
    else if (q.indexOf('phone') > -1 || q.indexOf('whatsapp') > -1) payload.phone = answer;
    else if (q.indexOf('company') > -1 || q.indexOf('brand') > -1)  payload.company = answer;
    else if (q.indexOf('website') > -1 || q.indexOf('linkedin') > -1 || q.indexOf('instagram') > -1)
                                                              payload.website = answer;

    payload[question] = answer;
  });

  // Google's own response ID. This is what makes a retry a no-op instead of a duplicate lead.
  payload.responseId = e.response.getId();

  const result = UrlFetchApp.fetch(OWNOVA_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-ownova-secret': OWNOVA_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  // Logged rather than thrown: a failed sync must never make the respondent see an error.
  // Check Apps Script → Executions if a lead doesn't appear.
  console.log('Ownova intake:', result.getResponseCode(), result.getContentText());
}
```

Then wire the trigger: left sidebar → **Triggers** (clock icon) → **Add Trigger**

- Function: `onOwnovaFormSubmit`
- Event source: **From form**
- Event type: **On form submit**

Authorise when prompted (Google will warn the script is unverified — it's yours, continue).

**Test it:** submit the form yourself, then check CRM in Ownova OS. If nothing appears, Apps
Script → **Executions** shows the HTTP status and response body.

---

## Step 3 — Cal.com

1. Sign up at [cal.com](https://cal.com) (free tier is enough) and connect your Google Calendar
   so it knows when you're busy.
2. Create an event type — e.g. **Automation Assessment, 30 min**.
3. Settings → **Webhooks** → New:
   - Subscriber URL: `https://os.ownova.org/api/intake/booking`
   - Event triggers: **Booking Created**
   - Secret: `bFWodUAVz_bHsTht470VYjtXyEvqcy4_cFcRpbtUdmviY32O`
4. Copy your booking link and paste it into the Google Form's confirmation message:
   *Form → Settings → Presentation → Confirmation message.*

Cal signs each delivery with HMAC-SHA256 over the raw body; the endpoint verifies it before
touching the database, so nobody can forge a booking by guessing the URL.

---

## Design decisions worth knowing

**Leads, not clients.** Form submissions land at stage `lead`. "Client" keeps meaning "someone
who pays us", so the dashboard's active-client count stays a real number rather than a count of
form submissions.

**Enrichment never overwrites.** If a lead already exists, an inbound submission fills blank
fields only. A phone number someone on the team corrected by hand is more trustworthy than one
typed into a form at 2am.

**Every submission is deduplicated.** Webhooks retry — Apps Script on a 5xx, Cal.com on a
timeout. The `lead_intake` table records the sender's own ID for each event and a unique index
turns the second delivery into a no-op. Without it, one retry means two clients, two calendar
events and two quotations.

**Raw payloads are kept.** When a lead looks wrong six weeks later, the only question that
matters is what they actually submitted, and a parsed-and-discarded payload can't answer it.

**Failures return 500 on purpose.** That makes Apps Script retry, which is what you want when
Aurora is resuming from auto-pause. The replay check is what makes retrying safe.

---

## Before you scrape leads — read this

Cold-emailing scraped addresses from the `ownova.org` SES identity is the fastest way to lose
invoice delivery. Scraped lists carry high bounce and complaint rates, AWS monitors both, and a
suspended SES account takes your invoicing down with it.

Cold outreach needs a **separate warmed sending domain**. The scraper can write into Ownova OS
freely — that part is safe, it's just database rows. It's the sending that needs isolating.
