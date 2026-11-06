/* hl. — "cottura" delle foto dei poster.
   L'effetto fotocopia (bianco e nero contrastato, inchiostro di colore, copia rosa fuori registro) prima era fatto
   dal browser con filtri e fusioni a ogni fotogramma: su Firefox per Android lo scroll scattava.
   Qui lo si calcola UNA volta, in un canvas, e la foto diventa un'immagine normale: stesso aspetto, nessun lavoro durante lo scroll.
   Usato dalla home (scelta del 6/11, prova 5). Valori presi dal tema (assets/tema/tema.css) e dalle stesse formule dei filtri CSS. */
(function(){
const R=document.documentElement,CS=getComputedStyle(R);
const rgb=s=>{const c=document.createElement('canvas').getContext('2d');c.fillStyle=s.trim()||'#000';const h=c.fillStyle;
  if(h[0]==='#')return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);return h.match(/[\d.]+/g).slice(0,3).map(v=>v/255);};
const PAPER=rgb(CS.getPropertyValue('--carta')),OFX=parseFloat(CS.getPropertyValue('--fuori-registro-x'))||9,OFY=parseFloat(CS.getPropertyValue('--fuori-registro-y'))||6,
  REGA=parseFloat(CS.getPropertyValue('--fuori-registro-opacita'))||.75,REGT=[0,.45,.25]; // quanto la copia rosa toglie a R,G,B nei mezzitoni (nero resta nero, bianco resta bianco)
// grayscale(1) → contrast(c) → brightness(b), come i filtri CSS
const gray=(r,g,b,c,br)=>{let v=.2126*r+.7152*g+.0722*b;v=(v-.5)*c+.5;v*=br;return v<0?0:v>1?1:v;};
function cuoci(img){const ph=img.closest('.ph');if(!ph||ph.dataset.cotta)return;
  const w=img.naturalWidth,h=img.naturalHeight;if(!w||!h)return;
  const S=Math.max(w,h),sc=S/ph.offsetWidth,ox=Math.round(OFX*sc),oy=Math.round(OFY*sc),W=S+ox,H=S+oy;
  const src=document.createElement('canvas');src.width=S;src.height=S;const sx=src.getContext('2d');sx.drawImage(img,(S-w)/2,(S-h)/2);
  const I=sx.getImageData(0,0,S,S).data;
  const tint=rgb(getComputedStyle(ph).getPropertyValue('--c'));
  const out=document.createElement('canvas');out.width=W;out.height=H;const ox2=out.getContext('2d'),O=ox2.createImageData(W,H),D=O.data;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=(y*W+x)*4;let col=null,al=1;
    if(x<S&&y<S){const j=(y*S+x)*4,a=I[j+3]/255,g=gray(I[j]/255,I[j+1]/255,I[j+2]/255,3.2,1.05);
      // la foto (trasparente = nero per il 'screen') si fonde con l'inchiostro, poi il tutto va in multiply sulla carta
      col=[0,1,2].map(i=>PAPER[i]*(1-(1-g*a)*(1-tint[i])));}
    const rx=x-ox,ry=y-oy;let reg=null,ra=0;
    if(rx>=0&&ry>=0&&rx<S&&ry<S){const j=(ry*S+rx)*4;ra=I[j+3]/255;if(ra>0){const g2=gray(I[j]/255,I[j+1]/255,I[j+2]/255,3,1.4);reg=[0,1,2].map(i=>Math.max(0,g2-4*g2*(1-g2)*REGT[i]));}}
    if(col){if(reg)col=col.map((v,i)=>v*(1-REGA*ra*(1-reg[i])));}
    else if(reg){col=reg.map((v,i)=>PAPER[i]*v);al=REGA*ra;}else{al=0;col=[0,0,0];}
    D[k]=col[0]*255;D[k+1]=col[1]*255;D[k+2]=col[2]*255;D[k+3]=al*255;}
  ox2.putImageData(O,0,0);
  out.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b);const n=new Image();n.alt=img.alt;n.className='cotta';n.decoding='async';
    n.onload=()=>{ph.dataset.cotta='1';ph.classList.add('cotta');ph.style.setProperty('--ox',(OFX)+'px');ph.style.setProperty('--oy',(OFY)+'px');img.replaceWith(n);};n.src=u;},'image/webp',.9);}
// cuoce le foto quando stanno per entrare in vista (una alla volta, fuori dallo scroll)
const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;io.unobserve(e.target);const img=e.target;
  const go=()=>(window.requestIdleCallback||setTimeout)(()=>cuoci(img));if(img.complete)go();else img.addEventListener('load',go,{once:true});}),{rootMargin:'150% 0px'});
document.querySelectorAll('.ps .ph:not(.reg) img').forEach(i=>io.observe(i));
})();
