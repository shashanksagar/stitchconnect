import { notFound } from "next/navigation";
import { pageUser } from "@/server/auth";
import { getOrder } from "@/server/orders";
import { orderDTO } from "@/server/dto";
import { AppError } from "@/server/errors";
import { OrderView } from "@/components/order-view";
export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await pageUser();
  const { orderId } = await params;
  try {
    const order = await getOrder(orderId, user);
    return <div className="container"><div className="eyebrow">Order / {order.id}</div><h2>From an idea to your doorstep.</h2><OrderView order={orderDTO(order)} role={user.role} /></div>;
  } catch (error) {
    if (error instanceof AppError && [403, 404].includes(error.status)) notFound();
    throw error;
  }
}
