import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { getServerSession } from "@/lib/session";

// Every page in this group reads live data from Aurora and/or the session cookie, so none of them
// can be meaningfully prerendered at build time. Without this, `next build` tries to statically
// render them inside the Amplify build container — where a single failed DB query aborts the whole
// deploy (this caused build failures #5-#11). Route segment config on a layout applies to all
// segments beneath it, so this covers the entire (app) group.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Single app-wide auth gate. The session cookie holds a Cognito ID token that expires after a
  // week, and once it does every server action behind these pages would start failing with an
  // opaque error while the UI still looked signed in. Checking here means an expired or missing
  // session sends the user to the login screen instead, which is the only sensible outcome.
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
