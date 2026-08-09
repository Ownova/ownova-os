import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { calendarEvents as mockCalendarEvents } from "@/lib/mock-data";
import type { CalendarEvent } from "@/types";

interface CalendarEventRow {
  id: string;
  title: string;
  event_date: string;
  type: string;
  related_to: string | null;
}

function rowToEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.event_date,
    type: row.type as CalendarEvent["type"],
    relatedTo: row.related_to ?? undefined,
  };
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  if (!isAwsDbConfigured) return mockCalendarEvents;
  const rows = await query<CalendarEventRow>(
    `select id, title, event_date, type, related_to from calendar_events order by event_date`
  );
  return rows.map(rowToEvent);
}
