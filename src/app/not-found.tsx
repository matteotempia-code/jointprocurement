import Link from "next/link";
export default function NotFound() {
  return (
    // L'appiglio per le certificazioni e questo attributo, non il testo: la copia
    // cambia quando il prodotto migliora, e un collaudo che si rompe a ogni parola
    // riscritta smette di essere un collaudo e diventa un ostacolo.
    <main className="not-found" data-scope="denied">
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
