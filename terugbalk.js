(function () {
  var p = location.pathname.replace(/\.html$/, '');
  var VAKKEN = {
    '/reader': 'geschiedenis', '/toetsvraag': 'geschiedenis', '/tijdlijn': 'geschiedenis', '/koude-oorlog/tijdlijn': 'geschiedenis', '/oefenen-koude-oorlog': 'geschiedenis', '/koude-oorlog/oefenen': 'geschiedenis', '/koude-oorlog/toetsvraag': 'geschiedenis', '/koude-oorlog/reader': 'geschiedenis',
    '/reader-gemeente': 'politiek', '/gemeente/reader': 'politiek',
    '/oefenen-gemeente': 'politiek', '/gemeente/oefenen': 'politiek',
    '/speurtocht-gemeente': 'politiek', '/gemeente/speurtocht': 'politiek', '/speurtocht-docent': 'politiek', '/gemeente/resultaten': 'politiek',
    '/flash': 'politiek',
    '/simulator-gemeente': 'politiek', '/gemeente/simulator': 'politiek'
  };
  var vak = VAKKEN[p];
  var NAAM = { politiek: 'Politiek', geschiedenis: 'Geschiedenis' };
  var href = vak ? '/?vak=' + vak : '/';
  var tekst = vak ? 'Terug naar ' + NAAM[vak] : 'Terug naar start';
  var bar = document.createElement('nav');
  bar.setAttribute('aria-label', 'Terug');
  bar.className = 'terugbalk';
  bar.style.cssText = 'position:sticky;top:0;z-index:50;background:' + (vak === 'politiek' ? '#14305F' : '#FF00E7') + ';padding:10px 16px;font:700 14px \'Courier New\',Courier,monospace;letter-spacing:1.5px;text-transform:uppercase;';
  var a = document.createElement('a');
  a.href = href;
  a.textContent = '← ' + tekst;
  a.style.cssText = 'color:#fff;text-decoration:none;display:inline-block;padding:4px 0;';
  bar.appendChild(a);
  document.body.insertBefore(bar, document.body.firstChild);
  var st = document.createElement('style');
  st.textContent = '@media print{.terugbalk{display:none!important}}';
  document.head.appendChild(st);
})();
