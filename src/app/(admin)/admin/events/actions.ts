"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireClubAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const eventSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  eventDate: z.string().optional().or(z.literal("")),
});

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function clubIdFor(user: Awaited<ReturnType<typeof requireClubAdmin>>): string {
  if (user.role === "club_admin" && user.clubId) return user.clubId;
  throw new Error("Club context required");
}

export async function createEventAction(formData: FormData): Promise<ActionResult> {
  const user = await requireClubAdmin();
  const clubId = clubIdFor(user);

  const parsed = eventSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    eventDate: formData.get("eventDate") || "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const event = await prisma.event.create({
    data: {
      clubId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      eventDate: parsed.data.eventDate
        ? new Date(parsed.data.eventDate)
        : null,
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "event.create",
    targetType: "Event",
    targetId: event.id,
    clubId,
    metadata: { name: event.name },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/admin/audit");
  return { ok: true, id: event.id };
}

export async function updateEventAction(formData: FormData): Promise<ActionResult> {
  const user = await requireClubAdmin();
  const clubId = clubIdFor(user);
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Missing event id" };

  const parsed = eventSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    eventDate: formData.get("eventDate") || "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.event.findFirst({ where: { id, clubId } });
  if (!existing) return { ok: false, error: "Event not found" };

  const event = await prisma.event.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      eventDate: parsed.data.eventDate
        ? new Date(parsed.data.eventDate)
        : null,
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "event.update",
    targetType: "Event",
    targetId: event.id,
    clubId,
    metadata: { name: event.name },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/admin/audit");
  return { ok: true, id: event.id };
}
