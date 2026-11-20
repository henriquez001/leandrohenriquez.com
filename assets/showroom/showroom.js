/* Stile "showroom": home con due viste, Vetrina e Mosaico (scelta di Leandro del 19/11/2026).
   - I progetti vengono da PROGETTI (assets/js/indice.js, generato da data/progetti.json): se ne aggiungi o togli uno
     dal pannello, la griglia si ricompone da sola. Descrizione e anno arrivano da data/progetti.json.
   - Il menu in alto a destra sceglie la vista; la scelta resta salvata nel browser (localStorage "hl-vista").
   - Le tessere sono sempre le stesse: cambia solo il loro posto sulla griglia. Il passaggio è animato con FLIP
     (posizione prima, posizione dopo, poi la tessera scivola dalla prima alla seconda con una molla senza rimbalzo;
     il contenuto è contro-scalato, quindi il testo non si deforma). Se l'animazione è in corso e arriva un nuovo
     comando, riparte dal punto in cui si trova (interrompibile).
   - Cliccando un progetto lo si porta "in evidenza": nella Vetrina diventa il palco grande, nel Mosaico la tessera grande.
   - Colori: le immagini non hanno filtri. Il fondo delle tessere è il colore pieno del prodotto, scelto a mano in
     assets/showroom/colori.js (COLORI, SCURI per il testo chiaro). Per un progetto nuovo senza colore lo si calcola
     dall'immagine (tinta dominante, funzione tinta). Le foto riempiono la tessera. */
(function(){
'use strict';
var board=document.getElementById('board'); if(!board) return;
var seg=document.getElementById('vista'), btns=[].slice.call(seg.querySelectorAll('button'));
var reduce=matchMedia('(prefers-reduced-motion: reduce)');
// immagini più grandi di quelle dell'indice, dove esistono (lo slug è quello di data/progetti.json)
var FOTO=typeof FOTO_GRANDI!=='undefined'?FOTO_GRANDI:{};
var COL=typeof COLORI!=='undefined'?COLORI:{}, SCU=typeof SCURI!=='undefined'?SCURI:{};
var P=(typeof PROGETTI!=='undefined'?PROGETTI:[]).slice();
var pad=function(i){return String(i+1).padStart(2,'0');};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
var conta=function(n){try{if(window.goatcounter&&goatcounter.count)goatcounter.count({path:n,title:n,event:true});}catch(e){}};

/* ---------- tessere ---------- */
var intro=board.querySelector('.intro'), stats=[].slice.call(board.querySelectorAll('.stat')),
    proc=board.querySelector('.proc'), chi=board.querySelector('.chi'), cont=board.querySelector('.cont');
board.querySelectorAll('[data-n-progetti]').forEach(function(e){e.textContent=P.length;});
var prj=P.map(function(p,i){
  var src=FOTO[p.slug]||p.anteprima, foto=!/\.png$/i.test(src), link=p.pagina?'lavori/'+p.slug+'/':'';
  var a=document.createElement('article');
  a.className='t prj'+(foto?' foto':''); a.dataset.slug=p.slug;
  a.style.setProperty('--len',Math.max(3,p.nome.replace(/^Hydra /,'').length));
  a.innerHTML='<div class="in"><span class="ol" aria-hidden="true">'+esc(p.nome.replace(/^Hydra /,''))+'</span>'+
    '<img class="im" src="'+esc(src)+'" alt="'+esc(p.nome+', '+p.tipo)+'" decoding="async">'+
    '<div class="row"><span class="mono">'+pad(i)+' · '+esc(p.tipo)+'</span><span class="mono">'+esc(p.contesto)+'</span><span class="go" aria-hidden="true">↗</span></div>'+
    '<div class="bot"><h2 class="nm">'+esc(p.nome)+'</h2><div class="more"><p class="ds">'+esc(p.tipo+' · '+p.contesto)+'</p>'+
    '<dl><dt>Tipo</dt><dd>'+esc(p.tipo)+'</dd><dt>Contesto</dt><dd>'+esc(p.contesto)+'</dd><dt class="an-t">Anno</dt><dd class="an"></dd></dl>'+
    (link?'<a class="btn" href="'+link+'">Apri il progetto →</a>':'<span class="btn no">Pagina in arrivo</span>')+'</div></div>'+
    '<button class="hit" type="button" aria-label="Metti in evidenza '+esc(p.nome)+'"></button></div>';
  if(link) a.querySelector('.btn').addEventListener('click',function(){conta('apri-'+p.slug);});
  a.querySelector('.hit').addEventListener('click',function(){scegli(i,true);});
  var img=a.querySelector('.im');
  if(COL[p.slug]){ a.style.setProperty('--bg',COL[p.slug]); if(SCU[p.slug]) a.style.setProperty('--tx','var(--carta)'); }
  else if(img.complete&&img.naturalWidth) tinta(img,a,foto); else img.addEventListener('load',function(){tinta(img,a,foto);},{once:true});
  board.insertBefore(a,proc);
  return a;
});
var tutte=[intro].concat(stats,prj,[proc,chi,cont]);

// descrizione e anno (facoltativi: se il file non si legge restano tipo e contesto)
fetch('data/progetti.json').then(function(r){return r.ok?r.json():null;}).then(function(d){
  if(!d||!d.progetti) return;
  d.progetti.forEach(function(q){ var a=board.querySelector('.prj[data-slug="'+q.slug+'"]'); if(!a) return;
    if(q.descrizione) a.querySelector('.ds').textContent=q.descrizione;
    if(q.anno){ a.querySelector('.an').textContent=q.anno; a.classList.add('con-anno'); }
  });
}).catch(function(){});

/* ---------- colore dal prodotto ---------- */
function tinta(img,a,foto){
  try{
    var w=48,h=48,c=document.createElement('canvas'); c.width=w; c.height=h;
    var x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0,w,h);
    var d=x.getImageData(0,0,w,h).data, bins=new Array(24).fill(0), tot=0, sat=0, R=0,G=0,B=0,n=0;
    for(var k=0;k<d.length;k+=4){
      var al=d[k+3]; if(al<200) continue;
      var r=d[k]/255,g=d[k+1]/255,b=d[k+2]/255, mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, s=mx===mn?0:(l>.5?(mx-mn)/(2-mx-mn):(mx-mn)/(mx+mn));
      R+=d[k];G+=d[k+1];B+=d[k+2];n++; tot++;
      if(s<.28||l<.14||l>.9) continue;
      var hh=mx===r?((g-b)/(mx-mn)+(g<b?6:0)):mx===g?((b-r)/(mx-mn)+2):((r-g)/(mx-mn)+4); hh*=60;
      bins[Math.floor(hh/15)%24]+=s; sat+=s;
    }
    if(foto){ if(n) a.style.setProperty('--bg','rgb('+Math.round(R/n*.6)+','+Math.round(G/n*.6)+','+Math.round(B/n*.6)+')'); return; }
    // gruppo di tinte più forte (somma con i due vicini, così una tinta a cavallo di due gruppi non si perde)
    var fin=function(i){return bins[(i+23)%24]+bins[i]+bins[(i+1)%24];}, best=0; bins.forEach(function(v,i){ if(fin(i)>fin(best)) best=i; });
    // prodotto quasi senza colore (grigi, neri, bianchi): fondo neutro
    if(!tot||fin(best)/tot<.004){ a.style.setProperty('--bg','#E6E6E3'); return; }
    // tinta media pesata del gruppo più forte e dei due vicini
    var sx=0,sy=0; [-1,0,1].forEach(function(o){ var j=(best+o+24)%24, an=(j*15+7.5)*Math.PI/180; sx+=Math.cos(an)*bins[j]; sy+=Math.sin(an)*bins[j]; });
    var hue=(Math.atan2(sy,sx)*180/Math.PI+360)%360;
    a.style.setProperty('--bg','hsl('+hue.toFixed(0)+' 48% 85%)');
  }catch(e){}
}

/* ---------- disposizioni ---------- */
var vista=leggi(), sel=0;
function leggi(){ var q=(location.search.match(/[?&]vista=(vetrina|mosaico)/)||[])[1]; if(q) return q;
  try{ var v=localStorage.getItem('hl-vista'); if(v==='vetrina'||v==='mosaico') return v; }catch(e){} return 'vetrina'; }
function gcd(a,b){return b?gcd(b,a%b):a;} function lcm(a,b){return a*b/gcd(a,b);}

function disposizione(){
  var W=board.clientWidth, tel=W<720, L=new Map(), cols, rh, n=prj.length, s=Math.min(sel,n-1), altri=prj.filter(function(_,i){return i!==s;});
  function put(el,c,w,r,h){L.set(el,[c,w,r,h]);}
  if(vista==='vetrina'){
    var k=altri.length;
    if(tel){
      cols=6; rh=Math.round(Math.max(78,Math.min(96,W/4.3)));
      put(intro,1,6,1,3); if(n) put(prj[s],1,6,4,5);
      var r=9; altri.forEach(function(el,j){ put(el,1+(j%3)*2,2,r+Math.floor(j/3)*2,2); }); r+=Math.ceil(k/3)*2;
      put(stats[0],1,3,r,2); put(stats[1],4,3,r,2); r+=2; put(proc,1,6,r,4); r+=4; put(chi,1,6,r,5); r+=5; put(cont,1,6,r,4);
    }else{
      var per=Math.max(1,Math.min(k,Math.max(4,Math.floor(W/128)))), righe=Math.ceil(k/per);
      cols=lcm(12,per); var U=cols/12, sw=cols/per; rh=Math.round(Math.max(84,Math.min(120,W/13)));
      put(intro,1,5*U,1,6); if(n) put(prj[s],5*U+1,7*U,1,6);
      altri.forEach(function(el,j){ put(el,1+(j%per)*sw,sw,7+Math.floor(j/per)*2,2); });
      var r=7+righe*2;
      put(stats[0],1,2*U,r,2); put(stats[1],2*U+1,2*U,r,2); put(proc,4*U+1,8*U,r,2); r+=2;
      put(chi,1,7*U,r,3); put(cont,7*U+1,5*U,r,3);
    }
  }else{
    if(tel){
      cols=2; rh=Math.round(Math.max(78,Math.min(96,W/4.3)));
      if(n) put(prj[s],1,2,1,5); put(intro,1,2,6,3); put(stats[0],1,1,9,2); put(stats[1],2,1,9,2);
      var r=11; altri.forEach(function(el,j){ var ult=j===altri.length-1&&j%2===0; put(el,ult?1:1+(j%2),ult?2:1,r+Math.floor(j/2)*3,3); });
      r+=Math.ceil(altri.length/2)*3; put(proc,1,2,r,4); r+=4; put(chi,1,2,r,5); r+=5; put(cont,1,2,r,4);
    }else{
      cols=12; rh=Math.round(Math.max(84,Math.min(120,W/13)));
      if(n) put(prj[s],1,8,1,5); put(intro,9,4,1,3); put(stats[0],9,2,4,2); put(stats[1],11,2,4,2);
      var r=6, i=0, g=0, m=altri.length;
      while(i<m){ var resto=m-i, q=g%2?4:3; if(resto<=4) q=resto; else if(resto-q===1) q=q===3?4:3;
        var forma={1:[[12],3],2:[[6,6],4],3:[[4,4,4],4],4:[[3,3,3,3],3]}[q], c=1;
        forma[0].forEach(function(w,j){ put(altri[i+j],c,w,r,forma[1]); c+=w; });
        r+=forma[1]; i+=q; g++; }
      put(proc,1,12,r,2); r+=2; put(chi,1,7,r,3); put(cont,8,5,r,3);
    }
  }
  return {cols:cols,rh:rh,L:L,s:s};
}

function applica(){
  var d=disposizione();
  board.style.setProperty('--cols',d.cols); board.style.setProperty('--rh',d.rh+'px');
  board.dataset.vista=vista;
  tutte.forEach(function(el){ var p=d.L.get(el); if(!p){el.hidden=true;return;} el.hidden=false;
    el.style.gridColumn=p[0]+' / span '+p[1]; el.style.gridRow=p[2]+' / span '+p[3]; });
  prj.forEach(function(el,i){ var g=i===d.s; el.classList.toggle('grande',g); el.classList.toggle('mini',vista==='vetrina'&&!g);
    el.querySelector('.hit').tabIndex=g?-1:0; el.setAttribute('aria-current',g?'true':'false'); });
}

/* ---------- FLIP con molla (senza rimbalzo, ~0,5 s) ---------- */
var corse=new Map();
function ferma(){ corse.forEach(function(id,el){ cancelAnimationFrame(id); pulisci(el); }); corse.clear(); }
function pulisci(el){ el.style.transform=''; el.style.borderRadius=''; var i=el.firstElementChild; if(i){i.style.transform='';i.style.opacity='';} }
function cambia(anima){
  anima=anima&&!reduce.matches;
  var prima=anima?tutte.map(function(el){return el.hidden?null:el.getBoundingClientRect();}):null;
  ferma(); applica();
  if(!anima){ if(reduce.matches) dissolvi(); return; }
  var dopo=tutte.map(function(el){return el.hidden?null:el.getBoundingClientRect();});
  var R=parseFloat(getComputedStyle(tutte[0]).borderTopLeftRadius)||24;
  tutte.forEach(function(el,j){ var a=prima[j],b=dopo[j]; if(!a||!b||!b.width||!b.height) return;
    var dx=a.left-b.left, dy=a.top-b.top, sx=a.width/b.width, sy=a.height/b.height;
    if(Math.abs(dx)<1&&Math.abs(dy)<1&&Math.abs(sx-1)<.01&&Math.abs(sy-1)<.01) return;
    var t0=performance.now(), inn=el.firstElementChild, salto=Math.max(sx,1/sx,sy,1/sy)>1.6;
    (function passo(now){
      var t=(now-t0)/1000, w=13, p=1-(1+w*t)*Math.exp(-w*t), k=1-p;
      var X=1+(sx-1)*k, Y=1+(sy-1)*k;
      el.style.transform='translate('+(dx*k).toFixed(2)+'px,'+(dy*k).toFixed(2)+'px) scale('+X.toFixed(4)+','+Y.toFixed(4)+')';
      el.style.borderRadius=(R/X).toFixed(2)+'px / '+(R/Y).toFixed(2)+'px';
      if(inn){ inn.style.transform='scale('+(1/X).toFixed(4)+','+(1/Y).toFixed(4)+')'; if(salto) inn.style.opacity=Math.min(1,p*1.6).toFixed(3); }
      if(p<.999){ corse.set(el,requestAnimationFrame(passo)); } else { corse.delete(el); pulisci(el); }
    })(t0);
  });
}
function dissolvi(){ board.animate&&board.animate([{opacity:.4},{opacity:1}],{duration:200,easing:'ease-out'}); }

/* ---------- comandi ---------- */
function scegli(i,anima){
  if(i===sel) return; sel=i; cambia(anima);
  // posizione finale (offsetTop non risente della trasformazione in corso)
  var g=prj[sel], y=g.offsetTop, top=document.querySelector('.top').offsetHeight;
  if(y-scrollY<top||y-scrollY>innerHeight*.5) window.scrollTo({top:y-top-10,behavior:reduce.matches?'auto':'smooth'});
  var h=g.querySelector('.btn'); if(h&&h.focus) h.focus({preventScroll:true});
}
function imposta(v,anima){
  if(v!==vista){ vista=v; try{localStorage.setItem('hl-vista',v);}catch(e){} cambia(anima); }
  seg.dataset.v=v; btns.forEach(function(b){ b.setAttribute('aria-pressed',String(b.dataset.v===v)); });
}
btns.forEach(function(b){ b.addEventListener('click',function(){ imposta(b.dataset.v,true); conta('vista-'+b.dataset.v); }); });
imposta(vista,false); applica();
var rt; addEventListener('resize',function(){ clearTimeout(rt); rt=setTimeout(function(){ ferma(); applica(); },80); });
})();
