/* hl. — home "Manifesto" (variante D). Legge PROGETTI da assets/js/indice.js (generato dal pannello). */
(function(){
const M=document.getElementById('posters'),ADDR='henriquez.leandro.a@gmail.com';
const pad=i=>String(i+1).padStart(2,'0');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// ogni manifesto nasce da regole: angolo, inchiostri, lato; ogni strato ha una profondità d (quanto scorre)
const L=(d,cls,style,inner,ev)=>`<div class="lay ${cls}" data-d="${d}"${ev?` data-evita="${ev}"`:''} style="${style}">${inner}</div>`;
// le regole numeriche vengono dal tema (assets/tema/tema.css): angoli, riduzione sul telefono, parallasse
const CS=getComputedStyle(document.documentElement),num=(k,d)=>{const v=parseFloat(CS.getPropertyValue(k));return isNaN(v)?d:v;};
const ANG=(CS.getPropertyValue('--angoli').trim().split(/\s+/).map(Number).filter(n=>!isNaN(n))),ANGS=ANG.length?ANG:[0],
  ANGT=num('--angoli-telefono',.5);
M.innerHTML=PROGETTI.map((p,i)=>{const a=ANGS[i%ANGS.length],r=i%2,c=r?'var(--inchiostro-b)':'var(--inchiostro-a)',c2=r?'var(--inchiostro-a)':'var(--inchiostro-b)',n=esc(p.nome),
  fit=+(92/(.62*p.nome.length)).toFixed(1),long=p.nome.length>7,s=Math.min(23,fit),sp=Math.min(24,fit),img=BASE+p.anteprima,link=p.pagina?`lavori/${p.slug}/`:'';
  return `<section class="ps" id="p-${p.slug}" aria-labelledby="t-${p.slug}">
  ${L(.2,'t-name',`left:${long?-1:(r?40:-2)}vw;top:calc(var(--barra-alta) + ${long?`4vh + ${(Math.abs(Math.sin(a*Math.PI/180))*46).toFixed(1)}vw`:i%3*7+3+"vh"});--s:${s}vw;--sp:${sp}vw;rotate:${a}deg;--rp:${a*ANGT}deg`,`<h2 class="h" id="t-${p.slug}" style="color:${c}">${n}</h2>`,'.t-side')}
  ${L(.6,'t-ph ov',`left:${r?4:47}vw;top:calc(var(--barra-alta) + 9vh)`,`<div class="ph" style="--c:${c2}"><img src="${img}" alt="${n}, ${esc(p.tipo)}" loading="${i<2?'eager':'lazy'}" decoding="async"><div class="tint"></div></div><div class="ph reg" style="--c:#fff" aria-hidden="true"><img src="${img}" alt="" loading="lazy" decoding="async"></div>`)}
  ${L(1,'t-meta lt',`left:${r?52:5}vw;bottom:9vh;--s:5.2vw`,`${pad(i)}/${PROGETTI.length}<br>${esc(p.tipo)}`)}
  ${L(1.3,'t-side m',`right:4vw;top:calc(var(--barra-alta) + 5vh);text-align:right`,`${esc(p.contesto||'')}<br>oggetto n. ${pad(i)}`)}
  ${L(.9,'bar',`left:-5vw;right:-5vw;top:${42+i%3*6}vh;rotate:${-a/2}deg`,'')}
  ${link?`<a class="card" href="${link}" data-slug="${p.slug}" aria-label="Apri il progetto ${n}"></a><span class="go" style="${r?'left:4vw':'right:4vw'};bottom:3vh" aria-hidden="true">apri il progetto${p.etichetta?' in '+esc(p.etichetta):''} →</span>`:''}
  </section>`;}).join('');
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

// profondità: gli strati scorrono a velocità diverse (parallasse, niente deformazioni), tutta in CSS con animation-timeline
// (manifesto.css): la calcola il compositore insieme allo scroll. Dove il browser non la supporta (Firefox, Safari prima del 26)
// gli strati restano fermi: una parallasse via script resterebbe indietro rispetto allo scroll e farebbe tremare la pagina.
const S=[...document.querySelectorAll('.ps')],cnt=document.getElementById('cnt');
S.forEach(s=>s.querySelectorAll('.lay').forEach(l=>l.style.setProperty('--d',l.dataset.d||0)));
// contatore in alto: cambia quando una schermata occupa più di metà vista
let last='';const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const sec=e.target,
  t=sec.dataset.n||(sec.id.startsWith('p-')?pad(S.indexOf(sec)-1)+'/'+PROGETTI.length:'');if(t!==last){last=t;cnt.textContent=t;}}),{threshold:.5});
S.forEach(s=>io.observe(s));

// titoli interi nella schermata ferma: se un titolo esce dalla vista (o finisce sotto i testi indicati in data-evita)
// si rimpicciolisce (--k) e si sposta (translate) quanto basta. Si ricalcola solo quando cambia la larghezza.
const adatta=()=>{const R=document.documentElement;R.classList.add('misura');
  const ba=parseFloat(getComputedStyle(R).getPropertyValue('--barra-alta'))||0,W=innerWidth,m=Math.max(6,W*.015),g=m;
  const T=[...document.querySelectorAll('.ps .lay')].filter(l=>l.querySelector('.h'));
  T.forEach(l=>{l.style.removeProperty('--k');l.style.translate='';});
  const rel=(e,st)=>{const q=e.getBoundingClientRect();return {x0:q.left,x1:q.right,y0:q.top-st,y1:q.bottom-st};};
  const J=T.map(l=>{const s=l.closest('.ps'),st=s.getBoundingClientRect().top,H=s.offsetHeight,r=rel(l.querySelector('.h'),st);
    let B=[{x0:m,x1:W-m,y0:ba+m,y1:H-m}];
    (l.dataset.evita?[...s.querySelectorAll(l.dataset.evita)]:[]).forEach(e=>{const o=rel(e,st);
      B=B.flatMap(b=>o.x1<=b.x0||o.x0>=b.x1||o.y1<=b.y0||o.y0>=b.y1?[b]:[{...b,x1:Math.min(b.x1,o.x0-g)},{...b,x0:Math.max(b.x0,o.x1+g)},{...b,y1:Math.min(b.y1,o.y0-g)},{...b,y0:Math.max(b.y0,o.y1+g)}].filter(c=>c.x1-c.x0>40&&c.y1-c.y0>30));});
    const w=r.x1-r.x0,h=r.y1-r.y0;let best=null;
    B.forEach(b=>{const k=Math.min(1,(b.x1-b.x0)/w,(b.y1-b.y0)/h),d=Math.hypot(Math.max(0,b.x0-r.x0,r.x1-b.x1),Math.max(0,b.y0-r.y0,r.y1-b.y1));
      if(!best||k>best.k+.01||(Math.abs(k-best.k)<=.01&&d<best.d))best={b,k,d};});
    return {l,s,best};});
  J.forEach(j=>{if(j.best&&j.best.k<1)j.l.style.setProperty('--k',(j.best.k*.98).toFixed(3));});
  const M=J.map(j=>{if(!j.best)return null;const st=j.s.getBoundingClientRect().top,r=rel(j.l.querySelector('.h'),st),b=j.best.b;
    const dx=r.x0<b.x0?b.x0-r.x0:r.x1>b.x1?b.x1-r.x1:0,dy=r.y0<b.y0?b.y0-r.y0:r.y1>b.y1?b.y1-r.y1:0;return [dx,dy];});
  J.forEach((j,i)=>{const v=M[i];if(v&&(v[0]||v[1]))j.l.style.translate=`${v[0].toFixed(1)}px ${v[1].toFixed(1)}px`;});
  R.classList.remove('misura');};
let lw=innerWidth,tw;(document.fonts?document.fonts.ready:Promise.resolve()).then(adatta);
addEventListener('resize',()=>{if(innerWidth===lw)return;lw=innerWidth;clearTimeout(tw);tw=setTimeout(adatta,150);});
})();
