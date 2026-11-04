# leandrohenriquez.com — note per chi ci lavora

Portfolio di Leandro Henriquez (industrial designer, design specialist in Elica dal 2022).
Sito statico senza build, pubblicato con GitHub Pages dal branch `main`, cartella radice.
Online su https://leandrohenriquez.com (dominio su Spaceship, DNS → GitHub Pages; file CNAME
nel repo, non cancellarlo). Lo stato del lavoro e i problemi aperti sono in HANDOFF.md.

## Preferenze del proprietario (vincolanti)
- Prima di ogni modifica visiva (layout, font, spaziature, menu, animazioni) si prepara
  un'anteprima con varianti affiancate e i valori esatti da cambiare. Non si applica nulla
  finché Leandro non sceglie la variante.
- Lavorando su UI e animazioni si seguono le skill apple-look e apple-motion, citando la regola
  applicata. Leandro ha detto che per questo sito si possono anche ignorare quando servono
  scelte sperimentali.

## Decisioni di design già prese
- Stile: tipografia cinetica sperimentale (Archivo variabile, wdth 62–125, wght 100–900),
  lettere che reagiscono al cursore. Carta #E9E6DF, inchiostro #111.
- Colore d'accento: **solo nero** (#111). L'arancione è stato scartato.
- Indice lavori: anteprima del progetto che segue il mouse (piace molto). NIENTE skew o
  deformazioni durante lo scroll (scartato).
- NIENTE oggetto 3D che segue il mouse in home (rimosso su richiesta esplicita).
- Pagina progetto 3D: l'oggetto sta **al centro**, fluttua sopra la pagina senza finestra né
  sfondo, e ruota/zooma con lo scroll. Dietro: parole giganti, quote reali in SVG, scheda
  tecnica; il contenuto sotto (scheda, immagini, processo, prossimo progetto).
- Transizione verso un progetto: forme piene del modulo "hl.".
- Logo: monogramma "hl." (favicon.svg, inline nelle pagine).
- Scelte del 3/11/2026 (anteprima con varianti affiancate):
  - Focus da tastiera **come l'hover**, senza contorno né barra (righe e "Oopar in 3D" si allargano,
    menu e link in grassetto, email più pesante).
  - Righe senza pagina **attenuate**: nome #7D7A73, nessuna freccia, nessuna etichetta "in arrivo".
  - Telefono: pulsante **"menu"** che apre un foglio a tutto schermo.
  - Desktop: **barre piene** in alto e in basso, come sul telefono; sotto i 1000 px niente
    "industrial designer / macerata, it".
  - Telefono, nome in home **"a misura"**: ogni riga riempie la larghezza (calcolo in `fitHero`,
    home.js), LEANDRO peso 800 e HENRIQUEZ 300, senza cinetica. Scartate: manifesto a 4 righe,
    cognome in verticale, nome con Oopar quotata.
- Link e titoli sono semantici (`<a href>`, `h1` nascosto, titoli di sezione `role="heading"`):
  le righe con pagina sono `<a>`, quelle senza restano `<div>`.

## Struttura
- `index.html` (home, `data-base=""`) e `lavori/<progetto>/index.html` (`data-base="../../"`).
  `common.js` legge `data-base` per costruire i percorsi delle immagini.
- `assets/js/common.js` — codice condiviso (molla Spr, helper, materiale noce procedurale,
  `makeRealLamp`, forme del modulo).
- `assets/js/home.js`, `assets/js/progetto.js` — logica delle pagine.
- Pagine progetto guidate da dati: `lavori/<progetto>/progetto.json` contiene titolo, contatore,
  modello (`dati` = file mesh, `costruttore` = funzione in `BUILDERS` di progetto.js), intro,
  tappe (camera yaw/pitch/dist, parola gigante, didascalia, quote 3D), scheda, immagini,
  processo e prossimo progetto. `index.html` del progetto è solo il guscio (meta, logo, script).
  Per una pagina nuova: copiare la cartella `lavori/oopar/`, cambiare meta e JSON.
  Dopo ogni modifica al JSON: `node tools/genera-html.js lavori/<progetto>` copia i testi
  nell'HTML (tra i segnaposto `<!--g:...-->`), così la pagina si legge anche senza JavaScript.
- `assets/models/oopar-data.js` — mesh della lampada Oopar convertita da lampada.stp
  (OpenCASCADE, base64). La home non carica three.js né il modello.
- `assets/js/three.min.js` — three.js r128, locale.
- `data/progetti.json` — elenco dei lavori (fonte unica). `assets/js/indice.js` è GENERATO da lì:
  dopo una modifica a mano lancia `node tools/genera-indice.js`. Regole dei dati in `tools/schema.js`.
- `laboratorio/` — pagina delle app (variante B scelta il 1/11/2026). Elenco in `data/app.json`; i riquadri
  tra i segnaposto `app:inizio`/`app:fine` sono GENERATI (`node tools/genera-indice.js`). Ogni app è una
  pagina indipendente in `app/<slug>/index.html` e mostra una versione ridotta con `?mini=1`.
- `backend/` — pannello di gestione (Cloudflare Worker): accesso Google con elenco email, progetti,
  immagini, statistiche GoatCounter. Vedi `backend/README.md`; test con `cd backend && npm test`.

## Prestazioni dello scroll (problemi già risolti, non reintrodurli)
- Scroll mappato direttamente, niente molle sullo scroll; scroll-snap nativo CSS.
- Prima tutte le letture del DOM, poi le scritture; `setVar` scrive solo i valori cambiati.
- La molla `Spr` fa sub-stepping per non esplodere con dt grandi.

## Da fare
- Altre pagine progetto (oggi c'è solo Oopar; gli altri lavori portano all'indice).
- Render in alta risoluzione (le immagini attuali vengono dal PDF del portfolio, ~560 px).
- Texture noce vera da Vitrum al posto di quella procedurale.
- 3D più leggero su mobile.
- Vedi HANDOFF.md per l'elenco aggiornato.

## Portfolio PDF
- `portfolio.pdf` (variante A: A4 verticale, un progetto per pagina) si genera con
  `node tools/genera-portfolio.js` da data/progetti.json (campi facoltativi `descrizione` fino a 420 caratteri, `anno`, `scheda` con al massimo 6 voci)
  e, se esiste, da lavori/<slug>/progetto.json (scheda e immagine ambientata).
- Lo script si ferma senza scrivere il PDF se un blocco si sovrappone o esce dai margini; i titoli
  si riducono da soli per stare nella larghezza.
- La GitHub Action `.github/workflows/portfolio.yml` lo rigenera a ogni modifica dei progetti su main
  (e dopo ogni pubblicazione del pannello) e lo carica nel pannello.
- Il PDF è **privato** (scelta del 4/11/2026): non sta nel repo (è in `.gitignore`) né sul sito, e la home
  non lo linka più. Si scarica solo dal pannello, sezione Progetti, dopo l'accesso (`GET /api/portfolio`).
