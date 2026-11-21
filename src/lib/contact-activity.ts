import { prisma } from "@/lib/prisma";

/** Keep customer "last seen" fresh for win-back segments. */
export async function touchContactActivity(contactId: string | null | undefined) {
  if (!contactId) return;
  await prisma.contact.update({
    where: { id: contactId },
    data: { lastActivityAt: new Date() },
  });
}
