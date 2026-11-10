#!/usr/bin/env node
/* Applica uno stile grafico a tutto il sito (scelta di Leandro del 10/11/2026: stile "classico" attivo,
   "manifesto" (variante D) tenuto da parte e attivabile dal pannello).
   Uso: node tools/applica-stile.js [classico|manifesto]   (senza nome legge data/stile.json)
   Cosa fa:
   - copia stili/<stile>/index.html e stili/<stile>/404.html nella radice (le due pagine sono diverse da uno stile all'altro);
   - nelle altre pagine accende i blocchi <!--stile:<nome>-->…<!--/stile:<nome>--> dello stile scelto e spegne gli altri
     (un blocco spento è chiuso in un commento HTML, quindi il browser lo ignora).
   Le home e le 404 vere si modificano in stili/<stile>/: quelle nella radice sono copie. Vitrum non cambia mai. */
const fs=require('fs'),path=require('path');
const R=path.join(__dirname,'..');
const nome=process.argv[2]||JSON.parse(fs.readFileSync(path.join(R,'data/stile.json'),'utf8')).stile;
const STILI=fs.readdirSync(path.join(R,'stili')).filter(d=>fs.statSync(path.join(R,'stili',d)).isDirectory());
if(!STILI.includes(nome)){console.error(`Stile "${nome}" sconosciuto. Disponibili: ${STILI.join(', ')}`);process.exit(1);}
let cambiati=0;
const scrivi=(rel,testo)=>{const f=path.join(R,rel);if(fs.existsSync(f)&&fs.readFileSync(f,'utf8')===testo)return;fs.writeFileSync(f,testo);cambiati++;console.log('aggiornato',rel);};
for(const f of ['index.html','404.html'])scrivi(f,fs.readFileSync(path.join(R,'stili',nome,f),'utf8'));
// pagine con blocchi per stile
const pagine=['laboratorio/index.html','privacy/index.html',...fs.readdirSync(path.join(R,'lavori')).map(d=>`lavori/${d}/index.html`)].filter(f=>fs.existsSync(path.join(R,f)));
const RX=/<!--stile:([a-z]+)-->([\s\S]*?)<!--\/stile:\1-->/g;
for(const f of pagine){const prima=fs.readFileSync(path.join(R,f),'utf8');
  const dopo=prima.replace(RX,(m,s,dentro)=>{const nudo=dentro.replace(/^<!--/,'').replace(/-->$/,'');
    if(nudo.includes('--'))throw new Error(`${f}: il blocco "${s}" contiene "--", non si può chiudere in un commento`);
    return `<!--stile:${s}-->${s===nome?nudo:'<!--'+nudo+'-->'}<!--/stile:${s}-->`;});
  scrivi(f,dopo);}
console.log(`stile "${nome}" applicato (${cambiati} file cambiati)`);
