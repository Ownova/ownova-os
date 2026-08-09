"use server";

import { query } from "@/lib/aws/db";
import { requireInternalTeam } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

export interface CreateCalendarEventInput {
  title: string;
  eventDate: string;
  type: string;
  relatedTo?: string;
}

export async function createCalendarEventAction(input: CreateCalendarEventInput) {
  const session = await requireInternalTeam();

  await query(
    `insert into calendar_events (title, event_date, type, related_to, created_by)
     values (:title, :eventDate, :type::calendar_event_type, :relatedTo, :createdBy)`,
    {
      title: input.title,
      eventDate: input.eventDate,
      type: input.type,
      relatedTo: input.relatedTo ?? null,
      createdBy: session.mode === "cognito" ? session.sub : null,
    }
  );

  revalidatePath("/calendar");
}
