import Link from "next/link";
export default function NotFound() { return <main className="not-found"><p className="eyebrow">Unavailable</p><h1>This view is outside your current role or scope.</h1><p>The demo applies the same role and scope boundaries that future authentication will enforce.</p><Link href="/" className="primary-cta">Return home</Link></main>; }
