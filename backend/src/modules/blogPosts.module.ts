import { Router } from "express";
import { BlogPostStatus, Role } from "@prisma/client";
import { z } from "zod";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { logAudit } from "../lib/audit";
import { uploadToCloudinary, deleteFromCloudinary } from "../lib/cloudinary";

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

// ── Cover-image upload (multer memory → Cloudinary) ───────────────────────────
// Images are streamed to Cloudinary and never written to local disk,
// so uploads survive Render redeploys.

const coverUpload = multer({
  storage: multer.memoryStorage(),
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
  primaryKeyword: z.string().max(200).optional(),
  keywords: z.string().max(500).optional(),
  faqSchema: z.string().optional(),
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

    // Assemble JSON-LD structured data at response time (not stored in DB)
    const origin = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
    const articleSchema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.metaDescription ?? post.excerpt,
      author: { "@type": "Person", name: post.author.name },
      datePublished: post.publishedAt?.toISOString(),
      dateModified: post.updatedAt.toISOString(),
      publisher: {
        "@type": "Organization",
        name: "Divyash Digital",
        logo: { "@type": "ImageObject", url: `${origin}/divyash-logo.png` },
      },
      ...(post.coverImageUrl && { image: post.coverImageUrl }),
    };

    const structuredData: unknown[] = [articleSchema];

    if (post.faqSchema) {
      try {
        const faqItems = JSON.parse(post.faqSchema);
        if (Array.isArray(faqItems) && faqItems.length > 0) {
          structuredData.push({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map((item: { question: string; answer: string }) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          });
        }
      } catch {
        // malformed faqSchema — skip silently
      }
    }

    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=120");
    res.json({ ...post, structuredData });
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
        primaryKeyword: data.primaryKeyword,
        keywords: data.keywords,
        faqSchema: data.faqSchema,
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
        ...(data.primaryKeyword  !== undefined && { primaryKeyword: data.primaryKeyword }),
        ...(data.keywords        !== undefined && { keywords: data.keywords }),
        ...(data.faqSchema       !== undefined && { faqSchema: data.faqSchema }),
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

// POST /api/admin/blog-posts/:id/cover-image — upload cover image to Cloudinary
adminBlogRouter.post(
  "/:id/cover-image",
  coverUpload.single("cover"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("Post not found");

    if (!req.file) throw ApiError.badRequest("No file uploaded");

    // Upload buffer to Cloudinary; delete old image if one was already set
    const [coverImageUrl] = await Promise.all([
      uploadToCloudinary(req.file.buffer, {
        folder:    "divyash-agency/blog-covers",
        public_id: `blog-${req.params.id}`,
      }),
      existing.coverImageUrl ? deleteFromCloudinary(existing.coverImageUrl) : Promise.resolve(),
    ]);

    await prisma.blogPost.update({
      where: { id: req.params.id },
      data: { coverImageUrl },
    });

    res.json({ coverImageUrl });
  })
);
