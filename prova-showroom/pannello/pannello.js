/* Prova pannello showroom (dati veri dei progetti da indice.js, statistiche di esempio, niente salvataggi).
   Vetrina: il progetto scelto sta sul palco con i campi da modificare, gli altri sono nella striscia.
   Mosaico: le tessere come in home; toccandone una si apre il foglio di modifica, che nasce dalla tessera. */
(function(){
'use strict';
var board=document.getElementById('board'), ed=document.getElementById('ed'), foglio=document.getElementById('foglio'), velo=document.getElementById('velo');
var COLORE={one:'#F2C230', hydra:'#1B1B1B', baiyun:'#8FD3CF', brtw:'#D9DCDA', 'green-hero':'#E8692A', andy:'#A9C9B5', otto:'#E4E2DF', frank:'#F0E6D8', oopar:'#C5C7C8', 'la-fornace':'#2A2622'};
var SCURI={hydra:1,'la-fornace':1}, FOTO={oopar:'vitrum/img/oopar-tre-quarti.webp', otto:'assets/showroom/otto.webp'};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
var P=(typeof PROGETTI!=='undefined'?PROGETTI:[]).slice(), sel=0, pad=function(i){return String(i+1).padStart(2,'0');};
function src(p){return '../../'+(FOTO[p.slug]||p.anteprima);}
function foto(p){return !/\.png$/i.test(FOTO[p.slug]||p.anteprima);}
var tile=P.map(function(p,i){
  var a=document.createElement('article'); a.className='t prj'+(foto(p)?' foto':''); a.style.setProperty('--bg',COLORE[p.slug]||'#E6E6E3');
  if(SCURI[p.slug]||foto(p)) a.style.setProperty('--tx','var(--carta)');
  a.innerHTML='<div class="in"><img class="im" src="'+esc(src(p))+'" alt="">'+
    '<div class="row"><span class="mono">'+pad(i)+' · '+esc(p.tipo)+'</span><span class="mono">'+esc(p.contesto)+'</span></div>'+
    '<div class="bot"><h2 class="nm">'+esc(p.nome)+'</h2></div><button class="hit" type="button" aria-label="Modifica '+esc(p.nome)+'"></button></div>'+
    '<button class="sw" type="button" role="switch" aria-checked="true" aria-label="'+esc(p.nome)+' sul sito"></button>';
  a.querySelector('.hit').addEventListener('click',function(){ apri(i,a); });
  var sw=a.querySelector('.sw'); sw.addEventListener('click',function(e){ e.stopPropagation(); var on=sw.getAttribute('aria-checked')!=='true'; sw.setAttribute('aria-checked',String(on)); a.classList.toggle('off',!on);
    document.getElementById('nOn').textContent=board.querySelectorAll('.prj:not(.off)').length; });
  board.insertBefore(a,board.querySelector('.stile-t'));
  return a;
});
function form(p,i){
  return '<div class="vis'+(foto(p)?' foto':'')+'"><span class="mono">'+pad(i)+' · '+esc(p.tipo)+'</span><img src="'+esc(src(p))+'" alt=""><span class="nm2">'+esc(p.nome)+'</span></div>'+
  '<form onsubmit="return false"><div class="riga"><span>Sul sito</span><button class="sw" type="button" role="switch" aria-checked="true" aria-label="Sul sito"></button></div>'+
  '<div class="due"><label>Nome<input value="'+esc(p.nome)+'"></label><label>Anno<input value="" placeholder="es. 2025" inputmode="numeric"></label></div>'+
  '<div class="due"><label>Tipo<input value="'+esc(p.tipo)+'"></label><label>Contesto<input value="'+esc(p.contesto)+'"></label></div>'+
  '<label>Descrizione<textarea rows="3" placeholder="Fino a 420 caratteri: compare nella vetrina e nel PDF."></textarea></label>'+
  '<div class="due"><label>Colore della tessera<input value="'+esc(COLORE[p.slug]||'')+'"></label><label>Immagine<input value="'+esc((FOTO[p.slug]||p.anteprima).split('/').pop())+'"></label></div>'+
  '<div class="acts"><button class="btn scuro" type="button">Salva e pubblica</button><button class="btn vuoto" type="button">Salva bozza</button></div></form>';
}
function colora(el,p){ el.style.setProperty('--bg',COLORE[p.slug]||'#E6E6E3'); el.style.setProperty('--tx',SCURI[p.slug]?'var(--carta)':'var(--ink)'); }
function scegli(i){ sel=i; var p=P[i]; colora(ed,p); ed.querySelector('.in').innerHTML=form(p,i); tile.forEach(function(t,j){t.classList.toggle('sel',j===i&&board.dataset.v==='vetrina');}); }
function apri(i,a){
  if(board.dataset.v==='vetrina'){ scegli(i); ed.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'}); return; }
  var p=P[i]; colora(foglio,p); foglio.querySelector('.in').innerHTML=form(p,i)+'<button class="x" type="button" aria-label="Chiudi">✕</button>';
  foglio.hidden=false; velo.hidden=false;
  // il foglio nasce dalla tessera toccata (apple-motion: le finestre nascono da chi le apre)
  var r=a.getBoundingClientRect(), f=foglio.getBoundingClientRect(), sx=r.width/f.width, sy=r.height/f.height;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    foglio.style.transition='none'; foglio.style.transform='translate('+(r.left+r.width/2-(f.left+f.width/2))+'px,'+(r.top+r.height/2-(f.top+f.height/2))+'px) scale('+sx+','+sy+')';
    foglio.getBoundingClientRect(); foglio.style.transition=''; foglio.style.transform=''; }
  requestAnimationFrame(function(){velo.classList.add('on');});
  foglio.querySelector('.x').addEventListener('click',chiudi); foglio.querySelector('input').focus({preventScroll:true});
}
function chiudi(){ velo.classList.remove('on'); foglio.hidden=true; setTimeout(function(){velo.hidden=true;},250); }
velo.addEventListener('click',chiudi); addEventListener('keydown',function(e){ if(e.key==='Escape'&&!foglio.hidden) chiudi(); });
document.addEventListener('vista',function(){ scegli(sel); });
scegli(0);
// grafico di esempio
var g=document.getElementById('graf'), h='', v=[34,41,38,55,62,48,44,51,70,66,58,49,53,61,112,90,72,64,59,57,63,68,71,60,55,52,49,58,62,66];
v.forEach(function(x,i){ var hh=x/112*190; h+='<rect'+(x===112?'':' class="b"')+' x="'+(i*20+2)+'" y="'+(200-hh)+'" width="16" height="'+hh+'" rx="3"/>'; }); g.innerHTML=h;
})();
