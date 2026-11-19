import { z } from "zod";
export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(254).transform(v => v.toLowerCase()),
  password: z.string().min(10, "Use at least 10 characters").max(128),
  location: z.string().trim().min(2).max(120),
}).strict();
export const addressSchema = z.object({
  name: z.string().trim().min(2).max(100),
  line1: z.string().trim().min(5).max(200),
  city: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(1).max(30),
  country: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(40),
});
export const measurementsSchema = z.object({
  chest: z.number().positive().max(500), waist: z.number().positive().max(500),
  length: z.number().positive().max(500), unit: z.enum(["cm", "in"]),
});
export const orderSchema = z.object({
  tailorId: z.string(), garmentType: z.enum(["Dress", "Suit", "Shirt", "Trousers", "Traditional wear"]),
  measurements: measurementsSchema, pickupAddress: addressSchema, deliveryAddress: addressSchema,
  uploadIds: z.array(z.string()).max(5), checkoutKey: z.uuid(), quotedAmount: z.number().int().positive(),
});
export const messageSchema = z.object({
  content: z.string().trim().max(4000), uploadId: z.string().optional(), clientKey: z.uuid(),
}).refine(v => !!v.content || !!v.uploadId, "Write a message or attach an image.");
