import { writeAuditLog } from "@/lib/audit";
import { type ActionResult, fail, ok } from "@/lib/action-result";
import { prisma } from "@/lib/db";

export async function createEvent(input: {
  clubId: string;
  actorUserId: string;
  name: string;
  description?: string | null;
  eventDate?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const event = await prisma.event.create({
    data: {
      clubId: input.clubId,
      name: input.name,
      description: input.description || null,
      eventDate: input.eventDate ? new Date(input.eventDate) : null,
    },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "event.create",
    targetType: "Event",
    targetId: event.id,
    clubId: input.clubId,
    metadata: { name: event.name },
  });

  return ok({ id: event.id });
}

export async function updateEvent(input: {
  clubId: string;
  actorUserId: string;
  eventId: string;
  name: string;
  description?: string | null;
  eventDate?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const existing = await prisma.event.findFirst({
    where: { id: input.eventId, clubId: input.clubId },
  });
  if (!existing) return fail("Event not found");

  const event = await prisma.event.update({
    where: { id: input.eventId },
    data: {
      name: input.name,
      description: input.description || null,
      eventDate: input.eventDate ? new Date(input.eventDate) : null,
    },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "event.update",
    targetType: "Event",
    targetId: event.id,
    clubId: input.clubId,
    metadata: { name: event.name },
  });

  return ok({ id: event.id });
}
