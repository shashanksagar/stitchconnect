import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./server/db.ts";
import { rateLimit } from "./server/errors.ts";
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [Credentials({
    name: "Email and password",
    credentials: { email: { type: "email" }, password: { type: "password" } },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      if (!email || !credentials?.password || credentials.password.length > 128) return null;
      rateLimit(`login:${email}`);
      const user = await db.user.findUnique({ where: { email } });
      if (!user || !(await compare(credentials.password, user.passwordHash))) return null;
      if (user.role !== "CUSTOMER" && process.env.DEMO_MODE !== "true") return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  })],
  callbacks: {
    async jwt({ token, user }) { if (user) token.role = user.role; return token; },
    async session({ session, token }) { session.user.id = token.sub!; session.user.role = token.role ?? "CUSTOMER"; return session; },
  },
};
