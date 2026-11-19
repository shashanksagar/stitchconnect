import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ error: error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "This record already exists. Refresh and retry." }, { status: 409 });
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P1008", "P2028"].includes(error.code)) return Response.json({ error: "This record is being updated. Refresh and retry." }, { status: 409 });
  if (error instanceof SyntaxError) return Response.json({ error: "Malformed request body." }, { status: 400 });
  console.error("Request failed", error);
  return Response.json({ error: "The request could not be completed. Please retry." }, { status: 500 });
}
const attempts = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max = 10) {
  const now = Date.now();
  for (const [k, item] of attempts) if (item.reset < now) attempts.delete(k);
  const item = attempts.get(key) ?? { count: 0, reset: now + 60_000 };
  item.count++;
  attempts.set(key, item);
  if (item.count > max) throw new AppError("Too many requests. Please wait a minute.", 429);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!process.env.NEXTAUTH_URL || origin !== new URL(process.env.NEXTAUTH_URL).origin) throw new AppError("Cross-origin request rejected.", 403);
}
