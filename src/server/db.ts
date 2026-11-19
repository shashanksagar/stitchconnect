import { PrismaClient } from "@prisma/client";
import { createNeonAdapter } from "./neon-adapter.ts";
const globalDb = globalThis as typeof globalThis & { prisma?: PrismaClient };
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required. Run neon env pull before starting the application.");
export const db = globalDb.prisma ?? new PrismaClient({ adapter: createNeonAdapter(connectionString) });
if (process.env.NODE_ENV !== "production") globalDb.prisma = db;
