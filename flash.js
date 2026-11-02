const app = document.getElementById('app');
const SET_ID = 'politiek-kk';
const CACHE = 'flash_cache_' + SET_ID;
const PROG = 'flash_prog_' + SET_ID;
const $ = s => app.querySelector(s);
setVak('politiek', false);

let data = null;
let known = {};
let queue = [];
let cur = null;
let flipped = false;
let sessionInfo = null;

try { known = JSON.parse(store.get(PROG) || '{}') || {}; } catch (e) { known = {}; }
function saveProg() { store.set(PROG, JSON.stringify(known)); }

function head() {
  return '<header class="top">' + hemicycle() + '<div class="brand">Kamer en Kabinet</div><div class="sub">Flashcards bij de reader</div></header>';
}
function render(html) { app.innerHTML = html; window.scrollTo(0, 0); }
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const SOORT = { begrip: 'Begrip', vraag: 'Vraag', som: 'Rekenen', verschil: 'Verschil', actueel: 'Actueel' };

async function load() {
  render(head() + '<main class="card"><p>De flashcards worden geladen.</p></main>');
  const r = await rpc('flash_get', { p_set: SET_ID });
  if (r && r.kaarten) {
    data = r;
    store.set(CACHE, JSON.stringify(r));
  } else {
    try { data = JSON.parse(store.get(CACHE) || 'null'); } catch (e) { data = null; }
    if (!data) {
      render(head() + `<main class="card"><h1>Even geduld</h1><p>${esc(errText((r && r.error) || 'serverfout'))}</p>
        <button class="btn" id="again" type="button">Probeer opnieuw</button>
        <a class="btn ghost" href="/">Terug naar het menu</a></main>`);
      $('#again').onclick = load;
      return;
    }
  }
  viewDecks();
}

function deckCards(id) { return data.kaarten.filter(k => id === 'alles' || k.deck === id); }
function nKnown(cards) { return cards.filter(k => known[k.id]).length; }

function viewDecks() {
  const all = data.kaarten;
  const tile = (id, titel, cards) => {
    const n = cards.length, g = nKnown(cards);
    const pct = n ? Math.round(g * 100 / n) : 0;
    return `<li class="deck">
      <div class="dt"><b>${esc(titel)}</b><span class="dn">${g} van ${n} gekend</span></div>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      <div class="drow">
        <button class="btn small" data-start="${esc(id)}" type="button">${g ? 'Verder oefenen' : 'Start'}</button>
        ${g < n && g > 0 ? '' : ''}
        <button class="btn ghost small" data-all="${esc(id)}" type="button">Alle kaarten</button>
      </div></li>`;
  };
  const items = data.decks.map(d => tile(d.id, d.titel, deckCards(d.id))).join('');
  render(head() + `<main>
    <h1>${esc(data.titel)}</h1>
    <p>${esc(data.tekst)}</p>
    <p class="small-note">Klik op de kaart om hem om te draaien. Kies daarna Wist ik of Nog oefenen. Je voortgang blijft op dit apparaat bewaard.</p>
    <ul class="decks">${tile('alles', 'Alles door elkaar', all)}${items}</ul>
    <div class="drow"><a class="btn ghost small" href="/">Terug naar het menu</a>
    <button class="btn danger small" id="reset" type="button">Voortgang wissen</button></div>
  </main>`);
  app.querySelectorAll('[data-start]').forEach(b => b.onclick = () => startDeck(b.dataset.start, false));
  app.querySelectorAll('[data-all]').forEach(b => b.onclick = () => startDeck(b.dataset.all, true));
  $('#reset').onclick = () => {
    if (!confirm('Weet je zeker dat je je voortgang wilt wissen?')) return;
    known = {}; saveProg(); viewDecks();
  };
}

function startDeck(id, alle) {
  const cards = deckCards(id);
  let pool = alle ? cards : cards.filter(k => !known[k.id]);
  if (!pool.length) pool = cards;
  const titel = id === 'alles' ? 'Alles door elkaar' : (data.decks.find(d => d.id === id) || {}).titel;
  sessionInfo = { id, titel, total: pool.length, done: 0, again: 0 };
  queue = shuffle(pool);
  next();
}

function next() {
  if (!queue.length) { viewDone(); return; }
  cur = queue.shift();
  flipped = false;
  viewCard();
}

function viewCard() {
  const k = cur;
  const pct = Math.round(sessionInfo.done * 100 / sessionInfo.total);
  render(head() + `<main>
    <div class="fc-top"><button class="btn ghost small" id="stop" type="button">Stoppen</button>
      <span class="small-note">${esc(sessionInfo.titel)} · nog ${queue.length + 1} te gaan</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <button class="fc ${flipped ? 'flipped' : ''}" id="card" type="button" aria-live="polite">
      <span class="fc-tag">${esc(SOORT[k.soort] || 'Kaart')}</span>
      <span class="fc-text">${esc(flipped ? k.achter : k.voor).replace(/\n/g, '<br>')}</span>
      ${flipped && k.extra ? `<span class="fc-extra">${esc(k.extra).replace(/\n/g, '<br>')}</span>` : ''}
      ${flipped && k.bron ? `<span class="fc-bron">Reader: ${esc(k.bron)}</span>` : ''}
      <span class="fc-hint">${flipped ? '' : 'Tik om het antwoord te zien'}</span>
    </button>
    <div class="fc-actions ${flipped ? '' : 'off'}">
      <button class="btn danger" id="again" type="button" ${flipped ? '' : 'disabled'}>Nog oefenen</button>
      <button class="btn" id="know" type="button" ${flipped ? '' : 'disabled'}>Wist ik</button>
    </div>
    <p class="small-note kb">Toetsenbord: spatie draait om, pijl links is Nog oefenen, pijl rechts is Wist ik.</p>
  </main>`);
  $('#card').onclick = flip;
  $('#stop').onclick = viewDecks;
  $('#again').onclick = () => answer(false);
  $('#know').onclick = () => answer(true);
}

function flip() {
  if (flipped) return;
  flipped = true;
  viewCardFlipped();
}
function viewCardFlipped() {
  const k = cur;
  const c = $('#card');
  c.classList.add('flipped');
  c.innerHTML = `<span class="fc-tag">${esc(SOORT[k.soort] || 'Kaart')} · antwoord</span>
    <span class="fc-text">${esc(k.achter).replace(/\n/g, '<br>')}</span>
    ${k.extra ? `<span class="fc-extra">${esc(k.extra).replace(/\n/g, '<br>')}</span>` : ''}
    ${k.bron ? `<span class="fc-bron">Reader: ${esc(k.bron)}</span>` : ''}`;
  app.querySelector('.fc-actions').classList.remove('off');
  $('#again').disabled = false;
  $('#know').disabled = false;
  $('#know').focus();
}

function answer(wist) {
  if (!flipped) return;
  if (wist) {
    known[cur.id] = 1; saveProg();
    sessionInfo.done++;
  } else {
    delete known[cur.id]; saveProg();
    sessionInfo.again++;
    const pos = Math.min(queue.length, 3 + Math.floor(Math.random() * 3));
    queue.splice(pos, 0, cur);
  }
  next();
}

function viewDone() {
  const cards = deckCards(sessionInfo.id);
  const g = nKnown(cards);
  const rest = cards.length - g;
  render(head() + `<main class="card">
    <h1>${rest === 0 ? 'Alles gekend' : 'Goed gedaan'}</h1>
    <p>${esc(sessionInfo.titel)}: je kent nu ${g} van de ${cards.length} kaarten.</p>
    ${rest ? `<p>Nog ${rest} kaart${rest === 1 ? '' : 'en'} om te oefenen.</p>` : '<p>Herhaal morgen nog een keer. Dan blijft het hangen.</p>'}
    ${rest ? '<button class="btn" id="go" type="button">Oefen de rest</button>' : ''}
    <button class="btn ghost" id="all" type="button">Alle kaarten opnieuw</button>
    <button class="btn ghost" id="back" type="button">Terug naar de stapels</button>
  </main>`);
  if (rest) $('#go').onclick = () => startDeck(sessionInfo.id, false);
  $('#all').onclick = () => startDeck(sessionInfo.id, true);
  $('#back').onclick = viewDecks;
}

document.addEventListener('keydown', e => {
  if (!cur || !$('#card')) return;
  if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (e.key === ' ' || e.key === 'Enter') {
    if (!flipped) { e.preventDefault(); flip(); }
    else if (e.key === ' ') { e.preventDefault(); }
  } else if (e.key === 'ArrowRight' && flipped) { e.preventDefault(); answer(true); }
  else if (e.key === 'ArrowLeft' && flipped) { e.preventDefault(); answer(false); }
});

load();
