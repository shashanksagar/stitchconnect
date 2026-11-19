import Link from "next/link";
import { notFound } from "next/navigation";
import { pageUser } from "@/server/auth";
import { messages, chatMember } from "@/server/chat";
import { AppError } from "@/server/errors";
import { Chat } from "@/components/chat";
export default async function ChatPage({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await pageUser();
  const { orderId } = await params;
  try {
    const order = await chatMember(orderId, user);
    const initial = await messages(orderId, user);
    return <div className="container"><div className="narrow" style={{ maxWidth: 850 }}><div className="section-head"><div><div className="eyebrow">Good things happen together</div><h2>Your {order.garmentType.toLowerCase()}, in conversation.</h2></div><Link className="btn outline small" href={`/orders/${orderId}`}>Back to order</Link></div><Chat orderId={orderId} userId={user.id} initial={initial.map(m => ({ ...m, createdAt: m.createdAt.toISOString() }))} /></div></div>;
  } catch (error) {
    if (error instanceof AppError && [403, 404].includes(error.status)) notFound();
    throw error;
  }
}
