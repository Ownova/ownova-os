import "server-only";
import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { logActivity } from "@/lib/data/activity";
import { ingestLead } from "@/lib/intake/leads";

/**
 * Handles a confirmed booking: puts the call on the Ownova OS calendar and prepares the
 * paperwork you'll need after it.
 *
 * The deliberate choice here is that a booking creates a **draft quotation**, never an invoice.
 * The funnel this feeds promises a free, no-obligation assessment; invoicing someone before the
 * call has happened breaks that promise and is the fastest way to turn a warm lead cold. The
 * draft sits in Ownova OS pre-filled, you adjust the scope after the call, and the existing
 * Send → Accept → Convert to Invoice path takes it from there.
 */
export interface BookingInput {
  /** Cal.com's booking UID. Doubles as the idempotency key. */
  uid: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  attendeeName: string;
  attendeeEmail?: string | null;
  attendeePhone?: string | null;
  timeZone?: string | null;
  /** Anything they typed into the booking form. */
  notes?: string | null;
  payload?: unknown;
}

export interface BookingResult {
  clientId: string;
  eventCreated: boolean;
  quotationNumber: string | null;
  duplicate: boolean;
}

/** Next QUO-YYYY-NNNN reference. Mirrors how invoice numbers are allocated. */
async function nextQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await query<{ number: string }>(
    `select number from quotations where number like :prefix order by number desc limit 1`,
    { prefix: `QUO-${year}-%` }
  );
  const last = rows[0]?.number;
  const sequence = last ? Number(last.split("-")[2]) + 1 : 1;
  return `QUO-${year}-${String(sequence).padStart(4, "0")}`;
}

export async function ingestBooking(input: BookingInput): Promise<BookingResult | null> {
  if (!isAwsDbConfigured) return null;

  // A booking is also a lead signal — someone can reach the booking page without ever filling
  // the questionnaire (a referral, a DM, a link forwarded by a colleague). Routing through the
  // same ingest means they still land in the CRM, matched to their existing record if the email
  // is already known.
  const lead = await ingestLead({
    source: "cal_booking",
    externalId: input.uid,
    name: input.attendeeName,
    email: input.attendeeEmail,
    phone: input.attendeePhone,
    notes: input.notes ? `Booking notes\n\n${input.notes}` : null,
    payload: input.payload,
  });
  if (!lead) return null;

  // If this exact booking has been seen before, the calendar event and quotation already exist.
  // Cal.com retries on timeout, and two calendar entries for one call is worse than none.
  if (!lead.created && (await bookingAlreadyProcessed(input.uid))) {
    return { clientId: lead.clientId, eventCreated: false, quotationNumber: null, duplicate: true };
  }

  const eventDate = input.startTime.slice(0, 10);

  await query(
    `insert into calendar_events (title, event_date, type, related_to, created_by)
     values (:title, :eventDate, 'meeting'::calendar_event_type, :relatedTo, null)`,
    {
      title: input.title || `Discovery call — ${input.attendeeName}`,
      eventDate,
      relatedTo: input.attendeeName,
    }
  );

  // Moving the lead along the pipeline: they've booked, so 'meeting' is now true of them. Only
  // advance from the earliest stages — someone already at 'negotiation' booking a follow-up call
  // must not be dragged backwards.
  await query(
    `update clients set stage = 'meeting'::pipeline_stage, last_activity_at = now()
      where id = :clientId and stage in ('lead', 'contacted')`,
    { clientId: lead.clientId }
  );

  // The draft quotation: empty of figures on purpose. It exists so that after the call you have
  // a numbered document already attached to the right client, rather than starting from a blank
  // form while the conversation is still fresh.
  const number = await nextQuotationNumber();
  const [quotation] = await query<{ id: string }>(
    `insert into quotations (client_id, number, currency, status, issue_date, valid_until, terms)
     values (:clientId, :number, 'USD'::currency_code, 'draft', current_date,
             current_date + 14, :terms)
     returning id`,
    {
      clientId: lead.clientId,
      number,
      terms:
        "Prepared following the automation assessment call. Scope and pricing to be confirmed before acceptance.",
    }
  );

  await logActivity({
    actorId: null,
    entityType: "invoice",
    action: `Call booked with ${input.attendeeName} for ${eventDate} — draft ${number} prepared`,
    entityId: quotation?.id ?? null,
  });

  return {
    clientId: lead.clientId,
    eventCreated: true,
    quotationNumber: number,
    duplicate: false,
  };
}

/** True when a calendar event already exists for this booking's ingest record. */
async function bookingAlreadyProcessed(uid: string): Promise<boolean> {
  const [row] = await query<{ count: number }>(
    `select count(*)::int as count from lead_intake
      where source = 'cal_booking' and external_id = :uid`,
    { uid }
  );
  return (row?.count ?? 0) > 0;
}
