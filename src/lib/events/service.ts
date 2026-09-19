import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

export type EventServiceResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createEvent(input: {
  clubId: string;
  actorUserId: string;
  name: string;
  description?: string | null;
  eventDate?: string | null;
}): Promise<EventServiceResult> {
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

  return { ok: true, id: event.id };
}

export async function updateEvent(input: {
  clubId: string;
  actorUserId: string;
  eventId: string;
  name: string;
  description?: string | null;
  eventDate?: string | null;
}): Promise<EventServiceResult> {
  const existing = await prisma.event.findFirst({
    where: { id: input.eventId, clubId: input.clubId },
  });
  if (!existing) return { ok: false, error: "Event not found" };

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

  return { ok: true, id: event.id };
}
