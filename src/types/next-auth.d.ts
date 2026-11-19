import "next-auth";
import "next-auth/jwt";
import type { Role } from "@prisma/client";
declare module "next-auth" {
  interface Session { user: { id: string; name?: string | null; email?: string | null; role: Role } }
  interface User { role: Role }
}
declare module "next-auth/jwt" { interface JWT { role?: Role } }
