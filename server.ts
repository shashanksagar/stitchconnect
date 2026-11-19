import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { getToken } from "next-auth/jwt";
import { db } from "./src/server/db.ts";
import { attachRealtime, chatMember } from "./src/server/chat.ts";
import { AppError } from "./src/server/errors.ts";

const dev = !process.argv.includes("--production");
const hostname = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
await app.prepare();
const handler = app.getRequestHandler();
const server = createServer((req, res) => handler(req, res));
const io = new Server(server);
attachRealtime(io);
io.use(async (socket, nextSocket) => {
  try {
    if (socket.handshake.headers.origin !== new URL(process.env.NEXTAUTH_URL!).origin) throw new AppError("Invalid connection origin.", 403);
    const cookies = Object.fromEntries((socket.request.headers.cookie || "").split(";").filter(c => c.includes("=")).map(c => {
      const index = c.indexOf("=");
      return [c.slice(0, index).trim(), decodeURIComponent(c.slice(index + 1).trim())];
    }));
    const req = Object.assign(socket.request, { cookies });
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const user = token?.sub ? await db.user.findUnique({ where: { id: token.sub }, select: { id: true, role: true } }) : null;
    if (!user || !token?.exp || Number(token.exp) * 1000 <= Date.now()) throw new AppError("Please log in to connect.", 401);
    socket.data.user = user;
    const timer = setTimeout(() => socket.disconnect(true), Number(token.exp) * 1000 - Date.now());
    socket.on("disconnect", () => clearTimeout(timer));
    nextSocket();
  } catch (error) {
    console.error("Chat handshake rejected:", error instanceof Error ? error.message : error);
    nextSocket(new Error("Chat connection rejected. Please log in again."));
  }
});
io.on("connection", socket => {
  socket.on("join", async (orderId: unknown, ack: unknown) => {
    if (typeof ack !== "function") return;
    try {
      if (typeof orderId !== "string" || orderId.length > 100) throw new AppError("Invalid order.");
      await chatMember(orderId, socket.data.user);
      await socket.join(`order:${orderId}`);
      ack({ ok: true });
    } catch (error) {
      console.error("Chat room rejected:", error instanceof Error ? error.message : error);
      ack({ error: "This conversation is not available." });
    }
  });
});
server.listen(port, hostname, () => console.log(`Stitch Connect ready at ${process.env.NEXTAUTH_URL || `http://${hostname}:${port}`}`));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => { io.close(); server.close(() => process.exit(0)); });
}
