"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toastActionError } from "@/lib/action-toast";
import { grantPortalAccessAction } from "@/app/actions/portal-access";
import type { Client } from "@/types";

/**
 * Grants a client login access to their portal. Admin/CEO only — the button isn't rendered for
 * other roles, and the action re-checks the role server-side regardless.
 */
export function PortalAccessDialog({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await grantPortalAccessAction(String(form.get("email")), String(form.get("clientId")));
      toast.success("Portal access granted");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toastActionError(error, "Could not grant portal access.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="h-4 w-4" /> Portal Access
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Give a client portal access</DialogTitle>
        </DialogHeader>

        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a client first.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              They must sign up at <span className="font-medium text-foreground">os.ownova.org/signup</span>{" "}
              and verify their email first. Then enter that address here.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="email">Their account email</Label>
              <Input id="email" name="email" type="email" required placeholder="client@company.com" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clientId">Client they can see</Label>
              <select
                id="clientId"
                name="clientId"
                required
                className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm"
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.company}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-muted-foreground">
              They&apos;ll see only this client&apos;s invoices, projects and shared files — never the
              internal workspace.
            </p>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Granting..." : "Grant access"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
