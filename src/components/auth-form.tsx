"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/client";
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <form className="panel" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError("");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    try {
      if (signup) await api("/api/signup", "POST", { name: form.get("name"), location: form.get("location"), email, password });
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error(signup ? "Account created, but login failed. Try logging in again." : "Login failed. Check your credentials or wait a minute before retrying.");
      router.push("/orders"); router.refresh();
    } catch (error) { setError(errorText(error)); } finally { setBusy(false); }
  }}>
    {signup && <><label className="field">Your name<input name="name" autoComplete="name" required minLength={2} maxLength={80} /></label><label className="field">City and country<input name="location" autoComplete="address-level2" required minLength={2} maxLength={120} /></label></>}
    <label className="field">Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label className="field">Password<input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 10 : 1} maxLength={128} /></label>
    {error && <p role="alert" className="notice error">{error}</p>}
    <button className="btn rust" disabled={busy}>{busy ? "Please wait..." : signup ? "Create your account" : "Welcome back"}</button>
    <p className="muted" style={{ fontSize: 12, marginTop: 20 }}>{signup ? "Already found us?" : "New to Stitch Connect?"} <Link href={signup ? "/login" : "/signup"} style={{ textDecoration: "underline" }}>{signup ? "Log in" : "Create an account"}</Link></p>
    {!signup && <p className="notice">Demo accounts: customer@stitch.local, tailor1@stitch.local, admin@stitch.local. Ask the demo owner for credentials, or create a customer account. Use fictional details only. No real payments.</p>}
  </form>;
}
