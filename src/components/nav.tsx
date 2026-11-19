"use client";
import Link from "next/link";
import { Scissors, ArrowUpRight } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
export function Nav() {
  const { data } = useSession();
  return <header><nav className="nav" aria-label="Main navigation">
    <Link href="/" className="brand"><Scissors size={25} strokeWidth={1.5} /> stitch<span style={{ fontWeight: 300 }}>connect</span></Link>
    <div className="navlinks"><Link href="/explore">Explore tailors</Link><Link href="/#how-it-works">How it works</Link>
      {data ? <><Link href={data.user.role === "ADMIN" ? "/dashboard/admin" : data.user.role === "TAILOR" ? "/dashboard/tailor" : "/orders"}>My workspace</Link><button className="btn small outline" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button></> :
      <><Link href="/login">Log in</Link><Link className="btn small" href="/signup">Find your perfect fit <ArrowUpRight size={14} /></Link></>}
    </div>
  </nav></header>;
}
