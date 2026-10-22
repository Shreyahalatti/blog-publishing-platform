import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";

const router = Router();
const postInput = z.object({
  title: z.string().trim().min(5).max(120),
  excerpt: z.string().trim().min(10).max(280),
  content: z.string().trim().min(30).max(50000),
  category: z.string().trim().min(2).max(40),
  coverImage: z.union([z.string().url().max(1000), z.literal("")]).optional(),
});
const authorSelect = { id: true, name: true };
const postInclude = {
  author: { select: authorSelect },
  _count: { select: { comments: true } },
};

function makeSlug(title: string) {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 75);
  return `${base || "story"}-${Math.random().toString(36).slice(2, 8)}`;
}

function postData(input: z.infer<typeof postInput>) {
  return {
    title: input.title,
    excerpt: input.excerpt,
    content: input.content,
    category: input.category,
    coverImage: input.coverImage || null,
  };
}

router.get("/", async (request, response, next) => {
  try {
    const query = z.string().trim().max(100).optional().parse(request.query.q);
    const category = z.string().trim().max(40).optional().parse(request.query.category);
    const posts = await prisma.post.findMany({
      where: {
        published: true,
        ...(category && category !== "All stories" ? { category } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { excerpt: { contains: query, mode: "insensitive" } },
                { content: { contains: query, mode: "insensitive" } },
                { category: { contains: query, mode: "insensitive" } },
                { author: { name: { contains: query, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: postInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    response.json({ posts });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (request, response, next) => {
  try {
    const id = z.string().parse(request.params.id);
    const post = await prisma.post.findFirst({
      where: { id, published: true },
      include: {
        ...postInclude,
        comments: {
          include: { author: { select: authorSelect } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!post) throw new HttpError(404, "This story could not be found.");
    response.json({ post });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (request, response, next) => {
  try {
    const input = postInput.parse(request.body);
    const post = await prisma.post.create({
      data: { ...postData(input), slug: makeSlug(input.title), authorId: request.user!.id },
      include: postInclude,
    });
    response.status(201).json({ post });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireAuth, async (request, response, next) => {
  try {
    const id = z.string().parse(request.params.id);
    const input = postInput.parse(request.body);
    const updated = await prisma.post.updateMany({
      where: { id, authorId: request.user!.id },
      data: postData(input),
    });
    if (!updated.count) throw new HttpError(404, "Story not found or you do not have permission to edit it.");
    const post = await prisma.post.findUniqueOrThrow({
      where: { id },
      include: postInclude,
    });
    response.json({ post });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, async (request, response, next) => {
  try {
    const id = z.string().parse(request.params.id);
    const deleted = await prisma.post.deleteMany({
      where: { id, authorId: request.user!.id },
    });
    if (!deleted.count) throw new HttpError(404, "Story not found or you do not have permission to delete it.");
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post("/:id/comments", requireAuth, async (request, response, next) => {
  try {
    const id = z.string().parse(request.params.id);
    const { content } = z.object({ content: z.string().trim().min(2).max(2000) }).parse(request.body);
    const post = await prisma.post.findFirst({ where: { id, published: true }, select: { id: true } });
    if (!post) throw new HttpError(404, "This story could not be found.");
    const comment = await prisma.comment.create({
      data: { content, postId: post.id, authorId: request.user!.id },
      include: { author: { select: authorSelect } },
    });
    response.status(201).json({ comment });
  } catch (error) {
    next(error);
  }
});

export default router;
