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
| GET · POST · DELETE | `/api/accessi` | solo il proprietario |

Le richieste che modificano qualcosa devono avere l'intestazione `x-pannello: 1` e arrivare dalla stessa origine.

## Provare
```
cd backend
npm install
npm test          # 23 prove con GitHub, Google e GoatCounter simulati
```

## Messa online (fase "accessi", da fare insieme)
1. Account Cloudflare gratuito, poi `npx wrangler login`.
2. `npx wrangler kv namespace create ACCESSI` e copia l'id in `wrangler.toml`.
3. Google Cloud Console: crea un "ID client OAuth" di tipo Web con origine `https://pannello.leandrohenriquez.com`;
   metti l'ID in `wrangler.toml` (`GOOGLE_CLIENT_ID`).
4. GitHub: token fine-grained solo per questo repo, permesso *Contents: read and write*.
5. Segreti: `npx wrangler secret put OWNER_EMAIL`, `SESSION_SECRET`, `GITHUB_TOKEN`, `GOATCOUNTER_TOKEN`.
6. `npm run deploy`, poi in Cloudflare collega il dominio `pannello.leandrohenriquez.com`
   (record CNAME su Spaceship).
