# Pannello di leandrohenriquez.com

Server del pannello di gestione (Cloudflare Worker, piano gratuito). Il sito pubblico resta statico
su GitHub Pages: il pannello modifica i file del repo con un commit per ogni salvataggio, e GitHub Pages
ripubblica il sito in un minuto circa.

## Cosa fa
- **Accesso**: entri con Google, ma solo se la tua email è nell'elenco. Il proprietario (`OWNER_EMAIL`)
  entra sempre ed è l'unico che aggiunge o toglie email. Se togli un'email, quella persona esce subito.
- **Progetti**: legge e salva `data/progetti.json` (nome, tipo, contesto, anteprima, ordine, pubblicato).
  A ogni salvataggio rigenera anche `assets/js/indice.js`, che la home usa per l'indice dei lavori.
- **Pagine progetto**: legge e salva `lavori/<slug>/progetto.json` (solo se la pagina HTML esiste già).
- **Immagini**: carica PNG, JPG, WebP o AVIF fino a 8 MB in `assets/img/<slug>/`.
- **Laboratorio**: elenco delle app in `data/app.json` (aggiungi, ordina, pubblica), carica il file HTML
  di ogni app in `app/<slug>/index.html` e rigenera i riquadri di `laboratorio/index.html`.
- **Statistiche**: chiede i dati a GoatCounter con la chiave segreta, che il browser non vede mai.
- **App installabile**: manifest e service worker (`public/sw.js`): il pannello si aggiunge alla schermata Home
  e si apre a tutto schermo. Il service worker salva solo l'interfaccia, mai le risposte di `/api/`.
- **Notifiche push**: dal pulsante "notifiche" ognuno iscrive i propri dispositivi (su iPhone solo con il
  pannello aggiunto alla Home). Gli avvisi del sito vanno al proprietario: un controllo di "Controlli del
  sito" che smette di passare o torna a posto, il PDF del portfolio che non si rigenera. Le Actions si
  fanno riconoscere con il token OIDC di GitHub (audience `hl-pannello`), quindi non serve un segreto
  condiviso; l'avviso parte dalla action `.github/actions/avvisa`.

Se nel frattempo il sito è cambiato (per esempio è stata unita una PR), il salvataggio viene rifiutato
invece di sovrascrivere: si ricarica e si riprova.

## API
| Metodo | Percorso | Chi |
|---|---|---|
| GET | `/api/config` | tutti (solo l'ID pubblico di Google) |
| POST | `/api/accesso` `{credential}` · `/api/uscita` | tutti |
| GET | `/api/io` | chi ha accesso |
| GET · PUT · POST | `/api/progetti` | chi ha accesso |
| DELETE | `/api/progetti/:slug?base=` | chi ha accesso |
| GET · PUT | `/api/progetti/:slug/pagina` | chi ha accesso |
| POST | `/api/progetti/:slug/immagini` `{nome, base64}` | chi ha accesso |
| GET · PUT · POST | `/api/app` | chi ha accesso |
| PUT | `/api/app/:slug/file` `{html}` · DELETE `/api/app/:slug?base=` | chi ha accesso |
| GET | `/api/statistiche?giorni=30` | chi ha accesso |
| GET · POST · DELETE | `/api/push` (chiave pubblica · iscrivi `{iscrizione}` · togli `{endpoint}`) | chi ha accesso |
| POST | `/api/push/prova` | chi ha accesso (ai propri dispositivi) |
| POST | `/api/notifica` `{titolo, testo, url}` | GitHub Actions di questo repo (token OIDC) |
| GET | `/api/portfolio` (il PDF) · `/api/portfolio/info` | chi ha accesso |
| PUT | `/api/portfolio` (corpo: il PDF) | GitHub Actions di questo repo (token OIDC) |
| GET · POST · DELETE | `/api/accessi` | solo il proprietario |

Le richieste che modificano qualcosa devono avere l'intestazione `x-pannello: 1` e arrivare dalla stessa origine.

## Provare
```
cd backend
npm install
npm test          # 23 prove con GitHub, Google e GoatCounter simulati
```

## Messa online
La fa da sola la GitHub Action `.github/workflows/pannello.yml` a ogni modifica di `backend/` su `main`
(o a mano: Actions → Pannello → Run workflow). Crea lo spazio KV degli accessi, pubblica il Worker su
`*.workers.dev` e scrive i segreti. Servono questi segreti del repo (Settings → Secrets and variables → Actions):

| Segreto | Cos'è |
|---|---|
| `CLOUDFLARE_API_TOKEN` | token Cloudflare, modello "Edit Cloudflare Workers" |
| `CLOUDFLARE_ACCOUNT_ID` | ID dell'account Cloudflare |
| `PANNELLO_OWNER_EMAIL` | email Google del proprietario |
| `PANNELLO_GITHUB_TOKEN` | token fine-grained solo per questo repo, *Contents: read and write* |
| `GOOGLE_CLIENT_ID` | ID client OAuth di tipo "Applicazione web"; origine autorizzata = indirizzo del pannello |
| `GOATCOUNTER_CODE`, `GOATCOUNTER_TOKEN` | facoltativi, per le statistiche |

`SESSION_SECRET` e `VAPID_JWK` (chiave delle notifiche) vengono generati la prima volta e poi lasciati come sono. La variabile del repo `PANNELLO_URL` è facoltativa: se manca, gli avvisi delle Actions ricavano l'indirizzo `*.workers.dev` da Cloudflare. Senza i segreti Cloudflare l'Action
si ferma con un avviso, senza errori. Il dominio `pannello.leandrohenriquez.com` si può collegare dopo
(Cloudflare → Workers → Domini, più un record CNAME su Spaceship).
