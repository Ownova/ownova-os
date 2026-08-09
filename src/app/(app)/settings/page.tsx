import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { requireInternalPage } from "@/lib/auth-guard";
import { SettingsForm } from "@/components/settings/settings-form";
import { getSettings } from "@/lib/data/settings";
import type { SettingsMap } from "@/lib/settings-keys";

const roles = [
  { role: "Admin", access: "Full system access, including API keys and billing" },
  { role: "CEO", access: "All modules, all reports, read/write" },
  { role: "Manager", access: "Projects, tasks, team, clients — no finance settings" },
  { role: "Sales", access: "CRM, quotations, own clients" },
  { role: "Marketing", access: "CRM read, campaigns, documents" },
  { role: "Finance", access: "Invoices, payments, expenses, reports" },
  { role: "Developer", access: "Projects and tasks assigned to them" },
  { role: "Client", access: "Client portal only — own invoices, projects, files" },
];

export default async function SettingsPage() {
  const session = await requireInternalPage();
  // The empty fallback is annotated because an untyped `{}` widens the union and erases the
  // known setting keys, so every `settings.x` lookup below fails to type-check.
  const settings: SettingsMap = await getSettings().catch(() => ({}) as SettingsMap);
  const canEdit = ["admin", "ceo"].includes(session.role);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Agency profile, finance defaults, and access control.</p>
      </div>

      <Tabs defaultValue="agency">
        <TabsList>
          <TabsTrigger value="agency">Agency</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="agency">
          <Card>
            <CardHeader><CardTitle className="text-foreground text-base font-semibold">Agency Profile</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 pt-0 sm:grid-cols-2">
              <SettingsForm disabled={!canEdit}>
              <div className="space-y-1.5">
                <Label>Agency Name</Label>
                <Input name="agency_name" defaultValue={settings.agency_name ?? "Ownova"} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Email</Label>
                <Input name="agency_email" type="email" defaultValue={settings.agency_email ?? "ownova.org@gmail.com"} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Tagline</Label>
                <Input name="agency_tagline" defaultValue={settings.agency_tagline ?? "Automating the Future, Empowering Businesses."} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address (shown on invoices)</Label>
                <Textarea name="agency_address" defaultValue={settings.agency_address ?? ""} placeholder="Street, City, Country" />
              </div>
              </SettingsForm>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardHeader><CardTitle className="text-foreground text-base font-semibold">Invoicing &amp; Tax</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 pt-0 sm:grid-cols-2">
              <SettingsForm disabled={!canEdit}>
              <div className="space-y-1.5">
                <Label>Default Currency</Label>
                <Input name="default_currency" defaultValue={settings.default_currency ?? "USD"} />
              </div>
              <div className="space-y-1.5">
                <Label>Default Tax Rate (%)</Label>
                <Input name="default_tax_rate" type="number" min="0" step="0.01" defaultValue={settings.default_tax_rate ?? "0"} />
              </div>
              <div className="space-y-1.5">
                <Label>Invoice Number Format</Label>
                <Input name="invoice_number_format" defaultValue={settings.invoice_number_format ?? "INV-{YYYY}-{0000}"} />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Terms (days)</Label>
                <Input name="payment_terms_days" type="number" min="0" defaultValue={settings.payment_terms_days ?? "14"} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Default Payment Instructions</Label>
                <Textarea name="payment_instructions" defaultValue={settings.payment_instructions ?? ""} placeholder="Bank details, Stripe link, Wise details..." />
              </div>
              </SettingsForm>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader><CardTitle className="text-foreground text-base font-semibold">Roles &amp; Permissions</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((r) => (
                    <TableRow key={r.role}>
                      <TableCell><Badge>{r.role}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{r.access}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-3 text-xs text-muted-foreground">
                These map to the `user_role` enum and RLS policies in db/migrations/0001_init.sql.
                Assign roles from the Team page.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
