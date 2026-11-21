/* Zoeken in de reader Koude Oorlog. Gebruikt door de reader en de toetsvraag-pagina. */
(function () {
  var R = window.READER;
  if (!R) return;
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var KAARTEN = [];
  R.lessen.forEach(function (l) {
    var kn = 0;
    l.hoofdstukken.forEach(function (h) {
      h.kaarten.forEach(function (k) {
        kn++;
        var velden = [k.noot, k.wat, k.waarom, k.gevolg, k.persoon, k.onderschrift].concat(k.vragen || []).concat((k.beelden || []).map(function (b) { return b[1]; })).filter(Boolean);
        KAARTEN.push({ les: l.id, nr: kn, hoofdstuk: h.titel, titel: k.titel, velden: velden, tn: norm(k.titel), alles: norm([k.titel, h.titel].concat(velden).join(' ')) });
      });
    });
  });
  function zoek(q) {
    var termen = norm(q).split(/\s+/).filter(function (t) { return t.length >= 2; });
    if (!termen.length) return [];
    var res = [];
    KAARTEN.forEach(function (k) {
      if (!termen.every(function (t) { return k.alles.indexOf(t) >= 0; })) return;
      var score = 0;
      termen.forEach(function (t) { if (k.tn.indexOf(t) >= 0) score += 10; score += (k.alles.split(t).length - 1); });
      res.push({ k: k, score: score, termen: termen });
    });
    res.sort(function (a, b) { return b.score - a.score || a.k.les - b.k.les || a.k.nr - b.k.nr; });
    return res;
  }
  function markeer(tekst, termen) {
    var n = norm(tekst), marks = [];
    termen.forEach(function (t) { var i = 0; while ((i = n.indexOf(t, i)) >= 0) { marks.push([i, i + t.length]); i += t.length; } });
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', pos = 0;
    marks.forEach(function (m) { if (m[0] < pos) return; out += esc(tekst.slice(pos, m[0])) + '<mark>' + esc(tekst.slice(m[0], m[1])) + '</mark>'; pos = m[1]; });
    return out + esc(tekst.slice(pos));
  }
  function snippet(r) {
    var k = r.k, best = null;
    for (var i = 0; i < k.velden.length && !best; i++) { var n = norm(k.velden[i]); if (r.termen.some(function (t) { return n.indexOf(t) >= 0; })) best = k.velden[i]; }
    if (!best) return '';
    var n2 = norm(best), idx = Math.min.apply(null, r.termen.map(function (t) { var p = n2.indexOf(t); return p < 0 ? 1e9 : p; }));
    var van = Math.max(0, idx - 50), tot = Math.min(best.length, van + 140);
    return (van > 0 ? '… ' : '') + markeer(best.slice(van, tot), r.termen) + (tot < best.length ? ' …' : '');
  }
  function href(k) { return '/koude-oorlog/reader#les' + k.les + '-k' + k.nr; }
  /* Zoekvak in een element zetten. opties: onKies(k), linkTekst (laat een link naar de reader zien) */
  function mount(el, opt) {
    opt = opt || {};
    el.classList.add('zoek');
    el.innerHTML = '<label class="zoek-label" for="zoek-in">' + esc(opt.label || 'Zoek in de reader') + '</label>' +
      '<input type="search" id="zoek-in" class="zoek-in" placeholder="' + esc(opt.placeholder || 'Bijvoorbeeld: blokkade') + '" autocomplete="off">' +
      '<ul class="zoek-res" aria-live="polite"></ul>';
    var inp = el.querySelector('input'), ul = el.querySelector('ul');
    function toon() {
      var q = inp.value.trim();
      if (q.length < 2) { ul.innerHTML = ''; return; }
      var r = zoek(q);
      if (!r.length) { ul.innerHTML = '<li class="leeg">Niets gevonden. Probeer een ander woord.</li>'; return; }
      ul.innerHTML = r.slice(0, 8).map(function (x, i) {
        return '<li><button type="button" class="zoek-kies" data-i="' + i + '"><span class="zoek-meta">Les ' + x.k.les + ' · ' + esc(x.k.hoofdstuk) + '</span><b>' + esc(x.k.titel) + '</b><span class="zoek-sn">' + snippet(x) + '</span></button>' +
          (opt.linkTekst ? '<a class="zoek-link" target="_blank" rel="noopener" href="' + href(x.k) + '">' + esc(opt.linkTekst) + '</a>' : '') + '</li>';
      }).join('') + (r.length > 8 ? '<li class="leeg">En nog ' + (r.length - 8) + ' kaarten. Maak je zoekwoord specifieker.</li>' : '');
      ul.querySelectorAll('.zoek-kies').forEach(function (b) { b.onclick = function () { opt.onKies && opt.onKies(r[+b.dataset.i].k); }; });
    }
    inp.addEventListener('input', toon);
    return { leeg: function () { inp.value = ''; ul.innerHTML = ''; } };
  }
  window.ZOEK = { zoek: zoek, mount: mount, href: href, kaarten: KAARTEN };
})();
