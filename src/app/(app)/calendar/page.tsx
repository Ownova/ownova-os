import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calendarEvents } from "@/lib/mock-data";
import { cn, formatDate } from "@/lib/utils";
import type { CalendarEvent } from "@/types";

const typeStyles: Record<CalendarEvent["type"], { label: string; dot: string; variant: "default" | "warning" | "destructive" | "secondary" }> = {
  meeting: { label: "Meeting", dot: "bg-primary", variant: "default" },
  deadline: { label: "Deadline", dot: "bg-amber-400", variant: "warning" },
  invoice_due: { label: "Invoice Due", dot: "bg-red-400", variant: "destructive" },
  task: { label: "Task", dot: "bg-slate-400", variant: "secondary" },
};

// August 2026 starts on a Saturday.
const YEAR = 2026;
const MONTH = 7; // 0-indexed August

export default function CalendarPage() {
  const first = new Date(YEAR, MONTH, 1);
  const daysInMonth = new Date(YEAR, MONTH + 1, 0).getDate();
  const leadingBlanks = first.getDay();
  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function eventsOn(day: number) {
    const iso = `${YEAR}-${String(MONTH + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarEvents.filter((e) => e.date === iso);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">Meetings, deadlines, invoice due dates, and tasks.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(typeStyles).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", s.dot)} /> {s.label}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-medium">August 2026</p>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="pb-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "min-h-24 rounded-lg border border-border/60 p-1.5 text-left",
                  day === null && "border-transparent bg-transparent"
                )}
              >
                {day !== null && (
                  <>
                    <span className="text-xs text-muted-foreground">{day}</span>
                    <div className="mt-1 space-y-1">
                      {eventsOn(day).map((e) => (
                        <div
                          key={e.id}
                          className="flex items-start gap-1 rounded bg-muted/50 px-1 py-0.5 text-[10px] leading-tight"
                          title={e.title}
                        >
                          <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", typeStyles[e.type].dot)} />
                          <span className="line-clamp-2">{e.title}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-base font-semibold">Upcoming</h2>
        <div className="space-y-2">
          {calendarEvents.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <span className={cn("h-2 w-2 rounded-full", typeStyles[e.type].dot)} />
                <div>
                  <p className="text-sm font-medium">{e.title}</p>
                  {e.relatedTo && <p className="text-xs text-muted-foreground">{e.relatedTo}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={typeStyles[e.type].variant}>{typeStyles[e.type].label}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(e.date)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
