// Accesso: Google conferma chi sei, poi l'email deve essere nell'elenco inserito a mano dal proprietario.
import {Errore} from './github.js';
const enc=new TextEncoder();
const b64u=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const ub64u=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4)),c=>c.charCodeAt(0));
const SESSIONE_ORE=12;

async function chiaveHmac(segreto){return crypto.subtle.importKey('raw',enc.encode(segreto),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}

// --- verifica del token di Google (ID token firmato RS256) ---
let jwksCache={chiavi:null,scade:0};
async function chiaviGoogle(f){
  if(jwksCache.chiavi&&Date.now()<jwksCache.scade)return jwksCache.chiavi;
  const r=await f('https://www.googleapis.com/oauth2/v3/certs');if(!r.ok)throw new Errore(502,'Google non risponde');
  const j=await r.json();jwksCache={chiavi:j.keys,scade:Date.now()+3600e3};return j.keys;
}
export async function verificaGoogle(token,env,f=fetch,ora=Date.now()){
  const parti=String(token||'').split('.');if(parti.length!==3)throw new Errore(401,'Token di Google non valido');
  const testa=JSON.parse(new TextDecoder().decode(ub64u(parti[0]))),corpo=JSON.parse(new TextDecoder().decode(ub64u(parti[1])));
  if(testa.alg!=='RS256')throw new Errore(401,'Token di Google non valido');
  const jwk=(await chiaviGoogle(f)).find(k=>k.kid===testa.kid);if(!jwk)throw new Errore(401,'Chiave di Google sconosciuta');
  const k=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',k,ub64u(parti[2]),enc.encode(parti[0]+'.'+parti[1]));
  if(!ok)throw new Errore(401,'Firma di Google non valida');
  if(!['accounts.google.com','https://accounts.google.com'].includes(corpo.iss))throw new Errore(401,'Emittente non valido');
  if(corpo.aud!==env.GOOGLE_CLIENT_ID)throw new Errore(401,'Token destinato a un\'altra app');
  if(!corpo.exp||corpo.exp*1000<ora)throw new Errore(401,'Token scaduto');
  if(corpo.email_verified!==true&&corpo.email_verified!=='true')throw new Errore(401,'Email Google non verificata');
  return String(corpo.email).toLowerCase();
}

// --- elenco accessi (KV). Il proprietario (OWNER_EMAIL) entra sempre e solo lui gestisce l'elenco ---
export const proprietario=env=>String(env.OWNER_EMAIL||'').toLowerCase();
export async function elencoAccessi(env){const v=await env.ACCESSI.get('elenco');return v?JSON.parse(v):[];}
export async function salvaAccessi(env,elenco){await env.ACCESSI.put('elenco',JSON.stringify(elenco));}
export async function puoEntrare(env,email){
  if(!email)return false;if(email===proprietario(env))return true;
  return (await elencoAccessi(env)).some(a=>a.email===email);
}

// --- sessione: cookie firmato, HttpOnly, 12 ore ---
export async function creaSessione(env,email,ora=Date.now()){
  const corpo=b64u(enc.encode(JSON.stringify({email,scade:ora+SESSIONE_ORE*3600e3})));
  const firma=b64u(await crypto.subtle.sign('HMAC',await chiaveHmac(env.SESSION_SECRET),enc.encode(corpo)));
  return `hl_sessione=${corpo}.${firma}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSIONE_ORE*3600}`;
}
export const chiudiSessione='hl_sessione=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
export async function leggiSessione(req,env,ora=Date.now()){
  const m=(req.headers.get('cookie')||'').match(/(?:^|;\s*)hl_sessione=([^;]+)/);if(!m)return null;
  const [corpo,firma]=m[1].split('.');if(!corpo||!firma)return null;
  let ok=false;try{ok=await crypto.subtle.verify('HMAC',await chiaveHmac(env.SESSION_SECRET),ub64u(firma),enc.encode(corpo));}catch{return null;}
  if(!ok)return null;
  const s=JSON.parse(new TextDecoder().decode(ub64u(corpo)));if(s.scade<ora)return null;
  // ricontrolla l'elenco a ogni richiesta: se togli un'email, quella persona esce subito
  if(!(await puoEntrare(env,s.email)))return null;
  return {email:s.email,proprietario:s.email===proprietario(env)};
}
