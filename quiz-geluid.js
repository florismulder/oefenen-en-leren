/* Geluid voor het digibord: aanmeldmuziek, winnaarsmuziek en een aftelping die steeds urgenter wordt. */
const KQAudio = (function () {
  let ctx = null;
  let aan = false;
  let pingTimer = null;
  const fades = new Map();

  function maak(src, loop) {
    const a = new Audio(src);
    a.loop = loop;
    a.preload = 'auto';
    a.volume = 0.6;
    return a;
  }
  const muziek = {
    lobby: maak('/audio/before-the-bell-rings.mp3', true),
    winnaar: maak('/audio/top-of-the-leaderboard.mp3', false)
  };

  function zet(wil) {
    aan = !!wil;
    if (aan) {
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
      } catch (e) { ctx = null; }
    } else {
      stopAlles();
    }
  }
  function isAan() { return aan; }

  function speel(naam) {
    if (!aan) return;
    Object.keys(muziek).forEach(k => { if (k !== naam) stopMuziek(k, true); });
    const a = muziek[naam];
    if (!a) return;
    if (fades.has(a)) { clearInterval(fades.get(a)); fades.delete(a); }
    if (!a.paused && naam === 'lobby') return;
    a.currentTime = 0;
    a.volume = 0.6;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  }
  function stopMuziek(naam, snel) {
    const a = muziek[naam];
    if (!a || a.paused) return;
    if (snel) { a.pause(); a.currentTime = 0; return; }
    if (fades.has(a)) return;
    const t = setInterval(() => {
      a.volume = Math.max(0, a.volume - 0.08);
      if (a.volume <= 0.01) {
        clearInterval(t); fades.delete(a);
        a.pause(); a.currentTime = 0; a.volume = 0.6;
      }
    }, 60);
    fades.set(a, t);
  }

  function toon(freq, t, dur, vol, type) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }
  /* u loopt van 0 (net begonnen) tot 1 (tijd bijna om): hoger, harder en korter */
  function ping(u) {
    if (!aan || !ctx) return;
    const t = ctx.currentTime;
    const f = 520 + 800 * u;
    const dur = 0.12 - 0.05 * u;
    const vol = 0.16 + 0.24 * u;
    toon(f, t, dur, vol, 'sine');
    if (u > 0.7) toon(f * 1.5, t, dur, vol * 0.5, 'triangle');
  }
  function startPings(rest, totaalMs) {
    stopPings();
    const stap = () => {
      const r = rest();
      if (r <= 0) { pingTimer = null; return; }
      const u = Math.min(1, Math.max(0, 1 - r / totaalMs));
      ping(u);
      pingTimer = setTimeout(stap, Math.max(170, 1000 - 830 * Math.pow(u, 1.3)));
    };
    stap();
  }
  function stopPings() {
    if (pingTimer) { clearTimeout(pingTimer); pingTimer = null; }
  }
  function tijdOm() {
    if (!aan || !ctx) return;
    const t = ctx.currentTime;
    toon(330, t, 0.22, 0.35, 'square');
    toon(220, t + 0.24, 0.4, 0.35, 'square');
  }
  function stopAlles() {
    stopPings();
    Object.keys(muziek).forEach(k => stopMuziek(k, true));
  }

  return { zet, isAan, speel, stopMuziek, startPings, stopPings, tijdOm, stopAlles };
})();
