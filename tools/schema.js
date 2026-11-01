/* Regole dei dati dei progetti. Usate dal generatore (tools/genera-indice.js) e dal server del pannello (backend/). */
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const testo=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const percorso=v=>typeof v==='string'&&/^assets\/img\/[A-Za-z0-9._\/-]+\.(png|jpe?g|webp|avif|svg)$/.test(v)&&!v.includes('..');

// Controlla una voce dell'indice. Restituisce un elenco di errori in italiano (vuoto se va bene).
function controllaVoce(p){
  const e=[];
  if(!p||typeof p!=='object')return ['la voce non è un oggetto'];
  if(!SLUG.test(p.slug||''))e.push(`slug non valido: "${p.slug}" (solo minuscole, numeri e trattini)`);
  if(!testo(p.nome,40))e.push(`${p.slug}: nome mancante o più lungo di 40 caratteri`);
  if(!testo(p.tipo,40))e.push(`${p.slug}: tipo mancante o più lungo di 40 caratteri`);
  if(!testo(p.contesto,40))e.push(`${p.slug}: contesto mancante o più lungo di 40 caratteri`);
  if(!percorso(p.anteprima))e.push(`${p.slug}: anteprima deve essere un'immagine in assets/img/`);
  if(typeof p.pagina!=='boolean')e.push(`${p.slug}: "pagina" deve essere true o false`);
  if(typeof p.pubblicato!=='boolean')e.push(`${p.slug}: "pubblicato" deve essere true o false`);
  if(p.etichetta!==undefined&&!testo(p.etichetta,6))e.push(`${p.slug}: etichetta al massimo 6 caratteri`);
  const note=['slug','nome','tipo','contesto','anteprima','pagina','pubblicato','etichetta'];
  Object.keys(p).forEach(k=>{if(!note.includes(k))e.push(`${p.slug}: campo sconosciuto "${k}"`);});
  return e;
}
function controllaIndice(d){
  if(!d||!Array.isArray(d.progetti))return ['manca l\'elenco "progetti"'];
  const e=d.progetti.flatMap(controllaVoce),visti=new Set();
  d.progetti.forEach(p=>{if(visti.has(p.slug))e.push(`slug ripetuto: ${p.slug}`);visti.add(p.slug);});
  if(d.progetti.length>60)e.push('troppi progetti (massimo 60)');
  return e;
}
// Controllo leggero della pagina progetto (lavori/<slug>/progetto.json): solo la forma, non i valori 3D.
function controllaPagina(D){
  const e=[];
  if(!D||typeof D!=='object')return ['la pagina non è un oggetto'];
  if(!testo(D.titolo,60))e.push('titolo mancante');
  if(!Array.isArray(D.tappe)||D.tappe.length<1)e.push('servono almeno una tappa');
  else D.tappe.forEach((t,i)=>{if(!t.camera||!t.parola||!testo(t.parola.testo,30))e.push(`tappa ${i+1}: servono camera e parola`);
    if(i>0&&(!t.didascalia||!testo(t.didascalia.titolo,80)))e.push(`tappa ${i+1}: manca la didascalia`);});
  if(D.scheda&&!Array.isArray(D.scheda.voci))e.push('scheda: servono le voci');
  if(D.immagini&&!Array.isArray(D.immagini.voci))e.push('immagini: servono le voci');
  else if(D.immagini)D.immagini.voci.forEach((v,i)=>{if(!percorso(v.src))e.push(`immagine ${i+1}: percorso non valido`);if(!testo(v.alt,200))e.push(`immagine ${i+1}: manca il testo alternativo`);});
  return e;
}
// Testo di assets/js/indice.js: solo i progetti pubblicati, nell'ordine dell'indice.
function generaIndiceJS(dati){
  const pubblici=dati.progetti.filter(p=>p.pubblicato).map(({slug,nome,tipo,contesto,anteprima,pagina,etichetta})=>({slug,nome,tipo,contesto,anteprima,pagina,etichetta:etichetta||''}));
  return `/* GENERATO da data/progetti.json (tools/genera-indice.js o pannello): non modificare a mano. */
const PROGETTI=${JSON.stringify(pubblici,null,1)};
PROGETTI.forEach(p=>{IMG['p_'+p.slug]=BASE+p.anteprima;});
`;
}

// Voce dell'elenco delle app (data/app.json). Ogni app pronta vive in app/<slug>/index.html.
function controllaApp(a){
  const e=[];
  if(!a||typeof a!=='object')return ['la voce non è un oggetto'];
  if(!SLUG.test(a.slug||''))e.push(`slug non valido: "${a.slug}" (solo minuscole, numeri e trattini)`);
  if(!testo(a.nome,40))e.push(`${a.slug}: nome mancante o più lungo di 40 caratteri`);
  if(!testo(a.tipo,30))e.push(`${a.slug}: tipo mancante o più lungo di 30 caratteri`);
  if(a.descrizione!==undefined&&!testo(a.descrizione,160))e.push(`${a.slug}: descrizione più lunga di 160 caratteri`);
  if(!['pronta','in-arrivo'].includes(a.stato))e.push(`${a.slug}: stato deve essere "pronta" o "in-arrivo"`);
  if(typeof a.pubblicato!=='boolean')e.push(`${a.slug}: "pubblicato" deve essere true o false`);
  Object.keys(a).forEach(k=>{if(!['slug','nome','tipo','descrizione','stato','pubblicato'].includes(k))e.push(`${a.slug}: campo sconosciuto "${k}"`);});
  return e;
}
function controllaElencoApp(d){
  if(!d||!Array.isArray(d.app))return ['manca l\'elenco "app"'];
  const e=d.app.flatMap(controllaApp),visti=new Set();
  d.app.forEach(a=>{if(visti.has(a.slug))e.push(`slug ripetuto: ${a.slug}`);visti.add(a.slug);});
  return e;
}
const escH=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Riquadri della pagina /laboratorio/, scritti nell'HTML tra i due segnaposto (testo leggibile anche senza JS).
function generaRiquadriApp(d){
  const vis=d.app.filter(a=>a.pubblicato),pad=i=>String(i+1).padStart(2,'0');
  return vis.map((a,i)=>{
    const pronta=a.stato==='pronta',cls=['t',i===0?'wide':'',pronta?'':'soon'].filter(Boolean).join(' ');
    const testa=`<div class="k"><span>${pad(i)} · ${escH(a.tipo)}</span>${pronta?`<a class="tag on" href="../app/${a.slug}/">apri ↗</a>`:'<span class="tag soon">in arrivo</span>'}</div>`;
    const prova=pronta?`<iframe class="prova" src="../app/${a.slug}/?mini=1" title="${escH(a.nome)}, prova" loading="lazy"></iframe>`:'';
    return `    <article class="${cls}">${testa}<h2>${escH(a.nome)}</h2>${a.descrizione?`<p>${escH(a.descrizione)}</p>`:''}${prova}</article>`;
  }).join('\n');
}
const SEGNAPOSTO=['<!-- app:inizio (generato da data/app.json) -->','<!-- app:fine -->'];
function inserisciRiquadri(html,d){
  const [a,b]=SEGNAPOSTO,i=html.indexOf(a),j=html.indexOf(b);
  if(i<0||j<i)throw new Error('segnaposto delle app non trovati in laboratorio/index.html');
  const n=d.app.filter(x=>x.pubblicato).length;
  return (html.slice(0,i+a.length)+'\n'+generaRiquadriApp(d)+'\n    '+html.slice(j)).replace(/<span id="nApp">\d+<\/span>/,`<span id="nApp">${n}</span>`);
}
if(typeof module!=='undefined')module.exports={SLUG,controllaVoce,controllaIndice,controllaPagina,generaIndiceJS,controllaApp,controllaElencoApp,inserisciRiquadri};
