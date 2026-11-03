// Notifiche push (Web Push): chiave VAPID del server, iscrizioni dei telefoni in KV,
// messaggi cifrati come da RFC 8291 (aes128gcm) e firmati come da RFC 8292 (VAPID).
import {Errore} from './github.js';
const enc=new TextEncoder();
const b64u=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const ub64u=s=>Uint8Array.from(atob(String(s).replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((String(s).length+3)%4)),c=>c.charCodeAt(0));
const unisci=(...a)=>{const o=new Uint8Array(a.reduce((n,x)=>n+x.length,0));let i=0;for(const x of a){o.set(x,i);i+=x.length;}return o;};
const MAX_ISCRIZIONI=20;

// Solo i servizi push dei browser: il server non manda richieste altrove.
const SERVIZI=[/^fcm\.googleapis\.com$/,/^updates\.push\.services\.mozilla\.com$/,/(^|\.)push\.apple\.com$/,/\.notify\.windows\.com$/,/^push\.services\.mozilla\.com$/];
export function servizioValido(endpoint){
  let u;try{u=new URL(endpoint);}catch{return false;}
  return u.protocol==='https:'&&!u.port&&SERVIZI.some(r=>r.test(u.hostname));
}

// --- chiave del server: VAPID_JWK è la chiave privata P-256 in formato JWK (segreto del Worker) ---
let cacheChiave=null;
export async function chiaveServer(env){
  if(!env.VAPID_JWK)throw new Errore(503,'Notifiche non ancora configurate (manca VAPID_JWK)');
  if(cacheChiave&&cacheChiave.jwk===env.VAPID_JWK)return cacheChiave;
  const j=JSON.parse(env.VAPID_JWK);
  const priv=await crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:j.x,y:j.y,d:j.d},{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  cacheChiave={jwk:env.VAPID_JWK,priv,pub:b64u(unisci(Uint8Array.of(4),ub64u(j.x),ub64u(j.y)))};
  return cacheChiave;
}
async function vapid(endpoint,k,soggetto,ora){
  const t=b64u(enc.encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const c=b64u(enc.encode(JSON.stringify({aud:new URL(endpoint).origin,exp:Math.floor(ora/1000)+12*3600,sub:soggetto})));
  const firma=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},k.priv,enc.encode(t+'.'+c));
  return `vapid t=${t}.${c}.${b64u(firma)}, k=${k.pub}`;
}

// --- cifratura del messaggio (RFC 8291): un solo record, chiave effimera nuova a ogni invio ---
const hkdf=async(salt,ikm,info,byte)=>new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']),byte*8));
export async function cifra(testo,{p256dh,auth},{sale=crypto.getRandomValues(new Uint8Array(16)),effimera}={}){
  const uaPub=ub64u(p256dh),segretoAuth=ub64u(auth);
  const eph=effimera||await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const asPub=new Uint8Array(await crypto.subtle.exportKey('raw',eph.publicKey));
  const ua=await crypto.subtle.importKey('raw',uaPub,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const condiviso=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:ua},eph.privateKey,256));
  const ikm=await hkdf(segretoAuth,condiviso,unisci(enc.encode('WebPush: info\0'),uaPub,asPub),32);
  const cek=await hkdf(sale,ikm,enc.encode('Content-Encoding: aes128gcm\0'),16);
  const nonce=await hkdf(sale,ikm,enc.encode('Content-Encoding: nonce\0'),12);
  const chiaro=unisci(enc.encode(testo),Uint8Array.of(2)); // 0x02: ultimo (e unico) record
  const k=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);
  const cifrato=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},k,chiaro));
  const rs=new Uint8Array(4);new DataView(rs.buffer).setUint32(0,4096);
  return unisci(sale,rs,Uint8Array.of(asPub.length),asPub,cifrato);
}

// --- iscrizioni: una per telefono o browser, legate all'email di chi le ha fatte ---
export async function iscrizioni(env){const v=await env.ACCESSI.get('push');return v?JSON.parse(v):[];}
const salva=(env,el)=>env.ACCESSI.put('push',JSON.stringify(el));
export async function iscrivi(env,email,{endpoint,keys}={},dispositivo=''){
  if(!servizioValido(endpoint))throw new Errore(422,'Servizio di notifiche non riconosciuto');
  if(!keys||!/^[A-Za-z0-9_-]{80,100}$/.test(keys.p256dh||'')||!/^[A-Za-z0-9_-]{20,24}$/.test(keys.auth||''))throw new Errore(422,'Chiavi di iscrizione non valide');
  const el=(await iscrizioni(env)).filter(x=>x.endpoint!==endpoint);
  el.push({email,endpoint,p256dh:keys.p256dh,auth:keys.auth,dispositivo:String(dispositivo).slice(0,60),aggiunta:new Date().toISOString().slice(0,10)});
  await salva(env,el.slice(-MAX_ISCRIZIONI));
}
export async function disiscrivi(env,email,endpoint){
  const el=await iscrizioni(env);const resta=el.filter(x=>!(x.endpoint===endpoint&&x.email===email));
  if(resta.length!==el.length)await salva(env,resta);
}

// Manda {titolo,testo,url} ai dispositivi scelti; toglie quelli che il servizio dice scaduti (404/410).
export async function invia(env,messaggio,{chi=()=>true,f=fetch,ora=Date.now()}={}){
  const k=await chiaveServer(env),el=await iscrizioni(env),soggetto='mailto:'+(env.OWNER_EMAIL||'pannello@leandrohenriquez.com');
  const corpo=JSON.stringify({titolo:String(messaggio.titolo||'hl.').slice(0,80),testo:String(messaggio.testo||'').slice(0,240),url:String(messaggio.url||'/').slice(0,300)});
  let inviate=0;const scadute=[];
  for(const s of el.filter(chi)){
    const r=await f(s.endpoint,{method:'POST',headers:{authorization:await vapid(s.endpoint,k,soggetto,ora),'content-encoding':'aes128gcm','content-type':'application/octet-stream',ttl:'86400',urgency:'normal'},body:await cifra(corpo,s)});
    if(r.status===404||r.status===410)scadute.push(s.endpoint);else if(r.ok)inviate++;
  }
  if(scadute.length)await salva(env,el.filter(x=>!scadute.includes(x.endpoint)));
  return {inviate,tolte:scadute.length};
}

// --- avvisi dalle GitHub Actions di questo repo: token OIDC firmato da GitHub, nessun segreto condiviso ---
let jwksGH={chiavi:null,scade:0};
export async function verificaActions(token,env,f=fetch,ora=Date.now()){
  const p=String(token||'').split('.');if(p.length!==3)throw new Errore(401,'Token delle Actions non valido');
  const testa=JSON.parse(new TextDecoder().decode(ub64u(p[0]))),c=JSON.parse(new TextDecoder().decode(ub64u(p[1])));
  if(testa.alg!=='RS256')throw new Errore(401,'Token delle Actions non valido');
  if(!jwksGH.chiavi||ora>jwksGH.scade){const r=await f('https://token.actions.githubusercontent.com/.well-known/jwks');if(!r.ok)throw new Errore(502,'GitHub non risponde');jwksGH={chiavi:(await r.json()).keys,scade:ora+3600e3};}
  const jwk=jwksGH.chiavi.find(k=>k.kid===testa.kid);if(!jwk)throw new Errore(401,'Chiave di GitHub sconosciuta');
  const k=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5',k,ub64u(p[2]),enc.encode(p[0]+'.'+p[1]))))throw new Errore(401,'Firma di GitHub non valida');
  if(c.iss!=='https://token.actions.githubusercontent.com'||c.aud!=='hl-pannello')throw new Errore(401,'Token destinato ad altro');
  if(String(c.repository||'').toLowerCase()!==String(env.GITHUB_REPO||'').toLowerCase())throw new Errore(403,'Token di un altro repository');
  if(!c.exp||c.exp*1000<ora)throw new Errore(401,'Token scaduto');
  return c;
}
