/* Resultaten van de Speurtocht Gemeente, anoniem. Alleen met het docentwachtwoord. */
const app = document.getElementById('app');
const NAMEN = ['Wie beslist waarover?', 'Waarom worden gemeenten groter?', 'Wat regelt de gemeente?', 'Waar komt het geld vandaan?', 'Wie bestuurt de gemeente?'];
const BNAMEN = ['Vergelijk met een buurgemeente', 'Kijk in de gemeenteraad', 'Schrijf het nieuws'];
const CODE = ['L', 'O', 'K', 'E', 'T'];
const VELD = {
  1: 'Gemeente en aantal inwoners', 2: 'Herindeling van mijn gemeente', 3: 'Drie taken van mijn gemeente',
  4: 'Begroting: een uitgave', 5: 'Burgemeester en verrassend feit', b1: 'Bonus 1: buurgemeente', b2: 'Bonus 2: gemeenteraad', b3: 'Bonus 3: nieuws'
};
let pw = null, timer = null;
try { pw = sessionStorage.getItem('speurtocht_docent'); } catch (e) { /* geen opslag */ }

function head() { return '<header class="top"><div class="brand">Resultaten Speurtocht Gemeente</div><div class="sub">Anoniem · alleen voor de docent</div></header>'; }
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
    <section class="card"><h2>Per speurder</h2>
      <div style="overflow-x:auto"><table class="gtab"><thead><tr><th>Wie</th><th>Sleutels</th><th>Bonus</th><th>Foute pogingen</th><th>Laatst actief</th><th>Notities</th></tr></thead><tbody>${rijen || '<tr><td colspan="6">Nog geen speurders.</td></tr>'}</tbody></table></div></section>
  </main>`);
  window.scrollTo(0, y);
  document.getElementById('ververs').onclick = () => laad(false);
  document.getElementById('uit').onclick = () => { pw = null; try { sessionStorage.removeItem('speurtocht_docent'); } catch (e) { /* */ } login(); };
  document.getElementById('wis').onclick = async () => {
    if (!confirm('Alle resultaten van de speurtocht wissen? Dit kan niet ongedaan worden.')) return;
    const r = await rpc('speurtocht_wis', { p_password: pw });
    if (r.error) { alert(errText(r.error)); return; }
    laad(false);
  };
}

if (pw) laad(true); else login();
