/* Prova pagina progetto showroom: Oopar in 3D dentro il "palco".
   Il 3D non si trascina: ruota con lo scorrimento della pagina e, toccando un capitolo, la camera va sul punto
   che il capitolo spiega (molla senza rimbalzo, interrompibile). Si ridisegna solo quando la camera si muove. */
(function(){
'use strict';
var palco=document.getElementById('palco'), cv=document.getElementById('c'), call=document.getElementById('call'), board=document.getElementById('board');
var capT=document.getElementById('capT'), capP=document.getElementById('capP'), palN=document.getElementById('palN'), palD=document.getElementById('palD'), foto=document.getElementById('palcoFoto');
// yaw/pitch in gradi, d distanza, t punto guardato, pt punto spiegato (1 = 100 mm)
var K=[
  {y:35,p:15,d:11.5,t:[0,0,0],n:'00 · intero',h:'Un occhio di noce',x:'Ruota con lo scorrimento. Scegli un capitolo per andare sul punto che spiega.'},
  {y:14,p:5,d:6.4,t:[0,0,0],pt:[.2,.2,.38],n:'01 · la sfera',h:'Ø 90, sospesa',x:'Una sfera cromata di 90 mm fluttua nel campo magnetico, al centro dell’occhio, e riflette la luce che esce dal corpo.'},
  {y:-30,p:12,d:7.4,t:[-.55,.2,0],pt:[-.6,-.45,.55],n:'02 · il decoro',h:'Madhubani',x:'La fascia interna porta un decoro ispirato alla pittura Madhubani: è il punto in cui si incontrano la cultura indiana e quella italiana.'},
  {y:-78,p:10,d:9.5,t:[0,0,0],pt:[-1.05,-.1,.7],n:'03 · il corpo',h:'Noce, a occhio',x:'Il guscio in noce ha la forma di un occhio con i fianchi concavi; la luce esce dalla fascia dentro il tunnel.'},
  {y:0,p:2,d:10.5,t:[0,0,0],quote:true,n:'04 · le misure',h:'300 × 195 × 200',x:'Misure prese dal modello Rhino: 300 mm di larghezza, 195 di altezza, 200 di profondità; sfera Ø 90.'}
];
var R=mkR(cv); R.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1.25:1.5));
var S=new THREE.Scene(), cam=new THREE.PerspectiveCamera(28,1,.1,80);
S.environment=studioEnv(R,0x8a8c8d); S.add(new THREE.AmbientLight(0xffffff,.35)); var L1=new THREE.DirectionalLight(0xffffff,1); L1.position.set(3,5,4); S.add(L1);
var lamp=makeRealLamp(); S.add(lamp); lamp.updateMatrixWorld(true);
var dirty=true;
if(lamp.userData.setupReflection){ lamp.userData.setupReflection(R,S); var c0=lamp.userData.capture; lamp.userData.capture=function(){c0();dirty=true;}; }
var W=1,H=1;
function size(){ var r=palco.getBoundingClientRect(); W=Math.max(1,r.width); H=Math.max(1,r.height); R.setSize(W,H,false); cam.aspect=W/H;
  // l'oggetto sta nella metà destra del palco quando è largo, in alto quando è stretto (il testo è in basso a sinistra)
  if(W/H>1.15) cam.setViewOffset(W,H,-W*.12,-H*.04,W,H); else cam.setViewOffset(W,H,0,H*.03,W,H);
  cam.updateProjectionMatrix(); dirty=true; }
new ResizeObserver(size).observe(palco); size();
var cur={y:K[0].y,p:K[0].p,d:K[0].d,tx:0,ty:0,tz:0}, tgt=Object.assign({},cur), scelto=-1, svg='';
var v=new THREE.Vector3();
function P(x,y,z){ v.set(x,y,z).project(cam); return [(v.x*.5+.5)*W,(-v.y*.5+.5)*H]; }
function fitD(d){ var a=W/H; return a<1.15? d*Math.min(1.7,1.15/a) : d; }
function vai(i){
  scelto=i; var k=K[i]; tgt={y:k.y,p:k.p,d:k.d,tx:k.t[0],ty:k.t[1],tz:k.t[2]};
  capT.textContent=k.h; capP.textContent=k.x; palN.textContent=k.n; palD.textContent=i?'tocca di nuovo per tornare':'scorri o scegli un capitolo';
  palco.classList.remove('con-foto');
  [].forEach.call(board.querySelectorAll('.cap-t'),function(b){b.setAttribute('aria-pressed',String(+b.dataset.k===i));});
  if((typeof RM!=='undefined'&&RM)){ Object.assign(cur,tgt); } dirty=true;
}
function callout(){
  if(scelto<1) return ''; var k=K[scelto], r=Math.round;
  if(k.quote){ var a=P(-1.5,-.975,0), b=P(1.5,-.975,0), c=P(1.5,.975,0), y=r(a[1]+26), x=r(b[0]+24);
    return '<path d="M'+r(a[0])+' '+y+' H'+r(b[0])+' M'+r(a[0])+' '+(y-7)+' V'+(y+7)+' M'+r(b[0])+' '+(y-7)+' V'+(y+7)+'"/><text x="'+r((a[0]+b[0])/2)+'" y="'+(y+20)+'" text-anchor="middle">300 MM</text>'+
      '<path d="M'+x+' '+r(c[1])+' V'+r(b[1])+' M'+(x-7)+' '+r(c[1])+' H'+(x+7)+' M'+(x-7)+' '+r(b[1])+' H'+(x+7)+'"/><text x="'+(x+10)+'" y="'+r((c[1]+b[1])/2)+'" dominant-baseline="middle">195</text>'; }
  var p=P(k.pt[0],k.pt[1],k.pt[2]), capR=document.getElementById('cap').getBoundingClientRect(), pr=palco.getBoundingClientRect();
  var ax=r(capR.left-pr.left), ay=r(capR.top-pr.top-12), px=r(p[0]), py=r(p[1]);
  return '<path d="M'+px+' '+py+' V'+ay+' H'+ax+'"/><circle cx="'+px+'" cy="'+py+'" r="9"/><circle class="dot" cx="'+px+'" cy="'+py+'" r="3"/>';
}
// scorrimento: senza capitolo scelto la lampada gira con la pagina (solo dentro lo schermo)
function scorri(){ if(scelto>0) return; var max=Math.max(1,document.documentElement.scrollHeight-innerHeight), f=scrollY/max;
  tgt.y=K[0].y-f*300; tgt.p=K[0].p; tgt.d=K[0].d; tgt.tx=tgt.ty=tgt.tz=0; dirty=true; }
addEventListener('scroll',scorri,{passive:true});
board.addEventListener('click',function(e){
  var c=e.target.closest('.cap-t'); if(c){ var i=+c.dataset.k; vai(scelto===i?0:i); if(board.dataset.v==='mosaico') palco.scrollIntoView({behavior:(typeof RM!=='undefined'&&RM)?'auto':'smooth',block:'center'}); if(scelto===0)scorri(); return; }
  var f=e.target.closest('.ft-t'); if(f&&board.dataset.v==='vetrina'){ foto.src=f.dataset.foto; foto.alt='Oopar, '+f.dataset.nome; palco.classList.add('con-foto');
    capT.textContent=f.dataset.nome; capP.textContent='Render fatto con Vitrum.'; palN.textContent='foto · '+f.dataset.nome; palD.textContent='tocca un capitolo per tornare al 3D';
    [].forEach.call(board.querySelectorAll('.cap-t'),function(b){b.setAttribute('aria-pressed','false');}); }
});
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
})();
