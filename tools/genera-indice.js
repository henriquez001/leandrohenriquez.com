#!/usr/bin/env node
/* Genera assets/js/indice.js da data/progetti.json.
   Uso: node tools/genera-indice.js   (il pannello lo fa da solo quando salvi) */
const fs=require('fs'),path=require('path');
const {controllaIndice,generaIndiceJS}=require('./schema.js');
const radice=path.join(__dirname,'..');
const dati=JSON.parse(fs.readFileSync(path.join(radice,'data/progetti.json'),'utf8'));
const errori=controllaIndice(dati);
if(errori.length){console.error('data/progetti.json non valido:\n- '+errori.join('\n- '));process.exit(1);}
const js=generaIndiceJS(dati);
const dest=path.join(radice,'assets/js/indice.js');
const prima=fs.existsSync(dest)?fs.readFileSync(dest,'utf8'):'';
if(prima!==js){fs.writeFileSync(dest,js);console.log('aggiornato assets/js/indice.js');}
else console.log('assets/js/indice.js già aggiornato');
