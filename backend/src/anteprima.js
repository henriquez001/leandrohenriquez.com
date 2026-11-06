// Anteprima delle bozze: le pagine vere del sito servite dal pannello (/anteprima/…), con l'indice rifatto
// dalle bozze. La vede solo chi è entrato nel pannello; niente statistiche, niente motori di ricerca.
import schema from '../../tools/schema.js';
const {generaIndiceJS}=schema;

export const SITO_PREDEFINITO='https://leandrohenriquez.com/';
const BARRA=`<a href="/#progetti" style="position:fixed;left:50%;bottom:calc(76px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483647;display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:999px;background:#111;color:#E9E6DF;font:500 12px/1 'Roboto Mono',ui-monospace,monospace;text-decoration:none;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.18)">anteprima delle bozze · torna al pannello</a>`;

// Applica le bozze all'elenco: sostituisce i progetti esistenti, aggiunge in fondo quelli nuovi.
export function conBozze(progetti,bozze){
  const el=progetti.map(p=>bozze[p.slug]?{...bozze[p.slug].progetto,pagina:p.pagina}:p);
  for(const [slug,b] of Object.entries(bozze))if(!progetti.some(p=>p.slug===slug))el.push(b.progetto);
  return el;
}

export async function anteprima(url,{env,f,leggiIndice,bozze}){
  let rel=decodeURIComponent(url.pathname.slice('/anteprima/'.length));
  if(rel.split('/').some(x=>x==='..'||x==='.'))return new Response('Percorso non valido',{status:400});
  if(rel===''||rel.endsWith('/'))rel+='index.html';
  const h={'cache-control':'private, no-store','x-robots-tag':'noindex, nofollow'};
  if(rel==='assets/js/indice.js'){
    const d=await leggiIndice();
    return new Response(generaIndiceJS({progetti:conBozze(d.progetti,bozze)}),{headers:{...h,'content-type':'text/javascript; charset=utf-8'}});
  }
  const sito=(env.SITO_URL||SITO_PREDEFINITO).replace(/\/?$/,'/');
  const r=await f(sito+rel+url.search);
  const tipo=r.headers.get('content-type')||'';
  if(!r.ok||!/text\/html/.test(tipo))return new Response(r.body,{status:r.status,headers:{...h,'content-type':tipo||'application/octet-stream'}});
  let html=await r.text();
  html=html.replace(/<script[^>]*goatcounter[^>]*>\s*<\/script>/gi,'')
    .replace(/<head([^>]*)>/i,'<head$1><meta name="robots" content="noindex, nofollow">')
    .replace(/<\/body>/i,BARRA+'</body>');
  return new Response(html,{status:r.status,headers:{...h,'content-type':'text/html; charset=utf-8'}});
}
