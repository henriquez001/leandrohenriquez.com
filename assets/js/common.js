/* hl. — codice condiviso */
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const BASE=document.documentElement.dataset.base||'';
const IMG={cut_one:BASE+'assets/img/cut-one.png',hydra:BASE+'assets/img/hydra.jpg',cut_baiyun:BASE+'assets/img/cut-baiyun.png',cut_brtw:BASE+'assets/img/cut-brtw.png',cut_greenhero:BASE+'assets/img/cut-greenhero.png',cut_andy:BASE+'assets/img/cut-andy.png',otto:BASE+'assets/img/otto.jpg',cut_frank:BASE+'assets/img/cut-frank.png',cut_oopar_b:BASE+'assets/img/cut-oopar.png',fornace:BASE+'assets/img/fornace.jpg',oopar:BASE+'assets/img/oopar.jpg'};
/* ---------- shared ---------- */


  // walnut: solid (volumetric) wood, no UVs needed — grain runs along X, rings around it
  const WALNUT_GLSL=`
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 perm(vec4 x){return mod289(((x*34.)+1.)*x);}vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
  float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
   vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
   i=mod289(i);vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
   float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
   vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
   vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
   vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
   vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
   vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
  float fbm(vec3 p){float f=0.,a=.5;for(int i=0;i<3;i++){f+=a*snoise(p);p*=2.03;a*=.5;}return f;}
  vec3 walnut(vec3 p, out float rough){
    vec3 q=p;
    q.yz+=.04*vec2(fbm(p*vec3(.25,1.6,1.6)),fbm(p*vec3(.25,1.6,1.6)+7.3));   // gentle waviness
    float r=length(q.yz+vec2(2.3,-1.4))*16.+snoise(p*vec3(.3,1.8,1.8))*.35+p.x*.25;  // rings around an off-centre pith, along X
    float ring=fract(r);float late=smoothstep(.55,.8,ring)*smoothstep(1.,.86,ring);     // dark latewood line
    float streak=fbm(p*vec3(.18,5.,5.)+2.)*.5+.5;                                        // long colour streaks
    float pores=smoothstep(.62,.98,snoise(p*vec3(3.,90.,90.)));                         // open pores along the grain
    vec3 base=mix(vec3(.058,.031,.017),vec3(.115,.066,.036),streak);
    vec3 c=mix(base,vec3(.026,.014,.008),late*.75);c*=1.-pores*.35;
    rough=.34+pores*.25;return c;}`;
  function walnutMat(){
    const m=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.42,clearcoat:.22,clearcoatRoughness:.45,side:THREE.DoubleSide});
    m.onBeforeCompile=sh=>{
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLP;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLP=position;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vLP;'+WALNUT_GLSL)
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );','float wRough;vec3 wc=walnut(vLP,wRough);vec4 diffuseColor=vec4(wc,opacity);')
        .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=wRough;');};
    return m;}

const OOPAR_PATTERN_REPEAT=4; // ripetizioni del pattern intorno al foro: 2 = A, 4 = B, 8 = C
function makeRealLamp(opts){
  opts=opts||{};
  const G=new THREE.Group();
  function b64(s,T){const bin=atob(s);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new T(u.buffer);}
  const geos=LAMP_DATA.map(p=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(b64(p.p,Float32Array),3));g.setIndex(new THREE.BufferAttribute(b64(p.i,Uint16Array),1));g.computeVertexNormals();return g;});
  if(opts.wire){
    const lm=new THREE.LineBasicMaterial({color:0xffffff});const wm=new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.12});
    geos.forEach(g=>{G.add(new THREE.LineSegments(new THREE.EdgesGeometry(g,20),lm));G.add(new THREE.Mesh(g,wm));});
    G.userData.sphere=G.children[0];return G;}
  // inner lining (part 2): cylindrical UVs around Z, z in [-.86,.86], seam fixed per triangle
  geos[2]=(g=>{const n=g.toNonIndexed(),P=n.attributes.position,c=P.count,uv=new Float32Array(c*2);
    for(let i=0;i<c;i++){uv[i*2]=Math.atan2(P.getY(i),P.getX(i))/(2*Math.PI)+.5;uv[i*2+1]=(P.getZ(i)+.86)/1.72;}
    for(let t=0;t<c;t+=3){const a=uv[t*2],b=uv[t*2+2],d=uv[t*2+4];if(Math.max(a,b,d)-Math.min(a,b,d)>.5)for(let j=0;j<3;j++)if(uv[(t+j)*2]<.5)uv[(t+j)*2]+=1;}
    n.setAttribute('uv',new THREE.BufferAttribute(uv,2));return n;})(geos[2]);
  // outer skin (part 3) has an inner wall 2 cm inside the lining that hid it: drop those faces, keep a 14 mm walnut rim
  geos[3]=((g3,g2)=>{const B=360,r2=new Float32Array(B).fill(9),P2=g2.attributes.position;
    for(let i=0;i<P2.count;i++){const x=P2.getX(i),y=P2.getY(i),b=Math.floor((Math.atan2(y,x)/(2*Math.PI)+.5)*B)%B;r2[b]=Math.min(r2[b],Math.hypot(x,y));}
    for(let b=0;b<B;b++)if(r2[b]>8){let j=1;while(r2[(b+j)%B]>8&&r2[(b-j+B)%B]>8)j++;r2[b]=Math.min(r2[(b+j)%B],r2[(b-j+B)%B]);}
    const P=g3.attributes.position,I=g3.index.array,keep=[];
    for(let t=0;t<I.length;t+=3){let cx=0,cy=0,cz=0;for(let j=0;j<3;j++){cx+=P.getX(I[t+j]);cy+=P.getY(I[t+j]);cz+=P.getZ(I[t+j]);}cx/=3;cy/=3;cz/=3;
      const b=Math.floor((Math.atan2(cy,cx)/(2*Math.PI)+.5)*B)%B;if(Math.abs(cz)<.86&&Math.hypot(cx,cy)<r2[b]-.005)continue;keep.push(I[t],I[t+1],I[t+2]);}
    const g=g3.clone();g.setIndex(keep);return g;})(geos[3],geos[2]);
  // Madhubani pattern on the backlit lining (mirrored repeat hides the seams)
  const K=OOPAR_PATTERN_REPEAT;
  const tex=new THREE.TextureLoader().load(BASE+'assets/img/oopar-pattern.jpg',()=>{if(G.userData.capture)G.userData.capture();});
  tex.encoding=THREE.sRGBEncoding;tex.wrapS=tex.wrapT=THREE.MirroredRepeatWrapping;tex.repeat.set(K,K*1.72/13);
  const crt=new THREE.WebGLCubeRenderTarget(256,{generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter,encoding:THREE.sRGBEncoding});
  const skin=walnutMat(), body=walnutMat();
  const mats=[new THREE.MeshStandardMaterial({color:0xffffff,metalness:1,roughness:.02,envMap:crt.texture,envMapIntensity:1}),
    body,
    new THREE.MeshStandardMaterial({color:0xffffff,map:tex,emissiveMap:tex,roughness:.85,side:THREE.DoubleSide,emissive:0xffe9c8,emissiveIntensity:.55}),
    skin];
  geos.forEach((g,i)=>{const m=new THREE.Mesh(g,mats[i]);G.add(m);if(i===0)G.userData.sphere=m;});
  const glow=new THREE.PointLight(0xffe6c0,1.4,4);G.add(glow);
  // chrome sphere reflects the real interior: cube camera at its centre, shot once (and again when the texture arrives)
  const cc=new THREE.CubeCamera(.05,30,crt);G.add(cc);
  G.userData.setupReflection=(R,S)=>{const bg=new THREE.Color(0x6f6f6a);
    G.userData.capture=()=>{const sp=G.userData.sphere,old=S.background;sp.visible=false;S.background=bg;cc.update(R,S);S.background=old;sp.visible=true;};
    G.userData.capture();};
  return G;
}

function makeLamp(opts){
  opts=opts||{};
  const G=new THREE.Group();
  const st=(()=>{const c=document.createElement('canvas');c.width=512;c.height=16;const g=c.getContext('2d');const cs=['#3b2f26','#d8d2c6','#6b5a4a','#efeae0'];for(let i=0;i<16;i++){g.fillStyle=cs[i%4];g.fillRect(i*32,0,32,16);}const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;})();
  const geos={ring:new THREE.TorusGeometry(1.15,.42,48,160),inner:new THREE.CylinderGeometry(.74,.74,.5,64,1,true),sph:new THREE.SphereGeometry(.42,64,64),base:new THREE.BoxGeometry(1.1,.08,.5)};
  const parts=[];
  function add(geo,mat,setup){const m=new THREE.Mesh(geo,mat);setup(m);G.add(m);parts.push(m);return m;}
  if(opts.wire){
    const lm=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.9});
    const wm=new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.18});
    [[geos.ring,m=>{m.scale.set(1.18,.82,.62)}],[geos.inner,m=>{m.rotation.x=Math.PI/2;m.scale.set(1.18,1,.82)}],[geos.sph,m=>{}],[geos.base,m=>{m.position.y=-1.34}]].forEach(([g,s])=>{
      const e=new THREE.LineSegments(new THREE.EdgesGeometry(g,18),lm);s(e);G.add(e);const w=new THREE.Mesh(g,wm);s(w);G.add(w);});
    G.userData.sphere=G.children[5];
    return G;}
  add(geos.ring,new THREE.MeshStandardMaterial({map:st,roughness:.5}),m=>m.scale.set(1.18,.82,.62));
  add(geos.inner,new THREE.MeshStandardMaterial({color:0xf3eee4,roughness:.9,side:THREE.DoubleSide,emissive:0xfff1d6,emissiveIntensity:.4}),m=>{m.rotation.x=Math.PI/2;m.scale.set(1.18,1,.82)});
  const s=add(geos.sph,new THREE.MeshStandardMaterial({color:0xffffff,metalness:1,roughness:.03}),m=>{});
  add(geos.base,new THREE.MeshStandardMaterial({color:0x1d1d1b,roughness:.4,metalness:.2}),m=>m.position.y=-1.34);
  const glow=new THREE.PointLight(0xffe6c0,1.6,5);glow.position.z=.3;G.add(glow);
  G.userData.sphere=s; return G;
}
function studioEnv(R,base){
  const env=new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(20,20,20),new THREE.MeshBasicMaterial({color:base,side:THREE.BackSide})));
  const pl=(w,h,x,y,z,ry,rx,c)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.set(rx||0,ry,0);env.add(m);};
  pl(9,1.4,0,6,-4,0,0,0xffffff);pl(1.5,9,-7,1,0,Math.PI/2,0,0xffffff);pl(1,7,7,0,1,-Math.PI/2,0,0x8c8c88);pl(12,4,0,-7,0,0,0,0x3a3a38);pl(7,7,0,9.5,0,0,Math.PI/2,0xffffff);
  return new THREE.PMREMGenerator(R).fromScene(env,.02).texture;
}
function mkR(cv){const R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,powerPreference:'high-performance'});R.setClearColor(0,0);R.setPixelRatio(Math.min(devicePixelRatio,1.5));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;return R;}
function Spr(r,d){this.x=0;this.v=0;this.t=0;this.k=Math.pow(2*Math.PI/r,2);this.c=4*Math.PI*(d||1)/r;}
Spr.prototype.step=function(dt){const n=Math.max(1,Math.ceil(dt/0.004)),h=dt/n;for(let i=0;i<n;i++){const a=-this.k*(this.x-this.t)-this.c*this.v;this.v+=a*h;this.x+=this.v*h;}return this.x;};



function setVar(el,key,val){if(el['_'+key]!==val){el['_'+key]=val;el.style[key]=val;}}
function fvs(w,g){return `'wdth' ${w.toFixed(0)},'wght' ${(Math.round(g/10)*10)}`;}
function makePeek(root,w){const d=document.createElement('div');d.className='peekx';d.style.width=(w||300)+'px';d.innerHTML='<img alt="">';root.appendChild(d);
  const img=d.firstChild,px=new Spr(.3),py=new Spr(.3);let on=false,mx=0,my=0,vx=0;
  root.addEventListener('pointermove',e=>{vx=e.clientX-mx;mx=e.clientX;my=e.clientY;});
  return {show(k){img.src=IMG[k];on=true;d.style.opacity=1;},hide(){on=false;d.style.opacity=0;},
    step(dt){px.t=mx+28;py.t=my-d.offsetHeight*.55;if(!on){px.x=px.t;py.x=py.t;}px.step(dt);py.step(dt);const tilt=RM?0:Math.max(-8,Math.min(8,px.v*.012));
      d.style.transform=`translate(${px.x.toFixed(1)}px,${py.x.toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`;}};}

const PROJ6=[['ONE','macchina da caffè · tesi','cut_one'],['Hydra NR_01','case pc · in vendita','hydra'],['BaiYun','aspiratutto · ganzodesign','cut_baiyun'],['BRTW','ellittica · ganzodesign','cut_brtw'],['Green Hero','kit giardinaggio','cut_greenhero'],['Andy','apriscatole · team','cut_andy'],['Otto.1','rubinetteria','otto'],['Frank','l’essere sostenibile','cut_frank'],['Oopar','lampada · 1° premio','cut_oopar_b'],['La Fornace','packaging','fornace']];
function kinetic(spans,mx,my,dt,H){const rs=spans.map(o=>o.el.getBoundingClientRect());spans.forEach((o,i)=>{const r=rs[i];if(r.bottom<-50||r.top>H+50)return;const d=Math.hypot(mx-(r.left+r.width/2),(my-(r.top+r.height/2))*1.4);const f=Math.max(0,1-d/(H*.55));o.w.t=62+63*f;o.g.t=250+650*f;if(RM){o.w.x=o.w.t;o.g.x=o.g.t;}else{o.w.step(dt);o.g.step(dt);}setVar(o.el,'fontVariationSettings',fvs(o.w.x,o.g.x));});}
function splitLetters(el){const out=[];[...el.dataset.word].forEach(ch=>{const s=document.createElement('span');s.textContent=ch;el.appendChild(s);out.push({el:s,w:new Spr(.35),g:new Spr(.35)});});return out;}



const MODCELLS=[{"v": "490.45 315.79 63.2 63.2", "d": "M 522.09375 316.394531 C 504.953125 316.394531 491.054688 330.289062 491.054688 347.433594 C 491.054688 364.574219 504.953125 378.472656 522.09375 378.472656 C 539.238281 378.472656 553.132812 364.574219 553.132812 347.433594 C 553.132812 330.289062 539.238281 316.394531 522.09375 316.394531 "}, {"v": "563.41 315.79 63.2 63.2", "d": "M 571.171875 316.394531 L 564.011719 316.394531 L 564.011719 378.472656 L 626.089844 378.472656 L 626.089844 371.269531 C 626.089844 340.960938 601.503906 316.394531 571.171875 316.394531 "}, {"v": "636.36 315.79 63.2 63.2", "d": "M 668.003906 316.394531 C 650.863281 316.394531 636.964844 330.289062 636.964844 347.433594 L 636.964844 378.472656 L 668.003906 378.472656 C 685.148438 378.472656 699.046875 364.574219 699.046875 347.433594 C 699.046875 330.289062 685.148438 316.394531 668.003906 316.394531 "}, {"v": "490.45 388.75 63.2 63.2", "d": "M 553.136719 389.347656 L 546.035156 389.347656 C 546.023438 389.363281 546.011719 389.375 546 389.386719 C 536.574219 406.027344 518.722656 417.261719 498.234375 417.261719 L 491.054688 417.261719 L 491.054688 451.425781 L 553.136719 451.425781 Z "}, {"v": "563.41 388.75 63.2 63.2", "d": "M 595.050781 389.347656 C 577.90625 389.347656 564.011719 403.246094 564.011719 420.386719 C 564.011719 437.53125 577.90625 451.425781 595.050781 451.425781 C 612.191406 451.425781 626.089844 437.53125 626.089844 420.386719 C 626.089844 403.246094 612.191406 389.347656 595.050781 389.347656 "}, {"v": "636.36 388.75 63.2 63.2", "d": "M 644.125 389.347656 C 644.125 389.347656 644.128906 389.347656 644.125 389.347656 L 636.964844 389.347656 L 636.964844 451.425781 L 699.046875 451.425781 L 699.046875 444.222656 C 699.046875 413.917969 674.453125 389.347656 644.125 389.347656 "}, {"v": "490.45 461.70 63.2 63.2", "d": "M 498.214844 462.304688 L 491.054688 462.304688 L 491.054688 524.382812 L 553.136719 524.382812 L 553.136719 517.179688 C 553.136719 486.871094 528.546875 462.304688 498.214844 462.304688 "}, {"v": "563.41 461.70 63.2 63.2", "d": "M 595.050781 462.304688 C 577.90625 462.304688 564.011719 476.199219 564.011719 493.34375 L 564.011719 524.382812 L 595.050781 524.382812 C 612.191406 524.382812 626.089844 510.484375 626.089844 493.34375 C 626.089844 476.199219 612.191406 462.304688 595.050781 462.304688 "}, {"v": "636.36 461.70 63.2 63.2", "d": "M 699.046875 462.304688 L 691.945312 462.304688 C 691.933594 462.316406 691.921875 462.328125 691.910156 462.34375 C 682.488281 478.980469 664.632812 490.21875 644.144531 490.21875 L 636.964844 490.21875 L 636.964844 524.382812 L 699.046875 524.382812 Z "}];
