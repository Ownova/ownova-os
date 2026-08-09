import { redirect } from "next/navigation";
import { requireInternalPage } from "@/lib/auth-guard";

/**
 * Superseded by the real client portal at /portal.
 *
 * This page used to be an internal "preview" that picked an arbitrary client and displayed their
 * invoices and projects — useful while the portal was unbuilt, but it meant any internal page
 * view rendered one specific client's billing data for no good reason, and it was the page a
 * client role would have landed on.
 *
 * The real portal is scoped per client via client_portal_access, so there is nothing left for a
 * preview to do. Access is granted from CRM, which is where staff are sent instead. Kept as a
 * redirect rather than deleted so existing links and bookmarks don't 404.
 */
export default async function ClientPortalRedirect() {
  await requireInternalPage();
  redirect("/crm");
}
