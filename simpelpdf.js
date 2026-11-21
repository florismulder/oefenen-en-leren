/* Kleine PDF-maker voor tekst. Geen externe bestanden nodig. A4, Helvetica, regelafbreking op echte letterbreedtes. */
(function () {
  function tabel(lijst) {
    const t = {};
    for (let i = 0; i < lijst.length; i++) t[32 + i] = lijst[i];
    return t;
  }
  // Breedtes van Helvetica (tekens 32 t/m 126), per 1000 eenheden.
  const W_REG = tabel([278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584]);
  const W_BOLD = tabel([278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
    975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
    333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
    611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584]);
  const SPECIAAL = { 0x20ac: 0x80, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97 };
  const ZOALS = { 'à': 'a', 'á': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', 'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ç': 'c', 'ñ': 'n', 'ý': 'y', 'ÿ': 'y', 'À': 'A', 'Á': 'A', 'Â': 'A', 'Ä': 'A', 'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E', 'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I', 'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Ö': 'O', 'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U', 'Ç': 'C', 'Ñ': 'N' };

  function code(ch) {
    const c = ch.charCodeAt(0);
    if (SPECIAAL[c]) return SPECIAAL[c];
    if (c === 9 || c === 160) return 32;
    if (c >= 32 && c <= 126) return c;
    if (c >= 161 && c <= 255) return c;
    return 63;
  }
  function breedte(ch, vet, size) {
    const c = ch.charCodeAt(0);
    const t = vet ? W_BOLD : W_REG;
    let w;
    if (t[c]) w = t[c];
    else if (ZOALS[ch] && t[ZOALS[ch].charCodeAt(0)]) w = t[ZOALS[ch].charCodeAt(0)];
    else if (c === 0x2014 || c === 0x2026) w = 1000;
    else if (c === 0x2022) w = 350;
    else if (c === 0x2019 || c === 0x2018) w = vet ? 278 : 222;
    else if (c === 0x201c || c === 0x201d) w = vet ? 500 : 333;
    else w = 556;
    return (w * size) / 1000;
  }
  function tekstBreedte(s, vet, size) {
    let w = 0;
    for (const ch of s) w += breedte(ch, vet, size);
    return w;
  }
  function pdfTekst(s) {
    let uit = '';
    for (const ch of s) {
      const c = code(ch);
      if (c === 40 || c === 41 || c === 92) uit += '\\' + String.fromCharCode(c);
      else uit += String.fromCharCode(c);
    }
    return uit;
  }
  function breek(tekst, vet, size, maxB) {
    const regels = [];
    String(tekst).split(/\r?\n/).forEach(alinea => {
      if (!alinea.trim()) { regels.push(''); return; }
      const woorden = alinea.split(/\s+/).filter(Boolean);
      let regel = '';
      woorden.forEach(w => {
        let wd = w;
        while (tekstBreedte(wd, vet, size) > maxB) {
          let n = 1;
          while (n < wd.length && tekstBreedte(wd.slice(0, n + 1), vet, size) <= maxB) n++;
          if (regel) { regels.push(regel); regel = ''; }
          regels.push(wd.slice(0, n));
          wd = wd.slice(n);
        }
        const proef = regel ? regel + ' ' + wd : wd;
        if (tekstBreedte(proef, vet, size) <= maxB) regel = proef;
        else { if (regel) regels.push(regel); regel = wd; }
      });
      if (regel) regels.push(regel);
    });
    return regels;
  }

  /* blokken: [{ tekst, size, vet, voor, kleur:[r,g,b], lijn:true }] */
  function maakPdf(blokken, voet) {
    const PW = 595, PH = 842, M = 56, ONDER = 70, MAXB = PW - 2 * M;
    const paginas = [];
    let inh = [];
    let y = PH - M;
    function nieuwePagina() { inh = []; paginas.push(inh); y = PH - M; }
    nieuwePagina();
    blokken.forEach(b => {
      if (b.lijn) {
        y -= b.voor || 8;
        const k = b.kleur || [1, 0, 0.906];
        inh.push(`${k[0]} ${k[1]} ${k[2]} rg ${M} ${y.toFixed(1)} ${MAXB} 3 re f`);
        y -= 3;
        return;
      }
      const size = b.size || 11, vet = !!b.vet, lh = size * 1.4;
      y -= b.voor || 0;
      const k = b.kleur || [0.08, 0.08, 0.12];
      breek(b.tekst, vet, size, MAXB).forEach(regel => {
        if (y - lh < ONDER) nieuwePagina();
        y -= lh;
        if (regel) inh.push(`BT /${vet ? 'F2' : 'F1'} ${size} Tf ${k[0]} ${k[1]} ${k[2]} rg ${M} ${y.toFixed(1)} Td (${pdfTekst(regel)}) Tj ET`);
      });
    });
    const n = paginas.length;
    paginas.forEach((p, i) => {
      p.push(`BT /F1 9 Tf 0.4 0.4 0.45 rg ${M} 40 Td (${pdfTekst((voet || '') + (voet ? '  |  ' : '') + 'pagina ' + (i + 1) + ' van ' + n)}) Tj ET`);
    });
    // Objecten: 1 catalogus, 2 pagina's, 3 en 4 lettertypen, daarna per pagina een pagina en een inhoud.
    const objs = [];
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    const kids = paginas.map((_, i) => `${5 + i * 2} 0 R`).join(' ');
    objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`;
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    paginas.forEach((p, i) => {
      const stroom = p.join('\n');
      objs[5 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`;
      objs[6 + i * 2] = `<< /Length ${stroom.length} >>\nstream\n${stroom}\nendstream`;
    });
    let uit = '%PDF-1.4\n';
    const pos = [];
    for (let i = 1; i < objs.length; i++) {
      pos[i] = uit.length;
      uit += `${i} 0 obj\n${objs[i]}\nendobj\n`;
    }
    const xref = uit.length;
    uit += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objs.length; i++) uit += String(pos[i]).padStart(10, '0') + ' 00000 n \n';
    uit += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = new Uint8Array(uit.length);
    for (let i = 0; i < uit.length; i++) bytes[i] = uit.charCodeAt(i) & 255;
    return bytes;
  }

  function downloadPdf(blokken, bestandsnaam, voet) {
    const bytes = maakPdf(blokken, voet);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = bestandsnaam;
    document.body.appendChild(a);
    try { a.click(); } catch (e) { /* de koppeling hieronder blijft werken */ }
    setTimeout(() => { if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
    return url; // blijft bewaard zodat de leerling de pdf ook via een koppeling kan openen
  }
  window.SimplePdf = { maakPdf, downloadPdf };
})();
