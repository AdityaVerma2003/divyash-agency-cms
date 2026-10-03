import { Router } from "express";
import { EventMode, Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { logAudit } from "../lib/audit";
import { notify } from "../lib/notify";
import { sendEmail } from "../lib/email";
import { meetingScheduledHtml, meetingScheduledSubject } from "../lib/emailTemplates";

/**
 * Local calendar events. Google Calendar sync is a deliberate follow-up — it
 * would need `googleapis`, OAuth credentials, a per-user token model and
 * `googleEventId`/`source` columns. None of that is stubbed here.
 */

const eventInputSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    allDay: z.boolean().default(false),
    mode: z.nativeEnum(EventMode).default(EventMode.OFFLINE),
    location: z.string().max(300).optional(),
    meetingUrl: z.string().url().max(500).optional().or(z.literal("")),
    // The client being met with for an ONLINE meeting — ad-hoc, not tied to a
    // registered Client row (see schema.prisma). Used only to send the
    // "meeting scheduled" email; never required.
    clientEmail: z.string().email().max(255).optional().or(z.literal("")),
    colorTag: z.string().max(30).optional(),
    clientId: z.string().uuid().optional(),
    attendeeIds: z.array(z.string().uuid()).default([]),
  })
  .refine((v) => v.endAt.getTime() > v.startAt.getTime(), {
    message: "The end time must be after the start time",
    path: ["endAt"],
  })
  .refine((v) => v.mode !== EventMode.ONLINE || !!v.meetingUrl, {
    message: "An online event needs a meeting link",
    path: ["meetingUrl"],
  })
  .refine((v) => v.mode !== EventMode.OFFLINE || !!v.location, {
    message: "An offline event needs a location",
    path: ["location"],
  });

const EVENT_INCLUDE = {
  client: { select: { id: true, companyName: true } },
  createdBy: { select: { id: true, name: true } },
  attendees: { select: { user: { select: { id: true, name: true, photoUrl: true } } } },
} satisfies Prisma.CalendarEventInclude;

function shapeEvent(event: Prisma.CalendarEventGetPayload<{ include: typeof EVENT_INCLUDE }>) {
  const { attendees, ...rest } = event;
  return { ...rest, attendees: attendees.map((a) => a.user) };
}

const router = Router();
router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER));

/** Team members see events they created or are invited to; super admins see all. */
function visibilityWhere(user: { userId: string; role: Role }): Prisma.CalendarEventWhereInput {
  if (user.role === Role.SUPER_ADMIN) return {};
  return {
    OR: [{ createdById: user.userId }, { attendees: { some: { userId: user.userId } } }],
  };
}

// GET /api/calendar-events?from=&to=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as Record<string, string | undefined>;
    const range: Prisma.CalendarEventWhereInput = {};
    if (from || to) {
      // An event overlaps the window if it starts before the end and ends after the start
      range.AND = [
        ...(to ? [{ startAt: { lte: new Date(to) } }] : []),
        ...(from ? [{ endAt: { gte: new Date(from) } }] : []),
      ];
    }

    const events = await prisma.calendarEvent.findMany({
      where: { AND: [visibilityWhere(req.user!), range] },
      include: EVENT_INCLUDE,
      orderBy: { startAt: "asc" },
    });
    res.json(events.map(shapeEvent));
  })
);

// POST /api/calendar-events
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = eventInputSchema.parse(req.body);

    const event = await prisma.calendarEvent.create({
      data: {
        title: data.title,
        description: data.description,
        startAt: data.startAt,
        endAt: data.endAt,
        allDay: data.allDay,
        mode: data.mode,
        location: data.mode === EventMode.OFFLINE ? data.location : null,
        meetingUrl: data.mode === EventMode.ONLINE ? data.meetingUrl || null : null,
        clientEmail: data.mode === EventMode.ONLINE ? data.clientEmail || null : null,
        colorTag: data.colorTag,
        clientId: data.clientId,
        createdById: req.user!.userId,
        attendees: { create: data.attendeeIds.map((userId) => ({ userId })) },
      },
      include: EVENT_INCLUDE,
    });

    for (const userId of data.attendeeIds.filter((id) => id !== req.user!.userId)) {
      notify(userId, "EVENT_INVITE", `You were added to "${event.title}"`, "/admin/calendar").catch(() => undefined);
    }

    // Email the client (if an email was given) and the organizer who
    // scheduled it — a real inbox confirmation, not just an in-app notification.
    if (event.mode === EventMode.ONLINE && event.meetingUrl) {
      const organizer = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true, email: true } });
      const organizerName = organizer?.name ?? "Your account manager";
      const mailOpts = {
        title: event.title,
        description: event.description,
        startAt: event.startAt,
        endAt: event.endAt,
        meetingUrl: event.meetingUrl,
        organizerName,
      };
      const recipients = [
        ...(event.clientEmail ? [{ email: event.clientEmail, name: undefined as string | undefined }] : []),
        ...(organizer?.email ? [{ email: organizer.email, name: organizer.name }] : []),
      ];
      for (const r of recipients) {
        sendEmail(
          r.email,
          meetingScheduledSubject(event.title),
          meetingScheduledHtml({ ...mailOpts, recipientName: r.name })
        ).catch((err) => console.error(`Failed to send meeting-scheduled email to ${r.email}:`, err));
      }
    }

    logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entity: "CalendarEvent",
      entityId: event.id,
      meta: { title: event.title, mode: event.mode },
    }).catch(() => undefined);

    res.status(201).json(shapeEvent(event));
  })
);

// PATCH /api/calendar-events/:id
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.calendarEvent.findFirst({
      where: { AND: [{ id: req.params.id }, visibilityWhere(req.user!)] },
      select: { id: true, createdById: true },
    });
    if (!existing) throw ApiError.notFound("Event not found");
    if (req.user!.role !== Role.SUPER_ADMIN && existing.createdById !== req.user!.userId) {
      throw ApiError.forbidden("You can only edit events you created");
    }

    const data = eventInputSchema.parse(req.body);
    const event = await prisma.calendarEvent.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        description: data.description,
        startAt: data.startAt,
        endAt: data.endAt,
        allDay: data.allDay,
        mode: data.mode,
        location: data.mode === EventMode.OFFLINE ? data.location : null,
        meetingUrl: data.mode === EventMode.ONLINE ? data.meetingUrl || null : null,
        clientEmail: data.mode === EventMode.ONLINE ? data.clientEmail || null : null,
        colorTag: data.colorTag,
        clientId: data.clientId ?? null,
        attendees: {
          deleteMany: {},
          create: data.attendeeIds.map((userId) => ({ userId })),
        },
      },
      include: EVENT_INCLUDE,
    });

    logAudit({
      userId: req.user!.userId,
      action: "UPDATE",
      entity: "CalendarEvent",
      entityId: event.id,
      meta: { title: event.title },
    }).catch(() => undefined);

    res.json(shapeEvent(event));
  })
);

// DELETE /api/calendar-events/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.calendarEvent.findFirst({
      where: { AND: [{ id: req.params.id }, visibilityWhere(req.user!)] },
      select: { id: true, title: true, createdById: true },
    });
    if (!existing) throw ApiError.notFound("Event not found");
    if (req.user!.role !== Role.SUPER_ADMIN && existing.createdById !== req.user!.userId) {
      throw ApiError.forbidden("You can only delete events you created");
    }

    await prisma.calendarEvent.delete({ where: { id: existing.id } });
    logAudit({
      userId: req.user!.userId,
      action: "DELETE",
      entity: "CalendarEvent",
      entityId: existing.id,
      meta: { title: existing.title },
    }).catch(() => undefined);

    res.status(204).send();
  })
);

export default router;
