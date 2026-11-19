import { db } from "./db.ts";
import { z } from "zod";
export async function catalogue() {
  const rows = await db.tailorProfile.findMany({ include: { user: { select: { id: true, name: true, location: true } } }, orderBy: { userId: "asc" } });
  return rows.map(p => ({
    id: p.userId, name: p.user.name, location: p.user.location, bio: p.bio, specialty: p.specialty,
    basePrice: p.basePrice, turnaroundDays: p.turnaroundDays, rating: p.rating,
    styles: z.array(z.string()).parse(p.styles),
    image: z.array(z.string()).min(1).parse(p.portfolioImages)[0],
  }));
}
