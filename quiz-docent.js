/* Live quiz: beheer van vragensets en starten van een spel */
const app = document.getElementById('app');
const $ = s => app.querySelector(s);
const LETTERS = ['A', 'B', 'C', 'D'];
const THEMAS = { koude_oorlog: 'Koude Oorlog', woii: 'Tweede Wereldoorlog', politiek: 'Politiek', neutraal: 'Neutraal' };
const STATUS = { lobby: 'Wachtkamer', vraag: 'Bezig', uitslag: 'Bezig', klaar: 'Afgelopen' };
const KERR = {
  vragen_ongeldig: 'Controleer de vragen. Elke vraag heeft een tekst, antwoorden en één juist antwoord.',
  naam_ongeldig: 'Geef de set een naam van maximaal 60 tekens.',
  thema_ongeldig: 'Kies een thema uit de lijst.',
  set_niet_gevonden: 'Deze set bestaat niet meer.',
  geen_vragen: 'Deze set heeft nog geen vragen.',
  tijd_ongeldig: 'De tijd ligt tussen 5 en 120 seconden.',
  juist_ongeldig: 'Kies bij elke vraag het juiste antwoord.',
  opties_ongeldig: 'Elk antwoord bestaat uit 1 tot 120 tekens.',
  vraag_ongeldig: 'Elke vraag bestaat uit 1 tot 300 tekens.'
};
function kerr(c) { return KERR[c] || errText(c); }

let pw = null;
try { pw = sessionStorage.getItem('woii_docent'); } catch (e) {}
let model = null;
let melding = '';

function draw(html, behoudScroll) {
  const y = window.scrollY;
  app.innerHTML = html;
  if (behoudScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
}
function header() {
  return `<header class="top"><div class="brand">Live quiz</div><div class="sub">Beheer van vragen en starten van een spel</div></header>`;
}
function logout() {
  pw = null;
  try { sessionStorage.removeItem('woii_docent'); } catch (e) {}
  viewLogin();
}

/* ---------- Inloggen ---------- */
function viewLogin(msg) {
  draw(header() + `<main class="card" style="max-width:420px">
    <h1>Inloggen</h1>
    <form id="f"><label for="pw">Wachtwoord</label>
    <input id="pw" type="password" autocomplete="current-password">
    <button class="btn" type="submit">Inloggen</button></form>
    <p class="msg" id="msg" role="alert">${esc(msg || '')}</p></main>`);
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const p = $('#pw').value;
    const b = $('.btn'); b.disabled = true;
    const r = await rpc('kq_set_list', { p_password: p });
    b.disabled = false;
    if (r.error) { $('#msg').textContent = kerr(r.error); return; }
    pw = p;
    try { sessionStorage.setItem('woii_docent', pw); } catch (e2) {}
    loadHome();
  };
  $('#pw').focus();
}

/* ---------- Overzicht ---------- */
async function loadHome(m) {
  if (m !== undefined) melding = m;
  const [s, g] = await Promise.all([rpc('kq_set_list', { p_password: pw }), rpc('kq_game_list', { p_password: pw })]);
  if (s.error || g.error) {
    const e = s.error || g.error;
    if (e === 'verkeerd_wachtwoord') { logout(); return; }
    viewLogin(kerr(e)); return;
  }
  viewHome(s.sets, g.spellen);
}
function viewHome(sets, spellen) {
  const opt = sets.map(s => `<option value="${esc(s.id)}">${esc(s.naam)} (${s.aantal} vragen, ${esc(THEMAS[s.thema] || s.thema)})</option>`).join('');
  const rijen = sets.map(s => `<tr><td><b>${esc(s.naam)}</b></td><td><span class="pill">${esc(THEMAS[s.thema] || s.thema)}</span></td><td>${s.aantal}</td>
    <td><button class="btn small" data-edit="${esc(s.id)}" type="button">Bewerken</button> <button class="btn small danger" data-del="${esc(s.id)}" data-naam="${esc(s.naam)}" type="button">Verwijderen</button></td></tr>`).join('');
  const sp = spellen.map(x => `<tr><td><b>${esc(x.set_naam)}</b></td><td>${esc(x.pin)}</td><td>${x.spelers}</td><td>${esc(STATUS[x.status] || x.status)}</td>
    <td><a class="btn small" href="/quiz-host?spel=${encodeURIComponent(x.id)}" target="_blank" rel="noopener">Open scherm</a> <button class="btn small danger" data-gdel="${esc(x.id)}" type="button">Verwijderen</button></td></tr>`).join('');
  draw(header() + `
    <div class="kqd-acties" style="margin-bottom:12px"><button class="btn ghost small" id="out" type="button">Uitloggen</button><a class="btn ghost small" href="/docent">Naar de docentenpagina</a></div>
    ${melding ? `<div class="kqd-ok" role="status">${esc(melding)}</div>` : ''}
    <h2>Start een spel</h2>
    ${sets.length ? `<form class="card" id="sf"><label for="ss">Kies een vragenset</label><select id="ss">${opt}</select>
      <button class="btn" type="submit">Start spel</button>
      <p class="msg" id="smsg" role="alert"></p>
      <p class="small-note">Het scherm voor het digibord opent in een nieuw venster. Zet de speakers aan voor muziek en geluid. Spelers en bijnamen verdwijnen na 24 uur vanzelf.</p></form>` : '<p>Maak eerst een vragenset. Dan kun je een spel starten.</p>'}
    ${spellen.length ? `<h2>Spellen van de laatste 24 uur</h2><div class="table-scroll"><table class="docent"><thead><tr><th>Set</th><th>Pincode</th><th>Spelers</th><th>Status</th><th></th></tr></thead><tbody>${sp}</tbody></table></div>` : ''}
    <h2>Mijn vragensets</h2>
    ${sets.length ? `<div class="table-scroll"><table class="docent"><thead><tr><th>Naam</th><th>Thema</th><th>Vragen</th><th></th></tr></thead><tbody>${rijen}</tbody></table></div>` : '<p>Nog geen vragensets.</p>'}
    <div class="kqd-acties" style="margin-top:14px"><button class="btn" id="nieuw" type="button">Nieuwe set maken</button></div>`);
  melding = '';
  $('#out').onclick = logout;
  $('#nieuw').onclick = () => { model = { id: null, naam: '', thema: 'neutraal', vragen: [leegeVraag()] }; viewEditor(); window.scrollTo(0, 0); };
  app.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => {
    const r = await rpc('kq_set_get', { p_password: pw, p_id: b.dataset.edit });
    if (r.error) { alert(kerr(r.error)); return; }
    model = { id: r.set.id, naam: r.set.naam, thema: r.set.thema, vragen: r.set.vragen.map(v => ({ vraag: v.vraag, opties: v.opties.slice(), juist: v.juist, dubbel: !!v.dubbel, tijd: v.tijd || 15 })) };
    viewEditor();
    window.scrollTo(0, 0);
  });
  app.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Set ' + b.dataset.naam + ' definitief verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
    const r = await rpc('kq_set_delete', { p_password: pw, p_id: b.dataset.del });
    if (r.error) { alert(kerr(r.error)); return; }
    loadHome();
  });
  app.querySelectorAll('[data-gdel]').forEach(b => b.onclick = async () => {
    if (!confirm('Dit spel met alle spelers verwijderen?')) return;
    const r = await rpc('kq_game_delete', { p_password: pw, p_game: b.dataset.gdel });
    if (r.error) { alert(kerr(r.error)); return; }
    loadHome();
  });
  if ($('#sf')) $('#sf').onsubmit = async e => {
    e.preventDefault();
    const b = $('#sf .btn'); b.disabled = true;
    const w = window.open('', '_blank');
    const r = await rpc('kq_game_start', { p_password: pw, p_set: $('#ss').value });
    b.disabled = false;
    if (r.error) { if (w) w.close(); $('#smsg').textContent = kerr(r.error); return; }
    const url = '/quiz-host?spel=' + encodeURIComponent(r.id);
    if (w) { w.location.href = url; loadHome('Het spel is gestart. Pincode ' + r.pin + '. Het scherm voor het digibord staat in een nieuw venster.'); }
    else { location.href = url; }
  };
}

/* ---------- Set bewerken ---------- */
function leegeVraag() { return { vraag: '', opties: ['', '', '', ''], juist: null, dubbel: false, tijd: 15 }; }

const PROMPT_CLAUDE = `Maak [AANTAL] meerkeuzevragen over [ONDERWERP] voor MBO-studenten van 16 en 17 jaar. Gebruik eenvoudige taal en korte antwoorden. Geef per vraag precies vier antwoorden. Eén antwoord is juist. Wissel af welke letter juist is.

Schrijf elke vraag precies zo op, met een lege regel tussen de vragen. Gebruik geen opmaak, geen nummering en geen extra tekst:

Vraag: ...
A: ...
B: ...
C: ...
D: ...
Juist: B

Is een vraag extra moeilijk? Zet dan op een extra regel: Dubbel: ja
Heeft een vraag meer leestijd nodig? Zet dan op een extra regel: Tijd: 25`;

function viewEditor(importMsg) {
  const m = model;
  const kaarten = m.vragen.map((q, qi) => `<div class="kqd-vraag" data-qi="${qi}">
    <div class="kop"><span>Vraag ${qi + 1}</span><span><button class="btn small ghost" data-act="up" type="button" ${qi === 0 ? 'disabled' : ''} aria-label="Vraag omhoog">↑</button> <button class="btn small ghost" data-act="down" type="button" ${qi === m.vragen.length - 1 ? 'disabled' : ''} aria-label="Vraag omlaag">↓</button> <button class="btn small danger" data-act="del" type="button">Verwijderen</button></span></div>
    <label for="q${qi}">Vraag</label>
    <textarea id="q${qi}" data-f="vraag" maxlength="300">${esc(q.vraag)}</textarea>
    <p class="small-note" style="margin:8px 0 0">Kies met het bolletje welk antwoord juist is.</p>
    ${q.opties.map((o, i) => `<div class="kqd-opt"><label class="let"><input type="radio" name="j${qi}" data-f="juist" value="${i}" ${q.juist === i ? 'checked' : ''}> ${LETTERS[i]}</label><input data-f="optie" data-o="${i}" maxlength="120" value="${esc(o)}" aria-label="Antwoord ${LETTERS[i]}"></div>`).join('')}
    <div class="kqd-instel">
      <label><input type="checkbox" data-f="dubbel" ${q.dubbel ? 'checked' : ''}> Dubbele punten</label>
      <label>Tijd <input type="number" data-f="tijd" min="5" max="120" value="${q.tijd}"> seconden</label>
    </div></div>`).join('');
  draw(header() + `
    <div class="kqd-acties" style="margin-bottom:12px"><button class="btn ghost small" id="terug" type="button">← Terug zonder opslaan</button></div>
    <h2>${m.id ? 'Set bewerken' : 'Nieuwe set'}</h2>
    <div class="card"><div class="row">
      <div><label for="nm">Naam van de set</label><input id="nm" maxlength="60" value="${esc(m.naam)}" placeholder="bijvoorbeeld Koude Oorlog les 2"></div>
      <div><label for="th">Thema</label><select id="th">${Object.keys(THEMAS).map(k => `<option value="${k}" ${m.thema === k ? 'selected' : ''}>${esc(THEMAS[k])}</option>`).join('')}</select></div>
    </div></div>
    <h2>Vragen plakken uit een chat met Claude</h2>
    <div class="card kqd-import">
      <p>Laat Claude de vragen maken in dit formaat. Kopieer de opdracht, vul het aantal en het onderwerp in en plak het antwoord van Claude hieronder.</p>
      <div class="kqd-acties"><button class="btn ghost small" id="kopie" type="button">Kopieer opdracht voor Claude</button><span id="kopmsg" class="small-note" role="status"></span></div>
      <label for="imp">Geplakte vragen</label>
      <textarea id="imp" spellcheck="false" placeholder="Vraag: ...&#10;A: ...&#10;B: ...&#10;C: ...&#10;D: ...&#10;Juist: B"></textarea>
      <div class="kqd-acties" style="margin-top:10px"><button class="btn small" id="impgo" type="button">Controleer en voeg toe</button></div>
      <div id="impres" aria-live="polite">${importMsg || ''}</div>
    </div>
    <h2>Vragen (${m.vragen.length})</h2>
    ${kaarten}
    <div class="kqd-acties"><button class="btn ghost" id="plus" type="button">Vraag toevoegen</button></div>
    <div class="kqd-acties" style="margin-top:18px"><button class="btn" id="opslaan" type="button">Opslaan</button><span class="msg" id="msg" role="alert"></span></div>`, true);

  $('#terug').onclick = () => { if (confirm('Terug naar het overzicht? Niet opgeslagen wijzigingen gaan verloren.')) loadHome(); };
  $('#nm').oninput = e => { m.naam = e.target.value; };
  $('#th').onchange = e => { m.thema = e.target.value; };
  $('#plus').onclick = () => { m.vragen.push(leegeVraag()); viewEditor(); window.scrollTo(0, document.body.scrollHeight); };
  $('#kopie').onclick = async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(PROMPT_CLAUDE); ok = true; } catch (e) {}
    $('#kopmsg').textContent = ok ? 'Gekopieerd. Plak de opdracht in een chat met Claude.' : 'Kopiëren lukte niet. Selecteer de tekst zelf in het vak hieronder.';
    if (!ok) { const t = $('#imp'); t.value = PROMPT_CLAUDE; t.select(); }
  };
  $('#impgo').onclick = () => {
    const res = parseVragen($('#imp').value);
    if (!res.vragen.length && !res.fouten.length) { viewEditor('<div class="kqd-fouten">Er zijn geen vragen gevonden. Elke vraag begint met Vraag: en heeft antwoorden A en B (en C en D) en een regel Juist:.</div>'); return; }
    const leeg = m.vragen.length === 1 && !m.vragen[0].vraag.trim() && m.vragen[0].opties.every(o => !o.trim());
    if (leeg && res.vragen.length) m.vragen = [];
    res.vragen.forEach(v => m.vragen.push(v));
    let html = '';
    if (res.vragen.length) html += `<div class="kqd-ok">${res.vragen.length} ${res.vragen.length === 1 ? 'vraag' : 'vragen'} toegevoegd. Controleer ze hieronder.</div>`;
    if (res.fouten.length) html += `<div class="kqd-fouten">Deze vragen zijn niet toegevoegd:<ul>${res.fouten.map(f => `<li>${esc(f)}</li>`).join('')}</ul>Verbeter de tekst en plak alleen die vragen opnieuw.</div>`;
    viewEditor(html);
  };
  app.querySelectorAll('.kqd-vraag').forEach(card => {
    const qi = parseInt(card.dataset.qi, 10);
    card.addEventListener('input', e => {
      const f = e.target.dataset.f, q = m.vragen[qi];
      if (f === 'vraag') q.vraag = e.target.value;
      else if (f === 'optie') q.opties[parseInt(e.target.dataset.o, 10)] = e.target.value;
      else if (f === 'tijd') q.tijd = parseInt(e.target.value, 10) || 15;
    });
    card.addEventListener('change', e => {
      const f = e.target.dataset.f, q = m.vragen[qi];
      if (f === 'juist') q.juist = parseInt(e.target.value, 10);
      else if (f === 'dubbel') q.dubbel = e.target.checked;
    });
    card.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const a = b.dataset.act;
      if (a === 'del') {
        if (!confirm('Vraag ' + (qi + 1) + ' verwijderen?')) return;
        m.vragen.splice(qi, 1);
        if (!m.vragen.length) m.vragen.push(leegeVraag());
      } else if (a === 'up' && qi > 0) { [m.vragen[qi - 1], m.vragen[qi]] = [m.vragen[qi], m.vragen[qi - 1]]; }
      else if (a === 'down' && qi < m.vragen.length - 1) { [m.vragen[qi + 1], m.vragen[qi]] = [m.vragen[qi], m.vragen[qi + 1]]; }
      viewEditor();
    });
  });
  $('#opslaan').onclick = opslaan;
}

async function opslaan() {
  const m = model;
  const msg = $('#msg');
  if (!m.naam.trim()) { msg.textContent = 'Geef de set een naam.'; $('#nm').focus(); return; }
  for (let i = 0; i < m.vragen.length; i++) {
    const q = m.vragen[i];
    if (!q.vraag.trim()) { msg.textContent = 'Vraag ' + (i + 1) + ' heeft nog geen tekst.'; return; }
    if (q.opties.some(o => !o.trim())) { msg.textContent = 'Bij vraag ' + (i + 1) + ' mist een antwoord.'; return; }
    if (q.juist === null || q.juist === undefined) { msg.textContent = 'Kies bij vraag ' + (i + 1) + ' het juiste antwoord.'; return; }
    if (!(q.tijd >= 5 && q.tijd <= 120)) { msg.textContent = 'Bij vraag ' + (i + 1) + ' ligt de tijd tussen 5 en 120 seconden.'; return; }
  }
  const b = $('#opslaan'); b.disabled = true;
  const r = await rpc('kq_set_save', { p_password: pw, p_id: m.id, p_naam: m.naam, p_thema: m.thema, p_vragen: m.vragen });
  b.disabled = false;
  if (r.error) { msg.textContent = kerr(r.error); return; }
  loadHome('Opgeslagen: ' + m.naam.trim() + ' met ' + r.aantal + (r.aantal === 1 ? ' vraag.' : ' vragen.'));
}

/* ---------- Plakken: tekst omzetten naar vragen ---------- */
function parseVragen(tekst) {
  const KEY = /^\s*(vraag(?:\s*\d+)?|[a-d]|juist|goed|antwoord|dubbel|tijd)\s*[:.)]\s*(.*)$/i;
  const blokken = [];
  let cur = null, last = null;
  String(tekst || '').replace(/\r/g, '').split('\n').forEach(regel => {
    if (!regel.trim()) { last = null; return; }
    const k = regel.match(KEY);
    if (k) {
      const sleutel = k[1].toLowerCase().replace(/\s*\d+$/, ''), w = k[2].trim();
      if (sleutel === 'vraag') { cur = { vraag: w, opts: {}, juist: null, juistTekst: '', dubbel: false, tijd: 15 }; blokken.push(cur); last = 'vraag'; return; }
      if (!cur) return;
      if (/^[a-d]$/.test(sleutel)) { cur.opts[sleutel] = w; last = sleutel; return; }
      if (sleutel === 'juist' || sleutel === 'goed' || sleutel === 'antwoord') {
        const l = w.match(/^([a-d])\s*(?:[).:\-]|$)/i);
        if (l) cur.juist = 'abcd'.indexOf(l[1].toLowerCase()); else cur.juistTekst = w;
        last = null; return;
      }
      if (sleutel === 'dubbel') { cur.dubbel = /^(ja|j|yes|y|true|waar|1|x|dubbel)\b/i.test(w); last = null; return; }
      if (sleutel === 'tijd') { cur.tijd = parseInt(w, 10); last = null; return; }
    }
    if (cur && last) {
      const t = regel.trim();
      if (last === 'vraag') cur.vraag += ' ' + t; else cur.opts[last] += ' ' + t;
    }
  });
  const vragen = [], fouten = [];
  blokken.forEach((b, i) => {
    const fout = t => fouten.push('Vraag ' + (i + 1) + ': ' + t);
    if (!b.vraag.trim()) return fout('de vraagtekst ontbreekt');
    if (b.vraag.length > 300) return fout('de vraag is langer dan 300 tekens');
    const letters = ['a', 'b', 'c', 'd'].filter(l => (b.opts[l] || '').trim());
    const sleutel = letters.join('');
    if (sleutel !== 'abcd' && sleutel !== 'ab') return fout('gebruik de antwoorden A en B, of A tot en met D');
    const opties = letters.map(l => b.opts[l].trim());
    if (opties.some(o => o.length > 120)) return fout('een antwoord is langer dan 120 tekens');
    let juist = b.juist;
    if (juist === null && b.juistTekst) juist = opties.findIndex(o => o.toLowerCase() === b.juistTekst.toLowerCase());
    if (juist === null || juist < 0 || juist >= opties.length) return fout('geef het juiste antwoord op, bijvoorbeeld Juist: B');
    const tijd = Number.isFinite(b.tijd) ? b.tijd : 15;
    if (tijd < 5 || tijd > 120) return fout('de tijd ligt tussen 5 en 120 seconden');
    vragen.push({ vraag: b.vraag.trim(), opties, juist, dubbel: b.dubbel, tijd });
  });
  return { vragen, fouten };
}

if (pw) loadHome(); else viewLogin();
