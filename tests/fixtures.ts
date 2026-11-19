import { randomUUID } from "node:crypto";
import { createOrder } from "../src/server/orders.ts";
export const customer = { id: "customer-demo", role: "CUSTOMER" as const };
export const tailor = { id: "tailor-amara", role: "TAILOR" as const };
export const admin = { id: "admin-demo", role: "ADMIN" as const };
export const stranger = { id: "unrelated-user", role: "CUSTOMER" as const };
export const address = { name: "Test Customer", line1: "18 Test Street", city: "Brooklyn", postalCode: "11201", country: "USA", phone: "+1 555 0100" };
export function orderInput() {
  return { tailorId: tailor.id, garmentType: "Dress", measurements: { chest: 92, waist: 74, length: 110, unit: "cm" }, pickupAddress: address, deliveryAddress: address, uploadIds: [], checkoutKey: randomUUID(), quotedAmount: 12000 };
}
export async function freshOrder() { return createOrder(orderInput(), customer); }
export const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
