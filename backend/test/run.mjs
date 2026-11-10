// Test del server con GitHub, Google e GoatCounter simulati. Uso: npm test
import {crea} from '../src/index.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const OWNER='proprietario@example.com',CLIENT='test-client.apps.googleusercontent.com';
// --- Google finto: chiave RSA nostra, JWKS servito dal fetch finto ---
const kp=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...(await crypto.subtle.exportKey('jwk',kp.publicKey)),kid:'k1',alg:'RS256',use:'sig'};
const b64u=b=>Buffer.from(b).toString('base64url');
async function tokenGoogle(email,{aud=CLIENT,exp=Date.now()/1000+600,verified=true,chiave=kp.privateKey}={}){
  const h=b64u(JSON.stringify({alg:'RS256',kid:'k1',typ:'JWT'})),c=b64u(JSON.stringify({iss:'https://accounts.google.com',aud,email,email_verified:verified,exp}));
  return `${h}.${c}.${b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',chiave,new TextEncoder().encode(h+'.'+c)))}`;
}
// --- GitHub finto: repo in memoria con commit e ref ---
const files=new Map([['data/progetti.json',readFileSync(new URL('../../data/progetti.json',import.meta.url),'utf8')],['lavori/oopar/index.html','<html></html>'],['data/app.json',readFileSync(new URL('../../data/app.json',import.meta.url),'utf8')],['laboratorio/index.html',readFileSync(new URL('../../laboratorio/index.html',import.meta.url),'utf8')],['app/peso-cane/index.html','<html></html>'],['data/stile.json','{ "stile": "classico" }\n'],['stili/classico/index.html','<html></html>'],['stili/manifesto/index.html','<html></html>'],['lavori/oopar/progetto.json',JSON.stringify({titolo:'Oopar',tappe:[{camera:{},parola:{testo:'Oopar'}}]})]]);
let commits={c0:{tree:'t0',files:new Map(files)}},head='c0',n=0;const blobs={},trees={};
const R=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}});
let chiamateGC=[],chiamateSito=[],avvii=[],permessoActions=false;
// --- notifiche: chiave VAPID del server, telefono finto (chiavi ECDH + auth) e GitHub Actions finto (OIDC) ---
const vapid=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const vapidPub=b64u(new Uint8Array(await crypto.subtle.exportKey('raw',vapid.publicKey)));
const ua=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
const uaPub=new Uint8Array(await crypto.subtle.exportKey('raw',ua.publicKey)),authUA=crypto.getRandomValues(new Uint8Array(16));
const EP='https://fcm.googleapis.com/fcm/send/telefono-1';let ricevuti=[],rispostaPush=201;
const hk=async(salt,ikm,info,n)=>new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']),n*8));
async function decifra(by){ // come fa il browser che riceve (RFC 8291)
  const te=new TextEncoder(),cat=(...a)=>new Uint8Array(Buffer.concat(a.map(x=>Buffer.from(x))));
  const sale=by.slice(0,16),idlen=by[20],asPub=by.slice(21,21+idlen),dati=by.slice(21+idlen);
  const as=await crypto.subtle.importKey('raw',asPub,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const cond=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:as},ua.privateKey,256));
  const ikm=await hk(authUA,cond,cat(te.encode('WebPush: info\0'),uaPub,asPub),32);
  const cek=await hk(sale,ikm,te.encode('Content-Encoding: aes128gcm\0'),16),nonce=await hk(sale,ikm,te.encode('Content-Encoding: nonce\0'),12);
  const chiaro=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce},await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['decrypt']),dati));
  assert.equal(chiaro.at(-1),2,'delimitatore dell\'ultimo record');return JSON.parse(new TextDecoder().decode(chiaro.slice(0,-1)));
}
async function servizioPush(url,opt){
  const v=/^vapid t=([^,]+), k=(.+)$/.exec(opt.headers.authorization);assert.ok(v,'intestazione VAPID');assert.equal(v[2],vapidPub);
  const [h,c,s]=v[1].split('.');assert.equal(JSON.parse(Buffer.from(c,'base64url')).aud,'https://fcm.googleapis.com');
  assert.ok(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},vapid.publicKey,Buffer.from(s,'base64url'),new TextEncoder().encode(h+'.'+c)),'firma VAPID');
  assert.equal(opt.headers['content-encoding'],'aes128gcm');
  ricevuti.push(await decifra(new Uint8Array(opt.body)));return new Response(null,{status:rispostaPush});
}
const kpGH=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwkGH={...(await crypto.subtle.exportKey('jwk',kpGH.publicKey)),kid:'g1',alg:'RS256',use:'sig'};
async function tokenActions({repository='o/r',aud='hl-pannello'}={}){
  const h=b64u(JSON.stringify({alg:'RS256',kid:'g1',typ:'JWT'})),c=b64u(JSON.stringify({iss:'https://token.actions.githubusercontent.com',aud,repository,exp:Date.now()/1000+300}));
  return `${h}.${c}.${b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',kpGH.privateKey,new TextEncoder().encode(h+'.'+c)))}`;
}
async function finto(url,opt={}){
  url=String(url);
  if(url.startsWith('https://fcm.googleapis.com/'))return servizioPush(url,opt);
  if(url==='https://token.actions.githubusercontent.com/.well-known/jwks')return R({keys:[jwkGH]});
  const m=opt.method||'GET',b=opt.body?JSON.parse(opt.body):null;
  if(url==='https://www.googleapis.com/oauth2/v3/certs')return R({keys:[jwk]});
  if(url.includes('goatcounter.com')){chiamateGC.push(url);assert.equal(opt.headers.authorization,'Bearer gc-segreto');
    if(url.includes('stats/total'))return R({total:459,total_unique:330,stats:[{day:'2026-10-31',daily:12}]});
    if(url.includes('stats/hits'))return R({hits:[{path:'/',title:'Home',count:312,event:false,stats:[]},{path:'apri-oopar',count:58,event:true,stats:[]}]});
    if(url.includes('stats/toprefs'))return R({stats:[{name:'linkedin.com',count:118},{name:'',count:212}]});
    return R({stats:[{name:'phone',count:41}]});}
  if(url.startsWith('https://leandrohenriquez.com/')){chiamateSito.push(url);const pth=url.slice(29).split('?')[0];
    if(pth.endsWith('.html'))return new Response('<!doctype html><html><head><meta charset="utf-8"><script data-goatcounter="https://x.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script></head><body><main>home</main></body></html>',{headers:{'content-type':'text/html; charset=utf-8'}});
    if(pth==='assets/css/home.css')return new Response('body{}',{headers:{'content-type':'text/css'}});
    return new Response('no',{status:404,headers:{'content-type':'text/plain'}});}
  if(url==='https://api.github.com/repos/o/r/actions/workflows/portfolio.yml/dispatches'){if(!permessoActions)return R({message:'Resource not accessible by personal access token'},403);avvii.push(JSON.parse(opt.body));return new Response(null,{status:204});}
  assert.ok(url.startsWith('https://api.github.com/repos/o/r/'),url);assert.equal(opt.headers.authorization,'Bearer gh-segreto');
  const p=url.slice('https://api.github.com/repos/o/r/'.length);
  if(m==='GET'&&p==='git/ref/heads/main')return R({object:{sha:head}});
  if(m==='GET'&&p.startsWith('contents/')){const [fp,q]=p.slice(9).split('?ref=');const c=commits[q==='main'?head:q];const t=c&&c.files.get(decodeURI(fp));
    if(t===undefined&&c){const dir=decodeURI(fp)+'/';const sotto=[...new Set([...c.files.keys()].filter(k=>k.startsWith(dir)).map(k=>k.slice(dir.length).split('/')[0]))];
      if(sotto.length)return R(sotto.map(x=>({name:x,type:[...c.files.keys()].some(k=>k.startsWith(dir+x+'/'))?'dir':'file'})));}
    return t===undefined?R({},404):R({content:Buffer.from(t,'latin1'===0?'':'utf8').toString('base64'),sha:'x'});}
  if(m==='GET'&&p.startsWith('git/commits/'))return R({tree:{sha:'t-'+p.slice(12)}});
  if(m==='POST'&&p==='git/blobs'){const id='b'+(++n);blobs[id]=b.encoding==='base64'?Buffer.from(b.content,'base64').toString('utf8'):b.content;return R({sha:id},201);}
  if(m==='POST'&&p==='git/trees'){const id='t'+(++n);trees[id]={base:b.base_tree.slice(2),tree:b.tree};return R({sha:id},201);}
  if(m==='POST'&&p==='git/commits'){const id='c'+(++n),t=trees[b.tree],fs=new Map(commits[b.parents[0]].files);t.tree.forEach(x=>x.sha===null?fs.delete(x.path):fs.set(x.path,blobs[x.sha]));commits[id]={files:fs,parent:b.parents[0],msg:b.message};return R({sha:id},201);}
  if(m==='PATCH'&&p==='git/refs/heads/main'){if(commits[b.sha].parent!==head)return R({message:'not fast forward'},422);head=b.sha;return R({});}
  throw new Error('chiamata non prevista '+m+' '+p);
}
const kv=new Map();
const env={GITHUB_REPO:'o/r',GITHUB_TOKEN:'gh-segreto',OWNER_EMAIL:OWNER,SESSION_SECRET:'s'.repeat(40),GOOGLE_CLIENT_ID:CLIENT,GOATCOUNTER_CODE:'demo',GOATCOUNTER_TOKEN:'gc-segreto',
  VAPID_JWK:JSON.stringify(await crypto.subtle.exportKey('jwk',vapid.privateKey)),
  ACCESSI:{get:async(k,t)=>{const v=kv.get(k)??null;return v!==null&&t==='arrayBuffer'&&typeof v!=='string'?v.buffer.slice(v.byteOffset,v.byteOffset+v.byteLength):v;},put:async(k,v)=>{kv.set(k,v);},delete:async k=>{kv.delete(k);}}};
const app=crea({fetchImpl:finto});
const O='https://pannello.test';
async function chiama(metodo,percorso,{corpo,cookie,intest={}}={}){
  const h={'x-pannello':'1',origin:O,...intest};if(cookie)h.cookie=cookie;if(corpo)h['content-type']='application/json';
  const r=await app.fetch(new Request(O+percorso,{method:metodo,headers:h,body:corpo?JSON.stringify(corpo):undefined}),env);
  return {stato:r.status,dati:await r.json(),cookie:(r.headers.get('set-cookie')||'').split(';')[0]};
}
let ok=0;const prova=async(nome,fn)=>{await fn();ok++;console.log('✓',nome);};

await prova('senza accesso le API rispondono 401',async()=>{assert.equal((await chiama('GET','/api/progetti')).stato,401);});
await prova('token Google per un\'altra app rifiutato',async()=>{const r=await chiama('POST','/api/accesso',{corpo:{credential:await tokenGoogle(OWNER,{aud:'altro'})}});assert.equal(r.stato,401);});
await prova('token Google scaduto rifiutato',async()=>{const r=await chiama('POST','/api/accesso',{corpo:{credential:await tokenGoogle(OWNER,{exp:1})}});assert.equal(r.stato,401);});
await prova('token firmato da un\'altra chiave rifiutato',async()=>{const k2=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign']);
  assert.equal((await chiama('POST','/api/accesso',{corpo:{credential:await tokenGoogle(OWNER,{chiave:k2.privateKey})}})).stato,401);});
await prova('email Google non nell\'elenco: 403',async()=>{const r=await chiama('POST','/api/accesso',{corpo:{credential:await tokenGoogle('estraneo@gmail.com')}});assert.equal(r.stato,403);});
let cProp;
await prova('il proprietario entra sempre',async()=>{const r=await chiama('POST','/api/accesso',{corpo:{credential:await tokenGoogle(OWNER)}});assert.equal(r.stato,200);assert.equal(r.dati.proprietario,true);cProp=r.cookie;assert.match(cProp,/^hl_sessione=/);});
await prova('cookie manomesso rifiutato',async()=>{assert.equal((await chiama('GET','/api/io',{cookie:cProp.slice(0,-3)+'AAA'})).stato,401);});
await prova('richiesta da un altro sito bloccata',async()=>{assert.equal((await chiama('POST','/api/accessi',{cookie:cProp,corpo:{email:'a@b.it'},intest:{origin:'https://cattivo.example'}})).stato,403);});
let cOspite;
await prova('il proprietario aggiunge un\'email e quella persona entra',async()=>{
  assert.equal((await chiama('POST','/api/accessi',{cookie:cProp,corpo:{email:'Collaboratore@Gmail.com',nota:'test'}})).stato,201);
  const r=await chiama('POST','/api/accesso',{corpo:{credential:await tokenGoogle('collaboratore@gmail.com')}});assert.equal(r.stato,200);assert.equal(r.dati.proprietario,false);cOspite=r.cookie;});
await prova('chi non è proprietario non vede né cambia gli accessi',async()=>{assert.equal((await chiama('GET','/api/accessi',{cookie:cOspite})).stato,403);assert.equal((await chiama('POST','/api/accessi',{cookie:cOspite,corpo:{email:'x@y.it'}})).stato,403);});
await prova('togliendo l\'email la sessione aperta smette di valere',async()=>{
  assert.equal((await chiama('DELETE','/api/accessi/collaboratore%40gmail.com',{cookie:cProp})).stato,200);assert.equal((await chiama('GET','/api/io',{cookie:cOspite})).stato,401);});
let base;
await prova('legge l\'indice dei progetti',async()=>{const r=await chiama('GET','/api/progetti',{cookie:cProp});assert.equal(r.stato,200);assert.equal(r.dati.progetti.length,10);base=r.dati.base;});
await prova('nuovo progetto: un commit con indice e indice.js',async()=>{
  const r=await chiama('POST','/api/progetti',{cookie:cProp,corpo:{base,progetto:{slug:'nuova-lampada',nome:'Nuova',tipo:'lampada',contesto:'prova',anteprima:'assets/img/oopar.jpg'}}});
  assert.equal(r.stato,201,JSON.stringify(r.dati));const fs=commits[head].files;assert.match(fs.get('data/progetti.json'),/nuova-lampada/);
  assert.doesNotMatch(fs.get('assets/js/indice.js'),/nuova-lampada/,'non pubblicato: non va in home');base=r.dati.base;});
await prova('dati non validi rifiutati con spiegazione',async()=>{const r=await chiama('POST','/api/progetti',{cookie:cProp,corpo:{base,progetto:{slug:'Spazi Vietati',nome:'',tipo:'x',contesto:'y',anteprima:'../segreto.png'}}});assert.equal(r.stato,422);assert.match(r.dati.errore,/slug non valido/);});
await prova('salvataggio su una versione vecchia rifiutato (niente sovrascritture)',async()=>{
  const r=await chiama('GET','/api/progetti',{cookie:cProp});const vecchia='c0';
  const s=await chiama('PUT','/api/progetti',{cookie:cProp,corpo:{base:vecchia,progetti:r.dati.progetti}});assert.equal(s.stato,409);});
await prova('pubblica e riordina: indice.js segue',async()=>{const r=await chiama('GET','/api/progetti',{cookie:cProp});const pr=r.dati.progetti;pr.find(p=>p.slug==='nuova-lampada').pubblicato=true;pr.unshift(pr.pop());
  const s=await chiama('PUT','/api/progetti',{cookie:cProp,corpo:{base:r.dati.base,progetti:pr}});assert.equal(s.stato,200);
  const js=commits[head].files.get('assets/js/indice.js');assert.ok(js.indexOf('nuova-lampada')<js.indexOf('"one"'));});
await prova('immagine: accetta PNG vero, rifiuta un file finto',async()=>{
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
  const r=await chiama('POST','/api/progetti/oopar/immagini',{cookie:cProp,corpo:{nome:'render-1',base64:png.toString('base64')}});assert.equal(r.stato,201);assert.equal(r.dati.percorso,'assets/img/oopar/render-1.png');
  const x=await chiama('POST','/api/progetti/oopar/immagini',{cookie:cProp,corpo:{nome:'trucco',base64:Buffer.from('<script>').toString('base64')}});assert.equal(x.stato,415);});
await prova('pagina progetto: legge e salva solo se valida',async()=>{const r=await chiama('GET','/api/progetti/oopar/pagina',{cookie:cProp});assert.equal(r.stato,200);
  assert.equal((await chiama('PUT','/api/progetti/oopar/pagina',{cookie:cProp,corpo:{base:r.dati.base,pagina:{titolo:''}}})).stato,422);
  assert.equal((await chiama('PUT','/api/progetti/oopar/pagina',{cookie:cProp,corpo:{base:r.dati.base,pagina:r.dati.pagina}})).stato,200);});
await prova('app: nuova app in arrivo, poi file caricato e riquadro generato',async()=>{
  let r=await chiama('GET','/api/app',{cookie:cProp});assert.equal(r.dati.app.length,2);
  // il contatore conta le app pubblicate: lo si ricava dai dati veri, che cambiano dal pannello
  const pubblicate=r.dati.app.filter(a=>a.pubblicato).length;
  r=await chiama('POST','/api/app',{cookie:cProp,corpo:{base:r.dati.base,app:{slug:'timer',nome:'Timer',tipo:'strumento',pubblicato:true}}});assert.equal(r.stato,201,JSON.stringify(r.dati));
  let lab=commits[head].files.get('laboratorio/index.html');assert.match(lab,/<h2>Timer<\/h2>/);assert.match(lab,new RegExp(`<span id="nApp">${pubblicate+1}</span>`));assert.doesNotMatch(lab,/app\/timer\/\?mini/);
  const x=await chiama('PUT','/api/app/timer/file',{cookie:cProp,corpo:{base:r.dati.base,html:'non è html'}});assert.equal(x.stato,422);
  const y=await chiama('PUT','/api/app/timer/file',{cookie:cProp,corpo:{base:r.dati.base,html:'<!doctype html><html><body>ok</body></html>'}});assert.equal(y.stato,200,JSON.stringify(y.dati));
  const fs=commits[head].files;assert.equal(fs.get('app/timer/index.html'),'<!doctype html><html><body>ok</body></html>');assert.match(fs.get('laboratorio/index.html'),/app\/timer\/\?mini=1/);});
await prova('app: non si segna pronta un\'app senza file',async()=>{const r=await chiama('GET','/api/app',{cookie:cProp});const a=r.dati.app;Object.assign(a.find(x=>x.slug==='spesa'),{stato:'pronta',pubblicato:true});
  assert.equal((await chiama('PUT','/api/app',{cookie:cProp,corpo:{base:r.dati.base,app:a}})).stato,409);});
await prova('app: togliere un\'app toglie anche il suo file',async()=>{const r=await chiama('GET','/api/app',{cookie:cProp});
  assert.equal((await chiama('DELETE','/api/app/timer?base='+r.dati.base,{cookie:cProp})).stato,200);assert.ok(!commits[head].files.has('app/timer/index.html'));assert.doesNotMatch(commits[head].files.get('laboratorio/index.html'),/Timer/);});
await prova('statistiche: chiave GoatCounter solo lato server',async()=>{const r=await chiama('GET','/api/statistiche?giorni=30',{cookie:cProp});assert.equal(r.stato,200);
  assert.equal(r.dati.totale,459);assert.equal(r.dati.eventi[0].percorso,'apri-oopar');assert.ok(!JSON.stringify(r.dati).includes('gc-segreto'));});
const iscrizione={endpoint:EP,keys:{p256dh:b64u(uaPub),auth:b64u(authUA)}};
await prova('notifiche: iscrizione verso un servizio sconosciuto rifiutata',async()=>{
  const r=await chiama('POST','/api/push',{cookie:cProp,corpo:{iscrizione:{...iscrizione,endpoint:'https://cattivo.example/push'}}});assert.equal(r.stato,422);});
await prova('notifiche: la prova arriva cifrata e firmata al telefono iscritto',async()=>{
  assert.equal((await chiama('GET','/api/push',{cookie:cProp})).dati.chiave,vapidPub);
  assert.equal((await chiama('POST','/api/push',{cookie:cProp,corpo:{iscrizione,dispositivo:'Android · Chrome'}})).stato,201);
  const r=await chiama('POST','/api/push/prova',{cookie:cProp});assert.equal(r.stato,200,JSON.stringify(r.dati));assert.equal(r.dati.inviate,1);
  assert.equal(ricevuti.at(-1).titolo,'hl. · prova');});
await prova('notifiche dalle Actions: solo con il token OIDC di questo repository',async()=>{
  const avviso={titolo:'Controlli: Link rotti',testo:'Il controllo non è passato.',url:'https://github.com/o/r/actions/runs/1'};
  const ok=await chiama('POST','/api/notifica',{corpo:avviso,intest:{authorization:'Bearer '+await tokenActions()}});assert.equal(ok.stato,200,JSON.stringify(ok.dati));
  assert.equal(ricevuti.at(-1).titolo,'Controlli: Link rotti');
  assert.equal((await chiama('POST','/api/notifica',{corpo:avviso,intest:{authorization:'Bearer '+await tokenActions({repository:'altro/r'})}})).stato,403);
  assert.equal((await chiama('POST','/api/notifica',{corpo:avviso,intest:{authorization:'Bearer '+await tokenActions({aud:'altro'})}})).stato,401);
  assert.equal((await chiama('POST','/api/notifica',{corpo:avviso})).stato,401);});
await prova('notifiche: un\'iscrizione scaduta (410) viene tolta',async()=>{
  rispostaPush=410;assert.equal((await chiama('POST','/api/push/prova',{cookie:cProp})).stato,404);
  assert.deepEqual(JSON.parse(kv.get('push')),[]);rispostaPush=201;});
const grezza=(metodo,percorso,{corpo,cookie,intest={}}={})=>app.fetch(new Request(O+percorso,{method:metodo,headers:{'x-pannello':'1',origin:O,...(cookie?{cookie}:{}),...intest},body:corpo}),env);
await prova('portfolio: lo carica solo la Action di questo repo, ed è un PDF vero',async()=>{
  assert.equal((await chiama('GET','/api/portfolio',{cookie:cProp})).stato,404);
  const pdf=new TextEncoder().encode('%PDF-1.7\n% prova\n%%EOF\n');
  assert.equal((await grezza('PUT','/api/portfolio',{corpo:pdf})).status,401);
  assert.equal((await grezza('PUT','/api/portfolio',{corpo:pdf,intest:{authorization:'Bearer '+await tokenActions({repository:'altro/r'})}})).status,403);
  assert.equal((await grezza('PUT','/api/portfolio',{corpo:new TextEncoder().encode('<html>'),intest:{authorization:'Bearer '+await tokenActions()}})).status,415);
  const r=await grezza('PUT','/api/portfolio',{corpo:pdf,intest:{authorization:'Bearer '+await tokenActions()}});assert.equal(r.status,200);
  assert.equal((await r.json()).byte,pdf.length);});
await prova('portfolio: si scarica solo dopo l\'accesso',async()=>{
  assert.equal((await grezza('GET','/api/portfolio')).status,401);
  const r=await grezza('GET','/api/portfolio',{cookie:cProp});assert.equal(r.status,200);
  assert.equal(r.headers.get('content-type'),'application/pdf');assert.match(r.headers.get('content-disposition'),/^attachment; filename="portfolio-leandro-henriquez-\d{4}-\d\d-\d\d\.pdf"$/);
  assert.equal(new TextDecoder().decode(await r.arrayBuffer()).slice(0,8),'%PDF-1.7');
  assert.equal((await chiama('GET','/api/portfolio/info',{cookie:cProp})).dati.pronto,true);});
// --- bozze: restano nel pannello finché non le pubblichi ---
await prova('bozza: si salva nel pannello senza toccare il sito',async()=>{
  const prima=head;const r=await chiama('GET','/api/progetti',{cookie:cProp});const one=r.dati.progetti.find(p=>p.slug==='one');
  const s=await chiama('PUT','/api/bozze/progetti/one',{cookie:cProp,corpo:{progetto:{...one,nome:'ONE bozza'}}});assert.equal(s.stato,200,JSON.stringify(s.dati));
  assert.equal(head,prima,'nessun commit');const b=await chiama('GET','/api/bozze',{cookie:cProp});assert.equal(b.dati.progetti.one.progetto.nome,'ONE bozza');
  assert.equal((await chiama('PUT','/api/bozze/progetti/one',{cookie:cProp,corpo:{progetto:{...one,nome:''}}})).stato,422);
  assert.equal((await chiama('GET','/api/bozze')).stato,401);});
await prova('anteprima: il sito con le bozze, solo dopo l\'accesso e senza statistiche',async()=>{
  const fuori=await grezza('GET','/anteprima/');assert.equal(fuori.status,302);
  const js=await grezza('GET','/anteprima/assets/js/indice.js',{cookie:cProp});assert.equal(js.status,200);const t=await js.text();
  assert.match(t,/ONE bozza/);assert.doesNotMatch(commits[head].files.get('assets/js/indice.js'),/ONE bozza/);
  const h=await grezza('GET','/anteprima/',{cookie:cProp});const html=await h.text();assert.equal(h.status,200);
  assert.ok(chiamateSito.includes('https://leandrohenriquez.com/index.html'));assert.doesNotMatch(html,/goatcounter/);
  assert.match(html,/name="robots" content="noindex, nofollow"/);assert.match(html,/anteprima delle bozze/);assert.equal(h.headers.get('cache-control'),'private, no-store');
  assert.equal((await grezza('GET','/anteprima/assets/css/home.css',{cookie:cProp})).status,200);
  assert.equal((await grezza('GET','/anteprima/a%2F..%2Fsegreto',{cookie:cProp})).status,400);});
await prova('pubblica: un commit con la bozza, poi la bozza sparisce',async()=>{
  const r=await chiama('GET','/api/progetti',{cookie:cProp});const b=(await chiama('GET','/api/bozze',{cookie:cProp})).dati.progetti.one;
  const s=await chiama('POST','/api/progetti/one/pubblica',{cookie:cProp,corpo:{base:r.dati.base,progetto:b.progetto,posizione:0}});assert.equal(s.stato,200,JSON.stringify(s.dati));
  const d=JSON.parse(commits[head].files.get('data/progetti.json'));assert.equal(d.progetti[0].slug,'one');assert.equal(d.progetti[0].nome,'ONE bozza');
  assert.match(commits[head].files.get('assets/js/indice.js'),/ONE bozza/);assert.deepEqual((await chiama('GET','/api/bozze',{cookie:cProp})).dati.progetti,{});});
await prova('pubblica: un progetto nuovo non sovrascrive uno che esiste',async()=>{
  const r=await chiama('GET','/api/progetti',{cookie:cProp});const one=r.dati.progetti.find(p=>p.slug==='one');
  assert.equal((await chiama('POST','/api/progetti/one/pubblica',{cookie:cProp,corpo:{base:r.dati.base,progetto:{...one,nome:'Altro'},nuovo:true}})).stato,409);
  const n=await chiama('POST','/api/progetti/tavolo/pubblica',{cookie:cProp,corpo:{base:r.dati.base,progetto:{nome:'Tavolo',tipo:'arredo',contesto:'prova',anteprima:'assets/img/oopar.jpg'},nuovo:true}});
  assert.equal(n.stato,200,JSON.stringify(n.dati));assert.equal(n.dati.progetti.at(-1).slug,'tavolo');assert.equal(n.dati.progetti.at(-1).pubblicato,false);});

// --- portfolio su misura ---
await prova('portfolio su misura: senza il permesso Actions lo dice chiaramente',async()=>{
  const r=await chiama('POST','/api/portfolio/versioni',{cookie:cProp,corpo:{nome:'per Smeg',progetti:['oopar','one']}});
  assert.equal(r.stato,403);assert.match(r.dati.errore,/Actions: read and write/);assert.deepEqual(JSON.parse(kv.get('portfolio-versioni')||'[]'),[]);});
await prova('portfolio su misura: controlla nome e progetti',async()=>{permessoActions=true;
  assert.equal((await chiama('POST','/api/portfolio/versioni',{cookie:cProp,corpo:{nome:'',progetti:['oopar']}})).stato,422);
  assert.equal((await chiama('POST','/api/portfolio/versioni',{cookie:cProp,corpo:{nome:'x',progetti:['inventato']}})).stato,422);
  assert.equal((await chiama('POST','/api/portfolio/versioni',{cookie:cProp,corpo:{nome:'x',progetti:['oopar','oopar']}})).stato,422);assert.equal(avvii.length,0);});
let vid;
await prova('portfolio su misura: avvia la Action, poi la versione pronta si scarica e arriva la notifica',async()=>{
  assert.equal((await chiama('POST','/api/push',{cookie:cProp,corpo:{iscrizione,dispositivo:'Android · Chrome'}})).stato,201);
  const r=await chiama('POST','/api/portfolio/versioni',{cookie:cProp,corpo:{nome:'per Smeg',progetti:['oopar','one']}});assert.equal(r.stato,201,JSON.stringify(r.dati));
  vid=r.dati.versione.id;assert.deepEqual(avvii.at(-1),{ref:'main',inputs:{versione:vid,progetti:'oopar,one'}});
  assert.equal((await grezza('GET','/api/portfolio?versione='+vid,{cookie:cProp})).status,404,'non ancora pronta');
  const pdf=new TextEncoder().encode('%PDF-1.7\n% smeg\n%%EOF\n');
  assert.equal((await grezza('PUT','/api/portfolio?versione=inventata1',{corpo:pdf,intest:{authorization:'Bearer '+await tokenActions()}})).status,404);
  const up=await grezza('PUT','/api/portfolio?versione='+vid,{corpo:pdf,intest:{authorization:'Bearer '+await tokenActions()}});assert.equal(up.status,200);
  assert.equal(ricevuti.at(-1).titolo,'Portfolio pronto');assert.match(ricevuti.at(-1).testo,/per Smeg/);
  const l=await chiama('GET','/api/portfolio/versioni',{cookie:cProp});assert.equal(l.dati.versioni[0].stato,'pronto');
  const g=await grezza('GET','/api/portfolio?versione='+vid,{cookie:cProp});assert.equal(g.status,200);assert.match(g.headers.get('content-disposition'),/portfolio-leandro-henriquez-per-smeg\.pdf/);
  assert.equal(new TextDecoder().decode(await g.arrayBuffer()).slice(0,8),'%PDF-1.7');
  const c=await grezza('GET','/api/portfolio',{cookie:cProp});assert.match(new TextDecoder().decode(await c.arrayBuffer()),/prova/,'il completo resta quello');});
await prova('portfolio su misura: ne restano 5, le più vecchie si tolgono',async()=>{
  for(let i=0;i<5;i++)assert.equal((await chiama('POST','/api/portfolio/versioni',{cookie:cProp,corpo:{nome:'v'+i,progetti:['oopar']}})).stato,201);
  const l=await chiama('GET','/api/portfolio/versioni',{cookie:cProp});assert.equal(l.dati.versioni.length,5);assert.ok(!l.dati.versioni.some(v=>v.id===vid));assert.ok(!kv.has('portfolio-v-'+vid));
  assert.equal((await chiama('DELETE','/api/portfolio/versioni/'+l.dati.versioni[0].id,{cookie:cProp})).stato,200);
  assert.equal((await chiama('GET','/api/portfolio/versioni',{cookie:cProp})).dati.versioni.length,4);});
await prova('stile del sito: legge gli stili in stili/, il proprietario lo cambia con un commit',async()=>{
  let r=await chiama('GET','/api/stile',{cookie:cProp});assert.equal(r.stato,200);assert.equal(r.dati.stile,'classico');assert.deepEqual(r.dati.disponibili,['classico','manifesto']);
  r=await chiama('PUT','/api/stile',{cookie:cProp,corpo:{base:r.dati.base,stile:'inventato'}});assert.equal(r.stato,422);
  r=await chiama('PUT','/api/stile',{cookie:cOspite,corpo:{stile:'manifesto'}});assert.ok([401,403].includes(r.stato));
  r=await chiama('PUT','/api/stile',{cookie:cProp,corpo:{stile:'manifesto'}});assert.equal(r.stato,200);
  assert.equal(JSON.parse(commits[head].files.get('data/stile.json')).stile,'manifesto');
  const prima=head;r=await chiama('PUT','/api/stile',{cookie:cProp,corpo:{stile:'manifesto'}});assert.equal(head,prima,'stesso stile: nessun commit');
});
await prova('uscita cancella il cookie',async()=>{const r=await chiama('POST','/api/uscita',{cookie:cProp});assert.equal(r.cookie,'hl_sessione=');});
console.log(`\n${ok} prove superate`);
