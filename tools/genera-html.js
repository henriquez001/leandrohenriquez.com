// Copia i testi di lavori/<progetto>/progetto.json nell'index.html del progetto,
// così la pagina si legge anche senza JavaScript (Bing, anteprime social).
// Uso: node tools/genera-html.js lavori/oopar   (da rilanciare dopo ogni modifica al JSON)
const fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2];if(!dir){console.error('uso: node tools/genera-html.js lavori/<progetto>');process.exit(1);}
const root=path.join(__dirname,'..');
const D=JSON.parse(fs.readFileSync(path.join(root,dir,'progetto.json'),'utf8'));
let src=fs.readFileSync(path.join(root,'assets/js/progetto.js'),'utf8');
src=src.slice(0,src.lastIndexOf('(async function(){'));          // solo le funzioni, senza avvio
const slots={};const el=k=>({set innerHTML(v){slots[k]=v;}});
const fake={querySelector:s=>el(s)};
const ctx={BASE:'../../',console};vm.createContext(ctx);vm.runInContext(src+';renderProject(fake,D);',Object.assign(ctx,{fake,D}));
const file=path.join(root,dir,'index.html');let html=fs.readFileSync(file,'utf8');
const map={'#gBig':'gBig','.ui.tr':'tr','.tour':'tour','.content':'content'};
for(const [sel,name] of Object.entries(map)){
  const re=new RegExp(`<!--g:${name}-->[\\s\\S]*?<!--/g:${name}-->`);
  if(!re.test(html)){console.error('manca il segnaposto <!--g:'+name+'-->');process.exit(1);}
  html=html.replace(re,`<!--g:${name}-->${slots[sel]}<!--/g:${name}-->`);}
fs.writeFileSync(file,html);console.log('aggiornato',path.relative(root,file));
