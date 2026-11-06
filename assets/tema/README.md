# Tema del sito (estetica)

Tutto l'aspetto della home sta in questa cartella. Il resto del sito non va toccato per cambiare stile.

- `tema.css` — solo variabili su `:root`: colori, caratteri, pesi, spessori, angoli dei titoli,
  parallasse, retino, fuori registro, durate. Niente selettori, niente `url()`.
  Il pannello (backend) copia questo file e usa le stesse variabili.
- `caratteri.css` — le dichiarazioni `@font-face` (file in `assets/fonts/`, licenze OFL accanto).

Cosa NON è tema (e quindi resta com'è anche cambiando estetica):
- `assets/css/manifesto.css` — struttura e posizioni, legge solo variabili del tema.
- `assets/js/manifesto.js` — comportamento; legge dal tema `--angoli` e `--angoli-telefono`; `--parallasse` lo usa manifesto.css (animation-timeline).
- `data/progetti.json` e `assets/js/indice.js` (generato) — i dati, gestiti dal pannello.

Esempi: per i titoli dritti `--angoli:0`; per fermare gli strati `--parallasse:0`;
per un altro carattere aggiungere il file in `caratteri.css` e cambiare `--font-titoli`.
