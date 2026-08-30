"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="not-found"><p className="eyebrow">Something went wrong</p><h1>We couldn’t load this workspace.</h1><p>The data connection may be temporarily unavailable.</p><button className="primary-cta" onClick={reset}>Try again</button></main>; }
