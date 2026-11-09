/* hl. — pagina progetto, nuova base (prova del 9/11): guidata da lavori/<progetto>/progetto.json.
   Differenze dalla prima versione, per lo scorrimento:
   - una tappa per gesto (aggancio deciso, come la home);
   - il 3D si ridisegna solo quando la camera si muove (non a ogni fotogramma);
   - le parole giganti si accendono con una classe (opacità e spostamento, fatti dal compositore), senza cambiare il carattere mentre scorri;
   - sul telefono il 3D va a risoluzione 1 e senza fusione con la carta. */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COARSE=matchMedia('(pointer:coarse)').matches;
function renderProject(root,D){
  const pad=n=>String(n).padStart(2,'0'),N=D.tappe.length-1;
  root.querySelector('#gBig').innerHTML=D.tappe.map((t,i)=>`<b data-s="${i}" style="--len:${[...t.parola.testo].length}">${esc(t.parola.testo)}</b>`).join('');
  root.querySelector('.ui.tr').innerHTML=`${esc(D.contatore)}<br>${esc(D.etichetta)}`;
  root.querySelector('.tour').innerHTML=`<section class="s intro" data-i="0"><span class="bar" aria-hidden="true"></span><div class="meta">${D.intro.map(x=>`<span>${esc(x)}</span>`).join('')}</div></section>`+
    D.tappe.slice(1).map((t,i)=>`<section class="s" data-i="${i+1}"><span class="bar" aria-hidden="true"></span><div class="cap"><div class="n">${esc(t.didascalia.n)}</div><h3>${esc(t.didascalia.titolo)}</h3><p>${esc(t.didascalia.testo)}</p></div><div class="idx">${pad(i+1)} / ${pad(N)}</div></section>`).join('');
  let h='';
  if(D.scheda)h+=`<section class="sec"><div class="k"><span>Scheda</span><span>${esc(D.scheda.nota)}</span></div><div class="spec">${D.scheda.voci.map(v=>`<div><small>${esc(v.voce)}</small><b>${esc(v.valore)}${v.unita?` <i>${esc(v.unita)}</i>`:''}</b></div>`).join('')}</div></section>`;
  if(D.immagini)h+=`<section class="sec"><div class="k"><span>Immagini</span><span>${esc(D.immagini.nota)}</span></div><div class="gal">${D.immagini.voci.map(v=>{const img=`<img src="${esc(BASE+v.src)}" alt="${esc(v.alt)}" loading="lazy">`;
    return `<figure${v.scontornata?' class="cut"':''}><div class="fr">${img}</div><figcaption>${v.didascalia.map(x=>`<span>${esc(x)}</span>`).join('')}</figcaption></figure>`;}).join('')}</div></section>`;
  // "processo" non si mostra più: elencava cose da fare (schizzi da fornire, render da fare), non il progetto
  if(D.prossimo)h+=`<a class="next sec" id="gNext" href="${esc(BASE+D.prossimo.link)}"><div class="k"><span>${esc(D.prossimo.etichetta)}</span><span>→</span></div><b>${esc(D.prossimo.titolo.replace(/\s*→\s*$/,''))}</b></a>`;
  root.querySelector('.content').innerHTML=h;
}
function loadScript(src){return new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.body.appendChild(s);});}
const BUILDERS={oopar:()=>makeRealLamp()};
function PROJECT(root,D){
  const cv=root.querySelector('#fxG'),R=mkR(cv),S=new THREE.Scene(),cam=new THREE.PerspectiveCamera(28,1,.1,80);
  R.setPixelRatio(COARSE?1:Math.min(devicePixelRatio,1.5));
  S.environment=studioEnv(R,0x6f6f6a);S.add(new THREE.AmbientLight(0xffffff,.3));const k=new THREE.DirectionalLight(0xffffff,1);k.position.set(3,5,4);S.add(k);
  const L=BUILDERS[D.modello.costruttore]();S.add(L);L.updateMatrixWorld(true);if(L.userData.setupReflection)L.userData.setupReflection(R,S);
  const K=D.tappe.map(t=>({y:t.camera.yaw,p:t.camera.pitch,d:t.camera.dist}));
  const big=[...root.querySelectorAll('#gBig b')],dim=root.querySelector('#gDim'),tour=root.querySelector('.tour'),secs=[...tour.querySelectorAll('.s')];
  const N=K.length,prog=new Spr(.32);let yawD=0,yv=0,drag=false,lx=0,hist=[],dirty=true;
  root.addEventListener('pointerdown',e=>{if(e.target.closest('.cap,.ui,.content,a'))return;drag=true;lx=e.clientX;hist=[];yv=0;});
  root.addEventListener('pointermove',e=>{if(!drag)return;const t=performance.now(),dx=e.clientX-lx;yawD+=dx*.45;hist.push([t,dx]);hist=hist.filter(h=>t-h[0]<80);lx=e.clientX;dirty=true;});
  const up=()=>{if(!drag)return;drag=false;yv=RM?0:hist.reduce((a,h)=>a+h[1],0)*.45/.08;};root.addEventListener('pointerup',up);root.addEventListener('pointercancel',up);
  let rest=null,restKey='',W=innerWidth,H=innerHeight;
  function size(){W=innerWidth;H=innerHeight;R.setSize(W,H,false);cam.aspect=W/H;
    // telefono in verticale: l'oggetto sale nella parte alta, le didascalie stanno sotto
    if(cam.aspect<1)cam.setViewOffset(W,H,0,H*.12,W,H);else cam.clearViewOffset();cam.updateProjectionMatrix();restKey='';dirty=true;}
  addEventListener('resize',size);size();
  const ease=x=>x*x*(3-2*x),cl=(x,a,b)=>Math.max(a,Math.min(b,x)),T=new THREE.Vector3(0,0,0),v=new THREE.Vector3();
  function P(x,y,z){v.set(x,y,z).project(cam);return [(v.x*.5+.5)*W,(-v.y*.5+.5)*H];}
  function hq(a,b,label,vert,pos){const r=Math.round;let A,B,Lb;
    if(!vert){const y=r(pos.y);A=[r(a[0]),y];B=[r(b[0]),y];Lb=[r((A[0]+B[0])/2),y+(pos.under?16:-12)];}
    else{const x=r(pos.x);A=[x,r(pos.ya)];B=[x,r(pos.yb)];
      // l'etichetta resta dentro la vista: se a destra non c'è posto passa a sinistra della linea
      if(pos.right&&x+14+9*String(label).length>W-12)pos.right=false;Lb=[x+(pos.right?14:-14),r((A[1]+B[1])/2)];}
    const t=6,tk=p=>vert?`<line x1="${p[0]-t}" y1="${p[1]}" x2="${p[0]+t}" y2="${p[1]}"/>`:`<line x1="${p[0]}" y1="${p[1]-t}" x2="${p[0]}" y2="${p[1]+t}"/>`;
    const ex=(p,q)=>`<line x1="${r(p[0])}" y1="${r(p[1])}" x2="${q[0]}" y2="${q[1]}" stroke-dasharray="2 3"/>`;
    return `<g class="q">${ex(a,A)}${ex(b,B)}<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}"/>${tk(A)}${tk(B)}</g><text x="${Lb[0]}" y="${Lb[1]}" text-anchor="${vert?(pos.right?'start':'end'):'middle'}" dominant-baseline="middle">${esc(label)}</text>`;}
  function restPose(st){const key=st+'|'+W+'|'+H;if(key===restKey)return rest;
    const sp=cam.position.clone(),sq=cam.quaternion.clone(),s=K[st],d=s.d*(cam.aspect<1?1.7:1),yr=s.y*Math.PI/180,pr=s.p*Math.PI/180;
    cam.position.set(d*Math.cos(pr)*Math.sin(yr),d*Math.sin(pr),d*Math.cos(pr)*Math.cos(yr));cam.lookAt(T);cam.updateMatrixWorld();
    rest=(D.tappe[st].quote||[]).map(q=>q.sfera?{c:P(0,0,0)}:{da:P(...q.da),a:P(...q.a),rif:(q.rif||[]).map(p=>P(...p))});
    cam.position.copy(sp);cam.quaternion.copy(sq);cam.updateMatrixWorld();restKey=key;return rest;}
  function drawQuotes(st){const Q=D.tappe[st].quote;if(!Q)return '';const R0=restPose(st);let svg='';
    Q.forEach((q,i)=>{const r0=R0[i];
      if(q.sfera){const c=P(0,L.userData.sphere.position.y,0),e=P(q.sfera,L.userData.sphere.position.y,0),rr=Math.round(Math.hypot(e[0]-c[0],e[1]-c[1])),cx=Math.round(c[0]),cy=Math.round(r0.c[1]);
        svg+=`<circle class="q" cx="${cx}" cy="${cy}" r="${rr+14}" fill="none" stroke-dasharray="3 4"/>`+hq([cx-rr,cy],[cx+rr,cy],q.testo,false,{y:cy-rr-(q.scosta||40),under:false});return;}
      const a=P(...q.da),b=P(...q.a);
      if(q.verso==='v'){const xs=(q.rif||[q.da,q.a]).map(p=>P(...p)[0]),right=(q.scosta||0)>=0;
        svg+=hq(a,b,q.testo,true,{x:(right?Math.max(...xs):Math.min(...xs))+q.scosta,ya:r0.da[1],yb:r0.a[1],right});}
      else{const ys=(r0.rif.length?r0.rif:[r0.da,r0.a]).map(p=>p[1]),under=(q.scosta||0)>=0;
        const[l,rt]=a[0]<=b[0]?[a,b]:[b,a];svg+=hq(l,rt,q.testo,false,{y:(under?Math.max(...ys):Math.min(...ys))+q.scosta,under});}});
    return svg;}
  // tappa attiva: la parola gigante e la schermata si accendono con una classe
  let cur=-1;const setStop=st=>{if(st===cur)return;cur=st;big.forEach((b,j)=>b.classList.toggle('on',j===st));secs.forEach((s,j)=>s.classList.toggle('on',j===st));root.dataset.tappa=st;};
  let last=performance.now(),lastKey='',lastFade=-1,lastSvg='';
  return function(now){const dt=Math.min(.033,(now-last)/1000);last=now;
    const tourH=tour.offsetHeight,top=root.scrollTop,raw=cl(top/H,0,N-1);prog.t=raw;if(RM)prog.x=raw;else prog.step(dt);
    if(Math.abs(prog.x-prog.t)<.0005&&Math.abs(prog.v)<.001)prog.x=prog.t;
    const t=cl(prog.x,0,N-1),i=Math.min(N-2,Math.floor(t)),f=ease(t-i),A=K[i],B=K[i+1];
    if(!drag&&(Math.abs(yv)>.5||Math.abs(yawD)>.05)){yawD+=yv*dt;yv*=Math.pow(.05,dt);if(Math.abs(yv)<3)yawD*=Math.pow(.15,dt);if(Math.abs(yawD)<.05&&Math.abs(yv)<.5){yawD=0;yv=0;}}
    const fade=cl((tourH-H*.35-top)/(H*.5),0,1);
    setStop(Math.round(raw));
    // la sfera fluttua solo sul computer e solo a pagina ferma; sul telefono resta immobile (nessun ridisegno continuo)
    const fl=(!COARSE&&!RM&&fade>0)?Math.round(Math.sin(now*.0013)*400)/1e4:0;
    const key=[t.toFixed(4),yawD.toFixed(2),fl,W,H].join('|');
    if(fade!==lastFade){cv.style.opacity=fade;dim.style.opacity=fade;lastFade=fade;}
    if(key===lastKey&&!dirty||fade===0)return;lastKey=key;dirty=false;
    let yaw=A.y+(B.y-A.y)*f+yawD,pitch=A.p+(B.p-A.p)*f,d=(A.d+(B.d-A.d)*f)*(cam.aspect<1?1.7:1);
    const yr=yaw*Math.PI/180,pr=pitch*Math.PI/180;cam.position.set(d*Math.cos(pr)*Math.sin(yr),d*Math.sin(pr),d*Math.cos(pr)*Math.cos(yr));cam.lookAt(T);
    L.userData.sphere.position.y=fl;
    // quote: solo a tappa raggiunta (durante il passaggio spariscono, così non inseguono l'oggetto)
    const still=Math.abs(t-Math.round(t))<.02,svg=still?drawQuotes(Math.round(t)):'';
    if(svg!==lastSvg){dim.innerHTML=svg;lastSvg=svg;}
    R.render(S,cam);
  };}
(async function(){const root=document.getElementById("liveG");
  const D=await fetch(root.dataset.progetto||'progetto.json').then(r=>r.json());
  renderProject(root,D);await loadScript(BASE+D.modello.dati);
  const frame=PROJECT(root,D);let vis=true;document.addEventListener("visibilitychange",()=>vis=!document.hidden);function loop(t){requestAnimationFrame(loop);if(vis)frame(t);}requestAnimationFrame(loop);})();
