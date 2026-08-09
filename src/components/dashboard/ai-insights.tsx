import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const insights = [
  "3 invoices are overdue or due within 7 days — worth a follow-up nudge to Iqbal Textiles and Brightline Retail.",
  "Brightline Retail Meta Ads is 90% complete and nearing budget — flag before final delivery.",
  "Client growth is up 158% over the last 6 months; consider raising onboarding capacity for Q4.",
];

export function AIInsightsPanel() {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Sparkles className="h-4 w-4 text-primary" />
        <CardTitle className="text-foreground text-base font-semibold">AI Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {insights.map((i, idx) => (
          <p key={idx} className="rounded-lg bg-muted/40 p-3 text-sm leading-snug text-foreground/90">
            {i}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
