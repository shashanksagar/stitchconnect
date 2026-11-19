"use client";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Paperclip, Send, X } from "lucide-react";
import { api, errorText, uploadImage } from "@/lib/client";
type Message = { id: string; senderId: string; sender: { name: string }; content: string; imageUrl: string | null; createdAt: string };
export function Chat({ orderId, userId, initial }: { orderId: string; userId: string; initial: Message[] }) {
  const [history, setHistory] = useState(initial);
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ id: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState("Connecting...");
  const end = useRef<HTMLDivElement>(null);
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  function merge(items: Message[]) {
    setHistory(old => [...new Map([...old, ...items].map(m => [m.id, m])).values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
  }
  useEffect(() => {
    const socket = io({ transports: ["websocket", "polling"] });
    socket.on("connect", () => {
      socket.emit("join", orderId, (result: { ok?: boolean; error?: string }) => {
        if (result.error) { setConnection("Conversation unavailable"); setError(result.error); return; }
        setConnection("Connected to your atelier");
        api<Message[]>(`/api/orders/${orderId}/messages`).then(merge).catch(error => setError(errorText(error)));
      });
    });
    socket.on("message", (message: Message) => merge([message]));
    socket.on("connect_error", error => { setConnection("Disconnected - retrying"); setError(error.message); });
    socket.on("disconnect", () => setConnection("Reconnecting..."));
    return () => { socket.disconnect(); };
  }, [orderId]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest", behavior: "instant" }); }, [history]);
  return <section className="card"><div style={{ padding: "16px 24px", borderBottom: "1px solid var(--line)" }}><strong style={{ fontSize: 13 }}>Design room</strong><span className="meta" role="status" style={{ marginTop: 6 }}>{connection}</span></div>
    <div className="chat-history" role="log" aria-label="Order conversation" aria-live="polite">{!history.length && <p className="muted">Every great creation starts with a conversation. Say hello to your maker.</p>}{history.map(m => <div key={m.id} className={`message ${m.senderId === userId ? "mine" : ""}`}><strong style={{ fontSize: 11 }}>{m.sender.name}</strong>{m.content && <p>{m.content}</p>}{m.imageUrl && <a href={m.imageUrl} target="_blank" rel="noreferrer"><img src={m.imageUrl} alt="Shared design attachment" /></a>}<small>{new Date(m.createdAt).toLocaleString()}</small></div>)}<div ref={end} /></div>
    <form style={{ padding: 20 }} onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError("");
      try {
        const payload = JSON.stringify({ content: text, uploadId: image?.id });
        if (retry.current?.payload !== payload) retry.current = { payload, key: crypto.randomUUID() };
        const saved = await api<Message>(`/api/orders/${orderId}/messages`, "POST", { content: text, uploadId: image?.id, clientKey: retry.current.key });
        merge([saved]); setText(""); setImage(null); retry.current = null;
      } catch (error) { setError(errorText(error)); } finally { setBusy(false); }
    }}><label className="field">Your message<textarea placeholder="Talk fabrics, finishing touches, and everything in between..." maxLength={4000} value={text} onChange={e => setText(e.target.value)} disabled={busy} /></label>
      {image && <div className="photos" style={{ marginBottom: 15 }}><img src={image.url} alt="Image ready to send" /><button className="btn small outline" type="button" disabled={busy} aria-label="Remove chat image" onClick={async () => {
        setBusy(true); setError(""); try { await api(`/api/uploads/${image.id}`, "DELETE"); setImage(null); } catch (error) { setError(errorText(error)); } finally { setBusy(false); }
      }}><X size={14} /></button></div>}
      <div className="actions"><button type="button" className="btn outline" disabled={busy || !!image} onClick={() => inputRef.current?.click()}><Paperclip size={15} /> Attach image</button><input ref={inputRef} className="sr-only" aria-label="Chat image" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || !!image} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        setBusy(true); setError("");
        try { setImage(await uploadImage(file)); } catch (error) { setError(errorText(error)); } finally { setBusy(false); e.target.value = ""; }
      }} /><button className="btn rust" disabled={busy || (!text.trim() && !image)}><Send size={14} />{busy ? "Sending..." : "Send message"}</button></div>
      {error && <p className="notice error" role="alert">{error}</p>}
    </form>
  </section>;
}
