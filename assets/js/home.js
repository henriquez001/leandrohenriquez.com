/* hl. — home */
function HOME(root){
  const accOf=()=>getComputedStyle(root).getPropertyValue('--ink').trim()||'#111111';
  const H=()=>innerHeight;
  // transition with the real module shapes, then open the project page
  const tr=root.querySelector('#jTr');MODCELLS.forEach((c,i)=>tr.insertAdjacentHTML('beforeend',`<svg viewBox="${c.v}" preserveAspectRatio="none" style="transition-delay:${(i%3+Math.floor(i/3))*45}ms"><path d="${c.d}"/></svg>`));
  function toProject(){const go=()=>{location.href='lavori/oopar/';};if(RM){go();return;}tr.classList.add('go');setTimeout(go,470);}
  // nav
  root.querySelectorAll('.jnav a').forEach(a=>a.onclick=()=>{const s=root.querySelector('#'+a.dataset.to);root.scrollTo({top:s.offsetTop-20,behavior:RM?'auto':'smooth'});});
  // hero letters + email letters (kinetic, as liked)
  let hero=[];root.querySelectorAll('.kin').forEach(k=>hero=hero.concat(splitLetters(k)));
  const mailEl=root.querySelector('#jMail'),mail=splitLetters(mailEl);
  const cp=root.querySelector('#jCopied');mailEl.onclick=()=>{try{navigator.clipboard.writeText('henriquez.leandro.a@gmail.com').then(()=>{cp.style.opacity=1;setTimeout(()=>cp.style.opacity=0,1400);},()=>{});}catch(e){}};
  // index with mouse-follow preview
  const idx=root.querySelector('#jIdx'),peek=makePeek(root,320);
  const who=['tesi · Firenze','prodotto · in vendita','con GanzoDesign','con GanzoDesign','kit + packaging','in team','personalizzabile','sostenibilità','1° premio','con Bottega Ind.'];
  PROJ6.forEach((p,i)=>{const r=document.createElement('div');r.className='row';
    r.innerHTML=`<i>${String(i+1).padStart(2,'0')}</i><b>${p[0]}</b><span>${p[1].split(' · ')[0]}<small>tipo</small></span><span>${who[i]}<small>contesto</small></span>${p[0]==='Oopar'?'<em>3D</em>':'<span>→</span>'}`;
    r.onpointerenter=()=>peek.show(p[2]);r.onpointerleave=()=>peek.hide();if(p[0]==='Oopar')r.onclick=toProject;idx.appendChild(r);});
  root.querySelector('#jGo').onclick=toProject;root.querySelector('#jPic').onclick=toProject;
  // studio lead words: bold in as you read
  const lead=root.querySelector('#jLead');lead.innerHTML=lead.textContent.split(' ').map(w=>`<span>${w}</span>`).join(' ');const words=[...lead.querySelectorAll('span')];
  // big outline words behind sections
  const secs=[...root.querySelectorAll('section.sx')].map(s=>({s,bw:s.querySelector('.bw'),top:0,h:0}));
  function measure(){secs.forEach(o=>{o.top=o.s.offsetTop;o.h=o.s.offsetHeight;});}measure();addEventListener('resize',measure);
  const names=['(00) home','(01) lavori','(02) in evidenza','(03) studio','(04) contatti'];const secUi=root.querySelector('#jSec');
  // hero dimension line under the name, featured image dims
  const q=root.querySelector('#jQ'),kins=[...root.querySelectorAll('.kin')],picQ=root.querySelector('#jPicQ'),pic=root.querySelector('#jPic');
  function dimH(x1,x2,y,label,col){return `<g stroke="${col}" stroke-width="1.2"><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><line x1="${x1}" y1="${y-7}" x2="${x1}" y2="${y+7}"/><line x1="${x2}" y1="${y-7}" x2="${x2}" y2="${y+7}"/></g><rect x="${(x1+x2)/2-label.length*4-8}" y="${y-9}" width="${label.length*8+16}" height="18" fill="#E9E6DF"/><text x="${(x1+x2)/2}" y="${y+4}" text-anchor="middle" style="fill:${col}">${label}</text>`;}
  function dimV(x,y1,y2,label,col){return `<g stroke="${col}" stroke-width="1.2"><line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/><line x1="${x-7}" y1="${y1}" x2="${x+7}" y2="${y1}"/><line x1="${x-7}" y1="${y2}" x2="${x+7}" y2="${y2}"/></g><text x="${x+12}" y="${(y1+y2)/2+4}" style="fill:${col}">${label}</text>`;}
  let mx=innerWidth/2,my=innerHeight/2;root.addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;});
  const ck=[root.querySelector('#jClock'),root.querySelector('#jClock2')];let sec=-1,last=performance.now(),qKey='',pKey='';root._redraw=()=>{qKey='';pKey='';};
  return function(now){const dt=Math.min(.033,(now-last)/1000);last=now;const vh=H(),st=root.scrollTop;
    const s=Math.floor(Date.now()/1000);if(s!==sec){sec=s;const t=new Date().toLocaleTimeString('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit',second:'2-digit'});ck[0].textContent='macerata '+t;ck[1].textContent=t;}
    if(st<vh){kinetic(hero,mx,my,dt,vh);
      const a=kins[0].getBoundingClientRect(),b=kins[1].getBoundingClientRect();const key=[a.left,a.top,b.right,b.bottom].map(Math.round).join();
      if(key!==qKey){qKey=key;const hr=root.querySelector('#jHero').getBoundingClientRect();
        q.innerHTML=dimH(b.left-hr.left,b.right-hr.left,b.bottom-hr.top+34,'industrial designer — 10 progetti','#111')+dimH(a.left-hr.left,a.right-hr.left,a.top-hr.top-26,'design specialist in Elica dal 2022',accOf());}}
    const ms=secs.findIndex(o=>st+vh*.5>=o.top&&st+vh*.5<o.top+o.h);const label=names[ms+1]||names[0];if(secUi._t!==label){secUi._t=label;secUi.textContent=label;}
    secs.forEach(o=>{const f=Math.max(0,Math.min(1,(st+vh-o.top)/(vh*.9)));setVar(o.bw,'fontVariationSettings',fvs(62+63*f,300+500*f));setVar(o.bw,'transform',`translateY(${((1-f)*10).toFixed(1)}vh)`);});
    const ftop=secs[1].top;if(Math.abs(st+vh*.5-ftop-vh*.4)<vh){const r=pic.getBoundingClientRect();const k=[r.width,r.height].map(Math.round).join();if(k!==pKey){pKey=k;const w=r.width,h=r.height;
      picQ.innerHTML=dimH(w*.14,w*.86,h-28,'300 mm','#111')+dimV(w-30,h*.22,h*.78,'195','#111');}}
    if(st>secs[3].top-vh)kinetic(mail,mx,my,dt,vh);
    const lt=secs[2].top+vh*.2;words.forEach((w,i)=>{const r=(st+vh*.75-lt)/(vh*.6)*words.length-i;const f=Math.max(0,Math.min(1,r));setVar(w,'fontVariationSettings',fvs(62,300+500*f));setVar(w,'color',f>.5?'#111':'#a9a59c');});
    peek.step(dt);
  };}
(function(){const root=document.getElementById("liveJ");const frame=HOME(root);function loop(t){requestAnimationFrame(loop);frame(t);}requestAnimationFrame(loop);
 if(location.hash==="#lavori"){root.scrollTop=document.getElementById("jLav").offsetTop-20;}})();
