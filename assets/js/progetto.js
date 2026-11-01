/* hl. — pagina progetto, guidata dai dati in lavori/<progetto>/progetto.json */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// builds the page text from the JSON; the markup matches progetto.css
function renderProject(root,D){
  const pad=n=>String(n).padStart(2,'0');
  root.querySelector('#gBig').innerHTML=D.tappe.map((t,i)=>`<b data-s="${i}"${t.parola.stile?` class="${esc(t.parola.stile)}"`:''}>${esc(t.parola.testo)}</b>`).join('');
  root.querySelector('.ui.tr').innerHTML=`${esc(D.contatore)}<br>${esc(D.etichetta)}`;
  root.querySelector('.tour').innerHTML=`<section class="s intro"><div class="meta">${D.intro.map(x=>`<span>${esc(x)}</span>`).join('')}</div></section>`+
    D.tappe.slice(1).map((t,i)=>`<section class="s"><div class="cap"><div class="n">${esc(t.didascalia.n)}</div><h3>${esc(t.didascalia.titolo)}</h3><p>${esc(t.didascalia.testo)}</p></div><div class="idx">${pad(i+1)}</div></section>`).join('');
  const k=(a,b)=>`<div class="k"><span>${esc(a)}</span><span>${esc(b)}</span></div>`;
  let h='';
  if(D.scheda)h+=`<section class="sec">${k('Scheda',D.scheda.nota)}<div class="spec">${D.scheda.voci.map(v=>`<div><small>${esc(v.voce)}</small><b>${esc(v.valore)}${v.unita?`<i>${esc(v.unita)}</i>`:''}</b></div>`).join('')}</div></section>`;
  if(D.immagini)h+=`<section class="sec">${k('Immagini',D.immagini.nota)}<div class="gal">${D.immagini.voci.map(v=>{const img=`<img src="${esc(BASE+v.src)}" alt="${esc(v.alt)}">`;
    return `<figure>${v.scontornata?`<div class="cut">${img}</div>`:img}<figcaption>${v.didascalia.map(x=>`<span>${esc(x)}</span>`).join('')}</figcaption></figure>`;}).join('')}</div></section>`;
  if(D.processo)h+=`<section class="sec">${k('Processo',D.processo.nota)}<div class="proc">${D.processo.voci.map((v,i)=>`<div${v.fatto?' class="ok"':''}><span>${pad(i+1)}</span><b>${esc(v.titolo)}</b><span>${esc(v.stato)}</span></div>`).join('')}</div></section>`;
  if(D.prossimo)h+=`<a class="next sec" id="gNext" href="${esc(BASE+D.prossimo.link)}"><div class="k" style="display:flex;justify-content:space-between;font:500 12px/1 'Roboto Mono',monospace;margin-bottom:3vh"><span>${esc(D.prossimo.etichetta)}</span><span>→</span></div><b>${esc(D.prossimo.titolo)}</b></a>`;
  root.querySelector('.content').innerHTML=h;
}
function loadScript(src){return new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.body.appendChild(s);});}
// one builder per model; the JSON names it in modello.costruttore
const BUILDERS={oopar:()=>makeRealLamp()};
function PROJECT(root,D){
  const cv=root.querySelector('#fxG'),R=mkR(cv),S=new THREE.Scene(),cam=new THREE.PerspectiveCamera(28,1,.1,80);
  S.environment=studioEnv(R,0x6f6f6a);S.add(new THREE.AmbientLight(0xffffff,.3));const k=new THREE.DirectionalLight(0xffffff,1);k.position.set(3,5,4);S.add(k);
  const L=BUILDERS[D.modello.costruttore]();S.add(L);L.updateMatrixWorld(true);if(L.userData.setupReflection)L.userData.setupReflection(R,S);
  // camera stops: yaw, pitch, dist — object always at the centre
  const K=D.tappe.map(t=>({y:t.camera.yaw,p:t.camera.pitch,d:t.camera.dist}));
  const big=[...root.querySelectorAll('#gBig b')],dim=root.querySelector('#gDim'),tour=root.querySelector('.tour');
  const bigW=big.map(()=>new Spr(.5));
  const N=K.length,prog=new Spr(.14);let yawD=0,yv=0,drag=false,lx=0,hist=[];
  root.addEventListener('pointerdown',e=>{if(e.target.closest('.cap,.x,.ui,.content'))return;drag=true;lx=e.clientX;hist=[];yv=0;});
  root.addEventListener('pointermove',e=>{if(!drag)return;const t=performance.now(),dx=e.clientX-lx;yawD+=dx*.45;hist.push([t,dx]);hist=hist.filter(h=>t-h[0]<80);lx=e.clientX;});
  const up=()=>{if(!drag)return;drag=false;yv=RM?0:hist.reduce((a,h)=>a+h[1],0)*.45/.08;};root.addEventListener('pointerup',up);root.addEventListener('pointercancel',up);
  function size(){R.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();}addEventListener('resize',size);size();
  const ease=x=>x*x*(3-2*x),cl=(x,a,b)=>Math.max(a,Math.min(b,x)),T=new THREE.Vector3(0,0,0),v=new THREE.Vector3();
  function P(x,y,z){v.set(x,y,z).project(cam);return [(v.x*.5+.5)*innerWidth,(-v.y*.5+.5)*innerHeight];}
  function dline(a,b,label,off,acc){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l*off,ny=dx/l*off;const A=[a[0]+nx,a[1]+ny],B=[b[0]+nx,b[1]+ny];
    const tk=(p)=>`<line x1="${p[0]-nx*.25}" y1="${p[1]-ny*.25}" x2="${p[0]+nx*.25}" y2="${p[1]+ny*.25}"/>`;
    const mxp=(A[0]+B[0])/2+nx*.6,myp=(A[1]+B[1])/2+ny*.6;
    return `<g stroke="${'#111'}" stroke-width="1.2"><line x1="${a[0]}" y1="${a[1]}" x2="${A[0]}" y2="${A[1]}" stroke-dasharray="2 3"/><line x1="${b[0]}" y1="${b[1]}" x2="${B[0]}" y2="${B[1]}" stroke-dasharray="2 3"/><line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}"/>${tk(A)}${tk(B)}</g><text x="${mxp}" y="${myp}" text-anchor="middle" dominant-baseline="middle" style="fill:${'#111'}">${label}</text>`;}
  let last=performance.now();
  return function(now){const dt=Math.min(.033,(now-last)/1000);last=now;const H=innerHeight;
    const tourH=tour.offsetHeight,raw=cl(root.scrollTop/H,0,N-1);prog.t=RM?Math.round(raw):raw;if(RM)prog.x=prog.t;else prog.step(dt);
    const t=cl(prog.x,0,N-1),i=Math.min(N-2,Math.floor(t)),f=ease(t-i),A=K[i],B=K[i+1];
    let yaw=A.y+(B.y-A.y)*f+yawD,pitch=A.p+(B.p-A.p)*f,d=(A.d+(B.d-A.d)*f)*(cam.aspect<1?1.7:1);
    if(!drag){yawD+=yv*dt;yv*=Math.pow(.05,dt);if(Math.abs(yv)<3)yawD*=Math.pow(.15,dt);}
    const yr=yaw*Math.PI/180,pr=pitch*Math.PI/180;cam.position.set(d*Math.cos(pr)*Math.sin(yr),d*Math.sin(pr),d*Math.cos(pr)*Math.cos(yr));cam.lookAt(T);
    L.userData.sphere.position.y=RM?0:Math.sin(now*.0013)*.04;
    // fade the object out when the content arrives
    const fade=cl((tourH-H*.35-root.scrollTop)/(H*.5),0,1);cv.style.opacity=fade;
    // big words behind the object, one per stop, widening as they arrive
    const st=Math.round(t),near=1-Math.min(1,Math.abs(t-st)*2.2);
    big.forEach((b,j)=>{const on=j===st;bigW[j].t=on?1:0;if(RM||!on)bigW[j].x=on?1:bigW[j].x*Math.pow(.0005,dt);else bigW[j].step(dt);const w=Math.max(0,bigW[j].x);
      b.style.opacity=(Math.pow(w,3)*fade*(on?Math.max(.15,near):0)).toFixed(3);b.style.fontVariationSettings=`'wdth' ${(62+63*w).toFixed(1)},'wght' ${(300+500*w).toFixed(0)}`;b.style.transform=`translateY(${((1-w)*6).toFixed(2)}vh)`;});
    // real dimensions from the model, per stop (tappe[].quote): a line between two points, or the sphere
    let svg='';const op=near*fade;
    if(op>.02&&D.tappe[st].quote)for(const q of D.tappe[st].quote){
      if(q.sfera){const sy=L.userData.sphere.position.y,c=P(0,sy,0),e=P(q.sfera,sy,0),r=Math.hypot(e[0]-c[0],e[1]-c[1]);
        svg+=`<circle cx="${c[0]}" cy="${c[1]}" r="${r+14}" fill="none" stroke="#111" stroke-width="1.2" stroke-dasharray="3 4"/>`+dline(P(-q.sfera,0,0),P(q.sfera,0,0),esc(q.testo),-r-40,true);}
      else svg+=dline(P(...q.da),P(...q.a),esc(q.testo),q.scosta,false);}
    dim.innerHTML=svg;dim.style.opacity=op.toFixed(3);
    R.render(S,cam);
  };}
(async function(){const root=document.getElementById("liveG");
  const D=await fetch(root.dataset.progetto||'progetto.json').then(r=>r.json());
  renderProject(root,D);await loadScript(BASE+D.modello.dati);
  const frame=PROJECT(root,D);let vis=true;document.addEventListener("visibilitychange",()=>vis=!document.hidden);function loop(t){requestAnimationFrame(loop);if(vis)frame(t);}requestAnimationFrame(loop);})();
