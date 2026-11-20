// Pagine progetto generate da lavori/<progetto>/progetto.json. Uso: node tools/genera-html.js lavori/oopar
// (da rilanciare dopo ogni modifica al JSON)
// 1. Stile classico: copia i testi nei segnaposto <!--g:nome--> dell'index.html (radice e/o stili/classico/), così la
//    pagina si legge anche senza JavaScript (Bing, anteprime social). Si aggiornano tutte le copie che hanno i segnaposto.
// 2. Stile showroom: se il JSON ha la sezione "showroom", scrive per intero stili/showroom/lavori/<progetto>/index.html
//    (tessere, Vetrina/Mosaico, capitoli del 3D). Poi `node tools/applica-stile.js` porta nella radice lo stile attivo.
const fs=require('fs'),path=require('path'),vm=require('vm');
const dir=(process.argv[2]||'').replace(/\/+$/,'');if(!dir){console.error('uso: node tools/genera-html.js lavori/<progetto>');process.exit(1);}
const root=path.join(__dirname,'..');
const D=JSON.parse(fs.readFileSync(path.join(root,dir,'progetto.json'),'utf8'));
// --- 1. classico ---
let src=fs.readFileSync(path.join(root,'assets/js/progetto.js'),'utf8');
src=src.slice(0,src.lastIndexOf('(async function(){'));          // solo le funzioni, senza avvio
const slots={};const el=k=>({set innerHTML(v){slots[k]=v;}});
const fake={querySelector:s=>el(s)};
const ctx={BASE:'../../',console};vm.createContext(ctx);vm.runInContext(src+';renderProject(fake,D);',Object.assign(ctx,{fake,D}));
const map={'#gBig':'gBig','.ui.tr':'tr','.tour':'tour','.content':'content'};
const copie=[path.join(root,dir,'index.html'),...fs.readdirSync(path.join(root,'stili')).map(s=>path.join(root,'stili',s,dir,'index.html'))].filter(f=>fs.existsSync(f));
let fatte=0;
for(const file of copie){let html=fs.readFileSync(file,'utf8');
  if(!html.includes('<!--g:'))continue;
  for(const [sel,name] of Object.entries(map)){
    const re=new RegExp(`<!--g:${name}-->[\\s\\S]*?<!--/g:${name}-->`);
    if(!re.test(html)){console.error(path.relative(root,file)+': manca il segnaposto <!--g:'+name+'-->');process.exit(1);}
    html=html.replace(re,()=>`<!--g:${name}-->${slots[sel]}<!--/g:${name}-->`);}
  fs.writeFileSync(file,html);fatte++;console.log('aggiornato',path.relative(root,file));}
if(!fatte){console.error('nessuna copia classica con i segnaposto <!--g:…--> per '+dir);process.exit(1);}
// --- 2. showroom ---
const S=D.showroom;if(!S)process.exit(0);
const slug=path.basename(dir),B='../../';
const e=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const st=o=>Object.entries(o).map(([k,v])=>`--${k}:${v}`).join(';');
const tutti=JSON.parse(fs.readFileSync(path.join(root,'data/progetti.json'),'utf8')).progetti.filter(p=>p.pubblicato!==false);
const cam=c=>[c.yaw,c.pitch,c.dist].join(',');
// testa: meta presi dalla versione classica della pagina (stessi titolo, descrizione, og)
const classica=copie.map(f=>fs.readFileSync(f,'utf8')).find(h=>h.includes('<!--g:'));
const meta=classica.slice(0,classica.indexOf('</head>')).split('\n').filter(l=>/^<(title|meta name="description"|meta property|meta name="twitter|link rel="canonical")/.test(l)).join('\n');
const logo=fs.readFileSync(path.join(root,'stili/showroom/index.html'),'utf8').match(/<svg role="img" aria-label="hl\."[\s\S]*?<\/svg>/)[0];
const modello=D.modello&&D.modello.dati;
const t=[];
// intro
t.push(`  <section class="t carta intro-p" style="${st({c:4,r:4,cv:5,rv:6,ov:1,cm:2,rm:5})}"><div class="in">
    <div class="row"><span class="mono">${e(D.contatore)} · ${e(S.tipo)}</span><span class="mono hide-s">${e(S.anno)}</span></div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <h1>${e(D.titolo)}</h1>
      <p class="ds">${e(S.descrizione)}</p>
      ${(S.dati||[]).length?`<dl>${S.dati.map(([k,v])=>`<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join('')}</dl>`:''}
      <div class="acts"><a class="btn" href="${B}#lavori">← Tutti i lavori</a></div>
    </div>
  </div></section>`);
// palco: il 3D se c'è il modello, altrimenti la prima foto
const I=S.intero||{titolo:D.titolo,testo:'',camera:{yaw:35,pitch:15,dist:11.5}};
const f0=(S.foto||[])[0];
t.push(`  <section class="t palco${modello?'':' con-foto'}" id="palco" style="${st({c:8,r:6,cv:7,rv:6,ov:2,cm:2,rm:5})};--palco:${e(S.colore||'#C5C7C8')}" aria-label="${e(D.titolo)}${modello?' in 3D':''}" data-cam="${modello?cam(I.camera):''}" data-titolo="${e(I.titolo)}" data-testo="${e(I.testo)}">
    ${modello?'<canvas id="c" aria-hidden="true"></canvas><svg class="call" id="call" aria-hidden="true"></svg>\n    ':''}<img class="foto" id="palcoFoto" alt="${f0&&!modello?e(f0.alt):''}" src="${f0&&!modello?e(f0.src):'data:image/gif;base64,R0lGODlhAQABAAAAACw='}">
    <span class="ol" aria-hidden="true">${e(D.titolo)}</span>
    <div class="in">
      <div class="row"><span class="mono" id="palN">00 · intero</span><span class="mono hide-s" id="palD">${modello?'scorri o scegli un capitolo':'scegli un capitolo o una foto'}</span></div>
      <div class="cap" id="cap"><h2 id="capT">${e(I.titolo)}</h2><p id="capP">${e(I.testo)}</p></div>
    </div>
  </section>`);
// capitoli
(S.capitoli||[]).forEach((c,i)=>{const q=c.quote;
  const dati=modello?` data-cam="${cam(c.camera)}" data-guarda="${(c.guarda||[0,0,0]).join(',')}"${c.punto?` data-punto="${c.punto.join(',')}"`:''}${q?` data-quote="${[...q.larghezza,...q.altezza].join(',')}" data-qt="${e(q.testi.join('|'))}"`:''}`:'';
  t.push(`  <button class="t cap-t" type="button" data-k="${i+1}" data-n="${e(c.n)}" data-titolo="${e(c.titolo)}" data-testo="${e(c.testo)}"${c.foto?` data-foto="${e(c.foto)}"`:''}${dati} aria-pressed="false" style="${st({c:3,r:4,cv:3,rv:2,ov:3+i,cm:1,rm:3,cvm:1,rvm:2})}"><span class="in">
    <span class="row"><span class="mono">${e(c.n)}</span></span>${c.img?`<img class="sm" src="${e(c.img)}" alt="">`:''}
    <span class="tx-c"><h3>${e(c.titolo)}</h3><p class="hide-b">${e(c.breve||c.testo)}</p></span></span></button>`);});
// foto: misure a rotazione come nel prototipo
const MIS=[{c:8,r:5,cm:2,rm:4},{c:4,r:5,cm:1,rm:3},{c:6,r:4,cm:1,rm:3},{c:6,r:4,cm:2,rm:3}];
let ov=3+(S.capitoli||[]).length;
(S.foto||[]).forEach((f,i)=>{const m=MIS[i%4];
  t.push(`  <button class="t foto-t ft-t" type="button" data-foto="${e(f.src)}" data-nome="${e(f.nome)}"${f.nota?` data-nota="${e(f.nota)}"`:''} style="${st({...m,cv:3,rv:2,ov:ov++,cvm:1,rvm:2})}"><span class="in"><img class="fondo" src="${e(m.c>=8?f.src:(f.piccola||f.src))}" alt="${e(f.alt)}" loading="lazy"><span class="row"><span class="mono">${e(f.nome)}</span>${f.nota?`<span class="mono">${e(f.nota)}</span>`:''}</span><span></span></span></button>`);});
// misure dalla scheda (voci in mm)
((D.scheda&&D.scheda.voci)||[]).filter(v=>v.unita==='mm').slice(0,4).forEach(v=>{
  t.push(`  <div class="t stat" style="${st({c:2,r:2,cv:3,rv:2,ov:ov++,cm:1,rm:2})}"><div class="in"><span class="mono">${e(v.voce[0].toUpperCase()+v.voce.slice(1))}${/^Ø/.test(v.valore)?' Ø':''}</span><b>${e(String(v.valore).replace(/^Ø/,'').replace(/\s+/g,''))}<small>mm</small></b></div></div>`);});
if(S.premio)t.push(`  <section class="t carta premio" style="${st({c:6,r:3,ov:ov++,cm:2,rm:3})}"><div class="in">
    <div class="row"><span class="mono">Riconoscimento</span><span class="mono">${e(S.premio.anno)}</span></div>
    <div><h2>${e(S.premio.titolo)}</h2><p>${e(S.premio.testo)}</p></div></div></section>`);
// prossimo progetto (dall'elenco dei lavori)
const iP=tutti.findIndex(p=>p.slug===(S.prossimo&&S.prossimo.slug)),P=tutti[iP];
if(P){const href=P.pagina?`${B}lavori/${P.slug}/`:`${B}#lavori`,foto=!/\.png$/i.test(P.anteprima);
  t.push(`  <a class="t ${foto?'foto-t ':''}next" href="${href}" style="${st({c:6,r:3,ov:ov++,cm:2,rm:3})}"${foto?'':` data-prog="${e(P.slug)}"`}><span class="in">${foto?`<img class="fondo" src="${B}${e(P.anteprima)}" alt="" loading="lazy">`:''}<span class="row"><span class="mono">Prossimo · ${String(iP+1).padStart(2,'0')} / ${String(tutti.length).padStart(2,'0')}</span><span class="go" aria-hidden="true">→</span></span><span><h2>${e(P.nome)}</h2></span></span></a>`);}
const home=fs.readFileSync(path.join(root,'stili/showroom/index.html'),'utf8');
const cont=(home.match(/<section class="t cont"[\s\S]*?<\/section>/)||[''])[0].replace(/^<section class="t cont"/,`<section class="t cont" style="${st({c:12,r:3,ov:ov++,cm:2,rm:4})}"`);
if(cont)t.push('  '+cont);
const html=`<!doctype html>
<html lang="it" data-base="${B}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- GENERATO da ${dir}/progetto.json (sezione "showroom") con node tools/genera-html.js ${dir}: non modificare a mano -->
${meta}
<meta name="theme-color" content="#0D0D0D">
<link rel="icon" href="${B}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${B}assets/showroom/showroom.css">
<link rel="stylesheet" href="${B}assets/showroom/pagine.css">
<!-- statistiche senza cookie (vedi privacy): sul computer di sviluppo non conta nulla -->
<script data-goatcounter="https://leandrohenriquez.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</head>
<body>
<header class="top">
  <a class="logo" href="${B}" aria-label="Leandro Henriquez, home">${logo}</a>
  <nav class="nav" aria-label="principale"><a href="${B}#lavori">Lavori</a><a href="${B}#studio">Studio</a><a href="${B}laboratorio/">Laboratorio</a><a href="${B}vitrum/">Vitrum</a><a href="#contatti">Contatti</a></nav>
  <div class="seg" id="vista" role="group" aria-label="Vista della pagina" data-v="vetrina"><span class="pollice" aria-hidden="true"></span><button type="button" data-v="vetrina" aria-pressed="true">Vetrina</button><button type="button" data-v="mosaico" aria-pressed="false">Mosaico</button></div>
</header>
<main class="wrap">
<div class="board" id="board" data-v="vetrina" data-titolo="${e(D.titolo)}">
${t.join('\n')}
</div>
</main>
<footer><span>© 2026 Leandro Henriquez</span><a href="${B}privacy/">Privacy</a></footer>
<script src="${B}assets/showroom/colori.js"></script>
${modello?`<script src="${B}assets/js/three.min.js"></script>
<script src="${B}assets/js/common.js"></script>
<script src="${B}${e(modello)}"></script>
`:''}<script src="${B}assets/showroom/viste.js"></script>
<script src="${B}assets/showroom/progetto.js"></script>
</body>
</html>
`;
const out=path.join(root,'stili/showroom',dir,'index.html');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);console.log('scritto',path.relative(root,out));
