/* Simulator Gemeenteraad: gegevens en regels. Noordstad bestaat niet. Alle namen, wensen en bedragen zijn verzonnen voor deze oefening. */
(function () {
  const BUDGET = 60000;
  const KOSTEN = { boa: 25000, bus: 35000, meld: 10000 };

  const VOORWAARDEN = [
    { id: 'portiers', titel: 'Verplichte portiers bij elk café', info: 'De cafés betalen dit zelf.', kosten: 0 },
    { id: 'geluid', titel: 'Geluidsbegrenzer in elk café', info: 'Muziek kan dan niet te hard. De cafés betalen dit zelf.', kosten: 0 },
    { id: 'proef', titel: 'Proefperiode van 1 jaar met evaluatie', info: 'Na een jaar kijkt de raad of het goed gaat.', kosten: 0 },
    { id: 'boa', titel: '2 extra BOA\'s rond het Marktplein', info: 'Een BOA is een handhaver van de gemeente.', kosten: KOSTEN.boa },
    { id: 'bus', titel: 'Extra nachtbus direct na sluitingstijd', info: 'Jongeren komen veilig thuis.', kosten: KOSTEN.bus },
    { id: 'meld', titel: 'Meldpunt overlast voor bewoners', info: 'Bewoners kunnen hier klachten melden.', kosten: KOSTEN.meld }
  ];

  function kosten(v) {
    let k = 0;
    VOORWAARDEN.forEach(o => { if (v.opt[o.id]) k += o.kosten; });
    return k;
  }

  const PARTIJEN = [
    {
      id: 'A', naam: 'Vooruit Noordstad', rol: 'Coalitie', zetels: 8, kleur: '#c2650a',
      wil: 'Een bruisend centrum en goede zaken voor ondernemers.',
      zegt: 'Wij willen een levendig centrum. Maak het niet duurder of ingewikkelder dan nodig.',
      wensen: [
        { t: 'Cafés mogen tot 04.00 uur open', w: 35, f: v => v.ext === 4 ? 1 : v.ext === 3 ? 0.5 : 0 },
        { t: 'Op vrijdag én zaterdag', w: 20, f: v => v.dagen === 'vrza' ? 1 : 0 },
        { t: 'De gemeente geeft hooguit € 35.000 uit', w: 20, f: v => { const k = kosten(v); return k <= 35000 ? 1 : k <= 45000 ? 0.5 : 0; } },
        { t: 'Geen verplichte portiers voor ondernemers', w: 15, f: v => v.opt.portiers ? 0 : 1 },
        { t: 'Jongeren blijven in Noordstad uitgaan', w: 10, f: v => v.opt.bus ? 1 : v.ext === 4 ? 0.5 : 0 }
      ]
    },
    {
      id: 'B', naam: 'Leefbaar Centrum', rol: 'Coalitie', zetels: 4, kleur: '#7a3fb5',
      wil: 'Rust en leefbare straten voor bewoners.',
      zegt: 'Wij zijn er voor de bewoners. Latere sluitingstijden mogen alleen met goede regels tegen overlast.',
      wensen: [
        { t: 'Cafés sluiten niet later dan 03.00 uur', w: 25, f: v => v.ext === 3 ? 1 : 0 },
        { t: 'Alleen op zaterdag', w: 10, f: v => v.dagen === 'za' ? 1 : 0 },
        { t: 'Verplichte portiers bij elk café', w: 15, f: v => v.opt.portiers ? 1 : 0 },
        { t: 'Geluidsbegrenzer in elk café', w: 15, f: v => v.opt.geluid ? 1 : 0 },
        { t: 'Proefperiode van 1 jaar met evaluatie', w: 15, f: v => v.opt.proef ? 1 : 0 },
        { t: 'Meldpunt overlast voor bewoners', w: 10, f: v => v.opt.meld ? 1 : 0 },
        { t: 'Extra BOA\'s in de woonstraten', w: 10, f: v => v.opt.boa ? 1 : 0 }
      ]
    },
    {
      id: 'C', naam: 'Sterk & Veilig', rol: 'Oppositie', zetels: 5, kleur: '#b3263c',
      wil: 'Veiligheid op straat en zuinig met geld.',
      zegt: 'Veiligheid gaat voor. En wij letten op elke euro van de inwoners.',
      wensen: [
        { t: 'Extra BOA\'s op straat', w: 30, f: v => v.opt.boa ? 1 : 0 },
        { t: 'Verplichte portiers bij elk café', w: 20, f: v => v.opt.portiers ? 1 : 0 },
        { t: 'Cafés sluiten niet later dan 03.00 uur', w: 20, f: v => v.ext === 3 ? 1 : 0 },
        { t: 'De gemeente geeft hooguit € 35.000 uit', w: 15, f: v => kosten(v) <= 35000 ? 1 : 0 },
        { t: 'Proefperiode met evaluatie', w: 15, f: v => v.opt.proef ? 1 : 0 }
      ]
    },
    {
      id: 'D', naam: 'Groen & Jong', rol: 'Oppositie', zetels: 4, kleur: '#1a7f4b',
      wil: 'Een goede avond voor jongeren en geld voor vervoer.',
      zegt: 'Jongeren willen uitgaan en veilig thuiskomen. Daar moet geld naartoe, niet naar meer handhaving.',
      wensen: [
        { t: 'Extra nachtbus direct na sluitingstijd', w: 45, f: v => v.opt.bus ? 1 : 0 },
        { t: 'Cafés mogen tot 04.00 uur open', w: 10, f: v => v.ext === 4 ? 1 : v.ext === 3 ? 0.5 : 0 },
        { t: 'Op vrijdag én zaterdag', w: 10, f: v => v.dagen === 'vrza' ? 1 : 0 },
        { t: 'Geluidsbegrenzer in elk café', w: 10, f: v => v.opt.geluid ? 1 : 0 },
        { t: 'Meldpunt overlast voor bewoners', w: 5, f: v => v.opt.meld ? 1 : 0 },
        { t: 'Geen extra BOA\'s, geld gaat naar vervoer', w: 10, f: v => v.opt.boa ? 0 : 1 },
        { t: 'Proefperiode van 1 jaar met evaluatie', w: 10, f: v => v.opt.proef ? 1 : 0 }
      ]
    }
  ];

  const GESPREKKEN = [
    {
      id: 'horeca', wie: 'Café-eigenaar', plek: 'Voor de deur van café De Kroon', icoon: '🍺',
      quote: 'Om 02.00 uur moeten honderden jongeren tegelijk naar buiten. Dat geeft drukte en ruzie. Mogen wij langer open, dan vertrekken ze verspreid.',
      argTitel: 'Verspreid vertrekken', argTekst: 'Als gasten op verschillende tijden naar huis gaan, is het rustiger op straat.'
    },
    {
      id: 'bewoner', wie: 'Bewoner', plek: 'Op het balkon boven het plein', icoon: '🏠',
      quote: 'Wij wonen hier met jonge kinderen. Om half drie is het eindelijk stil. Zijn de cafés tot vier uur open, dan liggen wij elk weekend wakker.',
      argTitel: 'Nachtrust', argTekst: 'Bewoners slapen slecht door lawaai na 02.00 uur. Geluidsregels en een meldpunt helpen.'
    },
    {
      id: 'agent', wie: 'Wijkagent', plek: 'Bij de politieauto op de hoek', icoon: '👮',
      quote: 'Na sluitingstijd zie ik de meeste ruzies. Met toezicht op straat blijft het meestal rustig. Dat kost wel mensen of geld.',
      argTitel: 'Toezicht', argTekst: 'Met BOA\'s en portiers zijn er minder ruzies op straat.'
    },
    {
      id: 'jongeren', wie: 'Jongerenvertegenwoordiger', plek: 'Bij de bushalte', icoon: '🎧',
      quote: 'Veel van ons reizen na 02.00 uur naar een andere stad. Het laatste stuk lopen we alleen naar huis. Een nachtbus zou veel schelen.',
      argTitel: 'Jongeren veilig thuis', argTekst: 'Jongeren gaan nu naar een andere stad. Een nachtbus brengt ze veilig thuis.'
    }
  ];

  const g = (d, t) => ({ d, t });
  const DEBAT = [
    {
      id: 'q1', partij: 'C', wie: 'Fractievoorzitter van Partij C',
      vraag: 'Voorzitter, wie let om drie uur ’s nachts op het plein? En wat kost dat de inwoners?',
      ant: {
        agent: v => (v.opt.boa || v.opt.portiers) ? g(15, 'Goed antwoord. In je voorstel staat toezicht. Partij C knikt.') : g(-10, 'Je zegt dat er toezicht komt, maar dat staat niet in je voorstel. Partij C gelooft je niet.'),
        horeca: () => g(5, 'Partij C vindt het een prima idee. Maar je beantwoordt de vraag over toezicht en kosten maar half.'),
        bewoner: () => g(0, 'Dat gaat over bewoners. Partij C wilde iets anders weten.'),
        jongeren: () => g(0, 'Dat gaat over jongeren. Partij C wilde iets anders weten.'),
        geen: () => g(-5, 'Je geeft geen echt antwoord. Partij C vindt dat zwak.')
      }
    },
    {
      id: 'q2', partij: 'D', wie: 'Fractievoorzitter van Partij D',
      vraag: 'Veel jongeren gaan nu naar een andere stad. Wat wint Noordstad hiermee? En hoe komen jongeren veilig thuis?',
      ant: {
        jongeren: v => v.opt.bus ? g(15, 'Goed antwoord. De nachtbus staat in je voorstel. Partij D is tevreden.') : g(-10, 'Je zegt dat jongeren veilig thuiskomen, maar er is geen nachtbus. Partij D gelooft je niet.'),
        horeca: () => g(5, 'Verspreid vertrekken helpt een beetje. Maar de jongeren zijn nog niet thuis.'),
        agent: () => g(0, 'Toezicht helpt. Maar de vraag ging over veilig thuiskomen.'),
        bewoner: () => g(0, 'Dat gaat over bewoners. Partij D wilde iets anders weten.'),
        geen: () => g(-5, 'Je geeft geen echt antwoord. Partij D vindt dat zwak.')
      }
    },
    {
      id: 'q3', partij: 'B', wie: 'Fractievoorzitter van Partij B',
      vraag: 'Mijn buren slapen slecht. Hoe voorkomt de wethouder overlast voor bewoners?',
      ant: {
        bewoner: v => (v.opt.geluid || v.opt.meld || v.opt.proef) ? g(15, 'Goed antwoord. In je voorstel staan regels tegen overlast. Partij B knikt.') : g(-10, 'Je belooft rust, maar in je voorstel staat geen regel tegen overlast. Partij B gelooft je niet.'),
        agent: v => (v.opt.boa || v.opt.portiers) ? g(10, 'Toezicht helpt de bewoners. Partij B is er redelijk tevreden mee.') : g(-10, 'Je zegt dat er toezicht komt, maar dat staat niet in je voorstel. Partij B gelooft je niet.'),
        horeca: () => g(0, 'Dat helpt de bewoners niet. Partij B wilde iets anders weten.'),
        jongeren: () => g(0, 'Dat gaat over jongeren. Partij B wilde iets anders weten.'),
        geen: () => g(-5, 'Je geeft geen echt antwoord. Partij B vindt dat zwak.')
      }
    },
    {
      id: 'q4', partij: 'A', wie: 'Fractievoorzitter van Partij A',
      vraag: 'Voorzitter, wat betekent dit voor onze ondernemers in het centrum? Wordt het niet te duur en te ingewikkeld?',
      ant: {
        horeca: v => !v.opt.portiers ? g(15, 'Goed antwoord. Ondernemers krijgen geen extra verplichte kosten. Partij A knikt.') : g(-10, 'Je zegt dat het simpel blijft, maar je voorstel verplicht portiers. Partij A gelooft je niet.'),
        jongeren: () => g(5, 'Als jongeren blijven, is dat goed voor de ondernemers. Maar je beantwoordt de vraag over kosten niet.'),
        agent: () => g(0, 'Toezicht kost geld en tijd. Partij A wilde iets anders weten.'),
        bewoner: () => g(0, 'Dat gaat over bewoners. Partij A wilde iets anders weten.'),
        geen: () => g(-5, 'Je geeft geen echt antwoord. Partij A vindt dat zwak.')
      }
    }
  ];

  /* Schorsing: een partij trekt haar steun in. Dit kan de wethouder toezeggen. herstel = hoeveel vertrouwen terugkomt (1 = alles, 0,5 = de helft). */
  const TOEZEGGINGEN = {
    A: [
      { id: 'a1', tekst: 'Ik schrap de verplichte portiers', ok: v => v.opt.portiers, doe: v => { v.opt.portiers = false; }, herstel: 1 },
      { id: 'a2', tekst: 'Ik maak het ook op vrijdag mogelijk', ok: v => v.dagen === 'za', doe: v => { v.dagen = 'vrza'; }, herstel: 1 },
      { id: 'a3', tekst: 'Ik verleng de sluitingstijd naar 04.00 uur', ok: v => v.ext !== 4, doe: v => { v.ext = 4; }, herstel: 0.5 }
    ],
    B: [
      { id: 'b1', tekst: 'Ik voeg een geluidsbegrenzer in elk café toe', ok: v => !v.opt.geluid, doe: v => { v.opt.geluid = true; }, herstel: 1 },
      { id: 'b2', tekst: 'Ik voeg een meldpunt overlast toe', ok: v => !v.opt.meld, doe: v => { v.opt.meld = true; }, herstel: 1 },
      { id: 'b3', tekst: 'Ik voeg een proefperiode van 1 jaar toe', ok: v => !v.opt.proef, doe: v => { v.opt.proef = true; }, herstel: 0.5 },
      { id: 'b4', tekst: 'Ik beperk het tot alleen zaterdag', ok: v => v.dagen === 'vrza', doe: v => { v.dagen = 'za'; }, herstel: 0.5 }
    ],
    C: [
      { id: 'c1', tekst: 'Ik voeg 2 extra BOA\'s toe', ok: v => !v.opt.boa, doe: v => { v.opt.boa = true; }, herstel: 1 },
      { id: 'c2', tekst: 'Ik maak portiers verplicht', ok: v => !v.opt.portiers, doe: v => { v.opt.portiers = true; }, herstel: 1 },
      { id: 'c3', tekst: 'Ik voeg een proefperiode van 1 jaar toe', ok: v => !v.opt.proef, doe: v => { v.opt.proef = true; }, herstel: 0.5 }
    ],
    D: [
      { id: 'd1', tekst: 'Ik voeg een extra nachtbus toe', ok: v => !v.opt.bus, doe: v => { v.opt.bus = true; }, herstel: 1 },
      { id: 'd2', tekst: 'Ik voeg een geluidsbegrenzer in elk café toe', ok: v => !v.opt.geluid, doe: v => { v.opt.geluid = true; }, herstel: 0.5 },
      { id: 'd3', tekst: 'Ik voeg een proefperiode van 1 jaar toe', ok: v => !v.opt.proef, doe: v => { v.opt.proef = true; }, herstel: 0.5 }
    ]
  };

  const STAPPEN = [
    { id: 's1', dag: 'Vrijdag', tijd: '01:45', plek: 'Marktplein', kort: 'Praat met de mensen' },
    { id: 's2', dag: 'Maandag', tijd: '10:00', plek: 'Collegekamer', kort: 'Maak je voorstel' },
    { id: 's3', dag: 'Dinsdag', tijd: '14:00', plek: 'Fractieoverleg', kort: 'Zoek steun' },
    { id: 's4', dag: 'Donderdag', tijd: '20:30', plek: 'Raadszaal', kort: 'Beantwoord de vragen' },
    { id: 's5', dag: 'Donderdag', tijd: '21:45', plek: 'Stemming', kort: 'De raad stemt' },
    { id: 's6', dag: 'Vrijdag', tijd: '09:00', plek: 'Raadsbesluit', kort: 'Schrijf het nieuws' }
  ];

  const BEGRIPPEN = [
    ['Gemeenteraad', 'De raad is gekozen door de inwoners. Hij maakt de regels, bepaalt waar het geld heen gaat en controleert het college. Noordstad heeft 21 zetels.'],
    ['College van B&W', 'Het dagelijks bestuur van de gemeente. De burgemeester en de wethouders zitten erin. Het college maakt de voorstellen.'],
    ['Wethouder', 'Een wethouder zit in het college. Een wethouder zit niet in de raad en mag dus niet stemmen.'],
    ['Burgemeester', 'De burgemeester is voorzitter van de raad. Hij of zij let ook op de openbare orde en veiligheid.'],
    ['Fractie', 'De raadsleden van één partij samen.'],
    ['Coalitie en oppositie', 'De coalitie zijn de partijen die samen besturen. De oppositie zijn de andere partijen. Zij controleren het college.'],
    ['Meerderheid', 'Meer dan de helft van de zetels. In Noordstad zijn dat 11 van de 21.'],
    ['Raadsvoorstel', 'Het plan van het college waar de raad over stemt.'],
    ['Raadsbesluit', 'De uitslag van de stemming, op papier.'],
    ['BOA', 'Een handhaver van de gemeente. Hij of zij let op de regels op straat.'],
    ['Evaluatie', 'Na een tijd kijken of een plan werkt.']
  ];

  window.SIM = { BUDGET, DREMPEL: 65, KOSTEN, VOORWAARDEN, PARTIJEN, GESPREKKEN, DEBAT, TOEZEGGINGEN, STAPPEN, BEGRIPPEN, kosten };
})();
