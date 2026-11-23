import { redirect } from "next/navigation";
import { getSession, refreshSessionForUser } from "@/lib/auth";
import { provisionDefaultWorkspace } from "@/lib/provision-workspace";

export const metadata = { title: "Set up your business · WPC CRM" };

/** Legacy route — workspaces are created on signup/signin; send users to pay. */
export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  if (!session.businessId) {
    await provisionDefaultWorkspace({
      userId: session.id,
      ownerName: session.name,
    });
    await refreshSessionForUser(session.id);
  }

  redirect("/pay");
}
