import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import "./globals.css";
export const metadata: Metadata = { title: "Stitch Connect | Made for you, by someone extraordinary", description: "Discover independent tailors around the world. Your fabric, your vision, your perfect fit." };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Providers><Nav /><main id="main">{children}</main><footer><span>STITCH CONNECT &copy; {new Date().getFullYear()} &middot; Made personal. Made together.</span><span>Local MVP &middot; Simulated payments only &middot; USD</span></footer></Providers></body></html>;
}
