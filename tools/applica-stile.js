#!/usr/bin/env node
/* Applica uno stile grafico a tutto il sito, per INTERO: struttura ed estetica (regola di Leandro del 20/11/2026).
   Uso: node tools/applica-stile.js [classico|manifesto|showroom]   (senza nome legge data/stile.json)
   Come funziona:
   - stili/<stile>/ contiene le pagine intere di quello stile, con lo stesso percorso che hanno nel sito
     (index.html, 404.html, laboratorio/index.html, privacy/index.html, lavori/<progetto>/index.html, app/<slug>/index.html).
     Ogni pagina che compare in uno stile qualsiasi viene copiata nella radice dalla cartella dello stile scelto;
     se quello stile non ce l'ha, si usa la versione di "classico".
   - Dentro le pagine, i blocchi <!--stile:<nome>-->…<!--/stile:<nome>--> accendono e spengono parti per stile
     (serve a "manifesto", che usa le pagine di "classico" con un altro foglio di stile). Un blocco spento è chiuso
     in un commento HTML. Dentro un blocco niente "--".
   - Le parti GENERATE (<!-- app:inizio -->…<!-- app:fine --> del Laboratorio, scritte anche dal pannello, e i
     segnaposto <!--g:nome-->…<!--/g:nome--> delle pagine progetto) vengono prima riportate dalla pagina nella radice
     a tutte le copie in stili/, così nessuno stile resta indietro.
   Si modificano le pagine in stili/<stile>/: quelle nella radice sono copie. Vitrum non cambia mai. */
const fs=require('fs'),path=require('path');
const R=path.join(__dirname,'..');
const nome=process.argv[2]||JSON.parse(fs.readFileSync(path.join(R,'data/stile.json'),'utf8')).stile;
const dirStili=path.join(R,'stili');
const STILI=fs.readdirSync(dirStili).filter(d=>fs.statSync(path.join(dirStili,d)).isDirectory());
if(!STILI.includes(nome)){console.error(`Stile "${nome}" sconosciuto. Disponibili: ${STILI.join(', ')}`);process.exit(1);}
const RIPIEGO='classico';
let cambiati=0;
const leggi=f=>fs.readFileSync(f,'utf8');
const scrivi=(abs,testo)=>{if(fs.existsSync(abs)&&leggi(abs)===testo)return;fs.mkdirSync(path.dirname(abs),{recursive:true});fs.writeFileSync(abs,testo);cambiati++;console.log('aggiornato',path.relative(R,abs));};
// tutte le pagine .html di uno stile, con il percorso relativo
function pagineDi(dir,base=''){let out=[];for(const n of fs.readdirSync(path.join(dir,base))){const rel=path.join(base,n),abs=path.join(dir,rel);
  if(fs.statSync(abs).isDirectory())out=out.concat(pagineDi(dir,rel));else if(n.endsWith('.html'))out.push(rel.split(path.sep).join('/'));}return out;}
const PAGINE=[...new Set(STILI.flatMap(s=>pagineDi(path.join(dirStili,s))))].sort();
// parti generate: dalla radice a tutte le copie
function regioni(html){const r=[];const a=html.match(/<!-- app:inizio[^>]*-->[\s\S]*?<!-- app:fine -->/);if(a)r.push(['app',a[0]]);
  for(const m of html.matchAll(/<!--g:([a-zA-Z]+)-->[\s\S]*?<!--\/g:\1-->/g))r.push(['g:'+m[1],m[0]]);return r;}
function riporta(html,reg){for(const [k,txt] of reg){if(k==='app')html=html.replace(/<!-- app:inizio[^>]*-->[\s\S]*?<!-- app:fine -->/,()=>txt);
  else{const n=k.slice(2);html=html.replace(new RegExp(`<!--g:${n}-->[\\s\\S]*?<!--\\/g:${n}-->`),()=>txt);}}
  // il numero delle app pubblicate, se la pagina lo mostra
  const nApp=(reg.find(r=>r[0]==='app')||[])[1];if(nApp){const n=(nApp.match(/<article/g)||[]).length;html=html.replace(/<span id="nApp">\d+<\/span>/,`<span id="nApp">${n}</span>`);}
  return html;}
const RX=/<!--stile:([a-z]+)-->([\s\S]*?)<!--\/stile:\1-->/g;
function blocchi(html,f){const presenti=[...html.matchAll(RX)].map(m=>m[1]);const acceso=presenti.includes(nome)?nome:RIPIEGO;
  return html.replace(RX,(m,s,dentro)=>{const nudo=dentro.replace(/^<!--/,'').replace(/-->$/,'');
    if(nudo.includes('--'))throw new Error(`${f}: il blocco "${s}" contiene "--", non si può chiudere in un commento`);
    return `<!--stile:${s}-->${s===acceso?nudo:'<!--'+nudo+'-->'}<!--/stile:${s}-->`;});}
for(const rel of PAGINE){
  const radice=path.join(R,rel);
  if(fs.existsSync(radice)){const reg=regioni(leggi(radice));
    if(reg.length)for(const s of STILI){const f=path.join(dirStili,s,rel);if(fs.existsSync(f))scrivi(f,riporta(leggi(f),reg));}}
  const src=[path.join(dirStili,nome,rel),path.join(dirStili,RIPIEGO,rel)].find(f=>fs.existsSync(f));
  if(!src){console.warn('nessuna versione di',rel,'per',nome);continue;}
  scrivi(radice,blocchi(leggi(src),rel));
}
console.log(`stile "${nome}" applicato (${cambiati} file cambiati)`);
