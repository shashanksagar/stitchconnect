"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Ruler, Upload, X } from "lucide-react";
import { addressSchema, measurementsSchema, orderSchema } from "@/lib/validation";
import { money, economics } from "@/lib/money";
import { api, errorText, uploadImage } from "@/lib/client";
import { garments } from "@/lib/demo-data";
import type { TailorCard } from "./marketplace";
type Address = { name: string; line1: string; city: string; postalCode: string; country: string; phone: string };
const emptyAddress: Address = { name: "", line1: "", city: "", postalCode: "", country: "", phone: "" };
function AddressFields({ title, value, onChange }: { title: string; value: Address; onChange: (address: Address) => void }) {
  const labels = { name: "Contact name", line1: "Street address", city: "City / region", postalCode: "Postal code", country: "Country", phone: "Phone number" };
  return <fieldset style={{ border: 0, padding: 0 }}><legend style={{ fontWeight: 600, marginBottom: 20 }}>{title}</legend><div className="form-grid">{(Object.keys(labels) as (keyof Address)[]).map(key => <label className="field" key={key}>{labels[key]}<input required maxLength={key === "line1" ? 200 : 100} autoComplete={key === "phone" ? "tel" : undefined} value={value[key]} onChange={e => onChange({ ...value, [key]: e.target.value })} /></label>)}</div></fieldset>;
}
export function MeasurementGuide() {
  return <div className="guide"><svg viewBox="0 0 120 210" role="img" aria-labelledby="body-guide-title"><title id="body-guide-title">Measure chest around the fullest point, waist at the natural waist, and garment length from shoulder to hem.</title><circle cx="60" cy="21" r="15" fill="#d8c8b3" /><path d="M43 40 26 49 12 105 27 109 40 73 42 122 34 192 51 195 60 136 69 195 86 192 78 122 80 73 93 109 108 105 94 49 77 40Q60 49 43 40Z" fill="#d8c8b3" /><path d="M36 69h48M42 107h36M104 44v151M99 44h10M99 195h10" stroke="#ad543b" strokeWidth="2" strokeDasharray="4 2" /><text x="0" y="67" fontSize="10" fill="#ad543b">1</text><text x="24" y="106" fontSize="10" fill="#ad543b">2</text><text x="108" y="122" fontSize="10" fill="#ad543b">3</text></svg><div><h3><Ruler size={16} style={{ display: "inline", marginRight: 7 }} />A fit that feels like you.</h3><p className="muted" style={{ fontSize: 12 }}>1. Chest: around the fullest point.<br />2. Waist: around your natural waist.<br />3. Length: shoulder to desired hem.<br />Keep the tape level and comfortably snug.</p></div></div>;
}
export function OrderWizard({ tailor }: { tailor: TailorCard }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [garment, setGarment] = useState("Dress");
  const [measurements, setMeasurements] = useState({ chest: "", waist: "", length: "", unit: "cm" });
  const [pickup, setPickup] = useState(emptyAddress);
  const [delivery, setDelivery] = useState(emptyAddress);
  const [same, setSame] = useState(true);
  const [images, setImages] = useState<{ id: string; url: string }[]>([]);
  const [checkoutKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const price = economics(tailor.basePrice);
  const data = () => ({ tailorId: tailor.id, garmentType: garment, measurements: { chest: Number(measurements.chest), waist: Number(measurements.waist), length: Number(measurements.length), unit: measurements.unit }, pickupAddress: pickup, deliveryAddress: same ? pickup : delivery, uploadIds: images.map(i => i.id), checkoutKey, quotedAmount: tailor.basePrice });
  return <div className="split"><div><ol className="tracker" aria-label="Order form steps">{["Your design", "Measurements", "Doorstep details", "Review & pay"].map((label, index) => <li className={index <= step ? "done" : ""} key={label} aria-current={index === step ? "step" : undefined}><span>{index < step ? <Check size={12} /> : index + 1}</span>{label}</li>)}</ol>
    <form className="panel" onSubmit={async e => {
      e.preventDefault(); setError("");
      try {
        if (step === 1) measurementsSchema.parse(data().measurements);
        if (step === 2) { addressSchema.parse(pickup); addressSchema.parse(same ? pickup : delivery); }
        if (step < 3) { setStep(step + 1); return; }
        const input = orderSchema.parse(data());
        setBusy(true);
        const order = await api<{ id: string }>("/api/orders", "POST", input);
        router.push(`/orders/${order.id}`);
      } catch (error) { setError(errorText(error)); } finally { setBusy(false); }
    }}>
      {step === 0 && <><div className="eyebrow">01 / Dream it</div><h2 style={{ fontSize: 32 }}>What are we making?</h2><label className="field">Garment type<select value={garment} onChange={e => setGarment(e.target.value)}>{garments.map(g => <option key={g}>{g}</option>)}</select></label><p className="muted">Share your inspiration. Up to 5 JPEG, PNG, or WebP images, 5 MB each. Reference photos are optional.</p><label className="btn outline"><Upload size={15} /> {busy ? "Uploading..." : "Add reference photos"}<input aria-label="Reference photos" type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" disabled={busy || images.length === 5} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        setBusy(true); setError("");
        try { const image = await uploadImage(file); setImages([...images, image]); } catch (error) { setError(errorText(error)); } finally { setBusy(false); e.target.value = ""; }
      }} /></label><div className="photos" style={{ marginTop: 16 }}>{images.map((image, i) => <div key={image.id}><img src={image.url} alt={`Reference ${i + 1}`} /><button type="button" className="btn small outline" aria-label={`Remove reference ${i + 1}`} disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try { await api(`/api/uploads/${image.id}`, "DELETE"); setImages(images.filter(p => p.id !== image.id)); } catch (error) { setError(errorText(error)); } finally { setBusy(false); }
      }}><X size={12} /></button></div>)}</div></>}
      {step === 1 && <><div className="eyebrow">02 / Your perfect fit</div><h2 style={{ fontSize: 32 }}>A few measurements.</h2><MeasurementGuide /><label className="field">Measurement unit<select value={measurements.unit} onChange={e => setMeasurements({ ...measurements, unit: e.target.value })}><option value="cm">Centimeters (cm)</option><option value="in">Inches (in)</option></select></label><div className="form-grid">{(["chest", "waist", "length"] as const).map(key => <label className="field" key={key} style={{ textTransform: "capitalize" }}>{key} ({measurements.unit})<input type="number" step=".1" min=".1" max="500" required value={measurements[key]} onChange={e => setMeasurements({ ...measurements, [key]: e.target.value })} /></label>)}</div></>}
      {step === 2 && <><div className="eyebrow">03 / The journey</div><h2 style={{ fontSize: 32 }}>We come to you.</h2><AddressFields title="Fabric pickup address" value={pickup} onChange={setPickup} /><label className="actions" style={{ fontSize: 13, marginBottom: 24 }}><input type="checkbox" checked={same} onChange={e => setSame(e.target.checked)} /> Deliver the finished garment to the same address</label>{!same && <AddressFields title="Finished garment delivery address" value={delivery} onChange={setDelivery} />}</>}
      {step === 3 && <><div className="eyebrow">04 / A beautiful beginning</div><h2 style={{ fontSize: 32 }}>Your creation, at a glance.</h2><dl className="details"><dt>Design</dt><dd>{garment} by {tailor.name}</dd><dt>Measurements</dt><dd>Chest {measurements.chest}, waist {measurements.waist}, length {measurements.length} {measurements.unit}</dd><dt>Pickup</dt><dd>{pickup.line1}, {pickup.city}, {pickup.country}</dd><dt>Delivery</dt><dd>{(same ? pickup : delivery).line1}, {(same ? pickup : delivery).city}, {(same ? pickup : delivery).country}</dd></dl><p className="notice">Create your order, then confirm the first {money(price.upfront)} installment using the payment simulator. No real money is charged.</p></>}
      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="actions" style={{ marginTop: 25 }}>{step > 0 && <button className="btn outline" type="button" disabled={busy} onClick={() => { setStep(step - 1); setError(""); }}>Back</button>}<button className="btn rust" disabled={busy}>{busy ? "Please wait..." : step === 3 ? "Create order & continue to demo payment" : "Continue"}<ArrowRight size={14} /></button></div>
    </form></div><aside className="panel"><img src={tailor.image} alt={`${tailor.name} garment illustration`} style={{ width: "100%", height: 190, objectFit: "cover", borderRadius: 6, marginBottom: 20 }} /><div className="eyebrow">Your chosen atelier</div><h3>{tailor.name}</h3><p className="muted">{tailor.location}<br />{tailor.turnaroundDays}-day production estimate</p><p className="muted" style={{ fontSize: 12 }}>Fixed quote for your chosen garment. Pickup and delivery are manually coordinated by our team.</p><hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "20px 0" }} /><dl className="details"><dt>Total (USD)</dt><dd className="price">{money(tailor.basePrice)}</dd><dt>Included platform fee (10%)</dt><dd>{money(price.fee)}</dd><dt>Tailor net payout</dt><dd>{money(price.net)}</dd><dt>50% upfront / balance when ready</dt><dd>{money(price.upfront)} / {money(price.final)}</dd></dl><span className="badge">DEMO &middot; No real charges</span></aside></div>;
}
