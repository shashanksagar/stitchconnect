"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, MessageSquare, Truck, ShieldCheck } from "lucide-react";
import type { OrderDTO } from "@/server/dto";
import type { Role } from "@prisma/client";
import { money, economics } from "@/lib/money";
import { api, errorText } from "@/lib/client";
import { addressSchema, measurementsSchema } from "@/lib/validation";
const statuses = ["PENDING_PICKUP", "IN_TRANSIT_TO_TAILOR", "STITCHING", "READY_FOR_DELIVERY", "DELIVERED"];
const labels = ["Fabric pickup", "On its way", "Being crafted", "Ready for you", "Delivered"];
export function OrderTracker({ status }: { status: string }) {
  const index = statuses.indexOf(status);
  return <ol className="tracker" aria-label="Order progress">{labels.map((label, i) => <li key={label} className={i <= index ? "done" : ""} aria-current={i === index ? "step" : undefined}><span>{i < index ? <Check size={13} /> : i + 1}</span>{label}</li>)}</ol>;
}
export function OrderView({ order, role }: { order: OrderDTO; role: Role }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const router = useRouter();
  const measurements = measurementsSchema.parse(order.measurements);
  const pickup = addressSchema.parse(order.pickupAddress), delivery = addressSchema.parse(order.deliveryAddress);
  const price = economics(order.totalAmount, order.platformFeePercent);
  async function pay(outcome: "success" | "failure") {
    setBusy(true); setError(""); setNotice("");
    try {
      const payment = await api<{ status: string }>(`/api/orders/${order.id}/payments`, "POST", { installment: order.upfrontPaid ? "FINAL" : "UPFRONT", outcome });
      setNotice(payment.status === "SUCCEEDED" ? "Demo payment received. Your order is updated." : "Demo payment failed. No funds collected; you can safely retry.");
      router.refresh();
    } catch (error) { setError(errorText(error)); } finally { setBusy(false); }
  }
  const canPay = role === "CUSTOMER" && (!order.upfrontPaid || (order.status === "READY_FOR_DELIVERY" && !order.finalPaid));
  return <><OrderTracker status={order.status} /><div className="split"><div><section className="panel"><div className="section-head"><div><div className="eyebrow">A piece of your story</div><h2 style={{ fontSize: 32 }}>{order.garmentType} by {order.tailor.name}</h2><span className="badge">{!order.upfrontPaid ? "Awaiting upfront payment" : order.status.replaceAll("_", " ")}</span></div>{role !== "ADMIN" && <Link className="btn outline" href={`/orders/${order.id}/chat`}><MessageSquare size={15} /> Talk to your tailor</Link>}</div><p className="muted">Customer: {order.customer.name}</p><dl className="details"><dt>Measurements</dt><dd>Chest {measurements.chest} / Waist {measurements.waist} / Length {measurements.length} {measurements.unit}</dd><dt>Design references</dt><dd><div className="photos">{Array.isArray(order.referenceImages) && order.referenceImages.length ? order.referenceImages.map((url, i) => typeof url === "string" && <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Customer reference ${i + 1}`} /></a>) : "No reference images attached."}</div></dd></dl></section>
    <section className="panel"><h3><Truck size={16} style={{ display: "inline" }} /> Your doorstep journey</h3><div className="form-grid"><div><div className="eyebrow">Fabric pickup</div><AddressText address={pickup} /></div><div><div className="eyebrow">Final delivery</div><AddressText address={delivery} /></div></div>{order.shipments.map(s => <div key={s.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 14 }}><strong style={{ fontSize: 13 }}>{s.leg === "FABRIC_PICKUP" ? "Leg 1 / Customer to tailor" : "Leg 2 / Tailor to customer"}</strong><p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>{s.status.replaceAll("_", " ")}{s.courier && ` · ${s.courier} · ${s.contact} · ${s.tracking}`}</p></div>)}</section></div>
    <aside className="panel"><h3><ShieldCheck size={16} style={{ display: "inline" }} /> Clear from the first stitch.</h3><dl className="details"><dt>Total quote</dt><dd className="price">{money(order.totalAmount)}</dd><dt>Included platform fee ({order.platformFeePercent}%)</dt><dd>{money(order.platformFeeAmount)}</dd><dt>Tailor net payout on delivery</dt><dd>{money(order.tailorPayout)}</dd><dt>Upfront installment</dt><dd>{money(price.upfront)} &middot; {order.upfrontPaid ? "Paid" : "Not paid"}</dd><dt>Final installment</dt><dd>{money(price.final)} &middot; {order.finalPaid ? "Paid" : "Due when ready"}</dd></dl>
      {order.totalAmount % 2 !== 0 && <p className="muted" style={{ fontSize: 11 }}>For an odd-cent total, the extra cent is included in the first installment.</p>}
      {canPay && <><p className="notice">DEMO payment simulator. No real money or card details.</p><div className="actions"><button className="btn rust" disabled={busy} onClick={() => pay("success")}>{busy ? "Processing..." : `Pay ${money(order.upfrontPaid ? price.final : price.upfront)} (demo)`}</button><button className="btn small outline" disabled={busy} onClick={() => pay("failure")}>Simulate failure</button></div></>}
      {!canPay && !order.finalPaid && <p className="muted" style={{ fontSize: 12 }}>The balance becomes available when the tailor marks your garment ready.</p>}
      {notice && <p className="notice" role="status">{notice}</p>}{error && <p className="notice error" role="alert">{error}</p>}
    </aside></div></>;
}
function AddressText({ address }: { address: ReturnType<typeof addressSchema.parse> }) {
  return <p className="details">{address.name}<br />{address.line1}<br />{address.city}, {address.postalCode}<br />{address.country}<br />{address.phone}</p>;
}
