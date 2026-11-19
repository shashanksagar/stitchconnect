import { notFound } from "next/navigation";
import { pageUser } from "@/server/auth";
import { catalogue } from "@/server/catalogue";
import { OrderWizard } from "@/components/order-wizard";
export default async function NewOrder({ params }: { params: Promise<{ tailorId: string }> }) {
  await pageUser("CUSTOMER");
  const { tailorId } = await params;
  const tailor = (await catalogue()).find(t => t.id === tailorId);
  if (!tailor) notFound();
  return <div className="container"><div className="eyebrow">Something wonderful is taking shape</div><h2>Let&apos;s make it yours.</h2><OrderWizard tailor={tailor} /></div>;
}
