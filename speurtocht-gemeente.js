/* Speurtocht Gemeente: open voor iedereen, zonder code. Voortgang en notities staan in deze browser. De voortgang gaat anoniem, zonder naam, ook naar de docent. */
const app = document.getElementById('app');
const G = window.GEMEENTE;
const KEY = 'gemeente_speurtocht';
const LET = ['A', 'B', 'C', 'D'];
const CODE = ['L', 'O', 'K', 'E', 'T'];
let S = { klaar: {}, fout: {}, notes: {}, tijd: {}, btijd: {}, start: 0 };
try { S = Object.assign(S, JSON.parse(store.get(KEY) || '{}') || {}); } catch (e) { /* leeg beginnen */ }
if (!S.tijd) S.tijd = {};
if (!S.btijd) S.btijd = {};
if (!S.start) S.start = Date.now();
const RUNKEY = 'gemeente_speurtocht_run';
function nieuwId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const h = n => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${h(8)}-${h(4)}-4${h(3)}-a${h(3)}-${h(12)}`;
}
let RUN = store.get(RUNKEY);
if (!RUN) { RUN = nieuwId(); store.set(RUNKEY, RUN); }
const sec = () => Math.max(0, Math.round((Date.now() - S.start) / 1000));
let stuurTimer = null;
function stateVoorServer() {
  const notes = {};
  Object.keys(S.notes || {}).forEach(k => { const v = String(S.notes[k] || '').trim(); if (v) notes[k] = v.slice(0, 600); });
  const fout = {};
  Object.keys(S.fout || {}).forEach(k => { fout[k] = (S.fout[k] || []).length; });
  return { v: 1, start: S.start, klaar: S.klaar, fout, tijd: S.tijd, btijd: S.btijd, notes };
}
function stuur() {
  clearTimeout(stuurTimer);
  stuurTimer = setTimeout(() => { rpc('speurtocht_save', { p_run: RUN, p_state: stateVoorServer() }); }, 1500);
}
function bewaar() { store.set(KEY, JSON.stringify(S)); stuur(); }

const STATIONS = [
  {
    nr: 1, kaart: 1, titel: 'Wie beslist waarover?',
    missie: 'Nederland heeft vijf overheden. Zoek uit welke overheid waar over gaat.',
    vraag: 'Welke overheid let op water en dijken?',
    opties: ['De provincie', 'Het waterschap', 'Het Rijk', 'De gemeente'], juist: 1,
    hint: 'Zoek in de kaart naar het woord dijken.',
    uitleg: 'Er zijn 21 waterschappen. Zij letten op water en dijken.',
    onderzoek: 'Zoek op het internet hoe jouw gemeente heet en hoeveel inwoners ze heeft. Noteer ook de bron en de datum.',
    veld: 'Mijn gemeente en het aantal inwoners (met bron en datum)'
  },
  {
    nr: 2, kaart: 2, titel: 'Waarom worden gemeenten groter?',
    missie: 'Er waren vroeger veel meer gemeenten. Zoek uit waarom ze samengaan.',
    vraag: 'Waarom gaan gemeenten soms samen verder?',
    opties: ['Er komen dan meer provincies.', 'Het Rijk betaalt dan alle kosten.', 'Een grotere gemeente heeft meer mensen en meer geld voor alle taken.', 'Inwoners hoeven dan niet meer te stemmen.'], juist: 2,
    hint: 'Zoek in de kaart naar het stukje bij Waarom.',
    uitleg: 'Een grotere gemeente heeft meer mensen en meer geld. Dan lukt het beter om alle taken goed te doen.',
    onderzoek: 'Zoek op: is jouw gemeente ooit samengegaan met een andere gemeente? Typ herindeling en de naam van je gemeente. Schrijf op wat je vindt.',
    veld: 'Wat ik vond over herindeling in mijn gemeente'
  },
  {
    nr: 3, kaart: 3, titel: 'Wat regelt de gemeente?',
    missie: 'De gemeente regelt veel dingen dicht bij jou. Zoek uit welke.',
    vraag: 'Je wilt in een gebouw een café beginnen. Waar staat of dat mag?',
    opties: ['In het omgevingsplan', 'In de afvalstoffenheffing', 'In de Basisregistratie Personen', 'In het gemeentefonds'], juist: 0,
    hint: 'Zoek in de kaart naar het woord café.',
    uitleg: 'Het omgevingsplan zegt wat je waar mag bouwen en doen. Dus ook waar je een café mag beginnen.',
    onderzoek: 'Zoek op de website van jouw gemeente drie taken van de gemeente. Maak van elke taak een screenshot. Die gebruik je straks in je opdracht.',
    veld: 'Mijn drie taken van de gemeente'
  },
  {
    nr: 4, kaart: 4, titel: 'Waar komt het geld vandaan?',
    missie: 'Een gemeente heeft veel geld nodig. Zoek uit waar dat vandaan komt.',
    vraag: 'Wie betaalt OZB aan de gemeente?',
    opties: ['Iedereen die in de gemeente woont', 'Alleen bedrijven', 'Iedereen die een auto heeft', 'Wie een huis of gebouw bezit'], juist: 3,
    hint: 'Zoek in de kaart naar het woord OZB.',
    uitleg: 'De OZB is een belasting voor wie een huis of gebouw bezit.',
    onderzoek: 'Zoek op de website van jouw gemeente het woord begroting. Schrijf één ding op waar jouw gemeente geld aan uitgeeft. Lukt dat niet? Schrijf op wat je zocht.',
    veld: 'Waar mijn gemeente geld aan uitgeeft'
  },
  {
    nr: 5, kaart: 5, titel: 'Wie bestuurt de gemeente?',
    missie: 'Drie groepen besturen de gemeente. Zoek uit wie wie is.',
    vraag: 'Wie van deze mensen kiezen inwoners niet?',
    opties: ['Een raadslid', 'De burgemeester', 'Een kandidaat van een partij', 'De gemeenteraad'], juist: 1,
    hint: 'Zoek in de kaart naar het stukje over de burgemeester.',
    uitleg: 'De raad is gekozen. De burgemeester is benoemd.',
    onderzoek: 'Zoek op hoe de burgemeester van jouw gemeente heet. Zoek ook één verrassend feit over jouw gemeente. Schrijf beide op, met bron en datum.',
    veld: 'Mijn burgemeester en mijn verrassende feit (met bron en datum)'
  }
];

const BONUS = [
  { id: 'b1', titel: 'Vergelijk met een buurgemeente', tekst: 'Kies een gemeente naast de jouwe. Zoek haar burgemeester en haar aantal inwoners. Schrijf één zin: wat valt je op als je ze vergelijkt?', veld: 'Mijn vergelijking met een buurgemeente (met bron en datum)' },
  { id: 'b2', titel: 'Kijk in de gemeenteraad', tekst: 'Zoek op de site van jouw gemeente hoeveel zetels de gemeenteraad heeft. Welke partij heeft de meeste zetels? Zet de bron en de datum erbij.', veld: 'Mijn gemeenteraad: aantal zetels en grootste partij (met bron en datum)' },
  { id: 'b3', titel: 'Schrijf het nieuws', tekst: 'Zoek een nieuw plan of besluit van jouw gemeente. Schrijf een kop van hooguit 8 woorden en twee zinnen: wat gebeurt er en wat betekent het voor jongeren?', veld: 'Mijn nieuwsbericht: kop en twee zinnen (met bron en datum)' }
];
const bonusKlaar = () => BONUS.filter(b => (S.notes[b.id] || '').trim().length >= 15).length;

const kaartVan = nr => G.hoofdstukken[0].kaarten.find(k => k.nr === nr);

function head() {
  return '<header class="top"><div class="brand">Speurtocht Gemeente</div><div class="sub">Oefenen en leren · Mediacollege Amsterdam</div></header>';
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
const aantalKlaar = () => STATIONS.filter(s => S.klaar[s.nr]).length;

function slots() {
  return `<div class="st-slots">${STATIONS.map(s => `<div class="st-slot${S.klaar[s.nr] ? ' vol' : ''}">${S.klaar[s.nr] ? CODE[s.nr - 1] : '?'}</div>`).join('')}</div>`;
}

function stationHtml(s) {
  const k = kaartVan(s.kaart);
  const klaar = !!S.klaar[s.nr];
  const fout = S.fout[s.nr];
  const opts = s.opties.map((o, i) => {
    let cls = 'st-opt';
    if (klaar && i === s.juist) cls += ' goed';
    if (!klaar && fout && fout.includes(i)) cls += ' fout';
    return `<button type="button" class="${cls}" data-s="${s.nr}" data-i="${i}" ${klaar ? 'disabled' : ''}><span class="let">${LET[i]}</span><span>${esc(o)}</span></button>`;
  }).join('');
  let fb = '';
  if (klaar) fb = `<p class="st-fb ok"><b>Goed!</b> ${esc(s.uitleg)} Je vindt de letter <b>${CODE[s.nr - 1]}</b>.</p>`;
  else if (fout && fout.length) fb = `<p class="st-fb nok"><b>Nog niet.</b> ${esc(s.hint)}</p>`;
  return `<section class="card st-card${klaar ? ' klaar' : ''}" id="station${s.nr}">
    <div class="st-kop"><span class="st-nr">${s.nr}</span><h2>${esc(s.titel)}</h2>${klaar ? `<span class="st-letter">${CODE[s.nr - 1]}</span>` : ''}</div>
    <p>${esc(s.missie)}</p>
    <p class="st-stap">Stap 1: Lees de kaart</p>
    <details class="st-kaart"><summary>Kaart ${k.nr}: ${esc(k.titel)}</summary>${k.blokken.map(blokHtml).join('')}</details>
    <p class="st-stap">Stap 2: Beantwoord de vraag</p>
    <p class="st-vraag">${esc(s.vraag)}</p>
    <div class="st-opts">${opts}</div>
    ${fb}
    <p class="st-stap">Stap 3: Zoek zelf verder</p>
    <div class="st-onderzoek"><p>${esc(s.onderzoek)}</p>
      <textarea data-n="${s.nr}" aria-label="${esc(s.veld)}" placeholder="${esc(s.veld)}">${esc(S.notes[s.nr] || '')}</textarea></div>
  </section>`;
}

function dossier() {
  const basis = STATIONS.map(s => `${s.veld}:\n${(S.notes[s.nr] || '').trim() || '(nog niets ingevuld)'}`);
  const bonus = BONUS.filter(b => (S.notes[b.id] || '').trim()).map(b => `Bonus, ${b.veld}:\n${S.notes[b.id].trim()}`);
  return basis.concat(bonus).join('\n\n');
}

function bonusHtml() {
  const n = bonusKlaar();
  return `<section class="card st-bonus">
    <h2>Bonusronde: de geheime kluis</h2>
    <p>Klaar met je dia? Dan is er nog een kluis. Er zijn drie missies. Kies er zoveel als je wilt. Je mag in elke volgorde.</p>
    ${BONUS.map((b, i) => `<div class="st-onderzoek st-bmissie${(S.notes[b.id] || '').trim().length >= 15 ? ' klaar' : ''}">
      <p class="st-stap">Missie ${i + 1}: ${esc(b.titel)}</p>
      <p>${esc(b.tekst)}</p>
      <textarea data-n="${b.id}" aria-label="${esc(b.veld)}" placeholder="${esc(b.veld)}">${esc(S.notes[b.id] || '')}</textarea></div>`).join('')}
    <p class="st-bteller" id="bteller" aria-live="polite">${bonusTekst(n)}</p>
  </section>`;
}
function bonusTekst(n) {
  if (n >= 3) return 'Alle drie de missies klaar. Je bent een topspeurder! Laat het aan je docent zien.';
  return `${n} van 3 missies klaar.`;
}

function eindHtml() {
  return `<section class="card st-eind">
    <h2>Het slot is open!</h2>
    <div class="st-code">${CODE.join('')}</div>
    <p>Je hebt alle vijf de sleutels gevonden. Je weet nu wat een gemeente doet. Nu bouw je zelf iets.</p>
    <h2>Opdracht: jouw gemeente in één dia</h2>
    <ul class="st-lijst">
      <li><b>Tijd:</b> 15 minuten.</li>
      <li><b>Je werkt alleen.</b> Gebruik de website van jouw gemeente.</li>
      <li><b>Maak er een PowerPoint van.</b> Eén dia.</li>
    </ul>
    <p class="st-stap">Dit moet op je dia staan</p>
    <ol class="st-lijst">
      <li>De naam van je gemeente en je burgemeester</li>
      <li>Het aantal inwoners</li>
      <li>Drie taken van je gemeente, elk met een screenshot van de site</li>
      <li>Eén verrassend feit over je gemeente</li>
      <li>Bron en datum onderaan</li>
    </ol>
    <p class="st-stap">Inleveren</p>
    <ul class="st-lijst">
      <li>Lever je PowerPoint in via Teams, kanaal Algemeen, map Gemeenten in beeld.</li>
      <li>Zet je naam, klas en gemeente in de bestandsnaam.</li>
      <li>Dit telt niet voor je cijfer. Het is oefening.</li>
    </ul>
    <p class="st-stap">Jouw dossier</p>
    <p>Dit heb je onderweg opgeschreven. Kopieer het naar je dia.</p>
    <div class="st-dossier">${esc(dossier())}</div>
    <div class="st-acties"><button type="button" class="btn small" id="kopieer">Kopieer mijn dossier</button>
      <a class="btn ghost small" href="/gemeente/oefenen">Oefen met vragen</a></div>
    <p class="small-note" id="kopieerfb" aria-live="polite"></p>
  </section>` + bonusHtml();
}

function view() {
  const n = aantalKlaar();
  app.innerHTML = head() + `<main>
    <section class="card">
      <h1>Het gemeentehuis zit op slot</h1>
      <p>Het loket gaat niet open. De sleutel is in vijf stukken gebroken. Elk stuk is een letter. Vind alle vijf en lees het woord.</p>
      <p>Jij bent speurder en redacteur. Wat je onderweg vindt, gebruik je straks voor je opdracht.</p>
      <ul class="st-lijst">
        <li>Werk alleen en in je eigen tempo. Je hebt ongeveer 30 minuten.</li>
        <li>Elk station heeft drie stappen: lees, beantwoord, zoek zelf verder.</li>
        <li>Een goed antwoord geeft een letter. Een fout antwoord? Lees de kaart nog eens en probeer opnieuw.</li>
      </ul>
      <p class="small-note">Je docent ziet hoe ver je bent en wat je invult. Er staat geen naam bij. Schrijf dus je naam niet in je notities.</p>
      ${slots()}
      <p class="small-note">${n} van 5 sleutels gevonden</p>
    </section>
    ${STATIONS.map(stationHtml).join('')}
    ${n === 5 ? eindHtml() : '<section class="card"><p>Vind alle vijf de sleutels. Dan zie je hier de opdracht.</p></section>'}
    <p class="small-note"><a href="/?vak=politiek">← Terug naar Politiek</a> · <button type="button" class="btn ghost small" id="opnieuw">Begin opnieuw</button></p>
  </main>`;
  app.querySelectorAll('.st-opt').forEach(b => b.onclick = () => {
    const nr = parseInt(b.dataset.s, 10), i = parseInt(b.dataset.i, 10);
    const s = STATIONS[nr - 1];
    if (S.klaar[nr]) return;
    if (i === s.juist) { S.klaar[nr] = true; S.tijd[nr] = sec(); } else { S.fout[nr] = (S.fout[nr] || []).concat(i); }
    bewaar();
    const y = window.scrollY;
    view();
    window.scrollTo(0, y);
  });
  app.querySelectorAll('textarea').forEach(t => t.oninput = () => { S.notes[t.dataset.n] = t.value; if (/^b\d$/.test(t.dataset.n) && t.value.trim().length >= 15 && !S.btijd[t.dataset.n]) S.btijd[t.dataset.n] = sec(); bewaar(); const d = app.querySelector('.st-dossier'); if (d) d.textContent = dossier(); const bt = document.getElementById('bteller'); if (bt) bt.textContent = bonusTekst(bonusKlaar()); });
  const kop = document.getElementById('kopieer');
  if (kop) kop.onclick = () => {
    const fb = document.getElementById('kopieerfb');
    const klaar = () => { fb.textContent = 'Gekopieerd.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(dossier()).then(klaar, () => { fb.textContent = 'Kopiëren lukt niet. Selecteer de tekst zelf.'; });
    else fb.textContent = 'Kopiëren lukt niet. Selecteer de tekst zelf.';
  };
  document.getElementById('opnieuw').onclick = () => {
    if (!confirm('Alles wissen en opnieuw beginnen? Je notities gaan ook weg.')) return;
    S = { klaar: {}, fout: {}, notes: {}, tijd: {}, btijd: {}, start: Date.now() };
    bewaar();
    view();
    window.scrollTo(0, 0);
  };
}
view();
