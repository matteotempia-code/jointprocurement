import { redirect } from "next/navigation";
import { login } from "./actions";
import { demoModeEnabled } from "@/lib/demo-session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (demoModeEnabled()) redirect("/");
  const error = (await searchParams).error;
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Sorgence</p>
        <h1>Accedi</h1>
        <p>Usa il tuo account aziendale per continuare.</p>
        {error === "credentials" && <p role="alert">Email o password non valide.</p>}
        {error === "auth-configuration" && <p role="alert">Autenticazione temporaneamente non disponibile.</p>}
        <form action={login}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required />
          <button className="primary-cta" type="submit">Accedi</button>
        </form>
      </section>
    </main>
  );
}
