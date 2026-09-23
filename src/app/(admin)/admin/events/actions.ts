"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { asClubAdmin, requireClubAdmin } from "@/lib/auth";
import { createEvent, updateEvent } from "@/lib/events/service";

const eventSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  eventDate: z.string().optional().or(z.literal("")),
});

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function clubIdFor(user: Awaited<ReturnType<typeof requireClubAdmin>>): string {
  if (user.clubId) return user.clubId;
  throw new Error("Club context required");
}

export async function createEventAction(formData: FormData): Promise<ActionResult> {
  return asClubAdmin(async (user) => {
  const clubId = clubIdFor(user);

  const parsed = eventSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    eventDate: formData.get("eventDate") || "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await createEvent({
    clubId,
    actorUserId: user.id,
    name: parsed.data.name,
    description: parsed.data.description,
    eventDate: parsed.data.eventDate,
  });
  if (!result.ok) return result;

  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/admin/audit");
  return { ok: true, id: result.id };
  });
}

export async function updateEventAction(formData: FormData): Promise<ActionResult> {
  return asClubAdmin(async (user) => {
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

  const result = await updateEvent({
    clubId,
    actorUserId: user.id,
    eventId: id,
    name: parsed.data.name,
    description: parsed.data.description,
    eventDate: parsed.data.eventDate,
  });
  if (!result.ok) return result;

  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/admin/audit");
  return { ok: true, id: result.id };
  });
}
