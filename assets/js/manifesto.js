/* hl. — home "Manifesto" (variante D). Legge PROGETTI da assets/js/indice.js (generato dal pannello). */
(function(){
const M=document.getElementById('posters'),ADDR='henriquez.leandro.a@gmail.com';
const pad=i=>String(i+1).padStart(2,'0');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// ogni manifesto nasce da regole: angolo, inchiostri, lato; ogni strato ha una profondità d (quanto scorre)
const L=(d,cls,style,inner)=>`<div class="lay ${cls}" data-d="${d}" style="${style}">${inner}</div>`;
// le regole numeriche vengono dal tema (assets/tema/tema.css): angoli, riduzione sul telefono, parallasse
const CS=getComputedStyle(document.documentElement),num=(k,d)=>{const v=parseFloat(CS.getPropertyValue(k));return isNaN(v)?d:v;};
const ANG=(CS.getPropertyValue('--angoli').trim().split(/\s+/).map(Number).filter(n=>!isNaN(n))),ANGS=ANG.length?ANG:[0],
  ANGT=num('--angoli-telefono',.5),PAR=num('--parallasse',60);
M.innerHTML=PROGETTI.map((p,i)=>{const a=ANGS[i%ANGS.length],r=i%2,c=r?'var(--inchiostro-b)':'var(--inchiostro-a)',c2=r?'var(--inchiostro-a)':'var(--inchiostro-b)',n=esc(p.nome),
  fit=+(92/(.62*p.nome.length)).toFixed(1),long=p.nome.length>7,s=Math.min(23,fit),sp=Math.min(24,fit),img=BASE+p.anteprima,link=p.pagina?`lavori/${p.slug}/`:'';
  return `<section class="ps" id="p-${p.slug}" aria-labelledby="t-${p.slug}">
  ${L(.2,'t-name ov',`left:${long?-1:(r?40:-2)}vw;top:calc(var(--barra-alta) + ${long?`4vh + ${(Math.abs(Math.sin(a*Math.PI/180))*46).toFixed(1)}vw`:i%3*7+3+"vh"});--s:${s}vw;--sp:${sp}vw;rotate:${a}deg;--rp:${a*ANGT}deg`,`<h2 class="h" id="t-${p.slug}" style="color:${c}">${n}</h2>`)}
  ${L(.6,'t-ph ov',`left:${r?4:47}vw;top:calc(var(--barra-alta) + 9vh)`,`<div class="ph" style="--c:${c2}"><img src="${img}" alt="${n}, ${esc(p.tipo)}" loading="${i<2?'eager':'lazy'}" decoding="async"><div class="tint"></div></div>`)}
  ${L(.6,'t-ph reg2 ov',`left:calc(${r?4:47}vw + var(--fuori-registro-x));top:calc(var(--barra-alta) + 9vh + var(--fuori-registro-y))`,`<div class="ph reg" style="--c:#fff"><img src="${img}" alt="" loading="lazy" decoding="async"></div>`)}
  ${L(1,'t-meta lt',`left:${r?52:5}vw;bottom:9vh;--s:5.2vw`,`${pad(i)}/${PROGETTI.length}<br>${esc(p.tipo)}`)}
  ${L(1.3,'t-side m',`right:4vw;top:calc(var(--barra-alta) + 5vh);text-align:right`,`${esc(p.contesto||'')}<br>oggetto n. ${pad(i)}`)}
  ${L(.9,'bar',`left:-5vw;right:-5vw;top:${58+i%3*8}vh;rotate:${-a/2}deg`,'')}
  ${link?`<a class="card" href="${link}" data-slug="${p.slug}" aria-label="Apri il progetto ${n}"></a><span class="go" style="${r?'left:4vw':'right:4vw'};bottom:3vh" aria-hidden="true">apri il progetto${p.etichetta?' in '+esc(p.etichetta):''} →</span>`:''}
  <div class="dots"></div></section>`;}).join('');
document.querySelectorAll('.cntot').forEach(e=>e.textContent=PROGETTI.length);

// statistiche (nomi letti dal pannello): apri-<progetto>, clic-linkedin, email-copiata
document.querySelectorAll('a.card').forEach(a=>a.addEventListener('click',()=>conta('apri-'+a.dataset.slug)));
document.querySelectorAll('a[href*="linkedin.com"]').forEach(a=>a.addEventListener('click',()=>conta('clic-linkedin')));
const cp=document.getElementById('copied'),mail=document.getElementById('mail');
const ok=()=>{conta('email-copiata');cp.textContent='indirizzo copiato ✓';cp.style.opacity=1;setTimeout(()=>cp.style.opacity=0,1400);};
const legacy=()=>{const t=document.createElement('textarea');t.value=ADDR;document.body.appendChild(t);t.select();try{document.execCommand('copy');ok();}catch(e){location.href='mailto:'+ADDR;}t.remove();};
mail.addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;e.preventDefault();if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(ADDR).then(ok,legacy);else legacy();});

// orologio di Macerata
const clk=[...document.querySelectorAll('.clock')];const tick=()=>{const t=new Date().toLocaleTimeString('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit'});clk.forEach(c=>c.textContent=t);};tick();setInterval(tick,15000);

// menu del telefono (scelta del 3/11: pulsante "menu" con foglio a tutto schermo)
const mb=document.getElementById('mbtn'),sh=document.getElementById('msheet');
const setM=on=>{sh.classList.toggle('on',on);mb.setAttribute('aria-expanded',on);mb.textContent=on?'chiudi':'menu';};
mb.addEventListener('click',()=>setM(!sh.classList.contains('on')));sh.addEventListener('click',e=>{if(e.target.closest('a'))setM(false);});
addEventListener('keydown',e=>{if(e.key==='Escape')setM(false);});

// profondità: gli strati scorrono a velocità diverse (parallasse, niente deformazioni). Prima tutte le letture, poi le scritture.
const S=[...document.querySelectorAll('.ps')],cnt=document.getElementById('cnt'),LAY=S.map(s=>[...s.querySelectorAll('.lay')].map(l=>({l,d:+l.dataset.d,v:''})));
const RMQ=matchMedia('(prefers-reduced-motion: reduce)');
let last='';
function frame(){const H=innerHeight,R=S.map(s=>s.getBoundingClientRect().top/H);let cur=-1;
  R.forEach((o,k)=>{if(Math.abs(o)<.5)cur=k;if(o>1.2||o<-1.2||RMQ.matches||!PAR)return;
    LAY[k].forEach(x=>{const v=`translateY(${(o*x.d*-PAR).toFixed(1)}vh)`;if(v!==x.v){x.v=v;x.l.style.transform=v;}});});
  const sec=S[cur],t=sec?(sec.dataset.n||(sec.id.startsWith('p-')?pad(S.indexOf(sec)-1)+'/'+PROGETTI.length:'')):'';
  if(t!==last){last=t;cnt.textContent=t;}
  requestAnimationFrame(frame);}
requestAnimationFrame(frame);
})();
