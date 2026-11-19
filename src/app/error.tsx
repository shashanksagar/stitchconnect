"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="container"><div className="panel narrow"><h2>Something came undone.</h2><p className="muted">We couldn&apos;t load this page. Please retry, or check the local server logs if the problem persists.</p><button className="btn" onClick={reset}>Try again</button></div></div>;
}
