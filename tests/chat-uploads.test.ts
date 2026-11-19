import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "../src/server/db.ts";
import { messages, sendMessage } from "../src/server/chat.ts";
import { deleteUpload, imageMime, readUpload, saveUpload } from "../src/server/uploads.ts";
import { customer, tailor, admin, stranger, freshOrder, png } from "./fixtures.ts";
afterAll(() => db.$disconnect());
function uploadRequest(file: File) {
  const form = new FormData(); form.set("file", file);
  return new Request("http://localhost:3000/api/uploads", { method: "POST", body: form });
}
describe("private persistent conversations and images", () => {
  it("persists deduplicated text/image chat and protects the attachment from outsiders", async () => {
    const o = await freshOrder();
    const upload = await saveUpload(uploadRequest(new File([png], "design.png", { type: "image/png" })), customer);
    const input = { content: "Please use a rounded collar.", uploadId: upload.id, clientKey: randomUUID() };
    const sent = await sendMessage(o.id, input, customer);
    expect((await sendMessage(o.id, input, customer)).id).toBe(sent.id);
    expect((await messages(o.id, tailor))[0].content).toBe(input.content);
    expect(Buffer.from(await (await readUpload(upload.id, tailor)).arrayBuffer())).toEqual(png);
    await expect(messages(o.id, stranger)).rejects.toThrow("Only this order");
    await expect(messages(o.id, admin)).rejects.toThrow("Only this order");
    await expect(readUpload(upload.id, stranger)).rejects.toThrow("not available");
    await expect(readUpload(upload.id, admin)).rejects.toThrow("not available");
    await expect(sendMessage(o.id, { content: "Spoofed", clientKey: randomUUID() }, stranger)).rejects.toThrow();
    await expect(deleteUpload(upload.id, customer)).rejects.toThrow("unattached");
    expect(await db.message.count({ where: { orderId: o.id } })).toBe(1);
  });
  it("rejects disguised, oversized, empty attachments and empty messages; permits deleting own abandoned uploads", async () => {
    const o = await freshOrder();
    expect(() => imageMime(Buffer.from("<svg onload='alert(1)'/>"))).toThrow("Only JPEG");
    await expect(saveUpload(uploadRequest(new File([png], "fake.jpg", { type: "image/jpeg" })), customer)).rejects.toThrow("do not match");
    await expect(saveUpload(uploadRequest(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" })), customer)).rejects.toThrow("up to 5 MB");
    await expect(sendMessage(o.id, { content: "  ", clientKey: randomUUID() }, customer)).rejects.toThrow();
    const upload = await saveUpload(uploadRequest(new File([png], "unused.png", { type: "image/png" })), customer);
    await expect(deleteUpload(upload.id, stranger)).rejects.toThrow("unattached");
    await deleteUpload(upload.id, customer);
    expect(await db.upload.findUnique({ where: { id: upload.id } })).toBeNull();
  });
});
