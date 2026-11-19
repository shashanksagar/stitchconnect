import { hash } from "bcryptjs";
import { actor } from "@/server/auth";
import { db } from "@/server/db";
import { AppError, errorResponse, rateLimit, sameOrigin } from "@/server/errors";
import { signupSchema } from "@/lib/validation";
import { createOrder, getOrder, listOrders, transitionOrder, ledger } from "@/server/orders";
import { settlePayment, simulatePayment } from "@/server/payments";
import { boundedBody, deleteUpload, readUpload, saveUpload } from "@/server/uploads";
import { messages, sendMessage } from "@/server/chat";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const [resource, id, action] = path;
    const method = request.method;
    if (path.length > 3) throw new AppError("Endpoint not found.", 404);
    if (resource === "health" && method === "GET") return Response.json({ status: "ok" });
    const readJSON = async () => JSON.parse((await boundedBody(request, 65536)).toString("utf8"));
    if (resource === "payments" && id === "callback" && method === "POST") {
      const body = (await boundedBody(request, 65536)).toString("utf8");
      return Response.json(await settlePayment(body, request.headers.get("x-payment-signature") || ""));
    }
    if (method !== "GET") sameOrigin(request);
    if (resource === "signup" && method === "POST") {
      rateLimit("signup:local", 20);
      const input = signupSchema.parse(await readJSON());
      const { password, ...profile } = input;
      const user = await db.user.create({ data: { ...profile, passwordHash: await hash(password, 12), role: "CUSTOMER" }, select: { id: true } });
      return Response.json(user, { status: 201 });
    }
    const user = await actor();
    if (method !== "GET") rateLimit(`mutation:${user.id}`, 60);
    if (resource === "uploads") {
      if (method === "POST" && !id) { const file = await saveUpload(request, user); return Response.json({ id: file.id, url: `/api/uploads/${file.id}` }, { status: 201 }); }
      if (method === "GET" && id) return await readUpload(id, user);
      if (method === "DELETE" && id) { await deleteUpload(id, user); return Response.json({ ok: true }); }
    }
    if (resource === "ledger" && method === "GET") {
      if (user.role !== "ADMIN") throw new AppError("Admin access required.", 403);
      return Response.json(ledger(await listOrders(user)));
    }
    if (resource === "orders") {
      if (!id && method === "GET") return Response.json(await listOrders(user));
      if (!id && method === "POST") return Response.json(await createOrder(await readJSON(), user), { status: 201 });
      if (id && !action && method === "GET") return Response.json(await getOrder(id, user));
      if (id && !action && method === "PATCH") return Response.json(await transitionOrder(id, await readJSON(), user));
      if (id && action === "payments" && method === "POST") return Response.json(await simulatePayment(id, await readJSON(), user));
      if (id && action === "messages" && method === "GET") return Response.json(await messages(id, user));
      if (id && action === "messages" && method === "POST") return Response.json(await sendMessage(id, await readJSON(), user), { status: 201 });
    }
    throw new AppError("Endpoint not found.", 404);
  } catch (error) { return errorResponse(error); }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
