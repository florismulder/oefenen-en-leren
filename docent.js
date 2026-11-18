const app = document.getElementById('app');
const $ = s => app.querySelector(s);
let pw = null;
try { pw = sessionStorage.getItem('woii_docent'); } catch (e) {}

function render(html) { app.innerHTML = html; window.scrollTo(0, 0); }
function header(extra) {
  return `<header class="top"><div class="brand">Docentenpagina</div><div class="sub">Oefenen en leren: Tweede Wereldoorlog en Kamer en Kabinet</div></header>${extra || ''}`;
}
function openReveal(id) {
  window.open('/reveal?klas=' + encodeURIComponent(id), '_blank');
}
function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
const VAK = { woii: 'Tweede Wereldoorlog', politiek: 'Kamer en Kabinet' };
const RONDE_NAMEN = ['Ronde 1: Stelsel en Tweede Kamer', 'Ronde 2: Verkiezingen en Eerste Kamer', 'Ronde 3: Kabinet en wet', 'Finale'];
function fmtTijd(ms) { return (Math.round((ms || 0) / 100) / 10).toString().replace('.', ',') + ' s'; }

/* ---------- Excel-download ---------- */
const STATUS_X = { actief: 'Actief', nog_niet_gestart: 'Nog niet gestart', pincode_gereset: 'Pincode gereset' };
function klasSheet(r) {
  const k = r.klas, pol = k.vak === 'politiek', vpr = k.vragen_per_ronde || {};
  const kop = ['Naam student', 'Dier', 'Code', 'Status', 'Score', 'Tijd (s)', pol ? 'Voortgang ronde 1 | 2 | 3 | finale' : 'Hoofdstuk'];
  const rows = [kop].concat(r.spelers.slice().sort((a, b) => a.dier.localeCompare(b.dier, 'nl')).map(p => [
    '', p.dier, p.code, STATUS_X[p.status] || p.status, p.score, Math.round((p.tijd_ms || 0) / 100) / 10,
    pol ? [1, 2, 3, 4].map(n => { const t = vpr[String(n)] || 0; return t ? ((p.voortgang && p.voortgang[String(n)]) || 0) + '/' + t : '-'; }).join(' | ')
        : (p.status === 'actief' ? (p.hoofdstuk > 5 ? 'klaar' : (p.hoofdstuk === 5 ? 'finale' : 'hoofdstuk ' + p.hoofdstuk)) : '')
  ]));
  return { name: k.naam + ' - ' + (k.vak === 'politiek' ? 'Politiek' : 'Geschiedenis'), rows, widths: [26, 14, 16, 18, 8, 9, 32] };
}
function saveBlob(blob, naam) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = naam;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function bestandsnaam(deel) { return 'oefenenenleren_' + String(deel).replace(/[^A-Za-z0-9_-]+/g, '_') + '_' + today() + '.xlsx'; }
async function downloadKlas(id) {
  const r = await rpc('teacher_overview', { p_password: pw, p_class_id: id });
  if (r.error) { alert(errText(r.error)); return; }
  saveBlob(XLSX_MIN.build([klasSheet(r)]), bestandsnaam(r.klas.naam + '_' + (r.klas.vak === 'politiek' ? 'politiek' : 'geschiedenis')));
}
async function downloadAlle(klassen) {
  const sheets = [];
  for (const k of klassen) {
    const r = await rpc('teacher_overview', { p_password: pw, p_class_id: k.id });
    if (r.error) { alert(errText(r.error)); return; }
    sheets.push(klasSheet(r));
  }
  if (!sheets.length) return;
  saveBlob(XLSX_MIN.build(sheets), bestandsnaam('alle_klassen'));
}

const STATUS = { actief: 'Actief', nog_niet_gestart: 'Nog niet gestart', pincode_gereset: 'Pincode gereset' };

function logout() {
  pw = null;
  try { sessionStorage.removeItem('woii_docent'); } catch (e) {}
  viewLogin();
}

function viewLogin(msg) {
  render(header() + `<main class="card" style="max-width:420px">
    <h1>Inloggen</h1>
    <form id="f"><label for="pw">Wachtwoord</label>
    <input id="pw" type="password" autocomplete="current-password">
    <button class="btn" type="submit">Inloggen</button></form>
    <p class="msg" id="msg" role="alert">${esc(msg || '')}</p></main>`);
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const p = $('#pw').value;
    const b = $('.btn'); b.disabled = true;
    const r = await rpc('teacher_classes', { p_password: p });
    b.disabled = false;
    if (r.error) { $('#msg').textContent = errText(r.error); return; }
    pw = p;
    try { sessionStorage.setItem('woii_docent', pw); } catch (e2) {}
    viewClasses(r);
  };
  $('#pw').focus();
}

async function loadClasses() {
  const r = await rpc('teacher_classes', { p_password: pw });
  if (r.error) {
    if (r.error === 'verkeerd_wachtwoord') { logout(); return; }
    viewLogin(errText(r.error)); return;
  }
  viewClasses(r);
}

function viewClasses(r) {
  const t = today();
  const rows = r.klassen.map(k => `<tr>
    <td><b>${esc(k.naam)}</b></td><td><span class="pill ${k.vak === 'politiek' ? 'pol' : ''}">${esc(VAK[k.vak] || k.vak)}</span></td><td>${k.actief} van ${k.aantal} gestart</td>
    <td>${esc(fmtDay(k.eind_datum))}${k.afgelopen ? ' (afgelopen)' : ''}</td>
    <td><button class="btn small" data-open="${esc(k.id)}">Openen</button> <button class="btn small ghost" data-reveal="${esc(k.id)}">Onthul stand</button> <button class="btn small ghost" data-xl="${esc(k.id)}">Excel</button> <button class="btn small danger" data-del="${esc(k.id)}" data-naam="${esc(k.naam)}">Verwijderen</button></td></tr>`).join('');
  render(header() + `
    <div class="row" style="margin-bottom:12px"><div><button class="btn ghost small" id="out">Uitloggen</button></div>${r.klassen.length ? '<div><button class="btn small" id="xlall">Download alle klassen als Excel</button></div>' : ''}</div>
    <h2>Mijn klassen</h2>
    ${r.klassen.length ? `<div class="table-scroll"><table class="docent"><thead><tr><th>Klas</th><th>Vak</th><th>Studenten</th><th>Einddatum</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small-note">In het Excel-bestand staat een lege kolom Naam student. Vul die alleen op je eigen computer in. Het systeem slaat geen namen op.</p>` : '<p>Nog geen klassen. Maak hieronder je eerste klas aan.</p>'}
    <h2>Nieuwe klas</h2>
    <form class="card" id="nf">
      <div class="row">
        <div><label for="vk">Vak</label><select id="vk"><option value="politiek">Kamer en Kabinet</option><option value="woii">Tweede Wereldoorlog</option></select></div>
        <div><label for="nm">Klasnaam</label><input id="nm" maxlength="30" placeholder="bijvoorbeeld MR26"></div>
        <div><label for="sz">Aantal studenten</label><input id="sz" type="number" min="1" max="40" value="24"></div>
        <div><label for="ed">Einddatum competitie</label><input id="ed" type="date" min="${t}" max="${addDays(t, 45)}" value="${addDays(t, 45)}"></div>
      </div>
      <button class="btn" type="submit">Klas aanmaken</button>
      <p class="msg" id="msg" role="alert"></p>
      <p class="small-note">Je krijgt precies zoveel codes met een dier erbij als je studenten opgeeft. Het maximum is 40. Er staan geen namen in het systeem.</p>
    </form>
    <h2>Wachtwoord wijzigen</h2>
    <form class="card" id="pf"><label for="np">Nieuw wachtwoord (minimaal 8 tekens)</label><input id="np" type="password" autocomplete="new-password">
    <button class="btn ghost" type="submit">Wijzigen</button><p class="msg" id="pmsg" role="alert"></p></form>`);
  $('#out').onclick = logout;
  app.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openClass(b.dataset.open));
  app.querySelectorAll('[data-reveal]').forEach(b => b.onclick = () => openReveal(b.dataset.reveal));
  app.querySelectorAll('[data-xl]').forEach(b => b.onclick = () => downloadKlas(b.dataset.xl));
  if ($('#xlall')) $('#xlall').onclick = () => downloadAlle(r.klassen);
  app.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Klas ' + b.dataset.naam + ' met alle codes en scores definitief verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
    const res = await rpc('teacher_delete_class', { p_password: pw, p_class_id: b.dataset.del });
    if (res.error) { alert(errText(res.error)); return; }
    loadClasses();
  });
  $('#nf').onsubmit = async e => {
    e.preventDefault();
    const b = $('#nf .btn'); b.disabled = true;
    const res = await rpc('teacher_create_class', {
      p_password: pw, p_name: $('#nm').value, p_size: parseInt($('#sz').value, 10), p_end_date: $('#ed').value || null, p_vak: $('#vk').value
    });
    b.disabled = false;
    if (res.error) { $('#msg').textContent = errText(res.error); return; }
    viewCodes(res);
  };
  $('#pf').onsubmit = async e => {
    e.preventDefault();
    const res = await rpc('teacher_change_password', { p_password: pw, p_new: $('#np').value });
    if (res.error) { $('#pmsg').textContent = errText(res.error); return; }
    pw = $('#np').value;
    try { sessionStorage.setItem('woii_docent', pw); } catch (e2) {}
    $('#pmsg').innerHTML = '<span class="ok">Wachtwoord gewijzigd.</span>';
    $('#np').value = '';
  };
}

function viewCodes(res) {
  const rows = res.codes.map(c => `<tr><td>${emoji(c.dier)} ${esc(c.dier)}</td><td><code class="k">${esc(c.code)}</code></td></tr>`).join('');
  render(header() + `
    <h2>Klas ${esc(res.naam)} is aangemaakt</h2>
    ${res.vak === 'politiek' ? '<p class="banner">Alle rondes staan nog dicht. Zet ze open bij de klas, zodra je ze wilt gebruiken.</p>' : ''}
    <p>Deel elke code uit aan één student. Jij houdt zelf bij welke student bij welk dier hoort. De competitie eindigt op ${esc(fmtDay(res.eind_datum))}.</p>
    <div class="row"><div><button class="btn" id="copy">Kopieer alle codes</button></div>
    <div><button class="btn ghost" id="print">Print</button></div>
    <div><button class="btn ghost" id="open">Naar de klas</button></div></div>
    <p class="msg" id="cmsg"></p>
    <table class="docent" style="min-width:0;max-width:420px"><thead><tr><th>Dier</th><th>Code</th></tr></thead><tbody>${rows}</tbody></table>`);
  $('#copy').onclick = async () => {
    const text = res.codes.map(c => c.dier + '\t' + c.code).join('\n');
    try { await navigator.clipboard.writeText(text); $('#cmsg').innerHTML = '<span class="ok">Gekopieerd.</span>'; }
    catch (e) { $('#cmsg').textContent = 'Kopiëren lukt niet. Selecteer de tabel en kopieer met de hand.'; }
  };
  $('#print').onclick = () => window.print();
  $('#open').onclick = () => openClass(res.klas_id);
}

async function openClass(id, flash) {
  render(header() + '<p>Laden...</p>');
  const r = await rpc('teacher_overview', { p_password: pw, p_class_id: id });
  if (r.error) {
    if (r.error === 'verkeerd_wachtwoord') { logout(); return; }
    if (r.error === 'klas_niet_gevonden') { loadClasses(); return; }
    viewLogin(errText(r.error)); return;
  }
  const k = r.klas;
  const pol = k.vak === 'politiek';
  const vpr = k.vragen_per_ronde || {};
  const voortg = p => [1, 2, 3, 4].map(n => {
    const tot = vpr[String(n)] || 0;
    return tot ? ((p.voortgang && p.voortgang[String(n)]) || 0) + '/' + tot : '-';
  }).join(' · ');
  const rows = r.spelers.map(p => `<tr>
    <td>${emoji(p.dier)} <b>${esc(p.dier)}</b></td>
    <td><code class="k">${esc(p.code)}</code></td>
    <td><span class="pill ${esc(p.status)}">${esc(STATUS[p.status] || p.status)}</span></td>
    <td>${pol ? esc(voortg(p)) : (p.status === 'actief' ? (p.hoofdstuk > 5 ? 'klaar' : (p.hoofdstuk === 5 ? 'finale' : p.hoofdstuk)) : '')}</td>
    <td><b>${p.score}</b></td>
    <td>${p.status === 'actief' ? fmtTijd(p.tijd_ms) : ''}</td>
    <td>${p.laatst_gespeeld ? esc(fmtDate(p.laatst_gespeeld)) : ''}</td>
    <td>${p.vervalt_op && p.status === 'actief' ? esc(fmtDate(p.vervalt_op)) : ''}</td>
    <td>${p.reset_mogelijk ? `<button class="btn small ghost" data-reset="${esc(p.id)}" data-dier="${esc(p.dier)}">Reset pincode</button>` : ''}</td></tr>`).join('');
  const t = today();
  render(header() + `
    <div class="row" style="margin-bottom:6px">
      <div><button class="btn ghost small" id="back">Alle klassen</button></div>
      <div><button class="btn ghost small" id="refresh">Vernieuwen</button></div>
      <div><button class="btn small" id="reveal">Onthul de tussenstand</button></div>
      <div><button class="btn small ghost" id="xl">Download Excel met codes</button></div>
      <div><button class="btn small ghost" id="board">${k.bord_zichtbaar ? 'Verberg de ranglijst voor studenten' : 'Toon de ranglijst aan studenten'}</button></div>
    </div>
    <p class="small-note">Studenten zien nu ${k.bord_zichtbaar ? 'de ranglijst en hun plek' : 'alleen hun eigen punten'}. Na afloop van Onthul stand wordt de ranglijst zichtbaar. Bij gelijke punten telt de totale tijd van goede antwoorden.</p>
    <h2>Klas ${esc(k.naam)} <span class="pill ${pol ? 'pol' : ''}">${esc(VAK[k.vak] || k.vak)}</span></h2>
    ${pol ? `<h2>Rondes openzetten</h2>
    <form class="card" id="rf"><p>Zet een ronde open als je wilt dat studenten hem kunnen spelen. Een ronde die je sluit blijft bewaard met alle punten.</p>
    <div class="stage-box">${RONDE_NAMEN.map((nm, i) => {
      const n = i + 1, tot = vpr[String(n)] || 0;
      return `<label><input type="checkbox" name="st" value="${n}" ${(k.open_stages || []).includes(n) ? 'checked' : ''}> ${esc(nm)} ${tot ? '(' + tot + ' vragen)' : '(nog geen vragen)'}</label>`;
    }).join('')}</div>
    <button class="btn" type="submit">Opslaan</button> <button class="btn ghost" type="button" id="allopen">Alles open</button>
    <p class="msg" id="rmsg" role="alert"></p></form>` : ''}
    <p>Einddatum: <b>${esc(fmtDay(k.eind_datum))}</b>${k.afgelopen ? ' (afgelopen)' : ''}. De klas wordt automatisch gewist op ${esc(fmtDate(k.wordt_gewist_op))}.</p>
    <div class="table-scroll"><table class="docent"><thead><tr><th>Dier</th><th>Code</th><th>Status</th><th>${pol ? 'Ronde 1 · 2 · 3 · finale' : 'Hoofdstuk'}</th><th>Score</th><th>Tijd</th><th>Laatst gespeeld</th><th>Score vervalt</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small-note">Reset van een pincode kan alleen binnen zeven dagen na het laatste spel. Daarna vervalt de score en komt het dier weer vrij voor een nieuwe start.</p>
    <p class="msg" id="msg" role="alert"></p>
    <h2>Einddatum wijzigen</h2>
    <form class="card" id="ef"><div class="row"><div><label for="ed">Nieuwe einddatum</label><input id="ed" type="date" max="${addDays(t, 45)}" value="${esc(k.eind_datum)}"></div></div>
    <button class="btn ghost" type="submit">Opslaan</button></form>
    <h2>Klas resetten</h2>
    <p class="small-note">Wist alle scores en alle voortgang van deze klas. De codes en pincodes blijven bestaan, dus studenten loggen gewoon weer in en beginnen opnieuw.</p>
    <button class="btn ghost" id="resetclass">Reset scores en voortgang</button>
    <h2>Klas verwijderen</h2>
    <button class="btn danger" id="del">Verwijder deze klas en alle scores</button>`);
  $('#back').onclick = loadClasses;
  if (pol) {
    const saveStages = async stages => {
      const res = await rpc('teacher_set_open_stages', { p_password: pw, p_class_id: id, p_stages: stages });
      if (res.error) { $('#rmsg').textContent = errText(res.error); return; }
      openClass(id);
    };
    $('#rf').onsubmit = e => {
      e.preventDefault();
      saveStages(Array.from(app.querySelectorAll('input[name=st]:checked')).map(x => parseInt(x.value, 10)));
    };
    $('#allopen').onclick = () => saveStages([1, 2, 3, 4]);
  }
  $('#refresh').onclick = () => openClass(id);
  $('#reveal').onclick = () => openReveal(id);
  $('#xl').onclick = () => downloadKlas(id);
  $('#board').onclick = async () => {
    const res = await rpc('teacher_set_board', { p_password: pw, p_class_id: id, p_visible: !k.bord_zichtbaar });
    if (res.error) { $('#msg').textContent = errText(res.error); return; }
    openClass(id);
  };
  app.querySelectorAll('[data-reset]').forEach(b => b.onclick = async () => {
    if (!confirm('Pincode van de ' + b.dataset.dier + ' resetten? De score blijft staan. De student maakt een nieuwe pincode met dezelfde code.')) return;
    const res = await rpc('teacher_reset_pin', { p_password: pw, p_player_id: b.dataset.reset });
    if (res.error) { $('#msg').textContent = errText(res.error); return; }
    openClass(id);
  });
  $('#ef').onsubmit = async e => {
    e.preventDefault();
    const res = await rpc('teacher_set_end_date', { p_password: pw, p_class_id: id, p_end_date: $('#ed').value || null });
    if (res.error) { $('#msg').textContent = errText(res.error); return; }
    openClass(id);
  };
  if (flash) $('#msg').innerHTML = '<span class="ok">' + esc(flash) + '</span>';
  $('#resetclass').onclick = async () => {
    if (!confirm('Alle scores en voortgang van klas ' + k.naam + ' wissen? Dit kan niet ongedaan worden gemaakt. Codes en pincodes blijven bestaan.')) return;
    const close = pol ? confirm('Ook alle rondes weer sluiten?\n\nOK = ja, sluit alle rondes.\nAnnuleren = nee, laat de rondes open staan.') : false;
    const res = await rpc('teacher_reset_class', { p_password: pw, p_class_id: id, p_close_stages: close });
    if (res.error) { $('#msg').textContent = errText(res.error); return; }
    openClass(id, 'De klas is gereset. ' + res.spelers + ' studenten beginnen opnieuw met 0 punten.');
  };
  $('#del').onclick = async () => {
    if (!confirm('Klas ' + k.naam + ' en alle scores definitief verwijderen?')) return;
    const res = await rpc('teacher_delete_class', { p_password: pw, p_class_id: id });
    if (res.error) { $('#msg').textContent = errText(res.error); return; }
    loadClasses();
  };
}

if (pw) loadClasses(); else viewLogin();
