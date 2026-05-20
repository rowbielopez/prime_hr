import { redirect } from "next/navigation";

/**
 * /me/pds — convenience route that forwards employees to the PDS workspace at /pds.
 * This gives employees a "My PDS" entry under "My Workspace" in the sidebar.
 */
export default function MyPdsRedirectPage() {
    redirect("/pds");
}
