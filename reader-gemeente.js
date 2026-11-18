/* Reader Gemeentepolitiek: open voor iedereen, zonder code. Voortgang staat alleen in deze browser. */
const app = document.getElementById('app');
const G = window.GEMEENTE;
const KEY = 'gemeente_reader_antwoorden';
let gekozen = {};
try { gekozen = JSON.parse(store.get(KEY) || '{}') || {}; } catch (e) { gekozen = {}; }
function bewaar() { store.set(KEY, JSON.stringify(gekozen)); }
const LET = ['A', 'B', 'C', 'D'];

function head() {
  return '<header class="top"><div class="brand">Reader Gemeentepolitiek</div><div class="sub">Oefenen en leren · Mediacollege Amsterdam</div></header>';
}

function blokHtml(b) {
  if (b.t === 'p') return `<p class="gp">${b.h}</p>`;
  if (b.t === 'ul') return `<ul class="gl">${b.items.map(i => `<li>${i}</li>`).join('')}</ul>`;
  if (b.t === 'tab') {
    const [kop, ...rest] = b.rows;
    return `<table class="gtab"><thead><tr>${kop.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rest.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  return '';
}

function vraagHtml(q) {
  const k = gekozen[q.id];
  const opts = q.o.map((o, i) => {
    let cls = 'opt';
    if (k !== undefined) cls += i === q.j ? ' goed' : (i === k ? ' fout' : '');
    return `<li><button type="button" class="${cls}" data-q="${q.id}" data-i="${i}" ${k !== undefined ? 'aria-disabled="true"' : ''}><span class="let">${LET[i]}</span><span class="otxt">${esc(o)}</span></button></li>`;
  }).join('');
  let fb = '';
  if (k !== undefined) {
    fb = `<p class="fb ${k === q.j ? 'ok' : 'nok'}" role="status"><b>${k === q.j ? 'Goed.' : 'Niet goed.'}</b> Het juiste antwoord is ${LET[q.j]}. ${esc(q.u)}</p>`;
  }
  return `<li class="gv" id="v${q.id.replace('.', '-')}"><p class="gvq">${esc(q.v)}</p><ul class="opts">${opts}</ul>${fb}</li>`;
}

function score(kaart) {
  let n = 0, g = 0;
  kaart.vragen.forEach(q => { if (gekozen[q.id] !== undefined) { n++; if (gekozen[q.id] === q.j) g++; } });
  return { n, g };
}

function kaartHtml(k) {
  const s = score(k);
  const pill = s.n === 0 ? '' : `<span class="pill${s.n === k.vragen.length && s.g === s.n ? '' : ' neutraal'}">${s.g} van ${k.vragen.length} goed${s.n < k.vragen.length ? ' · ' + s.n + ' gemaakt' : ''}</span>`;
  return `<details class="rcard" id="kaart${k.nr}">
    <summary><span class="nr">${k.nr}</span><span class="tt">${esc(k.titel)}</span>${pill}</summary>
    <div class="rbody">
      ${k.blokken.map(blokHtml).join('')}
      <div class="vragen"><h4>Oefenvragen</h4>
        <ol>${k.vragen.map(vraagHtml).join('')}</ol>
        <p class="small-note nietprint"><button type="button" class="btn ghost small reset" data-kaart="${k.nr}">Maak deze vragen opnieuw</button></p>
      </div>
    </div>
  </details>`;
}

function intro() {
  const stukken = G.gebruik.map(([t, v]) => t === 'ul' ? `<ul>${v.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p>${esc(v)}</p>`).join('');
  return `<section class="intro">
    <h2>Zo gebruik je deze reader</h2>
    ${stukken}
    <p class="small-note">Je hoeft niet in te loggen. Wat je invult, onthoudt deze browser. Op een andere telefoon begin je opnieuw. Jij bent zelf verantwoordelijk voor je oefening.</p>
  </section>`;
}

function hoofdstukken() {
  return G.hoofdstukken.map(h => `
    <section class="chap">
      <h2><span class="cn">Hoofdstuk ${h.nr}</span>${esc(h.titel)}</h2>
      ${h.intro.map(p => `<p class="chap-intro">${p}</p>`).join('')}
      ${h.kaarten.map(kaartHtml).join('')}
    </section>`).join('');
}

function begrippen() {
  return `<section class="chap" id="begrippen">
    <h2><span class="cn">Hulp</span>Begrippen</h2>
    <table class="gtab begr"><thead><tr><th>Begrip</th><th>Betekenis</th></tr></thead><tbody>
      ${G.begrippen.map(([t, m]) => `<tr><td><b>${esc(t)}</b></td><td>${esc(m)}</td></tr>`).join('')}
    </tbody></table>
  </section>`;
}

function printAntwoorden() {
  const rows = [];
  G.hoofdstukken.forEach(h => h.kaarten.forEach(k => k.vragen.forEach(q => rows.push(`<tr><td>${q.id}</td><td>${LET[q.j]}</td><td>${esc(q.u)}</td></tr>`))));
  return `<section class="chap printonly"><h2><span class="cn">Achterin</span>Antwoorden en uitleg</h2>
    <table class="gtab"><thead><tr><th>Vraag</th><th>Juist</th><th>Uitleg</th></tr></thead><tbody>${rows.join('')}</tbody></table></section>`;
}

function view() {
  const open = new Set([...app.querySelectorAll('details.rcard[open]')].map(d => d.id));
  app.innerHTML = head() + `<main class="reader">
    <div class="tools top">
      <a class="btn ghost small terug-start" href="/?vak=politiek">← Naar Politiek van Oefenen en leren</a>
      <button class="btn ghost small" id="open" type="button">Alles openklappen</button>
      <button class="btn ghost small" id="dicht" type="button">Alles dichtklappen</button>
      <button class="btn small" id="print" type="button">Print de reader</button>
    </div>
    <div class="les-kop"><p class="datum">Politiek · MR25</p><h1>${esc(G.titel)}</h1></div>
    <section class="intro"><p>${G.intro.join(' ')}</p></section>
    ${intro()}
    ${hoofdstukken()}
    ${begrippen()}
    ${printAntwoorden()}
    <p class="small-note terug"><a href="/?vak=politiek">← Terug naar Politiek</a></p>
  </main>`;
  open.forEach(id => { const d = document.getElementById(id); if (d) d.open = true; });
  const all = () => app.querySelectorAll('details.rcard');
  document.getElementById('open').onclick = () => all().forEach(d => d.open = true);
  document.getElementById('dicht').onclick = () => all().forEach(d => d.open = false);
  document.getElementById('print').onclick = () => window.print();
  app.querySelectorAll('button.opt').forEach(b => b.onclick = () => {
    const id = b.dataset.q;
    if (gekozen[id] !== undefined) return;
    gekozen[id] = parseInt(b.dataset.i, 10);
    bewaar();
    const y = window.scrollY;
    view();
    window.scrollTo(0, y);
  });
  app.querySelectorAll('button.reset').forEach(b => b.onclick = () => {
    const nr = parseInt(b.dataset.kaart, 10);
    G.hoofdstukken.forEach(h => h.kaarten.forEach(k => { if (k.nr === nr) k.vragen.forEach(q => { delete gekozen[q.id]; }); }));
    bewaar();
    const y = window.scrollY;
    view();
    window.scrollTo(0, y);
  });
}

window.addEventListener('beforeprint', () => app.querySelectorAll('details.rcard').forEach(d => d.open = true));
view();
