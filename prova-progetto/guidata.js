/* prova 1 · Guidata: la lampada sta al centro e si muove SOLO con lo scorrimento (nessun trascinamento).
   Ogni tappa avvicina la camera al punto che il testo spiega; una linea collega il testo al punto.
   Il 3D si ridisegna solo quando la camera si muove. */
(function(){
const COARSE=matchMedia('(pointer:coarse)').matches;
// yaw/pitch in gradi, d = distanza, t = punto guardato, pt = punto spiegato (coordinate del modello: 1 = 100 mm)
const K=[
  // d = distanza sul computer, dm = sul telefono
  {y:35,p:15,d:11.5,dm:17.8,t:[0,0,0]},                         // apertura
  {y:14,p:5,d:6.2,dm:6.8,t:[0,0,0],pt:[.2,.2,.38]},             // la sfera
  {y:-30,p:12,d:7.2,dm:8.4,t:[-.55,.2,0],pt:[-.6,-.45,.55]},    // il decoro
  {y:-78,p:10,d:9.5,dm:12.4,t:[0,0,0],pt:[-1.05,-.1,.7]},       // il corpo
  {y:0,p:2,d:10.5,dm:16.3,t:[0,0,0],quote:true}                 // le misure
];
const N=K.length,st=[...document.querySelectorAll('.st')],cv=document.getElementById('c'),call=document.getElementById('call');
const R=mkR(cv);R.setPixelRatio(COARSE?1:Math.min(devicePixelRatio,1.5));
const S=new THREE.Scene(),cam=new THREE.PerspectiveCamera(28,1,.1,80);
S.environment=studioEnv(R,0x6f6f6a);S.add(new THREE.AmbientLight(0xffffff,.3));const k=new THREE.DirectionalLight(0xffffff,1);k.position.set(3,5,4);S.add(k);
const L=makeRealLamp();S.add(L);L.updateMatrixWorld(true);
let dirty=true;
if(L.userData.setupReflection){L.userData.setupReflection(R,S);const c0=L.userData.capture;L.userData.capture=()=>{c0();dirty=true;};}
let W=innerWidth,H=innerHeight,ph=false;
function size(){W=innerWidth;H=innerHeight;ph=W/H<1;R.setSize(W,H,false);cam.aspect=W/H;
  // telefono: oggetto nella parte alta, testo sotto
  if(ph)cam.setViewOffset(W,H,0,H*.16,W,H);else cam.setViewOffset(W,H,-W*.13,0,W,H);cam.updateProjectionMatrix();dirty=true;}
addEventListener('resize',size);size();
const v=new THREE.Vector3(),T=new THREE.Vector3(),P=(x,y,z)=>{v.set(x,y,z).project(cam);return [(v.x*.5+.5)*W,(-v.y*.5+.5)*H];};
const ease=x=>x*x*(3-2*x),cl=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,f)=>a+(b-a)*f;
const prog=new Spr(.34);let last=performance.now(),key='',cur=-1,svg='';
function callout(i){const s=K[i];if(s.quote){
    const r=Math.round,a=P(-1.5,-.975,0),b=P(1.5,-.975,0),c=P(1.5,.975,0),d=P(1.5,-.975,0),y=r(a[1]+28),x=r(c[0]+28);
    return `<line x1="${r(a[0])}" y1="${y}" x2="${r(b[0])}" y2="${y}"/><line x1="${r(a[0])}" y1="${y-7}" x2="${r(a[0])}" y2="${y+7}"/><line x1="${r(b[0])}" y1="${y-7}" x2="${r(b[0])}" y2="${y+7}"/><text x="${r((a[0]+b[0])/2)}" y="${y+20}" text-anchor="middle">300 MM</text>`+
      `<line x1="${x}" y1="${r(c[1])}" x2="${x}" y2="${r(d[1])}"/><line x1="${x-7}" y1="${r(c[1])}" x2="${x+7}" y2="${r(c[1])}"/><line x1="${x-7}" y1="${r(d[1])}" x2="${x+7}" y2="${r(d[1])}"/><text x="${ph?x-10:x+12}" y="${r((c[1]+d[1])/2)}" text-anchor="${ph?'end':'start'}" dominant-baseline="middle">195</text>`;}
  if(!s.pt)return '';
  const p=P(...s.pt),cap=st[i].querySelector('.cap .lab').getBoundingClientRect(),ax=Math.round(cap.left),ay=Math.round(cap.top-10),px=Math.round(p[0]),py=Math.round(p[1]);
  // linea a gomito: dal punto scende in verticale, poi va al testo
  return `<path d="M${px} ${py} L${px} ${ay} L${ax} ${ay}"/><circle cx="${px}" cy="${py}" r="9"/><circle class="dot" cx="${px}" cy="${py}" r="3"/>`;}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.033,(now-last)/1000);last=now;
  const raw=cl(scrollY/H,0,N-1),stop=Math.round(raw);prog.t=raw;if(RM)prog.x=raw;else prog.step(dt);if(Math.abs(prog.x-raw)<.0005&&Math.abs(prog.v)<.001)prog.x=raw;
  if(stop!==cur){cur=stop;st.forEach((s,j)=>s.classList.toggle('on',j===stop));}
  const fade=cl((st[N-1].offsetTop+H*.6-scrollY)/(H*.5),0,1);cv.style.opacity=fade;call.style.opacity=fade;
  const t=cl(prog.x,0,N-1),i=Math.min(N-2,Math.floor(t)),f=ease(t-i),A=K[i],B=K[i+1];
  const kk=t.toFixed(4)+'|'+W+'|'+H;if(kk===key&&!dirty||fade===0)return;key=kk;dirty=false;
  const yaw=lerp(A.y,B.y,f)*Math.PI/180,pit=lerp(A.p,B.p,f)*Math.PI/180,d=ph?lerp(A.dm,B.dm,f):lerp(A.d,B.d,f);
  T.set(lerp(A.t[0],B.t[0],f),lerp(A.t[1],B.t[1],f),lerp(A.t[2],B.t[2],f));
  cam.position.set(T.x+d*Math.cos(pit)*Math.sin(yaw),T.y+d*Math.sin(pit),T.z+d*Math.cos(pit)*Math.cos(yaw));cam.lookAt(T);cam.updateMatrixWorld();
  const still=Math.abs(t-Math.round(t))<.01,s2=still?callout(Math.round(t)):'';if(s2!==svg){call.innerHTML=s2;svg=s2;}
  R.render(S,cam);}
requestAnimationFrame(frame);
})();
