import { NextResponse } from "next/server";
import { verifyCalSignature } from "@/lib/intake/auth";
import { ingestBooking } from "@/lib/intake/booking";

export const dynamic = "force-dynamic";

/**
 * Cal.com booking webhook.
 *
 * Signature is verified against the **raw** body text. Re-serialising the parsed JSON changes
 * key order and whitespace, so the HMAC stops matching — this is the usual reason a correctly
 * configured Cal webhook appears to fail authentication.
 *
 * Only BOOKING_CREATED is acted on. Cal sends rescheduled and cancelled events through the same
 * hook, and silently treating a cancellation as a new booking would put a call on the calendar
 * that nobody is attending.
 */
interface CalAttendee {
  name?: string;
  email?: string;
  timeZone?: string;
  phoneNumber?: string;
}

interface CalPayload {
  uid?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  attendees?: CalAttendee[];
  responses?: Record<string, { value?: unknown; label?: string } | string>;
  additionalNotes?: string;
}

export async function POST(request: Request) {
  const raw = await request.text();

  const auth = verifyCalSignature(raw, request.headers.get("x-cal-signature-256"));
  if (!auth.ok) {
    console.warn("[intake/booking] rejected:", auth.reason);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { triggerEvent?: string; payload?: CalPayload };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Acknowledge everything else with a 200. A non-2xx makes Cal retry an event we are never
  // going to act on, which just fills their retry queue and our logs.
  if (body.triggerEvent !== "BOOKING_CREATED") {
    return NextResponse.json({ ok: true, ignored: body.triggerEvent ?? "unknown" });
  }

  const payload = body.payload ?? {};
  const attendee = payload.attendees?.[0] ?? {};

  if (!payload.uid || !payload.startTime) {
    return NextResponse.json({ error: "Missing uid or startTime" }, { status: 422 });
  }

  try {
    const result = await ingestBooking({
      uid: payload.uid,
      title: payload.title ?? "",
      startTime: payload.startTime,
      endTime: payload.endTime ?? null,
      attendeeName: attendee.name?.trim() || attendee.email?.trim() || "Unnamed attendee",
      attendeeEmail: attendee.email ?? null,
      attendeePhone: attendee.phoneNumber ?? null,
      timeZone: attendee.timeZone ?? null,
      notes: extractNotes(payload),
      payload: body,
    });

    if (!result) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    return NextResponse.json({
      ok: true,
      clientId: result.clientId,
      quotation: result.quotationNumber,
      duplicate: result.duplicate,
    });
  } catch (error) {
    console.error("[intake/booking] failed:", error);
    return NextResponse.json({ error: "Booking intake failed" }, { status: 500 });
  }
}

/** Flattens Cal's booking-question answers into readable text for the client note. */
function extractNotes(payload: CalPayload): string | null {
  const parts: string[] = [];
  if (payload.additionalNotes?.trim()) parts.push(payload.additionalNotes.trim());

  for (const [key, entry] of Object.entries(payload.responses ?? {})) {
    if (key === "name" || key === "email" || key === "notes") continue;
    const value = typeof entry === "string" ? entry : entry?.value;
    if (typeof value === "string" && value.trim()) {
      const label = typeof entry === "object" && entry?.label ? entry.label : key;
      parts.push(`${label}: ${value.trim()}`);
    }
  }

  return parts.length ? parts.join("\n") : null;
}
