import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errors";
import { createToken, requireAuth } from "../middleware/auth";

const router = Router();
const credentials = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
});

router.post("/register", async (request, response, next) => {
  try {
    const input = credentials.extend({ name: z.string().trim().min(2).max(60) }).parse(request.body);
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, "An account with this email already exists.");

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email,
        passwordHash: await bcrypt.hash(input.password, 12),
      },
      select: { id: true, name: true, email: true },
    });
    response.status(201).json({ user, token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    const input = credentials.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new HttpError(401, "Email or password is incorrect.");
    }

    const safeUser = { id: user.id, name: user.name, email: user.email };
    response.json({ user: safeUser, token: createToken(safeUser) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (request, response) => {
  response.json({ user: request.user });
});

export default router;
