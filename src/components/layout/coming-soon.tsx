import { Construction } from "lucide-react";

/**
 * Placeholder for modules that aren't built yet. Every Phase 1 + Phase 2 module now has a real
 * page, so this is currently unused — kept for scaffolding new modules quickly.
 */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-center">
      <Construction className="h-8 w-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        This module is on the Ownova OS roadmap — see docs/ARCHITECTURE.md.
      </p>
    </div>
  );
}
