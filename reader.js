const app = document.getElementById('app');
const R = window.READER;
const fmt = v => String(v).replace('.', ',');
let lesNr = 1;

function head() {
  return '<header class="top"><div class="brand">Reader Koude Oorlog</div><div class="sub">Oefenen en leren · Mediacollege Amsterdam</div></header>';
}
function lesFromHash() {
  const m = /les(\d)/.exec(location.hash || '');
  const n = m ? parseInt(m[1], 10) : 1;
  return n >= 1 && n <= R.lessen.length ? n : 1;
}

/* ---------- Spanningslijn (SVG) ---------- */
function lijnSvg(upTo) {
  const pts = [];
  R.lessen.forEach(l => {
    if (l.id <= upTo) l.lijn.forEach(p => pts.push({ s: p.s, v: p.v, les: l.id }));
  });
  const n = pts.length;
  const step = n > 12 ? 62 : 92;
  const left = 98, right = 28, top = 34, bottom = n > 8 ? 108 : 70;
  const W = left + right + step * (n - 1) + 40, H = 330 + bottom - 70;
  const yOf = v => top + (10 - v) * ((H - top - bottom) / 9);
  const xOf = i => left + 20 + i * step;
  let g = '';
  for (let v = 1; v <= 10; v++) {
    g += `<line class="gr" x1="${left}" x2="${W - right}" y1="${yOf(v)}" y2="${yOf(v)}"/>`;
    const lab = v === 1 ? '1 vrede' : (v === 10 ? '10 kernoorlog' : String(v));
    g += `<text class="yl" x="${left - 8}" y="${yOf(v) + 4}" text-anchor="end">${lab}</text>`;
  }
  let oud = '', nu = '';
  pts.forEach((p, i) => {
    if (i === 0) return;
    const a = pts[i - 1];
    const seg = `<line x1="${xOf(i - 1)}" y1="${yOf(a.v)}" x2="${xOf(i)}" y2="${yOf(p.v)}"/>`;
    if (p.les === upTo) nu += seg; else oud += seg;
  });
  g += `<g class="seg-oud">${oud}</g><g class="seg-nu">${nu}</g>`;
  pts.forEach((p, i) => {
    const cls = p.les === upTo ? 'pt-nu' : 'pt-oud';
    g += `<circle class="${cls}" cx="${xOf(i)}" cy="${yOf(p.v)}" r="7"/>`;
    g += `<text class="vl ${cls}" x="${xOf(i)}" y="${yOf(p.v) - 14}" text-anchor="middle">${fmt(p.v)}</text>`;
    const lx = xOf(i), ly = H - bottom + 20;
    if (n > 8) g += `<text class="xl" transform="translate(${lx} ${ly}) rotate(-38)" text-anchor="end">${esc(p.s)}</text>`;
    else g += `<text class="xl" x="${lx}" y="${ly}" text-anchor="middle">${esc(p.s)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="Spanningslijn van 1945 tot ${upTo === 4 ? '1991' : 'het einde van deze les'}">${g}</svg>`;
}

function lijnLijst(upTo) {
  let rows = '';
  R.lessen.forEach(l => {
    if (l.id > upTo) return;
    l.lijn.forEach(p => {
      rows += `<li class="${l.id === upTo ? 'nu' : 'oud'}"><span class="ln">${esc(p.s)}</span><span class="lb"><i style="width:${p.v * 10}%"></i></span><b>${fmt(p.v)}</b></li>`;
    });
  });
  return `<ol class="lijn-lijst" aria-label="Spanning per gebeurtenis, van 1 vrede tot 10 kernoorlog">${rows}</ol>`;
}

/* ---------- Kaarten ---------- */
function kaartHtml(k, hn, kn) {
  const pijl = k.geenLijn
    ? '<span class="pill neutraal">geen nieuw punt op de lijn</span>'
    : `<span class="pill">${esc(k.pijl)} · van ${fmt(k.van)} naar ${fmt(k.naar)}</span>`;
  const beelden = (k.beelden || []).map(b => `<figure><img src="/reader-img/${esc(b[0])}.jpg" alt="${esc(b[1])}" loading="lazy"><figcaption>${esc(b[1])}</figcaption></figure>`).join('');
  const inv = k.invullen ? `<div class="invullen">[${esc(k.invullen)}]</div>` : '';
  const sec = (kop, tekst) => `<div class="sec"><h4>${kop}</h4><p>${esc(tekst)}</p></div>`;
  return `<details class="rcard">
    <summary><span class="nr">${kn}</span><span class="tt">${esc(k.titel)}</span>${pijl}</summary>
    <div class="rbody">
      ${k.noot ? `<p class="noot">${esc(k.noot)}</p>` : ''}
      ${(beelden || inv) ? `<div class="fotos n${(k.beelden || []).length || 1}">${beelden}${inv}</div>` : ''}
      ${k.onderschrift ? `<p class="onderschrift">${esc(k.onderschrift)}</p>` : ''}
      <div class="secs">
        ${sec('Wat en wanneer', k.wat)}${sec('Waarom', k.waarom)}${sec('Gevolg', k.gevolg)}${sec('Persoon in één zin', k.persoon)}
      </div>
      <div class="vragen"><h4>Oefenvragen</h4><ol>${k.vragen.map(v => `<li>${esc(v)}</li>`).join('')}</ol></div>
    </div>
  </details>`;
}

/* ---------- Pagina ---------- */
function lesBody(n) {
  const l = R.lessen[n - 1];
  let kaartNr = 0;
  const hOffset = R.lessen.slice(0, n - 1).reduce((a, x) => a + x.hoofdstukken.length, 0);
  const chap = l.hoofdstukken.map((h, hi) => `
    <section class="chap">
      <h2><span class="cn">Hoofdstuk ${hOffset + hi + 1}</span>${esc(h.titel)}</h2>
      <p class="chap-intro">${esc(h.intro)}</p>
      ${h.kaarten.map(k => { kaartNr++; return kaartHtml(k, hi, kaartNr); }).join('')}
    </section>`).join('');
  const toetsTip = n === 4 ? '<li>Leer voor de toets met de reader en de oefentoets in de app.</li>' : '';
  return `<div class="les-kop"><p class="datum">${esc(l.datum)} · ${esc(l.jaren)}</p><h1>${esc(l.titel)}</h1></div>
    <section class="intro">
      <h2>${esc(l.inleidingKop)}</h2>
      ${l.inleiding.map(p => `<p>${esc(p)}</p>`).join('')}
      <h3>Zo gebruik je deze reader</h3>
      <ul>
        <li>Lees eerst de inleiding. Klap daarna de kaarten open.</li>
        <li>Kijk bij elke kaart naar de spanningspijl en het cijfer op de lijn.</li>
        <li>Maak de oefenvragen onderaan elke kaart. Je ziet ze later terug in de Kahoot en in de toets.</li>
        <li>Bedenk zelf een toetsvraag. De beste vragen komen in de vragenbank.</li>
        ${toetsTip}
      </ul>
      <p class="small-note">Spanningspijlen: ▲ klein, ▲▲ middel, ▲▲▲ groot. ▼ betekent dat de spanning daalt. 1 is vrede. 10 is kernoorlog.</p>
    </section>
    <section class="lijn-card">
      <h2>De spanningslijn${n > 1 ? ' tot en met les ' + n : ''}</h2>
      <div class="lijn-scroll">${lijnSvg(n)}</div>${lijnLijst(n)}
      ${n > 1 ? '<p class="small-note">Grijs is de lijn uit de lessen ervoor. Magenta is deze les.</p>' : ''}
    </section>
    ${chap}`;
}

let bewaard = null;
function printHele() {
  const body = document.getElementById('lesbody');
  bewaard = body.innerHTML;
  body.innerHTML = R.lessen.map(x => `<div class="les-blok">${lesBody(x.id)}</div>`).join('');
  titelBewaard = document.title;
  document.title = 'Reader Koude Oorlog';
  klaarVoorPrint().then(() => window.print());
}
let titelBewaard = null;
function klaarVoorPrint() {
  app.querySelectorAll('details.rcard').forEach(d => d.open = true);
  const imgs = [...app.querySelectorAll('img')];
  imgs.forEach(i => { i.loading = 'eager'; });
  return Promise.race([
    Promise.all(imgs.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))),
    new Promise(r => setTimeout(r, 4000))
  ]);
}
window.addEventListener('afterprint', () => {
  if (titelBewaard !== null) { document.title = titelBewaard; titelBewaard = null; }
  if (bewaard !== null) { document.getElementById('lesbody').innerHTML = bewaard; bewaard = null; }
});

function view(n) {
  lesNr = n;
  const l = R.lessen[n - 1];
  const tabs = R.lessen.map(x => `<a class="ltab${x.id === n ? ' on' : ''}" href="#les${x.id}" data-n="${x.id}"><b>Les ${x.id}</b><span>${esc(x.kort)}</span></a>`).join('');
  app.innerHTML = head() + `<main class="reader">
    <div class="tools top">
      <a class="btn ghost small terug-start" href="/">← Naar de start van Oefenen en leren</a>
      <button class="btn ghost small" id="open" type="button">Alles openklappen</button>
      <button class="btn ghost small" id="dicht" type="button">Alles dichtklappen</button>
      <button class="btn ghost small" id="print" type="button">Print deze les</button>
      <button class="btn small" id="printall" type="button">Print hele reader</button>
    </div>
    <nav class="lestabs" aria-label="Kies een les">${tabs}</nav>
    <div id="lesbody">${lesBody(n)}</div>
    <div class="les-nav">
      ${n > 1 ? `<a class="btn ghost" href="#les${n - 1}">← Les ${n - 1}</a>` : '<span></span>'}
      ${n < R.lessen.length ? `<a class="btn" href="#les${n + 1}">Les ${n + 1} →</a>` : '<a class="btn" href="/">Naar het menu</a>'}
    </div>
    <p class="small-note terug"><a href="/">← Terug naar Oefenen en leren</a></p>
  </main>`;
  window.scrollTo(0, 0);
  const all = () => app.querySelectorAll('details.rcard');
  document.getElementById('open').onclick = () => all().forEach(d => d.open = true);
  document.getElementById('dicht').onclick = () => all().forEach(d => d.open = false);
  document.getElementById('print').onclick = () => klaarVoorPrint().then(() => window.print());
  document.getElementById('printall').onclick = printHele;
  document.title = l.titel + ' | Reader Koude Oorlog';
}

window.addEventListener('hashchange', () => view(lesFromHash()));
window.addEventListener('beforeprint', () => { app.querySelectorAll('details.rcard').forEach(d => d.open = true); app.querySelectorAll('img').forEach(i => { i.loading = 'eager'; }); });
view(lesFromHash());
