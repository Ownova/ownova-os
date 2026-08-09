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
4. The form's confirmation screen gives them **https://cal.com/ownova/automation-assessment**.
5. They book. Cal.com POSTs to `/api/intake/booking`.
6. Ownova OS adds a **calendar event**, moves them to stage `meeting`, and prepares a
   **draft quotation** numbered and attached to the right client.
7. You take the call, fill in the scope, press **Send to Client**. They accept →
   **Convert to Invoice** → invoice emails itself with the PDF.

**No invoice is ever sent automatically.** The funnel promises a free, no-obligation
assessment; invoicing before the call would break that promise. A human presses send.

---

## Step 1 — Add the secrets in Amplify  ✅ DONE

Both variables are already set on the Amplify app and build 32 shipped with them. Listed here
for reference and for rebuilding the environment from scratch:

| Name | Value |
|---|---|
| `INTAKE_SECRET` | `HfrOCckNNPrt-dxlTJe5iflCzzZMNpPgoheq8iFBx6msACs6` |
| `CAL_WEBHOOK_SECRET` | `bFWodUAVz_bHsTht470VYjtXyEvqcy4_cFcRpbtUdmviY32O` |

These were generated with a cryptographic RNG. They are the only thing standing between the
open internet and your CRM, so treat them like passwords: don't paste them into a chat, a
public repo, or a screenshot. Rotating them means changing the value in both Amplify and the
place that sends it (Apps Script / Cal.com), then redeploying.

---

## Step 2 — Google Form → Apps Script  ✅ DONE

**Status: live and verified.** Project `Ownova OS — Lead Intake` at
[script.google.com](https://script.google.com/u/1/home) (Ownova account), trigger installed,
tested with two real form submissions.

### Why it's a standalone script, not a form-bound one

The **Apps Script** item inside the form's ⋮ menu fails with *"Sorry, unable to open the file at
present"*. That's a Google multi-account bug — with `syedown109@` and `ownova.org@` both signed
in, `script.google.com` resolves the bound-script link against the wrong account.

The working approach is a standalone project that attaches its own trigger to the form by ID via
`ScriptApp.newTrigger(...).forForm(FormApp.openById(FORM_ID)).onFormSubmit()`. An installable
trigger created this way delivers the identical event object (`e.response`), so nothing is lost.

Form ID: `15y2UYIDdmDpMUq03N9laMPNMDGcYUpqrRCZC2BSJJ9I`

### The mapping bug this caught

The first version assigned `payload.name` for **every** question containing the word "name". The
questionnaire runs to seven sections, and a later question overwrote the respondent's actual
Full Name — the first live test came through as *"Test response - Ownova pipeline check"*
instead of the name that was typed in.

Fixed with a `setOnce()` helper so **first match wins**. Re-tested: a submission whose later
answers all read "MUST NOT overwrite the name field" arrived with `name = "Correct Person Name"`.

If you ever edit the script, keep that guard. Field mapping by keyword is convenient but
last-write-wins is the failure mode it invites.

### Two gotchas if you edit the script

- **Ctrl+S may not save.** The title bar shows *"Unsaved changes"* even after pressing it. Click
  the disk icon in the toolbar instead, and confirm it reads *"Saved to Drive"* before running
  anything — the trigger executes the last **saved** version, not what's on screen.
- **`setupOwnovaTrigger` is safe to re-run.** It deletes its own old triggers first, so it can't
  stack up duplicate handlers that would create the same lead twice. Verified: after running it
  twice, the Triggers panel still showed exactly one.

## Step 3 — Cal.com  ✅ DONE

**Status: live and verified with a real booking.**

| | |
|---|---|
| Public booking link | **https://cal.com/ownova/automation-assessment** |
| Event type | Automation Assessment, 30 min, Cal Video |
| Profile | `cal.com/ownova` (the auto-generated `own-business-ipflqf` was claimed properly) |
| Google Calendar | Connected — Cal knows when you're busy, no double-booking |
| Timezone | Asia/Karachi |
| Webhook | `https://os.ownova.org/api/intake/booking`, **Booking created only**, HMAC secret set |

### The webhook only listens for "Booking created"

Cal pre-selects *every* trigger by default — cancellations, reschedules, no-shows, recordings.
Left as-is, a cancelled call would still have hit the endpoint. The endpoint ignores anything
that isn't `BOOKING_CREATED` and returns 200 so Cal stops retrying, but narrowing the
subscription means those deliveries never happen at all.

### Verified end to end

A real booking through the public page produced, in Ownova OS:

- client `Pipeline Test Booking`, stage **meeting**, source **cal_booking**
- calendar event *Automation Assessment between Ownova and Pipeline Test Booking* on the right date
- draft quotation **QUO-2026-0001**
- the booking notes saved as a client note

Then cancelled and all test data removed.

**The webhook is not instant.** It took roughly two minutes to arrive. If you book something
and the CRM looks empty, wait before assuming it's broken.

Before the real booking, the endpoint was also proved against forged payloads: an unsigned
request → 401, a correctly-signed one → 200, a body tampered with after signing → 401, a repeat
of the same booking uid → `duplicate: true` with no second quotation.

---

## Step 4 — Form thank-you page  ✅ DONE

The confirmation message now leads with the booking link, so completing the questionnaire flows
straight into booking. Google Forms confirmation screens are plain text only — the URL is not
clickable, respondents copy it. That platform limit is the main argument for eventually moving
the form to `os.ownova.org/start`, where the booking widget can be embedded directly.

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
