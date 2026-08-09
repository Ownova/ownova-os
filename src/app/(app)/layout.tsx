import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";

// Every page in this group reads live data from Aurora and/or the session cookie, so none of them
// can be meaningfully prerendered at build time. Without this, `next build` tries to statically
// render them inside the Amplify build container — where a single failed DB query aborts the whole
// deploy (this caused build failures #5-#11). Route segment config on a layout applies to all
// segments beneath it, so this covers the entire (app) group.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
