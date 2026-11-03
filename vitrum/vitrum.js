// Vitrum · vetrina. Due cose sole: il selettore di qualità del pannello Render
// e la tab dell'isola che segue la sezione sullo schermo.

// Indirizzo dell'installer. Vuoto finché Leandro non decide dove scaricarlo:
// il pulsante porta alla sezione Scarica.
const SCARICA = '';
if (SCARICA) document.querySelectorAll('a[href="#scarica"].btn, #scarica-link').forEach((a) => { a.href = SCARICA; });

// Selettore di qualità: risponde alla pressione, non al rilascio (apple-motion § 1);
// la pillola scorre con la molla di Vitrum ed è interrompibile (§ 3 e § 4).
const seg = document.getElementById('qualita');
if (seg) {
  const thumb = seg.querySelector('.th');
  const tempo = document.getElementById('tempo');
  const buttons = [...seg.querySelectorAll('button')];
  const choose = (b) => {
    const i = buttons.indexOf(b);
    buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    thumb.style.transform = `translateX(${i * 100}%)`;
    tempo.textContent = b.dataset.tempo;
  };
  buttons.forEach((b) => {
    b.addEventListener('pointerdown', () => choose(b));
    b.addEventListener('click', () => choose(b)); // tastiera
  });
}

// Isola: la tab attiva è la sezione che occupa il centro dello schermo.
const tabs = [...document.querySelectorAll('.notch.c .t')];
const byId = new Map(tabs.map((t) => [t.getAttribute('href').slice(1), t]));
const sections = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
if ('IntersectionObserver' in window && sections.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      tabs.forEach((t) => t.removeAttribute('aria-current'));
      byId.get(e.target.id)?.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));
}
