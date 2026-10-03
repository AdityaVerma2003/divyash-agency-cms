import { Router } from "express";
import { Prisma, Role, TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { logAudit } from "../lib/audit";
import { notify } from "../lib/notify";
import { uploadToCloudinary } from "../lib/cloudinary";

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ── Schemas ───────────────────────────────────────────────────────────────

const taskInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueDate: z.coerce.date().optional(),
  clientId: z.string().uuid().optional(),
  assigneeIds: z.array(z.string().uuid()).default([]),
});

const taskUpdateSchema = taskInputSchema.partial();

const moveSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  position: z.number().int().min(0),
});

const commentSchema = z.object({ body: z.string().min(1).max(4000) });

// Everything a board card needs, in one query
const TASK_INCLUDE = {
  client: { select: { id: true, companyName: true } },
  createdBy: { select: { id: true, name: true, photoUrl: true } },
  assignees: {
    select: { user: { select: { id: true, name: true, photoUrl: true } } },
  },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.TaskInclude;

function shapeTask(task: Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>) {
  const { assignees, _count, ...rest } = task;
  return {
    ...rest,
    assignees: assignees.map((a) => a.user),
    commentCount: _count.comments,
    attachmentCount: _count.attachments,
  };
}

/** Team members only ever see tasks assigned to them or created by them. */
function visibilityWhere(user: { userId: string; role: Role }): Prisma.TaskWhereInput {
  if (user.role === Role.SUPER_ADMIN) return {};
  return {
    OR: [{ assignees: { some: { userId: user.userId } } }, { createdById: user.userId }],
  };
}

async function loadVisibleTask(id: string, user: { userId: string; role: Role }) {
  const task = await prisma.task.findFirst({
    where: { AND: [{ id }, visibilityWhere(user)] },
    include: TASK_INCLUDE,
  });
  if (!task) throw ApiError.notFound("Task not found");
  return task;
}

// ── Staff router ──────────────────────────────────────────────────────────

const router = Router();
router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER));

// GET /api/tasks
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, priority, clientId, assigneeId, q } = req.query as Record<string, string | undefined>;

    const filters: Prisma.TaskWhereInput[] = [visibilityWhere(req.user!)];
    if (status && status in TaskStatus) filters.push({ status: status as TaskStatus });
    if (priority && priority in TaskPriority) filters.push({ priority: priority as TaskPriority });
    if (clientId) filters.push({ clientId });
    if (assigneeId) filters.push({ assignees: { some: { userId: assigneeId } } });
    if (q) filters.push({ title: { contains: q, mode: "insensitive" } });

    const tasks = await prisma.task.findMany({
      where: { AND: filters },
      include: TASK_INCLUDE,
      orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "desc" }],
    });
    res.json(tasks.map(shapeTask));
  })
);

// GET /api/tasks/:id — with comments + attachments for the detail modal
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    await loadVisibleTask(req.params.id, req.user!);
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        ...TASK_INCLUDE,
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true, body: true, createdAt: true,
            user: { select: { id: true, name: true, photoUrl: true } },
          },
        },
        attachments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true, fileUrl: true, fileName: true, fileSize: true, createdAt: true,
            uploadedBy: { select: { id: true, name: true } },
          },
        },
      },
    });
    const { assignees, _count, ...rest } = task!;
    res.json({
      ...rest,
      assignees: assignees.map((a) => a.user),
      commentCount: _count.comments,
      attachmentCount: _count.attachments,
    });
  })
);

// POST /api/tasks — SUPER_ADMIN creates and assigns
router.post(
  "/",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const data = taskInputSchema.parse(req.body);

    const last = await prisma.task.findFirst({
      where: { status: data.status },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate,
        clientId: data.clientId,
        position: (last?.position ?? -1) + 1,
        createdById: req.user!.userId,
        assignees: { create: data.assigneeIds.map((userId) => ({ userId })) },
      },
      include: TASK_INCLUDE,
    });

    for (const userId of data.assigneeIds) {
      notify(userId, "TASK_ASSIGNED", `You were assigned a task: ${task.title}`, "/workspace/tasks").catch(
        () => undefined
      );
    }
    logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entity: "Task",
      entityId: task.id,
      meta: { title: task.title, assignees: data.assigneeIds.length },
    }).catch(() => undefined);

    res.status(201).json(shapeTask(task));
  })
);

// PATCH /api/tasks/:id
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await loadVisibleTask(req.params.id, req.user!);
    const data = taskUpdateSchema.parse(req.body);

    // Reassignment and client-linking are SUPER_ADMIN-only; stripped server-side
    // rather than merely hidden in the UI.
    if (req.user!.role !== Role.SUPER_ADMIN) {
      delete data.assigneeIds;
      delete data.clientId;
    }

    const task = await prisma.task.update({
      where: { id: existing.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.clientId !== undefined && { clientId: data.clientId }),
        ...(data.assigneeIds !== undefined && {
          assignees: {
            deleteMany: {},
            create: data.assigneeIds.map((userId) => ({ userId })),
          },
        }),
      },
      include: TASK_INCLUDE,
    });

    if (data.assigneeIds) {
      const previous = new Set(existing.assignees.map((a) => a.user.id));
      for (const userId of data.assigneeIds.filter((id) => !previous.has(id))) {
        notify(userId, "TASK_ASSIGNED", `You were assigned a task: ${task.title}`, "/workspace/tasks").catch(
          () => undefined
        );
      }
    }
    logAudit({
      userId: req.user!.userId,
      action: "UPDATE",
      entity: "Task",
      entityId: task.id,
      meta: { title: task.title },
    }).catch(() => undefined);

    res.json(shapeTask(task));
  })
);

// PATCH /api/tasks/:id/move — drag-and-drop between/within columns
router.patch(
  "/:id/move",
  asyncHandler(async (req, res) => {
    const existing = await loadVisibleTask(req.params.id, req.user!);
    const { status, position } = moveSchema.parse(req.body);

    // Re-flow the destination column so positions stay dense and ordered
    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: existing.id },
        data: { status, position: -1 },
      });
      const siblings = await tx.task.findMany({
        where: { status, id: { not: existing.id } },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      const ordered = [
        ...siblings.slice(0, position).map((s) => s.id),
        existing.id,
        ...siblings.slice(position).map((s) => s.id),
      ];
      for (let i = 0; i < ordered.length; i++) {
        await tx.task.update({ where: { id: ordered[i] }, data: { position: i } });
      }
    });

    const task = await prisma.task.findUnique({ where: { id: existing.id }, include: TASK_INCLUDE });
    res.json(shapeTask(task!));
  })
);

// DELETE /api/tasks/:id — SUPER_ADMIN only
router.delete(
  "/:id",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: { id: true, title: true } });
    if (!task) throw ApiError.notFound("Task not found");
    await prisma.task.delete({ where: { id: task.id } });
    logAudit({
      userId: req.user!.userId,
      action: "DELETE",
      entity: "Task",
      entityId: task.id,
      meta: { title: task.title },
    }).catch(() => undefined);
    res.status(204).send();
  })
);

// POST /api/tasks/:id/comments
router.post(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const task = await loadVisibleTask(req.params.id, req.user!);
    const { body } = commentSchema.parse(req.body);

    const comment = await prisma.taskComment.create({
      data: { taskId: task.id, userId: req.user!.userId, body },
      select: {
        id: true, body: true, createdAt: true,
        user: { select: { id: true, name: true, photoUrl: true } },
      },
    });

    // Tell everyone involved except the commenter
    const recipients = new Set([...task.assignees.map((a) => a.user.id), task.createdById]);
    recipients.delete(req.user!.userId);
    for (const userId of recipients) {
      notify(userId, "TASK_COMMENT", `New comment on "${task.title}"`, "/workspace/tasks").catch(() => undefined);
    }

    res.status(201).json(comment);
  })
);

// POST /api/tasks/:id/attachments
router.post(
  "/:id/attachments",
  attachmentUpload.single("file"),
  asyncHandler(async (req, res) => {
    const task = await loadVisibleTask(req.params.id, req.user!);
    if (!req.file) throw ApiError.badRequest("No file uploaded");

    const fileUrl = await uploadToCloudinary(req.file.buffer, {
      folder: "divyash-agency/task-attachments",
      resource_type: "auto",
    });

    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId: task.id,
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedById: req.user!.userId,
      },
      select: {
        id: true, fileUrl: true, fileName: true, fileSize: true, createdAt: true,
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(attachment);
  })
);

export default router;

// ── Client portal router — read-only, only client-linked tasks ───────────

export const portalTasksRouter = Router();
portalTasksRouter.use(authenticate);
portalTasksRouter.use(authorize(Role.CLIENT));

portalTasksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const clientId = req.user!.clientId;
    if (!clientId) throw ApiError.forbidden("No client account linked to this user");

    // Only tasks explicitly linked to this client, projected down — internal
    // description, comments and attachments are not exposed.
    const tasks = await prisma.task.findMany({
      where: { clientId },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        assignees: { select: { user: { select: { id: true, name: true, photoUrl: true } } } },
      },
    });

    res.json(
      tasks.map((t) => ({
        ...t,
        assignees: t.assignees.map((a) => a.user),
      }))
    );
  })
);
