import { expect, test } from "@playwright/test";
import { createOrder, login, mutate, png } from "./helpers";
test("realtime private chat, production, two logistics legs and final-payment-gated delivery", async ({ browser }) => {
  const customer = await browser.newContext(), tailor = await browser.newContext(), admin = await browser.newContext(), outsider = await browser.newContext();
  try {
    await login(customer, "customer@stitch.local");
    await login(tailor, "tailor1@stitch.local");
    await login(admin, "admin@stitch.local");
    await login(outsider, "tailor2@stitch.local");
    const id = await createOrder(customer);
    expect((await mutate(customer, `/api/orders/${id}/payments`, { installment: "UPFRONT", outcome: "success" })).ok()).toBe(true);
    const customerPage = await customer.newPage(), tailorPage = await tailor.newPage(), adminPage = await admin.newPage();
    await customerPage.goto(`/orders/${id}/chat`);
    await tailorPage.goto(`/orders/${id}/chat`);
    await expect(customerPage.getByRole("status")).toContainText("Connected to your atelier");
    await expect(tailorPage.getByRole("status")).toContainText("Connected to your atelier");
    const text = `A rounded collar, please. ${crypto.randomUUID()}`;
    await customerPage.getByLabel("Your message").fill(text);
    await customerPage.getByLabel("Chat image").setInputFiles({ name: "collar.png", mimeType: "image/png", buffer: png });
    await expect(customerPage.getByAltText("Image ready to send")).toBeVisible();
    await customerPage.getByRole("button", { name: "Send message" }).click();
    await expect(tailorPage.getByRole("log")).toContainText(text);
    await expect(tailorPage.getByAltText("Shared design attachment")).toBeVisible();
    const attachment = await tailorPage.getByAltText("Shared design attachment").getAttribute("src");
    expect((await outsider.request.get(`/api/orders/${id}/messages`)).status()).toBe(403);
    expect((await outsider.request.get(attachment!)).status()).toBe(403);
    expect((await admin.request.get(`/api/orders/${id}/messages`)).status()).toBe(403);
    expect((await mutate(outsider, `/api/orders/${id}`, { kind: "production", status: "READY_FOR_DELIVERY" }, "PATCH")).status()).toBe(403);
    await tailorPage.reload();
    await expect(tailorPage.getByRole("log")).toContainText(text);
    const details = { kind: "shipment", leg: "FABRIC_PICKUP", courier: "Browser Courier", contact: "555 0100", tracking: "FABRIC-TEST" };
    for (const action of ["assign", "dispatch", "deliver"]) expect((await mutate(admin, `/api/orders/${id}`, { ...details, action }, "PATCH")).ok()).toBe(true);
    await tailorPage.goto("/dashboard/tailor");
    const commission = tailorPage.locator("article").filter({ has: tailorPage.locator(`a[href="/orders/${id}"]`) });
    await commission.getByRole("button", { name: "Start stitching" }).click();
    await expect(commission.getByRole("button", { name: "Mark ready for delivery" })).toBeVisible();
    await commission.getByRole("button", { name: "Mark ready for delivery" }).click();
    await expect(commission.getByText("READY FOR DELIVERY", { exact: true })).toBeVisible();
    expect((await mutate(admin, `/api/orders/${id}`, { ...details, leg: "FINAL_DELIVERY", action: "assign" }, "PATCH")).ok()).toBe(true);
    expect((await mutate(admin, `/api/orders/${id}`, { ...details, leg: "FINAL_DELIVERY", action: "dispatch" }, "PATCH")).status()).toBe(409);
    await customerPage.goto(`/orders/${id}`);
    await customerPage.getByRole("button", { name: "Pay $60 (demo)", exact: true }).click();
    await expect(customerPage.getByRole("status")).toContainText("Demo payment received");
    await adminPage.goto("/dashboard/admin");
    const row = adminPage.locator("tr").filter({ has: adminPage.getByText("Dress", { exact: true }) }).filter({ has: adminPage.getByText("Alex Morgan", { exact: false }) });
    const rows = await row.count();
    expect(rows).toBeGreaterThan(0);
    const target = await adminPage.locator("tbody tr").all();
    for (const r of target) {
      await r.getByRole("button").click();
      if (await adminPage.getByText(`Order ${id}`, { exact: true }).count()) break;
    }
    await expect(adminPage.getByText(`Order ${id}`, { exact: true })).toBeVisible();
    await adminPage.getByRole("button", { name: "Dispatch garment", exact: true }).click();
    await adminPage.getByRole("button", { name: "Confirm customer delivery" }).click();
    await expect(adminPage.locator("tbody tr").filter({ hasText: "DELIVERED" })).toHaveCount(1);
    const saved = await (await customer.request.get(`/api/orders/${id}`)).json();
    expect(saved.status).toBe("DELIVERED");
    expect(saved.finalPaid).toBe(true);
    const ledger = await (await admin.request.get("/api/ledger")).json();
    expect(ledger.recognizedFee).toBe(1200);
    expect(ledger.payoutOwed).toBe(10800);
  } finally {
    await Promise.all([customer.close(), tailor.close(), admin.close(), outsider.close()]);
  }
});
