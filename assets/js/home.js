/* hl. — home */
function HOME(root){
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const accOf=()=>getComputedStyle(root).getPropertyValue('--ink').trim()||'#111111';
  const H=()=>innerHeight;
  // transition with the real module shapes, then open the project page
  const tr=root.querySelector('#jTr');MODCELLS.forEach((c,i)=>tr.insertAdjacentHTML('beforeend',`<svg viewBox="${c.v}" preserveAspectRatio="none" style="transition-delay:${(i%3+Math.floor(i/3))*45}ms"><path d="${c.d}"/></svg>`));
  addEventListener('pageshow',()=>tr.classList.remove('go'));
  root.querySelectorAll('a[href*="linkedin.com"]').forEach(a=>a.addEventListener('click',()=>conta('clic-linkedin')));
  function toProject(slug){conta('apri-'+(slug||'oopar'));const go=()=>{location.href='lavori/'+(slug||'oopar')+'/';};if(RM){go();return;}tr.classList.add('go');setTimeout(go,470);}
  // i link restano veri (tastiera, nuova scheda con ctrl/cmd): la transizione solo sul clic semplice
  const plain=e=>!(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button>0);
  const openLink=(slug)=>e=>{if(!plain(e))return;e.preventDefault();toProject(slug);};
  // nav: scorre alla sezione e ci porta anche il focus della tastiera
  root.querySelectorAll('.jnav a[data-to],.msheet a[data-to]').forEach(a=>a.onclick=e=>{e.preventDefault();const s=root.querySelector('#'+a.dataset.to),go=()=>{root.scrollTo({top:s.offsetTop-20,behavior:RM?'auto':'smooth'});s.focus({preventScroll:true});};
    // dal menu del telefono: prima si chiude (e si sblocca lo scroll), poi si scorre al frame dopo
    if(root.classList.contains('menu-open')){setMenu(false);requestAnimationFrame(go);}else go();});
  // menu del telefono: il pulsante apre e chiude il foglio, Esc lo chiude, Tab resta dentro finché è aperto
  const mbtn=root.querySelector('#jMenu'),sheetLinks=[...root.querySelectorAll('.msheet a')];
  function setMenu(open,back){if(root.classList.contains('menu-open')===open)return;root.classList.toggle('menu-open',open);mbtn.setAttribute('aria-expanded',open);mbtn.textContent=open?'chiudi':'menu';
    if(open)sheetLinks[0].focus({preventScroll:true});else if(back)mbtn.focus({preventScroll:true});}
  mbtn.onclick=()=>setMenu(!root.classList.contains('menu-open'),true);
  root.addEventListener('keydown',e=>{if(!root.classList.contains('menu-open'))return;if(e.key==='Escape'){setMenu(false,true);return;}
    if(e.key!=='Tab')return;const f=[mbtn,...sheetLinks],i=f.indexOf(document.activeElement);
    if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&(i<0||i===f.length-1)){e.preventDefault();f[0].focus();}});
  matchMedia('(min-width:761px)').addEventListener('change',m=>{if(m.matches)setMenu(false);});
  // hero letters + email letters (kinetic, as liked)
  let hero=[];root.querySelectorAll('.kin').forEach(k=>hero=hero.concat(splitLetters(k)));
  const mailEl=root.querySelector('#jMail'),mail=splitLetters(mailEl);
  const cp=root.querySelector('#jCopied');const ADDR='henriquez.leandro.a@gmail.com',ok=()=>{conta('email-copiata');cp.textContent='indirizzo copiato ✓';cp.style.opacity=1;setTimeout(()=>cp.style.opacity=0,1400);};
  const legacy=()=>{const t=document.createElement('textarea');t.value=ADDR;t.setAttribute('readonly','');t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();let done=false;try{done=document.execCommand('copy');}catch(e){}t.remove();if(done)ok();else location.href='mailto:'+ADDR;};
  mailEl.onclick=e=>{if(!plain(e))return;e.preventDefault();if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(ADDR).then(ok,legacy);else legacy();};
  // index with mouse-follow preview
  const TOUCH=matchMedia('(hover: none)').matches;
  const idx=root.querySelector('#jIdx'),peek=makePeek(root,320);
  // rows come from data/progetti.json (generated into assets/js/indice.js)
  const nLav=root.querySelector('#jLav .hd b i');if(nLav)nLav.textContent=PROGETTI.length;
  // con la pagina la riga è un link vero; senza pagina resta un div
  PROGETTI.forEach((p,i)=>{const r=document.createElement(p.pagina?'a':'div');r.className='row';if(p.pagina)r.href='lavori/'+p.slug+'/';
    r.innerHTML=`<i>${String(i+1).padStart(2,'0')}</i><b>${esc(p.nome)}</b><span>${esc(p.tipo)}<small>tipo</small></span><span>${esc(p.contesto)}<small>contesto</small></span>${p.etichetta?`<em>${esc(p.etichetta)}</em>`:p.pagina?'<span>→</span>':'<span></span>'}`;
    if(!TOUCH){r.onpointerenter=()=>peek.show('p_'+p.slug);r.onpointerleave=()=>peek.hide();}if(p.pagina)r.onclick=openLink(p.slug);idx.appendChild(r);});
  // telefono (≤ 760 px, variante C del 2/11): ogni nome riempie la sua riga anche quando è acceso (peso 850), al massimo 24vw
  const rowNames=[...idx.querySelectorAll('.row b')];let nKey='';
  function sizeNames(){const k=innerWidth+'|'+(document.fonts?document.fonts.status:'');if(k===nKey)return;nKey=k;
    if(innerWidth>760){rowNames.forEach(n=>n.style.fontSize='');return;}
    rowNames.forEach(n=>{n.style.transition='none';n.style.fontSize='100px';n.style.fontVariationSettings="'wdth' 62,'wght' 850";});
    rowNames.forEach(n=>{n._fs=Math.min(innerWidth*.24,100*(n.clientWidth-2)/n.scrollWidth);});
    rowNames.forEach(n=>{n.style.fontSize=n._fs.toFixed(1)+'px';n.style.fontVariationSettings='';n.style.transition='';n._v='';});}
  // telefono (≤ 760 px, variante A del 3/11): nome "a misura", ogni riga riempie la larghezza, LEANDRO peso 800 e HENRIQUEZ 300, senza cinetica
  const kinEls=[...root.querySelectorAll('.kin')],kinW=["'wdth' 62,'wght' 800","'wdth' 62,'wght' 300"];let hKey='';
  function fitHero(){const k=innerWidth+'|'+(document.fonts?document.fonts.status:'');if(k===hKey)return false;hKey=k;
    // la cache di setVar va svuotata, così tornando sopra i 760 px la cinetica riscrive i pesi
    if(innerWidth>760){kinEls.forEach(el=>el.style.fontSize='');hero.forEach(o=>o.el._fontVariationSettings='');return false;}
    kinEls.forEach((el,i)=>{const sp=[...el.children];sp.forEach(s=>{s.style.fontVariationSettings=kinW[i];s._fontVariationSettings='';});el.style.fontSize='100px';
      const w=sp.reduce((a,s)=>a+s.getBoundingClientRect().width,0);el.style.fontSize=(100*(el.clientWidth-1)/w).toFixed(1)+'px';});
    return true;}
  // senza mouse comanda lo scroll: la riga sulla linea di fuoco (36% dello schermo) si accende e l'anteprima si aggancia sotto
  const tIdx=TOUCH?(()=>{const rows=[...idx.querySelectorAll('.row')],nm=rows.map(r=>r.querySelector('b'));
    const pv=document.createElement('div');pv.className='peekt';pv.innerHTML=PROGETTI.map(p=>`<img alt="${esc(p.nome)}" decoding="async">`).join('')+'<small></small>';idx.appendChild(pv);
    const im=[...pv.querySelectorAll('img')],cap=pv.querySelector('small');let cur=-1;
    const fv=g=>`'wdth' 62,'wght' ${g.toFixed(0)}`;
    return function(vh){
      const F=vh*.36,c=rows.map(r=>{const b=r.getBoundingClientRect();return {m:(b.top+b.bottom)/2,h:b.height};});
      if(c[0].m>vh*1.5||c[c.length-1].m<-vh*.5){if(cur!==-1){cur=-1;pv.style.opacity=0;}return;}
      let best=-1,bd=1e9;c.forEach((o,i)=>{const d=Math.abs(o.m-F);if(d<bd){bd=d;best=i;}});if(bd>c[0].h*1.6)best=-1;
      c.forEach((o,i)=>{const f=Math.max(0,1-Math.abs(o.m-F)/o.h);const v=fv(400+450*f);if(nm[i]._v!==v){nm[i]._v=v;nm[i].style.fontVariationSettings=v;}});
      if(best!==cur){cur=best;if(best<0){pv.style.opacity=0;return;}
        [best,best+1,best-1].forEach(j=>{if(im[j]&&!im[j].src)im[j].src=IMG['p_'+PROGETTI[j].slug];});
        im.forEach((x,i)=>x.classList.toggle('on',i===best));cap.textContent=PROGETTI[best].tipo+' · '+PROGETTI[best].contesto;
        pv.style.transform=`translateY(${rows[best].offsetTop+rows[best].offsetHeight+6}px)`;pv.style.opacity=1;}};})():null;
  root.querySelector('#jGo').onclick=openLink('oopar');root.querySelector('#jPic').onclick=()=>toProject('oopar');
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
    if(st<vh){if(fitHero())qKey='';if(innerWidth>760)kinetic(hero,mx,my,dt,vh);
      const a=kins[0].getBoundingClientRect(),b=kins[1].getBoundingClientRect();const key=[a.left,a.top,b.right,b.bottom].map(Math.round).join();
      if(key!==qKey){qKey=key;const hr=root.querySelector('#jHero').getBoundingClientRect();
        q.innerHTML=dimH(b.left-hr.left,b.right-hr.left,b.bottom-hr.top+34,'industrial designer — '+PROGETTI.length+' progetti','#111')+dimH(a.left-hr.left,a.right-hr.left,a.top-hr.top-26,'design specialist in Elica dal 2022',accOf());}}
    let ms=-1;for(let k=0;k<secs.length;k++)if(st+vh*.5>=secs[k].top)ms=k;const label=names[ms+1]||names[0];if(secUi._t!==label){secUi._t=label;secUi.textContent=label;}
    secs.forEach(o=>{const f=Math.max(0,Math.min(1,(st+vh-o.top)/(vh*.9)));setVar(o.bw,'fontVariationSettings',fvs(62+63*f,300+500*f));setVar(o.bw,'transform',`translateY(${((1-f)*10).toFixed(1)}vh)`);});
    const ftop=secs[1].top;if(Math.abs(st+vh*.5-ftop-vh*.4)<vh){const r=pic.getBoundingClientRect();const k=[r.width,r.height].map(Math.round).join();if(k!==pKey){pKey=k;const w=r.width,h=r.height;
      picQ.innerHTML=dimH(w*.14,w*.86,h-28,'300 mm','#111')+dimV(w-30,h*.22,h*.78,'195','#111');}}
    if(st>secs[3].top-vh)kinetic(mail,mx,my,dt,vh);
    const lt=secs[2].top+vh*.2;words.forEach((w,i)=>{const r=(st+vh*.75-lt)/(vh*.6)*words.length-i;const f=Math.max(0,Math.min(1,r));setVar(w,'fontVariationSettings',fvs(62,300+500*f));setVar(w,'color',f>.5?'#111':'#a9a59c');});
    sizeNames();if(tIdx)tIdx(vh);else peek.step(dt);
  };}
(function(){const root=document.getElementById("liveJ");const frame=HOME(root);function loop(t){requestAnimationFrame(loop);frame(t);}requestAnimationFrame(loop);
 if(location.hash==="#lavori"){root.scrollTop=document.getElementById("jLav").offsetTop-20;}})();
