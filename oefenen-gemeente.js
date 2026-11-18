/* Oefenvragen Gemeentepolitiek: open voor iedereen, zonder code. Voortgang staat alleen in deze browser. */
const app = document.getElementById('app');
const ALLE = window.OEFENVRAGEN;
const KEY = 'gemeente_oefenen_goed';
const RONDE = 10;
const LET = ['A', 'B', 'C', 'D'];
const HFD = { 1: 'Hoofdstuk 1: Wat doet een gemeente?', 2: 'Hoofdstuk 2: Wie bestuurt de gemeente?', 3: 'Hoofdstuk 3: Jij en je gemeente' };
let goed = {};
try { goed = JSON.parse(store.get(KEY) || '{}') || {}; } catch (e) { goed = {}; }
function bewaar() { store.set(KEY, JSON.stringify(goed)); }
function mix(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sleutel = q => q.h + '_' + ALLE.indexOf(q);
let ronde = null;

function head() {
  return '<header class="top"><div class="brand">Oefenvragen Gemeentepolitiek</div><div class="sub">Oefenen en leren · Mediacollege Amsterdam</div></header>';
}
function render(h) { app.innerHTML = head() + '<main class="card">' + h + '</main>'; window.scrollTo(0, 0); }
function telGoed(h) { return ALLE.filter(q => (!h || q.h === h) && goed[sleutel(q)]).length; }
function totaal(h) { return ALLE.filter(q => !h || q.h === h).length; }

function start() {
  const knop = (h, titel) => {
    const g = telGoed(h), t = totaal(h);
    return `<button class="og-keuze" data-h="${h}"><b>${esc(titel)}</b>${g} van ${t} goed beantwoord<div class="og-bar"><span style="width:${Math.round(100 * g / t)}%"></span></div></button>`;
  };
  render(`<p>Kies wat je wilt oefenen. Je krijgt steeds ${RONDE} vragen. Na elk antwoord zie je de uitleg. Je hoeft niet in te loggen. Je voortgang blijft in deze browser. Jij bent verantwoordelijk voor je eigen leren.</p>
  <p>Let op: de toetsvragen staan in andere woorden dan deze vragen. Leer dus de stof en niet de vragen.</p>
  <div class="og-keuzes">${knop(0, 'Alle hoofdstukken')}${knop(1, HFD[1])}${knop(2, HFD[2])}${knop(3, HFD[3])}</div>
  <p class="og-meta"><a href="/gemeente/reader">Naar de reader</a> · <a href="/?vak=politiek">Terug naar Politiek</a> · <button class="og-knop licht" id="reset">Voortgang wissen</button></p>`);
  app.querySelectorAll('.og-keuze').forEach(b => b.addEventListener('click', () => nieuweRonde(+b.dataset.h)));
  app.querySelector('#reset').addEventListener('click', () => { goed = {}; bewaar(); start(); });
}

function nieuweRonde(h) {
  const pool = ALLE.filter(q => !h || q.h === h);
  const nieuw = mix(pool.filter(q => !goed[sleutel(q)]));
  const oud = mix(pool.filter(q => goed[sleutel(q)]));
  const vragen = nieuw.concat(oud).slice(0, RONDE);
  ronde = { h, i: 0, score: 0, vragen: mix(vragen).map(q => {
    const opts = mix(q.o.map((t, n) => ({ t, juist: n === 0 })));
    return { q, opts, gekozen: null };
  }) };
  toon();
}

function toon() {
  const r = ronde, v = r.vragen[r.i], q = v.q;
  const klaar = v.gekozen !== null;
  const opts = v.opts.map((o, n) => {
    let cls = 'opt';
    if (klaar) cls += o.juist ? ' goed' : (n === v.gekozen ? ' fout' : '');
    return `<li><button type="button" class="${cls}" data-n="${n}" ${klaar ? 'aria-disabled="true"' : ''}><span class="let">${LET[n]}</span><span>${esc(o.t)}</span></button></li>`;
  }).join('');
  let fb = '';
  if (klaar) {
    const ok = v.opts[v.gekozen].juist;
    fb = `<p class="fb ${ok ? 'ok' : 'nok'}"><b>${ok ? 'Goed.' : 'Niet goed.'}</b> ${esc(q.u)}</p>`;
  }
  const laatste = r.i === r.vragen.length - 1;
  render(`<p class="og-meta">Vraag ${r.i + 1} van ${r.vragen.length} · Kaart ${q.k}</p>
  <div class="og-bar"><span style="width:${Math.round(100 * r.i / r.vragen.length)}%"></span></div>
  <p class="og-vraag">${esc(q.v)}</p><ul class="opts">${opts}</ul>${fb}
  <div class="og-acties">${klaar ? `<button class="og-knop" id="volgende">${laatste ? 'Bekijk je score' : 'Volgende vraag'}</button>` : ''}<button class="og-knop licht" id="stop">Stoppen</button></div>`);
  app.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
    if (v.gekozen !== null) return;
    v.gekozen = +b.dataset.n;
    if (v.opts[v.gekozen].juist) { r.score++; goed[sleutel(q)] = 1; bewaar(); }
    toon();
  }));
  const vb = app.querySelector('#volgende');
  if (vb) vb.addEventListener('click', () => { if (laatste) einde(); else { r.i++; toon(); } });
  app.querySelector('#stop').addEventListener('click', start);
}

function einde() {
  const r = ronde;
  const fout = r.vragen.filter(v => !v.opts[v.gekozen].juist);
  const lijst = fout.length ? '<h3>Dit ging nog niet goed</h3><ul>' + fout.map(v => `<li><b>${esc(v.q.v)}</b><br>${esc(v.opts.find(o => o.juist).t)}. ${esc(v.q.u)} <span class="og-meta">(kaart ${v.q.k})</span></li>`).join('') + '</ul><p>Lees deze kaarten nog eens in de reader.</p>' : '<p>Alles goed. Pak nog een ronde of kies een ander hoofdstuk.</p>';
  render(`<p class="og-meta">Klaar</p><p class="og-score">${r.score} van ${r.vragen.length} goed</p>${lijst}
  <div class="og-acties"><button class="og-knop" id="weer">Nog een ronde</button><button class="og-knop licht" id="menu">Terug naar het begin</button></div>`);
  app.querySelector('#weer').addEventListener('click', () => nieuweRonde(r.h));
  app.querySelector('#menu').addEventListener('click', start);
}
start();
