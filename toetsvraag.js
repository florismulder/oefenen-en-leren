(function () {
  var KEY = 'toetsvraag-koude-oorlog';
  var ONDERWERPEN = ['Jalta', 'Truman', 'Marshall', 'Blokkade', 'NAVO', '1949'];
  var app = document.getElementById('app');
  var L = ['A', 'B', 'C', 'D'];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function laad() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function bewaar(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  var d = laad();
  app.innerHTML = '<main class="card tv">' +
    '<div class="waarschuw"><b>Gebruik een computer of laptop.</b> Op een telefoon werkt het downloaden en mailen niet goed. Pak je laptop erbij voordat je begint.</div>' +
    '<h1>Jouw toetsvraag</h1>' +
    '<p class="lead">Bedenk een meerkeuzevraag over les 1. Vul alles in. Download je formulier als pdf en mail het naar je docent.</p>' +
    '<fieldset><label class="kop" for="naam">Je naam</label><input type="text" id="naam" autocomplete="name" value="' + esc(d.naam || '') + '"></fieldset>' +
    '<fieldset><legend>Waar gaat je vraag over? Kies één</legend><div class="onderwerp">' +
    ONDERWERPEN.map(function (o) { return '<label><input type="radio" name="onderwerp" value="' + o + '"' + (d.onderwerp === o ? ' checked' : '') + '><span>' + o + '</span></label>'; }).join('') +
    '</div></fieldset>' +
    '<fieldset><label class="kop" for="vraag">Jouw vraag</label><textarea id="vraag">' + esc(d.vraag || '') + '</textarea></fieldset>' +
    '<fieldset><legend>Vier antwoorden. Kies het juiste antwoord</legend>' +
    L.map(function (l, i) { return '<div class="ant"><span class="letter">' + l + '</span><input type="text" id="a' + i + '" aria-label="Antwoord ' + l + '" value="' + esc((d.antw || [])[i] || '') + '"><label class="juist"><input type="radio" name="juist" value="' + l + '"' + (d.juist === l ? ' checked' : '') + '>juist</label></div>'; }).join('') +
    '</fieldset>' +
    '<fieldset><label class="kop" for="uitleg">Waarom is dit antwoord juist?</label><textarea id="uitleg">' + esc(d.uitleg || '') + '</textarea></fieldset>' +
    '<fieldset><label class="kop" for="plek">Waar staat het in de reader? (kaart of hoofdstuk)</label><input type="text" id="plek" value="' + esc(d.plek || '') + '"></fieldset>' +
    '<p class="fout" id="fout" role="alert"></p>' +
    '<div class="acties"><button class="btn" id="dl" type="button">Download als pdf</button><button class="btn ghost" id="leeg" type="button">Begin opnieuw</button></div>' +
    '<p class="tip">Kies bij het printen "Opslaan als pdf". Mail de pdf naar je docent. Het mailadres staat op het bord.</p>' +
    '</main>';
  function $(s) { return app.querySelector(s); }
  function lees() {
    var o = app.querySelector('input[name=onderwerp]:checked'), j = app.querySelector('input[name=juist]:checked');
    return { naam: $('#naam').value.trim(), onderwerp: o ? o.value : '', vraag: $('#vraag').value.trim(), antw: L.map(function (l, i) { return $('#a' + i).value.trim(); }), juist: j ? j.value : '', uitleg: $('#uitleg').value.trim(), plek: $('#plek').value.trim() };
  }
  app.addEventListener('input', function () { bewaar(lees()); });
  app.addEventListener('change', function () { bewaar(lees()); });
  $('#dl').onclick = function () {
    var x = lees(), mis = [];
    if (!x.naam) mis.push('je naam');
    if (!x.onderwerp) mis.push('het onderwerp');
    if (!x.vraag) mis.push('je vraag');
    if (x.antw.some(function (a) { return !a; })) mis.push('alle vier de antwoorden');
    if (!x.juist) mis.push('het juiste antwoord');
    if (!x.uitleg) mis.push('de uitleg');
    if (mis.length) { $('#fout').textContent = 'Vul nog in: ' + mis.join(', ') + '.'; return; }
    $('#fout').textContent = '';
    var oud = document.title;
    document.title = 'Toetsvraag ' + x.naam;
    window.onafterprint = function () { document.title = oud; };
    window.print();
  };
  $('#leeg').onclick = function () {
    if (!confirm('Alles wissen en opnieuw beginnen?')) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  };
})();
