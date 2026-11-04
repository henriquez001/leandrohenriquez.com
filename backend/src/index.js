// Server del pannello di leandrohenriquez.com (Cloudflare Worker).
// Il sito pubblico resta statico su GitHub Pages: il pannello modifica i file del repo con commit firmati dal server.
import {GitHub,Errore,b64enc} from './github.js';
import {verificaGoogle,puoEntrare,creaSessione,chiudiSessione,leggiSessione,elencoAccessi,salvaAccessi,proprietario} from './auth.js';
import {statistiche} from './stats.js';
import {chiaveServer,iscrivi,disiscrivi,invia,verificaActions} from './push.js';
import schema from '../../tools/schema.js';
const {SLUG,controllaVoce,controllaIndice,controllaPagina,generaIndiceJS,controllaApp,controllaElencoApp,inserisciRiquadri}=schema;

const INDICE='data/progetti.json',INDICE_JS='assets/js/indice.js',APP='data/app.json',LAB='laboratorio/index.html';
const MAX_HTML=2*1024*1024;
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_IMG=8*1024*1024;
const MAX_PDF=20*1024*1024; // un valore KV arriva a 25 MB

const json=(dati,stato=200,extra={})=>new Response(JSON.stringify(dati),{status:stato,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
const corpo=async req=>{try{return await req.json();}catch{throw new Errore(400,'Richiesta non valida');}};

// Tipo d'immagine dai primi byte, non dal nome del file.
function tipoImmagine(by){
  const h=[...by.subarray(0,12)];
  if(h[0]===0x89&&h[1]===0x50&&h[2]===0x4e&&h[3]===0x47)return 'png';
  if(h[0]===0xff&&h[1]===0xd8&&h[2]===0xff)return 'jpg';
  if(String.fromCharCode(...h.slice(0,4))==='RIFF'&&String.fromCharCode(...h.slice(8,12))==='WEBP')return 'webp';
  if(String.fromCharCode(...h.slice(4,12))==='ftypavif')return 'avif';
  return null;
}

export function crea({fetchImpl}={}){
  const f=fetchImpl||((...a)=>fetch(...a));
  const rotte=[];
  const R=(metodo,schema_,fn,{libera=false,soloProprietario=false}={})=>rotte.push({metodo,re:new RegExp('^'+schema_.replace(/:(\w+)/g,'(?<$1>[^/]+)')+'$'),fn,libera,soloProprietario});

  // --- accesso ---
  R('GET','/api/config',async(req,env)=>json({googleClientId:env.GOOGLE_CLIENT_ID||null}),{libera:true});
  R('POST','/api/accesso',async(req,env)=>{
    const {credential}=await corpo(req);
    const email=await verificaGoogle(credential,env,f);
    if(!(await puoEntrare(env,email)))throw new Errore(403,`${email} non è nell'elenco degli accessi`);
    return json({email,proprietario:email===proprietario(env)},200,{'set-cookie':await creaSessione(env,email)});
  },{libera:true});
  R('POST','/api/uscita',async()=>json({ok:true},200,{'set-cookie':chiudiSessione}),{libera:true});
  R('GET','/api/io',async(req,env,s)=>json(s));

  // --- progetti ---
  R('GET','/api/progetti',async(req,env)=>{const gh=new GitHub(env,f);const base=await gh.testa();return json({base,...(await gh.leggiJSON(INDICE,base))});});
  R('PUT','/api/progetti',async(req,env,s)=>{ // salva l'indice intero (anche il nuovo ordine)
    const {base,progetti}=await corpo(req);const d={progetti};
    const err=controllaIndice(d);if(err.length)throw new Errore(422,err.join('; '));
    const gh=new GitHub(env,f);
    const sha=await gh.commit([{percorso:INDICE,testo:JSON.stringify(d,null,2)+'\n'},{percorso:INDICE_JS,testo:generaIndiceJS(d)}],'Pannello: indice dei progetti aggiornato',base,s.email);
    return json({base:sha});
  });
  R('POST','/api/progetti',async(req,env,s)=>{ // nuovo progetto in fondo all'indice, non pubblicato
    const {base,progetto}=await corpo(req);const p={pagina:false,pubblicato:false,...progetto};
    const err=controllaVoce(p);if(err.length)throw new Errore(422,err.join('; '));
    const gh=new GitHub(env,f);const d=await gh.leggiJSON(INDICE,base);
    if(d.progetti.some(x=>x.slug===p.slug))throw new Errore(409,`Esiste già un progetto "${p.slug}"`);
    d.progetti.push(p);
    const sha=await gh.commit([{percorso:INDICE,testo:JSON.stringify(d,null,2)+'\n'},{percorso:INDICE_JS,testo:generaIndiceJS(d)}],`Pannello: nuovo progetto ${p.nome}`,base,s.email);
    return json({base:sha,progetto:p},201);
  });
  R('DELETE','/api/progetti/:slug',async(req,env,s,{slug})=>{ // toglie dall'indice; i file restano nella storia del repo
    const base=new URL(req.url).searchParams.get('base');const gh=new GitHub(env,f);const d=await gh.leggiJSON(INDICE,base);
    const p=d.progetti.find(x=>x.slug===slug);if(!p)throw new Errore(404,'Progetto non trovato');
    d.progetti=d.progetti.filter(x=>x.slug!==slug);
    const sha=await gh.commit([{percorso:INDICE,testo:JSON.stringify(d,null,2)+'\n'},{percorso:INDICE_JS,testo:generaIndiceJS(d)}],`Pannello: tolto ${p.nome} dall'indice`,base,s.email);
    return json({base:sha});
  });
  // pagina del progetto (lavori/<slug>/progetto.json)
  R('GET','/api/progetti/:slug/pagina',async(req,env,s,{slug})=>{
    if(!SLUG.test(slug))throw new Errore(400,'Slug non valido');
    const gh=new GitHub(env,f);const base=await gh.testa();const D=await gh.leggiJSON(`lavori/${slug}/progetto.json`,base);
    if(!D)throw new Errore(404,'Questo progetto non ha ancora una pagina');return json({base,pagina:D});
  });
  R('PUT','/api/progetti/:slug/pagina',async(req,env,s,{slug})=>{
    if(!SLUG.test(slug))throw new Errore(400,'Slug non valido');
    const {base,pagina}=await corpo(req);const err=controllaPagina(pagina);if(err.length)throw new Errore(422,err.join('; '));
    const gh=new GitHub(env,f);
    if(!(await gh.leggi(`lavori/${slug}/index.html`,base)))throw new Errore(409,'La pagina HTML di questo progetto non esiste ancora');
    const sha=await gh.commit([{percorso:`lavori/${slug}/progetto.json`,testo:JSON.stringify(pagina,null,2)+'\n'}],`Pannello: pagina di ${pagina.titolo} aggiornata`,base,s.email);
    return json({base:sha});
  });
  // immagini: assets/img/<slug>/<nome>.<ext>
  R('POST','/api/progetti/:slug/immagini',async(req,env,s,{slug})=>{
    if(!SLUG.test(slug))throw new Errore(400,'Slug non valido');
    const {nome,base64,base}=await corpo(req);
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nome||''))throw new Errore(422,'Nome del file: solo minuscole, numeri e trattini');
    let by;try{by=Uint8Array.from(atob(base64||''),c=>c.charCodeAt(0));}catch{throw new Errore(422,'Immagine non leggibile');}
    if(by.length>MAX_IMG)throw new Errore(413,'Immagine troppo grande (massimo 8 MB)');
    const ext=tipoImmagine(by);if(!ext)throw new Errore(415,'Formati accettati: PNG, JPG, WebP, AVIF');
    const percorso=`assets/img/${slug}/${nome}.${ext}`;
    const sha=await new GitHub(env,f).commit([{percorso,base64:b64enc(by)}],`Pannello: immagine ${percorso}`,base,s.email);
    return json({base:sha,percorso},201);
  });


  // --- app del Laboratorio: elenco in data/app.json, riquadri in laboratorio/index.html, ogni app in app/<slug>/index.html ---
  async function salvaApp(gh,d,base,messaggio,autore,extra=[]){
    const html=await gh.leggi(LAB,base);if(html===null)throw new Errore(409,'Manca laboratorio/index.html');
    return gh.commit([{percorso:APP,testo:JSON.stringify(d,null,2)+'\n'},{percorso:LAB,testo:inserisciRiquadri(html,d)},...extra],messaggio,base,autore);
  }
  R('GET','/api/app',async(req,env)=>{const gh=new GitHub(env,f);const base=await gh.testa();return json({base,...(await gh.leggiJSON(APP,base))});});
  R('PUT','/api/app',async(req,env,s)=>{ // elenco intero: testi, ordine, stato, pubblicazione
    const {base,app}=await corpo(req);const d={app};const err=controllaElencoApp(d);if(err.length)throw new Errore(422,err.join('; '));
    const gh=new GitHub(env,f);
    for(const a of app.filter(x=>x.stato==='pronta'&&x.pubblicato))if(!(await gh.leggi(`app/${a.slug}/index.html`,base)))throw new Errore(409,`"${a.nome}" è segnata come pronta ma il file dell'app non c'è ancora`);
    return json({base:await salvaApp(gh,d,base,'Pannello: elenco delle app aggiornato',s.email)});
  });
  R('POST','/api/app',async(req,env,s)=>{ // nuova app, in fondo, "in arrivo" finché non carichi il file
    const {base,app}=await corpo(req);const a={stato:'in-arrivo',pubblicato:false,...app};
    const err=controllaApp(a);if(err.length)throw new Errore(422,err.join('; '));
    const gh=new GitHub(env,f);const d=await gh.leggiJSON(APP,base);
    if(d.app.some(x=>x.slug===a.slug))throw new Errore(409,`Esiste già un'app "${a.slug}"`);
    d.app.push(a);return json({base:await salvaApp(gh,d,base,`Pannello: nuova app ${a.nome}`,s.email),app:a},201);
  });
  R('PUT','/api/app/:slug/file',async(req,env,s,{slug})=>{ // carica o sostituisce il file HTML dell'app
    if(!SLUG.test(slug))throw new Errore(400,'Slug non valido');
    const {base,html}=await corpo(req);
    if(typeof html!=='string'||!/<html[\s>]/i.test(html))throw new Errore(422,'Serve una pagina HTML completa');
    if(new TextEncoder().encode(html).length>MAX_HTML)throw new Errore(413,'File troppo grande (massimo 2 MB)');
    const gh=new GitHub(env,f);const d=await gh.leggiJSON(APP,base);const a=d.app.find(x=>x.slug===slug);if(!a)throw new Errore(404,'App non trovata');
    a.stato='pronta';
    return json({base:await salvaApp(gh,d,base,`Pannello: file dell'app ${a.nome}`,s.email,[{percorso:`app/${slug}/index.html`,testo:html}])});
  });
  R('DELETE','/api/app/:slug',async(req,env,s,{slug})=>{ // toglie dall'elenco; il file resta nella storia del repo
    const base=new URL(req.url).searchParams.get('base');const gh=new GitHub(env,f);const d=await gh.leggiJSON(APP,base);
    const a=d.app.find(x=>x.slug===slug);if(!a)throw new Errore(404,'App non trovata');
    d.app=d.app.filter(x=>x.slug!==slug);
    return json({base:await salvaApp(gh,d,base,`Pannello: tolta l'app ${a.nome}`,s.email,[{percorso:`app/${slug}/index.html`,elimina:true}].filter(()=>a.stato==='pronta'))});
  });

  // --- statistiche ---
  R('GET','/api/statistiche',async(req,env)=>json(await statistiche(env,new URL(req.url).searchParams.get('giorni'),f)));

  // --- portfolio PDF: privato. Lo genera la Action "Portfolio PDF", lo scarica solo chi entra nel pannello ---
  R('GET','/api/portfolio/info',async(req,env)=>json(JSON.parse(await env.ACCESSI.get('portfolio-info')||'null')||{pronto:false}));
  R('GET','/api/portfolio',async(req,env)=>{
    const pdf=await env.ACCESSI.get('portfolio','arrayBuffer');if(!pdf)throw new Errore(404,'Il portfolio non è ancora stato generato');
    const info=JSON.parse(await env.ACCESSI.get('portfolio-info')||'{}');
    return new Response(pdf,{headers:{'content-type':'application/pdf','content-disposition':`attachment; filename="portfolio-leandro-henriquez-${String(info.aggiornato||'').slice(0,10)||'pdf'}.pdf"`,'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
  });
  R('PUT','/api/portfolio',async(req,env)=>{ // dalla Action, con il token OIDC di questo repo
    const a=await verificaActions((req.headers.get('authorization')||'').replace(/^Bearer\s+/i,''),env,f);
    const by=new Uint8Array(await req.arrayBuffer());
    if(by.length>MAX_PDF)throw new Errore(413,'PDF troppo grande (massimo 20 MB)');
    if(String.fromCharCode(...by.subarray(0,5))!=='%PDF-')throw new Errore(415,'Non è un PDF');
    const info={pronto:true,aggiornato:new Date().toISOString(),byte:by.length,commit:String(a.sha||'').slice(0,7)};
    await env.ACCESSI.put('portfolio',by);await env.ACCESSI.put('portfolio-info',JSON.stringify(info));
    return json(info);
  },{libera:true});

  // --- notifiche push: ognuno iscrive i propri dispositivi; gli avvisi del sito vanno al proprietario ---
  R('GET','/api/push',async(req,env)=>json({chiave:(await chiaveServer(env)).pub}));
  R('POST','/api/push',async(req,env,s)=>{const {iscrizione,dispositivo}=await corpo(req);await iscrivi(env,s.email,iscrizione,dispositivo);return json({ok:true},201);});
  R('DELETE','/api/push',async(req,env,s)=>{const {endpoint}=await corpo(req);await disiscrivi(env,s.email,endpoint);return json({ok:true});});
  R('POST','/api/push/prova',async(req,env,s)=>{
    const r=await invia(env,{titolo:'hl. · prova',testo:'Le notifiche del pannello arrivano su questo dispositivo.',url:'/'},{chi:x=>x.email===s.email,f});
    if(!r.inviate)throw new Errore(404,'Nessun dispositivo iscritto ha ricevuto la prova');return json(r);
  });
  // dalle GitHub Actions di questo repo (token OIDC con audience "hl-pannello")
  R('POST','/api/notifica',async(req,env)=>{
    await verificaActions((req.headers.get('authorization')||'').replace(/^Bearer\s+/i,''),env,f);
    const m=await corpo(req);return json(await invia(env,m,{chi:x=>x.email===proprietario(env),f}));
  },{libera:true});

  // --- accessi: solo il proprietario li vede e li cambia ---
  R('GET','/api/accessi',async(req,env)=>json({proprietario:proprietario(env),elenco:await elencoAccessi(env)}),{soloProprietario:true});
  R('POST','/api/accessi',async(req,env,s)=>{
    const {email,nota}=await corpo(req);const e=String(email||'').trim().toLowerCase();
    if(!EMAIL.test(e))throw new Errore(422,'Email non valida');
    const el=await elencoAccessi(env);if(el.some(a=>a.email===e)||e===proprietario(env))throw new Errore(409,'Email già presente');
    el.push({email:e,nota:String(nota||'').slice(0,80),aggiunta:new Date().toISOString().slice(0,10)});await salvaAccessi(env,el);
    return json({elenco:el},201);
  },{soloProprietario:true});
  R('DELETE','/api/accessi/:email',async(req,env,s,{email})=>{
    const e=decodeURIComponent(email).toLowerCase();const el=(await elencoAccessi(env)).filter(a=>a.email!==e);await salvaAccessi(env,el);return json({elenco:el});
  },{soloProprietario:true});

  return {async fetch(req,env){
    const url=new URL(req.url);
    if(!url.pathname.startsWith('/api/'))return env.ASSETS?env.ASSETS.fetch(req):new Response('Non trovato',{status:404});
    try{
      // contro richieste da altri siti: le modifiche devono arrivare dalla stessa origine e con l'intestazione del pannello
      if(req.method!=='GET'){
        const o=req.headers.get('origin');
        if((o&&o!==url.origin)||req.headers.get('x-pannello')!=='1')throw new Errore(403,'Richiesta non permessa');
      }
      for(const r of rotte){
        if(r.metodo!==req.method)continue;const m=url.pathname.match(r.re);if(!m)continue;
        let s=null;
        if(!r.libera){s=await leggiSessione(req,env);if(!s)throw new Errore(401,'Accedi di nuovo');}
        if(r.soloProprietario&&!s.proprietario)throw new Errore(403,'Solo il proprietario può gestire gli accessi');
        return await r.fn(req,env,s,m.groups||{});
      }
      throw new Errore(404,'Indirizzo sconosciuto');
    }catch(e){
      if(e instanceof Errore)return json({errore:e.message},e.stato);
      console.error(e);return json({errore:'Errore interno'},500);
    }
  }};
}
export default crea();
