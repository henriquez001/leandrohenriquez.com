# Handoff — leandrohenriquez.com (1 novembre 2026)

Leggi prima CLAUDE.md: contiene le decisioni di design e le preferenze vincolanti di Leandro
(niente modifiche visive senza anteprima con varianti e la sua scelta; chiedere prima di
modificare il sito; dare sempre file completi, mai pezzi da sostituire).

## Stato
- Online su https://leandrohenriquez.com (GitHub Pages, branch `main`, root).
- DNS su Spaceship: 4 record A @ → 185.199.108–111.153, CNAME www → henriquez001.github.io.
  `www` reindirizza al dominio senza www.
- HTTPS: certificato in emissione da GitHub. Quando "Enforce HTTPS" in Settings → Pages
  diventa cliccabile va spuntato. Se resta grigio per ore: Remove del dominio e Save di nuovo.
- Pagine: home (`index.html`) e Oopar (`lavori/oopar/`). 404 personalizzata.

## Corretto in questo giro (commit "Correzioni dopo la messa online")
- Etichetta di sezione in basso a sinistra: tornava a "(00) home" negli spazi tra le sezioni.
- Tasto Indietro del browser dopo l'apertura di Oopar: la transizione a moduli restava
  sopra la pagina (bfcache). Ora si toglie su `pageshow`.
- Copia dell'email: senza HTTPS la Clipboard API non esiste e il clic non faceva nulla.
  Ora c'è un fallback (`execCommand`), e se anche quello fallisce apre `mailto:`.
- 404: percorsi portati alla radice del dominio.
- og:url / og:image sul dominio vero.

## Problemi aperti — VISIVI (servono anteprima e scelta di Leandro prima di toccarli)
1. **Header trasparente sopra il contenuto**: logo, "industrial designer / macerata, it" e
   menu restano fissi senza fondo; i titoli grandi (es. "OTTO.1", "DESIGN SPECIALIST")
   ci passano sotto e si sovrappongono. Opzioni da proporre: fondo carta pieno, fondo con
   sfumatura, header che si nasconde scorrendo in giù, margine di snap più alto.
2. **Etichetta "(0x) sezione" e orologio in basso** si sovrappongono alle ultime righe
   (es. "ANDY" sopra "(01) lavori"). Stesse opzioni del punto 1.
3. **Hover sulle righe dell'indice**: il nome si allarga (wdth/wght) e invade le colonne
   "tipo/contesto" (es. "HYDRA N…" sopra "case pc"). Va limitata la larghezza o ridotto
   l'allargamento.
4. **Righe dell'indice non cliccabili**: solo Oopar apre una pagina; le altre mostrano "→"
   ma non fanno nulla. Decidere: togliere la freccia finché non c'è la pagina, oppure
   creare le pagine.
5. **Mobile**: niente hover, quindi niente anteprima che segue il dito; da progettare
   (es. immagine sotto la riga al tap).

## Problemi aperti — tecnici
- Il 3D di Oopar è pesante: su GPU software va a ~2 fps. Su mobile serve una versione
  leggera (meno poligoni, niente clearcoat/MeshPhysical, pixelRatio 1).
- Le righe dell'indice sono `div`: non raggiungibili da tastiera. Meglio `<a>`/`<button>`.
- Immagini a bassa risoluzione (~560 px, prese dal PDF del portfolio).
- `assets/models/oopar-data.js` è ~1 MB di base64: valutare un `.glb` compresso (Draco/meshopt).

## Prossimo passo concordato
Pagine dei progetti. Leandro fornirà modelli 3D (STEP) e materiali per ciascuno.
Il modello di pagina è `lavori/oopar/` + `assets/js/progetto.js` (camera a tappe, parole
giganti, quote SVG, scheda, immagini, processo, prossimo progetto). Per convertire uno STEP:
OCP (OpenCASCADE) → `BRepMesh_IncrementalMesh(shape, 0.05, False, 0.06, True)` →
posizioni float32 + indici uint16 per parte, in base64 (vedi formato in oopar-data.js).
`progetto.js` è guidato da dati: ogni progetto ha il suo `progetto.json` (vedi CLAUDE.md).

## Come provare in locale
`python3 -m http.server` nella cartella del repo → http://localhost:8000
