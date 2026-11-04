/* Pannello di leandrohenriquez.com — interfaccia (variante B). Parla solo con /api/ dello stesso Worker. */
'use strict';
const SITO='https://leandrohenriquez.com/';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nn=i=>String(i+1).padStart(2,'0');
const slugDa=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
const stato={io:null,sezione:null,progetti:null,app:null,base:{},anteprime:{}};

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
$('#esci').addEventListener('click',async()=>{await api('POST','/api/uscita').catch(()=>{});if(window.google)google.accounts.id.disableAutoSelect();stato.io=null;mostraAccesso('Sei uscito.');});

async function avvia(){
  $('#accesso').hidden=true;$('#app').hidden=false;
  $('#ioEmail').textContent=stato.io.email;$('#voceAccessi').hidden=!stato.io.proprietario;
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
  const b=$('#notifiche');if(!pushOk()||!(await swReg)){b.hidden=true;return;}
  const s=await iscrizioneAttuale().catch(()=>null);
  b.hidden=false;b.setAttribute('aria-pressed',!!s);b.textContent=s?'notifiche ✓':'notifiche';
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
  $$('.menu nav a').forEach(a=>{if(a.dataset.s===s)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  chiudiDrawer(true);
  $('#main').innerHTML='<p class="lbl"><span class="carica"></span> carico…</p>';
  SEZIONI[s]().catch(e=>{$('#main').innerHTML=`<div class="vuoto"><b>Qualcosa non va</b><span>${esc(e.message)}</span></div>`;});
}

// ---------- pannello laterale ----------
let drSalva=null,drElimina=null,drPrimaFocus=null;
function apriDrawer({n,titolo,campi,onSalva,onElimina,testoSalva='salva e pubblica'}){
  drPrimaFocus=document.activeElement;
  $('#drN').textContent=n;$('#drTitolo').textContent=titolo;$('#drCampi').innerHTML=campi;$('#drErr').textContent='';
  $('#drSalva').textContent=testoSalva;$('#drSalva').disabled=false;
  drSalva=onSalva;drElimina=onElimina;$('#drElimina').hidden=!onElimina;
  const d=$('#drawer'),v=$('#velo');d.hidden=false;v.hidden=false;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{d.classList.add('aperto');v.classList.add('aperto');}));
  setTimeout(()=>{const p=$('input,textarea',d);if(p)p.focus({preventScroll:true});},60);
}
function chiudiDrawer(subito=false){
  const d=$('#drawer'),v=$('#velo');if(d.hidden)return;
  d.classList.remove('aperto');v.classList.remove('aperto');
  const fine=()=>{if(!d.classList.contains('aperto')){d.hidden=true;v.hidden=true;}};
  const lento=!subito&&matchMedia('(prefers-reduced-motion:no-preference)').matches;
  lento?setTimeout(fine,360):fine();
  if(drPrimaFocus&&document.contains(drPrimaFocus))drPrimaFocus.focus({preventScroll:true});
}
$$('[data-chiudi]').forEach(b=>b.addEventListener('click',()=>chiudiDrawer()));
$('#velo').addEventListener('click',()=>chiudiDrawer());
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#drawer').hidden)chiudiDrawer();});
$('#drForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!drSalva)return;const b=$('#drSalva'),t=b.textContent;
  b.disabled=true;b.innerHTML='<span class="carica"></span> salvo…';$('#drErr').textContent='';
  try{await drSalva(new FormData($('#drForm')));chiudiDrawer();}
  catch(err){$('#drErr').textContent=err.message;}
  finally{b.disabled=false;b.textContent=t;}
});
$('#drElimina').addEventListener('click',async()=>{
  if(!drElimina||!confirm('Togliere questa voce? Resta comunque nella storia del sito su GitHub.'))return;
  try{await drElimina();chiudiDrawer();}catch(err){$('#drErr').textContent=err.message;}
});
const campo=(nome,etichetta,valore='',{max,area,tipo='text',aiuto='',attr=''}={})=>`<label><span class="lbl">${etichetta}${aiuto?' · '+aiuto:''}</span>${area?`<textarea name="${nome}" maxlength="${max||''}" ${attr}>${esc(valore)}</textarea>`:`<input type="${tipo}" name="${nome}" value="${esc(valore)}" ${max?`maxlength="${max}"`:''} ${attr}>`}</label>`;
const interruttore=(nome,etichetta,on)=>`<div class="riga"><span id="l-${nome}">${etichetta}</span><span class="swHit"><button type="button" class="sw" role="switch" aria-labelledby="l-${nome}" aria-checked="${!!on}" data-campo="${nome}"></button></span><input type="hidden" name="${nome}" value="${on?'1':''}"></div>`;
document.addEventListener('click',e=>{const s=e.target.closest('#drawer .sw');if(!s)return;const on=s.getAttribute('aria-checked')!=='true';s.setAttribute('aria-checked',on);$(`#drawer input[name="${s.dataset.campo}"]`).value=on?'1':'';});

// Posizione nell'elenco: serve sul telefono, dove non si trascina.
const posizione=(i,n)=>`<label class="riga"><span>posizione</span><select name="posizione" style="width:auto">${Array.from({length:n},(_,k)=>`<option value="${k}"${k===i?' selected':''}>${nn(k)}</option>`).join('')}</select></label>`;
const sposta=(el,da,a)=>{if(isNaN(a)||a===da)return el;const c=[...el];const [m]=c.splice(da,1);c.splice(a,0,m);return c;};

// ---------- immagini ----------
const urlImg=p=>stato.anteprime[p]||SITO+p;
const imgTag=(p,alt)=>`<img src="${esc(urlImg(p))}" alt="${esc(alt)}" class="${/\.png$/i.test(p)?'cut':''}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'lbl',textContent:'anteprima'}))">`;
function leggiFile(file){return new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>ko(new Error('File non leggibile'));r.readAsDataURL(file);});}

// ---------- progetti ----------
async function caricaProgetti(){const d=await api('GET','/api/progetti');stato.base.progetti=d.base;stato.progetti=d.progetti;}
async function salvaProgetti(elenco,msg='Salvato. Il sito si aggiorna in circa un minuto.'){
  try{const d=await api('PUT','/api/progetti',{base:stato.base.progetti,progetti:elenco});stato.base.progetti=d.base;stato.progetti=elenco;avviso(msg);}
  catch(e){if(await conflitto(e,async()=>{await caricaProgetti();disegnaProgetti();}))throw new Error('Dati ricaricati: riprova.');throw e;}
}
async function sezioneProgetti(){await caricaProgetti();disegnaProgetti();}
function disegnaProgetti(){
  const P=stato.progetti;
  $('#main').innerHTML=`<div class="hd"><h1 class="D">Progetti</h1><span class="lbl">${P.filter(p=>p.pubblicato).length} pubblicati su ${P.length} · trascina per riordinare<span id="pdfBox" hidden> · <a href="/api/portfolio" id="pdf" download>portfolio PDF ↓</a></span></span></div>
  <div class="cards" id="cards">${P.map((p,i)=>`<article class="c${p.pubblicato?'':' off'}" draggable="true" data-i="${i}">
    <button class="apri" type="button" aria-label="Modifica ${esc(p.nome)}"></button>
    <div class="im">${imgTag(p.anteprima,p.nome)}</div>
    <div class="tx"><span class="lbl">${nn(i)} · ${esc(p.tipo)}</span><b>${esc(p.nome)}${p.etichetta?`<span class="tag">${esc(p.etichetta)}</span>`:''}</b>
    <div class="ft"><span class="lbl">${p.pubblicato?esc(p.contesto):'nascosto'}</span><span class="swHit"><button type="button" class="sw" role="switch" aria-checked="${p.pubblicato}" aria-label="Pubblicato: ${esc(p.nome)}" data-i="${i}"></button></span></div></div>
  </article>`).join('')}<button class="nuovo" type="button" id="nuovoP">+ nuovo progetto</button></div>`;
  // il portfolio PDF è privato: si scarica da qui (lo genera la Action "Portfolio PDF")
  api('GET','/api/portfolio/info').then(d=>{const a=$('#pdf');if(!a||!d.pronto)return;
    a.textContent=`portfolio PDF ↓ ${new Date(d.aggiornato).toLocaleDateString('it-IT',{day:'numeric',month:'short'})} · ${(d.byte/1048576).toFixed(1)} MB`;$('#pdfBox').hidden=false;}).catch(()=>{});
  $$('#cards .apri').forEach(b=>b.addEventListener('click',()=>modificaProgetto(+b.closest('.c').dataset.i)));
  $$('#cards .sw').forEach(s=>s.addEventListener('click',async e=>{
    e.stopPropagation();const i=+s.dataset.i,el=stato.progetti.map(p=>({...p}));el[i].pubblicato=!el[i].pubblicato;
    s.setAttribute('aria-checked',el[i].pubblicato);s.disabled=true;
    try{await salvaProgetti(el,el[i].pubblicato?`${el[i].nome} è pubblicato.`:`${el[i].nome} è nascosto.`);}catch(err){avviso(err.message,true);}
    disegnaProgetti();
  }));
  $('#nuovoP').addEventListener('click',()=>modificaProgetto(-1));
  riordina($('#cards'),stato.progetti,async el=>{try{await salvaProgetti(el,'Nuovo ordine salvato.');}catch(e){avviso(e.message,true);}disegnaProgetti();});
}
// Trascinamento con il mouse (HTML5) e, da tastiera, Alt+↑/↓ sulla scheda.
function riordina(box,elenco,salva){
  let da=null;
  $$('.c',box).forEach(c=>{
    c.addEventListener('dragstart',e=>{da=+c.dataset.i;c.classList.add('presa');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',da);setTimeout(()=>c.classList.add('trascina'));});
    c.addEventListener('dragend',()=>{c.classList.remove('presa','trascina');$$('.sopra',box).forEach(x=>x.classList.remove('sopra'));});
    c.addEventListener('dragover',e=>{if(da===null)return;e.preventDefault();$$('.sopra',box).forEach(x=>x!==c&&x.classList.remove('sopra'));c.classList.add('sopra');});
    c.addEventListener('drop',e=>{e.preventDefault();const a=+c.dataset.i;if(da===null||a===da)return;const el=elenco.map(x=>({...x}));const [m]=el.splice(da,1);el.splice(a,0,m);da=null;salva(el);});
    c.addEventListener('keydown',e=>{if(!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const i=+c.dataset.i,j=i+(e.key==='ArrowUp'?-1:1);if(j<0||j>=elenco.length)return;const el=elenco.map(x=>({...x}));[el[i],el[j]]=[el[j],el[i]];salva(el);});
  });
}
function modificaProgetto(i){
  const nuovo=i<0,p=nuovo?{slug:'',nome:'',tipo:'',contesto:'',anteprima:'',pagina:false,pubblicato:false}:stato.progetti[i];
  let anteprima=p.anteprima;
  apriDrawer({
    n:nuovo?'nuovo progetto':`${nn(i)} · modifica`,titolo:nuovo?'Nuovo':p.nome,
    campi:`${campo('nome','nome',p.nome,{max:40})}
      ${nuovo?campo('slug','indirizzo','',{max:40,aiuto:'leandrohenriquez.com/lavori/…',attr:'pattern="[a-z0-9]+(-[a-z0-9]+)*" autocapitalize="off" spellcheck="false"'}):''}
      <div class="due">${campo('tipo','tipo',p.tipo,{max:40})}${campo('contesto','contesto',p.contesto,{max:40})}</div>
      <div class="due">${campo('anno','anno',p.anno||'',{max:4,attr:'inputmode="numeric" pattern="(19|20)[0-9]{2}"'})}${campo('etichetta','etichetta',p.etichetta||'',{max:6,aiuto:'es. 3D'})}</div>
      ${campo('descrizione','descrizione',p.descrizione||'',{max:420,area:true,aiuto:'va anche nel portfolio PDF'})}
      <div class="campo"><span class="lbl">anteprima · PNG scontornato o JPG, massimo 8 MB</span><div class="anteprima"><div class="th" id="thP">${anteprima?imgTag(anteprima,'anteprima'):''}</div><label class="btn">carica…<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden id="fileP"></label><span class="lbl" id="statoImg"></span></div></div>
      ${nuovo?'':posizione(i,stato.progetti.length)}
      ${interruttore('pubblicato','pubblicato nell\'indice',p.pubblicato)}
      ${p.pagina?`<div class="riga"><span>pagina con il 3D</span><a href="${SITO}lavori/${esc(p.slug)}/" target="_blank" rel="noopener">apri ↗</a></div>`:''}`,
    onElimina:nuovo?null:async()=>{
      try{const d=await api('DELETE',`/api/progetti/${encodeURIComponent(p.slug)}?base=${stato.base.progetti}`);stato.base.progetti=d.base;stato.progetti=stato.progetti.filter(x=>x.slug!==p.slug);avviso(`${p.nome} tolto dall'indice.`);disegnaProgetti();}
      catch(e){if(await conflitto(e,async()=>{await caricaProgetti();disegnaProgetti();}))throw new Error('Dati ricaricati: riprova.');throw e;}
    },
    onSalva:async f=>{
      const v={...p,nome:f.get('nome').trim(),tipo:f.get('tipo').trim(),contesto:f.get('contesto').trim(),anteprima,pubblicato:!!f.get('pubblicato')};
      for(const k of ['anno','etichetta','descrizione']){const x=(f.get(k)||'').trim();if(x)v[k]=x;else delete v[k];}
      if(!v.nome)throw new Error('Serve un nome.');if(!v.anteprima)throw new Error('Carica un\'immagine di anteprima.');
      if(nuovo){
        v.slug=(f.get('slug')||'').trim()||slugDa(v.nome);
        try{const d=await api('POST','/api/progetti',{base:stato.base.progetti,progetto:v});stato.base.progetti=d.base;stato.progetti=[...stato.progetti,d.progetto];avviso(`${v.nome} aggiunto in fondo all'indice.`);}
        catch(e){if(await conflitto(e,async()=>{await caricaProgetti();}))throw new Error('Dati ricaricati: riprova.');throw e;}
      }else{const el=sposta(stato.progetti.map(x=>x.slug===p.slug?v:x),i,+f.get('posizione'));await salvaProgetti(el);}
      disegnaProgetti();
    }
  });
  if(nuovo){const n=$('#drawer [name=nome]'),s=$('#drawer [name=slug]');let toccato=false;s.addEventListener('input',()=>toccato=true);n.addEventListener('input',()=>{if(!toccato)s.value=slugDa(n.value);$('#drTitolo').textContent=n.value||'Nuovo';});}
  $('#fileP').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    const slug=nuovo?(($('#drawer [name=slug]').value||'').trim()||slugDa($('#drawer [name=nome]').value)):p.slug;
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

// ---------- app del Laboratorio ----------
async function caricaApp(){const d=await api('GET','/api/app');stato.base.app=d.base;stato.app=d.app;}
async function salvaApp(el,msg='Salvato. Il Laboratorio si aggiorna in circa un minuto.'){
  try{const d=await api('PUT','/api/app',{base:stato.base.app,app:el});stato.base.app=d.base;stato.app=el;avviso(msg);}
  catch(e){if(await conflitto(e,async()=>{await caricaApp();disegnaApp();}))throw new Error('Dati ricaricati: riprova.');throw e;}
}
async function sezioneApp(){await caricaApp();disegnaApp();}
function disegnaApp(){
  const A=stato.app;
  $('#main').innerHTML=`<div class="hd"><h1 class="D">App</h1><span class="lbl">la pagina Laboratorio del sito · trascina per riordinare</span></div>
  <div class="cards" id="cards">${A.map((a,i)=>`<article class="c${a.pubblicato?'':' off'}" draggable="true" data-i="${i}">
    <button class="apri" type="button" aria-label="Modifica ${esc(a.nome)}"></button>
    <div class="tx"><span class="lbl">${nn(i)} · ${esc(a.tipo)}</span><b>${esc(a.nome)}<span class="tag${a.stato==='pronta'?' pieno':''}">${a.stato==='pronta'?'pronta':'in arrivo'}</span></b>
    <span class="lbl">${esc(a.descrizione||'')}</span>
    <div class="ft"><span class="lbl">${a.pubblicato?'pubblicata':'nascosta'}</span><span class="swHit"><button type="button" class="sw" role="switch" aria-checked="${a.pubblicato}" aria-label="Pubblicata: ${esc(a.nome)}" data-i="${i}"></button></span></div></div>
  </article>`).join('')}<button class="nuovo" type="button" id="nuovaA">+ nuova app</button></div>`;
  $$('#cards .apri').forEach(b=>b.addEventListener('click',()=>modificaApp(+b.closest('.c').dataset.i)));
  $$('#cards .sw').forEach(s=>s.addEventListener('click',async e=>{
    e.stopPropagation();const i=+s.dataset.i,el=stato.app.map(a=>({...a}));el[i].pubblicato=!el[i].pubblicato;s.disabled=true;
    try{await salvaApp(el,el[i].pubblicato?`${el[i].nome} è pubblicata.`:`${el[i].nome} è nascosta.`);}catch(err){avviso(err.message,true);}
    disegnaApp();
  }));
  $('#nuovaA').addEventListener('click',()=>modificaApp(-1));
  riordina($('#cards'),stato.app,async el=>{try{await salvaApp(el,'Nuovo ordine salvato.');}catch(e){avviso(e.message,true);}disegnaApp();});
}
function modificaApp(i){
  const nuova=i<0,a=nuova?{slug:'',nome:'',tipo:'',descrizione:'',stato:'in-arrivo',pubblicato:false}:stato.app[i];
  let html=null;
  apriDrawer({
    n:nuova?'nuova app':`${nn(i)} · modifica`,titolo:nuova?'Nuova':a.nome,testoSalva:nuova?'aggiungi':'salva e pubblica',
    campi:`${campo('nome','nome',a.nome,{max:40})}
      ${nuova?campo('slug','indirizzo','',{max:40,aiuto:'leandrohenriquez.com/app/…',attr:'autocapitalize="off" spellcheck="false"'}):''}
      ${campo('tipo','tipo',a.tipo,{max:30,aiuto:'es. calcolatore'})}
      ${campo('descrizione','descrizione',a.descrizione||'',{max:160,area:true})}
      <div class="campo"><span class="lbl">file dell'app · una pagina HTML completa, massimo 2 MB</span><div class="anteprima"><label class="btn">${a.stato==='pronta'?'sostituisci…':'carica…'}<input type="file" accept=".html,text/html" hidden id="fileA"></label><span class="lbl" id="statoFile">${a.stato==='pronta'?`<a href="${SITO}app/${esc(a.slug)}/" target="_blank" rel="noopener">apri quella online ↗</a>`:'nessun file: sul sito appare come “in arrivo”'}</span></div></div>
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
  if(nuova){const n=$('#drawer [name=nome]'),s=$('#drawer [name=slug]');let t=false;s.addEventListener('input',()=>t=true);n.addEventListener('input',()=>{if(!t)s.value=slugDa(n.value);$('#drTitolo').textContent=n.value||'Nuova';});}
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
    if(e.stato===503){$('#main').innerHTML=`<div class="hd"><h1 class="D">Statistiche</h1></div><div class="vuoto"><b>GoatCounter non è ancora collegato</b><span class="lbl">Servono il codice dell'account e una chiave API di sola lettura. Quando ci sono, qui compaiono visite, pagine, provenienza e azioni.</span></div>`;return;}
    throw e;
  }
  const tot=d.totale,giornate=d.perGiorno,picco=Math.max(1,...giornate.map(g=>g.visite));
  const telefoni=d.dispositivi.filter(x=>/phone|mobile/i.test(x.nome)).reduce((a,x)=>a+x.visite,0),tutti=d.dispositivi.reduce((a,x)=>a+x.visite,0);
  const ev=n=>{const r=d.eventi.find(x=>x.percorso===n);return r?r.visite:0;};
  const top=d.pagine[0];
  const data=s=>new Date(s+'T12:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'short'});
  $('#main').innerHTML=`<div class="hd"><h1 class="D">Statistiche</h1><div class="periodo" role="group" aria-label="Periodo">${[7,30,90].map(g=>`<button type="button" aria-pressed="${g===giorni}" data-g="${g}">${g} giorni</button>`).join('')}</div></div>
  <section class="stat">
    <div><span class="lbl">visite · ultimi ${d.periodo.giorni} giorni</span><div class="D hero">${tot}</div></div>
    <div class="chart"><svg id="barre" role="img" aria-label="Visite per giorno, picco ${picco}"></svg><div class="tip"></div></div>
    <div class="spec">
      <div><span class="lbl">visitatori unici</span><b>${d.unici}</b></div>
      <div><span class="lbl">pagina più vista</span><b>${esc(top?(top.titolo||top.percorso):'—')}</b></div>
      <div><span class="lbl">apri oopar</span><b>${ev('apri-oopar')}</b></div>
      <div><span class="lbl">email copiata</span><b>${ev('email-copiata')}</b></div>
      <div><span class="lbl">clic linkedin</span><b>${ev('clic-linkedin')}</b></div>
      <div><span class="lbl">da telefono</span><b>${tutti?Math.round(telefoni/tutti*100)+'%':'—'}</b></div>
    </div>
    <div><span class="lbl">da dove arrivano</span><div class="lista">${d.provenienza.map(p=>`<div><span>${esc(p.nome)}</span><span>${p.visite}</span></div>`).join('')||'<div><span class="lbl">ancora nessun dato</span><span></span></div>'}</div></div>
    <div><span class="lbl">pagine</span><div class="lista">${d.pagine.map(p=>`<div><span>${esc(p.titolo||p.percorso)} <span class="lbl">${esc(p.percorso)}</span></span><span>${p.visite}</span></div>`).join('')||'<div><span class="lbl">ancora nessun dato</span><span></span></div>'}</div></div>
  </section>`;
  $$('.periodo button').forEach(b=>b.addEventListener('click',()=>{giorni=+b.dataset.g;sezioneStatistiche().catch(e=>avviso(e.message,true));}));
  // istogramma: colonne con angoli di 4 px in alto, spazio 2 px, quota del picco tratteggiata
  const svg=$('#barre'),W=Math.max(300,svg.clientWidth||600),H=190,basso=20,alto=22,n=Math.max(1,giornate.length),bw=Math.max(2,W/n-2);
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  let g='',xs=[],ys=[];
  giornate.forEach((x,i)=>{const h=(x.visite/picco)*(H-alto-basso),X=i*(bw+2),Y=H-basso-h,r=Math.min(4,bw/2,h);xs.push(X+bw/2);ys.push(Y);
    g+=h>0?`<path d="M${X} ${H-basso} V${Y+r} Q${X} ${Y} ${X+r} ${Y} H${X+bw-r} Q${X+bw} ${Y} ${X+bw} ${Y+r} V${H-basso} Z" fill="#111"/>`:'';});
  const pk=giornate.findIndex(x=>x.visite===picco);
  g+=`<line x1="0" x2="${W}" y1="${H-basso}" y2="${H-basso}" stroke="#111"/>`;
  if(pk>=0&&giornate[pk].visite>0)g+=`<line x1="${xs[pk]}" x2="${W}" y1="${ys[pk]}" y2="${ys[pk]}" stroke="#111" stroke-dasharray="2 3"/><text x="${W}" y="${ys[pk]-6}" text-anchor="end" font-family="Roboto Mono" font-size="11">picco ${picco} · ${data(giornate[pk].giorno)}</text>`;
  if(giornate.length)g+=`<text x="0" y="${H-4}" font-family="Roboto Mono" font-size="11" fill="#5e5c57">${data(giornate[0].giorno)}</text><text x="${W}" y="${H-4}" text-anchor="end" font-family="Roboto Mono" font-size="11" fill="#5e5c57">${data(giornate.at(-1).giorno)}</text>`;
  svg.innerHTML=g;
  const tip=svg.parentNode.querySelector('.tip');
  svg.addEventListener('pointermove',e=>{if(!xs.length)return;const r=svg.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W;let i=0,b=1e9;xs.forEach((v,k)=>{if(Math.abs(v-x)<b){b=Math.abs(v-x);i=k;}});
    tip.textContent=`${data(giornate[i].giorno)} · ${giornate[i].visite} visite`;tip.style.left=(xs[i]/W*r.width)+'px';tip.style.top=(ys[i]/H*r.height)+'px';tip.classList.add('on');});
  svg.addEventListener('pointerleave',()=>tip.classList.remove('on'));
}

// ---------- accessi (solo proprietario) ----------
async function sezioneAccessi(){
  const d=await api('GET','/api/accessi');
  const riga=a=>`<div><span><b>${esc(a.email)}</b><br><span class="lbl">${esc(a.nota||'')}${a.aggiunta?` · aggiunta il ${esc(a.aggiunta)}`:''}</span></span><button type="button" class="btn" data-togli="${esc(a.email)}">togli</button></div>`;
  $('#main').innerHTML=`<div class="hd"><h1 class="D">Accessi</h1><span class="lbl">solo queste email entrano nel pannello</span></div>
  <div class="acc"><div><span><b>${esc(d.proprietario)}</b><br><span class="lbl">proprietario · entra sempre</span></span><span></span></div>${d.elenco.map(riga).join('')}</div>
  <form class="aggiungi" id="formAcc"><input type="email" name="email" placeholder="email Google" required autocomplete="off" aria-label="Email Google"><input type="text" name="nota" placeholder="nota, es. chi è" maxlength="80" aria-label="Nota"><button class="btn pri" type="submit">aggiungi</button></form>
  <p class="err" id="accErr2" role="alert"></p>`;
  $('#formAcc').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);
    try{await api('POST','/api/accessi',{email:f.get('email'),nota:f.get('nota')});avviso('Email aggiunta.');sezioneAccessi();}catch(err){$('#accErr2').textContent=err.message;}});
  $$('[data-togli]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm(`Togliere l'accesso a ${b.dataset.togli}?`))return;
    try{await api('DELETE',`/api/accessi/${encodeURIComponent(b.dataset.togli)}`);avviso('Accesso tolto.');sezioneAccessi();}catch(err){avviso(err.message,true);}}));
}

const SEZIONI={progetti:sezioneProgetti,app:sezioneApp,statistiche:sezioneStatistiche,accessi:sezioneAccessi};

// ---------- avvio ----------
(async()=>{try{stato.io=await api('GET','/api/io');avvia();}catch{mostraAccesso();}})();
