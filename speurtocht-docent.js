/* Resultaten van de Speurtocht Gemeente, anoniem. Alleen met het docentwachtwoord. */
const app = document.getElementById('app');
const NAMEN = ['Wie beslist waarover?', 'Waarom worden gemeenten groter?', 'Wat regelt de gemeente?', 'Waar komt het geld vandaan?', 'Wie bestuurt de gemeente?'];
const BNAMEN = ['Vergelijk met een buurgemeente', 'Kijk in de gemeenteraad', 'Schrijf het nieuws'];
const CODE = ['L', 'O', 'K', 'E', 'T'];
const VELD = {
  1: 'Gemeente en aantal inwoners', 2: 'Herindeling van mijn gemeente', 3: 'Drie taken van mijn gemeente',
  4: 'Begroting: een uitgave', 5: 'Burgemeester en verrassend feit', b1: 'Bonus 1: buurgemeente', b2: 'Bonus 2: gemeenteraad', b3: 'Bonus 3: nieuws'
};
let pw = null, timer = null, simRuns = [];
const OPTN = { portiers: 'Portiers', geluid: 'Geluidsbegrenzer', proef: 'Proefjaar', boa: 'Extra boa', bus: 'Nachtbus', meld: 'Meldpunt' };
const STAPN = { intro: 'Uitleg', s1: 'Plein', s2: 'Partijen', s3: 'Voorstel', s4: 'Debat', s5: 'Stemming', s6: 'Nieuws' };
try { pw = sessionStorage.getItem('speurtocht_docent'); } catch (e) { /* geen opslag */ }

function head() { return '<header class="top"><div class="brand">Resultaten Gemeente</div><div class="sub">Anoniem · alleen voor de docent</div></header>'; }
function render(h) { app.innerHTML = head() + h; }
function fmtMin(s) { if (s == null) return '-'; const m = Math.floor(s / 60); return m + ' min ' + String(s % 60).padStart(2, '0') + ' s'; }
function gem(a) { return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null; }

function login(msg) {
  clearInterval(timer);
  render(`<main class="card" style="max-width:420px"><h1>Inloggen</h1>
    <form id="f"><label for="pw">Wachtwoord</label><input id="pw" type="password" autocomplete="current-password">
    <button class="btn" type="submit">Inloggen</button></form><p class="msg" id="msg" role="alert">${esc(msg || '')}</p></main>`);
  document.getElementById('f').onsubmit = async e => {
    e.preventDefault();
    pw = document.getElementById('pw').value;
    await laad(true);
  };
  document.getElementById('pw').focus();
}

async function laad(eerste) {
  const r = await rpc('speurtocht_overview', { p_password: pw });
  if (r.error) {
    if (eerste || r.error === 'verkeerd_wachtwoord') { pw = null; try { sessionStorage.removeItem('speurtocht_docent'); } catch (e) { /* */ } login(errText(r.error)); return; }
    return;
  }
  try { sessionStorage.setItem('speurtocht_docent', pw); } catch (e) { /* */ }
  const sr = await rpc('simulator_overview', { p_password: pw });
  simRuns = sr && sr.runs ? sr.runs : [];
  toon(r.runs || []);
  if (!timer) timer = setInterval(() => laad(false), 20000);
}

function toon(runs) {
  const open = new Set(Array.from(app.querySelectorAll('details[data-nr][open]')).map(d => d.dataset.nr));
  const y = window.scrollY;
  const klaarAantal = r => [1, 2, 3, 4, 5].filter(n => r.state.klaar && r.state.klaar[n]).length;
  const bonusAantal = r => ['b1', 'b2', 'b3'].filter(k => r.state.btijd && r.state.btijd[k]).length;
  const code = runs.filter(r => klaarAantal(r) === 5).length;
  const bonus = runs.filter(r => bonusAantal(r) >= 1).length;
  const totTijd = gem(runs.filter(r => klaarAantal(r) === 5).map(r => Math.max.apply(null, [1, 2, 3, 4, 5].map(n => r.state.tijd[n] || 0))));

  const perStation = [1, 2, 3, 4, 5].map(n => {
    const klaar = runs.filter(r => r.state.klaar && r.state.klaar[n]);
    const fouten = runs.reduce((t, r) => t + ((r.state.fout && r.state.fout[n]) || 0), 0);
    const bezig = runs.filter(r => r.state.notes && r.state.notes[n]).length;
    return `<tr><td>${n}</td><td>${esc(NAMEN[n - 1])}</td><td>${klaar.length} van ${runs.length}</td><td>${fouten}</td><td>${bezig}</td><td>${fmtMin(gem(klaar.map(r => r.state.tijd[n]).filter(x => x != null)))}</td></tr>`;
  }).join('');

  const perBonus = ['b1', 'b2', 'b3'].map((k, i) => `<tr><td>${i + 1}</td><td>${esc(BNAMEN[i])}</td><td>${runs.filter(r => r.state.btijd && r.state.btijd[k]).length} van ${runs.length}</td></tr>`).join('');

  const rijen = runs.slice().reverse().map(r => {
    const st = r.state;
    const letters = [1, 2, 3, 4, 5].map(n => `<span class="st-slot${st.klaar && st.klaar[n] ? ' vol' : ''}" style="display:inline-grid;width:28px;height:28px;font-size:15px;margin-right:3px">${st.klaar && st.klaar[n] ? CODE[n - 1] : '?'}</span>`).join('');
    const velden = Object.keys(st.notes || {}).sort().map(k => `<p><b>${esc(VELD[k] || k)}</b><br>${esc(st.notes[k])}</p>`).join('') || '<p>Nog niets ingevuld.</p>';
    const foutTot = Object.keys(st.fout || {}).reduce((t, k) => t + (st.fout[k] || 0), 0);
    return `<tr><td>Speurder ${r.nr}</td><td>${letters}</td><td>${bonusAantal(r)} van 3</td><td>${foutTot}</td><td>${esc(fmtDate(r.laatst))}</td>
      <td><details data-nr="${r.nr}" ${open.has(String(r.nr)) ? 'open' : ''}><summary>Bekijk</summary>${velden}</details></td></tr>`;
  }).join('');


  const sk = simRuns.filter(x => x.state.klaar);
  const sAan = sk.filter(x => x.state.aangenomen).length;
  const sPdf = simRuns.filter(x => x.state.pdf).length;
  const sSch = simRuns.filter(x => x.state.schorsing && typeof x.state.schorsing === 'object');
  const sToe = sSch.filter(x => x.state.schorsing.keuze === 'toegezegd');
  const sCo = sk.filter(x => x.state.coalTegen);
  const optTel = Object.keys(OPTN).map(k => `<tr><td>${esc(OPTN[k])}</td><td>${sk.filter(x => (x.state.opt || []).indexOf(k) >= 0).length} van ${sk.length}</td></tr>`).join('');
  const simRijen = simRuns.slice().reverse().map(x => {
    const t = x.state;
    const uit = t.klaar ? (t.aangenomen ? 'Aangenomen ' : 'Verworpen ') + t.voor + '-' + t.tegen : 'Nog bezig';
    const voorstel = t.ext ? (t.ext + '.00 uur, ' + (t.dagen === 'vrza' ? 'vr en za' : 'za') + ((t.opt || []).length ? ', ' + t.opt.map(k => OPTN[k] || k).join(', ') : '')) : '-';
    const sc = t.schorsing && typeof t.schorsing === 'object'
      ? 'Partij ' + t.schorsing.p + ': ' + (t.schorsing.keuze === 'toegezegd' ? 'zei toe: ' + (t.schorsing.tekst || '').replace(/^Ik /, '').toLowerCase() : t.schorsing.keuze === 'geen' ? 'geen toezegging' : 'nog in overleg')
      : '-';
    const co = t.klaar ? (t.coalTegen ? 'Ja, Partij ' + t.coalTegen.split('').join(' en ') : 'Nee') : '-';
    return `<tr><td>Wethouder ${x.nr}</td><td>${esc(STAPN[t.scherm] || t.scherm || '-')}</td><td>${esc(voorstel)}</td><td>${esc(sc)}</td><td>${esc(co)}</td><td>${esc(uit)}</td><td>${t.pdf ? 'Ja' : 'Nee'}</td><td>${esc(fmtDate(x.laatst))}</td></tr>`;
  }).join('');
  const simHtml = `<section class="card"><h2>Simulator Gemeenteraad</h2>
      <p>${simRuns.length} wethouders gestart. ${sk.length} stemden over hun voorstel (${sAan} aangenomen, ${sk.length - sAan} verworpen). ${sPdf} downloadden de pdf met het nieuwsbericht.</p>
      <p>${sSch.length} kregen een schorsing (een partij trok haar steun in). ${sToe.length} zegden iets toe. ${sCo.length} zagen een coalitiepartij tegenstemmen: spanning in het college.</p>
      <p class="small-note">Anoniem. De pdf zelf krijg je per mail. Hier zie je alleen de keuzes en de uitkomst.</p>
      <div style="overflow-x:auto"><table class="gtab"><thead><tr><th>Voorwaarde</th><th>Gekozen door</th></tr></thead><tbody>${optTel}</tbody></table></div>
      <div style="overflow-x:auto"><table class="gtab"><thead><tr><th>Wie</th><th>Bij stap</th><th>Voorstel</th><th>Schorsing</th><th>Coalitie tegen</th><th>Uitkomst</th><th>Pdf</th><th>Laatst actief</th></tr></thead><tbody>${simRijen || '<tr><td colspan="8">Nog geen wethouders.</td></tr>'}</tbody></table></div>
      <div class="st-acties"><button class="btn ghost small" id="wissim" type="button">Wis simulatorresultaten</button></div></section>`;

  render(`<main>
    <section class="card"><h1>Overzicht</h1>
      <p>${runs.length} speurders gestart. ${code} hebben de code gekraakt. ${bonus} deden minstens één bonusmissie.</p>
      <p>Gemiddelde tijd tot de code: ${fmtMin(totTijd)}. Deze pagina ververst zichzelf elke 20 seconden.</p>
      <p class="small-note">Studenten zijn anoniem. Speurder 1, 2, 3 zijn alleen volgnummers. Een student die op een ander toestel opnieuw begint, telt als nieuwe speurder.</p>
      <div class="st-acties"><button class="btn small" id="ververs" type="button">Ververs nu</button>
        <button class="btn ghost small" id="wis" type="button">Wis alle resultaten</button>
        <button class="btn ghost small" id="uit" type="button">Uitloggen</button></div></section>
    <section class="card"><h2>Per station</h2>
      <div style="overflow-x:auto"><table class="gtab"><thead><tr><th>Nr</th><th>Station</th><th>Goed</th><th>Foute pogingen</th><th>Notitie gemaakt</th><th>Gemiddeld goed na (sinds start)</th></tr></thead><tbody>${perStation}</tbody></table></div>
      <h2>Bonusronde</h2>
      <div style="overflow-x:auto"><table class="gtab"><thead><tr><th>Nr</th><th>Missie</th><th>Gedaan</th></tr></thead><tbody>${perBonus}</tbody></table></div></section>
    ${simHtml}
    <section class="card"><h2>Per speurder</h2>
      <div style="overflow-x:auto"><table class="gtab"><thead><tr><th>Wie</th><th>Sleutels</th><th>Bonus</th><th>Foute pogingen</th><th>Laatst actief</th><th>Notities</th></tr></thead><tbody>${rijen || '<tr><td colspan="6">Nog geen speurders.</td></tr>'}</tbody></table></div></section>
  </main>`);
  window.scrollTo(0, y);
  document.getElementById('ververs').onclick = () => laad(false);
  document.getElementById('uit').onclick = () => { pw = null; try { sessionStorage.removeItem('speurtocht_docent'); } catch (e) { /* */ } login(); };
  document.getElementById('wissim').onclick = async () => {
    if (!confirm('Alle simulatorresultaten wissen? Dit kan niet ongedaan worden.')) return;
    const r = await rpc('simulator_wis', { p_password: pw });
    if (r.error) { alert(errText(r.error)); return; }
    laad(false);
  };
  document.getElementById('wis').onclick = async () => {
    if (!confirm('Alle resultaten van de speurtocht wissen? Dit kan niet ongedaan worden.')) return;
    const r = await rpc('speurtocht_wis', { p_password: pw });
    if (r.error) { alert(errText(r.error)); return; }
    laad(false);
  };
}

if (pw) laad(true); else login();
