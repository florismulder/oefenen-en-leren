(function () {
  var KEY = 'tijdlijn-les2-v1';
  var app = document.getElementById('app');
  var MAX = 6;
  var EV = { korea: 'Koreaoorlog', hongarije: 'Hongarije', muur: 'Berlijnse Muur', cuba: 'Cubacrisis' };
  var REEEL = { korea: 9, hongarije: 7, muur: 8, cuba: 9.8 };
  var MOM = [
    { id: 'k1', ev: 'korea', d: '1950-06-25', dt: '25 juni 1950', t: 'Noord-Korea valt Zuid-Korea aan.' },
    { id: 'k2', ev: 'korea', d: '1953-07-27', dt: '27 juli 1953', t: 'De gevechten in Korea stoppen. Er komt geen vredesverdrag.' },
    { id: 'h1', ev: 'hongarije', d: '1956-10-23', dt: '23 okt 1956', t: 'Studenten in Boedapest eisen vrijheid.' },
    { id: 'h2', ev: 'hongarije', d: '1956-11-04', dt: '4 nov 1956', t: 'Sovjettanks komen Boedapest binnen.' },
    { id: 'm1', ev: 'muur', d: '1961-08-13', dt: '13 aug 1961', t: 'Oost-Duitsland sluit de grens in Berlijn.' },
    { id: 'm2', ev: 'muur', d: '1961-10-27', dt: '27 okt 1961', t: 'Bij Checkpoint Charlie staan tien Amerikaanse en tien Sovjettanks tegenover elkaar.' },
    { id: 'c1', ev: 'cuba', d: '1962-10-16', dt: '16 okt 1962', t: 'Kennedy ziet foto\'s van Sovjetraketten op Cuba.' },
    { id: 'c2', ev: 'cuba', d: '1962-10-22', dt: '22 okt 1962', t: 'Amerika sluit Cuba af met schepen.' },
    { id: 'c3', ev: 'cuba', d: '1962-10-27', dt: '27 okt 1962', t: 'Een Amerikaans vliegtuig wordt boven Cuba neergeschoten.' },
    { id: 'c4', ev: 'cuba', d: '1962-10-28', dt: '28 okt 1962', t: 'Chroesjtsjov zegt dat de raketten weggaan.' }
  ];
  var FOTOS = [
    { id: 'l2-korea', t: 'Soldaten en vluchtelingen in Korea' },
    { id: 'l2-hongarije', t: 'Opstand in Boedapest, 1956' },
    { id: 'l2-tanks', t: 'Sovjettanks in Boedapest' },
    { id: 'l2-draad', t: 'Prikkeldraad in Berlijn, augustus 1961' },
    { id: 'l2-vlucht', t: 'Een soldaat springt over het prikkeldraad naar West-Berlijn' },
    { id: 'l2-cuba', t: 'Spionagefoto van een Sovjet-raketbasis op Cuba' },
    { id: 'l2-krant', t: 'Krant: Amerika legt blokkade rond Cuba' }
  ];
  var S = laad();
  function laad() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.gekozen) return s; } catch (e) {} return { fase: 'start', n1: '', n2: '', titel: '', gekozen: [], slots: {}, vergelijk: false, jaren: {}, gecheckt: false }; }
  function bewaar() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mom(id) { return MOM.filter(function (m) { return m.id === id; })[0]; }
  function foto(id) { return FOTOS.filter(function (f) { return f.id === id; })[0]; }
  function heat(n) { var a = [61, 90, 128], b = [255, 0, 231], f = (n - 1) / 9; return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * f); }).join(',') + ')'; }
  function gesorteerd() { return S.gekozen.slice().sort(function (a, b) { return mom(a).d < mom(b).d ? -1 : mom(a).d > mom(b).d ? 1 : mom(a).id < mom(b).id ? -1 : 1; }); }
  function slotOk(id) { var s = S.slots[id] || {}; return !!(s.foto && s.cijfer && (s.zin || '').trim().length >= 8); }
  function controle() {
    var mis = [];
    if (!S.n1.trim() || !S.n2.trim()) mis.push('jullie twee namen');
    if (!S.titel.trim()) mis.push('een titel');
    if (S.gekozen.length < MAX) mis.push('nog ' + (MAX - S.gekozen.length) + ' moment(en) kiezen');
    var evs = {}; S.gekozen.forEach(function (id) { evs[mom(id).ev] = 1; });
    Object.keys(EV).forEach(function (k) { if (!evs[k]) mis.push('een moment bij ' + EV[k]); });
    var open = S.gekozen.filter(function (id) { return !slotOk(id); }).length;
    if (open) mis.push('bij ' + open + ' moment(en) nog een foto, een zin (minimaal 8 tekens) of een cijfer');
    return mis;
  }
  function start() {
    app.innerHTML = '<section class="hero"><span class="tag">Koude Oorlog · Les 2 · 1950 tot 1962</span><h1>Bouw de tijdlijn van de spanning</h1>' +
      '<p>Jullie kiezen zes momenten uit les 2. Bij elk moment kies je een foto, schrijf je één zin en geef je een cijfer voor de spanning. Je ziet je spanningslijn meteen groeien. Daarna download je alles als pdf.</p>' +
      '<div class="waarschuw"><b>Gebruik een computer of laptop.</b> Op een telefoon werkt dit niet goed. Pak je laptop erbij voordat je begint.</div>' +
      '<div class="card"><h2>Wie zijn jullie?</h2><div class="namen"><div class="fld"><label for="n1">Naam 1</label><input id="n1" autocomplete="off" value="' + esc(S.n1) + '"></div><div class="fld"><label for="n2">Naam 2</label><input id="n2" autocomplete="off" value="' + esc(S.n2) + '"></div></div></div>' +
      '<button class="btn" id="go" type="button">Beginnen</button></section>';
    if (window.innerWidth < 900) app.insertAdjacentHTML('afterbegin', '<div class="waarschuw groot">Je zit op een klein scherm. Open deze pagina op een computer of laptop.</div>');
    document.getElementById('n1').oninput = function (e) { S.n1 = e.target.value; bewaar(); };
    document.getElementById('n2').oninput = function (e) { S.n2 = e.target.value; bewaar(); };
    document.getElementById('go').onclick = function () { if (!S.n1.trim() || !S.n2.trim()) { document.getElementById('n1').focus(); return; } S.fase = 'jaar'; bewaar(); jaar(); window.scrollTo(0, 0); };
  }

  var JAAR = [
    { k: 'korea', foto: 'l2-korea', t: 'Noord-Korea valt Zuid-Korea aan. De Verenigde Naties sturen soldaten.', j: 1950 },
    { k: 'hongarije', foto: 'l2-tanks', t: 'Studenten eisen vrijheid. Sovjettanks rijden Boedapest binnen.', j: 1956 },
    { k: 'muur', foto: 'l2-draad', t: 'Oost-Duitsland sluit de grens in Berlijn. Eerst met prikkeldraad.', j: 1961 },
    { k: 'cuba', foto: 'l2-cuba', t: 'Sovjetraketten op Cuba. Amerika sluit het eiland af met schepen.', j: 1962 }
  ];
  function jaar() {
    S.fase = 'jaar'; S.jaren = S.jaren || {};
    var kaarten = JAAR.map(function (e) {
      var v = S.jaren[e.k] || 1955, uit = '';
      if (S.gecheckt) { var d = Math.abs(v - e.j); uit = '<div class="uitslag ' + (d === 0 ? 'goed' : d <= 2 ? 'bijna' : 'ver') + '"><b>Het was ' + e.j + '.</b> ' + (d === 0 ? 'Precies goed.' : 'Jullie zaten ' + d + ' jaar ernaast.') + '</div>'; }
      return '<div class="jaarkaart"><img src="/reader-img/' + e.foto + '.jpg" alt=""><div class="jk-tekst"><span class="tag">' + EV[e.k] + '</span><p>' + esc(e.t) + '</p><div class="jk-jaar" id="jj-' + e.k + '">' + v + '</div>' +
        '<input type="range" min="1945" max="1965" step="1" value="' + v + '" data-k="' + e.k + '" aria-label="Jaar van ' + EV[e.k] + '"' + (S.gecheckt ? ' disabled' : '') + '><div class="jk-as"><span>1945</span><span>1955</span><span>1965</span></div>' + uit + '</div></div>';
    }).join('');
    var goed = S.gecheckt ? JAAR.filter(function (e) { return S.jaren[e.k] === e.j; }).length : 0;
    app.innerHTML = '<span class="tag">Stap 0 · Wanneer was het?</span><h1 class="jaar-kop">Zet de gebeurtenissen in de tijd</h1>' +
      '<p class="tip" style="font-size:19px;color:var(--cream);margin:10px 0 18px">Weten jullie in welk jaar het gebeurde? Schuif de balk naar jullie gok. Dan klik je op Controleer. Je krijgt geen cijfer. Het is een start.</p>' +
      '<div class="jaargrid">' + kaarten + '</div>' +
      (S.gecheckt ? '<div class="meld"><b>' + goed + ' van de 4 precies goed.</b> Neem de jaartallen mee. Je hebt ze nodig voor je tijdlijn.</div>' : '') +
      '<div class="acties">' + (S.gecheckt ? '<button class="btn" id="verder" type="button">Verder naar de tijdlijn</button>' : '<button class="btn" id="check" type="button">Controleer</button>') + '<button class="btn licht" id="terug" type="button">Terug</button></div>';
    app.querySelectorAll('input[type=range]').forEach(function (r) {
      r.oninput = function () { S.jaren[r.dataset.k] = +r.value; document.getElementById('jj-' + r.dataset.k).textContent = r.value; bewaar(); };
    });
    var c = document.getElementById('check'); if (c) c.onclick = function () { JAAR.forEach(function (e) { if (!S.jaren[e.k]) S.jaren[e.k] = 1955; }); S.gecheckt = true; bewaar(); jaar(); window.scrollTo(0, 0); };
    var v = document.getElementById('verder'); if (v) v.onclick = function () { S.fase = 'bouw'; bewaar(); bouw(); window.scrollTo(0, 0); };
    document.getElementById('terug').onclick = function () { S.fase = 'start'; bewaar(); start(); };
  }
  function chartHtml() {
    var W = 1000, H = 270, top = 44, bot = 30, ids = gesorteerd();
    function X(i) { return (i + 0.5) * W / MAX; }
    function Y(v) { return H - bot - (v - 1) / 9 * (H - top - bot); }
    var pts = [], g = '';
    ids.forEach(function (id, i) { var s = S.slots[id]; if (s && s.cijfer) pts.push({ x: X(i), y: Y(s.cijfer), v: s.cijfer, id: id }); });
    g += '<line x1="0" y1="' + Y(10) + '" x2="' + W + '" y2="' + Y(10) + '" stroke="#BDB7A8" stroke-width="2" stroke-dasharray="10 9"/>';
    g += '<line x1="0" y1="' + Y(1) + '" x2="' + W + '" y2="' + Y(1) + '" stroke="#BDB7A8" stroke-width="2" stroke-dasharray="10 9"/>';
    var line = [{ x: 20, y: Y(9) }].concat(pts), path = '';
    if (pts.length) { path = 'M' + line.map(function (p) { return p.x + ' ' + p.y; }).join(' L'); g += '<path d="' + path + '" fill="none" stroke="#FF00E7" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>'; }
    g += '<circle cx="20" cy="' + Y(9) + '" r="15" fill="#17181A"/><text x="20" y="' + (Y(9) + 5) + '" text-anchor="middle" fill="#fff" font-size="15" font-weight="700" font-family="Arial">9</text>';
    g += '<text x="20" y="' + (Y(9) - 24) + '" text-anchor="middle" fill="#5B5F64" font-size="13" font-weight="700" font-family="Courier New">1949</text>';
    if (S.vergelijk && pts.length) {
      var rp = pts.map(function (p) { return { x: p.x, y: Y(REEEL[mom(p.id).ev]), v: REEEL[mom(p.id).ev] }; });
      g += '<path d="M' + rp.map(function (p) { return p.x + ' ' + p.y; }).join(' L') + '" fill="none" stroke="#17181A" stroke-width="4" stroke-dasharray="4 10" stroke-linecap="round"/>';
      rp.forEach(function (p) { g += '<circle cx="' + p.x + '" cy="' + p.y + '" r="9" fill="#F1EDE4" stroke="#17181A" stroke-width="4"/>'; });
    }
    pts.forEach(function (p) {
      g += '<circle class="rij" cx="' + p.x + '" cy="' + p.y + '" r="25" fill="' + heat(p.v) + '" stroke="#17181A" stroke-width="3"/><text x="' + p.x + '" y="' + (p.y + 7) + '" text-anchor="middle" fill="#fff" font-size="22" font-weight="700" font-family="Arial">' + p.v + '</text>';
    });
    return '<svg class="lijn" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Jullie spanningslijn">' + g + '</svg>';
  }
  function slotHtml(i) {
    var ids = gesorteerd(), id = ids[i];
    if (!id) return '<div class="slot leeg"' + ' style="grid-column:' + (i + 2) + '"' + '>Moment ' + (i + 1) + '<br>kies hierboven een moment</div>';
    var m = mom(id), s = S.slots[id] || {}, f = s.foto ? foto(s.foto) : null;
    var cij = ''; for (var n = 1; n <= 10; n++) cij += '<button type="button" data-c="' + n + '" data-id="' + id + '" class="' + (s.cijfer === n ? 'sel' : '') + '" style="background:' + heat(n) + '" aria-label="Spanning ' + n + '">' + n + '</button>';
    return '<div class="slot"' + ' style="grid-column:' + (i + 2) + '"' + '><div class="s-kop"><span>' + esc(m.dt) + '</span><em>' + esc(EV[m.ev]) + '</em></div>' +
      '<button type="button" class="s-foto" data-foto="' + id + '" aria-label="Kies een foto">' + (f ? '<img src="/reader-img/' + f.id + '.jpg" alt="' + esc(f.t) + '"><span class="wissel">andere foto</span>' : '<span class="kies">Klik en kies een foto</span>') + '</button>' +
      '<textarea class="s-zin" data-zin="' + id + '" maxlength="140" placeholder="Wat gebeurde er? Eén zin in je eigen woorden." aria-label="Jouw zin">' + esc(s.zin || '') + '</textarea>' +
      '<div class="s-teller" data-tel="' + id + '">' + (s.zin || '').length + '/140</div><p class="s-zin-print">' + esc(s.zin || '') + '</p>' +
      (s.cijfer ? '<div class="s-cijfer-print" style="background:' + heat(s.cijfer) + '">Spanning ' + s.cijfer + '</div>' : '') +
      '<div class="cijfers" role="group" aria-label="Cijfer voor de spanning">' + cij + '</div></div>';
  }
  function vinkjes() {
    var evs = {}; S.gekozen.forEach(function (id) { evs[mom(id).ev] = 1; });
    return Object.keys(EV).map(function (k) { return '<span class="vink' + (evs[k] ? ' ok' : '') + '">' + (evs[k] ? '✓ ' : '○ ') + EV[k] + '</span>'; }).join('');
  }
  function bouw() {
    S.fase = 'bouw';
    var groepen = Object.keys(EV).map(function (k) {
      return '<div class="moment-groep"><h3>' + EV[k] + '</h3><div class="momenten">' + MOM.filter(function (m) { return m.ev === k; }).map(function (m) {
        var aan = S.gekozen.indexOf(m.id) > -1, vol = !aan && S.gekozen.length >= MAX;
        return '<button type="button" class="mom' + (aan ? ' aan' : '') + (vol ? ' vol' : '') + '" data-m="' + m.id + '" aria-pressed="' + aan + '"><b>' + m.dt + (aan ? ' ✓' : '') + '</b><span>' + esc(m.t) + '</span></button>';
      }).join('') + '</div></div>';
    }).join('');
    var slots = ''; for (var i = 0; i < MAX; i++) slots += slotHtml(i);
    app.innerHTML =
      '<div class="keuze"><span class="tag">Stap 1 · Kies zes momenten</span><div class="card" style="margin-top:12px"><div class="stappen"><span class="teller" id="teller">' + S.gekozen.length + ' van ' + MAX + ' gekozen</span><span id="vinks" class="stappen" style="margin:0">' + vinkjes() + '</span></div>' +
      '<p class="tip" style="margin:0 0 12px">Kies bij elke gebeurtenis minstens één moment. Klik nog een keer om een moment weg te halen.</p>' + groepen + '</div>' +
      '<div class="card"><h2>Stap 2 · Naam en titel</h2><div class="namen"><div class="fld"><label for="n1">Naam 1</label><input id="n1" value="' + esc(S.n1) + '"></div><div class="fld"><label for="n2">Naam 2</label><input id="n2" value="' + esc(S.n2) + '"></div></div><div class="fld" style="margin-top:12px"><label for="titel">Titel van jullie tijdlijn</label><input id="titel" maxlength="60" placeholder="Bijvoorbeeld: Van schieten naar bijna schieten" value="' + esc(S.titel) + '"></div></div>' +
      '<span class="tag">Stap 3 · Maak je tijdlijn af</span><p class="tip">Kies per moment een foto, schrijf één zin en klik een cijfer. 1 is vrede. 10 is kernoorlog. Jullie lijn begint in 1949 bij een 9.</p></div>' +
      '<div class="poster" id="poster"><div class="bar"></div><div class="p-kop"><span class="tag">Koude Oorlog · Les 2 · 1950 tot 1962</span><div class="p-titel' + (S.titel ? '' : ' leeg') + '" id="ptitel">' + esc(S.titel || 'Jullie titel') + '</div><div class="p-namen" id="pnamen">' + esc([S.n1, S.n2].filter(Boolean).join(' en ')) + '</div></div>' +
      '<div class="p-grid"><div class="p-as"><span class="hi" style="top:8%">10</span><span style="top:22%">Kernoorlog</span><span class="lo" style="top:78%">1</span><span style="top:91%">Vrede</span></div><div class="p-chart" id="chart">' + chartHtml() + '</div>' + slots + '</div>' +
      '<div class="p-voet"><img src="/logo-ma.jpg" alt="Mediacollege Amsterdam"><span>Spanning: 1 is vrede, 10 is kernoorlog</span></div></div>' +
      '<div id="meld"></div>' +
      '<div class="acties"><button class="btn licht" id="vergelijk" type="button">' + (S.vergelijk ? 'Verberg de reader-lijn' : 'Vergelijk met de reader') + '</button><button class="btn" id="dl" type="button">Download als pdf</button><button class="btn licht" id="reset" type="button">Alles wissen</button></div>' +
      '<p class="tip">Kies bij het printen "Opslaan als pdf". Mail de pdf naar je docent. Het mailadres staat op het bord.</p>' +
      '<dialog id="dlg"><h2>Kies een foto</h2><div class="fotos" id="fotos"></div><div class="acties" style="margin-top:14px"><button class="btn licht" id="sluit" type="button">Sluiten</button></div></dialog>';
    koppel();
  }
  function ververs() {
    document.getElementById('chart').innerHTML = chartHtml();
    document.getElementById('teller').textContent = S.gekozen.length + ' van ' + MAX + ' gekozen';
    document.getElementById('vinks').innerHTML = vinkjes();
  }
  function meld(h) { document.getElementById('meld').innerHTML = h || ''; }
  function koppel() {
    app.querySelectorAll('.mom').forEach(function (b) {
      b.onclick = function () {
        var id = b.dataset.m, i = S.gekozen.indexOf(id);
        if (i > -1) S.gekozen.splice(i, 1); else if (S.gekozen.length < MAX) S.gekozen.push(id); else return;
        bewaar(); var y = window.scrollY; bouw(); window.scrollTo(0, y);
      };
    });
    ['n1', 'n2'].forEach(function (k) { document.getElementById(k).oninput = function (e) { S[k] = e.target.value; bewaar(); document.getElementById('pnamen').textContent = [S.n1, S.n2].filter(Boolean).join(' en '); }; });
    document.getElementById('titel').oninput = function (e) { S.titel = e.target.value; bewaar(); var t = document.getElementById('ptitel'); t.textContent = S.titel || 'Jullie titel'; t.className = 'p-titel' + (S.titel ? '' : ' leeg'); };
    app.querySelectorAll('.s-zin').forEach(function (t) {
      t.oninput = function () { var id = t.dataset.zin; S.slots[id] = S.slots[id] || {}; S.slots[id].zin = t.value; bewaar(); app.querySelector('[data-tel="' + id + '"]').textContent = t.value.length + '/140'; t.parentNode.querySelector('.s-zin-print').textContent = t.value; };
    });
    app.querySelectorAll('.cijfers button').forEach(function (b) {
      b.onclick = function () { var id = b.dataset.id; S.slots[id] = S.slots[id] || {}; S.slots[id].cijfer = +b.dataset.c; bewaar(); var y = window.scrollY; bouw(); window.scrollTo(0, y); setTimeout(function () { var e = document.getElementById('chart'); if (e) e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 0); };
    });
    app.querySelectorAll('.s-foto').forEach(function (b) { b.onclick = function () { kiesFoto(b.dataset.foto); }; });
    document.getElementById('vergelijk').onclick = function () {
      S.vergelijk = !S.vergelijk; bewaar();
      if (S.vergelijk) {
        var ids = gesorteerd().filter(function (id) { return S.slots[id] && S.slots[id].cijfer; });
        if (!ids.length) { S.vergelijk = false; meld('<div class="meld fout">Geef eerst minstens één cijfer. Dan kun je vergelijken.</div>'); return; }
        var som = 0; ids.forEach(function (id) { som += Math.abs(S.slots[id].cijfer - REEEL[mom(id).ev]); });
        var gem = Math.round(som / ids.length * 10) / 10, tekst;
        tekst = gem <= 1 ? 'Heel dichtbij.' : gem <= 2 ? 'Redelijk dichtbij.' : 'Ver weg. Lees de kaarten nog eens in de reader.';
        bouw(); meld('<div class="meld"><b>Gemiddeld ' + String(gem).replace('.', ',') + ' punt ernaast.</b> ' + tekst + ' De stippellijn is de spanning uit de reader. Jullie lijn hoeft niet precies gelijk te zijn. Je moet kunnen uitleggen waarom jullie dat cijfer kozen.</div>');
      } else bouw();
    };
    document.getElementById('dl').onclick = function () {
      var mis = controle();
      if (mis.length) { meld('<div class="toets"><h3>Nog niet klaar</h3><ul>' + mis.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>'); document.getElementById('meld').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      meld(''); var oud = document.title; document.title = 'Tijdlijn ' + [S.n1, S.n2].join(' en ');
      window.onafterprint = function () { document.title = oud; };
      var imgs = Array.prototype.slice.call(app.querySelectorAll('.poster img')), w = imgs.map(function (im) { return im.complete ? 1 : new Promise(function (r) { im.onload = im.onerror = r; }); });
      Promise.all(w).then(function () { window.print(); });
    };
    document.getElementById('reset').onclick = function () {
      if (!confirm('Alles wissen en opnieuw beginnen?')) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      S = { fase: 'start', n1: '', n2: '', titel: '', gekozen: [], slots: {}, vergelijk: false, jaren: {}, gecheckt: false }; start();
    };
  }
  function kiesFoto(id) {
    var d = document.getElementById('dlg'), cur = (S.slots[id] || {}).foto;
    document.getElementById('fotos').innerHTML = FOTOS.map(function (f) { return '<button type="button" data-f="' + f.id + '" class="' + (cur === f.id ? 'aan' : '') + '"><img src="/reader-img/' + f.id + '.jpg" alt="' + esc(f.t) + '"><span>' + esc(f.t) + '</span></button>'; }).join('');
    document.querySelectorAll('#fotos button').forEach(function (b) { b.onclick = function () { S.slots[id] = S.slots[id] || {}; S.slots[id].foto = b.dataset.f; bewaar(); d.close(); var y = window.scrollY; bouw(); window.scrollTo(0, y); }; });
    document.getElementById('sluit').onclick = function () { d.close(); };
    d.showModal();
  }
  if (S.fase === 'bouw') bouw(); else if (S.fase === 'jaar') jaar(); else start();
})();
