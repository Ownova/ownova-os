"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, Mail, Globe, MapPin, Send, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toastActionError } from "@/lib/action-toast";
import { updateClientStageAction, addClientNoteAction } from "@/app/actions/lead-actions";
import type { Client } from "@/types";

/**
 * Everything you do to a lead, in one place: reach them, move them, record what happened.
 *
 * The contact buttons are plain tel:/wa.me/mailto: links rather than an in-app dialler or inbox.
 * That's deliberate — they hand off to whatever the person already uses, work on mobile, and
 * cannot silently fail to deliver. Building an inbox here would be a lot of work to end up worse
 * than the phone app they already have.
 */
const STAGES = [
  { key: "lead", label: "Lead" },
  { key: "contacted", label: "Contacted" },
  { key: "meeting", label: "Meeting" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

/** wa.me needs digits only — no +, spaces or dashes, or the link silently opens an empty chat. */
function waNumber(phone?: string) {
  return (phone || "").replace(/\D/g, "");
}

export function LeadWorkspace({ client }: { client: Client }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [savingNote, startNote] = useTransition();
  const [movingStage, startStage] = useTransition();

  function moveTo(stage: string) {
    startStage(async () => {
      try {
        await updateClientStageAction(client.id, stage);
        toast.success(`Moved to ${stage.replace("_", " ")}`);
        router.refresh();
      } catch (e) {
        toastActionError(e, "Could not move this lead.");
      }
    });
  }

  function saveNote() {
    startNote(async () => {
      try {
        await addClientNoteAction(client.id, note);
        setNote("");
        toast.success("Note saved");
        router.refresh();
      } catch (e) {
        toastActionError(e, "Could not save the note.");
      }
    });
  }

  const wa = waNumber(client.phone);

  return (
    <div className="space-y-5">
      {/* --- Reach them ----------------------------------------------------------------- */}
      <div className="rounded-xl border border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Contact
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {client.phone ? (
            <>
              <Button size="sm" asChild>
                <a href={`tel:${client.phone.replace(/\s/g, "")}`}>
                  <Phone className="h-3.5 w-3.5" /> Call {client.phone}
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No phone number on this lead.</p>
          )}

          {client.email && (
            <Button size="sm" variant="outline" asChild>
              <a href={`mailto:${client.email}`}>
                <Mail className="h-3.5 w-3.5" /> Email
              </a>
            </Button>
          )}

          {client.website && (
            <Button size="sm" variant="outline" asChild>
              <a href={client.website} target="_blank" rel="noopener noreferrer">
                <Globe className="h-3.5 w-3.5" /> Website
              </a>
            </Button>
          )}

          {client.address && (
            <Button size="sm" variant="outline" asChild>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(client.address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin className="h-3.5 w-3.5" /> Map
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* --- Move them ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Pipeline stage
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STAGES.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={client.stage === s.key ? "default" : "outline"}
              disabled={movingStage}
              onClick={() => moveTo(s.key)}
            >
              {client.stage === s.key && <Check className="h-3 w-3" />}
              {s.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Move to <span className="font-medium text-foreground">Contacted</span> the moment you
          call, so nobody calls them twice.
        </p>
      </div>

      {/* --- Record what happened -------------------------------------------------------- */}
      <div className="rounded-xl border border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Log a note
        </p>
        <Textarea
          className="mt-2"
          rows={3}
          placeholder="Called — receptionist said the owner is in Thursday. Try 10am."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={saveNote} disabled={savingNote || !note.trim()}>
            <Send className="h-3.5 w-3.5" /> {savingNote ? "Saving..." : "Save note"}
          </Button>
        </div>
      </div>
    </div>
  );
}
