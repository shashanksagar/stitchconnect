import { afterAll, describe, expect, it } from "vitest";
import { db } from "../src/server/db.ts";
import { createOrder, getOrder, transitionOrder } from "../src/server/orders.ts";
import { signupSchema, measurementsSchema } from "../src/lib/validation.ts";
import { customer, tailor, stranger, admin, orderInput, freshOrder } from "./fixtures.ts";
afterAll(() => db.$disconnect());
describe("checkout and role boundaries", () => {
  it("persists immutable quote, addresses, units and exactly two shipment legs; retries reuse the checkout", async () => {
    const data = orderInput();
    const order = await createOrder(data, customer);
    const retry = await createOrder(data, customer);
    expect(retry.id).toBe(order.id);
    await expect(createOrder({ ...data, garmentType: "Shirt" }, customer)).rejects.toThrow("different details");
    const saved = await getOrder(order.id, customer);
    expect(saved.totalAmount).toBe(12000);
    expect(saved.platformFeeAmount + saved.tailorPayout).toBe(saved.totalAmount);
    expect(saved.measurements).toEqual(data.measurements);
    expect(saved.pickupAddress).toEqual(data.pickupAddress);
    expect(saved.shipments.map(s => s.leg).sort()).toEqual(["FABRIC_PICKUP", "FINAL_DELIVERY"]);
    expect(saved.upfrontPaid).toBe(false);
  });
  it("rejects privileged signup, stale prices, invalid measurements, and unauthorized access", async () => {
    expect(() => signupSchema.parse({ name: "Customer", email: "c@test.local", password: "a-valid-password", location: "USA", role: "ADMIN" })).toThrow();
    expect(() => measurementsSchema.parse({ chest: 0, waist: 40, length: 70, unit: "in" })).toThrow();
    await expect(createOrder({ ...orderInput(), quotedAmount: 1 }, customer)).rejects.toThrow("quote changed");
    await expect(createOrder(orderInput(), tailor)).rejects.toThrow("role");
    const o = await freshOrder();
    await expect(getOrder(o.id, stranger)).rejects.toThrow("not available");
    await expect(transitionOrder(o.id, { kind: "shipment", leg: "FABRIC_PICKUP", action: "dispatch" }, admin)).rejects.toThrow("upfront");
    expect((await getOrder(o.id, customer)).status).toBe("PENDING_PICKUP");
  });
});
