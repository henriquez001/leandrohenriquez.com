# Handoff — leandrohenriquez.com (4 novembre 2026)

Leggi prima CLAUDE.md: ci sono le decisioni di design e le preferenze vincolanti di Leandro.
In breve: niente modifiche visive senza un'anteprima con varianti affiancate e la sua scelta,
chiedere prima di pubblicare sul sito, dare sempre file completi.

## Stato
- Sito online su https://leandrohenriquez.com: GitHub Pages, branch `main`, cartella radice.
  HTTPS forzato dal 2/11. DNS su Spaceship: 4 record A @ → 185.199.108–111.153 e CNAME
  www → henriquez001.github.io.
- Pagine pubbliche:
  - home (`index.html`);
  - Oopar (`lavori/oopar/`, guidata da `progetto.json`);
  - Laboratorio (`laboratorio/` + `app/<slug>/`);
  - vetrina Vitrum (`vitrum/`, variante B "Camera oscura");
  - privacy (`privacy/`);
  - 404.
- Pannello di gestione (Cloudflare Worker in `backend/`): https://hl-pannello.henriquez-leandro-a.workers.dev
  - Accesso con Google, solo per le email nell'elenco. Il proprietario è `OWNER_EMAIL`.
  - Gestisce progetti, app, immagini, statistiche e accessi. Ogni salvataggio è un commit su main.
  - Si installa sul telefono (manifest e service worker) e manda notifiche push quando i
    controlli o il PDF falliscono. Su telefono ha una barra in basso con 4 icone e una pagina "tu".
  - Si pubblica da solo con `.github/workflows/pannello.yml`. Segreti e istruzioni in
    `backend/README.md`.
- Statistiche: GoatCounter (`leandrohenriquez.goatcounter.com`), senza cookie, su tutte le
  pagine pubbliche tranne le app. Eventi: `email-copiata`, `apri-<progetto>`, `clic-linkedin`.
- Portfolio PDF **privato** (scelta del 4/11): la Action `portfolio.yml` lo genera e lo carica
  nel pannello, che lo fa scaricare dalla sezione Progetti. Non è nel repo né sul sito.
- Actions:
  - `controlli.yml`: uptime ogni ora, link rotti, Lighthouse il lunedì;
  - `portfolio.yml`;
  - `pannello.yml`;
  - prove del pannello su ogni PR del backend.

  Tutte verdi al 4/11, con 29 prove del pannello che passano.

## Fatto dal 1/11 (era nell'elenco dei problemi aperti)
- Barre piene in alto e in basso su desktop e telefono: header ed etichette non finiscono
  più sopra i titoli.
- Telefono:
  - pulsante "menu" con foglio a tutto schermo;
  - indice guidato dallo scroll, con l'anteprima accanto alla riga;
  - nomi dei progetti a misura della riga;
  - nome in home "a misura".
- Righe dell'indice: quelle con pagina sono `<a>`; quelle senza sono attenuate, senza freccia
  e senza reazione al passaggio.
- Accessibilità:
  - link veri;
  - `h1` nascosto;
  - titoli di sezione;
  - focus da tastiera uguale all'hover;
  - link "vai ai lavori";
  - email come `mailto`, che il clic copia.
- Pagine progetto guidate da dati, con il testo copiato anche nell'HTML (`tools/genera-html.js`).
- Hydra NR_01: non più in vendita (contesto "prodotto · per Hydra").

## Aperti — servono materiali o decisioni di Leandro
1. **Pagine degli altri 9 progetti.** Priorità di Leandro (2/11): prima le pagine, la SEO alla fine.
   - Il primo è **ONE**: servono render e 3D in `SitoPersonale\ONE`.
   - In `SitoPersonale` c'è `modello 3d final.stp` (Rhino 8, 10 solidi, ~35×20×23 cm), ma è da
     confermare che sia ONE. Il video di ONE NON va sul sito.
   - I testi di partenza per tutti i progetti sono in `/mnt/project-files/progetti/testi-progetti.md`.
2. **Testi veri dei progetti nel portfolio PDF**: oggi solo Oopar è completo.
3. **Vitrum**:
   - indirizzo dell'installer (costante `SCARICA` in `vitrum/vitrum.js`);
   - conferma dei requisiti (Windows 10/11 64 bit, it/en, versione 0.1);
   - un link a `/vitrum/` dalla home, che è una modifica visiva e serve un'anteprima.
4. **Pacchetto SEO invisibile**, in attesa del via (piano: https://claude.ai/artifact/7SPeb8Pt261Zowghoh5mJR).
   Mancano `robots.txt`, `sitemap.xml`, canonical e JSON-LD. Poi va registrato il sito in
   Search Console.
5. **Vecchie versioni del portfolio PDF nella storia di git.** Il repo è pubblico, quindi le
   7 versioni salvate prima del 4/11 si scaricano ancora.
   - Si tolgono solo riscrivendo la storia del repo (`git filter-repo` + push forzato).
   - L'operazione è irreversibile e cambia gli hash di tutti i commit: farla solo con il via esplicito di Leandro.
6. Parcheggiati ("teniamolo da parte"): pubblicazioni social dal pannello (Instagram e LinkedIn).

## Aperti — tecnici
- 3D di Oopar pesante: su GPU software va a ~2 fps. Su telefono serve una versione leggera:
  meno poligoni, niente MeshPhysical/clearcoat, pixelRatio 1.
- `assets/models/oopar-data.js` è ~1 MB di base64: valutare un `.glb` compresso (Draco o meshopt).
- Immagini a bassa risoluzione: 560 px, prese dal PDF del portfolio. Per Oopar ci sono tavole a
  4000 px e render a 1920 px nella cartella di Leandro.
- Texture noce vera da Vitrum al posto di quella procedurale.

## Come aggiungere una pagina progetto
Copia `lavori/oopar/`, poi cambia le meta e `progetto.json`. Poi lancia
`node tools/genera-html.js lavori/<progetto>` e aggiorna `data/progetti.json`
(`node tools/genera-indice.js`).

Per convertire uno STEP: OCP (OpenCASCADE) → `BRepMesh_IncrementalMesh(shape, 0.05, False, 0.06, True)`
→ posizioni float32 + indici uint16 per parte, in base64 (formato in `oopar-data.js`).

## Come provare in locale
- Sito: `python3 -m http.server` nella cartella del repo → http://localhost:8000.
- Pannello: `cd backend && npm test`.
