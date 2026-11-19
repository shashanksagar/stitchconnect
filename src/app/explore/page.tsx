import { Marketplace } from "@/components/marketplace";
import { catalogue } from "@/server/catalogue";
export const dynamic = "force-dynamic";
export default async function Explore() { return <div className="container"><Marketplace tailors={await catalogue()} /></div>; }
