# M12 remote certification

Target canonico: `https://procurement.partnersviluppo.dev`, ambiente Vercel `develop` e database DEV. La suite è `npm run qa:m12:remote`; il workflow `develop-cloud-certification.yml` risolve il deployment associato allo SHA e usa accesso Vercel autenticato quando la protezione SSO è attiva.

Una certificazione valida registra lo stesso SHA per tre esecuzioni consecutive, senza pulizia manuale tra le esecuzioni. Ogni esecuzione verifica lotto da 100 documenti, persistenza e associazioni, Product 360, chiamata OpenAI riuscita, isolamento ruolo e matrice negativa di ingestione. Il report finale deve distinguere il PASS applicativo dall'accesso pubblico al dominio protetto.

Le evidenze definitive sono gli URL delle esecuzioni CI e il riepilogo JSON emesso dalla suite. Un elemento può essere dichiarato al 100% nel Feature Register solo dopo le tre esecuzioni remote riuscite sul medesimo SHA.
