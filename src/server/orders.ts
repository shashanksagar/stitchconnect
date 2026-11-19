import { Prisma } from "@prisma/client";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { db } from "./db.ts";
import { AppError } from "./errors.ts";
import { requireRole } from "./auth.ts";
import type { Actor } from "./auth.ts";
import { economics } from "../lib/money.ts";
import { addressSchema, orderSchema } from "../lib/validation.ts";

const includeOrder = {
  customer: { select: { id: true, name: true, location: true } },
  tailor: { select: { id: true, name: true, location: true } },
  shipments: true, payments: true,
} satisfies Prisma.OrderInclude;
export async function getOrder(id: string, user: Actor) {
  const order = await db.order.findUnique({ where: { id }, include: includeOrder });
  if (!order) throw new AppError("Order not found.", 404);
  if (user.role !== "ADMIN" && order.customerId !== user.id && order.tailorId !== user.id) throw new AppError("Order not available.", 403);
  return order;
}
export async function listOrders(user: Actor) {
  return db.order.findMany({
    where: user.role === "ADMIN" ? { upfrontPaid: true } : user.role === "TAILOR" ? { tailorId: user.id, upfrontPaid: true } : { customerId: user.id },
    include: includeOrder, orderBy: { createdAt: "desc" },
  });
}
export async function createOrder(raw: unknown, user: Actor) {
  requireRole(user, "CUSTOMER");
  const data = orderSchema.parse(raw);
  return db.$transaction(async tx => {
    const existing = await tx.order.findUnique({ where: { checkoutKey: data.checkoutKey } });
    if (existing) {
      if (existing.customerId !== user.id) throw new AppError("Checkout key already used.", 409);
      if (existing.tailorId !== data.tailorId || existing.garmentType !== data.garmentType ||
          !isDeepStrictEqual(existing.measurements, data.measurements) ||
          !isDeepStrictEqual(existing.pickupAddress, data.pickupAddress) ||
          !isDeepStrictEqual(existing.deliveryAddress, data.deliveryAddress) ||
          !isDeepStrictEqual(existing.referenceImages, [...new Set(data.uploadIds)].map(id => `/api/uploads/${id}`))) {
        throw new AppError("This checkout already created an order with different details. Open your orders to continue.", 409);
      }
      return existing;
    }
    const profile = await tx.tailorProfile.findUnique({ where: { userId: data.tailorId } });
    if (!profile) throw new AppError("Tailor not found.", 404);
    if (profile.basePrice !== data.quotedAmount) throw new AppError("The quote changed. Refresh and review the new price.", 409);
    const ids = [...new Set(data.uploadIds)];
    const files = await tx.upload.findMany({ where: { id: { in: ids }, ownerId: user.id, orderId: null, messageId: null } });
    if (files.length !== ids.length) throw new AppError("One or more reference images are unavailable.", 409);
    const amounts = economics(profile.basePrice);
    const order = await tx.order.create({ data: {
      customerId: user.id, tailorId: profile.userId, garmentType: data.garmentType,
      measurements: data.measurements, pickupAddress: data.pickupAddress, deliveryAddress: data.deliveryAddress,
      tailorAddress: addressSchema.parse(profile.workshopAddress),
      referenceImages: ids.map(id => `/api/uploads/${id}`), totalAmount: profile.basePrice,
      platformFeePercent: 10, platformFeeAmount: amounts.fee, tailorPayout: amounts.net, checkoutKey: data.checkoutKey,
      shipments: { create: [{ leg: "FABRIC_PICKUP" }, { leg: "FINAL_DELIVERY" }] },
    } });
    const claimed = await tx.upload.updateMany({ where: { id: { in: ids }, ownerId: user.id, orderId: null }, data: { orderId: order.id } });
    if (claimed.count !== ids.length) throw new AppError("Images were already attached. Please retry.", 409);
    return order;
  });
}
export const transitionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("production"), status: z.enum(["STITCHING", "READY_FOR_DELIVERY"]) }),
  z.object({ kind: z.literal("shipment"), leg: z.enum(["FABRIC_PICKUP", "FINAL_DELIVERY"]), action: z.enum(["assign", "dispatch", "deliver"]), courier: z.string().trim().max(120).optional(), contact: z.string().trim().max(120).optional(), tracking: z.string().trim().max(200).optional() }),
]);
export async function transitionOrder(id: string, raw: unknown, user: Actor) {
  const input = transitionSchema.parse(raw);
  return db.$transaction(async tx => {
    const order = await tx.order.findUnique({ where: { id }, include: { shipments: true } });
    if (!order) throw new AppError("Order not found.", 404);
    if (!order.upfrontPaid) throw new AppError("The upfront payment is required before work begins.", 409);
    if (input.kind === "production") {
      requireRole(user, "TAILOR");
      if (order.tailorId !== user.id) throw new AppError("This is not your order.", 403);
      const expected = input.status === "STITCHING" ? "IN_TRANSIT_TO_TAILOR" : "STITCHING";
      if (order.status !== expected || !order.shipments.some(s => s.leg === "FABRIC_PICKUP" && s.status === "DELIVERED")) throw new AppError("This production step is not available yet.", 409);
      const updated = await tx.order.updateMany({ where: { id, status: expected }, data: { status: input.status } });
      if (updated.count !== 1) throw new AppError("Order changed. Refresh and try again.", 409);
    } else {
      requireRole(user, "ADMIN");
      const shipment = order.shipments.find(s => s.leg === input.leg);
      if (!shipment) throw new AppError("Shipment not found.", 404);
      if (input.action === "assign") {
        if (!input.courier || !input.contact || !input.tracking) throw new AppError("Courier, contact, and tracking details are required.");
        if (!["UNASSIGNED", "ASSIGNED"].includes(shipment.status)) throw new AppError("Dispatched shipments cannot be reassigned.", 409);
        await tx.shipment.update({ where: { id: shipment.id }, data: { status: "ASSIGNED", courier: input.courier, contact: input.contact, tracking: input.tracking } });
      } else if (input.action === "dispatch") {
        if (shipment.status !== "ASSIGNED") throw new AppError("Assign the courier before dispatch.", 409);
        if (input.leg === "FABRIC_PICKUP" && order.status !== "PENDING_PICKUP") throw new AppError("Fabric pickup cannot be dispatched in this state.", 409);
        if (input.leg === "FINAL_DELIVERY" && (order.status !== "READY_FOR_DELIVERY" || !order.finalPaid)) throw new AppError("The garment must be ready and both payments received before dispatch.", 409);
        await tx.shipment.update({ where: { id: shipment.id }, data: { status: "IN_TRANSIT", dispatchedAt: new Date() } });
        if (input.leg === "FABRIC_PICKUP") await tx.order.update({ where: { id }, data: { status: "IN_TRANSIT_TO_TAILOR" } });
      } else {
        if (shipment.status !== "IN_TRANSIT") throw new AppError("Only dispatched shipments can be delivered.", 409);
        if (input.leg === "FINAL_DELIVERY" && (!order.finalPaid || order.status !== "READY_FOR_DELIVERY")) throw new AppError("Final delivery is not available.", 409);
        await tx.shipment.update({ where: { id: shipment.id }, data: { status: "DELIVERED", deliveredAt: new Date() } });
        if (input.leg === "FINAL_DELIVERY") await tx.order.update({ where: { id }, data: { status: "DELIVERED" } });
      }
    }
    return tx.order.findUniqueOrThrow({ where: { id }, include: includeOrder });
  });
}
export function ledger(orders: Awaited<ReturnType<typeof listOrders>>) {
  return orders.reduce((sum, o) => {
    const collected = o.payments.filter(p => p.status === "SUCCEEDED").reduce((n, p) => n + p.amount, 0);
    const delivered = o.status === "DELIVERED";
    return {
      gross: sum.gross + o.totalAmount, collected: sum.collected + collected,
      unpaid: sum.unpaid + o.totalAmount - collected, held: sum.held + (delivered ? 0 : collected),
      expectedFee: sum.expectedFee + o.platformFeeAmount,
      recognizedFee: sum.recognizedFee + (delivered ? o.platformFeeAmount : 0),
      payoutOwed: sum.payoutOwed + (delivered ? o.tailorPayout : 0),
    };
  }, { gross: 0, collected: 0, unpaid: 0, held: 0, expectedFee: 0, recognizedFee: 0, payoutOwed: 0 });
}
