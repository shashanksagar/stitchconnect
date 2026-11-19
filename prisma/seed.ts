import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { tailors, workshopAddress } from "../src/lib/demo-data.ts";
import { createNeonAdapter } from "../src/server/neon-adapter.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required. Run neon env pull before seeding.");
const db = new PrismaClient({ adapter: createNeonAdapter(connectionString) });
try {
  if (process.env.DEMO_MODE !== "true" || !process.env.DEMO_PASSWORD) {
    throw new Error("Seeding requires DEMO_MODE=true and a local DEMO_PASSWORD.");
  }
  const passwordHash = await hash(process.env.DEMO_PASSWORD, 12);
  const users = [
    { id: "customer-demo", name: "Alex Morgan", email: "customer@stitch.local", role: "CUSTOMER" as const, location: "Brooklyn, USA" },
    { id: "admin-demo", name: "Logistics Team", email: "admin@stitch.local", role: "ADMIN" as const, location: "Stitch Connect" },
    ...tailors.map((t, i) => ({ id: t.id, name: t.name, email: `tailor${i + 1}@stitch.local`, role: "TAILOR" as const, location: t.location })),
  ];
  for (const user of users) {
    await db.user.upsert({ where: { id: user.id }, update: {}, create: { ...user, passwordHash } });
  }
  for (const t of tailors) {
    await db.tailorProfile.upsert({
      where: { userId: t.id }, update: { workshopAddress: workshopAddress(t) },
      create: { userId: t.id, bio: t.bio, specialty: t.specialty, styles: t.styles, basePrice: t.basePrice, turnaroundDays: t.turnaroundDays, rating: t.rating, portfolioImages: [t.image], workshopAddress: workshopAddress(t) },
    });
  }
  const address = { name: "Alex Morgan", line1: "18 Willow Street", city: "Brooklyn", postalCode: "11201", country: "USA", phone: "+1 555 0100" };
  for (const [i, t] of tailors.slice(0, 2).entries()) {
    await db.order.upsert({
      where: { id: `order-demo-${i + 1}` }, update: { tailorAddress: workshopAddress(t) },
      create: {
        id: `order-demo-${i + 1}`, customerId: "customer-demo", tailorId: t.id,
        garmentType: i ? "Suit" : "Dress", measurements: { chest: 92, waist: 74, length: 110, unit: "cm" },
        referenceImages: [], totalAmount: t.basePrice, platformFeePercent: 10,
        platformFeeAmount: Math.round(t.basePrice / 10), tailorPayout: t.basePrice - Math.round(t.basePrice / 10),
        upfrontPaid: true, status: i ? "READY_FOR_DELIVERY" : "STITCHING",
        pickupAddress: address, deliveryAddress: address, tailorAddress: workshopAddress(t), checkoutKey: `seed-checkout-${i}`,
        payments: { create: { installment: "UPFRONT", amount: Math.ceil(t.basePrice / 2), status: "SUCCEEDED", idempotencyKey: `seed-payment-${i}`, eventId: `seed-event-${i}` } },
        shipments: { create: [{ leg: "FABRIC_PICKUP", status: "DELIVERED", courier: "Stitch Local", tracking: `FABRIC-${i + 1}`, deliveredAt: new Date() }, { leg: "FINAL_DELIVERY" }] },
        messages: { create: { senderId: t.id, content: "Welcome! I have your fabric and measurements. We can discuss the finishing details here.", clientKey: `seed-message-${i}` } },
      },
    });
  }
  console.log("Seed complete: 5 tailors, 2 orders. Demo emails: customer@stitch.local, admin@stitch.local, tailor1..5@stitch.local.");
} finally {
  await db.$disconnect();
}
