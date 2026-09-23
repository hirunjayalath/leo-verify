"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, fail, ok } from "@/lib/action-result";
import { asClubAdmin } from "@/lib/auth";
import { captureException } from "@/lib/observability";
import { createEvent, updateEvent } from "@/lib/events/service";

const eventSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  eventDate: z.string().optional().or(z.literal("")),
});

const updateSchema = eventSchema.extend({
  id: z.string().min(1),
});

export async function createEventAction(formData: FormData): Promise<ActionResult<{ id?: string }>> {
  try {
    return await asClubAdmin(async (user) => {
      const parsed = eventSchema.safeParse({
        name: formData.get("name"),
        description: formData.get("description") || "",
        eventDate: formData.get("eventDate") || "",
      });
      if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid input");
      }

      const result = await createEvent({
        clubId: user.clubId,
        actorUserId: user.id,
        name: parsed.data.name,
        description: parsed.data.description,
        eventDate: parsed.data.eventDate,
      });
      if (!result.ok) return result;

      revalidatePath("/admin");
      revalidatePath("/admin/events");
      revalidatePath("/admin/audit");
      return ok({ id: result.id });
    });
  } catch (error) {
    await captureException(error, { phase: "event.create" });
    return fail("Could not create event");
  }
}

export async function updateEventAction(formData: FormData): Promise<ActionResult<{ id?: string }>> {
  try {
    return await asClubAdmin(async (user) => {
      const parsed = updateSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        description: formData.get("description") || "",
        eventDate: formData.get("eventDate") || "",
      });
      if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Missing event id");
      }

      const result = await updateEvent({
        clubId: user.clubId,
        actorUserId: user.id,
        eventId: parsed.data.id,
        name: parsed.data.name,
        description: parsed.data.description,
        eventDate: parsed.data.eventDate,
      });
      if (!result.ok) return result;

      revalidatePath("/admin");
      revalidatePath("/admin/events");
      revalidatePath("/admin/audit");
      return ok({ id: result.id });
    });
  } catch (error) {
    await captureException(error, { phase: "event.update" });
    return fail("Could not update event");
  }
}
