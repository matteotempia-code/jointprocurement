import Link from "next/link";
export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">Non disponibile</p>
      <h1>Questa pagina non rientra nel tuo ruolo.</h1>
      <p>
        Il tuo profilo non ha accesso a questa sezione. Se ti serve, chiedilo a chi amministra
        l&rsquo;organizzazione: può assegnartelo senza farti cambiare utenza.
      </p>
      <Link href="/" data-primary="true" className="primary-cta">
        Torna alla tua pagina
      </Link>
    </main>
  );
}
