import type { getOrder } from "./orders.ts";
export function orderDTO(order: Awaited<ReturnType<typeof getOrder>>) {
  return {
    ...order, createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(),
    payments: order.payments.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })),
    shipments: order.shipments.map(s => ({ ...s, updatedAt: s.updatedAt.toISOString(), deliveredAt: s.deliveredAt?.toISOString() ?? null, dispatchedAt: s.dispatchedAt?.toISOString() ?? null })),
  };
}
export type OrderDTO = ReturnType<typeof orderDTO>;
