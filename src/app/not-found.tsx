import Link from "next/link";
export default function NotFound() { return <div className="container"><div className="panel narrow"><h2>This thread leads somewhere else.</h2><p className="muted">The page is missing or isn&apos;t available to your account.</p><Link className="btn" href="/explore">Back to the ateliers</Link></div></div>; }
