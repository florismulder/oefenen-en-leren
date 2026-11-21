/* Live quiz: scherm voor het digibord (host) */
const app = document.getElementById('app');
const $ = s => app.querySelector(s);
const LETTERS = ['A', 'B', 'C', 'D'];
const AVATARS = Object.values(ANIMALS);
const spelId = new URLSearchParams(location.search).get('spel');
let pw = null;
try { pw = sessionStorage.getItem('woii_docent'); } catch (e) {}

let st = null;
let rcvAt = 0;
let poll = null;
let tick = null;
let busy = false;
let lastKey = '';
let lastSpelers = '';
let bezig = false;
let revealGepland = false;
let timeOmGespeeld = false;
let gestart = false;

const KERR = {
  spel_niet_gevonden: 'Dit spel bestaat niet meer. Start een nieuw spel op de beheerpagina.',
  geen_spelers: 'Er doet nog niemand mee.',
  te_veel_pogingen: 'Te veel pogingen. Wacht even.',
  verkeerd_wachtwoord: 'Verkeerd wachtwoord.'
};
function kerr(c) { return KERR[c] || errText(c); }

function setThema(t) {
  document.body.dataset.kq = ['koude_oorlog', 'woii', 'politiek', 'neutraal'].indexOf(t) >= 0 ? t : 'neutraal';
}
function render(html) { app.innerHTML = html; window.scrollTo(0, 0); }
function pinMooi(p) { return String(p).replace(/(\d{3})(\d{3})/, '$1 $2'); }

/* ---------- Begin: inloggen en geluid ---------- */
function viewFout(tekst) {
  render(`<div class="kqh-start-overlay"><div class="card"><h1>Live quiz</h1><p>${esc(tekst)}</p><a class="btn" href="/quiz-docent">Naar de beheerpagina</a></div></div>`);
}
function viewLogin(msg) {
  render(`<div class="kqh-start-overlay"><form class="card" id="f"><h1>Inloggen</h1>
    <label for="pw">Wachtwoord docent</label><input id="pw" type="password" autocomplete="current-password">
    <button class="btn" type="submit">Inloggen</button><p class="msg" id="msg" role="alert">${esc(msg || '')}</p></form></div>`);
  $('#pw').focus();
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const p = $('#pw').value;
    const r = await rpc('kq_host_state', { p_password: p, p_game: spelId });
    if (r.error) { $('#msg').textContent = kerr(r.error); return; }
    pw = p;
    try { sessionStorage.setItem('woii_docent', pw); } catch (e2) {}
    viewStart();
  };
}
function viewStart() {
  render(`<div class="kqh-start-overlay"><div class="card"><h1>Klaar om te beginnen</h1>
    <p>Kies of het geluid aan staat. Zet de speakers van het scherm aan.</p>
    <button class="btn" id="mt" type="button">Start met geluid</button>
    <button class="btn ghost" id="zt" type="button">Start zonder geluid</button></div></div>`);
  $('#mt').onclick = () => begin(true);
  $('#zt').onclick = () => begin(false);
}
function begin(geluid) {
  KQAudio.zet(geluid);
  gestart = true;
  refresh(true);
  poll = setInterval(() => refresh(false), 1000);
  tick = setInterval(onTick, 100);
}

/* ---------- Ophalen en acties ---------- */
async function refresh(eerste) {
  if (busy || bezig) return;
  busy = true;
  const r = await rpc('kq_host_state', { p_password: pw, p_game: spelId });
  busy = false;
  if (r.error === 'netwerk' || r.error === 'serverfout') return;
  if (r.error) {
    if (r.error === 'verkeerd_wachtwoord') { try { sessionStorage.removeItem('woii_docent'); } catch (e) {} pw = null; stopLussen(); viewLogin(kerr(r.error)); return; }
    stopLussen(); viewFout(kerr(r.error)); return;
  }
  neem(r);
}
function stopLussen() {
  if (poll) { clearInterval(poll); poll = null; }
  if (tick) { clearInterval(tick); tick = null; }
  KQAudio.stopAlles();
}
async function actie(naam) {
  if (bezig) return;
  bezig = true;
  const r = await rpc('kq_host_action', { p_password: pw, p_game: spelId, p_actie: naam });
  bezig = false;
  if (r.error) {
    if (r.error === 'geen_spelers') { const m = $('#kmsg'); if (m) m.textContent = kerr(r.error); return; }
    if (r.error === 'netwerk' || r.error === 'serverfout') return;
    stopLussen(); viewFout(kerr(r.error)); return;
  }
  neem(r);
}
async function verwijder(id) {
  const r = await rpc('kq_host_kick', { p_password: pw, p_game: spelId, p_player: id });
  if (!r.error) neem(r);
}

function neem(r) {
  const vorigeStatus = st ? st.game.status : null;
  const vorigeIdx = st ? st.game.idx : null;
  st = r;
  rcvAt = performance.now();
  setThema(st.game.thema);
  const g = st.game;
  const key = g.status + '|' + g.idx;
  const spelersKey = st.spelers.map(s => s.id).join(',');
  const nieuweStap = key !== lastKey;
  if (nieuweStap) {
    lastKey = key;
    revealGepland = false;
    timeOmGespeeld = false;
    geluidBijOvergang(vorigeStatus, vorigeIdx);
    teken();
  } else if (g.status === 'lobby' && spelersKey !== lastSpelers) {
    teken();
  } else if (g.status === 'vraag') {
    updateVraag();
  }
  lastSpelers = spelersKey;
}

function geluidBijOvergang(vorige, vorigeIdx) {
  const g = st.game;
  if (g.status === 'lobby') {
    KQAudio.stopPings();
    KQAudio.speel('lobby');
  } else if (g.status === 'vraag') {
    KQAudio.stopMuziek('lobby');
    KQAudio.stopMuziek('winnaar', true);
    KQAudio.startPings(restNu, st.tijd_ms);
  } else if (g.status === 'uitslag') {
    KQAudio.stopPings();
  } else if (g.status === 'klaar') {
    KQAudio.stopPings();
    KQAudio.speel('winnaar');
  }
}

function restNu() {
  if (!st || st.game.status !== 'vraag') return 0;
  return st.resterend_ms - (performance.now() - rcvAt);
}

/* ---------- Klok: tijdbalk en automatisch tonen van het antwoord ---------- */
function onTick() {
  if (!st || st.game.status !== 'vraag') return;
  const r = restNu();
  const bar = document.getElementById('hbar');
  if (bar) {
    const p = Math.max(0, Math.min(100, (r / st.tijd_ms) * 100));
    bar.style.width = p + '%';
    bar.classList.toggle('laag', p < 25);
  }
  const sec = document.getElementById('hsec');
  if (sec) sec.textContent = Math.max(0, Math.ceil(r / 1000));
  if (r <= 0 && !timeOmGespeeld) { timeOmGespeeld = true; KQAudio.tijdOm(); }
  const allen = st.aantal_spelers > 0 && st.aantal_antwoorden >= st.aantal_spelers;
  if (!revealGepland && (r <= -800 || allen)) {
    revealGepland = true;
    setTimeout(async () => {
      if (st && st.game.status === 'vraag') await actie('toon');
      if (st && st.game.status === 'vraag') revealGepland = false;
    }, allen && r > 0 ? 700 : 0);
  }
}

/* ---------- Tekenen ---------- */
function kop() {
  const g = st.game;
  const nr = g.status === 'lobby' ? 'Wachtkamer' : g.status === 'klaar' ? 'Einduitslag' : 'Vraag ' + (g.idx + 1) + ' van ' + g.totaal;
  return `<div class="kqh-top"><span class="kqh-set">${esc(g.set_naam)}</span><span>${esc(nr)}</span><span class="kqh-pin" title="Pincode">${esc(pinMooi(g.pin))}</span><button class="btn ghost small" id="snd" type="button" aria-pressed="${KQAudio.isAan()}">${KQAudio.isAan() ? 'Geluid aan' : 'Geluid uit'}</button></div>`;
}
function koppel() {
  const s = document.getElementById('snd');
  if (s) s.onclick = () => {
    KQAudio.zet(!KQAudio.isAan());
    if (KQAudio.isAan() && st) { if (st.game.status === 'lobby') KQAudio.speel('lobby'); if (st.game.status === 'klaar') KQAudio.speel('winnaar'); if (st.game.status === 'vraag') KQAudio.startPings(restNu, st.tijd_ms); }
    s.textContent = KQAudio.isAan() ? 'Geluid aan' : 'Geluid uit';
    s.setAttribute('aria-pressed', KQAudio.isAan());
  };
  app.querySelectorAll('[data-kick]').forEach(b => b.onclick = () => verwijder(b.dataset.kick));
  const gb = document.getElementById('go');
  if (gb) gb.onclick = () => actie(gb.dataset.a);
  const tb = document.getElementById('toon');
  if (tb) tb.onclick = () => actie('toon');
  const eb = document.getElementById('einde');
  if (eb) eb.onclick = () => { if (confirm('Het spel nu stoppen en de einduitslag tonen?')) actie('einde'); };
}
function teken() {
  const g = st.game;
  if (g.status === 'lobby') return tekenLobby();
  if (g.status === 'vraag') return tekenVraag();
  if (g.status === 'uitslag') return tekenUitslag();
  tekenKlaar();
}

function tekenLobby() {
  const g = st.game;
  const n = st.spelers.length;
  const url = location.host + '/quiz';
  render(`<div class="kqh">${kop()}<div class="kqh-main"><div class="kqh-lobby">
    <div class="kqh-join"><h1>Doe mee met de quiz</h1><div>Ga op je telefoon naar</div><div class="kqh-url">${esc(url)}</div><div>en vul deze pincode in</div><div class="kqh-bigpin" aria-label="Pincode ${esc(g.pin.split('').join(' '))}">${esc(pinMooi(g.pin))}</div></div>
    <div class="kqh-wie"><h2>${n ? n + (n === 1 ? ' speler doet mee' : ' spelers doen mee') : 'Wachten op spelers'}</h2>
      <div class="kqh-chips">${n ? st.spelers.map(s => `<span class="kqh-chip"><span aria-hidden="true">${AVATARS[s.avatar] || '🐾'}</span>${esc(s.bijnaam)}<button type="button" data-kick="${esc(s.id)}" aria-label="Verwijder ${esc(s.bijnaam)}" title="Verwijder">✕</button></span>`).join('') : '<span class="kqh-leeg">Zodra iemand meedoet, verschijnt de bijnaam hier.</span>'}</div>
      <div class="kqh-acties"><button class="btn kqh-start" id="go" data-a="start" type="button" ${n ? '' : 'disabled'}>Start de quiz</button><span class="msg" id="kmsg" role="alert"></span></div></div>
    </div></div></div>`);
  koppel();
}

function optiesHtml(opts, mode) {
  const v = st.verdeling || [];
  const max = Math.max(1, ...v);
  const juist = st.vraag.juist;
  return `<div class="kqh-opts ${opts.length === 2 ? 'two' : ''}">${opts.map((o, i) => {
    const cls = mode === 'uitslag' ? (i === juist ? ' juist' : ' dim') : '';
    return `<div class="kqh-opt${cls}" style="--c:var(--a${i})"><span class="kq-l">${LETTERS[i]}</span><span class="kq-t">${esc(o)}</span>${mode === 'uitslag' ? `<span class="kqh-n">${i === juist ? '✓ ' : ''}${v[i] || 0}</span><span class="kqh-tel" style="width:${Math.round(((v[i] || 0) / max) * 100)}%"></span>` : ''}</div>`;
  }).join('')}</div>`;
}

function tekenVraag() {
  const q = st.vraag;
  render(`<div class="kqh">${kop()}<div class="kqh-main">
    ${q.dubbel ? '<div><span class="kq-badge" style="font-size:clamp(14px,1.6vw,24px)">Dubbele punten</span></div>' : ''}
    <div class="kqh-vraag">${esc(q.tekst)}</div>
    <div class="kqh-tijdrij"><div class="kq-bar" aria-hidden="true"><i id="hbar"></i></div><div class="kqh-sec" id="hsec">${Math.max(0, Math.ceil(restNu() / 1000))}</div><div class="kqh-teller" id="hteller"></div></div>
    ${optiesHtml(q.opties, 'vraag')}
    <div class="kqh-acties"><button class="btn ghost" id="toon" type="button">Toon het antwoord</button></div>
  </div></div>`);
  koppel();
  updateVraag();
  onTick();
}
function updateVraag() {
  const t = document.getElementById('hteller');
  if (t) t.innerHTML = `<b>${st.aantal_antwoorden}</b> van ${st.aantal_spelers} hebben geantwoord`;
}

function tekenUitslag() {
  const g = st.game, q = st.vraag;
  const goed = st.spelers.filter(s => s.juist).length;
  const laatste = g.idx + 1 >= g.totaal;
  const top = st.spelers.slice(0, 5);
  render(`<div class="kqh">${kop()}<div class="kqh-main">
    <div class="kqh-vraag" style="font-size:clamp(22px,3vw,48px)">${esc(q.tekst)}</div>
    <div class="kqh-uitslag"><div>${optiesHtml(q.opties, 'uitslag')}<p class="kqh-teller" style="margin-top:12px"><b>${goed}</b> van ${st.spelers.length} hadden het goed${q.dubbel ? ' (dubbele punten)' : ''}</p></div>
    <div class="kqh-top5"><h2>Tussenstand</h2>${top.map(s => `<div class="kqh-rij"><span>${s.plek}</span><span><span aria-hidden="true">${AVATARS[s.avatar] || '🐾'}</span> ${esc(s.bijnaam)}${s.juist ? `<span class="plus">+${s.punten}</span>` : ''}</span><span class="sc">${s.score}</span></div>`).join('')}</div></div>
    <div class="kqh-acties"><button class="btn" id="go" data-a="volgende" type="button">${laatste ? 'Toon de einduitslag' : 'Volgende vraag'}</button></div>
  </div></div>`);
  koppel();
}

function tekenKlaar() {
  const s = st.spelers;
  const pod = [1, 2, 3].map(p => s[p - 1] ? `<div class="kqh-pod p${p}" id="pod${p}"><div class="av" aria-hidden="true">${AVATARS[s[p - 1].avatar] || '🐾'}</div><div class="nm">${esc(s[p - 1].bijnaam)}</div><div class="pt">${s[p - 1].score} punten</div><div class="blok">${p}</div></div>` : `<div class="kqh-pod p${p}"></div>`);
  const rest = s.slice(3, 10);
  render(`<div class="kqh">${kop()}<div class="kqh-main">
    <h1 style="text-align:center;font-size:clamp(28px,4vw,64px);margin:0">${s.length ? 'De winnaar is...' : 'Het spel is afgelopen'}</h1>
    <div class="kqh-podium">${pod[1]}${pod[0]}${pod[2]}</div>
    ${rest.length ? `<div class="kqh-rest" id="rest">${rest.map(x => `<div class="kqh-rij"><span>${x.plek}</span><span><span aria-hidden="true">${AVATARS[x.avatar] || '🐾'}</span> ${esc(x.bijnaam)}</span><span class="sc">${x.score}</span></div>`).join('')}</div>` : ''}
    <div class="kqh-acties" style="justify-content:center"><a class="btn ghost" href="/quiz-docent">Naar de beheerpagina</a></div>
  </div></div>`);
  koppel();
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toon = (id, ms) => setTimeout(() => { const e = document.getElementById(id); if (e) e.classList.add('zicht'); }, reduce ? 0 : ms);
  toon('pod3', 1200); toon('pod2', 3200); toon('pod1', 5600); toon('rest', 7000);
  setTimeout(() => { const h = app.querySelector('h1'); if (h && s[0]) h.textContent = 'De winnaar is ' + s[0].bijnaam + '!'; }, reduce ? 0 : 5600);
}

/* ---------- Toetsen ---------- */
document.addEventListener('keydown', e => {
  if (!gestart || !st) return;
  if (e.key === 'm' || e.key === 'M') { const s = document.getElementById('snd'); if (s) s.click(); return; }
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
    const g = document.getElementById('go');
    if (g && !g.disabled && document.activeElement && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); g.click(); }
  }
});

/* ---------- Start ---------- */
if (!spelId) {
  viewFout('Er is geen spel gekozen. Start een spel op de beheerpagina.');
} else if (!pw) {
  viewLogin();
} else {
  rpc('kq_host_state', { p_password: pw, p_game: spelId }).then(r => {
    if (r.error === 'verkeerd_wachtwoord') { try { sessionStorage.removeItem('woii_docent'); } catch (e) {} pw = null; viewLogin(); return; }
    if (r.error === 'netwerk' || r.error === 'serverfout') { viewFout(errText(r.error)); return; }
    if (r.error) { viewFout(kerr(r.error)); return; }
    viewStart();
  });
}
