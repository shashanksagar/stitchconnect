import { pageUser } from "@/server/auth";
import { ledger, listOrders } from "@/server/orders";
import { orderDTO } from "@/server/dto";
import { AdminDashboard } from "@/components/dashboards";
export default async function AdminPage() {
  const user = await pageUser("ADMIN");
  const orders = await listOrders(user);
  return <div className="container"><div className="eyebrow">Behind every great delivery</div><h2>Keep every thread connected.</h2><p className="muted">Doorstep logistics, transparent accounting, and a little peace of mind.</p><AdminDashboard orders={orders.map(orderDTO)} ledger={ledger(orders)} /></div>;
}
