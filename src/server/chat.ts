import { z } from "zod";
import { db } from "./db.ts";
import { AppError } from "./errors.ts";
import type { Actor } from "./auth.ts";
import { messageSchema } from "../lib/validation.ts";
import type { Server } from "socket.io";
const realtime = globalThis as typeof globalThis & { stitchIO?: Server };
export function attachRealtime(io: Server) { realtime.stitchIO = io; }
export async function chatMember(orderId: string, user: Actor) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || (order.customerId !== user.id && order.tailorId !== user.id) || user.role === "ADMIN") throw new AppError("Only this order's customer and tailor can access its conversation.", 403);
  return order;
}
const messageInclude = { sender: { select: { name: true } } };
export async function messages(orderId: string, user: Actor) {
  await chatMember(orderId, user);
  return db.message.findMany({ where: { orderId }, include: messageInclude, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
}
export async function sendMessage(orderId: string, raw: unknown, user: Actor) {
  z.string().min(1).parse(orderId);
  await chatMember(orderId, user);
  const input = messageSchema.parse(raw);
  const saved = await db.$transaction(async tx => {
    const old = await tx.message.findUnique({ where: { clientKey: input.clientKey }, include: messageInclude });
    if (old) {
      if (old.senderId !== user.id || old.orderId !== orderId) throw new AppError("Message key already in use.", 409);
      return old;
    }
    if (input.uploadId) {
      const upload = await tx.upload.findUnique({ where: { id: input.uploadId } });
      if (!upload || upload.ownerId !== user.id || upload.orderId || upload.messageId) throw new AppError("Attachment is unavailable.", 409);
    }
    const message = await tx.message.create({ data: {
      orderId, senderId: user.id, content: input.content, imageUrl: input.uploadId ? `/api/uploads/${input.uploadId}` : null, clientKey: input.clientKey,
    }, include: messageInclude });
    if (input.uploadId) {
      const claimed = await tx.upload.updateMany({ where: { id: input.uploadId, ownerId: user.id, orderId: null, messageId: null }, data: { orderId, messageId: message.id } });
      if (claimed.count !== 1) throw new AppError("Attachment was already sent.", 409);
    }
    return message;
  });
  realtime.stitchIO?.to(`order:${orderId}`).emit("message", saved);
  return saved;
}
