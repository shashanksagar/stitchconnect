import { pageUser } from "@/server/auth";
import { listOrders } from "@/server/orders";
import { orderDTO } from "@/server/dto";
import { TailorDashboard } from "@/components/dashboards";
export default async function TailorPage() {
  const user = await pageUser("TAILOR");
  return <div className="container"><div className="eyebrow">Your atelier, connected</div><h2>A good day to create.</h2><p className="muted">Welcome, {user.name}. Every commission is someone&apos;s next favorite piece.</p><TailorDashboard orders={(await listOrders(user)).map(orderDTO)} /></div>;
}
