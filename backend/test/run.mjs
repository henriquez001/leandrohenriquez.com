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
const files=new Map([['data/progetti.json',readFileSync(new URL('../../data/progetti.json',import.meta.url),'utf8')],['lavori/oopar/index.html','<html></html>'],['lavori/oopar/progetto.json',JSON.stringify({titolo:'Oopar',tappe:[{camera:{},parola:{testo:'Oopar'}}]})]]);
let commits={c0:{tree:'t0',files:new Map(files)}},head='c0',n=0;const blobs={},trees={};
const R=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}});
let chiamateGC=[];
async function finto(url,opt={}){
  url=String(url);const m=opt.method||'GET',b=opt.body?JSON.parse(opt.body):null;
  if(url==='https://www.googleapis.com/oauth2/v3/certs')return R({keys:[jwk]});
  if(url.includes('goatcounter.com')){chiamateGC.push(url);assert.equal(opt.headers.authorization,'Bearer gc-segreto');
    if(url.includes('stats/total'))return R({total:459,total_unique:330,stats:[{day:'2026-10-31',daily:12}]});
    if(url.includes('stats/hits'))return R({hits:[{path:'/',title:'Home',count:312,event:false,stats:[]},{path:'apri-oopar',count:58,event:true,stats:[]}]});
    if(url.includes('stats/toprefs'))return R({stats:[{name:'linkedin.com',count:118},{name:'',count:212}]});
    return R({stats:[{name:'phone',count:41}]});}
  assert.ok(url.startsWith('https://api.github.com/repos/o/r/'),url);assert.equal(opt.headers.authorization,'Bearer gh-segreto');
  const p=url.slice('https://api.github.com/repos/o/r/'.length);
  if(m==='GET'&&p==='git/ref/heads/main')return R({object:{sha:head}});
  if(m==='GET'&&p.startsWith('contents/')){const [fp,q]=p.slice(9).split('?ref=');const c=commits[q==='main'?head:q];const t=c&&c.files.get(decodeURI(fp));
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
  ACCESSI:{get:async k=>kv.get(k)??null,put:async(k,v)=>{kv.set(k,v);}}};
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
await prova('statistiche: chiave GoatCounter solo lato server',async()=>{const r=await chiama('GET','/api/statistiche?giorni=30',{cookie:cProp});assert.equal(r.stato,200);
  assert.equal(r.dati.totale,459);assert.equal(r.dati.eventi[0].percorso,'apri-oopar');assert.ok(!JSON.stringify(r.dati).includes('gc-segreto'));});
await prova('uscita cancella il cookie',async()=>{const r=await chiama('POST','/api/uscita',{cookie:cProp});assert.equal(r.cookie,'hl_sessione=');});
console.log(`\n${ok} prove superate`);
