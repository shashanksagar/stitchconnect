import { expect, type BrowserContext } from "@playwright/test";
export const origin = "http://127.0.0.1:3100";
export async function login(context: BrowserContext, email: string) {
  const csrf = await (await context.request.get("/api/auth/csrf")).json();
  await context.request.post("/api/auth/callback/credentials", { form: { csrfToken: csrf.csrfToken, email, password: process.env.DEMO_PASSWORD!, callbackUrl: `${origin}/orders`, json: "true" } });
  const session = await (await context.request.get("/api/auth/session")).json();
  expect(session.user?.email).toBe(email);
}
export async function mutate(context: BrowserContext, path: string, data: unknown, method: "POST" | "PATCH" = "POST") {
  return context.request.fetch(path, { method, data, headers: { Origin: origin } });
}
export const address = { name: "Browser Customer", line1: "18 Willow Street", city: "Brooklyn", postalCode: "11201", country: "USA", phone: "+1 555 0100" };
export const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
export async function createOrder(context: BrowserContext) {
  const response = await mutate(context, "/api/orders", { tailorId: "tailor-amara", garmentType: "Dress", measurements: { chest: 92, waist: 74, length: 110, unit: "cm" }, pickupAddress: address, deliveryAddress: address, uploadIds: [], checkoutKey: crypto.randomUUID(), quotedAmount: 12000 });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}
