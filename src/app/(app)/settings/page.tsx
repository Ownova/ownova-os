import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

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

export default function SettingsPage() {
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
              <div className="space-y-1.5">
                <Label>Agency Name</Label>
                <Input defaultValue="Ownova" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Email</Label>
                <Input defaultValue="ownova.org@gmail.com" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Tagline</Label>
                <Input defaultValue="Automating the Future, Empowering Businesses." />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address (shown on invoices)</Label>
                <Textarea placeholder="Street, City, Country" />
              </div>
              <div className="sm:col-span-2">
                <Button size="sm">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardHeader><CardTitle className="text-foreground text-base font-semibold">Invoicing &amp; Tax</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 pt-0 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Default Currency</Label>
                <Input defaultValue="USD" />
              </div>
              <div className="space-y-1.5">
                <Label>Default Tax Rate (%)</Label>
                <Input type="number" defaultValue={0} />
              </div>
              <div className="space-y-1.5">
                <Label>Invoice Number Format</Label>
                <Input defaultValue="INV-{YYYY}-{0000}" />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Terms (days)</Label>
                <Input type="number" defaultValue={14} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Default Payment Instructions</Label>
                <Textarea placeholder="Bank details, Stripe link, Wise details..." />
              </div>
              <div className="sm:col-span-2">
                <Button size="sm">Save Changes</Button>
              </div>
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
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
