import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "./db.ts";
import { AppError } from "./errors.ts";
import { requireRole } from "./auth.ts";
import type { Actor } from "./auth.ts";
import { economics } from "../lib/money.ts";
export function demoOnly() {
  if (process.env.DEMO_MODE !== "true" || !process.env.PAYMENT_SECRET) throw new AppError("Payment simulation is disabled.", 403);
}
const callbackSchema = z.object({
  paymentId: z.string(), attempt: z.uuid(), eventId: z.uuid(), amount: z.number().int().positive(),
  status: z.enum(["SUCCEEDED", "FAILED"]),
});
export function signPayment(body: string) {
  demoOnly();
  return createHmac("sha256", process.env.PAYMENT_SECRET!).update(body).digest("hex");
}
export async function settlePayment(body: string, signature: string) {
  const expected = signPayment(body);
  if (!/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new AppError("Invalid payment signature.", 403);
  const event = callbackSchema.parse(JSON.parse(body));
  return db.$transaction(async tx => {
    const payment = await tx.payment.findUnique({ where: { id: event.paymentId }, include: { order: true } });
    if (!payment || payment.idempotencyKey !== event.attempt || payment.amount !== event.amount) throw new AppError("Payment event does not match the current attempt.", 409);
    if (payment.eventId === event.eventId) return payment;
    if (payment.status !== "PENDING") throw new AppError("Payment attempt is already settled.", 409);
    const order = payment.order;
    if (payment.installment === "FINAL" && (!order.upfrontPaid || order.status !== "READY_FOR_DELIVERY")) throw new AppError("The final payment is not available yet.", 409);
    const changed = await tx.payment.updateMany({ where: { id: payment.id, status: "PENDING", idempotencyKey: event.attempt }, data: { status: event.status, eventId: event.eventId } });
    if (changed.count !== 1) throw new AppError("Payment changed. Refresh and retry.", 409);
    if (event.status === "SUCCEEDED") await tx.order.update({ where: { id: order.id }, data: payment.installment === "UPFRONT" ? { upfrontPaid: true } : { finalPaid: true } });
    return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
  });
}
export async function beginPayment(orderId: string, installment: "UPFRONT" | "FINAL", user: Actor) {
  demoOnly();
  requireRole(user, "CUSTOMER");
  return db.$transaction(async tx => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.customerId !== user.id) throw new AppError("Order not available.", 403);
    if (installment === "FINAL" && (!order.upfrontPaid || order.status !== "READY_FOR_DELIVERY")) throw new AppError("The final payment is only available when your garment is ready.", 409);
    if (installment === "UPFRONT" && order.status !== "PENDING_PICKUP") throw new AppError("Upfront checkout is no longer available.", 409);
    const amounts = economics(order.totalAmount, order.platformFeePercent);
    const existing = await tx.payment.findUnique({ where: { orderId_installment: { orderId, installment } } });
    if (existing?.status === "SUCCEEDED" || existing?.status === "PENDING") return existing;
    if (existing) return tx.payment.update({ where: { id: existing.id }, data: { status: "PENDING", eventId: null, idempotencyKey: randomUUID() } });
    return tx.payment.create({ data: { orderId, installment, amount: installment === "UPFRONT" ? amounts.upfront : amounts.final, idempotencyKey: randomUUID() } });
  });
}
export async function simulatePayment(orderId: string, raw: unknown, user: Actor) {
  const input = z.object({ installment: z.enum(["UPFRONT", "FINAL"]), outcome: z.enum(["success", "failure"]) }).parse(raw);
  const payment = await beginPayment(orderId, input.installment, user);
  if (payment.status === "SUCCEEDED") return payment;
  const body = JSON.stringify({ paymentId: payment.id, attempt: payment.idempotencyKey, eventId: randomUUID(), amount: payment.amount, status: input.outcome === "success" ? "SUCCEEDED" : "FAILED" });
  return settlePayment(body, signPayment(body));
}
