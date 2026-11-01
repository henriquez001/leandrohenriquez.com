/* hl. — pagina progetto */
function PROJECT(root){
  const cv=root.querySelector('#fxG'),R=mkR(cv),S=new THREE.Scene(),cam=new THREE.PerspectiveCamera(28,1,.1,80);
  S.environment=studioEnv(R,0x6f6f6a);S.add(new THREE.AmbientLight(0xffffff,.3));const k=new THREE.DirectionalLight(0xffffff,1);k.position.set(3,5,4);S.add(k);
  const L=makeRealLamp();S.add(L);L.updateMatrixWorld(true);L.userData.setupReflection(R,S);
  // camera stops: yaw, pitch, dist — object always at the centre
  const K=[{y:35,p:18,d:11.5},{y:0,p:4,d:10.5},{y:10,p:6,d:7.6},{y:-62,p:16,d:9.4},{y:-150,p:10,d:9.8}];
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
    // real dimensions from the STEP (W 300, H 195, D 200 mm; sphere Ø90)
    let svg='';const op=near*fade;
    if(op>.02&&st===1){svg=dline(P(-1.5,-.98,0),P(1.5,-.98,0),'300 mm',46,false)+dline(P(1.5,.98,0),P(1.5,-.98,0),'195',-40,false)+dline(P(-1.5,.98,-1),P(-1.5,.98,1),'200',-38,false);}
    if(op>.02&&st===2){const c=P(0,L.userData.sphere.position.y,0),e=P(.45,L.userData.sphere.position.y,0),r=Math.hypot(e[0]-c[0],e[1]-c[1]);
      svg=`<circle cx="${c[0]}" cy="${c[1]}" r="${r+14}" fill="none" stroke="#111" stroke-width="1.2" stroke-dasharray="3 4"/>`+dline(P(-.45,0,0),P(.45,0,0),'Ø 90',-r-40,true);}
    dim.innerHTML=svg;dim.style.opacity=op.toFixed(3);
    R.render(S,cam);
  };}
(function(){const root=document.getElementById("liveG");const frame=PROJECT(root);let vis=true;document.addEventListener("visibilitychange",()=>vis=!document.hidden);function loop(t){requestAnimationFrame(loop);if(vis)frame(t);}requestAnimationFrame(loop);})();
