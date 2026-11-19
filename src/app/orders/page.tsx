import Link from "next/link";
import { redirect } from "next/navigation";
import { pageUser } from "@/server/auth";
import { listOrders } from "@/server/orders";
import { money } from "@/lib/money";
export default async function Orders() {
  const user = await pageUser();
  if (user.role === "ADMIN") redirect("/dashboard/admin");
  if (user.role === "TAILOR") redirect("/dashboard/tailor");
  const orders = await listOrders(user);
  return <div className="container"><div className="section-head"><div><div className="eyebrow">Your personal collection</div><h2>Good things take shape.</h2><p className="muted">Follow every stitch and every step of the journey.</p></div><Link href="/explore" className="btn rust">Start something new</Link></div>
    {orders.length ? <div className="grid">{orders.map(o => <article className="panel" key={o.id}><span className="badge">{o.upfrontPaid ? o.status.replaceAll("_", " ") : "AWAITING PAYMENT"}</span><h3 style={{ marginTop: 20 }}>{o.garmentType}</h3><p className="muted">With {o.tailor.name}</p><p className="price">{money(o.totalAmount)}</p><Link className="btn outline" href={`/orders/${o.id}`}>Follow your order &rarr;</Link></article>)}</div> : <div className="panel"><h3>Your next favorite piece starts here.</h3><p className="muted">You haven&apos;t placed an order yet. Meet the makers and find your perfect match.</p><Link className="btn" href="/explore">Explore tailors</Link></div>}
  </div>;
}
