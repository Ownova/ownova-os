import { clients } from "@/lib/mock-data";
import { formatCurrency, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { PipelineStage } from "@/types";

const stages: { key: PipelineStage; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "contacted", label: "Contacted" },
  { key: "meeting", label: "Meeting" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export function PipelineBoard() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
      {stages.map((stage) => {
        const items = clients.filter((c) => c.stage === stage.key);
        const total = items.reduce((sum, c) => sum + c.value, 0);
        return (
          <div key={stage.key} className="w-64 shrink-0 rounded-xl bg-muted/30 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-medium">{stage.label}</h3>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((c) => (
                <div key={c.id} className="rounded-lg border border-border/70 bg-card p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">{initials(c.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-tight">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.company}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-primary">{formatCurrency(c.value)}</p>
                </div>
              ))}
              {items.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">No clients</p>
              )}
            </div>
            {items.length > 0 && (
              <p className="mt-2 px-1 text-xs text-muted-foreground">{formatCurrency(total)} total</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
