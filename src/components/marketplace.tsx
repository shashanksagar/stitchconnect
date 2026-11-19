"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, MapPin, Star, Clock3, X, SlidersHorizontal, Scissors } from "lucide-react";
import { money } from "@/lib/money";
export type TailorCard = { id: string; name: string; location: string; specialty: string; basePrice: number; turnaroundDays: number; rating: number; styles: string[]; image: string; bio: string };
export function Marketplace({ tailors, compact = false }: { tailors: TailorCard[]; compact?: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState("All tailors");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const comparison = tailors.filter(t => selected.includes(t.id));
  useEffect(() => {
    if (!modal) return;
    closeRef.current?.focus();
    const old = document.body.style.overflow;
    const opener = openRef.current;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setModal(false); };
    document.addEventListener("keydown", escape);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; document.removeEventListener("keydown", escape); opener?.focus(); };
  }, [modal]);
  function toggle(id: string) {
    setNotice("");
    if (selected.includes(id)) setSelected(selected.filter(x => x !== id));
    else if (selected.length === 3) setNotice("Compare up to 3 tailors. Remove one to add another.");
    else setSelected([...selected, id]);
  }
  const visible = tailors.filter(t => (filter === "All tailors" || `${t.specialty} ${t.styles.join(" ")}`.toLowerCase().includes(filter.toLowerCase())) && `${t.name} ${t.location} ${t.specialty}`.toLowerCase().includes(query.toLowerCase()));
  return <section aria-label="Tailor marketplace">
    <div className="section-head"><div><div className="eyebrow"><Scissors size={13} /> A world of craftsmanship</div><h2>{compact ? "Meet your next favorite tailor." : "Find your kind of craftsmanship."}</h2><p className="muted" style={{ marginBottom: 0 }}>Independent makers. Extraordinary skills. Something just for you.</p></div><span className="meta"><SlidersHorizontal size={14} /> {tailors.length} curated ateliers</span></div>
    {!compact && <label className="field" style={{ maxWidth: 400 }}>Search tailors or locations<input placeholder="Try Jaipur, minimalist, or Amara..." value={query} onChange={e => setQuery(e.target.value)} /></label>}
    <div className="filters">{["All tailors", "Classic", "Bridal", "Minimalist", "Occasion wear"].map(f => <button key={f} className={`pill ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)} aria-pressed={filter === f}>{f}</button>)}</div>
    <div role="status" aria-live="polite">{notice && <p className="notice">{notice}</p>}</div>
    <div className="grid">{visible.slice(0, compact ? 3 : undefined).map((t, i) => <motion.article initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .06 }} className="card" key={t.id}>
      <div className="portfolio"><img src={t.image} alt={`${t.name} original garment design illustration`} /><span className="badge">Independent atelier</span><label className="compare"><input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} aria-label={`Compare ${t.name}`} /> Compare</label></div>
      <div className="card-body"><div className="card-title"><h3>{t.name}</h3><span className="rating"><Star size={12} /> {t.rating.toFixed(1)} <span className="sr-only">out of 5</span></span></div>
      <p className="meta"><MapPin size={12} /> {t.location}</p><p className="muted" style={{ fontSize: 12, margin: "15px 0" }}>{t.specialty}</p>
      <div className="actions">{t.styles.map(s => <span className="badge" key={s}>{s}</span>)}</div>
      <div className="card-footer"><div className="price">{money(t.basePrice)} <small>starting from</small><div className="meta" style={{ marginTop: 6 }}><Clock3 size={11} /> {t.turnaroundDays}-day turnaround</div></div><Link className="btn small outline" href={`/order/new/${t.id}`}>Meet tailor <ArrowUpRight size={13} /></Link></div></div>
    </motion.article>)}</div>
    {!visible.length && <div className="panel"><p>No tailors match your search. Try another style or location.</p><button className="btn outline" onClick={() => { setFilter("All tailors"); setQuery(""); }}>Reset filters</button></div>}
    <AnimatePresence>{selected.length > 0 && <motion.div initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="compare-bar"><span>{selected.length} of 3 tailors selected</span><button ref={openRef} className="btn small" onClick={() => setModal(true)}>Compare side by side <ArrowUpRight size={14} /></button><button aria-label="Clear comparison" className="btn small" onClick={() => setSelected([])}><X size={14} /></button></motion.div>}</AnimatePresence>
    {modal && <div className="dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false); }}><div ref={modalRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="compare-title" onKeyDown={e => {
      if (e.key === "Escape") setModal(false);
      if (e.key === "Tab") {
        const nodes = modalRef.current?.querySelectorAll<HTMLElement>("button,a[href]");
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }}><div className="section-head"><h2 id="compare-title">Find your perfect match.</h2><button ref={closeRef} className="btn outline small" aria-label="Close comparison" onClick={() => setModal(false)}><X size={18} /></button></div>
      {comparison.length ? <div className="table-wrap"><table><thead><tr><th>Atelier</th>{comparison.map(t => <th key={t.id}>{t.name}<button className="btn small outline" style={{ marginLeft: 8 }} aria-label={`Remove ${t.name}`} onClick={() => { toggle(t.id); closeRef.current?.focus(); }}><X size={12} /></button></th>)}</tr></thead><tbody>
      <tr><th>Design</th>{comparison.map(t => <td key={t.id}><img src={t.image} alt={`${t.name} sample design`} style={{ width: 130, height: 140, objectFit: "cover", borderRadius: 5 }} /></td>)}</tr>
      {(["Starting price", "Turnaround", "Rating", "Location", "Design styles"] as const).map((label, index) => <tr key={label}><th>{label}</th>{comparison.map(t => <td key={t.id}>{[money(t.basePrice), `${t.turnaroundDays} days`, `${t.rating} / 5`, t.location, t.styles.join(", ")][index]}</td>)}</tr>)}
      <tr><th>Next step</th>{comparison.map(t => <td key={t.id}><Link className="btn small" href={`/order/new/${t.id}`}>Choose {t.name}</Link></td>)}</tr></tbody></table></div> : <p>No tailors selected. Close this comparison to choose more.</p>}
    </div></div>}
  </section>;
}
