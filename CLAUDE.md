# leandrohenriquez.com — note per chi ci lavora

Portfolio di Leandro Henriquez (industrial designer, design specialist in Elica dal 2022).
Sito statico senza build, pubblicato con GitHub Pages dal branch `main`, cartella radice.
Online su https://leandrohenriquez.com (dominio su Spaceship, DNS → GitHub Pages; file CNAME
nel repo, non cancellarlo). Lo stato del lavoro e i problemi aperti sono in HANDOFF.md.

## Preferenze del proprietario (vincolanti)
- Prima di ogni modifica visiva (layout, font, spaziature, menu, animazioni) si prepara
  un'anteprima con varianti affiancate e i valori esatti da cambiare. Non si applica nulla
  finché Leandro non sceglie la variante.
- Ogni cambio di stile va portato **INTEGRALMENTE** (regola di Leandro del 20/11/2026): struttura, estetica e
  comportamenti (griglia, tessere, viste, movimento) su TUTTE le pagine (home, 404, pagine progetto, Laboratorio,
  privacy, app) e sul pannello (backend/public). Mai solo ricolorare la vecchia impaginazione. Unica eccezione: /vitrum/.
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

## Stili grafici (scelta del 10/11/2026)
- Stile attivo **classico** (il sito com'era fino al 6/11). La variante D "Manifesto" è tenuta da parte e si attiva dal pannello:
  il pannello scrive `data/stile.json` (`{"stile":"classico"}` o `"manifesto"`), l'Action `stile.yml` lancia
  `node tools/applica-stile.js` e pubblica. A mano: `node tools/applica-stile.js manifesto`.
- Home e 404 cambiano del tutto: le versioni vere sono in `stili/<stile>/index.html` e `stili/<stile>/404.html`;
  quelle nella radice sono copie (si modificano in stili/, poi si applica lo stile).
- Laboratorio, privacy e pagine progetto hanno blocchi `<!--stile:<nome>-->…<!--/stile:<nome>-->` nel `<head>`:
  quello dello stile attivo è acceso, gli altri sono chiusi in un commento. Dentro un blocco niente "--".
- Ogni stile può avere pagine INTERE in `stili/<stile>/<percorso>` (index, 404, laboratorio/, privacy/, lavori/<p>/, app/<slug>/):
  `applica-stile.js` copia nella radice quella dello stile scelto, o quella di `stili/classico/` se lo stile non ce l'ha.
  Le parti generate (app:inizio/app:fine del Laboratorio, segnaposto g: delle pagine progetto) vengono riportate dalla radice
  a tutte le copie. Si modificano le pagine in stili/, mai le copie nella radice.
- Stile **showroom** (scelta del 19/11/2026, P3 «Showroom a colori», ATTIVO; online su tutte le pagine dal 20/11): codice in
  `assets/showroom/` (showroom.css + showroom.js home, pagine.css + viste.js + progetto.js altre pagine, colori.js).
  Due viste scelte dal menu in alto a destra: **Vetrina** (palco grande + striscia) e **Mosaico** (griglia 12 colonne); le tessere
  sono le stesse e si spostano con FLIP. Nelle pagine fisse ogni tessera dice colonne/righe con `--c/--r` (`--cv/--rv/--ov` in Vetrina,
  `--cm/--rm` sul telefono); il raggio degli angoli è `--raggio`. Home: progetti da `PROGETTI` + descrizione/anno da data/progetti.json.
  Pagina progetto showroom GENERATA dalla sezione `"showroom"` di progetto.json (intro, intero, capitoli con camera/punto/quote, foto,
  premio, prossimo) con `node tools/genera-html.js lavori/<p>`: scrive stili/showroom/lavori/<p>/index.html, poi `applica-stile.js`.
  Il Laboratorio showroom trasforma in tessere i riquadri generati (stesso markup del pannello) con un piccolo script.
  Colori: immagini SENZA filtri (niente mix-blend: Leandro 19/11 «lascia i colori originali»); fondo tessera = colore pieno scelto a
  mano in `assets/showroom/colori.js` (COLORI, SCURI = testo chiaro, FOTO_GRANDI = immagini più grandi); senza colore si calcola.
- Stile **bianco** (scelto da Leandro il 24/11/2026 dopo i giri 16–19 dell'anteprima; riferimento di gusto: elium.studio). Fondo bianco,
  prodotti scontornati, titoli grandi e leggeri (Outfit 400) e testo Figtree, caratteri sul sito stesso. Mappa NUOVA: home senza lavori
  (la frase + un solo oggetto), `/lavori/` (uno alla volta, filtri e puntini), una scheda per OGNI progetto in `/lavori/<slug>/`,
  `/studio/`, `/contatti/`, Laboratorio, privacy, 404, app. Effetti scelti: titoli parola per parola, scritta gigante, frasi che si
  accendono, cerchio «Apri» (M1) + ingresso col marchio, sipario nero col nome della pagina, immagini a tendina, firma «henriquez» (N4).
  Scartati: caratteri pesanti, blocchi di colore, metafore («trovate»), effetti timidi. Codice: `assets/bianco/bianco.css` + `bianco.js`.
  Le pagine in `stili/bianco/` sono GENERATE: `node tools/genera-bianco.js` (da data/progetti.json + data/bianco.json + data/app.json),
  poi `node tools/applica-stile.js`; lo fa anche l'Action `stile.yml` a ogni modifica dei dati. Non si modificano a mano.
  `data/bianco.json` (a mano, per slug): breve, testo, ruolo, esito, cliente, con, gruppo, categoria, colore, immagine, galleria.
  Il movimento sta tutto sotto `html.mv` (spento con «riduci movimento» e senza JavaScript). Pagine che esistono solo in bianco
  (lavori/, studio/, contatti/, schede) restano nella radice se si torna a un altro stile.
- Vitrum non cambia con lo stile. Il pannello ha la sua estetica (backend/public/tema.css).

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
  nell'HTML classico (tra i segnaposto `<!--g:...-->`, nella radice o in stili/classico/), rigenera la versione showroom,
  poi `node tools/applica-stile.js`.
- `assets/models/oopar-data.js` — mesh della lampada Oopar convertita da lampada.stp
  (OpenCASCADE, base64). La home non carica three.js né il modello.
- `assets/js/three.min.js` — three.js r128, locale.
- `data/progetti.json` — elenco dei lavori (fonte unica). `assets/js/indice.js` è GENERATO da lì:
  dopo una modifica a mano lancia `node tools/genera-indice.js`. Regole dei dati in `tools/schema.js`.
- `laboratorio/` — pagina delle app (variante B scelta il 1/11/2026). Elenco in `data/app.json`; i riquadri
  tra i segnaposto `app:inizio`/`app:fine` sono GENERATI (`node tools/genera-indice.js`). Ogni app è una
  pagina indipendente in `app/<slug>/index.html` e mostra una versione ridotta con `?mini=1`.
- Statistiche: GoatCounter (`leandrohenriquez.goatcounter.com`, senza cookie, citato in privacy). Lo script
  `count.js` è in ogni pagina pubblica tranne le app (si aprono anche dentro il Laboratorio); gli eventi
  passano da `conta()` in common.js: `email-copiata`, `apri-<progetto>`, `clic-linkedin`.
- `backend/` — pannello di gestione (Cloudflare Worker): accesso Google con elenco email, progetti,
  immagini, statistiche GoatCounter. Vedi `backend/README.md`; test con `cd backend && npm test`.
  Pannello in stile **showroom** con la stessa struttura del sito (regola del 20/11): barra con le sezioni, tessere, viste
  Vetrina (modifica sul palco) e Mosaico (foglio che nasce dalla tessera); account e notifiche nel menu del pulsante in alto a destra.
  Usa i file del sito `assets/showroom/{showroom.css,pagine.css,viste.js,colori.js}`, copiati in `backend/public/sito/showroom/`
  a ogni pubblicazione (`npm run tema`, non nel repo); `pannello.css` aggiunge solo moduli, interruttori e avvisi.
  `backend/public/tema.css` (stile D) non è più caricato.

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
- Portfolio **su misura** (variante 2 del 4/11): dal pannello si scelgono progetti e ordine e si dà un nome; il Worker
  avvia `portfolio.yml` (`workflow_dispatch` con `versione` e `progetti`), lo script legge `PROGETTI=slug,slug`.
  Restano le ultime 5 versioni più il completo; quando è pronto arriva una notifica.
- **Bozze** dei progetti (variante A del 4/11, bozza per progetto): "salva bozza" scrive solo nel KV del pannello,
  "pubblica" fa un commit; "anteprima ↗" apre `/anteprima/` sul pannello (il sito vero con l'indice rifatto dalle bozze).
  Interruttori e ordine sulle schede restano immediati.
