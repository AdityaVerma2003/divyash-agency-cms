import { Router } from "express";
import { BlogPostStatus, Role } from "@prisma/client";
import { z } from "zod";
import path from "path";
import fs from "fs";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { logAudit } from "../lib/audit";

// ── Slug helpers ──────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  let n = 2;
  while (true) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${n++}`;
  }
}

// ── Cover-image upload (multer / local disk) ──────────────────────────────────
// To swap for S3/Cloudinary: replace diskStorage with a cloud-storage engine and
// return the remote URL instead of the local path.

const COVER_DIR = path.join(process.cwd(), "uploads", "blog-covers");
fs.mkdirSync(COVER_DIR, { recursive: true });

const coverUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, COVER_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  excerpt: z.string().min(1).max(500),
  contentMarkdown: z.string().min(1),
  coverImageUrl: z.string().url().optional(),
  category: z.string().max(60).optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.nativeEnum(BlogPostStatus).optional(),
});

// ── Public router ─────────────────────────────────────────────────────────────

export const publicBlogRouter = Router();

// GET /api/blog-posts — published posts, newest first, paginated, optional ?category=
publicBlogRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const limit    = Math.min(Number(req.query.limit) || 10, 100);
    const page     = Math.max(Number(req.query.page) || 1, 1);
    const skip     = (page - 1) * limit;
    const category = req.query.category as string | undefined;

    const where = {
      status: BlogPostStatus.PUBLISHED,
      ...(category && category !== "All" ? { category } : {}),
    };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true, title: true, slug: true, excerpt: true,
          coverImageUrl: true, category: true, publishedAt: true,
          author: { select: { id: true, name: true } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=60");
    res.json({ posts, total, page, limit, pages: Math.ceil(total / limit) });
  })
);

// GET /api/blog-posts/:slug — single published post
publicBlogRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug },
      include: { author: { select: { id: true, name: true } } },
    });
    if (!post || post.status !== BlogPostStatus.PUBLISHED) {
      throw ApiError.notFound("Post not found");
    }
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=120");
    res.json(post);
  })
);

// ── Admin router ──────────────────────────────────────────────────────────────

export const adminBlogRouter = Router();
adminBlogRouter.use(authenticate);
adminBlogRouter.use(authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER));

// GET /api/admin/blog-posts/:id — single post (any status, for editing)
adminBlogRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
      include: { author: { select: { id: true, name: true } } },
    });
    if (!post) throw ApiError.notFound("Post not found");
    res.json(post);
  })
);

// GET /api/admin/blog-posts — all posts (draft + published), ?status= filter
adminBlogRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const statusFilter = req.query.status as BlogPostStatus | undefined;

    const posts = await prisma.blogPost.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true } } },
    });
    res.json(posts);
  })
);

// POST /api/admin/blog-posts — create draft
adminBlogRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const baseSlug = data.slug ? slugify(data.slug) : slugify(data.title);
    const slug = await uniqueSlug(baseSlug);

    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        contentMarkdown: data.contentMarkdown,
        coverImageUrl: data.coverImageUrl,
        category: data.category,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        status: BlogPostStatus.DRAFT,
        authorId: req.user!.userId,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entity: "BlogPost",
      entityId: post.id,
      meta: { title: post.title, slug: post.slug },
    }).catch(() => undefined);

    res.status(201).json(post);
  })
);

// PATCH /api/admin/blog-posts/:id — update
adminBlogRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);

    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("Post not found");

    // Compute slug if title changed and slug not explicitly provided
    let slug: string | undefined;
    if (data.slug !== undefined) {
      slug = await uniqueSlug(slugify(data.slug), existing.id);
    } else if (data.title && data.title !== existing.title && !data.slug) {
      slug = await uniqueSlug(slugify(data.title), existing.id);
    }

    // First publish: set publishedAt
    const firstPublish =
      data.status === BlogPostStatus.PUBLISHED &&
      existing.status === BlogPostStatus.DRAFT;
    const publishedAt = firstPublish ? new Date() : existing.publishedAt;

    const updated = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: {
        ...(data.title     !== undefined && { title: data.title }),
        ...(slug           !== undefined && { slug }),
        ...(data.excerpt   !== undefined && { excerpt: data.excerpt }),
        ...(data.contentMarkdown !== undefined && { contentMarkdown: data.contentMarkdown }),
        ...(data.coverImageUrl   !== undefined && { coverImageUrl: data.coverImageUrl }),
        ...(data.category        !== undefined && { category: data.category }),
        ...(data.metaTitle       !== undefined && { metaTitle: data.metaTitle }),
        ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
        ...(data.status !== undefined && { status: data.status }),
        publishedAt,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    if (firstPublish) {
      logAudit({
        userId: req.user!.userId,
        action: "PUBLISH",
        entity: "BlogPost",
        entityId: updated.id,
        meta: { title: updated.title, slug: updated.slug },
      }).catch(() => undefined);
    } else {
      logAudit({
        userId: req.user!.userId,
        action: "UPDATE",
        entity: "BlogPost",
        entityId: updated.id,
        meta: { title: updated.title },
      }).catch(() => undefined);
    }

    res.json(updated);
  })
);

// DELETE /api/admin/blog-posts/:id
adminBlogRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("Post not found");

    await prisma.blogPost.delete({ where: { id: req.params.id } });

    logAudit({
      userId: req.user!.userId,
      action: "DELETE",
      entity: "BlogPost",
      entityId: req.params.id,
      meta: { title: existing.title, slug: existing.slug },
    }).catch(() => undefined);

    res.status(204).end();
  })
);

// POST /api/admin/blog-posts/:id/cover-image — upload cover image
adminBlogRouter.post(
  "/:id/cover-image",
  coverUpload.single("cover"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("Post not found");

    if (!req.file) throw ApiError.badRequest("No file uploaded");

    const apiBase = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
    const coverImageUrl = `${apiBase}/uploads/blog-covers/${req.file.filename}`;

    await prisma.blogPost.update({
      where: { id: req.params.id },
      data: { coverImageUrl },
    });

    res.json({ coverImageUrl });
  })
);
