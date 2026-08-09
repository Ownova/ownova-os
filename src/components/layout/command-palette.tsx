"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { LayoutDashboard, Users, FolderKanban, Receipt, Plus } from "lucide-react";

const pages = [
  { href: "/dashboard", label: "Go to Dashboard", icon: LayoutDashboard },
  { href: "/crm", label: "Go to CRM", icon: Users },
  { href: "/projects", label: "Go to Projects", icon: FolderKanban },
  { href: "/invoices", label: "Go to Invoicing", icon: Receipt },
  { href: "/invoices/new", label: "Create new invoice", icon: Plus },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 pt-32 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <Command label="Command Menu">
          <Command.Input
            autoFocus
            placeholder="Search modules, actions..."
            className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            {pages.map((p) => {
              const Icon = p.icon;
              return (
                <Command.Item
                  key={p.href}
                  onSelect={() => {
                    router.push(p.href);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {p.label}
                </Command.Item>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
