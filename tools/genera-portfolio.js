#!/usr/bin/env node
/* Genera portfolio.pdf (variante A: A4 verticale, un progetto per pagina) da data/progetti.json.
   Uso: node tools/genera-portfolio.js [--html]   (serve Playwright con Chromium)
   --html scrive anche tools/portfolio-anteprima.html, utile per controllare a occhio.
   Prima di salvare controlla che nessun blocco si sovrapponga o esca dalla pagina:
   se succede si ferma con un errore e non scrive il PDF. */
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {controllaIndice}=require('./schema.js');
const R=path.join(__dirname,'..');
const url=p=>pathToFileURL(path.join(R,p)).href;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SITO='leandrohenriquez.com';
const ANNO=new Date().getFullYear();

const dati=JSON.parse(fs.readFileSync(path.join(R,'data/progetti.json'),'utf8'));
const err=controllaIndice(dati);
if(err.length){console.error('data/progetti.json non valido:\n- '+err.join('\n- '));process.exit(1);}
const lavori=dati.progetti.filter(p=>p.pubblicato);
const N=lavori.length,nn=i=>String(i+1).padStart(2,'0');

// Dati in più dalla pagina progetto, se esiste (lavori/<slug>/progetto.json).
function pagina(slug){
  const f=path.join(R,'lavori',slug,'progetto.json');
  if(!fs.existsSync(f))return null;
  try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){console.warn(`lavori/${slug}/progetto.json illeggibile, lo salto`);return null;}
}
const logo=fs.readFileSync(path.join(R,'favicon.svg'),'utf8').replace(/^<svg /,'<svg class="logo" aria-hidden="true" ');

function scheda(p,P){
  let v=Array.isArray(p.scheda)?p.scheda.map(x=>[x.voce,x.valore]):[];
  if(!v.length&&P&&P.scheda&&Array.isArray(P.scheda.voci))v=P.scheda.voci.slice(0,4).map(x=>[x.voce,[x.valore,x.unita].filter(Boolean).join(' ').trim()]);
  if(!v.length){v=[['tipo',p.tipo],['contesto',p.contesto]];if(p.anno)v.push(['anno',p.anno]);}
  return v.map(([k,b])=>`<div><i>${esc(k)}</i><b>${esc(b)}</b></div>`).join('');
}
function immagine(p,P){
  const amb=P&&P.immagini&&Array.isArray(P.immagini.voci)?P.immagini.voci.find(v=>!v.scontornata):null;
  if(amb&&!p.ritaglio&&!/\.png$/i.test(p.anteprima))return {src:amb.src,alt:amb.alt,taglio:'cover'};
  // senza sfondo: prima il ritaglio fatto per il PDF, poi l'anteprima se è già scontornata (PNG)
  const src=p.ritaglio||p.anteprima;
  return {src,alt:`${p.nome}, ${p.tipo}`,taglio:/\.(jpe?g)$/i.test(src)?'cover':'contain'};
}

// Profilo: gli stessi dati della sezione Studio del sito (index.html).
const PROFILO={testo:'Disegno oggetti che si usano bene: elettrodomestici, prodotti e packaging, dal primo schizzo al modello 3D.',
  voci:[['ruolo','Design Specialist'],['dove','Elica S.p.A.'],['dal','2022'],['base','Macerata'],['formazione','Firenze 109/110'],['ora','Magistrale'],['con','Bottega Ind. · Ganzo'],['strumenti','Rhino · Vitrum']]};
const pagine=[];
pagine.push(`<section class="pg cop">
 ${logo}
 <div class="nome"><div class="fit">Leandro</div><div class="fit">Henriquez</div></div>
 <div class="rule"></div>
 <div class="k"><span>industrial designer · macerata</span><span>portfolio ${ANNO}</span></div>
 <p class="desc lead">${esc(PROFILO.testo)}</p>
 <div class="spec quattro">${PROFILO.voci.map(([k,b])=>`<div><i>${k}</i><b>${esc(b)}</b></div>`).join('')}</div>
 <div class="k piede"><a href="https://${SITO}/">${SITO}</a><span>${N} progetti</span></div>
</section>`);
lavori.forEach((p,i)=>{
  const P=pagina(p.slug),img=immagine(p,P);
  const link=p.pagina?`${SITO}/lavori/${p.slug}/`:`${SITO}/#lavori`;
  pagine.push(`<section class="pg pro">
 <div class="k"><span>${nn(i)} / ${String(N).padStart(2,'0')}</span><span>${esc(p.tipo)}${p.anno?' · '+esc(p.anno):''}</span></div>
 <h2 class="fit">${esc(p.nome)}</h2>
 <figure class="${img.taglio}"><img src="${url(img.src)}" alt="${esc(img.alt)}"></figure>
 ${p.descrizione?`<p class="desc">${esc(p.descrizione)}</p>`:''}
 <div class="spec">${scheda(p,P)}</div>
 <div class="k piede"><span>Leandro Henriquez</span><a href="https://${link}">${esc(link.replace(/\/$/,''))}</a></div>
</section>`);
});
pagine.push(`<section class="pg con">
 <div class="k"><span>contatti</span><span>portfolio ${ANNO}</span></div>
 <h2 class="fit">Contatti</h2>
 <div class="spec uno">
  <div><i>email</i><b><a href="mailto:henriquez.leandro.a@gmail.com">henriquez.leandro.a@gmail.com</a></b></div>
  <div><i>sito</i><b><a href="https://${SITO}/">${SITO}</a></b></div>
  <div><i>linkedin</i><b><a href="https://www.linkedin.com/in/leandro-henriquez-57730515b/">leandro-henriquez</a></b></div>
  <div><i>instagram</i><b><a href="https://www.instagram.com/henriquez_leandro/">henriquez_leandro</a></b></div>
 </div>
 <div class="k piede"><span>design specialist · Elica S.p.A. dal 2022</span><span>${SITO}</span></div>
</section>`);

const html=`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Leandro Henriquez — portfolio ${ANNO}</title>
<style>
@font-face{font-family:Archivo;src:url(${url('assets/fonts/archivo-wdth-wght.woff2')}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:'Roboto Mono';src:url(${url('assets/fonts/roboto-mono-wght.woff2')}) format('woff2');font-weight:100 700}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#E9E6DF;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font:500 8pt/1.45 'Roboto Mono',monospace}
a{color:inherit;text-decoration:none}
.pg{width:210mm;height:297mm;padding:14mm;display:flex;flex-direction:column;overflow:hidden;break-after:page;background:#E9E6DF}
.pg:last-child{break-after:auto}
.k{display:flex;justify-content:space-between;gap:6mm;color:#5e5c57;flex:none}
.k>*:last-child{text-align:right}
.piede{margin-top:auto;padding-top:6mm}
.fit,.nome{font-family:Archivo,'Arial Narrow',sans-serif;text-transform:uppercase;font-variation-settings:"wdth" 62,"wght" 900;line-height:.84;white-space:nowrap;flex:none}
.rule{border-top:.6pt solid #111;flex:none}
.logo{width:16mm;height:auto;display:block;flex:none}
.cop .nome{margin-top:34mm;font-size:50mm}
.lead{font-size:11pt;max-width:160mm;margin-top:10mm}
.spec.quattro{grid-template-columns:repeat(4,1fr);margin-top:8mm}
.spec.quattro b{font-size:8mm}
.cop .rule{margin-top:8mm}.cop .rule+.k{margin-top:3mm}
.pro h2{font-size:54mm;margin-top:8mm}
figure{flex:1 1 0;min-height:60mm;margin-top:8mm;display:flex;align-items:center;justify-content:center;overflow:hidden}
figure img{display:block;width:100%;height:100%}
figure.cover img{object-fit:cover}
figure.contain img{object-fit:contain;padding:10mm}
.desc{margin-top:6mm;max-width:170mm;font-size:9.5pt;line-height:1.5;flex:none}
.spec{display:grid;grid-template-columns:1fr 1fr;column-gap:6mm;margin-top:6mm;flex:none}
.spec.uno{grid-template-columns:1fr}
.spec div{border-top:.5pt solid #b9b6ae;padding:2mm 0 3mm;min-width:0}
.spec i{font-style:normal;color:#5e5c57;display:block}
.spec b{display:block;font:400 9mm/.9 Archivo,'Arial Narrow',sans-serif;font-variation-settings:"wdth" 62,"wght" 800;text-transform:uppercase;margin-top:1mm;overflow-wrap:normal;hyphens:none}
.con h2{font-size:54mm;margin-top:8mm}
.con .spec{margin-top:14mm}
.con .spec b{font-size:11mm;text-transform:none}
</style></head><body>
${pagine.join('\n')}
<script>
// Riduce ogni titolo finché sta nella larghezza della pagina.
function adatta(){document.querySelectorAll('.fit,.spec b').forEach(el=>{
  let f=parseFloat(getComputedStyle(el).fontSize);
  while(el.scrollWidth>el.clientWidth&&f>8){f*=.97;el.style.fontSize=f+'px';}});}
// Cerca sovrapposizioni e blocchi fuori pagina. Restituisce l'elenco dei problemi.
function controlla(){const out=[],T=.6;
  document.querySelectorAll('.pg').forEach((pg,n)=>{
    const P=pg.getBoundingClientRect(),cs=getComputedStyle(pg),pad=parseFloat(cs.paddingLeft);
    const dentro={l:P.left+pad-T,r:P.right-pad+T,t:P.top+pad-T,b:P.bottom-pad+T};
    const figli=[...pg.children].filter(e=>e.tagName!=='SCRIPT');
    let prima=null;
    figli.forEach(e=>{const r=e.getBoundingClientRect(),nome=(e.className.baseVal??e.className)||e.tagName;
      if(r.left<dentro.l||r.right>dentro.r||r.top<dentro.t||r.bottom>dentro.b)out.push('pagina '+(n+1)+': "'+nome+'" esce dai margini');
      if(e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflow!=='hidden')out.push('pagina '+(n+1)+': il testo di "'+nome+'" è troppo largo');
      if(prima&&r.top<prima.r.bottom-T)out.push('pagina '+(n+1)+': "'+nome+'" si sovrappone a "'+prima.nome+'"');
      prima={r,nome};});
    pg.querySelectorAll('.spec div,.k>*').forEach(e=>{if(e.scrollWidth>e.clientWidth+1)out.push('pagina '+(n+1)+': testo troppo lungo in "'+e.textContent.trim().slice(0,30)+'"');});
    const k=[...pg.querySelectorAll('.k')];k.forEach(r=>{const [a,b]=r.children;if(a&&b&&a.getBoundingClientRect().right>b.getBoundingClientRect().left+T)out.push('pagina '+(n+1)+': le due etichette di una riga si toccano');});
    pg.querySelectorAll('figure').forEach(f=>{if(f.getBoundingClientRect().height<50*3.78)out.push('pagina '+(n+1)+': immagine troppo bassa, il testo è troppo lungo');});
  });return out;}
</script></body></html>`;

(async()=>{
  const {chromium}=require('playwright');
  const tmp=path.join(R,'tools','.portfolio.html');
  fs.writeFileSync(tmp,html);
  if(process.argv.includes('--html'))fs.copyFileSync(tmp,path.join(R,'tools','portfolio-anteprima.html'));
  const b=await chromium.launch();
  try{
    const pg=await b.newPage({viewport:{width:794,height:1123}});
    await pg.emulateMedia({media:'print'});
    await pg.goto(pathToFileURL(tmp).href,{waitUntil:'load'});
    await pg.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
    const rotte=await pg.evaluate(()=>[...document.images].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')));
    if(rotte.length)throw new Error('immagini mancanti:\n- '+rotte.join('\n- '));
    const font=await pg.evaluate(()=>document.fonts.check('900 20px Archivo')&&document.fonts.check('500 10px "Roboto Mono"'));
    if(!font)throw new Error('font del sito non caricati');
    await pg.evaluate(()=>adatta());
    const problemi=await pg.evaluate(()=>controlla());
    if(problemi.length)throw new Error('impaginato con problemi, PDF non scritto:\n- '+problemi.join('\n- '));
    const pdf=await pg.pdf({format:'A4',printBackground:true,preferCSSPageSize:true,tagged:true,outline:false});
    fs.writeFileSync(path.join(R,'portfolio.pdf'),pdf);
    console.log(`portfolio.pdf: ${N+2} pagine, ${(pdf.length/1048576).toFixed(1)} MB`);
  }finally{await b.close();fs.rmSync(tmp,{force:true});}
})().catch(e=>{console.error(e.message);process.exit(1);});
