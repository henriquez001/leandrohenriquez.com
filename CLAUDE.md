# leandrohenriquez.com — note per chi ci lavora

Portfolio di Leandro Henriquez (industrial designer, design specialist in Elica dal 2022).
Sito statico senza build, pubblicato con GitHub Pages dal branch `main`, cartella radice.
Dominio previsto: leandrohenriquez.com (Spaceship). Finché non è collegato, l'indirizzo è
https://henriquez001.github.io/leandrohenriquez.com/

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

## Struttura
- `index.html` (home, `data-base=""`) e `lavori/<progetto>/index.html` (`data-base="../../"`).
  `common.js` legge `data-base` per costruire i percorsi delle immagini.
- `assets/js/common.js` — codice condiviso (molla Spr, helper, materiale noce procedurale,
  `makeRealLamp`, forme del modulo).
- `assets/js/home.js`, `assets/js/progetto.js` — logica delle pagine.
- `assets/models/oopar-data.js` — mesh della lampada Oopar convertita da lampada.stp
  (OpenCASCADE, base64). La home non carica three.js né il modello.
- `assets/js/three.min.js` — three.js r128, locale.

## Prestazioni dello scroll (problemi già risolti, non reintrodurli)
- Scroll mappato direttamente, niente molle sullo scroll; scroll-snap nativo CSS.
- Prima tutte le letture del DOM, poi le scritture; `setVar` scrive solo i valori cambiati.
- La molla `Spr` fa sub-stepping per non esplodere con dt grandi.

## Da fare
- Altre pagine progetto (oggi c'è solo Oopar; gli altri lavori portano all'indice).
- Render in alta risoluzione (le immagini attuali vengono dal PDF del portfolio, ~560 px).
- Texture noce vera da Vitrum al posto di quella procedurale.
- 3D più leggero su mobile.
- Collegare il dominio: record A 185.199.108.153 / .109.153 / .110.153 / .111.153,
  CNAME www → henriquez001.github.io, poi file CNAME e dominio in Settings → Pages.
  A quel punto i percorsi assoluti in 404.html (`/leandrohenriquez.com/...`) vanno portati a `/`.
