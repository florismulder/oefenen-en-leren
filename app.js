const app = document.getElementById('app');
const CHAPTERS = [
  'De aanloop (1919 tot 1939)',
  'De strijd van 1939 tot 1942',
  'De strijd van 1943 tot 1945, Azië en Indonesië',
  'Na de oorlog',
  'Finale: alle hoofdstukken door elkaar'
];
const RONDES = [
  { t: 'Ronde 1: Stelsel en Tweede Kamer', s: 'Hoofdstuk 1 en 2' },
  { t: 'Ronde 2: Verkiezingen en Eerste Kamer', s: 'Hoofdstuk 3 en 4' },
  { t: 'Ronde 3: Kabinet en wet', s: 'Hoofdstuk 5 en 6' },
  { t: 'Finale: alle stof door elkaar', s: 'Met formatie en coalitie. 20 seconden per vraag en dubbele punten.' }
];
const GAMES = [
  { id: 'flash', href: 'flash', icon: '🃏', titel: 'Flashcards Kamer en Kabinet', vak: 'Politiek · zonder code', tekst: 'Leer de stof en oefen voor de toets. Open voor iedereen.' },
  { id: 'woii', icon: '🕰️', titel: 'Tweede Wereldoorlog', vak: 'Geschiedenis', tekst: 'Oefen de stof van de reader per hoofdstuk, met een finale.', archief: true },
  { id: 'politiek', icon: '🏛️', titel: 'Kamer en Kabinet', vak: 'Politiek', tekst: 'Wekelijkse oefenrondes en een finale vlak voor de toets.', archief: true }
];
let vak = store.get('oefen_vak') === 'politiek' ? 'politiek' : 'woii';
let inMenu = false;
setVak(vak, false);
let curStage = null;
const tokKey = v => 'oefen_tok_' + v;
let token = null;
let st = null;
let raf = null;
let lbTimer = null;
const $ = s => app.querySelector(s);

function clearTimers() {
  if (raf) { cancelAnimationFrame(raf); raf = null; }
  if (lbTimer) { clearInterval(lbTimer); lbTimer = null; }
}
function render(html) {
  clearTimers();
  app.innerHTML = html;
  window.scrollTo(0, 0);
}
function header() {
  if (inMenu) {
    return '<header class="top"><div class="brand">Oefenspellen</div><div class="sub">Mediacollege Amsterdam</div></header>';
  }
  if (vak === 'politiek') {
    return '<header class="top">' + hemicycle() + '<div class="brand">Kamer en Kabinet</div><div class="sub">Oefenrondes bij de reader</div></header>';
  }
  return '<header class="top"><div class="brand">Tweede Wereldoorlog</div><div class="sub">Oefenspel bij de reader</div></header>';
}
function logout() {
  token = null;
  store.del(tokKey(vak));
  viewMenu();
}

/* ---------- Menu ---------- */
function viewMenu() {
  inMenu = true;
  setVak('woii', false);
  const tile = g => `<button class="game" data-g="${g.id}" type="button">
    <span class="gi" aria-hidden="true">${g.icon}</span>
    <span class="gt"><b>${esc(g.titel)}</b><span class="gv">${esc(g.vak)}${!g.href && store.get(tokKey(g.id)) ? ' · verder spelen' : ''}</span><span class="gx">${esc(g.tekst)}</span></span></button>`;
  const actief = GAMES.filter(g => !g.archief).map(tile).join('');
  const arch = GAMES.filter(g => g.archief).map(tile).join('');
  render(header() + `<main><h1>Kies je spel</h1>
    <p>Kies het spel dat je wilt spelen. Heb je al gespeeld, dan ga je daar verder waar je was.</p>
    <div class="games">${actief}
    <div class="game soon" aria-hidden="true"><span class="gi">✨</span><span class="gt"><b>Binnenkort meer</b><span class="gx">Er komen later meer oefenspellen bij.</span></span></div></div>
    ${arch ? `<h2 class="archief-kop">Archief</h2><p class="small-note">Deze spellen zijn afgerond. Je kunt ze nog openen met je eigen code.</p><div class="games archief">${arch}</div>` : ''}</main>`);
  app.querySelectorAll('.game[data-g]').forEach(b => b.onclick = () => {
    const gg = GAMES.find(x => x.id === b.dataset.g);
    if (gg && gg.href) { location.href = gg.href; return; }
    inMenu = false;
    vak = setVak(b.dataset.g, false);
    const t = store.get(tokKey(vak));
    if (t) { token = t; loadHome(); } else { token = null; viewLogin(); }
  });
}

/* ---------- Inloggen ---------- */
function viewLogin(msg) {
  render(header() + `<main class="card">
    <h1>Welkom</h1>
    <p>Vul de code in die je van je docent hebt gekregen. Bijvoorbeeld otter-4821.</p>
    <form id="f">
      <label for="code">Je code</label>
      <input id="code" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="dier-0000">
      <button class="btn" type="submit">Verder</button>
    </form>
    <p class="msg" id="msg" role="alert">${esc(msg || '')}</p>
    <button class="btn ghost small" id="menu" type="button">Kies een ander spel</button>
  </main>`);
  $('#menu').onclick = viewMenu;
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const code = $('#code').value.trim();
    if (!code) return;
    const b = $('.btn'); b.disabled = true;
    const r = await rpc('player_check_code', { p_code: code });
    b.disabled = false;
    if (r.error) { $('#msg').textContent = errText(r.error); return; }
    if (r.vak !== vak) {
      const g = GAMES.find(x => x.id === r.vak);
      $('#msg').textContent = 'Deze code hoort bij ' + (g ? g.titel : 'een ander spel') + '. Kies dat spel in het menu.';
      return;
    }
    setVak(r.vak);
    if (r.status === 'nieuw') viewClaim(code, r.dier);
    else viewPin(code, r.dier);
  };
  $('#code').focus();
}

function pinInput(id, label) {
  return `<label for="${id}">${label}</label>
    <input id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="4 cijfers">`;
}

function viewClaim(code, dier) {
  render(header() + `<main class="card">
    <div class="me"><div class="avatar" aria-hidden="true">${emoji(dier)}</div><div><div class="name">Jij bent de ${esc(dier)}</div><div class="stats">Dit is jouw karakter in de ranglijst.</div></div></div>
    <p>Kies een pincode van 4 cijfers. Daarmee log je later weer in. Onthoud hem goed.</p>
    <form id="f">
      ${pinInput('p1', 'Kies een pincode')}
      ${pinInput('p2', 'Herhaal je pincode')}
      <button class="btn" type="submit">Start het spel</button>
    </form>
    <p class="msg" id="msg" role="alert"></p>
    <p class="small-note">Ben je je pincode vergeten? Je docent kan hem resetten binnen zeven dagen nadat je voor het laatst speelde. Daarna vervalt je score.</p>
    <button class="btn ghost small" id="back" type="button">Andere code</button>
  </main>`);
  $('#back').onclick = () => viewLogin();
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const p1 = $('#p1').value, p2 = $('#p2').value;
    if (!/^[0-9]{4}$/.test(p1)) { $('#msg').textContent = errText('pincode_ongeldig'); return; }
    if (p1 !== p2) { $('#msg').textContent = 'De twee pincodes zijn niet gelijk.'; return; }
    const b = $('.btn'); b.disabled = true;
    const r = await rpc('player_claim', { p_code: code, p_pin: p1 });
    b.disabled = false;
    if (r.error) { $('#msg').textContent = errText(r.error); return; }
    token = r.token; store.set(tokKey(vak), token);
    loadHome();
  };
  $('#p1').focus();
}

function viewPin(code, dier) {
  render(header() + `<main class="card">
    <div class="me"><div class="avatar" aria-hidden="true">${emoji(dier)}</div><div><div class="name">${esc(dier)}</div><div class="stats">Welkom terug.</div></div></div>
    <form id="f">
      ${pinInput('p1', 'Je pincode')}
      <button class="btn" type="submit">Inloggen</button>
    </form>
    <p class="msg" id="msg" role="alert"></p>
    <button class="btn ghost small" id="back" type="button">Andere code</button>
  </main>`);
  $('#back').onclick = () => viewLogin();
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const b = $('.btn'); b.disabled = true;
    const r = await rpc('player_login', { p_code: code, p_pin: $('#p1').value });
    b.disabled = false;
    if (r.error) { $('#msg').textContent = errText(r.error); return; }
    token = r.token; store.set(tokKey(vak), token);
    loadHome();
  };
  $('#p1').focus();
}

/* ---------- Home ---------- */
async function loadHome() {
  render(header() + '<p>Laden...</p>');
  st = await rpc('player_state', { p_token: token });
  if (st.error) {
    if (st.error === 'sessie_verlopen') { token = null; store.del(tokKey(vak)); }
    viewLogin(errText(st.error));
    return;
  }
  vak = setVak(st.vak);
  viewHome();
}

function nav(active) {
  return `<nav class="tabs" aria-label="Menu">
    <button data-t="spelen" ${active === 'spelen' ? 'aria-current="true"' : ''}>Spelen</button>
    <button data-t="ranglijst" ${active === 'ranglijst' ? 'aria-current="true"' : ''}>Ranglijst</button>
    <button data-t="menu">Ander spel</button>
  </nav>`;
}
function bindNav() {
  app.querySelectorAll('nav.tabs button').forEach(b => {
    b.onclick = () => { if (b.dataset.t === 'spelen') loadHome(); else if (b.dataset.t === 'menu') viewMenu(); else viewLeaderboard(); };
  });
}
function meBox() {
  return `<div class="me"><div class="avatar" aria-hidden="true">${emoji(st.dier)}</div>
    <div><div class="name">${esc(st.dier)}</div>
    <div class="stats"><b>${st.score}</b> punten${st.bord && st.plek ? ' · plek <b>' + st.plek + '</b>' : ''}</div></div></div>`;
}

function viewHomePolitiek() {
  const items = st.rondes.map((r, i) => {
    const n = r.ronde, info = RONDES[i];
    let cls = 'dicht', status = 'Nog dicht. Je docent zet deze ronde open.', btn = '', extra = '';
    if (r.totaal === 0) {
      status = r.open ? 'Komt binnenkort.' : 'Nog dicht. Je docent zet deze ronde open.';
    } else if (r.open && r.klaar >= r.totaal) {
      cls = 'klaar'; status = 'Afgerond';
    } else if (r.open) {
      cls = 'actief'; status = 'Open';
      extra = `<div class="bar" aria-hidden="true"><i style="width:${Math.round(r.klaar / r.totaal * 100)}%"></i></div>
        <div class="s">${r.klaar} van ${r.totaal} vragen afgerond</div>`;
      if (!st.afgelopen) {
        const label = (st.heeft_vraag && curStage === n) ? 'Ga verder met je vraag' : (r.klaar > 0 ? 'Ga verder' : (n === 4 ? 'Start de finale' : 'Start ronde ' + n));
        btn = `<button class="btn go" data-stage="${n}">${label}</button>`;
      }
    } else if (!r.open && r.klaar >= r.totaal && r.totaal > 0) {
      cls = 'klaar'; status = 'Afgerond';
    }
    return `<li class="${cls}${n === 4 ? ' finale' : ''}"><div class="t">${esc(info.t)}</div><div class="s">${esc(info.s)}</div><div class="s"><b>${esc(status)}</b></div>${extra}${btn}</li>`;
  }).join('');
  let banner = '';
  if (st.afgelopen) banner = '<div class="banner">De competitie is afgelopen. Bekijk de stand bij Ranglijst als je docent die heeft onthuld.</div>';
  else if (st.heeft_vraag) banner = '<div class="banner">Je hebt nog een vraag open staan. Ga verder in de ronde waar je mee bezig was.</div>';
  render(header() + nav('spelen') + meBox() + banner + `<ul class="chapters">${items}</ul>` +
    `<p class="small-note" style="margin-top:16px">Je hebt 30 seconden per vraag, in de finale 20 seconden. Goed in één keer geeft 10 punten. Daarna 5, 3 en 2 punten. In de finale telt alles dubbel. Een foute vraag komt later terug, soms in een andere vorm. De competitie eindigt op ${esc(fmtDay(st.eind_datum))}. Speel je zeven dagen niet, dan vervalt je score.</p>
     <button class="btn ghost small" id="out" type="button">Uitloggen</button>`);
  bindNav();
  app.querySelectorAll('.go').forEach(b => b.onclick = () => play(parseInt(b.dataset.stage, 10)));
  $('#out').onclick = logout;
}

function viewHome() {
  if (st.vak === 'politiek') return viewHomePolitiek();
  const h = st.hoofdstuk;
  const items = CHAPTERS.map((t, i) => {
    const n = i + 1;
    let cls = 'dicht', status = 'Nog dicht';
    if (n < h) { cls = 'klaar'; status = 'Afgerond'; }
    else if (n === h) { cls = 'actief'; status = 'Nu aan de beurt'; }
    let extra = '';
    if (n === h && st.totaal > 0) {
      extra = `<div class="bar" aria-hidden="true"><i style="width:${Math.round(st.klaar / st.totaal * 100)}%"></i></div>
        <div class="s">${st.klaar} van ${st.totaal} vragen afgerond</div>`;
    }
    return `<li class="${cls}"><div class="t">${n <= 4 ? 'Hoofdstuk ' + n + ': ' : ''}${esc(t)}</div><div class="s">${status}</div>${extra}</li>`;
  }).join('');
  let action = '';
  if (st.afgelopen) {
    action = `<div class="banner">De competitie is afgelopen. Bekijk de stand bij Ranglijst als je docent die heeft onthuld.</div>`;
  } else if (h > 5) {
    action = `<div class="banner">Je hebt alle hoofdstukken en de finale afgerond. Goed gedaan!</div>`;
  } else {
    action = `<button class="btn block" id="go">${st.heeft_vraag ? 'Ga verder met je vraag' : (st.klaar > 0 ? 'Ga verder' : 'Start hoofdstuk ' + h)}</button>`;
  }
  render(header() + nav('spelen') + meBox() + `<ul class="chapters">${items}</ul>` + action +
    `<p class="small-note" style="margin-top:16px">Je hebt 30 seconden per vraag. Goed in één keer geeft 10 punten. Daarna 5, 3, 2 en 1 punt. De competitie eindigt op ${esc(fmtDay(st.eind_datum))}. Speel je zeven dagen niet, dan vervalt je score.</p>
     <button class="btn ghost small" id="out" type="button">Uitloggen</button>`);
  bindNav();
  const go = $('#go'); if (go) go.onclick = () => play();
  $('#out').onclick = logout;
}

/* ---------- Spelen ---------- */
async function play(stage) {
  if (typeof stage === 'number') curStage = stage;
  render(header() + '<p>Vraag ophalen...</p>');
  const args = { p_token: token };
  if (vak === 'politiek') {
    const res = await rpc('player_next', { p_token: token, p_stage: typeof curStage === 'number' ? curStage : null });
    return handleNext(res);
  }
  const n = await rpc('player_next', args);
  return handleNext(n);
}

function handleNext(n) {
  if (n.error) {
    if (n.error === 'sessie_verlopen') { token = null; store.del(tokKey(vak)); viewLogin(errText(n.error)); }
    else viewMessage(errText(n.error));
    return;
  }
  if (n.status === 'vraag') return showQuestion(n);
  if (n.status === 'uitslag') return showResult(n.uitslag, true);
  if (n.status === 'binnenkort') {
    viewMessage((vak === 'politiek' ? 'Ronde ' + n.ronde : 'Hoofdstuk ' + n.hoofdstuk) + ' wordt binnenkort toegevoegd. Je docent laat het weten zodra je verder kunt.');
    return;
  }
  if (n.status === 'dicht') {
    viewMessage('Ronde ' + n.ronde + ' is nog niet open. Je docent zet hem open.');
    return;
  }
  loadHome();
}

function viewMessage(text) {
  render(header() + `<main class="card"><p>${esc(text)}</p><button class="btn" id="home">Naar het hoofdmenu</button></main>`);
  $('#home').onclick = loadHome;
}

function showQuestion(n) {
  const opts = n.opties.map((o, i) =>
    `<button class="opt" data-id="${o.id}"><b>${'ABCDE'[i]}.</b> ${esc(o.tekst)}</button>`).join('');
  const LIMIT = n.limiet || 30;
  const unit = (n.vak === 'politiek') ? (n.ronde === 4 ? 'Finale' : 'Ronde ' + n.ronde) : (n.hoofdstuk <= 4 ? 'Hoofdstuk ' + n.hoofdstuk : 'Finale');
  render(header() + `
    <div class="qmeta"><span>${unit} · ${n.klaar} van ${n.totaal} afgerond</span>
    <span>Poging ${n.poging} van ${n.max_pogingen || 5} · ${n.punten} ${n.punten === 1 ? 'punt' : 'punten'}</span></div>
    <div class="timer" id="timer" role="timer" aria-label="Resterende tijd"><i id="tbar"></i></div>
    <div class="qmeta"><span></span><span id="tnum">${Math.ceil(n.resterend)} s</span></div>
    <div class="qtext" id="q">${esc(n.vraag)}</div>
    <div class="opts" id="opts">${opts}</div>`);
  const deadline = performance.now() + n.resterend * 1000;
  let answered = false;
  const buttons = Array.from(app.querySelectorAll('.opt'));
  async function send(opt) {
    if (answered) return;
    answered = true;
    clearTimers();
    buttons.forEach(b => b.disabled = true);
    const u = await rpc('player_answer', { p_token: token, p_option: opt });
    if (u.error === 'sessie_verlopen') { token = null; store.del(tokKey(vak)); viewLogin(errText(u.error)); return; }
    if (u.error === 'geen_vraag') { play(); return; }
    if (u.error) { viewMessage(errText(u.error)); return; }
    showResult(u);
  }
  buttons.forEach(b => b.onclick = () => send(parseInt(b.dataset.id, 10)));
  function tick() {
    const left = Math.max(0, (deadline - performance.now()) / 1000);
    const bar = document.getElementById('tbar');
    if (!bar) return;
    bar.style.width = (left / LIMIT * 100) + '%';
    document.getElementById('timer').classList.toggle('low', left <= 6);
    document.getElementById('tnum').textContent = Math.ceil(left) + ' s';
    if (left <= 0) { send(null); return; }
    raf = requestAnimationFrame(tick);
  }
  tick();
}

function showResult(u, resumed) {
  const pag = u.onthul ? u.onthul.pagina : '';
  let body = '';
  let cls = 'fout';
  if (u.goed) {
    cls = 'goed';
    body = `<h2>Goed!</h2><p>Je krijgt <b>${u.punten} ${u.punten === 1 ? 'punt' : 'punten'}</b>.</p>`;
  } else {
    body = `<h2>${u.te_laat ? 'Te laat.' : 'Fout.'}</h2>`;
    if (u.te_laat && resumed) body += '<p>De tijd van je vorige vraag was om.</p>';
    if (u.pogingen_over > 0) {
      body += `<p>Je krijgt deze vraag later opnieuw, mogelijk in een andere vorm. Je hebt nog ${u.pogingen_over} ${u.pogingen_over === 1 ? 'poging' : 'pogingen'}.</p>`;
    }
    if (u.tip) {
      body += `<div class="tip"><b>Tip:</b> ${esc(u.tip)}<br>Onthoud deze tip. De vraag komt nog één keer terug en dat is je laatste poging.</div>`;
    }
    if (u.onthul) {
      body += `<div class="reveal"><b>Het juiste antwoord:</b> ${esc(u.onthul.goed_antwoord)}<br>${esc(u.onthul.uitleg)}<br><br>
        <b>Bestudeer de paragraaf "${esc(u.onthul.paragraaf)}" op pagina ${esc(pag)} van de reader goed.</b></div>`;
    }
  }
  const pol = u.vak === 'politiek';
  if (u.hoofdstuk_klaar) {
    if (pol) {
      body += u.ronde === 4
        ? '<div class="banner">Je hebt de finale afgerond. Gefeliciteerd!</div>'
        : `<div class="banner">Ronde ${u.ronde} is afgerond.</div>`;
    } else {
      body += u.alles_klaar
        ? '<div class="banner">Je hebt de finale afgerond. Gefeliciteerd!</div>'
        : `<div class="banner">Hoofdstuk ${u.hoofdstuk} is afgerond.</div>`;
    }
  }
  render(header() + `<div class="result ${cls}" role="status">${body}
    <p class="small-note">Totaal: <b>${u.score}</b> punten</p></div>
    <div class="row"><div><button class="btn block" id="next">${(pol && u.hoofdstuk_klaar) ? 'Naar de rondes' : (u.hoofdstuk_klaar ? 'Verder' : 'Volgende vraag')}</button></div>
    <div><button class="btn ghost block" id="stop">Stoppen</button></div></div>`);
  $('#next').onclick = (pol && u.hoofdstuk_klaar) ? loadHome : () => play();
  $('#stop').onclick = loadHome;
  $('#next').focus();
}

/* ---------- Ranglijst ---------- */
async function viewLeaderboard() {
  render(header() + nav('ranglijst') + '<p>Laden...</p>');
  bindNav();
  await drawLeaderboard();
}

async function drawLeaderboard(quiet) {
  const r = await rpc('player_leaderboard', { p_token: token });
  if (r.error) {
    if (r.error === 'sessie_verlopen') { token = null; store.del(tokKey(vak)); viewLogin(errText(r.error)); return; }
    if (!quiet) viewMessage(errText(r.error));
    return;
  }
  if (r.verborgen) {
    render(header() + nav('ranglijst') + `
    <h1>Ranglijst</h1>
    <div class="banner">De ranglijst is nog verborgen. Je docent onthult de stand in de les.</div>
    <p class="small-note">Ondertussen telt elk goed antwoord. Een snel antwoord helpt bij gelijke punten.</p>`);
    bindNav();
    if (!r.afgelopen) lbTimer = setInterval(() => { drawLeaderboard(true); }, 15000);
    return;
  }
  const rows = r.rijen.map(x => `<tr class="${x.ik ? 'ik' : ''}"><td class="num">${x.plek}</td>
    <td><span class="em" aria-hidden="true">${emoji(x.dier)}</span>${esc(x.dier)}${x.ik ? ' (jij)' : ''}</td>
    <td class="num">${x.score}</td></tr>`).join('');
  const y = window.scrollY;
  render(header() + nav('ranglijst') + `
    <h1>${r.afgelopen ? 'Eindstand' : 'Ranglijst'}</h1>
    <p class="small-note">${r.afgelopen ? 'De competitie is afgelopen.' : 'De competitie eindigt op ' + esc(fmtDay(r.eind_datum)) + '. De lijst ververst vanzelf.'}</p>
    <table class="rank"><thead><tr><th class="num">Plek</th><th>Karakter</th><th class="num">Punten</th></tr></thead><tbody>${rows || '<tr><td colspan="3">Nog niemand in de lijst.</td></tr>'}</tbody></table>`);
  bindNav();
  if (quiet) window.scrollTo(0, y);
  if (!r.afgelopen) lbTimer = setInterval(() => { drawLeaderboard(true); }, 15000);
}

/* ---------- Start ---------- */
(async function start() {
  // oude sessie (zonder vak) overzetten naar de nieuwe opslag per spel
  const old = store.get('woii_token');
  if (old) {
    try {
      const s0 = await rpc('player_state', { p_token: old });
      if (s0 && s0.vak) store.set(tokKey(s0.vak), old);
    } catch (e) {}
    store.del('woii_token');
  }
  viewMenu();
})();
