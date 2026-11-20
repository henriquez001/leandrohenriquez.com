/* Stile showroom, pagina progetto (generata da progetto.json con tools/genera-html.js).
   Il palco mostra il 3D se la pagina carica un modello (three.js + dati), altrimenti le foto.
   Il 3D non si trascina: ruota con lo scorrimento della pagina e, toccando un capitolo, la camera va sul punto che il
   capitolo spiega (molla senza rimbalzo e interrompibile, apple-motion). Si ridisegna solo quando la camera si muove.
   I capitoli portano i dati sui loro attributi: data-cam="yaw,pitch,dist", data-guarda, data-punto, data-quote. */
(function(){
'use strict';
var board=document.getElementById('board'), palco=document.getElementById('palco'); if(!board||!palco) return;
var capT=document.getElementById('capT'), capP=document.getElementById('capP'), palN=document.getElementById('palN'), palD=document.getElementById('palD'), foto=document.getElementById('palcoFoto');
var RM=matchMedia('(prefers-reduced-motion: reduce)').matches, titolo=board.dataset.titolo||'';
var num=function(s){return (s||'').split(',').filter(Boolean).map(Number);};
var caps=[].slice.call(board.querySelectorAll('.cap-t'));
// tessera "prossimo" senza foto: fondo dal colore del prodotto (colori.js)
[].forEach.call(board.querySelectorAll('.next[data-prog]'),function(a){var c=typeof COLORI!=='undefined'&&COLORI[a.dataset.prog]; if(c){a.style.setProperty('--bg',c); a.style.setProperty('--tx',(typeof SCURI!=='undefined'&&SCURI[a.dataset.prog])?'var(--carta)':'var(--ink)');}});
var c0=num(palco.dataset.cam);
var K=[{c:c0,t:[0,0,0],n:'00 · intero',h:palco.dataset.titolo,x:palco.dataset.testo}].concat(caps.map(function(b){
  var q=num(b.dataset.quote); return {c:num(b.dataset.cam),t:num(b.dataset.guarda).length?num(b.dataset.guarda):[0,0,0],pt:num(b.dataset.punto),q:q.length===6?q:null,qt:(b.dataset.qt||'').split('|'),
    n:b.dataset.n,h:b.dataset.titolo,x:b.dataset.testo,foto:b.dataset.foto};}));
var scelto=0;
function premuto(i){ caps.forEach(function(b){b.setAttribute('aria-pressed',String(+b.dataset.k===i));}); }
function testi(k,i,d){ capT.textContent=k.h||''; capP.textContent=k.x||''; palN.textContent=k.n||''; palD.textContent=d; }
function mostraFoto(src,alt){ if(!foto) return; foto.src=src; foto.alt=alt; palco.classList.add('con-foto'); }
var tre=typeof THREE!=='undefined'&&c0.length===3&&document.getElementById('c');
var vai3d=null;
if(tre) vai3d=(function(){
  var cv=document.getElementById('c'), call=document.getElementById('call');
  var R=mkR(cv); R.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1.25:1.5));
  var S=new THREE.Scene(), cam=new THREE.PerspectiveCamera(28,1,.1,80);
  S.environment=studioEnv(R,0x8a8c8d); S.add(new THREE.AmbientLight(0xffffff,.35)); var L1=new THREE.DirectionalLight(0xffffff,1); L1.position.set(3,5,4); S.add(L1);
  var lamp=makeRealLamp(); S.add(lamp); lamp.updateMatrixWorld(true);
  var dirty=true;
  if(lamp.userData.setupReflection){ lamp.userData.setupReflection(R,S); var cap0=lamp.userData.capture; lamp.userData.capture=function(){cap0();dirty=true;}; }
  var W=1,H=1;
  function size(){ var r=palco.getBoundingClientRect(); W=Math.max(1,r.width); H=Math.max(1,r.height); R.setSize(W,H,false); cam.aspect=W/H;
    // l'oggetto sta nella metà destra del palco quando è largo, in alto quando è stretto (il testo è in basso a sinistra)
    if(W/H>1.15) cam.setViewOffset(W,H,-W*.12,-H*.04,W,H); else cam.setViewOffset(W,H,0,H*.03,W,H);
    cam.updateProjectionMatrix(); dirty=true; }
  new ResizeObserver(size).observe(palco); size();
  var cur={y:c0[0],p:c0[1],d:c0[2],tx:0,ty:0,tz:0}, tgt=Object.assign({},cur), svg='', v=new THREE.Vector3(), r=Math.round;
  function P(x,y,z){ v.set(x,y,z).project(cam); return [(v.x*.5+.5)*W,(-v.y*.5+.5)*H]; }
  function fitD(d){ var a=W/H; return a<1.15? d*Math.min(1.7,1.15/a) : d; }
  function callout(){
    if(scelto<1||palco.classList.contains('con-foto')) return ''; var k=K[scelto];
    if(k.q){ var q=k.q, a=P(q[0],q[2],0), b=P(q[1],q[2],0), c=P(q[5],q[3],0), d=P(q[5],q[4],0), y=r(Math.max(a[1],b[1])+26), x=r(Math.max(c[0],d[0])+24);
      return '<path d="M'+r(a[0])+' '+y+' H'+r(b[0])+' M'+r(a[0])+' '+(y-7)+' V'+(y+7)+' M'+r(b[0])+' '+(y-7)+' V'+(y+7)+'"/><text x="'+r((a[0]+b[0])/2)+'" y="'+(y+20)+'" text-anchor="middle">'+k.qt[0]+'</text>'+
        '<path d="M'+x+' '+r(c[1])+' V'+r(d[1])+' M'+(x-7)+' '+r(c[1])+' H'+(x+7)+' M'+(x-7)+' '+r(d[1])+' H'+(x+7)+'"/><text x="'+(x+10)+'" y="'+r((c[1]+d[1])/2)+'" dominant-baseline="middle">'+(k.qt[1]||'')+'</text>'; }
    if(k.pt.length!==3) return '';
    var p=P(k.pt[0],k.pt[1],k.pt[2]), capR=document.getElementById('cap').getBoundingClientRect(), pr=palco.getBoundingClientRect();
    var ax=r(capR.left-pr.left), ay=r(capR.top-pr.top-12), px=r(p[0]), py=r(p[1]);
    return '<path d="M'+px+' '+py+' V'+ay+' H'+ax+'"/><circle cx="'+px+'" cy="'+py+'" r="9"/><circle class="dot" cx="'+px+'" cy="'+py+'" r="3"/>';
  }
  // scorrimento: senza capitolo scelto l'oggetto gira con la pagina
  function scorri(){ if(scelto>0) return; var max=Math.max(1,document.documentElement.scrollHeight-innerHeight), f=scrollY/max;
    tgt.y=c0[0]-f*300; tgt.p=c0[1]; tgt.d=c0[2]; tgt.tx=tgt.ty=tgt.tz=0; if(RM) Object.assign(cur,tgt); dirty=true; }
  addEventListener('scroll',scorri,{passive:true});
  var last=performance.now(), visibile=true;
  new IntersectionObserver(function(en){visibile=en[0].isIntersecting;}).observe(palco);
  function frame(now){ requestAnimationFrame(frame); var dt=Math.min(.05,(now-last)/1000); last=now; if(!visibile) return;
    var f=1-Math.exp(-dt*7), moto=0;
    ['y','p','d','tx','ty','tz'].forEach(function(k){ var dd=tgt[k]-cur[k]; if(Math.abs(dd)>1e-4){ cur[k]+=dd*f; moto+=Math.abs(dd); } else cur[k]=tgt[k]; });
    if(!moto&&!dirty) return; dirty=false;
    var yaw=cur.y*Math.PI/180, pit=cur.p*Math.PI/180, d=fitD(cur.d);
    cam.position.set(cur.tx+d*Math.cos(pit)*Math.sin(yaw), cur.ty+d*Math.sin(pit), cur.tz+d*Math.cos(pit)*Math.cos(yaw)); cam.lookAt(cur.tx,cur.ty,cur.tz); cam.updateMatrixWorld();
    R.render(S,cam);
    var s=moto<.02?callout():''; if(s!==svg){ call.innerHTML=s; svg=s; }
  }
  requestAnimationFrame(frame);
  document.addEventListener('vista',function(){ setTimeout(size,600); });
  return function(i){ var k=K[i]; if(i===0){ scorri(); } else if(k.c.length===3){ tgt={y:k.c[0],p:k.c[1],d:k.c[2],tx:k.t[0],ty:k.t[1],tz:k.t[2]}; }
    if(RM) Object.assign(cur,tgt); svg='-'; dirty=true; };
})();
function vai(i){
  scelto=i; var k=K[i]; premuto(i);
  testi(k,i,i?'tocca di nuovo per tornare':(tre?'scorri o scegli un capitolo':'scegli un capitolo o una foto'));
  if(tre&&(i===0||k.c.length===3)){ palco.classList.remove('con-foto'); vai3d(i); }
  else if(k.foto) mostraFoto(k.foto,titolo+', '+(k.h||''));
}
board.addEventListener('click',function(e){
  var c=e.target.closest('.cap-t');
  if(c){ var i=+c.dataset.k; vai(scelto===i?0:i);
    if(board.dataset.v==='mosaico') palco.scrollIntoView({behavior:RM?'auto':'smooth',block:'center'}); return; }
  var f=e.target.closest('.ft-t');
  if(f&&board.dataset.v==='vetrina'){ scelto=-1; premuto(-1); mostraFoto(f.dataset.foto,titolo+', '+f.dataset.nome);
    testi({h:f.dataset.nome,x:f.dataset.nota||'',n:'foto · '+f.dataset.nome},0,tre?'tocca un capitolo per tornare al 3D':'tocca un’altra foto o un capitolo'); }
});
})();
