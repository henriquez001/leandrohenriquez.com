/* Pannello di leandrohenriquez.com — interfaccia in stile showroom (20/11/2026): la stessa struttura del sito.
   Barra in alto con le sezioni, tessere su una griglia di 12 colonne, viste Vetrina e Mosaico (sito/showroom/viste.js).
   Vetrina: si modifica sul palco grande; Mosaico: il modulo si apre in un foglio che nasce dalla tessera toccata.
   Parla solo con /api/ dello stesso Worker. */
'use strict';
const SITO='https://leandrohenriquez.com/';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nn=i=>String(i+1).padStart(2,'0');
const slugDa=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
const stato={io:null,sezione:null,progetti:null,bozze:{},app:null,base:{},anteprime:{}};
// tessere: st() scrive colonne/righe (--c/--r computer, --cv/--rv/--ov Vetrina, --cm/--rm telefono)
const st=o=>Object.entries(o).map(([k,v])=>`--${k}:${v}`).join(';');
const board=()=>$('#board');
const vetrina=()=>board().dataset.v==='vetrina';
const colore=slug=>(typeof COLORI!=='undefined'&&COLORI[slug])||'#E6E6E3';
const scuro=slug=>typeof SCURI!=='undefined'&&!!SCURI[slug];
const fotoP=p=>!/\.png$/i.test(p.anteprima||'');
const tessera=(cls,dim,dentro,attr='')=>`<section class="t ${cls}" style="${st(dim)}"${attr}><div class="in">${dentro}</div></section>`;

// ---------- rete ----------
class ErroreApi extends Error{constructor(s,m){super(m);this.stato=s;}}
async function api(metodo,url,corpo){
  const r=await fetch(url,{method:metodo,credentials:'same-origin',headers:{'content-type':'application/json','x-pannello':'1'},body:corpo===undefined?undefined:JSON.stringify(corpo)});
  let d={};try{d=await r.json();}catch{}
  if(r.status===401&&url!=='/api/io'){mostraAccesso('Sessione scaduta: accedi di nuovo.');}
  if(!r.ok)throw new ErroreApi(r.status,d.errore||`Errore ${r.status}`);
  return d;
}
// Un salvataggio partito da dati vecchi (409): ricarico e lo dico.
async function conflitto(e,ricarica){
  if(e.stato===409&&/cambiato nel frattempo/i.test(e.message)){avviso('Qualcuno ha salvato nel frattempo: ho ricaricato i dati, riprova.',true);await ricarica();return true;}
  return false;
}

// ---------- avviso ----------
let tAvviso;
// titolo del pannello laterale: data-t serve alla copia blu sovrastampata (stile Manifesto)
function titoloDr(t){const h=$('#drTitolo');h.textContent=t;h.dataset.t=t;}
function avviso(testo,errore=false){const a=$('#avviso');a.textContent=testo;a.classList.toggle('errore',errore);a.classList.add('on');clearTimeout(tAvviso);tAvviso=setTimeout(()=>a.classList.remove('on'),errore?6000:2600);}

// ---------- accesso con Google ----------
async function mostraAccesso(msg=''){
  $('#app').hidden=true;$('#accesso').hidden=false;$('#accErr').textContent=msg;
  const {googleClientId}=await api('GET','/api/config').catch(()=>({}));
  if(!googleClientId){$('#accErr').textContent='Accesso con Google non ancora configurato (manca GOOGLE_CLIENT_ID).';return;}
  if(!window.google){await new Promise((ok,ko)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=ok;s.onerror=ko;document.head.appendChild(s);}).catch(()=>{$('#accErr').textContent='Non riesco a caricare l\'accesso di Google.';});}
  if(!window.google)return;
  google.accounts.id.initialize({client_id:googleClientId,callback:async({credential})=>{
    try{stato.io=await api('POST','/api/accesso',{credential});avvia();}
    catch(e){$('#accErr').textContent=e.message;}
  },ux_mode:'popup',auto_select:false});
  google.accounts.id.renderButton($('#gbtn'),{theme:'filled_black',size:'large',shape:'rectangular',text:'signin_with',locale:'it'});
}
// menu dell'account (nasce dal pulsante; si chiude con Esc o toccando fuori)
function menuIo(apri){const m=$('#ioMenu'),b=$('#io');m.hidden=!apri;b.setAttribute('aria-expanded',apri);if(apri){const x=$('button:not([hidden]),a',m);if(x)x.focus();}}
$('#io').addEventListener('click',e=>{e.stopPropagation();menuIo($('#ioMenu').hidden);});
document.addEventListener('click',e=>{if(!$('#ioMenu').hidden&&!e.target.closest('#ioMenu'))menuIo(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#ioMenu').hidden){menuIo(false);$('#io').focus();}});
$('#esci').addEventListener('click',async()=>{menuIo(false);await api('POST','/api/uscita').catch(()=>{});if(window.google)google.accounts.id.disableAutoSelect();stato.io=null;mostraAccesso('Sei uscito.');});

async function avvia(){
  $('#accesso').hidden=true;$('#app').hidden=false;
  $('#ioEmail').textContent=stato.io.email;$('#voceAccessi').hidden=!stato.io.proprietario;
  $('#io').textContent=(stato.io.email||'?').slice(0,2);$('#io').setAttribute('aria-label','Account '+stato.io.email+': notifiche ed esci');
  vai();statoNotifiche();
}

// ---------- app installabile e notifiche push ----------
// se il service worker non si registra (es. navigazione privata) il pannello funziona lo stesso, senza notifiche
const swReg='serviceWorker' in navigator?navigator.serviceWorker.register('/sw.js').catch(()=>null):Promise.resolve(null);
const pushOk=()=>'PushManager' in window&&'Notification' in window;
const ub64u=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4)),c=>c.charCodeAt(0));
const iscrizioneAttuale=async()=>{const r=await swReg;return r?r.pushManager.getSubscription():null;};
const nomeDispositivo=()=>{const u=navigator.userAgent;
  return (/iPhone|iPad/.test(u)?'iPhone':/Android/.test(u)?'Android':/Windows/.test(u)?'Windows':/Mac/.test(u)?'Mac':'browser')+' · '+(/Edg\//.test(u)?'Edge':/Chrome\//.test(u)?'Chrome':/Firefox\//.test(u)?'Firefox':/Safari\//.test(u)?'Safari':'altro');};
// Su iPhone le notifiche esistono solo con il pannello aggiunto alla schermata Home: lì il pulsante compare da solo.
async function statoNotifiche(){
  const b=$('#notifiche'),ok=pushOk()&&!!(await swReg);
  const s=ok?await iscrizioneAttuale().catch(()=>null):null;
  b.hidden=!ok;b.setAttribute('aria-pressed',!!s);b.textContent=s?'Notifiche attive ✓':'Attiva le notifiche';
  b.title=s?'Notifiche attive su questo dispositivo: tocca per disattivarle':'Ricevi qui gli avvisi del sito';
}
$('#notifiche').addEventListener('click',async()=>{
  const b=$('#notifiche');b.disabled=true;
  try{
    const s=await iscrizioneAttuale();
    if(s){
      if(!confirm('Smettere di ricevere le notifiche su questo dispositivo?'))return;
      await api('DELETE','/api/push',{endpoint:s.endpoint}).catch(()=>{});await s.unsubscribe();avviso('Notifiche disattivate su questo dispositivo.');
    }else{
      if(await Notification.requestPermission()!=='granted')throw new Error('Permesso negato: si riattiva dalle impostazioni del browser.');
      const {chiave}=await api('GET','/api/push');
      const n=await (await navigator.serviceWorker.ready).pushManager.subscribe({userVisibleOnly:true,applicationServerKey:ub64u(chiave)});
      await api('POST','/api/push',{iscrizione:n.toJSON(),dispositivo:nomeDispositivo()});
      await api('POST','/api/push/prova');avviso('Notifiche attive: tra poco arriva una prova.');
    }
  }catch(e){avviso(e.message,true);}
  finally{b.disabled=false;statoNotifiche();}
});
window.addEventListener('hashchange',vai);
function vai(){
  if(!stato.io)return;
  let s=location.hash.slice(1)||'progetti';
  if(!SEZIONI[s]||(s==='accessi'&&!stato.io.proprietario))s='progetti';
  stato.sezione=s;
  $$('.nav.sez a').forEach(a=>{if(a.dataset.s===s)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  // la scelta Vetrina/Mosaico serve dove c'è un elenco da modificare
  $('#vista').hidden=!['progetti','app'].includes(s);
  chiudiDrawer(true);
  board().innerHTML=tessera('carta intro-p',{c:12,r:3,cm:2,rm:3},`<div class="row"><span class="mono">Pannello · ${esc(s)}</span></div><p class="lbl"><span class="carica"></span> carico…</p>`);
  SEZIONI[s]().catch(e=>{board().innerHTML=tessera('carta intro-p',{c:12,r:3,cm:2,rm:4},`<div class="row"><span class="mono">Qualcosa non va</span></div><div><h1>Errore</h1><p>${esc(e.message)}</p></div>`);});
}

// ---------- modifica: sul palco della Vetrina o nel foglio del Mosaico ----------
// Lo stesso modulo (#drForm) si sposta nel palco (#ed) quando la vista è Vetrina e la voce sta nell'elenco,
// altrimenti va nel foglio, che nasce dalla tessera toccata (apple-motion: le finestre nascono da chi le apre).
let drSalva=null,drElimina=null,drPrimaFocus=null,drNelPalco=false,drDa=null;
const RIDOTTO=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function palcoVuoto(){const ed=$('#ed');if(!ed)return;ed.style.removeProperty('--bg');ed.style.removeProperty('--tx');
  $$('#board .sel').forEach(x=>x.classList.remove('sel'));
  $('.in',ed).innerHTML=`<div class="vuoto-ed"><span class="mono">Modifica</span><div><h2>${stato.sezione==='app'?'Scegli un\u2019app':'Scegli un progetto'}</h2><p>Toccalo nella striscia: lo modifichi qui.</p></div></div>`;}
// azioni: pulsanti in più accanto a quello principale, [{testo, fn(FormData, pulsante)}]; fn può restituire 'resta' per non chiudere
// palco: {vis, sfondo, testo} per mostrare la voce nel palco della Vetrina; da: la tessera da cui nasce il foglio
function apriDrawer({n,titolo,campi,onSalva,onElimina,testoSalva='Salva e pubblica',azioni=[],palco=null,da=null,fuoco=true}){
  chiudiDrawer(true,false);
  drPrimaFocus=document.activeElement;drDa=da;
  $('#drN').textContent=n;titoloDr(titolo);$('#drCampi').innerHTML=campi;$('#drErr').textContent='';
  $('#drSalva').textContent=testoSalva;$('#drSalva').disabled=false;
  drSalva=onSalva;drElimina=onElimina;$('#drElimina').hidden=!onElimina;
  const ex=$('#drExtra');ex.innerHTML='';
  azioni.forEach(a=>{const b=document.createElement('button');b.type='button';b.className='btn vuoto';b.textContent=a.testo;ex.appendChild(b);
    b.addEventListener('click',async()=>{const t=b.textContent;b.disabled=true;$('#drErr').textContent='';
      try{if(await a.fn(new FormData($('#drForm')),b)!=='resta')chiudiDrawer();}catch(err){$('#drErr').textContent=err.message;}finally{b.disabled=false;b.textContent=t;}});});
  const ed=$('#ed'),form=$('#drForm');
  drNelPalco=!!(palco&&ed&&vetrina());
  if(drNelPalco){
    ed.style.setProperty('--bg',palco.sfondo||'var(--carta)');ed.style.setProperty('--tx',palco.testo||'var(--ink)');
    const in_=$('.in',ed);in_.innerHTML=palco.vis||'';in_.appendChild(form);
    $$('#board .sel').forEach(x=>x.classList.remove('sel'));if(da)da.classList.add('sel');
    if(fuoco){const r=ed.getBoundingClientRect();if(r.top<70||r.bottom>innerHeight)ed.scrollIntoView({behavior:RIDOTTO()?'auto':'smooth',block:'nearest'});}
  }else{
    const d=$('#drawer'),v=$('#velo');$('.in',d).appendChild(form);d.hidden=false;v.hidden=false;
    if(da&&!RIDOTTO()){const r=da.getBoundingClientRect(),f=d.getBoundingClientRect(),sx=r.width/f.width,sy=r.height/f.height;
      d.style.transition='none';d.style.transform=`translate(${r.left+r.width/2-(f.left+f.width/2)}px,${r.top+r.height/2-(f.top+f.height/2)}px) scale(${sx},${sy})`;
      d.getBoundingClientRect();d.style.transition='';d.style.transform='';}
    requestAnimationFrame(()=>v.classList.add('aperto'));
  }
  if(fuoco)setTimeout(()=>{const p=$('input:not([type=hidden]):not([type=file]),textarea',form);if(p)p.focus({preventScroll:true});},60);
}
function chiudiDrawer(subito=false,rimetti=true){
  const d=$('#drawer'),v=$('#velo'),form=$('#drForm');
  if(drNelPalco){drNelPalco=false;$('.in',d).appendChild(form);if(rimetti)palcoVuoto();
    if(!subito&&drDa&&document.contains(drDa)){const h=$('.hit',drDa)||drDa;h.focus({preventScroll:true});}return;}
  if(d.hidden)return;
  v.classList.remove('aperto');
  // il foglio torna nella tessera da cui è nato
  if(!subito&&drDa&&document.contains(drDa)&&!RIDOTTO()){const r=drDa.getBoundingClientRect(),f=d.getBoundingClientRect();
    d.style.transform=`translate(${r.left+r.width/2-(f.left+f.width/2)}px,${r.top+r.height/2-(f.top+f.height/2)}px) scale(${r.width/f.width},${r.height/f.height})`;
    setTimeout(()=>{d.hidden=true;v.hidden=true;d.style.transform='';},300);}
  else{d.hidden=true;v.hidden=true;}
  if(!subito&&drPrimaFocus&&document.contains(drPrimaFocus))drPrimaFocus.focus({preventScroll:true});
}
// cambiando vista il modulo aperto si chiude e le tessere si ridisegnano per la vista nuova
document.addEventListener('vista',()=>{if(!stato.io)return;chiudiDrawer(true);if(stato.sezione==='progetti'&&stato.progetti)disegnaProgetti();else if(stato.sezione==='app'&&stato.app)disegnaApp();});
$$('[data-chiudi]').forEach(b=>b.addEventListener('click',()=>chiudiDrawer()));
$('#velo').addEventListener('click',()=>chiudiDrawer());
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(!$('#drawer').hidden||drNelPalco)&&$('#ioMenu').hidden)chiudiDrawer();});
$('#drForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!drSalva)return;const b=$('#drSalva'),t=b.textContent;
  b.disabled=true;b.innerHTML='<span class="carica"></span> salvo…';$('#drErr').textContent='';
  try{if(await drSalva(new FormData($('#drForm')))!=='resta')chiudiDrawer();}
  catch(err){$('#drErr').textContent=err.message;}
  finally{b.disabled=false;b.textContent=t;}
});
$('#drElimina').addEventListener('click',async()=>{
  if(!drElimina||!confirm('Togliere questa voce? Resta comunque nella storia del sito su GitHub.'))return;
  try{await drElimina();chiudiDrawer();}catch(err){$('#drErr').textContent=err.message;}
});
const campo=(nome,etichetta,valore='',{max,area,tipo='text',aiuto='',attr=''}={})=>`<label><span class="lbl">${etichetta}${aiuto?' · '+aiuto:''}</span>${area?`<textarea name="${nome}" maxlength="${max||''}" ${attr}>${esc(valore)}</textarea>`:`<input type="${tipo}" name="${nome}" value="${esc(valore)}" ${max?`maxlength="${max}"`:''} ${attr}>`}</label>`;
const interruttore=(nome,etichetta,on)=>`<div class="riga"><span id="l-${nome}">${etichetta}</span><span class="swHit"><button type="button" class="sw" role="switch" aria-labelledby="l-${nome}" aria-checked="${!!on}" data-campo="${nome}"></button></span><input type="hidden" name="${nome}" value="${on?'1':''}"></div>`;
document.addEventListener('click',e=>{const s=e.target.closest('#drForm .sw');if(!s)return;const on=s.getAttribute('aria-checked')!=='true';s.setAttribute('aria-checked',on);$(`#drForm input[name="${s.dataset.campo}"]`).value=on?'1':'';});

// Posizione nell'elenco: serve sul telefono, dove non si trascina.
const posizione=(i,n)=>`<label class="riga"><span>posizione</span><select name="posizione" style="width:auto">${Array.from({length:n},(_,k)=>`<option value="${k}"${k===i?' selected':''}>${nn(k)}</option>`).join('')}</select></label>`;
const sposta=(el,da,a)=>{if(isNaN(a)||a===da)return el;const c=[...el];const [m]=c.splice(da,1);c.splice(a,0,m);return c;};

// ---------- immagini ----------
const urlImg=p=>stato.anteprime[p]||SITO+p;
const imgTag=(p,alt)=>`<img src="${esc(urlImg(p))}" alt="${esc(alt)}" class="${/\.png$/i.test(p)?'cut':''}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'lbl',textContent:'anteprima'}))">`;
function leggiFile(file){return new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>ko(new Error('File non leggibile'));r.readAsDataURL(file);});}

// ---------- progetti ----------
async function caricaProgetti(){
  const [d,b]=await Promise.all([api('GET','/api/progetti'),api('GET','/api/bozze').catch(()=>({progetti:{}}))]);
  stato.base.progetti=d.base;stato.progetti=d.progetti;stato.bozze=b.progetti||{};
}
// le bozze di progetti nuovi, che non sono ancora nell'indice
const bozzeNuove=()=>Object.entries(stato.bozze).filter(([slug])=>!stato.progetti.some(p=>p.slug===slug)).map(([slug,b])=>({slug,...b}));
async function salvaProgetti(elenco,msg='Salvato. Il sito si aggiorna in circa un minuto.'){
  try{const d=await api('PUT','/api/progetti',{base:stato.base.progetti,progetti:elenco});stato.base.progetti=d.base;stato.progetti=elenco;avviso(msg);}
  catch(e){if(await conflitto(e,async()=>{await caricaProgetti();disegnaProgetti();}))throw new Error('Dati ricaricati: riprova.');throw e;}
}
async function sezioneProgetti(){await caricaProgetti();disegnaProgetti();}
function disegnaProgetti(){
  const P=stato.progetti,nB=Object.keys(stato.bozze).length,nOn=P.filter(p=>p.pubblicato).length;
  // tessera di un progetto: colore pieno del prodotto (colori.js del sito), immagine senza filtri, interruttore "sul sito"
  const prj=(p,i,{bozza=false,nuova=false}={})=>{const foto=fotoP(p),cls=`t prj${foto?' foto':''}${p.pubblicato||nuova?'':' off'}`;
    return `<article class="${cls}" style="--bg:${foto?'#1C1C1C':colore(p.slug)};--tx:${foto||scuro(p.slug)?'var(--carta)':'var(--ink)'}"${nuova?` data-bozza="${esc(p.slug)}"`:` draggable="true" data-i="${i}"`}><div class="in">
    ${p.anteprima?`<img class="im" src="${esc(urlImg(p.anteprima))}" alt="" loading="lazy">`:''}
    <div class="row"><span class="mono">${nuova?'nuovo':nn(i)} · ${esc(p.tipo)}</span><span class="mono">${nuova?'non ancora nell\'indice':p.pubblicato?esc(p.contesto):'nascosto'}</span></div>
    <div class="bot"><h2 class="nm">${esc(p.nome)}${bozza?'<span class="tag">bozza</span>':''}${p.etichetta?`<span class="tag">${esc(p.etichetta)}</span>`:''}</h2></div>
    <button class="hit" type="button" aria-label="Modifica ${esc(p.nome)}${bozza?' (bozza)':''}"></button></div>
    ${nuova?'':`<span class="sw-p swHit"><button type="button" class="sw" role="switch" aria-checked="${p.pubblicato}" aria-label="${esc(p.nome)} sul sito" data-i="${i}"></button></span>`}</article>`;};
  board().innerHTML=tessera('carta intro-p',{c:4,r:4,cv:4,rv:5,ov:1,cm:2,rm:4},`<div class="row"><span class="mono">Pannello · progetti</span><span class="mono hide-s"><i class="dot"></i>sito collegato</span></div>
    <div style="display:flex;flex-direction:column;gap:12px"><h1>Progetti</h1>
    <p><b>${nOn}</b> sul sito su ${P.length}${nB?`, ${nB} ${nB===1?'bozza':'bozze'}`:''}. Tocca un progetto per modificarlo; trascinalo per cambiare l’ordine.</p>
    <div class="acts"><button class="btn" type="button" id="nuovoP">+ Nuovo progetto</button><a class="btn vuoto" href="${SITO}" target="_blank" rel="noopener">Vedi il sito ↗</a></div></div>`)+
  tessera('ed solo-v',{cv:8,rv:5,ov:2,cvm:2,rvm:8},'',' id="ed" aria-label="Modifica del progetto"')+
  P.map((p,i)=>{const b=stato.bozze[p.slug];return prj(b?{...b.progetto,pubblicato:p.pubblicato}:p,i,{bozza:!!b});}).join('')+
  bozzeNuove().map(b=>prj(b.progetto,-1,{bozza:true,nuova:true})).join('')+
  tessera('pdf-t',{c:6,r:2,cv:6,rv:2,ov:30,cm:2,rm:3},`<div class="row"><span class="mono">Portfolio PDF</span><span class="mono hide-s" id="pdfInfo">privato</span></div>
    <div class="acts"><button class="btn chiaro" type="button" id="pdfApri">↓ Scarica o crea su misura…</button></div>`)+
  tessera('stat',{c:6,r:2,cv:6,rv:2,ov:31,cm:2,rm:2},`<span class="mono">Sul sito</span><b>${nOn}<small> / ${P.length}</small></b>`);
  palcoVuoto();
  // il portfolio PDF è privato: si scarica da qui (variante 2 del 4/11: scegli i progetti quando lo crei)
  api('GET','/api/portfolio/info').then(d=>{if(d.pronto&&$('#pdfInfo'))$('#pdfInfo').textContent=`completo · ${dataBreve(d.aggiornato)} · ${mb(d.byte)}`;}).catch(()=>{});
  $('#pdfApri').addEventListener('click',e=>portfolioPDF(e.currentTarget.closest('.t')));
  $$('#board [data-bozza] .hit').forEach(b=>b.addEventListener('click',()=>modificaProgetto(-1,b.closest('.prj').dataset.bozza,b.closest('.prj'))));
  $$('#board .prj[data-i] .hit').forEach(b=>b.addEventListener('click',()=>modificaProgetto(+b.closest('.prj').dataset.i,undefined,b.closest('.prj'))));
  // l'interruttore va online subito (anche con una bozza aperta, che lo segue)
  $$('#board .prj .sw').forEach(s=>s.addEventListener('click',async e=>{
    e.stopPropagation();const i=+s.dataset.i,el=stato.progetti.map(p=>({...p}));el[i].pubblicato=!el[i].pubblicato;
    s.setAttribute('aria-checked',el[i].pubblicato);s.disabled=true;
    try{
      await salvaProgetti(el,el[i].pubblicato?`${el[i].nome} è pubblicato.`:`${el[i].nome} è nascosto.`);
      const b=stato.bozze[el[i].slug];if(b){const d=await api('PUT',`/api/bozze/progetti/${el[i].slug}`,{progetto:{...b.progetto,pubblicato:el[i].pubblicato}});stato.bozze[el[i].slug]=d.bozza;}
    }catch(err){avviso(err.message,true);}
    disegnaProgetti();
  }));
  $('#nuovoP').addEventListener('click',e=>modificaProgetto(-1,undefined,e.currentTarget.closest('.t')));
  riordina(board(),stato.progetti,async el=>{try{await salvaProgetti(el,'Nuovo ordine salvato.');}catch(e){avviso(e.message,true);}disegnaProgetti();});
}
// Trascinamento con il mouse (HTML5) e, da tastiera, Alt+↑/↓ sulla scheda.
function riordina(box,elenco,salva){
  let da=null;
  $$('.prj[data-i]',box).forEach(c=>{
    c.addEventListener('dragstart',e=>{da=+c.dataset.i;c.classList.add('presa');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',da);setTimeout(()=>c.classList.add('trascina'));});
    c.addEventListener('dragend',()=>{c.classList.remove('presa','trascina');$$('.sopra',box).forEach(x=>x.classList.remove('sopra'));});
    c.addEventListener('dragover',e=>{if(da===null)return;e.preventDefault();$$('.sopra',box).forEach(x=>x!==c&&x.classList.remove('sopra'));c.classList.add('sopra');});
    c.addEventListener('drop',e=>{e.preventDefault();const a=+c.dataset.i;if(da===null||a===da)return;const el=elenco.map(x=>({...x}));const [m]=el.splice(da,1);el.splice(a,0,m);da=null;salva(el);});
    c.addEventListener('keydown',e=>{if(!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const i=+c.dataset.i,j=i+(e.key==='ArrowUp'?-1:1);if(j<0||j>=elenco.length)return;const el=elenco.map(x=>({...x}));[el[i],el[j]]=[el[j],el[i]];salva(el);});
  });
}
const dataBreve=t=>new Date(t).toLocaleDateString('it-IT',{day:'numeric',month:'short'});
const mb=b=>`${(b/1048576).toLocaleString('it-IT',{maximumFractionDigits:1})} MB`;
// Modifica di un progetto (variante A del 4/11: bozza per progetto). i = posizione nell'indice, -1 per un progetto nuovo;
// slugBozza = bozza di un progetto nuovo non ancora pubblicato.
function modificaProgetto(i,slugBozza,da=null,fuoco=true){
  const inIndice=i>=0,nuovo=!inIndice,vuoto={slug:'',nome:'',tipo:'',contesto:'',anteprima:'',pagina:false,pubblicato:false};
  const b=slugBozza?stato.bozze[slugBozza]:inIndice?stato.bozze[stato.progetti[i].slug]:null;
  const p=b?b.progetto:inIndice?stato.progetti[i]:vuoto;
  let anteprima=p.anteprima;
  const slugAttuale=()=>p.slug||(($('#drForm [name=slug]')||{}).value||'').trim()||slugDa(($('#drForm [name=nome]')||{}).value);
  const leggi=f=>{
    const v={...p,nome:f.get('nome').trim(),tipo:f.get('tipo').trim(),contesto:f.get('contesto').trim(),anteprima,pubblicato:!!f.get('pubblicato')};
    for(const k of ['anno','etichetta','descrizione']){const x=(f.get(k)||'').trim();if(x)v[k]=x;else delete v[k];}
    v.slug=slugAttuale();delete v.pagina;
    if(!v.nome)throw new Error('Serve un nome.');if(!v.anteprima)throw new Error('Carica un\'immagine di anteprima.');
    if(nuovo&&!b&&stato.progetti.some(x=>x.slug===v.slug))throw new Error(`L'indirizzo "${v.slug}" è già usato da un altro progetto.`);
    return v;
  };
  const salvaBozza=async f=>{const v=leggi(f);const d=await api('PUT',`/api/bozze/progetti/${v.slug}`,{progetto:v,nuovo});stato.bozze[v.slug]=d.bozza;return v;};
  const azioni=[];
  if(b)azioni.push({testo:'Scarta bozza',fn:async()=>{
    if(!confirm('Scartare la bozza? '+(nuovo?'Il progetto nuovo sparisce.':'Resta la versione pubblicata.')))return 'resta';
    await api('DELETE',`/api/bozze/progetti/${p.slug}`);delete stato.bozze[p.slug];avviso('Bozza scartata.');disegnaProgetti();}});
  azioni.push({testo:'Anteprima ↗',fn:async f=>{
    const w=window.open('about:blank','_blank'); // aperta subito, dentro il clic, così il browser non la blocca
    try{await salvaBozza(f);}catch(e){if(w)w.close();throw e;}
    if(w)w.location.href='/anteprima/';else location.href='/anteprima/';disegnaProgetti();return 'resta';}});
  azioni.push({testo:'Salva bozza',fn:async f=>{const v=await salvaBozza(f);avviso(`Bozza di ${v.nome} salvata: sul sito non cambia niente.`);disegnaProgetti();}});
  const foto=fotoP(p);
  apriDrawer({da,fuoco,
    palco:inIndice||b?{sfondo:foto?'var(--carta)':colore(p.slug),testo:scuro(p.slug)&&!foto?'var(--carta)':'var(--ink)',
      vis:`<div class="vis${foto?' foto':''}"><span class="mono">${inIndice?nn(i):'nuovo'} · ${esc(p.tipo)}</span>${p.anteprima?`<img src="${esc(urlImg(p.anteprima))}" alt="">`:''}<span class="nm2">${esc(p.nome)}</span></div>`}:null,
    n:(nuovo?'nuovo progetto':`${nn(i)} · modifica`)+(b?` · bozza del ${dataBreve(b.aggiornato)}`:''),titolo:p.nome||'Nuovo',testoSalva:'Pubblica',azioni,
    campi:`${campo('nome','nome',p.nome,{max:40})}
      ${nuovo&&!b?campo('slug','indirizzo','',{max:40,aiuto:'leandrohenriquez.com/lavori/…',attr:'pattern="[a-z0-9]+(-[a-z0-9]+)*" autocapitalize="off" spellcheck="false"'}):''}
      <div class="due">${campo('tipo','tipo',p.tipo,{max:40})}${campo('contesto','contesto',p.contesto,{max:40})}</div>
      <div class="due">${campo('anno','anno',p.anno||'',{max:4,attr:'inputmode="numeric" pattern="(19|20)[0-9]{2}"'})}${campo('etichetta','etichetta',p.etichetta||'',{max:6,aiuto:'es. 3D'})}</div>
      ${campo('descrizione','descrizione',p.descrizione||'',{max:420,area:true,aiuto:'va anche nel portfolio PDF'})}
      <div class="campo"><span class="lbl">anteprima · PNG scontornato o JPG, massimo 8 MB</span><div class="anteprima"><div class="th" id="thP">${anteprima?imgTag(anteprima,'anteprima'):''}</div><label class="btn">Carica…<input type="file" accept="image/png,image/jpeg,image/webp" id="fileP" hidden></label><span class="lbl" id="statoImg"></span></div></div>
      ${inIndice?posizione(i,stato.progetti.length):''}
      ${interruttore('pubblicato','pubblicato nell\'indice',p.pubblicato)}
      ${inIndice&&stato.progetti[i].pagina?`<div class="riga"><span>pagina con il 3D</span><a href="${SITO}lavori/${esc(p.slug)}/" target="_blank" rel="noopener">apri ↗</a></div>`:''}
      <p class="lbl">«Salva bozza» tiene le modifiche solo qui nel pannello; «Pubblica» le manda sul sito.</p>`,
    onElimina:!inIndice?null:async()=>{
      try{const d=await api('DELETE',`/api/progetti/${encodeURIComponent(p.slug)}?base=${stato.base.progetti}`);stato.base.progetti=d.base;stato.progetti=stato.progetti.filter(x=>x.slug!==p.slug);
        if(stato.bozze[p.slug]){await api('DELETE',`/api/bozze/progetti/${p.slug}`).catch(()=>{});delete stato.bozze[p.slug];}
        avviso(`${p.nome} tolto dall'indice.`);disegnaProgetti();}
      catch(e){if(await conflitto(e,async()=>{await caricaProgetti();disegnaProgetti();}))throw new Error('Dati ricaricati: riprova.');throw e;}
    },
    onSalva:async f=>{
      const v=leggi(f),pos=inIndice?+f.get('posizione'):undefined;
      try{const d=await api('POST',`/api/progetti/${v.slug}/pubblica`,{base:stato.base.progetti,progetto:v,nuovo,posizione:pos});
        stato.base.progetti=d.base;stato.progetti=d.progetti;delete stato.bozze[v.slug];
        avviso(`${v.nome} pubblicato. Il sito si aggiorna in circa un minuto.`);}
      catch(e){if(await conflitto(e,async()=>{await caricaProgetti();disegnaProgetti();}))throw new Error('Dati ricaricati: la bozza è salva, riprova.');throw e;}
      disegnaProgetti();
    }
  });
  if(nuovo&&!b){const n=$('#drForm [name=nome]'),sl=$('#drForm [name=slug]');let toccato=false;sl.addEventListener('input',()=>toccato=true);n.addEventListener('input',()=>{if(!toccato)sl.value=slugDa(n.value);titoloDr(n.value||'Nuovo');});}
  $('#fileP').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    const slug=slugAttuale();
    if(!slug){$('#drErr').textContent='Scrivi prima il nome del progetto.';return;}
    if(file.size>8*1024*1024){$('#drErr').textContent='Immagine troppo grande (massimo 8 MB).';return;}
    $('#statoImg').innerHTML='<span class="carica"></span> carico…';
    try{
      const dataUrl=await leggiFile(file);
      const d=await api('POST',`/api/progetti/${slug}/immagini`,{base:stato.base.progetti,nome:'anteprima-'+Date.now().toString(36),base64:dataUrl.split(',')[1]});
      stato.base.progetti=d.base;anteprima=d.percorso;stato.anteprime[d.percorso]=dataUrl;
      $('#thP').innerHTML=imgTag(anteprima,'anteprima');$('#statoImg').textContent='caricata ✓';
    }catch(err){$('#statoImg').textContent='';$('#drErr').textContent=err.message;}
  });
}

// ---------- portfolio PDF su misura (variante 2 del 4/11) ----------
// Scegli progetti e ordine, dai un nome: la Action "Portfolio PDF" lo prepara (circa 2 minuti) e arriva una notifica.
let pfTimer=null;
async function portfolioPDF(da=null){
  const P=stato.progetti,ordine=[...P.filter(p=>p.pubblicato),...P.filter(p=>!p.pubblicato)].map(p=>p.slug),scelti=new Set(P.filter(p=>p.pubblicato).map(p=>p.slug));
  const nome=slug=>{const p=P.find(x=>x.slug===slug);return p?p.nome:slug;};
  apriDrawer({da,n:'portfolio PDF',titolo:'Portfolio',testoSalva:'Crea PDF',
    campi:`<div class="campo"><span class="lbl">pronti da scaricare</span><div class="pronti" id="pfPronti"><span class="lbl"><span class="carica"></span> carico…</span></div></div>
      ${campo('nome','nome del nuovo portfolio','',{max:30,aiuto:'es. per Smeg'})}
      <div class="campo"><div class="riga" style="border:0;padding:0"><span class="lbl" id="pfConta"></span><span style="white-space:nowrap"><button type="button" class="link" id="pfTutti">tutti</button> · <button type="button" class="link" id="pfNessuno">nessuno</button></span></div><ol class="scelta" id="pfScelta"></ol></div>`,
    onSalva:async f=>{
      const n=(f.get('nome')||'').trim(),el=ordine.filter(x=>scelti.has(x));
      if(!n)throw new Error('Dai un nome al portfolio, per esempio "per Smeg".');if(!el.length)throw new Error('Scegli almeno un progetto.');
      await api('POST','/api/portfolio/versioni',{nome:n,progetti:el});
      $('#drForm [name=nome]').value='';avviso(`Preparo «${n}»: ti avviso quando è pronto, circa 2 minuti.`);await pronti();return 'resta';
    }});
  const disegnaScelta=()=>{
    $('#pfConta').textContent=`${scelti.size} su ${P.length}, in quest'ordine`;
    $('#pfScelta').innerHTML=ordine.map((slug,k)=>`<li class="${scelti.has(slug)?'':'no'}"><input type="checkbox" id="pf-${esc(slug)}" data-s="${esc(slug)}"${scelti.has(slug)?' checked':''}><label for="pf-${esc(slug)}">${esc(nome(slug))}</label>
      <button type="button" class="su" data-k="${k}" data-d="-1" aria-label="Sposta su ${esc(nome(slug))}"${k===0?' disabled':''}>↑</button><button type="button" class="su" data-k="${k}" data-d="1" aria-label="Sposta giù ${esc(nome(slug))}"${k===ordine.length-1?' disabled':''}>↓</button></li>`).join('');
  };
  $('#pfScelta').addEventListener('change',e=>{const c=e.target.closest('input');if(!c)return;c.checked?scelti.add(c.dataset.s):scelti.delete(c.dataset.s);disegnaScelta();$(`#pf-${CSS.escape(c.dataset.s)}`).focus();});
  $('#pfScelta').addEventListener('click',e=>{const b=e.target.closest('.su');if(!b)return;const k=+b.dataset.k,j=k+(+b.dataset.d);[ordine[k],ordine[j]]=[ordine[j],ordine[k]];disegnaScelta();
    const x=$(`#pfScelta .su[data-k="${j}"][data-d="${b.dataset.d}"]`)||$(`#pfScelta .su[data-k="${j}"]`);if(x&&!x.disabled)x.focus();});
  $('#pfTutti').addEventListener('click',()=>{ordine.forEach(x=>scelti.add(x));disegnaScelta();});
  $('#pfNessuno').addEventListener('click',()=>{scelti.clear();disegnaScelta();});
  disegnaScelta();
  async function pronti(){
    clearTimeout(pfTimer);const box=$('#pfPronti');if(!box||$('#drawer').hidden)return;
    const [info,{versioni}]=await Promise.all([api('GET','/api/portfolio/info').catch(()=>({})),api('GET','/api/portfolio/versioni').catch(()=>({versioni:[]}))]);
    const riga=(testo,dx,x='')=>`<div><span>${testo}</span>${dx}${x}</div>`;
    box.innerHTML=(info.pronto?riga(`completo · ${P.filter(p=>p.pubblicato).length} progetti<br><span class="lbl">${dataBreve(info.aggiornato)} · ${mb(info.byte)} · si aggiorna da solo</span>`,'<a class="btn" href="/api/portfolio" download>↓</a>','<span></span>'):'')+
      versioni.map(v=>riga(`${esc(v.nome)} · ${v.progetti.length} ${v.progetti.length===1?'progetto':'progetti'}<br><span class="lbl">${v.stato==='pronto'?`${dataBreve(v.aggiornato)} · ${mb(v.byte)}`:v.stato==='in-preparazione'?'<span class="carica"></span> in preparazione…':'non riuscito: riprova o guarda le Actions'}</span>`,
        v.stato==='pronto'?`<a class="btn" href="/api/portfolio?versione=${v.id}" download aria-label="Scarica ${esc(v.nome)}">↓</a>`:'<span></span>',
        `<button type="button" class="x" data-via="${v.id}" aria-label="Togli ${esc(v.nome)}">✕</button>`)).join('')||'<span class="lbl">ancora nessuno</span>';
    $$('#pfPronti [data-via]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Togliere questa versione del portfolio?'))return;await api('DELETE',`/api/portfolio/versioni/${b.dataset.via}`).catch(e=>avviso(e.message,true));pronti();}));
    if(versioni.some(v=>v.stato==='in-preparazione'))pfTimer=setTimeout(pronti,15000);
  }
  pronti();
}

// ---------- app del Laboratorio ----------
async function caricaApp(){const d=await api('GET','/api/app');stato.base.app=d.base;stato.app=d.app;}
async function salvaApp(el,msg='Salvato. Il Laboratorio si aggiorna in circa un minuto.'){
  try{const d=await api('PUT','/api/app',{base:stato.base.app,app:el});stato.base.app=d.base;stato.app=el;avviso(msg);}
  catch(e){if(await conflitto(e,async()=>{await caricaApp();disegnaApp();}))throw new Error('Dati ricaricati: riprova.');throw e;}
}
async function sezioneApp(){await caricaApp();disegnaApp();}
function disegnaApp(){
  const A=stato.app,pronte=A.filter(a=>a.stato==='pronta'&&a.pubblicato).length;
  board().innerHTML=tessera('carta intro-p',{c:4,r:4,cv:4,rv:5,ov:1,cm:2,rm:4},`<div class="row"><span class="mono">Pannello · app</span><span class="mono hide-s">pagina Laboratorio</span></div>
    <div style="display:flex;flex-direction:column;gap:12px"><h1>App</h1><p><b>${pronte}</b> pronte sul sito su ${A.length}. Tocca un’app per modificarla; trascinala per cambiare l’ordine.</p>
    <div class="acts"><button class="btn" type="button" id="nuovaA">+ Nuova app</button><a class="btn vuoto" href="${SITO}laboratorio/" target="_blank" rel="noopener">Laboratorio ↗</a></div></div>`)+
  tessera('ed solo-v',{cv:8,rv:5,ov:2,cvm:2,rvm:8},'',' id="ed" aria-label="Modifica dell\'app"')+
  A.map((a,i)=>`<article class="t prj app-p${a.stato==='pronta'?'':' arr'}${a.pubblicato?'':' off'}" draggable="true" data-i="${i}" style="${st({c:4,r:3,cm:2,rm:3})}"><div class="in">
    <div class="row"><span class="mono">${nn(i)} · ${esc(a.tipo)}</span><span class="mono">${a.stato==='pronta'?'pronta':'in arrivo'}</span></div>
    <div><h2>${esc(a.nome)}</h2>${a.descrizione?`<p>${esc(a.descrizione)}</p>`:''}</div>
    <button class="hit" type="button" aria-label="Modifica ${esc(a.nome)}"></button></div>
    <span class="sw-p swHit"><button type="button" class="sw" role="switch" aria-checked="${a.pubblicato}" aria-label="${esc(a.nome)} nel Laboratorio" data-i="${i}"></button></span></article>`).join('');
  palcoVuoto();
  $$('#board .prj .hit').forEach(b=>b.addEventListener('click',()=>modificaApp(+b.closest('.prj').dataset.i,b.closest('.prj'))));
  $$('#board .prj .sw').forEach(s=>s.addEventListener('click',async e=>{
    e.stopPropagation();const i=+s.dataset.i,el=stato.app.map(a=>({...a}));el[i].pubblicato=!el[i].pubblicato;s.disabled=true;
    try{await salvaApp(el,el[i].pubblicato?`${el[i].nome} è pubblicata.`:`${el[i].nome} è nascosta.`);}catch(err){avviso(err.message,true);}
    disegnaApp();
  }));
  $('#nuovaA').addEventListener('click',e=>modificaApp(-1,e.currentTarget.closest('.t')));
  riordina(board(),stato.app,async el=>{try{await salvaApp(el,'Nuovo ordine salvato.');}catch(e){avviso(e.message,true);}disegnaApp();});
}
function modificaApp(i,da=null,fuoco=true){
  const nuova=i<0,a=nuova?{slug:'',nome:'',tipo:'',descrizione:'',stato:'in-arrivo',pubblicato:false}:stato.app[i];
  let html=null;
  apriDrawer({da,fuoco,
    palco:nuova?null:{sfondo:a.stato==='pronta'?'#FFB37A':'var(--carta)',testo:'var(--ink)',
      vis:`<div class="vis"><span class="mono">${nn(i)} · ${esc(a.tipo)}</span><span class="nm2">${esc(a.nome)}</span></div>`},
    n:nuova?'nuova app':`${nn(i)} · modifica`,titolo:nuova?'Nuova':a.nome,testoSalva:nuova?'Aggiungi':'Salva e pubblica',
    campi:`${campo('nome','nome',a.nome,{max:40})}
      ${nuova?campo('slug','indirizzo','',{max:40,aiuto:'leandrohenriquez.com/app/…',attr:'autocapitalize="off" spellcheck="false"'}):''}
      ${campo('tipo','tipo',a.tipo,{max:30,aiuto:'es. calcolatore'})}
      ${campo('descrizione','descrizione',a.descrizione||'',{max:160,area:true})}
      <div class="campo"><span class="lbl">file dell'app · una pagina HTML completa, massimo 2 MB</span><div class="anteprima"><label class="btn">${a.stato==='pronta'?'Sostituisci…':'Carica…'}<input type="file" accept=".html,text/html" hidden id="fileA"></label><span class="lbl" id="statoFile">${a.stato==='pronta'?`<a href="${SITO}app/${esc(a.slug)}/" target="_blank" rel="noopener">apri quella online ↗</a>`:'nessun file: sul sito appare come “in arrivo”'}</span></div></div>
      ${nuova?'':posizione(i,stato.app.length)}
      ${interruttore('pubblicato','pubblicata nel Laboratorio',a.pubblicato)}`,
    onElimina:nuova?null:async()=>{
      try{const d=await api('DELETE',`/api/app/${encodeURIComponent(a.slug)}?base=${stato.base.app}`);stato.base.app=d.base;stato.app=stato.app.filter(x=>x.slug!==a.slug);avviso(`${a.nome} tolta dal Laboratorio.`);disegnaApp();}
      catch(e){if(await conflitto(e,async()=>{await caricaApp();disegnaApp();}))throw new Error('Dati ricaricati: riprova.');throw e;}
    },
    onSalva:async f=>{
      const v={...a,nome:f.get('nome').trim(),tipo:f.get('tipo').trim(),pubblicato:!!f.get('pubblicato')};
      const ds=(f.get('descrizione')||'').trim();if(ds)v.descrizione=ds;else delete v.descrizione;
      if(!v.nome||!v.tipo)throw new Error('Servono nome e tipo.');
      const ricarica=async()=>{await caricaApp();disegnaApp();};
      try{
        if(nuova){v.slug=(f.get('slug')||'').trim()||slugDa(v.nome);const pub=v.pubblicato;v.pubblicato=html?pub:false;
          const d=await api('POST','/api/app',{base:stato.base.app,app:{...v,stato:'in-arrivo',pubblicato:false}});stato.base.app=d.base;stato.app=[...stato.app,d.app];
          if(html){const d2=await api('PUT',`/api/app/${v.slug}/file`,{base:stato.base.app,html});stato.base.app=d2.base;await caricaApp();}
          if(pub){const el=stato.app.map(x=>x.slug===v.slug?{...x,pubblicato:true}:x);await salvaApp(el);}else avviso(`${v.nome} aggiunta.`);
        }else{
          if(html){const d=await api('PUT',`/api/app/${a.slug}/file`,{base:stato.base.app,html});stato.base.app=d.base;await caricaApp();}
          const el=sposta(stato.app.map(x=>x.slug===a.slug?{...v,stato:x.stato}:x),i,+f.get('posizione'));await salvaApp(el);
        }
      }catch(e){if(await conflitto(e,ricarica))throw new Error('Dati ricaricati: riprova.');throw e;}
      disegnaApp();
    }
  });
  if(nuova){const n=$('#drForm [name=nome]'),s=$('#drForm [name=slug]');let t=false;s.addEventListener('input',()=>t=true);n.addEventListener('input',()=>{if(!t)s.value=slugDa(n.value);titoloDr(n.value||'Nuova');});}
  $('#fileA').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    if(file.size>2*1024*1024){$('#drErr').textContent='File troppo grande (massimo 2 MB).';return;}
    const t=await file.text();if(!/<html[\s>]/i.test(t)){$('#drErr').textContent='Serve una pagina HTML completa (con il tag <html>).';return;}
    html=t;$('#statoFile').textContent=`${file.name} pronto: si carica quando salvi`;
  });
}

// ---------- statistiche (A2) ----------
let giorni=30;
async function sezioneStatistiche(){
  let d;
  try{d=await api('GET',`/api/statistiche?giorni=${giorni}`);}
  catch(e){
    if(e.stato===503){board().innerHTML=tessera('carta intro-p vuoto-t',{c:12,r:3,cm:2,rm:5},`<div class="row"><span class="mono">Pannello · statistiche</span></div><div><h1>Statistiche</h1><p>GoatCounter non è ancora collegato. Servono il codice dell'account e una chiave API di sola lettura: quando ci sono, qui compaiono visite, pagine, provenienza e azioni.</p></div>`);return;}
    throw e;
  }
  const tot=d.totale,giornate=d.perGiorno,picco=Math.max(1,...giornate.map(g=>g.visite));
  const telefoni=d.dispositivi.filter(x=>/phone|mobile/i.test(x.nome)).reduce((a,x)=>a+x.visite,0),tutti=d.dispositivi.reduce((a,x)=>a+x.visite,0);
  const ev=n=>{const r=d.eventi.find(x=>x.percorso===n);return r?r.visite:0;};
  const top=d.pagine[0];
  const data=s=>new Date(s+'T12:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'short'});
  const num=(et,v,cls='',dim={c:3,r:2,cm:1,rm:2})=>tessera('stat '+cls,dim,`<span class="mono">${et}</span><b${typeof v==='string'&&!/^[\d.%—]+$/.test(v)?' class="testo"':''}>${typeof v==='number'?v.toLocaleString('it-IT'):esc(v)}</b>`);
  const lista=(tit,righe,cls='')=>tessera('lista-t '+cls,{c:4,r:4,cm:2,rm:5},`<div class="row"><span class="mono">${tit}</span></div><ol>${righe||'<li><span class="lbl">ancora nessun dato</span></li>'}</ol>`);
  board().innerHTML=tessera('carta intro-p',{c:6,r:3,cm:2,rm:4},`<div class="row"><span class="mono">Pannello · statistiche</span><span class="mono hide-s">GoatCounter, senza cookie</span></div>
    <div style="display:flex;flex-direction:column;gap:14px"><h1>Statistiche</h1><div class="periodo" role="group" aria-label="Periodo">${[7,30,90].map(g=>`<button type="button" aria-pressed="${g===giorni}" data-g="${g}">${g} giorni</button>`).join('')}</div></div>`)+
    num(`Visite · ${d.periodo.giorni} giorni`,tot,'',{c:3,r:3,cm:1,rm:2})+num('Visitatori unici',d.unici,'',{c:3,r:3,cm:1,rm:2})+
    tessera('graf',{c:8,r:4,cm:2,rm:4},`<div class="row"><span class="mono">Visite al giorno</span><span class="mono">picco ${picco}</span></div><div class="chart"><svg id="barre" role="img" aria-label="Visite per giorno, picco ${picco}"></svg><div class="tip"></div></div>`)+
    lista('Pagine',d.pagine.slice(0,8).map(p=>`<li><span>${esc(p.titolo||p.percorso)}<small>${esc(p.percorso)}</small></span><b>${p.visite}</b></li>`).join(''),'carta')+
    num('Email copiata',ev('email-copiata'),'verde')+num('Apri Oopar',ev('apri-oopar'))+num('Clic LinkedIn',ev('clic-linkedin'))+num('Da telefono',tutti?Math.round(telefoni/tutti*100)+'%':'—')+
    num('Pagina più vista',top?(top.titolo||top.percorso):'—','',{c:4,r:2,cm:2,rm:2})+
    lista('Da dove arrivano',d.provenienza.slice(0,8).map(p=>`<li><span>${esc(p.nome)}</span><b>${p.visite}</b></li>`).join(''));
  $$('.periodo button').forEach(b=>b.addEventListener('click',()=>{giorni=+b.dataset.g;sezioneStatistiche().catch(e=>avviso(e.message,true));}));
  // istogramma: colonne con angoli di 3 px in alto, spazio 2 px; il giorno di picco in verde, quota del picco tratteggiata
  const svg=$('#barre'),W=Math.max(300,svg.clientWidth||600),H=Math.max(140,svg.clientHeight||190),basso=20,alto=22,n=Math.max(1,giornate.length),bw=Math.max(2,W/n-2);
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  let g='',xs=[],ys=[];
  const pk=giornate.findIndex(x=>x.visite===picco);
  giornate.forEach((x,i)=>{const h=(x.visite/picco)*(H-alto-basso),X=i*(bw+2),Y=H-basso-h,r=Math.min(3,bw/2,h);xs.push(X+bw/2);ys.push(Y);
    g+=h>0?`<path d="M${X} ${H-basso} V${Y+r} Q${X} ${Y} ${X+r} ${Y} H${X+bw-r} Q${X+bw} ${Y} ${X+bw} ${Y+r} V${H-basso} Z" style="fill:${i===pk?'#3DDC84':'#4A4A4A'}"/>`:'';});
  g+=`<line x1="0" x2="${W}" y1="${H-basso}" y2="${H-basso}" style="stroke:#4A4A4A"/>`;
  if(pk>=0&&giornate[pk].visite>0)g+=`<line x1="${xs[pk]}" x2="${W}" y1="${ys[pk]}" y2="${ys[pk]}" style="stroke:#3DDC84" stroke-dasharray="2 3"/><text x="${W}" y="${ys[pk]-6}" text-anchor="end" style="font:500 11px var(--m);fill:var(--carta)">picco ${picco} · ${data(giornate[pk].giorno)}</text>`;
  if(giornate.length)g+=`<text x="0" y="${H-4}" style="font:500 11px var(--m);fill:#8A8C8C">${data(giornate[0].giorno)}</text><text x="${W}" y="${H-4}" text-anchor="end" style="font:500 11px var(--m);fill:#8A8C8C">${data(giornate.at(-1).giorno)}</text>`;
  svg.innerHTML=g;
  const tip=svg.parentNode.querySelector('.tip');
  svg.addEventListener('pointermove',e=>{if(!xs.length)return;const r=svg.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W;let i=0,b=1e9;xs.forEach((v,k)=>{if(Math.abs(v-x)<b){b=Math.abs(v-x);i=k;}});
    tip.textContent=`${data(giornate[i].giorno)} · ${giornate[i].visite} visite`;tip.style.left=(xs[i]/W*r.width)+'px';tip.style.top=(ys[i]/H*r.height)+'px';tip.classList.add('on');});
  svg.addEventListener('pointerleave',()=>tip.classList.remove('on'));
}

// ---------- accessi (solo proprietario) ----------
async function sezioneAccessi(){
  const d=await api('GET','/api/accessi');
  const mail=(a,pro=false)=>tessera(`mail-t${pro?' verde':''}`,{c:4,r:2,cm:2,rm:2},`<div class="row"><span class="mono">${pro?'proprietario · entra sempre':esc(a.nota||'accesso')}${!pro&&a.aggiunta?` · ${esc(a.aggiunta)}`:''}</span></div>
    <div class="acts"><b>${esc(pro?a:a.email)}</b>${pro?'':`<button type="button" class="btn vuoto" data-togli="${esc(a.email)}">Togli</button>`}</div>`);
  board().innerHTML=tessera('carta intro-p',{c:4,r:3,cm:2,rm:3},`<div class="row"><span class="mono">Pannello · accessi</span></div><div><h1>Accessi</h1><p>Solo queste email Google entrano nel pannello.</p></div>`)+
    tessera('carta',{c:8,r:3,cm:2,rm:5},`<div class="row"><span class="mono">Aggiungi un accesso</span></div>
    <form class="aggiungi" id="formAcc"><input type="email" name="email" placeholder="email Google" required autocomplete="off" aria-label="Email Google"><input type="text" name="nota" placeholder="nota, es. chi è" maxlength="80" aria-label="Nota"><button class="btn" type="submit">Aggiungi</button></form>
    <p class="err" id="accErr2" role="alert"></p>`)+
    mail(d.proprietario,true)+d.elenco.map(a=>mail(a)).join('');
  $('#formAcc').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);
    try{await api('POST','/api/accessi',{email:f.get('email'),nota:f.get('nota')});avviso('Email aggiunta.');sezioneAccessi();}catch(err){$('#accErr2').textContent=err.message;}});
  $$('[data-togli]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm(`Togliere l'accesso a ${b.dataset.togli}?`))return;
    try{await api('DELETE',`/api/accessi/${encodeURIComponent(b.dataset.togli)}`);avviso('Accesso tolto.');sezioneAccessi();}catch(err){avviso(err.message,true);}}));
}

// account, notifiche ed esci stanno nel menu del pulsante in alto a destra (prima: sezione «tu» del telefono)
const SEZIONI={progetti:sezioneProgetti,app:sezioneApp,statistiche:sezioneStatistiche,accessi:sezioneAccessi};

// ---------- avvio ----------
(async()=>{try{stato.io=await api('GET','/api/io');avvia();}catch{mostraAccesso();}})();
