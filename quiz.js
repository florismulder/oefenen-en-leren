/* Live quiz: spelerscherm voor op de telefoon */
const app = document.getElementById('app');
const $ = s => app.querySelector(s);
const AVATARS = Object.values(ANIMALS);
const LETTERS = ['A', 'B', 'C', 'D'];
const KERR = {
  onbekende_pin: 'Deze pincode bestaat niet of het spel is al afgelopen. Controleer de pincode op het scherm.',
  spel_vol: 'Dit spel zit vol.',
  naam_bezet: 'Deze bijnaam is al in gebruik. Kies een andere.',
  naam_ongeldig: 'Kies een bijnaam van 1 tot 16 tekens.',
  avatar_ongeldig: 'Kies een plaatje.',
  verwijderd: 'Je doet niet meer mee. Je bent verwijderd of het spel is afgelopen.',
  te_laat: 'Te laat. De tijd is om.',
  geen_vraag: 'Er is nu geen vraag.',
  optie_ongeldig: 'Dit antwoord bestaat niet.'
};
function kerr(code) { return KERR[code] || errText(code); }

let token = store.get('kq_tok');
let st = null;
let rcvAt = 0;
let poll = null;
let tick = null;
let busy = false;
let lastKey = '';
let gekozenAvatar = null;
let eigenKeuze = null;
let offline = false;

function setThema(t) {
  document.body.dataset.kq = ['koude_oorlog', 'woii', 'politiek', 'neutraal'].indexOf(t) >= 0 ? t : 'neutraal';
}
function render(html) {
  app.innerHTML = html;
  window.scrollTo(0, 0);
}
function stopLussen() {
  if (poll) { clearInterval(poll); poll = null; }
  if (tick) { clearInterval(tick); tick = null; }
}
function header() {
  return '<header class="top"><div class="brand">Live quiz</div><div class="sub">Doe mee met je klas</div></header>';
}

/* ---------- Meedoen ---------- */
function viewJoin(msg) {
  stopLussen();
  lastKey = '';
  st = null;
  setThema('neutraal');
  const pin0 = (new URLSearchParams(location.search).get('pin') || '').replace(/\D/g, '').slice(0, 6);
  render(header() + `<main class="card">
    <h1>Meedoen</h1>
    <p>Vul de pincode in die op het scherm staat. Kies een bijnaam en een plaatje.</p>
    <form id="f" autocomplete="off">
      <label for="pin">Pincode</label>
      <input id="pin" class="kq-pin" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="000000" value="${esc(pin0)}">
      <label for="nm">Je bijnaam</label>
      <input id="nm" maxlength="16" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Maximaal 16 tekens">
      <label>Kies een plaatje</label>
      <div class="kq-avatars" id="av">${AVATARS.map((a, i) => `<button type="button" data-i="${i}" aria-pressed="${gekozenAvatar === i}" aria-label="Plaatje ${i + 1}">${a}</button>`).join('')}</div>
      <button class="btn block" type="submit">Meedoen</button>
    </form>
    <p class="msg" id="msg" role="alert">${esc(msg || '')}</p>
    <p class="small-note"><a href="/">Terug naar start</a></p>
  </main>`);
  app.querySelectorAll('#av button').forEach(b => b.onclick = () => {
    gekozenAvatar = parseInt(b.dataset.i, 10);
    app.querySelectorAll('#av button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  });
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const pin = $('#pin').value.replace(/\D/g, '');
    const nm = $('#nm').value.trim();
    if (pin.length !== 6) { $('#msg').textContent = 'Een pincode bestaat uit 6 cijfers.'; return; }
    if (!nm) { $('#msg').textContent = 'Kies een bijnaam.'; return; }
    if (gekozenAvatar === null) { $('#msg').textContent = 'Kies een plaatje.'; return; }
    const b = $('#f .btn'); b.disabled = true;
    const r = await rpc('kq_join', { p_pin: pin, p_bijnaam: nm, p_avatar: gekozenAvatar });
    b.disabled = false;
    if (r.error) { $('#msg').textContent = kerr(r.error); return; }
    token = r.token;
    store.set('kq_tok', token);
    setThema(r.thema);
    start();
  };
}

/* ---------- Spelverloop ---------- */
function start() {
  stopLussen();
  lastKey = '';
  refresh();
  poll = setInterval(refresh, 1000);
  tick = setInterval(update, 100);
}
async function refresh() {
  if (busy || !token) return;
  busy = true;
  const r = await rpc('kq_player_state', { p_token: token });
  busy = false;
  if (r.error === 'netwerk' || r.error === 'serverfout') { setOffline(true); return; }
  setOffline(false);
  if (r.error) {
    token = null; store.del('kq_tok');
    viewJoin(kerr(r.error));
    return;
  }
  st = r;
  rcvAt = performance.now();
  setThema(st.thema);
  const key = [st.status, st.nr, st.beantwoord, st.mijn_optie].join('|');
  if (key !== lastKey) { lastKey = key; eigenKeuze = st.beantwoord ? st.mijn_optie : null; viewState(); }
  update();
}
function setOffline(v) {
  if (v === offline) return;
  offline = v;
  const old = document.getElementById('kqnet');
  if (old) old.remove();
  if (v) {
    const d = document.createElement('div');
    d.id = 'kqnet'; d.className = 'kq-net'; d.setAttribute('role', 'alert');
    d.textContent = 'Geen verbinding. We proberen het opnieuw.';
    document.body.appendChild(d);
  }
}
function restNu() {
  if (!st || st.status !== 'vraag') return 0;
  return Math.max(0, st.resterend_ms - (performance.now() - rcvAt));
}
function update() {
  const bar = document.getElementById('kqbar');
  if (!bar || !st) return;
  const r = restNu();
  const p = Math.max(0, Math.min(100, (r / st.tijd_ms) * 100));
  bar.style.width = p + '%';
  bar.classList.toggle('laag', p < 25);
  const sec = document.getElementById('kqsec');
  if (sec) sec.textContent = Math.ceil(r / 1000);
}
function topbalk() {
  return `<div class="kq-top"><div class="kq-who"><span aria-hidden="true">${AVATARS[st.avatar] || '🐾'}</span><span>${esc(st.bijnaam)}</span></div><div>${st.uitslag ? st.uitslag.score + ' punten' : ''}</div></div>`;
}
function timerBlok() {
  return `<div class="kq-top" style="padding-bottom:6px"><div>Vraag ${st.nr} van ${st.totaal}${st.vraag && st.vraag.dubbel ? ' <span class="kq-badge">Dubbele punten</span>' : ''}</div><div id="kqsec" aria-live="off">${Math.ceil(restNu() / 1000)}</div></div><div class="kq-bar" aria-hidden="true"><i id="kqbar"></i></div>`;
}

function viewState() {
  if (!st) return;
  if (st.status === 'lobby') {
    render(header() + `<main class="kq-mid">
      <div class="kq-big" aria-hidden="true">${AVATARS[st.avatar] || '🐾'}</div>
      <h1>Je doet mee, ${esc(st.bijnaam)}!</h1>
      <p>Kijk naar het scherm. De docent start het spel zo.</p></main>`);
    return;
  }
  if (st.status === 'vraag') {
    const opts = st.vraag.opties;
    if (st.beantwoord || eigenKeuze !== null) {
      render(`<main>${timerBlok()}
        <div class="kq-vraagtekst">${esc(st.vraag.tekst)}</div>
        <div class="kq-res ok" style="background:var(--card);border-color:var(--line);color:var(--ink)"><b>Antwoord verstuurd</b><span>Je koos ${LETTERS[eigenKeuze !== null ? eigenKeuze : st.mijn_optie]}. Wacht tot de tijd om is.</span></div></main>`);
    } else {
      render(`<main>${timerBlok()}
        <div class="kq-vraagtekst">${esc(st.vraag.tekst)}</div>
        <div class="kq-opts ${opts.length === 2 ? 'two' : ''}">${opts.map((o, i) => `<button class="kq-opt" type="button" data-i="${i}" aria-label="Antwoord ${LETTERS[i]}" style="--c:var(--a${i})"><span class="kq-l">${LETTERS[i]}</span></button>`).join('')}</div>
        <p class="msg" id="msg" role="alert"></p></main>`);
      app.querySelectorAll('.kq-opt').forEach(b => b.onclick = () => kies(parseInt(b.dataset.i, 10)));
    }
    update();
    return;
  }
  if (st.status === 'uitslag') {
    const u = st.uitslag, opts = st.vraag.opties;
    const ok = u.juist;
    const gegeven = st.beantwoord;
    render(`<main>${topbalk()}
      <div class="kq-res ${ok ? 'ok' : 'fout'}"><b>${ok ? 'Goed!' : (gegeven ? 'Helaas, fout' : 'Geen antwoord')}</b><span>${ok ? '+' + u.punten + ' punten' : '0 punten'}</span></div>
      <div class="kq-juistant"><small>Het goede antwoord was</small><br><b>${LETTERS[u.juiste_optie]}: ${esc(opts[u.juiste_optie])}</b></div>
      <div class="kq-stat"><div><b>${u.plek}</b><small>je plek van ${u.aantal}</small></div><div><b>${u.score}</b><small>punten</small></div></div>
      <p class="small-note">Wacht op de volgende vraag. Kijk naar het scherm.</p></main>`);
    return;
  }
  if (st.status === 'klaar') {
    const u = st.uitslag;
    const medaille = u.plek === 1 ? '🥇' : u.plek === 2 ? '🥈' : u.plek === 3 ? '🥉' : '🏁';
    render(header() + `<main class="kq-mid">
      <div class="kq-big" aria-hidden="true">${medaille}</div>
      <h1>${u.plek <= 3 ? 'Mooi gedaan, ' + esc(st.bijnaam) + '!' : 'Het spel is afgelopen'}</h1>
      <p>Je werd nummer ${u.plek} van ${u.aantal}.</p>
      <div class="kq-stat"><div><b>${u.plek}</b><small>je plek</small></div><div><b>${u.score}</b><small>punten</small></div></div>
      <button class="btn ghost" id="weer" type="button">Opnieuw meedoen</button></main>`);
    $('#weer').onclick = () => { token = null; store.del('kq_tok'); viewJoin(); };
  }
}

async function kies(i) {
  if (eigenKeuze !== null) return;
  eigenKeuze = i;
  app.querySelectorAll('.kq-opt').forEach(b => { b.disabled = true; if (parseInt(b.dataset.i, 10) === i) b.classList.add('sel'); else b.classList.add('dim'); });
  const r = await rpc('kq_answer', { p_token: token, p_optie: i });
  if (r.error && r.error !== 'al_beantwoord') {
    if (r.error === 'verwijderd') { token = null; store.del('kq_tok'); viewJoin(kerr(r.error)); return; }
    if (r.error === 'netwerk' || r.error === 'serverfout') {
      eigenKeuze = null;
      app.querySelectorAll('.kq-opt').forEach(b => { b.disabled = false; b.classList.remove('sel', 'dim'); });
      const m = $('#msg'); if (m) m.textContent = 'Je antwoord is niet aangekomen. Tik het opnieuw aan.';
      return;
    }
    const m = $('#msg'); if (m) m.textContent = kerr(r.error);
    return;
  }
  lastKey = '';
  refresh();
}

if (token) { start(); } else { viewJoin(); }
