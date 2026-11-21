/* Simulator Gemeenteraad, oefenzaak Noordstad. Alles blijft in deze browser. Er gaat niets naar een server. */
(function () {
  const D = window.SIM;
  const app = document.getElementById('app');
  const KEY = 'simulator_noordstad_v1';
  const BRON = 'Bron: Raadsbesluit Gemeente Noordstad (oefenzaak sluitingstijden)';
  const eur = n => '€ ' + Number(n).toLocaleString('nl-NL');
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function leeg() {
    return {
      scherm: 'intro',
      gesprekken: [],
      voorstel: { ext: null, dagen: null, opt: { portiers: false, geluid: false, proef: false, boa: false, bus: false, meld: false } },
      fracties: [],
      debat: {},
      stemKlaar: false,
      run: '',
      pogingen: 0,
      pdf: false,
      nieuws: { naam: '', kop: '', intro: '', kern: '', bron: BRON }
    };
  }
  let S = leeg();
  try {
    const opgeslagen = JSON.parse(store.get(KEY) || 'null');
    if (opgeslagen && typeof opgeslagen === 'object') {
      S = Object.assign(leeg(), opgeslagen);
      S.voorstel = Object.assign(leeg().voorstel, opgeslagen.voorstel || {});
      S.voorstel.opt = Object.assign(leeg().voorstel.opt, (opgeslagen.voorstel || {}).opt || {});
      S.nieuws = Object.assign(leeg().nieuws, opgeslagen.nieuws || {});
    }
  } catch (e) { /* leeg beginnen */ }
  function bewaar() { try { store.set(KEY, JSON.stringify(S)); } catch (e) { /* niets */ } }

  /* Anoniem resultaat voor de docent: geen naam, geen tekst, alleen keuzes en uitkomst. */
  function nieuwId() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* */ }
    const h = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    return h() + h() + '-' + h() + '-4' + h().slice(1) + '-a' + h().slice(1) + '-' + h() + h() + h();
  }
  let meldTimer = null;
  function meld() {
    clearTimeout(meldTimer);
    meldTimer = setTimeout(() => {
      if (!S.run) { S.run = nieuwId(); bewaar(); }
      const u = S.stemKlaar ? uitslag() : null;
      const v = S.voorstel;
      const opt = Object.keys(v.opt).filter(k => v.opt[k]);
      rpc('simulator_save', { p_run: S.run, p_state: {
        scherm: S.scherm, gesprekken: S.gesprekken.length, fracties: S.fracties.length,
        ext: v.ext, dagen: v.dagen, opt: opt, kosten: D.kosten(v),
        klaar: !!S.stemKlaar, aangenomen: u ? u.aangenomen : null, voor: u ? u.voor : null, tegen: u ? u.tegen : null,
        pogingen: S.pogingen || 0, pdf: !!S.pdf
      } });
    }, 400);
  }

  let reveal = 0;          // tijdens de stemming: hoeveel fracties hun stem hebben laten zien
  let animeert = false;
  let toonBegrippen = false;
  let wisVraag = false;

  const volgorde = D.STAPPEN.map(s => s.id);
  const stapNr = () => volgorde.indexOf(S.scherm); // -1 bij intro
  const wordtGeteld = t => (String(t).trim().match(/\S+/g) || []).length;

  /* ---------- Rekenen ---------- */
  function voorstelKlaar() { return S.voorstel.ext && S.voorstel.dagen; }
  function wensenVan(p) {
    return p.wensen.map(w => ({ t: w.t, w: w.w, f: w.f(S.voorstel) }));
  }
  function basisSteun(p) { return Math.round(p.wensen.reduce((a, w) => a + w.f(S.voorstel) * w.w, 0)); }
  function debatVan(p) {
    let d = 0;
    D.DEBAT.forEach(q => {
      if (q.partij === p.id && S.debat[q.id]) d += q.ant[S.debat[q.id]](S.voorstel).d;
    });
    return d;
  }
  function steunVan(p) { return clamp(basisSteun(p) + debatVan(p), 0, 100); }
  function uitslag() {
    const rij = D.PARTIJEN.map(p => { const st = steunVan(p); return { p, basis: basisSteun(p), d: debatVan(p), st, voor: st >= 50 }; });
    const voor = rij.reduce((a, r) => a + (r.voor ? r.p.zetels : 0), 0);
    return { rij, voor, tegen: 21 - voor, aangenomen: voor >= 11 };
  }
  const gesproken = p => S.fracties.indexOf(p.id) >= 0;
  const stapNaDebat = () => stapNr() >= 3;
  function zichtbaar(p) { return stapNr() >= 2 && gesproken(p); }

  /* ---------- Tekeningen ---------- */
  function zetelsSvg(w, h, modusVan) {
    // 21 zetels in 3 rijen. Van links naar rechts verdeeld over A, B, C en D.
    const rijen = [{ r: 0.46, n: 5 }, { r: 0.70, n: 7 }, { r: 0.94, n: 9 }];
    const cx = w / 2, cy = h - 14, R = Math.min(w / 2 - 14, h - 28);
    const stoelen = [];
    rijen.forEach(rij => {
      for (let i = 0; i < rij.n; i++) {
        const hoek = Math.PI - (Math.PI * (i + 0.5)) / rij.n;
        stoelen.push({ x: cx + Math.cos(hoek) * R * rij.r, y: cy - Math.sin(hoek) * R * rij.r, hoek });
      }
    });
    stoelen.sort((a, b) => b.hoek - a.hoek);
    let idx = 0;
    const delen = [];
    D.PARTIJEN.forEach(p => {
      const m = modusVan(p);
      for (let i = 0; i < p.zetels; i++) {
        const s = stoelen[idx++];
        let vul = '#eceaf2', rand = '#b9b3c6', tekstKleur = '#8a8398', letter = '?';
        if (m === 'voor') { vul = p.kleur; rand = p.kleur; tekstKleur = '#fff'; letter = p.id; }
        else if (m === 'tegen') { vul = '#fff'; rand = p.kleur; tekstKleur = p.kleur; letter = p.id; }
        delen.push(`<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="11" fill="${vul}" stroke="${rand}" stroke-width="${m === 'tegen' ? 2.5 : 1.5}"/>` +
          `<text x="${s.x.toFixed(1)}" y="${(s.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="${tekstKleur}">${m === 'tegen' ? '✕' : letter}</text>`);
      }
    });
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Zaalplattegrond met 21 zetels" class="zetels">${delen.join('')}<rect x="${cx - 38}" y="${cy - 8}" width="76" height="20" rx="4" fill="#14305f"/><text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">VOORZITTER</text></svg>`;
  }
  function modusRechts(p) {
    if (S.scherm === 's5' && (reveal > 0 || S.stemKlaar)) {
      const i = D.PARTIJEN.indexOf(p);
      if (S.stemKlaar || i < reveal) return steunVan(p) >= 50 ? 'voor' : 'tegen';
      return 'onbekend';
    }
    if (S.scherm === 's6') return steunVan(p) >= 50 ? 'voor' : 'tegen';
    if (zichtbaar(p) && S.scherm !== 's5') return steunVan(p) >= 50 ? 'voor' : 'tegen';
    return 'onbekend';
  }

  function scene(id) {
    const klok = (x, y, uur) => {
      const h = uur[0], m = uur[1];
      const ha = ((h % 12) + m / 60) * 30 - 90, ma = m * 6 - 90;
      const pt = (a, l) => `${(x + Math.cos(a * Math.PI / 180) * l).toFixed(1)},${(y + Math.sin(a * Math.PI / 180) * l).toFixed(1)}`;
      return `<circle cx="${x}" cy="${y}" r="20" fill="#fff" stroke="#14305f" stroke-width="3"/><polyline points="${x},${y} ${pt(ha, 11)}" stroke="#14305f" stroke-width="3" stroke-linecap="round" fill="none"/><polyline points="${x},${y} ${pt(ma, 16)}" stroke="#14305f" stroke-width="2" stroke-linecap="round" fill="none"/>`;
    };
    const mens = (x, y, kleur) => `<circle cx="${x}" cy="${y - 16}" r="6" fill="${kleur}"/><rect x="${x - 6}" y="${y - 9}" width="12" height="20" rx="5" fill="${kleur}"/>`;
    if (id === 's1') {
      return `<svg viewBox="0 0 720 190" class="scene" role="img" aria-label="Het Marktplein 's nachts om kwart voor twee, met cafés en groepen mensen"><rect width="720" height="190" fill="#0f1b3a"/><rect y="150" width="720" height="40" fill="#2c3a5e"/>
      <rect x="40" y="40" width="170" height="110" fill="#1b2a52"/>${[0, 1, 2].map(i => [0, 1].map(j => `<rect x="${58 + i * 50}" y="${58 + j * 44}" width="30" height="30" fill="${(i + j) % 2 ? '#e9d48a' : '#34436b'}"/>`).join('')).join('')}
      <rect x="470" y="50" width="210" height="100" fill="#1b2a52"/><rect x="490" y="64" width="170" height="26" rx="5" fill="#0f1b3a" stroke="#ff00e7" stroke-width="2"/><text x="575" y="82" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">CAFÉ DE KROON</text>
      <rect x="490" y="104" width="52" height="46" fill="#d9942f"/><rect x="608" y="104" width="52" height="46" fill="#d9942f"/><rect x="556" y="112" width="30" height="38" fill="#0f1b3a"/>
      <line x1="300" y1="60" x2="300" y2="150" stroke="#8d97b5" stroke-width="3"/><circle cx="300" cy="58" r="8" fill="#f6e08a"/><polygon points="300,66 262,150 338,150" fill="#f6e08a" opacity=".16"/>
      <line x1="400" y1="60" x2="400" y2="150" stroke="#8d97b5" stroke-width="3"/><circle cx="400" cy="58" r="8" fill="#f6e08a"/><polygon points="400,66 362,150 438,150" fill="#f6e08a" opacity=".16"/>
      ${mens(240, 160, '#ff7ad9')}${mens(262, 164, '#8fd0ff')}${mens(430, 160, '#ffd37a')}${mens(452, 164, '#b7f0b0')}${mens(350, 168, '#ff7ad9')}
      ${klok(110, 24, [1, 45])}</svg>`;
    }
    if (id === 's2') {
      return `<svg viewBox="0 0 720 190" class="scene" role="img" aria-label="De collegekamer met een vergadertafel en papieren"><rect width="720" height="190" fill="#e8eef9"/><rect y="150" width="720" height="40" fill="#c9d5ee"/>
      <rect x="40" y="26" width="150" height="90" fill="#bcd3f5" stroke="#14305f" stroke-width="4"/><line x1="115" y1="26" x2="115" y2="116" stroke="#14305f" stroke-width="3"/>
      <ellipse cx="380" cy="125" rx="200" ry="34" fill="#14305f"/><ellipse cx="380" cy="118" rx="200" ry="30" fill="#2a4f94"/>
      ${[200, 290, 380, 470, 560].map((x, i) => `<circle cx="${x}" cy="${70 + (i % 2) * 6}" r="11" fill="${['#ff7ad9', '#ffd37a', '#8fd0ff', '#b7f0b0', '#ff7ad9'][i]}"/><rect x="${x - 11}" y="${82 + (i % 2) * 6}" width="22" height="26" rx="8" fill="${['#ff7ad9', '#ffd37a', '#8fd0ff', '#b7f0b0', '#ff7ad9'][i]}"/>`).join('')}
      <rect x="340" y="104" width="38" height="26" fill="#fff" transform="rotate(-6 340 104)"/><rect x="395" y="106" width="38" height="26" fill="#fff" transform="rotate(5 395 106)"/>
      ${klok(640, 50, [10, 0])}</svg>`;
    }
    if (id === 's3') {
      const dr = D.PARTIJEN.map((p, i) => `<rect x="${70 + i * 150}" y="40" width="110" height="120" rx="8" fill="${p.kleur}"/><rect x="${84 + i * 150}" y="54" width="82" height="106" rx="4" fill="#fff" opacity=".18"/><text x="${125 + i * 150}" y="112" text-anchor="middle" font-size="46" font-weight="700" fill="#fff">${p.id}</text><text x="${125 + i * 150}" y="140" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">${p.zetels} zetels</text>`).join('');
      return `<svg viewBox="0 0 720 190" class="scene" role="img" aria-label="Vier deuren van de fracties A, B, C en D"><rect width="720" height="190" fill="#eef1f8"/><rect y="160" width="720" height="30" fill="#d3daea"/>${dr}</svg>`;
    }
    if (id === 's4' || id === 's5') {
      const hoek = [];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 9 + r * 2; i++) { const n = 9 + r * 2; const a = Math.PI - (Math.PI * (i + 0.5)) / n; hoek.push(`<circle cx="${(360 + Math.cos(a) * (150 + r * 38)).toFixed(0)}" cy="${(172 - Math.sin(a) * (120 + r * 12)).toFixed(0)}" r="9" fill="${['#c2650a', '#7a3fb5', '#b3263c', '#1a7f4b'][Math.floor(i / n * 4)]}" opacity=".85"/>`); }
      return `<svg viewBox="0 0 720 190" class="scene" role="img" aria-label="De raadszaal met zetels in een halve cirkel"><rect width="720" height="190" fill="#14305f"/>${hoek.join('')}<rect x="318" y="150" width="84" height="30" rx="5" fill="#ff00e7"/><text x="360" y="170" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">SPREEKPLEK</text></svg>`;
    }
    return `<svg viewBox="0 0 720 190" class="scene" role="img" aria-label="Een krant met het nieuws over het raadsbesluit"><rect width="720" height="190" fill="#eef1f8"/><rect x="200" y="22" width="320" height="150" rx="6" fill="#fff" stroke="#14305f" stroke-width="3"/><rect x="222" y="40" width="276" height="18" fill="#14305f"/><rect x="222" y="70" width="130" height="10" fill="#9aa8c8"/><rect x="222" y="88" width="130" height="10" fill="#9aa8c8"/><rect x="222" y="106" width="130" height="10" fill="#9aa8c8"/><rect x="222" y="124" width="130" height="10" fill="#9aa8c8"/><rect x="368" y="70" width="130" height="64" fill="#ff00e7" opacity=".85"/><rect x="222" y="142" width="276" height="10" fill="#9aa8c8"/></svg>`;
  }

  /* ---------- Onderdelen ---------- */
  function bouwer(naStap) {
    const v = S.voorstel;
    const k = D.kosten(v);
    const over = Math.max(0, D.BUDGET - k);
    const knop = (act, val, tekst, aan, extra) => `<button type="button" class="sim-keuze${aan ? ' aan' : ''}" data-act="${act}" data-val="${val}" aria-pressed="${aan ? 'true' : 'false'}"${extra || ''}>${tekst}</button>`;
    return `<div class="sim-bouwer">
      <h3>1. Tot hoe laat mogen cafés open blijven?</h3>
      <p class="sim-uitleg">Nu sluiten cafés om 02.00 uur.</p>
      <div class="sim-rij">${knop('ext', 3, 'Tot 03.00 uur', v.ext === 3)}${knop('ext', 4, 'Tot 04.00 uur', v.ext === 4)}</div>
      <h3>2. Op welke dagen?</h3>
      <div class="sim-rij">${knop('dagen', 'za', 'Alleen zaterdag', v.dagen === 'za')}${knop('dagen', 'vrza', 'Vrijdag en zaterdag', v.dagen === 'vrza')}</div>
      <h3>3. Welke afspraken neem je mee?</h3>
      <p class="sim-uitleg">Je hebt <b>${eur(D.BUDGET)}</b> in het budget. Nu besteed: <b>${eur(k)}</b>. Nog over: <b class="${over < 0 ? 'rood' : ''}">${eur(over)}</b>.</p>
      <div class="sim-budget" aria-hidden="true"><i style="width:${clamp(k / D.BUDGET * 100, 0, 100)}%"></i></div>
      <div class="sim-opties">${D.VOORWAARDEN.map(o => {
        const aan = !!v.opt[o.id];
        const teDuur = !aan && o.kosten > over;
        return `<button type="button" class="sim-optie${aan ? ' aan' : ''}" data-act="opt" data-val="${o.id}" role="checkbox" aria-checked="${aan ? 'true' : 'false'}"${teDuur ? ' disabled' : ''}>
          <span class="vink" aria-hidden="true">${aan ? '✓' : ''}</span>
          <span class="tekst"><b>${o.titel}</b><small>${o.info}</small></span>
          <span class="prijs">${o.kosten ? eur(o.kosten) : 'gratis'}</span>
          ${teDuur ? '<em class="vol">Past niet in je budget</em>' : ''}
        </button>`;
      }).join('')}</div>
    </div>`;
  }

  function voorstelTekst() {
    const v = S.voorstel;
    if (!voorstelKlaar()) return '<p class="sim-uitleg">Kies eerst een sluitingstijd en de dagen.</p>';
    const tijd = v.ext === 4 ? '04.00' : '03.00';
    const dagen = v.dagen === 'vrza' ? 'vrijdag en zaterdag' : 'zaterdag';
    const regels = D.VOORWAARDEN.filter(o => v.opt[o.id]).map(o => `<li>${o.titel}</li>`).join('');
    return `<div class="sim-papier"><div class="papier-kop">RAADSVOORSTEL (concept)</div>
      <p>Cafés in het centrum mogen op <b>${dagen}</b> open blijven tot <b>${tijd} uur</b>.</p>
      ${regels ? `<p>Afspraken:</p><ul>${regels}</ul>` : '<p>Er komen geen extra afspraken bij.</p>'}
      <p>Kosten voor de gemeente: <b>${eur(D.kosten(v))}</b></p></div>`;
  }

  function steunBalk(p) {
    const st = steunVan(p);
    const voor = st >= 50;
    return `<div class="steun"><div class="steun-balk" role="img" aria-label="Steun van partij ${p.id}: ${st} van de 100 punten. Je hebt 50 nodig."><i class="${voor ? 'goed' : 'slecht'}" style="width:${st}%"></i><span class="streep"></span></div>
      <div class="steun-tekst"><b>${st}</b> van 100 punten. ${voor ? 'Stemt waarschijnlijk <b class="groen">voor</b>.' : 'Stemt waarschijnlijk <b class="rood">tegen</b>.'}</div></div>`;
  }
  function wensenLijst(p) {
    return `<ul class="wensen">${wensenVan(p).map(w => {
      const teken = w.f >= 1 ? '✓' : w.f > 0 ? '½' : '✕';
      const kl = w.f >= 1 ? 'ja' : w.f > 0 ? 'half' : 'nee';
      return `<li class="${kl}"><span class="teken" aria-hidden="true">${teken}</span><span class="sr">${w.f >= 1 ? 'Gehaald: ' : w.f > 0 ? 'Half gehaald: ' : 'Niet gehaald: '}</span>${w.t}<small>${w.w} punten</small></li>`;
    }).join('')}</ul>`;
  }

  /* ---------- Schermen in het midden ---------- */
  function middenIntro() {
    return `<div class="sim-kaart">
      <p class="sim-label">Oefenzaak · Politiek · Gemeente</p>
      <h1>De gemeenteraad beslist over sluitingstijden</h1>
      <p class="sim-lead">Noordstad heeft een druk centrum. Cafés sluiten nu om 02.00 uur. De horeca wil langer open. Bewoners willen rust. Jij maakt een plan. De raad stemt.</p>
      <div class="sim-blokken">
        <div class="sim-blok"><h3>Jouw rol</h3><p>Je bent <b>wethouder Horeca en Economie</b>. Je zit in het college. Je doet het voorstel. Je mag zelf <b>niet stemmen</b>.</p></div>
        <div class="sim-blok"><h3>Jouw doel</h3><p>Zoek een meerderheid in de raad. Dat zijn <b>11 van de 21 zetels</b>. Haal je dat niet, dan blijft alles zoals het is.</p></div>
      </div>
      <h2>Zo werkt het</h2>
      <ol class="sim-stappen">
        <li><b>Marktplein.</b> Praat met twee mensen en bouw je dossier.</li>
        <li><b>Collegekamer.</b> Maak je voorstel. Let op je budget.</li>
        <li><b>Fractieoverleg.</b> Overleg met minstens drie van de vier partijen. Pas je voorstel aan tot je een meerderheid hebt.</li>
        <li><b>Raadszaal.</b> Je krijgt drie kritische vragen. Je antwoordt met je dossier.</li>
        <li><b>Stemming.</b> De raad stemt. Soms verlies je.</li>
        <li><b>Nieuws.</b> Je schrijft het nieuwsbericht over het besluit en downloadt een pdf. Die mail je naar je docent.</li>
      </ol>
      <p class="sim-oefen">Noordstad bestaat niet. De partijen, de bedragen en de uitspraken zijn verzonnen voor deze oefening.</p>
      <div class="sim-acties"><button type="button" class="btn" data-act="start">Start de simulator</button><button type="button" class="btn ghost" data-act="begrippen">Begrippen</button></div>
    </div>`;
  }

  function middenS1() {
    const n = S.gesprekken.length;
    const kaarten = D.GESPREKKEN.map(g => {
      const klaar = S.gesprekken.indexOf(g.id) >= 0;
      const dicht = !klaar && n >= 2;
      return `<div class="sim-gesprek${klaar ? ' klaar' : ''}${dicht ? ' dicht' : ''}">
        <div class="gesprek-kop"><span class="icoon" aria-hidden="true">${g.icoon}</span><div><b>${g.wie}</b><small>${g.plek}</small></div></div>
        ${klaar ? `<blockquote>“${g.quote}”</blockquote><div class="notitie"><b>Toegevoegd aan je dossier:</b> ${g.argTitel}</div>` :
          `<button type="button" class="btn small" data-act="gesprek" data-val="${g.id}"${dicht ? ' disabled' : ''}>${dicht ? 'Geen tijd meer' : 'Praat met deze persoon'}</button>`}
      </div>`;
    }).join('');
    return `<div class="sim-kaart">
      <p class="sim-label">Vrijdag 01:45 · Marktplein</p>
      <h1>Het Marktplein: het knelpunt</h1>
      ${scene('s1')}
      <p>Om 01.45 uur gaan de lichten in de cafés aan. Groepen jongeren staan buiten. Je hebt tijd voor <b>twee gesprekken</b>. Kies slim. Wat je nu hoort, heb je straks nodig.</p>
      <p class="teller" aria-live="polite">Gesprekken gevoerd: <b>${n} van 2</b></p>
      <div class="sim-gesprekken">${kaarten}</div>
      <div class="sim-acties"><button type="button" class="btn" data-act="volgende"${n < 2 ? ' disabled' : ''}>Naar de collegekamer →</button></div>
    </div>`;
  }

  function middenS2() {
    return `<div class="sim-kaart">
      <p class="sim-label">Maandag 10:00 · Collegekamer</p>
      <h1>Maak het raadsvoorstel</h1>
      ${scene('s2')}
      <p>Het college bespreekt jouw plan. Jij bepaalt wat erin staat. Elke keuze heeft gevolgen voor de steun in de raad.</p>
      ${bouwer()}
      <h3>Zo ziet je voorstel er nu uit</h3>
      ${voorstelTekst()}
      <div class="sim-acties"><button type="button" class="btn" data-act="volgende"${voorstelKlaar() ? '' : ' disabled'}>Naar het fractieoverleg →</button></div>
    </div>`;
  }

  function meter() {
    const bekend = D.PARTIJEN.filter(gesproken);
    const voor = bekend.reduce((a, p) => a + (steunVan(p) >= 50 ? p.zetels : 0), 0);
    const onbekend = D.PARTIJEN.filter(p => !gesproken(p)).reduce((a, p) => a + p.zetels, 0);
    const ok = voor >= 11;
    return `<div class="sim-uitslag ${ok ? 'goed' : 'slecht'}" role="status"><b>Nu: ${voor} zetels voor</b> van de ${21 - onbekend} zetels die je kent. Nodig: 11.${onbekend ? ' Nog onbekend: ' + onbekend + ' zetels.' : ''}${ok ? ' Je hebt een meerderheid.' : ' Nog geen meerderheid.'}</div>`;
  }

  function middenS3() {
    const n = S.fracties.length;
    const kaarten = D.PARTIJEN.map(p => {
      const klaar = gesproken(p);
      const dicht = false;
      return `<div class="sim-fractie${klaar ? ' klaar' : ''}${dicht ? ' dicht' : ''}" style="--pk:${p.kleur}">
        <div class="fractie-kop"><span class="fletter" aria-hidden="true">${p.id}</span><div><b>Partij ${p.id}: ${p.naam}</b><small>${p.rol} · ${p.zetels} zetels</small></div></div>
        ${klaar ? `<blockquote>“${p.zegt}”</blockquote><p class="sim-uitleg">Een fractie stemt voor als je voorstel <b>50 punten of meer</b> haalt.</p>${wensenLijst(p)}${steunBalk(p)}` :
          `<p class="sim-uitleg">Wil: ${p.wil}</p><button type="button" class="btn small" data-act="fractie" data-val="${p.id}"${dicht ? ' disabled' : ''}>Overleg voeren</button>`}
      </div>`;
    }).join('');
    return `<div class="sim-kaart">
      <p class="sim-label">Dinsdag 14:00 · Fractieoverleg</p>
      <h1>Zoek steun in de raad</h1>
      ${scene('s3')}
      <p>Praat met de partijen. Spreek er minstens <b>drie</b>. Een partij die je niet spreekt, houdt haar wensen geheim. Je ziet pas bij de stemming wat zij doet.</p>
      <p>Je hebt <b>11 van de 21 zetels</b> nodig. Pas je voorstel aan zodat genoeg partijen voorstemmen. Kies zelf bij welke partijen je water bij de wijn doet.</p>
      <p class="teller" aria-live="polite">Overleggen gevoerd: <b>${n} van 4</b> (minimaal 3)</p>
      ${n > 0 ? meter() : ''}
      <div class="sim-fracties">${kaarten}</div>
      ${n > 0 ? `<h2>Pas je voorstel aan</h2><p class="sim-uitleg">Verander iets. De balken hierboven bewegen mee.</p>${bouwer()}<h3>Je voorstel nu</h3>${voorstelTekst()}` : ''}
      <div class="sim-acties"><button type="button" class="btn" data-act="volgende"${n < 3 ? ' disabled' : ''}>Naar de raadsvergadering →</button></div>
    </div>`;
  }

  function middenS4() {
    const gedaan = D.DEBAT.filter(q => S.debat[q.id]);
    const nu = D.DEBAT.find(q => !S.debat[q.id]);
    const argKaart = id => D.GESPREKKEN.find(g => g.id === id);
    const klaar = gedaan.map(q => {
      const keuze = S.debat[q.id];
      const r = q.ant[keuze](S.voorstel);
      const a = keuze === 'geen' ? null : argKaart(keuze);
      return `<div class="sim-vraag klaar"><div class="vraag-kop"><b>${q.wie}</b></div><blockquote>“${q.vraag}”</blockquote>
        <p class="jouw">Jij antwoordt: <b>${a ? a.argTitel : 'Geen echt antwoord'}</b></p>
        <p class="reactie ${r.d > 0 ? 'goed' : r.d < 0 ? 'slecht' : ''}" role="status">${r.t}</p></div>`;
    }).join('');
    let actief = '';
    if (nu) {
      const opties = D.GESPREKKEN.map(g => {
        const ken = S.gesprekken.indexOf(g.id) >= 0;
        return `<button type="button" class="sim-antwoord${ken ? '' : ' slot'}" data-act="antwoord" data-q="${nu.id}" data-val="${g.id}"${ken ? '' : ' disabled'}>
          <b>${ken ? g.argTitel : 'Hier heb je niet over gesproken'}</b><small>${ken ? g.argTekst : 'Je hebt deze persoon niet gesproken.'}</small></button>`;
      }).join('');
      actief = `<div class="sim-vraag actief"><div class="vraag-kop"><b>${nu.wie}</b></div><blockquote>“${nu.vraag}”</blockquote>
        <p class="sim-uitleg">Kies uit je dossier. Let op: je antwoord moet kloppen met je voorstel.</p>
        <div class="sim-antwoorden">${opties}<button type="button" class="sim-antwoord" data-act="antwoord" data-q="${nu.id}" data-val="geen"><b>Ik weet het niet precies</b><small>We zoeken het later uit.</small></button></div></div>`;
    }
    return `<div class="sim-kaart">
      <p class="sim-label">Donderdag 20:30 · Raadszaal</p>
      <h1>Het debat in de raad</h1>
      ${scene('s4')}
      <p>De raadsvergadering is openbaar. De burgemeester is voorzitter. Drie fracties stellen je een vraag. Jij bent de wethouder en antwoordt.</p>
      <p class="teller">Vraag <b>${Math.min(gedaan.length + 1, 3)} van 3</b></p>
      ${klaar}${actief}
      ${!nu ? '<div class="sim-acties"><button type="button" class="btn" data-act="volgende">Naar de stemming →</button></div>' : ''}
    </div>`;
  }

  function middenS5() {
    const u = uitslag();
    const klaar = S.stemKlaar;
    const getoond = klaar ? 4 : reveal;
    const regels = u.rij.map((r, i) => {
      if (i >= getoond) return `<div class="stem-rij wacht"><span class="fletter" style="--pk:${r.p.kleur}">${r.p.id}</span><span>Partij ${r.p.id}</span><span class="stem">...</span></div>`;
      return `<div class="stem-rij ${r.voor ? 'voor' : 'tegen'}"><span class="fletter" style="--pk:${r.p.kleur}">${r.p.id}</span><span>Partij ${r.p.id}: ${r.p.naam} (${r.p.zetels} zetels)</span><span class="stem">${r.voor ? 'VOOR' : 'TEGEN'}</span></div>`;
    }).join('');
    const nuVoor = u.rij.slice(0, getoond).reduce((a, r) => a + (r.voor ? r.p.zetels : 0), 0);
    const nuTegen = u.rij.slice(0, getoond).reduce((a, r) => a + (!r.voor ? r.p.zetels : 0), 0);
    let uitleg = '';
    if (klaar) {
      uitleg = `<div class="sim-uitslag ${u.aangenomen ? 'goed' : 'slecht'}" role="status"><b>${u.aangenomen ? 'AANGENOMEN' : 'VERWORPEN'}</b> met ${u.voor} voor en ${u.tegen} tegen.${u.aangenomen ? '' : ' Er waren 11 zetels nodig.'}</div>
        <h2>Waarom stemde elke partij zo?</h2><div class="sim-fracties">${u.rij.map(r => `<div class="sim-fractie klaar" style="--pk:${r.p.kleur}"><div class="fractie-kop"><span class="fletter">${r.p.id}</span><div><b>Partij ${r.p.id}: ${r.p.naam}</b><small>${r.p.rol} · ${r.p.zetels} zetels · stemde ${r.voor ? 'voor' : 'tegen'}</small></div></div>
          ${wensenLijst(r.p)}<p class="sim-uitleg">Voorstel: <b>${r.basis}</b> punten${r.d ? `. Debat: <b>${r.d > 0 ? '+' : ''}${r.d}</b>` : ''}. Totaal: <b>${r.st}</b> van 100.${gesproken(r.p) ? '' : ' Jij hebt deze partij niet gesproken.'}</p></div>`).join('')}</div>
        <div class="sim-blok les"><h3>Wat deed je als bestuurder?</h3><ul>
          <li><b>Kaders stellen.</b> De raad besliste over de regels en over ${eur(D.kosten(S.voorstel))} van het budget.</li>
          <li><b>Controleren.</b> De fracties stelden je kritische vragen. Zo controleert de raad het college.</li>
          <li><b>Vertegenwoordigen.</b> Elke partij sprak namens een groep inwoners. Horeca, bewoners en jongeren hebben allemaal een stem.</li>
          <li>Jij bent wethouder. Je deed het voorstel, maar de raad besloot.</li></ul></div>
        <div class="sim-acties"><button type="button" class="btn" data-act="volgende">Naar het raadsbesluit →</button></div>`;
    } else if (!animeert) {
      uitleg = '<div class="sim-acties"><button type="button" class="btn" data-act="stem">Open de stemming</button></div>';
    }
    return `<div class="sim-kaart">
      <p class="sim-label">Donderdag 21:45 · Stemming</p>
      <h1>De raad stemt</h1>
      ${scene('s5')}
      <p>De voorzitter vraagt de fracties om te stemmen. Elke fractie stemt met al haar zetels tegelijk.</p>
      <div class="sim-stemmen" aria-live="polite">${regels}</div>
      <p class="telling"><span class="voor">Voor: <b>${nuVoor}</b></span><span class="tegen">Tegen: <b>${nuTegen}</b></span><span>Nodig: <b>11</b></span></p>
      ${uitleg}
    </div>`;
  }

  function besluit() {
    const u = uitslag(), v = S.voorstel;
    const tijd = v.ext === 4 ? '04.00' : '03.00';
    const dagen = v.dagen === 'vrza' ? 'vrijdag en zaterdag' : 'zaterdag';
    const voorNamen = u.rij.filter(r => r.voor).map(r => `Partij ${r.p.id} (${r.p.zetels})`).join(', ') || 'Geen';
    const tegenNamen = u.rij.filter(r => !r.voor).map(r => `Partij ${r.p.id} (${r.p.zetels})`).join(', ') || 'Geen';
    const opt = D.VOORWAARDEN.filter(o => v.opt[o.id]);
    let besloten, gevolgen;
    if (u.aangenomen) {
      besloten = `Cafés in het centrum mogen op ${dagen} open blijven tot ${tijd} uur.` + (opt.length ? ' Daarbij gelden deze afspraken: ' + opt.map(o => o.titel.charAt(0).toLowerCase() + o.titel.slice(1)).join(', ') + '.' : '');
      gevolgen = [];
      gevolgen.push(`Ondernemers: cafés mogen tot ${tijd} uur open.` + (v.opt.portiers || v.opt.geluid ? ' Zij betalen zelf voor ' + [v.opt.portiers ? 'portiers' : '', v.opt.geluid ? 'een geluidsbegrenzer' : ''].filter(Boolean).join(' en ') + '.' : ''));
      gevolgen.push(v.opt.geluid || v.opt.meld || v.opt.proef || v.opt.boa || v.opt.portiers
        ? 'Bewoners: er zijn regels tegen overlast' + (v.opt.meld ? ' en er is een meldpunt' : '') + (v.opt.proef ? '. Na een jaar kijkt de raad of het goed gaat' : '') + '.'
        : 'Bewoners: er komen geen extra regels tegen overlast.');
      gevolgen.push(v.opt.bus ? 'Jongeren: een extra nachtbus brengt hen na sluitingstijd naar huis.' : 'Jongeren: er is geen extra nachtbus. Zij moeten zelf naar huis.');
      gevolgen.push(`Gemeente: het kost ${eur(D.kosten(v))} van het budget van ${eur(D.BUDGET)}.`);
    } else {
      besloten = 'Het voorstel is verworpen. Cafés in het centrum sluiten nog steeds om 02.00 uur.';
      gevolgen = ['Ondernemers: er verandert niets. Cafés sluiten om 02.00 uur.', 'Bewoners: er verandert niets.', 'Jongeren: er verandert niets.', 'Gemeente: er wordt geen geld uitgegeven. De wethouder mag later een nieuw voorstel doen.'];
    }
    return { u, voorNamen, tegenNamen, besloten, gevolgen };
  }

  function checks() {
    const n = S.nieuws;
    const iw = wordtGeteld(n.intro), kw = wordtGeteld(n.kern);
    return {
      iw, kw,
      naam: n.naam.trim().length >= 2,
      kop: n.kop.trim().length >= 5,
      intro: iw > 0 && iw <= 25,
      kern: kw >= 80 && kw <= 120,
      bron: n.bron.trim().length >= 5
    };
  }

  function middenS6() {
    const b = besluit();
    const n = S.nieuws;
    return `<div class="sim-kaart">
      <p class="sim-label">Vrijdag 09:00 · Raadsbesluit en nieuws</p>
      <h1>Het raadsbesluit</h1>
      ${scene('s6')}
      <div class="sim-papier groot"><div class="papier-kop">RAADSBESLUIT · GEMEENTE NOORDSTAD</div>
        <h3>Sluitingstijden horeca in het centrum</h3>
        <p class="status ${b.u.aangenomen ? 'goed' : 'slecht'}"><b>${b.u.aangenomen ? 'AANGENOMEN' : 'VERWORPEN'}</b> (${b.u.voor} voor, ${b.u.tegen} tegen)</p>
        <h4>Wie besloot?</h4><p>De gemeenteraad van Noordstad (21 zetels), op voorstel van het college van burgemeester en wethouders.</p>
        <h4>Hoe is er gestemd?</h4><p><b>Voor:</b> ${b.voorNamen}<br><b>Tegen:</b> ${b.tegenNamen}</p>
        <h4>Wat is er besloten?</h4><p>${b.besloten}</p>
        <h4>Gevolgen</h4><ul>${b.gevolgen.map(g => `<li>${g}</li>`).join('')}</ul>
      </div>
      <h2>Schrijf het nieuwsbericht</h2>
      <p>Gebruik het raadsbesluit hierboven als bron. Je hebt vier onderdelen nodig. Je kunt het pas downloaden als alles klopt.</p>
      <div class="sim-schrijf">
        <div class="velden">
          <label for="nm">Naam of namen (komt alleen op je pdf. De naam blijft op jouw computer)</label>
          <input id="nm" data-veld="naam" type="text" maxlength="60" value="${esc(n.naam)}" autocomplete="off">
          <label for="kp">1. Kop</label>
          <input id="kp" data-veld="kop" type="text" maxlength="120" value="${esc(n.kop)}" autocomplete="off">
          <label for="in">2. Intro (maximaal 25 woorden) <span class="teller-w" id="t-intro"></span></label>
          <textarea id="in" data-veld="intro" rows="3">${esc(n.intro)}</textarea>
          <label for="kr">3. Kern (80 tot 120 woorden). Wie besloot, wat en wat betekent het voor inwoners? <span class="teller-w" id="t-kern"></span></label>
          <textarea id="kr" data-veld="kern" rows="9">${esc(n.kern)}</textarea>
          <label for="bn">4. Bronvermelding</label>
          <input id="bn" data-veld="bron" type="text" maxlength="160" value="${esc(n.bron)}" autocomplete="off">
        </div>
        <aside class="lijst" aria-live="polite"><h3>Checklist</h3><ul id="checklijst"></ul><button type="button" class="btn" id="pdfknop" data-act="pdf" disabled>Download als pdf</button><p class="sim-uitleg" id="pdfhint"></p></aside>
      </div>
      <div class="sim-acties onder">
        ${b.u.aangenomen ? '' : '<button type="button" class="btn ghost" data-act="nieuwvoorstel">Doe een nieuw voorstel</button>'}
        ${wisVraag ? '<span class="wis">Alles wissen en opnieuw beginnen? <button type="button" class="btn small danger" data-act="wisja">Ja, wis alles</button> <button type="button" class="btn small ghost" data-act="wisnee">Nee</button></span>' : '<button type="button" class="btn ghost" data-act="wis">Opnieuw spelen</button>'}
      </div>
      <p class="sim-uitleg">Mail de pdf naar je docent. Het mailadres staat op het bord.</p>
    </div>`;
  }

  function updateChecks() {
    const c = checks();
    const lijst = document.getElementById('checklijst');
    if (!lijst) return;
    const item = (ok, t) => `<li class="${ok ? 'ja' : 'nee'}"><span aria-hidden="true">${ok ? '✓' : '○'}</span> ${t}</li>`;
    lijst.innerHTML = item(c.naam, 'Naam ingevuld') + item(c.kop, 'Een kop') + item(c.intro, 'Intro van maximaal 25 woorden') + item(c.kern, 'Kern van 80 tot 120 woorden') + item(c.bron, 'Bron genoemd');
    const ti = document.getElementById('t-intro'), tk = document.getElementById('t-kern');
    if (ti) { ti.textContent = c.iw + ' woorden'; ti.className = 'teller-w ' + (c.intro ? 'ok' : c.iw ? 'fout' : ''); }
    if (tk) { tk.textContent = c.kw + ' woorden'; tk.className = 'teller-w ' + (c.kern ? 'ok' : c.kw ? 'fout' : ''); }
    const alles = c.naam && c.kop && c.intro && c.kern && c.bron;
    const knop = document.getElementById('pdfknop'), hint = document.getElementById('pdfhint');
    if (knop) knop.disabled = !alles;
    if (hint) hint.textContent = alles ? 'Alles klopt. Download de pdf en mail hem naar je docent.' : 'Maak eerst alle vinkjes groen.';
  }

  function maakPdf() {
    const b = besluit(), n = S.nieuws;
    const datum = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    const grijs = [0.35, 0.35, 0.4];
    const blokken = [
      { tekst: 'Nieuwsbericht', size: 24, vet: true },
      { lijn: true, voor: 6 },
      { tekst: 'Geschreven door: ' + n.naam.trim(), size: 11, voor: 12 },
      { tekst: 'Datum: ' + datum, size: 11 },
      { tekst: n.kop.trim(), size: 19, vet: true, voor: 22 },
      { tekst: n.intro.trim(), size: 12, vet: true, voor: 12 },
      { tekst: n.kern.trim(), size: 11, voor: 12 },
      { tekst: n.bron.trim(), size: 10, voor: 14, kleur: grijs },
      { lijn: true, voor: 26 },
      { tekst: 'Het raadsbesluit in het kort', size: 13, vet: true, voor: 14 },
      { tekst: 'Uitslag: ' + (b.u.aangenomen ? 'aangenomen' : 'verworpen') + ' (' + b.u.voor + ' voor, ' + b.u.tegen + ' tegen)', size: 10.5, voor: 8 },
      { tekst: 'Voor: ' + b.voorNamen, size: 10.5 },
      { tekst: 'Tegen: ' + b.tegenNamen, size: 10.5 },
      { tekst: 'Besloten: ' + b.besloten, size: 10.5, voor: 6 }
    ];
    const slug = n.naam.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
    S.pdf = true; bewaar(); meld();
    window.SimplePdf.downloadPdf(blokken, 'nieuwsbericht-noordstad' + (slug ? '-' + slug : '') + '.pdf', 'Oefenzaak Noordstad  |  Politiek  |  Mediacollege Amsterdam');
  }

  /* ---------- Kolommen links en rechts ---------- */
  function links() {
    const nu = stapNr();
    const items = D.STAPPEN.map((s, i) => {
      const kl = i < nu ? 'klaar' : i === nu ? 'nu' : '';
      return `<li class="${kl}"${i === nu ? ' aria-current="step"' : ''}><span class="nr">${i < nu ? '✓' : i + 1}</span><span><b>${s.plek}</b><small>${s.dag} ${s.tijd} · ${s.kort}</small></span></li>`;
    }).join('');
    return `<nav class="sim-agenda" aria-label="Agenda"><h2>Agenda</h2><ol>${items}</ol>
      <button type="button" class="btn ghost small" data-act="begrippen">Begrippen</button></nav>`;
  }
  function rechts() {
    const nu = stapNr();
    const kenbaar = D.PARTIJEN.filter(p => modusRechts(p) !== 'onbekend');
    const zeker = kenbaar.filter(p => modusRechts(p) === 'voor').reduce((a, p) => a + p.zetels, 0);
    const tegen = kenbaar.filter(p => modusRechts(p) === 'tegen').reduce((a, p) => a + p.zetels, 0);
    const onbekend = 21 - zeker - tegen;
    const dossier = S.gesprekken.map(id => { const g = D.GESPREKKEN.find(x => x.id === id); return `<li><b>${g.argTitel}</b><small>${g.argTekst}</small></li>`; }).join('');
    const partijen = nu >= 2 ? D.PARTIJEN.map(p => {
      const zicht = zichtbaar(p) || S.scherm === 's6' || (S.scherm === 's5' && (S.stemKlaar));
      return `<li style="--pk:${p.kleur}"><span class="fletter">${p.id}</span><span><b>${p.naam}</b><small>${p.rol} · ${p.zetels} zetels</small></span><span class="mini ${zicht ? (steunVan(p) >= 50 ? 'voor' : 'tegen') : ''}">${zicht ? steunVan(p) : '?'}</span></li>`;
    }).join('') : '';
    return `<aside class="sim-dash">
      <section><h2>De raad (21 zetels)</h2>${zetelsSvg(300, 168, modusRechts)}
        <p class="telling kl"><span class="voor">Voor: <b>${zeker}</b></span><span class="tegen">Tegen: <b>${tegen}</b></span><span>Onbekend: <b>${onbekend}</b></span></p>
        <p class="sim-uitleg">Je hebt <b>11</b> zetels nodig.</p></section>
      ${partijen ? `<section><h2>Partijen</h2><ul class="sim-partijen">${partijen}</ul><p class="sim-uitleg">Het cijfer is de steun van 0 tot 100. Vanaf 50 stemt een partij voor.</p></section>` : ''}
      <section><h2>Jouw dossier</h2>${dossier ? `<ul class="sim-dossier">${dossier}</ul>` : '<p class="sim-uitleg">Nog leeg. Praat met mensen op het Marktplein.</p>'}</section>
    </aside>`;
  }

  /* ---------- Hoofdweergave ---------- */
  function boven() {
    const st = D.STAPPEN[stapNr()];
    const k = D.kosten(S.voorstel);
    return `<header class="sim-top"><div class="titel"><span class="gn" aria-hidden="true">GN</span><div><b>Gemeente Noordstad</b><small>Jij bent: wethouder Horeca en Economie</small></div></div>
      <div class="klok" aria-label="Moment in het spel"><b>${st ? st.tijd : '--:--'}</b><small>${st ? st.dag : 'Nog niet gestart'}</small></div>
      <div class="geld"><small>Budget Veilige nacht</small><b>${eur(D.BUDGET - k)}</b><small>over van ${eur(D.BUDGET)}</small></div></header>`;
  }
  function begrippenModal() {
    if (!toonBegrippen) return '';
    return `<div class="sim-modal" role="dialog" aria-modal="true" aria-labelledby="bg-t"><div class="sim-modal-in"><div class="mk"><h2 id="bg-t">Begrippen</h2><button type="button" class="btn ghost small" data-act="sluit">Sluiten</button></div>
      <dl>${D.BEGRIPPEN.map(b => `<dt>${b[0]}</dt><dd>${b[1]}</dd>`).join('')}</dl></div></div>`;
  }

  function render() {
    const y = window.scrollY;
    const mid = { intro: middenIntro, s1: middenS1, s2: middenS2, s3: middenS3, s4: middenS4, s5: middenS5, s6: middenS6 }[S.scherm]();
    app.innerHTML = `<div class="sim-nodesktop"><h1>Gebruik een computer</h1><p>Deze simulator werkt alleen op een computer of laptop met een groot scherm. Open de link op een computer.</p></div>
      <div class="sim" data-scherm="${S.scherm}">${boven()}<div class="sim-body">${links()}<main class="sim-midden" id="sim-midden">${mid}</main>${rechts()}</div></div>${begrippenModal()}`;
    window.scrollTo(0, y);
    if (S.scherm === 's6') updateChecks();
  }

  function ga(scherm) {
    S.scherm = scherm;
    bewaar();
    meld();
    render();
    window.scrollTo(0, 0);
  }

  /* ---------- Acties ---------- */
  function stemAnimatie() {
    if (animeert) return;
    animeert = true; reveal = 0;
    render();
    const stap = () => {
      reveal++;
      if (reveal >= 4) { animeert = false; S.stemKlaar = true; S.pogingen = (S.pogingen || 0) + 1; bewaar(); meld(); render(); return; }
      render();
      setTimeout(stap, 1100);
    };
    setTimeout(stap, 900);
  }

  app.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const act = el.dataset.act, val = el.dataset.val;
    const v = S.voorstel;
    if (act === 'start') ga('s1');
    else if (act === 'begrippen') { toonBegrippen = true; render(); }
    else if (act === 'sluit') { toonBegrippen = false; render(); }
    else if (act === 'gesprek') { if (S.gesprekken.length < 2 && S.gesprekken.indexOf(val) < 0) { S.gesprekken.push(val); bewaar(); render(); } }
    else if (act === 'fractie') { if (S.fracties.indexOf(val) < 0) { S.fracties.push(val); bewaar(); render(); } }
    else if (act === 'ext') { v.ext = Number(val); bewaar(); render(); }
    else if (act === 'dagen') { v.dagen = val; bewaar(); render(); }
    else if (act === 'opt') {
      const o = D.VOORWAARDEN.find(x => x.id === val);
      const nieuw = !v.opt[val];
      if (nieuw && D.kosten(v) + o.kosten > D.BUDGET) return;
      v.opt[val] = nieuw; bewaar(); render();
    }
    else if (act === 'antwoord') { S.debat[el.dataset.q] = val; bewaar(); render(); }
    else if (act === 'stem') stemAnimatie();
    else if (act === 'volgende') {
      const i = stapNr();
      if (i === 1 && !voorstelKlaar()) return;
      ga(volgorde[i + 1]);
    }
    else if (act === 'pdf') { const c = checks(); if (c.naam && c.kop && c.intro && c.kern && c.bron) maakPdf(); }
    else if (act === 'nieuwvoorstel') { S.debat = {}; S.stemKlaar = false; reveal = 0; S.scherm = 's3'; bewaar(); meld(); render(); window.scrollTo(0, 0); }
    else if (act === 'wis') { wisVraag = true; render(); }
    else if (act === 'wisnee') { wisVraag = false; render(); }
    else if (act === 'wisja') { wisVraag = false; reveal = 0; animeert = false; S = leeg(); bewaar(); render(); window.scrollTo(0, 0); }
  });

  app.addEventListener('input', e => {
    const veld = e.target && e.target.dataset && e.target.dataset.veld;
    if (!veld) return;
    S.nieuws[veld] = e.target.value;
    bewaar();
    updateChecks();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && toonBegrippen) { toonBegrippen = false; render(); } });

  render();
})();
