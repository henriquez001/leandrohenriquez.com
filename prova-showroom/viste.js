/* Prove showroom: il menu Vetrina/Mosaico delle pagine (come in home). Le tessere sono le stesse nelle due viste:
   cambia solo il loro posto sulla griglia; il passaggio è animato con FLIP (posizione prima → dopo, poi la tessera
   scivola). Interrompibile: un nuovo clic riparte dalla posizione in cui le tessere si trovano. La scelta resta
   salvata nel browser (stessa chiave "hl-vista" della home). */
(function(){
'use strict';
var board=document.getElementById('board'), seg=document.getElementById('vista'); if(!board||!seg) return;
var btns=[].slice.call(seg.querySelectorAll('button')), reduce=matchMedia('(prefers-reduced-motion: reduce)');
function leggi(){ var q=(location.search.match(/[?&]vista=(vetrina|mosaico)/)||[])[1]; if(q) return q;
  try{ var v=localStorage.getItem('hl-vista'); if(v==='vetrina'||v==='mosaico') return v; }catch(e){} return 'vetrina'; }
function metti(v,anima){
  var tile=[].slice.call(board.children), prima=anima&&!reduce.matches?tile.map(function(t){return t.getBoundingClientRect();}):null;
  board.dataset.v=v; seg.dataset.v=v; btns.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.v===v));});
  try{localStorage.setItem('hl-vista',v);}catch(e){}
  document.dispatchEvent(new CustomEvent('vista',{detail:v}));
  if(!prima) return;
  tile.forEach(function(t,i){ var a=prima[i], b=t.getBoundingClientRect(); if(!b.width||!a.width){return;}
    var dx=a.left-b.left, dy=a.top-b.top, sx=a.width/b.width, sy=a.height/b.height;
    if(Math.abs(dx)<1&&Math.abs(dy)<1&&Math.abs(sx-1)<.01&&Math.abs(sy-1)<.01) return;
    t.style.transition='none'; t.style.transform='translate('+dx+'px,'+dy+'px) scale('+sx+','+sy+')';
    var inn=t.querySelector('.in'); if(inn){inn.style.transition='none';inn.style.transform='scale('+(1/sx)+','+(1/sy)+')';}
    t.getBoundingClientRect();
    t.style.transition='transform .55s cubic-bezier(.2,.8,.2,1)'; t.style.transform='';
    if(inn){inn.style.transition='transform .55s cubic-bezier(.2,.8,.2,1)';inn.style.transform='';}
  });
}
btns.forEach(function(b){ b.addEventListener('click',function(){ if(board.dataset.v!==b.dataset.v) metti(b.dataset.v,true); }); });
metti(leggi(),false);
window.VISTE={metti:metti};
})();
