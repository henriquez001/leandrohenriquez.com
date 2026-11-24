/* Stile «bianco»: comportamento comune a tutte le pagine. Niente librerie.
   Il movimento parte solo se la pagina ha la classe html.mv (messa in testa quando «riduci movimento» è spento). */
(function(){
'use strict';
var D=document.documentElement, MV=D.classList.contains('mv'), largo=matchMedia('(min-width:901px)'), fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
function $(s,r){ return (r||document).querySelector(s); }
function $$(s,r){ return [].slice.call((r||document).querySelectorAll(s)); }
function conta(nome){ try{ if(window.goatcounter&&goatcounter.count) goatcounter.count({path:nome,title:nome,event:true}); }catch(e){} }
document.addEventListener('click',function(e){ var a=e.target.closest('[data-conta]'); if(a) conta(a.dataset.conta); });

/* menu del telefono */
var tr=$('#tr'), menu=$('#menu');
function apri(on){ if(!menu) return; menu.classList.toggle('open',on); tr.setAttribute('aria-expanded',on); }
if(tr){ tr.addEventListener('click',function(){ apri(!menu.classList.contains('open')); }); menu.addEventListener('click',function(e){ if(e.target.closest('a')) apri(false); }); addEventListener('keydown',function(e){ if(e.key==='Escape') apri(false); }); }

/* Lavori: filtri, puntini, Prec e Succ */
var righe=$$('.riga'), punti=$$('.punti a'), qui=0, filtri=$('#filtri'), puntiEl=$('#punti');
if(righe.length&&'IntersectionObserver' in window){
  var io2=new IntersectionObserver(function(es){ es.forEach(function(e){ if(!e.isIntersecting) return; qui=righe.indexOf(e.target); punti.forEach(function(a,j){ a.classList.toggle('qui',j===qui); }); }); },{rootMargin:'-50% 0px -50% 0px'});
  righe.forEach(function(r){ io2.observe(r); });
}
function vaiA(el){ el.scrollIntoView({behavior:MV?'smooth':'auto',block:'center'}); }
if(puntiEl) puntiEl.addEventListener('click',function(e){ var b=e.target.closest('button'), a=e.target.closest('a');
  if(b){ var v=righe.filter(function(r){ return !r.hidden; }); if(!v.length) return; var k=v.indexOf(righe[qui]); vaiA(v[Math.max(0,Math.min(v.length-1,(k<0?0:k)+(+b.dataset.d)))]); }
  if(a){ e.preventDefault(); vaiA(righe[punti.indexOf(a)]); } });
if(filtri) filtri.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b) return; var f=b.dataset.f;
  $$('button',filtri).forEach(function(x){ x.setAttribute('aria-pressed',x===b); });
  righe.forEach(function(r,i){ var ok=!f||r.dataset.g===f||r.dataset.c.indexOf(f)>=0; r.hidden=!ok; if(punti[i]) punti[i].hidden=!ok; });
  scrollTo({top:0,behavior:MV?'smooth':'auto'}); });

/* Contatti: il modulo prepara l'email nel programma di posta, il sito non salva niente */
document.addEventListener('submit',function(e){ var f=e.target.closest('.modulo'); if(!f) return; e.preventDefault(); var ok=true;
  $$('[required]',f).forEach(function(c){ var k=!c.value.trim(); c.setAttribute('aria-invalid',k); if(k) ok=false; }); if(!ok) return;
  conta('email-preparata');
  location.href='mailto:'+f.dataset.a+'?subject='+encodeURIComponent('Nuovo progetto · '+f.n.value)+'&body='+encodeURIComponent(f.d.value+'\n\n'+f.n.value+(f.a.value?' · '+f.a.value:'')); });

if(!MV) return;

/* ---- movimento ---- */
function parole(el,c){ el.setAttribute('aria-label',el.textContent); el.innerHTML=el.textContent.trim().split(/\s+/).map(function(w,i){ return c?'<span class="k" aria-hidden="true">'+w+'</span>':'<span class="w" aria-hidden="true" style="--i:'+i+'"><span>'+w+'</span></span>'; }).join(' '); }
var primo=D.classList.contains('primo'), arrivo=D.classList.contains('arrivo'), attesa=primo?1300:arrivo?520:80;
/* ingresso con il marchio, una volta per visita */
var intro=$('.intro'); if(intro&&primo){ setTimeout(function(){ intro.classList.add('via'); },1250); setTimeout(function(){ D.classList.remove('primo'); },2300); }
/* sipario: sale con il nome della pagina, poi la pagina nuova lo alza */
var tenda=$('.tenda'), inCorso=false;
if(tenda){
  if(arrivo) tenda.animate([{transform:'none'},{transform:'translateY(-100%)'}],{duration:620,delay:140,easing:'cubic-bezier(.7,0,.2,1)',fill:'forwards'}).finished.then(function(){ D.classList.remove('arrivo'); });
  document.addEventListener('click',function(e){ var a=e.target.closest('a[href]'); if(!a||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button||a.target||a.hasAttribute('download')) return;
    var u; try{ u=new URL(a.href); }catch(x){ return; }
    if(u.origin!==location.origin||u.pathname===location.pathname||/^\/(vitrum|app)\//.test(u.pathname)) return;
    e.preventDefault(); if(inCorso) return; inCorso=true; tenda.textContent=a.dataset.nome||a.textContent.replace(/[←→↗]/g,'').trim().split('\n')[0].slice(0,40)||'henriquez';
    try{ sessionStorage.setItem('tenda','1'); }catch(x){}
    tenda.getAnimations().forEach(function(n){ n.cancel(); }); tenda.classList.add('attiva');
    var va=function(){ location.href=a.href; };
    tenda.animate([{transform:'translateY(100%)'},{transform:'none'}],{duration:520,easing:'cubic-bezier(.7,0,.2,1)',fill:'forwards'}).finished.then(va,va); });
  /* tornando indietro il browser può ridare la pagina com'era: il sipario va tolto */
  addEventListener('pageshow',function(e){ if(e.persisted){ inCorso=false; tenda.classList.remove('attiva'); tenda.getAnimations().forEach(function(n){ n.cancel(); }); D.classList.remove('arrivo'); try{ sessionStorage.removeItem('tenda'); }catch(x){} } });
}
/* titoli parola per parola */
$$('h1[data-parole]').forEach(function(h){ parole(h); setTimeout(function(){ h.classList.add('on'); },attesa); });
$$('.frasi h2,.frasi h3').forEach(function(h){ parole(h,1); });
/* comparsa una volta */
var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); },{rootMargin:'0px 0px -10% 0px'});
$$('.rv').forEach(function(el){ io.observe(el); });
/* legati allo scorrimento, 1 a 1: scritta gigante, frasi, immagini */
var banda=$('#banda'), frasi=$$('.frasi h2,.frasi h3'), IM=$$('.riga .im img'), er=$('.apri .scena img'), att=false;
function muovi(){ att=false; var H=innerHeight;
  if(banda){ var b=banda.getBoundingClientRect(); if(b.top<H&&b.bottom>0) banda.style.transform='translateX('+(-(H-b.top)*.55).toFixed(1)+'px)'; }
  frasi.forEach(function(h){ var r=h.getBoundingClientRect(); if(r.bottom<0||r.top>H) return; var q=(H*.9-r.top)/(H*.5), ks=h.children, n=Math.round(Math.max(0,Math.min(1,q))*ks.length); for(var i=0;i<ks.length;i++) ks[i].classList.toggle('acc',i<n); });
  if(!largo.matches) return;
  IM.forEach(function(el,i){ var r=el.parentNode.getBoundingClientRect(); if(!r.height||r.bottom<-200||r.top>H+200) return; el.style.translate='0 '+((r.top+r.height/2-H/2)*(i%2?-.06:.06)).toFixed(1)+'px'; });
  if(er) er.style.translate='0 '+(scrollY*-.05).toFixed(1)+'px'; }
addEventListener('scroll',function(){ if(!att){ att=true; requestAnimationFrame(muovi); } },{passive:true}); muovi();
/* cerchio «Apri» sui lavori: segue il puntatore 1 a 1, quello di sistema resta */
if(fine&&$('.riga,.pross')){ var cur=document.createElement('div'); cur.className='cur'; cur.textContent='Apri'; cur.setAttribute('aria-hidden','true'); document.body.appendChild(cur);
  addEventListener('pointermove',function(e){ cur.style.translate=e.clientX+'px '+e.clientY+'px'; cur.classList.toggle('su',!!e.target.closest('.riga,.pross')); },{passive:true}); }
})();
