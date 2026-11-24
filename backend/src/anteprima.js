// Anteprima delle bozze: le pagine vere del sito servite dal pannello (/anteprima/…), con l'indice rifatto
// dalle bozze. La vede solo chi è entrato nel pannello; niente statistiche, niente motori di ricerca.
import schema from '../../tools/schema.js';
import bianco from '../../tools/bianco.js';
const {generaIndiceJS}=schema,{generaBianco}=bianco;

export const SITO_PREDEFINITO='https://leandrohenriquez.com/';
const BARRA=`<a href="/#progetti" style="position:fixed;left:50%;bottom:calc(76px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483647;display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:999px;background:#2C2C2B;color:#fff;font:500 14px/1 Figtree,system-ui,sans-serif;text-decoration:none;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.18)">anteprima delle bozze · torna al pannello</a>`;

// Applica le bozze all'elenco: sostituisce i progetti esistenti, aggiunge in fondo quelli nuovi.
export function conBozze(progetti,bozze){
  const el=progetti.map(p=>bozze[p.slug]?{...bozze[p.slug].progetto,pagina:p.pagina}:p);
  for(const [slug,b] of Object.entries(bozze))if(!progetti.some(p=>p.slug===slug))el.push(b.progetto);
  return el;
}

// Stile «bianco»: le pagine sono HTML fermo generato dai dati, quindi l'anteprima le rigenera qui con le bozze dentro
// (stesso codice di tools/genera-bianco.js). I percorsi assoluti del sito (/assets/…, /lavori/…) passano da /anteprima/.
// Un progetto in bozza si vede anche se non è ancora pubblicato: l'anteprima serve a quello.
const dentro=html=>html.replace(/(\s(?:href|src|poster|action)=")\/(?!\/)/g,'$1/anteprima/');
async function pagineBianco(leggiJSON,progetti,bozze){
  const stile=await leggiJSON('data/stile.json').catch(()=>null);
  if(!stile||stile.stile!=='bianco')return null;
  const [extra,app]=await Promise.all([leggiJSON('data/bianco.json'),leggiJSON('data/app.json')]);
  if(!extra||!app)return null;
  const dati={'data/progetti.json':{progetti:progetti.map(p=>bozze[p.slug]?{...p,pubblicato:true}:p)},'data/bianco.json':extra,'data/app.json':app};
  return generaBianco(x=>dati[x]);
}

export async function anteprima(url,{env,f,leggiIndice,leggiJSON,bozze}){
  let rel=decodeURIComponent(url.pathname.slice('/anteprima/'.length));
  if(rel.split('/').some(x=>x==='..'||x==='.'))return new Response('Percorso non valido',{status:400});
  if(rel===''||rel.endsWith('/'))rel+='index.html';
  const h={'cache-control':'private, no-store','x-robots-tag':'noindex, nofollow'};
  if(rel==='assets/js/indice.js'){
    const d=await leggiIndice();
    return new Response(generaIndiceJS({progetti:conBozze(d.progetti,bozze)}),{headers:{...h,'content-type':'text/javascript; charset=utf-8'}});
  }
  const fine=html=>new Response(html.replace(/<script[^>]*goatcounter[^>]*>\s*<\/script>/gi,'')
    .replace(/<head([^>]*)>/i,'<head$1><meta name="robots" content="noindex, nofollow">')
    .replace(/<\/body>/i,BARRA+'</body>'),{headers:{...h,'content-type':'text/html; charset=utf-8'}});
  if(leggiJSON&&rel.endsWith('.html')){
    const d=await leggiIndice();
    const pagine=await pagineBianco(leggiJSON,conBozze(d.progetti,bozze),bozze);
    if(pagine&&pagine.has(rel))return fine(dentro(pagine.get(rel)));
  }
  const sito=(env.SITO_URL||SITO_PREDEFINITO).replace(/\/?$/,'/');
  const r=await f(sito+rel+url.search);
  const tipo=r.headers.get('content-type')||'';
  // nei fogli di stile del sito i caratteri hanno percorsi assoluti: anche quelli passano dall'anteprima
  if(r.ok&&/text\/css/.test(tipo))return new Response((await r.text()).replace(/url\((['"]?)\/(?!\/)/g,'url($1/anteprima/'),{headers:{...h,'content-type':tipo}});
  if(!r.ok||!/text\/html/.test(tipo))return new Response(r.body,{status:r.status,headers:{...h,'content-type':tipo||'application/octet-stream'}});
  let html=await r.text();
  html=html.replace(/<script[^>]*goatcounter[^>]*>\s*<\/script>/gi,'')
    .replace(/<head([^>]*)>/i,'<head$1><meta name="robots" content="noindex, nofollow">')
    .replace(/<\/body>/i,BARRA+'</body>');
  return new Response(html,{status:r.status,headers:{...h,'content-type':'text/html; charset=utf-8'}});
}
