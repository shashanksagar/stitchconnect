import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { authOptions } from "../auth.ts";
import { db } from "./db.ts";
import { AppError } from "./errors.ts";
export type Actor = { id: string; role: Role };
export async function actor(): Promise<Actor> {
  const session = await getServerSession(authOptions);
  if (!session) throw new AppError("Please log in to continue.", 401);
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true } });
  if (!user) throw new AppError("Session no longer valid.", 401);
  return user;
}
export async function pageUser(role?: Role) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (role && session.user.role !== role) redirect("/orders");
  return session.user;
}
export function requireRole(user: Actor, role: Role) {
  if (user.role !== role) throw new AppError("This action is not available for your role.", 403);
}
