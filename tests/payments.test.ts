import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "../src/server/db.ts";
import { beginPayment, settlePayment, signPayment, simulatePayment } from "../src/server/payments.ts";
import { getOrder, ledger, transitionOrder } from "../src/server/orders.ts";
import { economics } from "../src/lib/money.ts";
import { customer, tailor, admin, stranger, freshOrder } from "./fixtures.ts";
afterAll(() => db.$disconnect());
async function arrive(id: string) {
  await transitionOrder(id, { kind: "shipment", leg: "FABRIC_PICKUP", action: "assign", courier: "Courier", contact: "555 0100", tracking: "FAB-01" }, admin);
  await transitionOrder(id, { kind: "shipment", leg: "FABRIC_PICKUP", action: "dispatch" }, admin);
  await transitionOrder(id, { kind: "shipment", leg: "FABRIC_PICKUP", action: "deliver" }, admin);
}
describe("split payment and logistics state machine", () => {
  it("runs pickup through delivery, blocks premature actions, and reconciles the ledger", async () => {
    const o = await freshOrder();
    await expect(beginPayment(o.id, "FINAL", customer)).rejects.toThrow("only available");
    await simulatePayment(o.id, { installment: "UPFRONT", outcome: "success" }, customer);
    await expect(transitionOrder(o.id, { kind: "production", status: "STITCHING" }, tailor)).rejects.toThrow("not available");
    await arrive(o.id);
    await expect(transitionOrder(o.id, { kind: "production", status: "STITCHING" }, customer)).rejects.toThrow("role");
    await transitionOrder(o.id, { kind: "production", status: "STITCHING" }, tailor);
    await transitionOrder(o.id, { kind: "production", status: "READY_FOR_DELIVERY" }, tailor);
    const assignment = { kind: "shipment", leg: "FINAL_DELIVERY", action: "assign", courier: "Courier", contact: "555 0100", tracking: "FIN-01" };
    await transitionOrder(o.id, assignment, admin);
    await expect(transitionOrder(o.id, { ...assignment, action: "dispatch" }, admin)).rejects.toThrow("both payments");
    await simulatePayment(o.id, { installment: "FINAL", outcome: "success" }, customer);
    await transitionOrder(o.id, { ...assignment, action: "dispatch" }, admin);
    await transitionOrder(o.id, { ...assignment, action: "deliver" }, admin);
    const saved = await getOrder(o.id, customer);
    expect(saved.status).toBe("DELIVERED");
    expect(saved.payments.filter(p => p.status === "SUCCEEDED")).toHaveLength(2);
    expect(ledger([saved])).toEqual({ gross: 12000, collected: 12000, unpaid: 0, held: 0, expectedFee: 1200, recognizedFee: 1200, payoutOwed: 10800 });
    await expect(transitionOrder(o.id, { ...assignment, action: "deliver" }, admin)).rejects.toThrow("Only dispatched");
  });
  it("keeps failed payments unpaid, retries once, and rejects invalid, stale or mismatched callbacks", async () => {
    const o = await freshOrder();
    const failed = await simulatePayment(o.id, { installment: "UPFRONT", outcome: "failure" }, customer);
    expect((await getOrder(o.id, customer)).upfrontPaid).toBe(false);
    const payment = await beginPayment(o.id, "UPFRONT", customer);
    expect(payment.id).toBe(failed.id);
    expect(payment.idempotencyKey).not.toBe(failed.idempotencyKey);
    const event = { paymentId: payment.id, attempt: payment.idempotencyKey, eventId: randomUUID(), amount: payment.amount, status: "SUCCEEDED" };
    const body = JSON.stringify(event);
    await expect(settlePayment(body, "invalid")).rejects.toThrow("signature");
    const mismatch = JSON.stringify({ ...event, amount: 1 });
    await expect(settlePayment(mismatch, signPayment(mismatch))).rejects.toThrow("does not match");
    const stale = JSON.stringify({ ...event, attempt: failed.idempotencyKey });
    await expect(settlePayment(stale, signPayment(stale))).rejects.toThrow("does not match");
    await expect(beginPayment(o.id, "UPFRONT", stranger)).rejects.toThrow("not available");
    await settlePayment(body, signPayment(body));
    await settlePayment(body, signPayment(body));
    const replay = JSON.stringify({ ...event, eventId: randomUUID(), status: "FAILED" });
    await expect(settlePayment(replay, signPayment(replay))).rejects.toThrow("already settled");
    const saved = await getOrder(o.id, customer);
    expect(saved.upfrontPaid).toBe(true);
    expect(saved.payments).toHaveLength(1);
    expect(ledger([saved]).collected).toBe(6000);
    expect(ledger([saved]).recognizedFee).toBe(0);
  });
  it("preserves exact cents for odd totals and rejects invalid prices", () => {
    expect(economics(10001)).toEqual({ upfront: 5001, final: 5000, fee: 1000, net: 9001 });
    expect(() => economics(1.5)).toThrow();
  });
  it("does not double-collect concurrent duplicate payment events", async () => {
    const o = await freshOrder();
    const payment = await beginPayment(o.id, "UPFRONT", customer);
    const body = JSON.stringify({ paymentId: payment.id, attempt: payment.idempotencyKey, eventId: randomUUID(), amount: payment.amount, status: "SUCCEEDED" });
    const results = await Promise.allSettled([settlePayment(body, signPayment(body)), settlePayment(body, signPayment(body))]);
    expect(results.some(r => r.status === "fulfilled")).toBe(true);
    const saved = await getOrder(o.id, customer);
    expect(saved.payments.filter(p => p.status === "SUCCEEDED")).toHaveLength(1);
    expect(saved.upfrontPaid).toBe(true);
  });
});
