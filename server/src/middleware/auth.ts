import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "../lib/errors";

type TokenPayload = { sub: string; name: string; email: string };

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET must be configured.");
  return value;
}

export function createToken(user: { id: string; name: string; email: string }) {
  return jwt.sign({ name: user.name, email: user.email }, secret(), {
    subject: user.id,
    expiresIn: "7d",
  });
}

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    next(new HttpError(401, "Please sign in to continue."));
    return;
  }

  try {
    const payload = jwt.verify(authorization.slice(7), secret()) as TokenPayload;
    if (!payload.sub || !payload.email || !payload.name) {
      throw new HttpError(401, "Your session is invalid. Please sign in again.");
    }
    request.user = { id: payload.sub, name: payload.name, email: payload.email };
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Your session has expired. Please sign in again."));
  }
}
