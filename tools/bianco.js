/* Pagine dello stile «bianco» come funzione pura: dati dentro, HTML fuori. La usano tools/genera-bianco.js (scrive i file in
   stili/bianco/) e il pannello (backend/src/anteprima.js: mostra il sito con le bozze senza pubblicare niente).
   leggi(percorso) restituisce il JSON già letto di data/progetti.json, data/bianco.json e data/app.json.
   Restituisce una Map: percorso della pagina → HTML. Niente file, niente rete. */
const {inserisciRiquadri}=require('./schema.js');
function generaBianco(leggi){
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const SITO='https://leandrohenriquez.com',EMAIL='henriquez.leandro.a@gmail.com';
const LOGO='<svg xmlns="http://www.w3.org/2000/svg" viewBox="35.5 36.5 61 51" aria-hidden="true"><path fill="currentColor" d="M 62.484375 62.664062 C 62.09375 60.652344 60.859375 58.742188 59.074219 57.710938 C 56.144531 56.015625 52.414062 56.71875 49.445312 57.84375 C 48.113281 58.347656 47.378906 58.621094 46.257812 59.058594 C 46.113281 59.058594 46.042969 58.984375 46.042969 58.839844 L 46.042969 36.589844 L 44.894531 36.589844 C 42.648438 38.996094 39.5 40.546875 35.988281 40.691406 L 35.988281 86.871094 L 46.042969 86.871094 L 46.042969 61.101562 C 46.042969 60.417969 46.480469 60.023438 47.078125 59.808594 C 47.71875 59.578125 48.273438 59.339844 48.878906 59.277344 C 49.785156 59.183594 50.734375 59.480469 51.390625 60.121094 C 52.390625 61.097656 52.574219 62.496094 52.574219 63.828125 L 52.574219 86.871094 L 62.625 86.871094 L 62.617188 63.855469 C 62.617188 63.464844 62.554688 63.046875 62.484375 62.664062 "/><path fill="currentColor" d="M 90.546875 76.875 C 88.082031 76.992188 86.023438 78.960938 85.808594 81.421875 C 85.679688 82.890625 86.1875 84.242188 87.085938 85.234375 C 87.261719 85.425781 87.121094 85.730469 86.863281 85.730469 L 84.304688 85.730469 C 83.023438 85.742188 81.804688 85.257812 80.863281 84.382812 C 79.96875 83.554688 79.210938 82.210938 79.210938 80.632812 L 79.207031 36.589844 L 78.058594 36.589844 C 75.816406 38.996094 72.664062 40.546875 69.152344 40.691406 L 69.152344 86.871094 L 90.789062 86.871094 C 93.550781 86.871094 95.789062 84.632812 95.789062 81.871094 C 95.789062 79.03125 93.417969 76.742188 90.546875 76.875 "/></svg>';

/* ---- testi fissi (gli stessi dell'anteprima approvata) ---- */
const FRASE='Prodotti e packaging, dal brief alla produzione.';
const SOTTO='Disegno oggetti e confezioni per aziende e studi di design. Parto dal brief e dai componenti del cliente, porto avanti il progetto per revisioni e consegno file pronti per produrre.';
const SERVIZI=[
 {n:'Design di prodotto',t:'Oggetti che arrivano in produzione: elettrodomestici, attrezzi, componenti personalizzabili.',l:['Concept e direzione formale','Sviluppo su brief e hardware del cliente','Revisioni fino alla consegna']},
 {n:'Packaging',t:'Confezioni con fustelle e grafiche coordinate, realizzate dalle aziende.',l:['Struttura e fustelle','Grafiche coordinate','Edizioni limitate e confezioni regalo']},
 {n:'Modelli e render',t:'Modelli e immagini per presentare il progetto. Per farli ho scritto Vitrum, il mio programma di render.',l:['Modellazione 3D','Render di prodotto','Tavole di presentazione']}];
const PASSI=[['Brief','Si parte dal brief del cliente e dai componenti che il prodotto deve contenere.'],
 ['Carattere','Il design prende un carattere preciso: definito e caratterizzante, oppure di tendenza ma non eccessivo.'],
 ['Revisioni','Il progetto va avanti per revisioni con il cliente, fino a mettere d’accordo forma e tecnica.'],
 ['Produzione','File pronti per produrre: fustelle e grafiche, modelli e tavole.']];
const STUDIO={t:'Sono Leandro Henriquez, industrial designer.',lead:'Lavoro a Macerata su prodotti e packaging, per aziende e insieme a studi di design come GanzoDesign e Bottega Industriale.',
 p:['Mi occupo del progetto dall’inizio alla consegna: leggo il brief e i componenti che l’oggetto deve contenere, gli do un carattere preciso, lo porto avanti per revisioni con il cliente e preparo i file per la produzione.',
    'Accanto ai lavori su commissione ci sono i progetti di ricerca: concorsi come Pending Cultures 2017, dove Oopar ha vinto il primo premio, la tesi ONE e progetti sulla sostenibilità come Frank.',
    'Per presentare i progetti ho scritto Vitrum, un programma di render e materiali per prodotti.']};
const NOMI='<span>GanzoDesign</span>, <span>Bottega Industriale</span>, <span>Hydra</span>, <span>La Fornace</span>. Primo premio a Pending Cultures 2017, Università di Firenze.';

/* ---- progetti ---- */
const extra=leggi('data/bianco.json').progetti;
const PR=leggi('data/progetti.json').progetti.filter(p=>p.pubblicato).map(p=>{const x=extra[p.slug]||{};
  return {slug:p.slug,nome:p.nome,tipo:cap(p.tipo),anno:p.anno||x.anno||'',cliente:x.cliente||'',con:x.con||'',ruolo:x.ruolo||'',esito:x.esito||'',
    gruppo:x.gruppo||'',cat:x.categoria||'',col:x.colore||'#F3F3F2',breve:x.breve||p.descrizione||'',testo:x.testo||(p.descrizione?[p.descrizione]:[]),
    img:'/'+(x.immagine||p.anteprima),cut:!x.immagine&&/\.png$/i.test(p.anteprima),galleria:(x.galleria||[]).map(g=>'/'+g),
    scheda:(p.scheda||[]).filter(v=>!['premio','con'].includes(v.voce))};});
const chi=p=>[p.cliente?'per '+p.cliente:'',p.con?(p.con==='In team'?'in team':'con '+p.con):''].filter(Boolean).join(' · ');
const alt=p=>esc(p.nome+', '+p.tipo.toLowerCase());

/* ---- guscio comune ---- */
const VOCI=[['/lavori/','Lavori','lavori'],['/studio/','Studio','studio'],['/laboratorio/','Laboratorio','laboratorio'],['/contatti/','Contatti','contatti']];
// messo in testa: accende il movimento (se non è chiesto di ridurlo), l'ingresso alla prima pagina della visita e il sipario in arrivo
const AVVIO="(function(d){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.classList.add('mv');var s=sessionStorage;if(s.getItem('tenda')){d.classList.add('arrivo');s.removeItem('tenda')}else if(!s.getItem('visto'))d.classList.add('primo');s.setItem('visto','1')}catch(e){}})(document.documentElement)";
function piede(grandi){return `<footer class="piede">${grandi.map((x,i)=>`<a class="grande" href="${x[0]}" data-nome="${esc(x[2]||x[1])}">${x[1]}<sup>0${i+1}</sup></a>`).join('')}
  <div class="firma rv" aria-hidden="true">${'henriquez'.split('').map((c,i)=>`<span style="--i:${i}">${c}</span>`).join('')}</div>
  <div class="fin"><span>Leandro Henriquez · Industrial designer · Macerata, Italia</span><a href="mailto:${EMAIL}" data-conta="clic-email">${EMAIL}</a><a href="/laboratorio/">Laboratorio</a><a href="/privacy/">Privacy</a><span>Nessun cookie</span></div>
</footer>`;}
const P_LAVORI=[['/lavori/','Lavori'],['/contatti/','Parliamo di un progetto','Contatti']],P_ALTRI=[['/contatti/','Parliamo di un progetto','Contatti'],['/studio/','Studio']];
function pagina({file,url,titolo,desc,sez='',nome,corpo,grandi=P_ALTRI,conta=true,indice=true,immagine='/assets/img/og.jpg',classe=''}){
  const html=`<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titolo)}</title>
<meta name="description" content="${esc(desc)}">
${indice?`<link rel="canonical" href="${SITO}${url}">
<meta property="og:title" content="${esc(titolo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITO}${url}">
<meta property="og:image" content="${SITO}${immagine}">
<meta name="twitter:card" content="summary_large_image">`:'<meta name="robots" content="noindex">'}
<meta name="theme-color" content="#FFFFFF">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/outfit-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/figtree-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/bianco/bianco.css">
<script>${AVVIO}</script>
${conta?`<!-- statistiche senza cookie (vedi privacy): sul computer di sviluppo non conta nulla -->
<script data-goatcounter="https://leandrohenriquez.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`:''}
</head>
<body${classe?` class="${classe}"`:''}>
<a class="salta" href="#contenuto">Vai al contenuto</a>
<div class="intro" aria-hidden="true"><div>${LOGO}<span>henriquez</span></div></div>
<div class="tenda" aria-hidden="true">${esc(nome)}</div>
<header class="bar"><a class="marchio" href="/" data-nome="henriquez" aria-label="Leandro Henriquez, inizio">${LOGO}<span>henriquez<i>${sez}</i></span></a>
  <nav aria-label="Principale" id="nav">${VOCI.map(v=>`<a href="${v[0]}"${v[2]===sez?' aria-current="page"':''}>${v[1]}</a>`).join('')}</nav>
  <button class="trattini" id="tr" type="button" aria-label="Menu" aria-expanded="false" aria-controls="menu"></button></header>
<nav class="menu" id="menu" aria-label="Menu">${VOCI.map(v=>`<a href="${v[0]}">${v[1]}</a>`).join('')}</nav>
<main id="contenuto">
${corpo}
</main>
${piede(grandi)}
<script src="/assets/bianco/bianco.js" defer></script>
</body>
</html>
`;
  pagine.set(file,html);
}
const pagine=new Map();
const testa=(indietro,h1,lead,cls='')=>`<header><a class="indietro" href="${indietro[0]}" data-nome="${esc(indietro[2]||indietro[1])}">← ${indietro[1]}</a><h1 data-parole${cls?` class="${cls}"`:''}>${esc(h1)}</h1><p class="lead">${lead}</p></header>`;

/* ---- home: la frase e un solo oggetto, nessun elenco di lavori ---- */
const eroe=PR.find(p=>p.slug==='one')||PR.find(p=>p.cut)||PR[0];
pagina({file:'index.html',url:'/',titolo:'Leandro Henriquez · Industrial designer',desc:'Leandro Henriquez, industrial designer a Macerata: prodotti e packaging per aziende e studi di design, dal brief alla produzione.',nome:'henriquez',grandi:P_LAVORI,corpo:`<section class="apri">
  <div><h1 data-parole>${FRASE}</h1><p>${SOTTO}</p><a class="vedi" href="/lavori/" data-nome="Lavori">Vedi i lavori →</a></div>
  <div class="scena"><img src="${eroe.img}" alt="${alt(eroe)}"></div>
  <span class="scorri" aria-hidden="true">Scorri</span>
</section>
<div class="banda" aria-hidden="true"><div id="banda">${(SERVIZI.map(s=>s.n).join(' · ')+' · ').repeat(3)}</div></div>
<section class="sez"><h2 class="p">Cosa faccio</h2><ol class="num">${SERVIZI.map((s,i)=>`<li class="rv"><span class="n">0${i+1}</span><h3>${s.n}</h3><span class="p">${s.t}</span></li>`).join('')}</ol></section>
<section class="sez"><h2 class="p">Come lavoro</h2><div class="frasi">${PASSI.map((s,i)=>`<article class="rv"><h3>${s[1]}</h3><span class="p">0${i+1} · ${s[0]}</span></article>`).join('')}</div></section>
<section class="sez"><h2 class="p">Con chi ho lavorato</h2><p class="nomi rv">${NOMI}</p></section>`});

/* ---- Lavori: uno alla volta ---- */
const FILTRI=[['','Tutti'],['aziende','Per aziende'],['ricerca','Ricerca e concorsi'],['Packaging','Packaging']].filter(f=>!f[0]||PR.some(p=>p.gruppo===f[0]||p.cat.includes(f[0])));
pagina({file:'lavori/index.html',url:'/lavori/',titolo:'Lavori · Leandro Henriquez',desc:`${PR.length} progetti di prodotto e packaging di Leandro Henriquez: ${PR.slice(0,4).map(p=>p.nome).join(', ')} e altri.`,sez:'lavori',nome:'Lavori',classe:'pag-lavori',corpo:`<section class="lavori" id="lavori">
  <h1>Lavori</h1>
  <div class="lati"><ul class="filtri" id="filtri" role="group" aria-label="Filtra i lavori">${FILTRI.map((f,i)=>`<li><button type="button" data-f="${f[0]}" aria-pressed="${i===0}">${f[1]}</button></li>`).join('')}</ul>
    <nav class="punti" id="punti" aria-label="Indice dei lavori">${PR.map((p,i)=>`<a href="#l-${p.slug}" aria-label="${esc(p.nome)}"></a>`).join('')}<button type="button" data-d="-1">‹ Prec</button><button type="button" data-d="1">Succ ›</button></nav></div>
  <div id="righe">${PR.map((p,i)=>`
    <a class="riga${p.cut?'':' foto'}" id="l-${p.slug}" data-g="${p.gruppo}" data-c="${esc(p.cat)}" data-nome="${esc(p.nome)}" data-conta="apri-${p.slug}" href="/lavori/${p.slug}/"><span class="tx rv"><span class="n">${String(i+1).padStart(2,'0')}</span><b>${esc(p.nome)}</b><span class="p">${esc(p.breve)}<small>${esc([p.tipo,chi(p),p.esito].filter(Boolean).join(' · '))}</small></span></span><span class="im rv"><img src="${p.img}" alt="${alt(p)}"${i>1?' loading="lazy"':''}></span></a>`).join('')}
  </div>
</section>`});

/* ---- schede progetto ---- */
PR.forEach((p,i)=>{const nx=PR[(i+1)%PR.length];
  const sch=[['Tipo',p.tipo],['Cliente',p.cliente],['Con',p.con],['Anno',p.anno],['Il mio ruolo',p.ruolo],['Esito',p.esito]].filter(r=>r[1]).concat(p.scheda.map(v=>[cap(v.voce),v.valore]));
  pagina({file:`lavori/${p.slug}/index.html`,url:`/lavori/${p.slug}/`,titolo:`${p.nome}, ${p.tipo.toLowerCase()} · Leandro Henriquez`,desc:(p.testo[0]||p.breve).slice(0,300),sez:'lavori',nome:p.nome,immagine:/\.(jpe?g|png)$/i.test(p.img)?p.img:'/assets/img/og.jpg',
   corpo:`<article class="v prog" style="--c:${p.col}">
${testa(['/lavori/','Tutti i lavori','Lavori'],p.nome,esc(p.breve),p.nome.length>9?'lungo':'')}
<figure class="fig${p.cut?' cut':''}"><img src="${p.img}" alt="${alt(p)}"></figure>
<div class="corpo"><dl>${sch.map(r=>`<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl><div class="testo">${p.testo.map(t=>`<p>${esc(t)}</p>`).join('')}</div></div>
${p.galleria.length?`<div class="gal">${p.galleria.map(g=>`<figure class="fig"><img src="${g}" alt="${esc(p.nome)}, dettaglio" loading="lazy"></figure>`).join('')}</div>`:''}
<a class="pross" href="/lavori/${nx.slug}/" data-nome="${esc(nx.nome)}" data-conta="apri-${nx.slug}"><small>Progetto successivo</small><b>${esc(nx.nome)} →</b><span>${esc(nx.tipo)}</span></a>
</article>`});});

/* ---- Studio ---- */
pagina({file:'studio/index.html',url:'/studio/',titolo:'Studio · Leandro Henriquez',desc:STUDIO.lead,sez:'studio',nome:'Studio',grandi:P_LAVORI,corpo:`<article class="v">
${testa(['/','Inizio','henriquez'],STUDIO.t,STUDIO.lead)}
<div class="corpo"><dl><div><dt>Dove</dt><dd>Macerata, Italia</dd></div><div><dt>Studi con cui collaboro</dt><dd>GanzoDesign · Bottega Industriale</dd></div><div><dt>Riconoscimenti</dt><dd>1° premio Pending Cultures 2017</dd></div></dl><div class="testo">${STUDIO.p.map(t=>`<p>${t}</p>`).join('')}</div></div>
<h2>Cosa faccio</h2><div class="tre">${SERVIZI.map((s,i)=>`<section class="rv"><small>0${i+1}</small><h3>${s.n}</h3><p>${s.t}</p><ul>${s.l.map(x=>`<li>${x}</li>`).join('')}</ul></section>`).join('')}</div>
<h2>Come lavoro</h2><ol class="quattro">${PASSI.map((s,i)=>`<li class="rv"><small>0${i+1}</small><h3>${s[0]}</h3><p>${s[1]}</p></li>`).join('')}</ol>
<a class="pross" href="/contatti/" data-nome="Contatti"><small>Disponibile per nuovi progetti</small><b>Parliamo del tuo progetto →</b></a>
</article>`});

/* ---- Contatti ---- */
pagina({file:'contatti/index.html',url:'/contatti/',titolo:'Contatti · Leandro Henriquez',desc:'Scrivi a Leandro Henriquez per un progetto di prodotto o di packaging.',sez:'contatti',nome:'Contatti',grandi:[['/lavori/','Lavori'],['/studio/','Studio']],corpo:`<article class="v">
${testa(['/','Inizio','henriquez'],'Parliamo del tuo progetto.','Scrivimi due righe: che cosa va progettato, per chi, e se c’è già un brief o un hardware da cui partire.')}
<div class="corpo"><dl><div><dt>Email</dt><dd><a href="mailto:${EMAIL}" data-conta="clic-email">${EMAIL}</a></dd></div><div><dt>LinkedIn</dt><dd><a href="https://www.linkedin.com/in/leandro-henriquez-57730515b/" target="_blank" rel="noopener" data-conta="clic-linkedin">Profilo e percorso ↗</a></dd></div><div><dt>Instagram</dt><dd><a href="https://www.instagram.com/henriquez_leandro/" target="_blank" rel="noopener" data-conta="clic-instagram">Lavori e prove ↗</a></dd></div></dl>
<form class="modulo" novalidate data-a="${EMAIL}"><label>Nome<input name="n" autocomplete="name" required></label><label>Azienda o studio<input name="a" autocomplete="organization"></label>
<label>Il progetto in breve<textarea name="d" rows="5" required></textarea></label><button type="submit">Prepara l’email</button><p class="nota">Il modulo apre il tuo programma di posta con il messaggio già scritto. Il sito non salva niente.</p></form></div>
</article>`});

/* ---- Laboratorio: i riquadri tra i segnaposto sono quelli comuni a tutti gli stili (schema.js, pannello) ---- */
const app=leggi('data/app.json');
pagina({file:'laboratorio/index.html',url:'/laboratorio/',titolo:'Laboratorio · Leandro Henriquez',desc:'Piccole app fatte da Leandro Henriquez: si provano direttamente nel browser.',sez:'laboratorio',nome:'Laboratorio',corpo:inserisciRiquadri(`<article class="v">
${testa(['/','Inizio','henriquez'],'Strumenti che costruisco.','Oltre ai progetti, scrivo programmi: alcuni si usano direttamente qui, senza installare niente.')}
<div class="lab">
  <!-- app:inizio (generato da data/app.json) -->
    <!-- app:fine -->
  <a class="vit" href="/vitrum/"><span class="k"><span>Programma · Windows</span><span class="tag on">apri ↗</span></span><h2>Vitrum</h2><p>Il mio programma di render e materiali per prodotti. Ha la sua pagina, che resta nel suo stile.</p></a>
</div>
</article>`,app)});

/* ---- Privacy (testo dell'informativa del 2 novembre 2026) ---- */
const PRIV=[['Chi tratta i dati',`<p>Leandro Henriquez, Macerata (Italia). Per qualsiasi domanda sulla privacy scrivi a <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>`],
 ['Cookie','<p>Il sito pubblico non usa cookie e non mostra pubblicità. Per questo non c’è un banner da accettare. Per ricordare, finché la scheda resta aperta, che l’ingresso con il marchio è già stato mostrato, il sito tiene una nota tecnica nel browser: non contiene dati su di te e sparisce chiudendo la scheda.</p><p>Caratteri, script e immagini stanno sul sito stesso: aprendo una pagina non contatti servizi di terzi come Google Fonts o reti di pubblicità.</p>'],
 ['Statistiche','<p>Per sapere quante persone visitano il sito e quali pagine guardano uso <a href="https://www.goatcounter.com/help/privacy" rel="noopener">GoatCounter</a>, un servizio europeo e senza cookie. Raccoglie solo dati aggregati: la pagina vista, il sito da cui arrivi, il tipo di dispositivo, il browser e il paese. Non salva il tuo indirizzo IP e non ti riconosce da una visita all’altra.</p><p>Base giuridica: legittimo interesse a capire come viene usato il sito (art. 6.1.f GDPR).</p>'],
 ['Hosting','<p>Il sito è ospitato da GitHub Pages (GitHub, Inc.). Come ogni server, GitHub registra per motivi di sicurezza dati tecnici delle richieste, tra cui l’indirizzo IP, e li conserva per un periodo limitato. Dettagli nell’<a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">informativa di GitHub</a>.</p>'],
 ['Se mi scrivi','<p>Se mi contatti via email, LinkedIn o Instagram, uso il tuo nome, il tuo indirizzo e quello che scrivi solo per risponderti. Non li inserisco in liste e non li passo a nessuno. Li cancello quando la conversazione è finita, a meno che non serva conservarli per un lavoro insieme. Il modulo della pagina Contatti non invia niente al sito: prepara il messaggio nel tuo programma di posta.</p>'],
 ['Laboratorio','<p>Le app del <a href="/laboratorio/">Laboratorio</a> fanno i calcoli nel tuo browser: quello che inserisci non viene inviato né salvato.</p>'],
 ['Area riservata','<p>Il pannello di gestione del sito è usato solo da me e dalle persone che autorizzo. Chi entra lo fa con il proprio account Google; il pannello usa un cookie tecnico di sessione, che scade dopo 12 ore, e conserva solo l’elenco delle email autorizzate.</p>'],
 ['I tuoi diritti','<p>Puoi chiedermi in qualsiasi momento di vedere, correggere o cancellare i dati che ti riguardano, oppure opporti al loro uso (artt. 15–22 GDPR). Se pensi che i tuoi dati siano trattati in modo scorretto puoi fare reclamo al <a href="https://www.garanteprivacy.it" rel="noopener">Garante per la protezione dei dati personali</a>.</p>']];
pagina({file:'privacy/index.html',url:'/privacy/',titolo:'Privacy · Leandro Henriquez',desc:'Informativa sulla privacy di leandrohenriquez.com: niente cookie, statistiche anonime.',sez:'privacy',nome:'Privacy',corpo:`<article class="v">
${testa(['/','Inizio','henriquez'],'Privacy','In breve: questo sito non usa cookie, non ti profila e non vende niente. Conta le visite in forma anonima e, se mi scrivi, uso la tua email solo per risponderti.')}
<div class="corpo"><dl><div><dt>Informativa</dt><dd>aggiornata il 24 novembre 2026</dd></div><div><dt>Titolare</dt><dd>Leandro Henriquez, Macerata (Italia)</dd></div></dl><div class="testo"><p>Qui sotto trovi, punto per punto, quali dati passano dal sito e che cosa ne faccio.</p>${PRIV.map((s,i)=>`<h2>${i+1} · ${s[0]}</h2>${s[1]}`).join('')}</div></div>
</article>`});

/* ---- 404 ---- */
pagina({file:'404.html',url:'/404.html',titolo:'Pagina non trovata · Leandro Henriquez',desc:'Questa pagina non c’è.',nome:'henriquez',indice:false,grandi:P_LAVORI,corpo:`<article class="v nf"><header><h1 data-parole>Questa pagina non c’è.</h1><p class="lead">Forse il link è vecchio. Da qui si arriva ovunque: <a href="/lavori/">Lavori</a>, <a href="/studio/">Studio</a>, <a href="/laboratorio/">Laboratorio</a>, <a href="/contatti/">Contatti</a>.</p><a class="indietro" href="/" data-nome="henriquez">← Torna all’inizio</a></header></article>`});

/* ---- app: Peso futuro del cane (si apre anche dentro il Laboratorio con ?mini=1; niente statistiche) ---- */
pagina({file:'app/peso-cane/index.html',url:'/app/peso-cane/',titolo:'Peso futuro del cane · Laboratorio di Leandro Henriquez',desc:'Stima del peso da adulto del tuo cane, partendo dal peso e dall’età di oggi.',sez:'laboratorio',nome:'Peso futuro del cane',conta:false,corpo:`<article class="v">
${testa(['/laboratorio/','Laboratorio'],'Peso futuro del cane','Quanto peserà da adulto, partendo dal peso e dall’età di oggi.')}
<div class="app">
  <form id="f" onsubmit="return false"><label for="w">Peso oggi (kg)<input id="w" type="number" inputmode="decimal" value="11.4" min="0.2" max="100" step="0.1"></label><label for="a">Età (settimane)<input id="a" type="number" inputmode="numeric" value="24" min="6" max="52" step="1"></label></form>
  <div class="esito" aria-live="polite"><span class="p">Kg da adulto · stima</span><b id="r">—</b><div class="misura"><u id="rb" style="width:0"></u></div><span class="p" id="rn"></span></div>
  <p class="come">Stima indicativa per cani di taglia media: peso adulto ≈ peso di oggi ÷ settimane × 52. Le taglie piccole finiscono di crescere prima, le grandi dopo: per un valore preciso chiedi al veterinario.</p>
</div>
</article>
<script>
if(new URLSearchParams(location.search).has('mini')){document.documentElement.classList.remove('mv','primo','arrivo');document.body.classList.add('mini');}
(function(){var w=document.getElementById('w'),a=document.getElementById('a'),r=document.getElementById('r'),rb=document.getElementById('rb'),rn=document.getElementById('rn');
function calc(){var kg=parseFloat(w.value),wk=parseFloat(a.value);
  if(!(kg>0)||!(wk>=6&&wk<=52)){r.textContent='—';rb.style.width='0%';rn.textContent='Inserisci un’età tra 6 e 52 settimane';return;}
  var adulto=kg/wk*52,p=Math.min(100,kg/adulto*100);
  r.textContent=adulto.toLocaleString('it-IT',{maximumFractionDigits:1});rb.style.width=p.toFixed(0)+'%';rn.textContent='Oggi è al '+p.toFixed(0)+'% del peso finale';}
w.addEventListener('input',calc);a.addEventListener('input',calc);calc();})();
</script>`});
return pagine;
}
if(typeof module!=='undefined')module.exports={generaBianco};
