#!/usr/bin/env node
/* Genera TUTTE le pagine dello stile «bianco» in stili/bianco/ (home, Lavori, una scheda per progetto, Studio, Contatti,
   Laboratorio, privacy, 404, app). HTML fermo, con i testi dentro: si legge anche senza JavaScript.
   Uso: node tools/genera-bianco.js   poi   node tools/applica-stile.js
   Dati: data/progetti.json (elenco, ordine, nome, tipo, anteprima: lo scrive il pannello) + data/bianco.json (testi lunghi,
   ruolo, esito, colore: a mano) + data/app.json. Un campo che manca non viene mostrato: niente dati inventati.
   Le pagine le costruisce tools/bianco.js (lo stesso codice serve all'anteprima delle bozze nel pannello). Vitrum non si tocca. */
const fs=require('fs'),path=require('path');
const {generaBianco}=require('./bianco.js');
const R=path.join(__dirname,'..'),OUT=path.join(R,'stili/bianco');
const pagine=generaBianco(f=>JSON.parse(fs.readFileSync(path.join(R,f),'utf8')));
for(const [file,html] of pagine){
  const abs=path.join(OUT,file);fs.mkdirSync(path.dirname(abs),{recursive:true});
  if(!fs.existsSync(abs)||fs.readFileSync(abs,'utf8')!==html){fs.writeFileSync(abs,html);console.log('scritto stili/bianco/'+file);}
}
/* schede di progetti tolti dall'elenco: via anche la pagina */
const dirL=path.join(OUT,'lavori');
for(const d of fs.readdirSync(dirL)){const f=`lavori/${d}/index.html`;if(fs.statSync(path.join(dirL,d)).isDirectory()&&!pagine.has(f)){fs.rmSync(path.join(dirL,d),{recursive:true});console.log('tolto stili/bianco/'+f);}}
console.log(`stile «bianco»: ${pagine.size} pagine`);
