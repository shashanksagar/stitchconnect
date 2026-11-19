"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Scissors, Truck, DollarSign } from "lucide-react";
import type { OrderDTO } from "@/server/dto";
import { api, errorText } from "@/lib/client";
import { money } from "@/lib/money";
import { measurementsSchema, addressSchema } from "@/lib/validation";
type Ledger = { gross: number; collected: number; unpaid: number; held: number; expectedFee: number; recognizedFee: number; payoutOwed: number };
function Status({ order }: { order: OrderDTO }) { return <span className="badge">{order.status.replaceAll("_", " ")}</span>; }
export function TailorDashboard({ orders }: { orders: OrderDTO[] }) {
  const [busy, setBusy] = useState(""), [error, setError] = useState("");
  const router = useRouter();
  return <><div className="stats">{[{ label: "In your atelier", value: orders.filter(o => o.status === "STITCHING").length }, { label: "Ready to go", value: orders.filter(o => o.status === "READY_FOR_DELIVERY").length }, { label: "Delivered", value: orders.filter(o => o.status === "DELIVERED").length }, { label: "Net owed on delivered work", value: money(orders.filter(o => o.status === "DELIVERED").reduce((n, o) => n + o.tailorPayout, 0)) }].map(s => <div className="panel" key={s.label}><span className="meta">{s.label}</span><strong>{s.value}</strong></div>)}</div>
    {error && <p className="notice error" role="alert">{error}</p>}
    {!orders.length && <div className="panel"><h3>Your next commission is on its way.</h3><p className="muted">Confirmed orders will appear here after the customer pays the first installment.</p></div>}
    <div className="grid">{orders.map(o => {
      const m = measurementsSchema.parse(o.measurements);
      const canStart = o.status === "IN_TRANSIT_TO_TAILOR" && o.shipments.some(s => s.leg === "FABRIC_PICKUP" && s.status === "DELIVERED");
      const canReady = o.status === "STITCHING";
      return <article className="panel" key={o.id}><Status order={o} /><h3 style={{ marginTop: 20 }}>{o.garmentType} for {o.customer.name}</h3><p className="muted" style={{ fontSize: 12 }}>Chest {m.chest} / Waist {m.waist} / Length {m.length} {m.unit}</p><div className="photos">{Array.isArray(o.referenceImages) && o.referenceImages.map((url, i) => typeof url === "string" && <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Reference design ${i + 1}`} /></a>)}</div><p className="muted">Net payout: <strong>{money(o.tailorPayout)}</strong></p><div className="actions"><Link className="btn small outline" href={`/orders/${o.id}`}>Details <ArrowUpRight size={12} /></Link><Link className="btn small outline" href={`/orders/${o.id}/chat`}>Chat</Link></div>
        {(canStart || canReady) && <button className="btn rust" style={{ marginTop: 15 }} disabled={!!busy} onClick={async () => {
          setBusy(o.id); setError("");
          try { await api(`/api/orders/${o.id}`, "PATCH", { kind: "production", status: canStart ? "STITCHING" : "READY_FOR_DELIVERY" }); router.refresh(); } catch (error) { setError(errorText(error)); router.refresh(); } finally { setBusy(""); }
        }}><Scissors size={14} />{busy === o.id ? "Updating..." : canStart ? "Start stitching" : "Mark ready for delivery"}</button>}
        {!canStart && !canReady && o.status !== "DELIVERED" && <p className="muted" style={{ fontSize: 11 }}>{o.status === "READY_FOR_DELIVERY" ? "Our logistics team will arrange final delivery after payment." : "Waiting for fabric pickup and arrival confirmation."}</p>}
      </article>;
    })}</div></>;
}
function Address({ value }: { value: OrderDTO["pickupAddress"] }) {
  const a = addressSchema.safeParse(value);
  if (!a.success) return <p className="notice error">Full address missing. Do not dispatch until corrected.</p>;
  return <p className="details">{a.data.name}<br />{a.data.line1}, {a.data.city}, {a.data.postalCode}<br />{a.data.country} &middot; {a.data.phone}</p>;
}
function ShipmentControl({ order, shipment }: { order: OrderDTO; shipment: OrderDTO["shipments"][number] }) {
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const router = useRouter();
  const isFabric = shipment.leg === "FABRIC_PICKUP";
  async function update(data: unknown) {
    setBusy(true); setError("");
    try { await api(`/api/orders/${order.id}`, "PATCH", data); router.refresh(); } catch (error) { setError(errorText(error)); router.refresh(); } finally { setBusy(false); }
  }
  return <section className="panel" style={{ background: "#fbfbf6" }}><div className="eyebrow"><Truck size={14} />{isFabric ? "Leg 1 / Fabric pickup" : "Leg 2 / Garment delivery"}</div><h3>{isFabric ? `${order.customer.name} → ${order.tailor.name}` : `${order.tailor.name} → ${order.customer.name}`}</h3><span className="badge">{shipment.status.replaceAll("_", " ")}</span><div className="form-grid" style={{ marginTop: 15 }}><div><span className="meta">From</span><Address value={isFabric ? order.pickupAddress : order.tailorAddress} /></div><div><span className="meta">To</span><Address value={isFabric ? order.tailorAddress : order.deliveryAddress} /></div></div>
    {["UNASSIGNED", "ASSIGNED"].includes(shipment.status) ? <form onSubmit={e => {
      e.preventDefault(); const f = new FormData(e.currentTarget);
      update({ kind: "shipment", leg: shipment.leg, action: "assign", courier: f.get("courier"), contact: f.get("contact"), tracking: f.get("tracking") });
    }}><label className="field">Courier / partner<input name="courier" defaultValue={shipment.courier} required maxLength={120} /></label><div className="form-grid"><label className="field">Courier contact<input name="contact" defaultValue={shipment.contact} required maxLength={120} /></label><label className="field">Tracking / consignment<input name="tracking" defaultValue={shipment.tracking} required maxLength={200} /></label></div><button className="btn small outline" disabled={busy}>{shipment.status === "ASSIGNED" ? "Update assignment" : "Assign courier"}</button></form> : <p className="muted" style={{ fontSize: 12 }}>{shipment.courier} &middot; {shipment.contact}<br />{shipment.tracking}</p>}
    {shipment.status === "ASSIGNED" && <button className="btn small rust" style={{ marginTop: 12 }} disabled={busy || (!isFabric && (!order.finalPaid || order.status !== "READY_FOR_DELIVERY"))} onClick={() => update({ kind: "shipment", leg: shipment.leg, action: "dispatch" })}>Dispatch {isFabric ? "fabric" : "garment"}</button>}
    {!isFabric && !order.finalPaid && <p className="muted" style={{ fontSize: 11 }}>Final dispatch is locked until the balance is paid.</p>}
    {shipment.status === "IN_TRANSIT" && <button className="btn rust small" disabled={busy} onClick={() => update({ kind: "shipment", leg: shipment.leg, action: "deliver" })}>Confirm {isFabric ? "fabric arrived at tailor" : "customer delivery"}</button>}
    {error && <p className="notice error" role="alert">{error}</p>}
  </section>;
}
export function AdminDashboard({ orders, ledger }: { orders: OrderDTO[]; ledger: Ledger }) {
  const [selected, setSelected] = useState(orders[0]?.id ?? "");
  const order = orders.find(o => o.id === selected);
  const metrics = [
    ["Gross order value", ledger.gross], ["Cash collected", ledger.collected], ["Unpaid balances", ledger.unpaid], ["Held customer funds", ledger.held],
    ["Expected included fees", ledger.expectedFee], ["Fees recognized on delivery", ledger.recognizedFee], ["Net tailor payout owed", ledger.payoutOwed],
  ] as const;
  return <><p className="notice"><DollarSign size={14} style={{ display: "inline" }} /> Simulation ledger only. Funds are not held or paid out through a real financial service. Fees are recognized on delivery.</p><div className="stats">{metrics.map(([label, amount]) => <div className="panel" key={label}><span className="meta">{label}</span><strong>{money(amount)}</strong></div>)}</div>
    <section className="panel"><h3>Revenue &amp; escrow ledger</h3><div className="table-wrap"><table className="data-table"><thead><tr>{["Order", "Customer / atelier", "Status", "Gross", "Collected", "Included fee", "Net owed on delivery"].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{orders.map(o => <tr key={o.id}><td><button className="btn small outline" onClick={() => setSelected(o.id)}>{o.garmentType}</button></td><td>{o.customer.name}<br />{o.tailor.name}</td><td><Status order={o} /></td><td>{money(o.totalAmount)}</td><td>{money(o.payments.filter(p => p.status === "SUCCEEDED").reduce((n, p) => n + p.amount, 0))}</td><td>{money(o.platformFeeAmount)}</td><td>{money(o.status === "DELIVERED" ? o.tailorPayout : 0)}</td></tr>)}</tbody></table></div>{!orders.length && <p className="muted">No confirmed orders yet.</p>}</section>
    {order && <><div className="section-head"><div><div className="eyebrow">Logistics control</div><h2 style={{ fontSize: 32 }}>{order.garmentType} / {order.customer.name}</h2><p className="meta">Order {order.id}</p></div><Link className="btn outline small" href={`/orders/${order.id}`}>View order details</Link></div><div className="form-grid">{order.shipments.map(s => <ShipmentControl key={`${s.id}:${s.status}:${s.updatedAt}`} order={order} shipment={s} />)}</div></>}
  </>;
}
