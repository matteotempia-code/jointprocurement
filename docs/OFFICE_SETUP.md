# Office setup — Windows

Questa guida ricrea la baseline canonica di Joint Procurement OS su un PC Windows nuovo. La baseline contiene soltanto dati sintetici e si ottiene da repository, migration Prisma, seed deterministico e fixture versionate. Non richiede un dump PostgreSQL.

## Prerequisiti supportati

- Windows 10/11 a 64 bit.
- Git.
- Node.js `>= 20.9.0`; Node.js 22 LTS è la versione consigliata e quella verificata durante l'handover (`22.12.0`).
- npm incluso con Node.js.
- PostgreSQL `>= 16`; la macchina di sviluppo corrente usa PostgreSQL `18.6`.
- PowerShell 5.1 o PowerShell 7.

Il progetto non usa estensioni PostgreSQL specifiche. `psql` deve essere raggiungibile dal `PATH`, oppure installato sotto `C:\Program Files\PostgreSQL\<versione>\bin`.

## Documenti demo versionati

Il seed assegna ai prodotti e ai fornitori quattro documenti sintetici versionati:

- `public/documents/scheda-tecnica-demo.pdf`
- `public/documents/scheda-sicurezza-demo.pdf`
- `public/documents/certificazione-demo.pdf`
- `public/documents/dichiarazione-conformita-demo.pdf`

Sono fac-simile privi di dati reali e di validità tecnica o regolatoria. Si possono rigenerare deterministicamente con `npm run demo:pdfs`.

## 1. Clonare il repository

```powershell
Set-Location C:\dev
git clone https://github.com/matteotempia-code/jointprocurement.git joint-procurement-os
Set-Location C:\dev\joint-procurement-os
git status --short
```

Il clone deve essere pulito prima di iniziare il setup.

## 2. Verificare Node, npm e Git

```powershell
node --version
npm --version
git --version
```

Se Node non è installato, installare una release LTS da <https://nodejs.org/> e riaprire PowerShell.

## 3. Installare e verificare PostgreSQL

Installare PostgreSQL 16 o successivo con gli strumenti a riga di comando. Verificare:

```powershell
Get-Command psql
psql --version
```

Se `psql` non è nel `PATH`, per la sessione corrente:

```powershell
$env:Path = "C:\Program Files\PostgreSQL\18\bin;$env:Path"
psql --version
```

Adeguare `18` alla versione installata.

## 4. Creare utente e database locali

Aprire una sessione amministrativa; `psql` richiederà la password locale dell'utente `postgres`:

```powershell
psql -h localhost -U postgres
```

Nel prompt SQL usare una password locale scelta dall'operatore, non quella di questo esempio:

```sql
CREATE ROLE joint_procurement_user LOGIN PASSWORD 'choose-a-local-password';
CREATE DATABASE joint_procurement_os OWNER joint_procurement_user;
\q
```

Queste istruzioni sono per un database nuovo. Se ruolo o database esistono già, verificarne proprietario e credenziali anziché ricrearli.

## 5. Creare `.env`

```powershell
Copy-Item .env.example .env
notepad .env
```

Sostituire `CHANGE_ME` con la password locale scelta sopra. Non committare `.env` e non inserire credenziali reali in `.env.example`.

La sola variabile obbligatoria è `DATABASE_URL`. `DOCUMENT_INTELLIGENCE_PROVIDER=local` mantiene Smart Import in modalità deterministica senza elaborazione esterna. Le variabili `VIDEO_DEMO_*`, `VOICEOVER_ZIP_PATH` e `MUSIC_PATH` sono opzionali e documentate nel template.

## 6. Installare le dipendenze

Usare il lockfile versionato:

```powershell
npm ci
```

Per Browser QA e Video Demo installare Chromium gestito da Playwright:

```powershell
npx playwright install chromium
```

## 7. Validare Prisma

```powershell
npx prisma validate
```

## 8. Applicare le migration

Su un database vuoto o condiviso per sviluppo usare le migration già versionate:

```powershell
npx prisma migrate deploy
npx prisma migrate status
```

Non usare `prisma db push` come procedura di handover: le migration sono la fonte canonica dello schema.

## 9. Caricare la baseline demo

Il seed elimina e ricrea i dati del database configurato in `DATABASE_URL`. Eseguirlo soltanto sul database locale demo `joint_procurement_os`:

```powershell
npm run db:seed
npm run demo:imports
```

Il seed usa date e dataset fissi, ricrea organizzazioni, utenti, catalogo, budget, richieste, ordini, ricezioni e staging Smart Import. `demo:imports` rigenera i quattro documenti sintetici in `demo-imports/`.

## 10. Eseguire il controllo ambiente

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\handover\check-environment.ps1
```

Il risultato atteso è `OVERALL .............. READY`. Il controllo non stampa `DATABASE_URL` né password.

## 11. Avviare l'applicazione

```powershell
npm run dev
```

Aprire <http://localhost:3000>. Usare il selettore demo per verificare almeno Lucia Ferri e Giulia Bianchi.

## 12. Verificare Smart Import

1. Entrare come Giulia Bianchi.
2. Aprire **Importazioni**.
3. Verificare i tre job seed: listino 2027 pubblicato, listino 2028 da revisionare e CSV CareSupply da revisionare.
4. Per un upload reale usare uno dei file in `demo-imports/`; il nuovo originale sarà scritto in `var/imports/` e resterà volutamente fuori da Git.

Verifiche automatiche:

```powershell
npm test
npm run qa:browser
```

## 13. Verificare e registrare il Video Demo (opzionale)

Il Video Demo è separato dal Browser QA e ripristina il database demo:

```powershell
npm run demo:video:prepare
npm run demo:video:check
npm run demo:video
```

I nove clip, screenshot, manifest e cue narrativi vengono creati in `artifacts/video-demo/`. La cartella è generata e ignorata da Git.

Una singola scena può essere rigenerata:

```powershell
npm run demo:video:scene -- smart-import
```

L'assembly narrato richiede un ZIP di nove tracce vocali fornito separatamente. Non è necessario per ricreare l'app o i clip grezzi:

```powershell
npm run demo:video:assemble -- --voiceover "C:\path\joint_procurement_voiceover.zip"
npm run demo:video:validate-final
```

La musica è opzionale e va indicata con `MUSIC_PATH`; usare soltanto asset con licenza adeguata.

## Storage locale e backup

- `var/imports/`: originali caricati a runtime. Non necessari per la baseline seed; ignorati da Git. Per trasferire uno stato operativo puntuale occorre copiarli insieme al dump del database.
- `artifacts/video-demo/`: output rigenerabili del recorder; il voice-over consegnato esternamente non è rigenerabile dal repository.
- `node_modules/`, `.next/`, `.next-video-demo/`: cache e build rigenerabili.
- `backups/`: dump locali, sempre ignorati da Git.

Migration e seed sono la strategia canonica. Se serve una fotografia esatta del database locale corrente, creare manualmente un dump custom senza incorporare password nel comando:

```powershell
New-Item -ItemType Directory -Force .\backups | Out-Null
pg_dump -h localhost -U joint_procurement_user -d joint_procurement_os --format=custom --no-owner --no-acl --file=.\backups\joint_procurement_os_demo.dump
```

Il comando richiede la password in modo interattivo. Il dump non deve essere committato, inviato automaticamente o usato al posto di migration + seed per il normale setup.
