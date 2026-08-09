"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * "Invite Member" used to be a button that did nothing.
 *
 * A true invite flow needs transactional email (a tokenised link, expiry, an accept screen), and
 * no mail transport is configured — Cognito's default sender only handles verification codes.
 * Rather than fake it, this explains the process that genuinely works today: the person signs up
 * themselves, then an admin assigns their role here.
 */
export function InviteMemberDialog({ canAssignRoles }: { canAssignRoles: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a team member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Email invitations aren&apos;t set up yet. Here&apos;s how to add someone today:
          </p>

          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                1
              </span>
              <span>
                Ask them to sign up at{" "}
                <span className="font-medium text-foreground">os.ownova.org/signup</span> with their
                work email.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                2
              </span>
              <span>They verify their email with the code they receive, then sign in once.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                3
              </span>
              <span>
                They appear on this page as a <span className="font-medium text-foreground">developer</span>.{" "}
                {canAssignRoles
                  ? "Change their role using the dropdown on their card."
                  : "An admin or the CEO can then set their role."}
              </span>
            </li>
          </ol>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => setOpen(false)}>
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
