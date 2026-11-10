// Ready-made week "Otwarcie gry" (building up from the goalkeeper) for 7v7, 9v9 and 11v11:
// 9 drills and 3 session plans per format. Drills are described in metres on a pitch of the right
// size and turned into the editor's drill format, so the coach can open and change every one.

const BLUE = '#1d4ed8', RED = '#dc2626', GREEN = '#16a34a', YELLOW = '#eab308', INK = '#111827';
const PHASE = 'Atak-Otwarcie';
const VERSION = '2026-11-10T00:00:00.000Z';

export const FORMATS = {
  '7v7': {
    label: '7v7', group: 'U10–U11', field: [55, 37], lines: [2, 3, 1], system: '1-2-3-1',
    rondo: { side: 10, out: 4, mid: 2 }, pattern: { back: 2, mids: 3, press: 1 }, press: { back: 2, mids: 2, press: 2 },
    third: { area: [18, 12] }, zones: { area: [30, 20], per: 3, mid: 2 }, small: { area: [30, 22], a: 4, b: 4 },
    switchRondo: { side: 10, out: 4, mid: 2 }, minutes: [12, 12, 15, 20, 5], load: ['4 × 2′, przerwa 1′', '4 × 3′, przerwa 1′', '3 × 5′, przerwa 2′'],
  },
  '9v9': {
    label: '9v9', group: 'U12–U13', field: [70, 50], lines: [3, 3, 2], system: '1-3-3-2',
    rondo: { side: 12, out: 5, mid: 2 }, pattern: { back: 3, mids: 3, press: 2 }, press: { back: 3, mids: 2, press: 3 },
    third: { area: [22, 14] }, zones: { area: [36, 24], per: 4, mid: 3 }, small: { area: [40, 30], a: 5, b: 5 },
    switchRondo: { side: 12, out: 5, mid: 2 }, minutes: [15, 15, 18, 22, 5], load: ['4 × 3′, przerwa 1′', '4 × 4′, przerwa 1′30″', '3 × 6′, przerwa 2′'],
  },
  '11v11': {
    label: '11v11', group: 'U14–U15', field: [105, 68], lines: [4, 3, 3], system: '1-4-3-3',
    rondo: { side: 14, out: 6, mid: 3 }, pattern: { back: 4, mids: 3, press: 3 }, press: { back: 4, mids: 3, press: 5 },
    third: { area: [26, 16] }, zones: { area: [42, 28], per: 4, mid: 4 }, small: { area: [50, 40], a: 6, b: 6 },
    switchRondo: { side: 14, out: 6, mid: 3 }, minutes: [15, 15, 20, 25, 5], load: ['4 × 3′, przerwa 1′', '4 × 4′, przerwa 2′', '3 × 7′, przerwa 2′'],
  },
};

// ── Drawing helpers (metres → editor pixels on a custom horizontal pitch with room beyond the lines) ──
function board(L, W) {
  const s = 1000 / Math.max(L, W), off = 50; // 20 px to the line + 30 px beyond it
  let id = 0;
  const X = (m) => Math.round(off + m * s), Y = (m) => Math.round(off + m * s);
  const frame = { items: [], lines: [], zones: [] };
  const item = (type, x, y, extra = {}) => { frame.items.push({ id: ++id, type, x: X(x), y: Y(y), rotation: 0, scale: 1, ...extra }); };
  const api = {
    pitch: { type: 'custom', orientation: 'horizontal', width: W, length: L, runoff: 30 },
    frame,
    a: (n, x, y) => item('player', x, y, { team: 'A', color: BLUE, label: String(n) }),
    b: (n, x, y) => item('player', x, y, { team: 'B', color: RED, label: String(n) }),
    gk: (x, y, team = 'A') => item('player', x, y, { team, gk: true, color: team === 'A' ? GREEN : '#7c3aed', label: '1' }),
    joker: (x, y) => item('player', x, y, { team: 'C', color: YELLOW, label: 'J' }),
    cone: (x, y) => item('cone', x, y, { color: '#f97316' }),
    ball: (x, y) => item('ball', x, y, { color: '#ffffff' }),
    goalLeft: (y) => item('goal', -0.6, y, { color: '#ffffff', rotation: -Math.PI / 2 }),
    goalRight: (y) => item('goal', L + 0.6, y, { color: '#ffffff', rotation: Math.PI / 2 }),
    miniRight: (y, x = L) => item('mini-goal', x + 0.4, y, { color: '#ffffff', rotation: Math.PI / 2 }),
    line: (type, x1, y1, x2, y2) => frame.lines.push({ id: ++id, type, color: INK, startX: X(x1), startY: Y(y1), endX: X(x2), endY: Y(y2) }),
    pass: (x1, y1, x2, y2) => api.line('arrow-solid', x1, y1, x2, y2),
    run: (x1, y1, x2, y2) => api.line('arrow-dashed', x1, y1, x2, y2),
    dribble: (x1, y1, x2, y2) => api.line('arrow-wavy', x1, y1, x2, y2),
    zone: (x, y, w, h, color = '#2563eb', opacity = 0.14) => frame.zones.push({ id: ++id, type: 'rectangle', x: X(x), y: Y(y), width: Math.round(w * s), height: Math.round(h * s), color, opacity }),
  };
  return api;
}

// n positions spread evenly across `size` metres, keeping `margin` from both edges
const spread = (n, size, margin) => Array.from({ length: n }, (_, i) => (n === 1 ? size / 2 : margin + (i * (size - 2 * margin)) / (n - 1)));

// n points on the edge of a square (side S, corner at ox, oy), starting from the middle of the left side
function onSquare(n, S, ox, oy) {
  return Array.from({ length: n }, (_, i) => {
    const t = ((i / n) * 4 + 3.5) % 4; // 0..4 around the perimeter, clockwise from the top-left corner
    const k = Math.floor(t), f = t - k;
    const p = [[f * S, 0], [S, f * S], [S - f * S, S], [0, S - f * S]][k];
    return [ox + p[0], oy + p[1]];
  });
}

const drill = (cfg, n, name, b, meta) => ({
  id: `pack-otwarcie-${cfg.label}-d${n}`, name, version: 2, createdAt: VERSION, updatedAt: VERSION,
  teamAColor: BLUE, teamBColor: RED, pitch: b.pitch, frames: [b.frame],
  meta: { category: '', duration: '', players: '', area: '', objective: '', organization: '', description: '', load: '', coachingPoints: '', variations: '', phases: [PHASE], ...meta },
});

// ── The nine drills ──────────────────────────────────────────────
function drills(cfg) {
  const [FL, FW] = cfg.field;
  const HL = FL / 2; // build-up half
  const out = [];

  { // 1. Rondo with the goalkeeper
    const { side: S, out: N, mid: M } = cfg.rondo;
    const b = board(S + 6, S + 6);
    const pts = onSquare(N, S, 3, 3);
    b.zone(3, 3, S, S);
    pts.forEach(([x, y], i) => (i === 0 ? b.gk(x, y) : b.a(i + 1, x, y)));
    spread(M, S, S * 0.3).forEach((y, i) => b.b(i + 1, 3 + S / 2 + (i % 2 ? 1.5 : -1.5), 3 + y));
    b.pass(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
    b.pass(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    b.ball(pts[0][0] + 1, pts[0][1] + 0.8);
    [[3, 3], [3 + S, 3], [3, 3 + S], [3 + S, 3 + S]].forEach(([x, y]) => b.cone(x, y));
    out.push(drill(cfg, 1, `Rondo ${N}v${M} z bramkarzem`, b, {
      category: 'Rondo', duration: String(cfg.minutes[1]), players: `${N + M} (${N}v${M})`, area: `${S}×${S} m`, load: cfg.load[0],
      objective: 'Pewne pierwsze podanie i przyjęcie pod presją. Bramkarz gra nogami jak zawodnik z pola.',
      organization: `Kwadrat ${S}×${S} m. ${N} zawodników na obwodzie (jeden z nich to bramkarz), ${M} w środku. Dwa takie pola obok siebie, zmiana odbierających po serii.`,
      description: `Zawodnicy na obwodzie utrzymują piłkę, maksymalnie 2 kontakty. Odbierający po przejęciu wyprowadza piłkę poza kwadrat. Punkt za ${N + 2} podań z rzędu oraz za podanie między dwoma odbierającymi.`,
      coachingPoints: 'Otwarta pozycja ciała przed przyjęciem. Przyjęcie dalszą nogą, w kierunku wolnej przestrzeni. Podanie mocne, po ziemi. Bramkarz stale w grze: pokazuje się do podania i mówi „czas” albo „plecy”.',
      variations: 'Łatwiej: 3 kontakty albo jeden odbierający mniej. Trudniej: 1 kontakt bramkarza, punkt tylko za podanie przez środek.',
    }));
  }

  { // 2. Build-up pattern without pressure
    const { back, mids } = cfg.pattern;
    const b = board(HL, FW);
    const by = spread(back, FW, FW * 0.14), my = spread(mids, FW, FW * 0.22);
    const bx = HL * 0.3, mx = HL * 0.62;
    b.zone(0, FW * 0.2, HL * 0.3, FW * 0.6, '#64748b', 0.1);
    b.goalLeft(FW / 2); b.gk(HL * 0.07, FW / 2);
    by.forEach((y, i) => b.a(i + 2, bx, y));
    my.forEach((y, i) => b.a(i + 2 + back, mx, y));
    [FW * 0.25, FW * 0.75].forEach(y => b.miniRight(y));
    spread(2, FW, FW * 0.38).forEach(y => b.cone(HL * 0.46, y));
    b.ball(HL * 0.1, FW / 2 + 1.2);
    b.pass(HL * 0.07, FW / 2, bx - 1, by[0] + 1);
    b.dribble(bx, by[0], bx + HL * 0.14, by[0] + 1);
    b.pass(bx + HL * 0.14, by[0] + 1, mx - 1, my[0]);
    b.pass(mx, my[0], HL - 1, FW * 0.25);
    b.run(bx, by[back - 1], bx + HL * 0.1, by[back - 1]);
    out.push(drill(cfg, 2, `Wzorzec otwarcia w ${cfg.system}`, b, {
      category: 'Gra pozycyjna', duration: String(cfg.minutes[2]), players: `${1 + back + mids} + zmiennicy`, area: `${HL}×${FW} m (połowa boiska)`, load: cfg.load[1],
      objective: `Ustawienie przy otwarciu od bramki w systemie ${cfg.system} i dwa podstawowe rozwiązania: przez bok i przez środek.`,
      organization: `Połowa boiska ${cfg.label}. Bramkarz, ${back} obrońców i ${mids} pomocników na swoich pozycjach. Na linii środkowej dwie małe bramki. Pachołki oznaczają pierwszą linię pressingu.`,
      description: 'Bramkarz wznawia grę. Rozwiązanie A: podanie do bocznego obrońcy, prowadzenie do przodu, podanie do pomocnika i zakończenie w małej bramce. Rozwiązanie B: podanie do środkowego pomocnika, odegranie i zmiana strony. Po każdej akcji zmiana zawodników na pozycjach.',
      coachingPoints: 'Szerokość i głębia przed podaniem bramkarza. Obrońcy ustawieni bokiem, widzą piłkę i boisko. Pomocnik pokazuje się między liniami, a nie obok kryjącego. Każde podanie na dalszą nogę.',
      variations: 'Dodaj jednego, potem dwóch pasywnych przeciwników w miejscu pachołków. Ogranicz liczbę kontaktów do 2.',
    }));
  }

  { // 3. Build-up against a press
    const { back, mids, press } = cfg.press;
    const b = board(HL, FW);
    const by = spread(back, FW, FW * 0.12), my = spread(mids, FW, FW * 0.3), py = spread(press, FW, FW * 0.22);
    b.zone(0, 0, HL * 0.42, FW, '#2563eb', 0.1);
    b.goalLeft(FW / 2); b.gk(HL * 0.07, FW / 2);
    by.forEach((y, i) => b.a(i + 2, HL * 0.26, y));
    my.forEach((y, i) => b.a(i + 2 + back, HL * 0.62, y));
    py.forEach((y, i) => b.b(i + 1, HL * (i % 2 ? 0.5 : 0.42), y));
    [FW * 0.2, FW * 0.5, FW * 0.8].forEach(y => b.miniRight(y));
    b.ball(HL * 0.1, FW / 2 + 1.2);
    b.pass(HL * 0.07, FW / 2, HL * 0.25, by[back - 1] - 1);
    b.run(HL * 0.42, py[press - 1], HL * 0.3, by[back - 1]);
    out.push(drill(cfg, 3, `Otwarcie pod pressingiem ${1 + back + mids}v${press}`, b, {
      category: 'Małe gry', duration: String(cfg.minutes[3]), players: `${1 + back + mids + press} (${1 + back + mids}v${press})`, area: `${HL}×${FW} m (połowa boiska)`, load: cfg.load[2],
      objective: 'Wyjście spod pressingu z przewagą liczebną: znaleźć wolnego zawodnika i przeprowadzić piłkę przez linię środkową.',
      organization: `Połowa boiska ${cfg.label}. Niebiescy: bramkarz, ${back} obrońców i ${mids} pomocników. Czerwoni: ${press} pressujących. Trzy małe bramki na linii środkowej. Każda akcja zaczyna się od bramkarza.`,
      description: 'Niebiescy budują grę od bramkarza i zdobywają punkt za podanie do jednej z trzech małych bramek. Czerwoni po odbiorze atakują dużą bramkę i mają na to 8 sekund. Po 5 akcjach zmiana pressujących.',
      coachingPoints: 'Gdzie jest przewaga? Jeśli pressuje dwóch na środku, wolny jest bok. Bramkarz jako dodatkowy zawodnik: nie boimy się podania do tyłu. Po podaniu ruch, żeby otworzyć nową linię. Spokój przy pierwszym kontakcie.',
      variations: 'Trudniej: dołóż pressującego albo ogranicz bramkarza do 2 kontaktów. Łatwiej: pressujący startują dopiero po pierwszym podaniu.',
    }));
  }

  { // 4. Third-man passing
    const [L, W] = cfg.third.area;
    const b = board(L, W);
    const p1 = [2, W / 2], p2 = [L * 0.55, W / 2], p3 = [L * 0.32, W * 0.18], p4 = [L - 2, W / 2];
    [p1, p2, p3, p4].forEach(([x, y], i) => { b.cone(x, y + 1.6); b.a(i + 1, x, y); });
    b.a(5, 0.6, W / 2 + 2.5);
    b.ball(p1[0] + 1, p1[1] - 0.9);
    b.pass(p1[0], p1[1], p2[0] - 1, p2[1]);
    b.pass(p2[0], p2[1], p3[0] + 0.8, p3[1] + 0.8);
    b.pass(p3[0], p3[1], p4[0] - 1, p4[1] - 1);
    b.run(p1[0], p1[1] - 1, p3[0] - 1.2, p3[1] + 0.5);
    out.push(drill(cfg, 4, 'Podania z trzecim zawodnikiem', b, {
      category: 'Technika', duration: String(cfg.minutes[1]), players: '5–6 na stację', area: `${L}×${W} m`, load: cfg.load[0],
      objective: 'Gra na trzeciego: podanie w głąb, odegranie i podanie do zawodnika ustawionego twarzą do gry.',
      organization: `Cztery pachołki w kształcie rombu na polu ${L}×${W} m. Po jednym zawodniku przy pachołku, dodatkowy na starcie. Dwie stacje, zmiana kierunku w połowie czasu.`,
      description: '1 podaje w głąb do 2. 2 odgrywa jednym kontaktem do 3. 3 podaje za plecy do 4. Każdy biegnie za swoim podaniem na następną pozycję, 4 prowadzi piłkę na start.',
      coachingPoints: 'Podanie w głąb mocne, odegranie miękkie. Zawodnik 2 sprawdza przestrzeń za plecami przed przyjęciem. Zawodnik 3 rusza w momencie podania, a nie po nim. Tempo: piłka nie stoi.',
      variations: 'Dodaj pasywnego obrońcę za plecami zawodnika 2. Zawodnik 2 decyduje: odegranie albo obrót z piłką, jeśli obrońca nie doskoczył.',
    }));
  }

  { // 5. Positional game in three zones
    const [L, W] = cfg.zones.area; const { per, mid } = cfg.zones;
    const b = board(L, W);
    const zw = L / 3;
    b.zone(0, 0, zw, W, '#2563eb', 0.12); b.zone(zw, 0, zw, W, '#dc2626', 0.1); b.zone(2 * zw, 0, zw, W, '#2563eb', 0.12);
    spread(per, W, W * 0.15).forEach((y, i) => { b.a(i + 1, zw * (i % 2 ? 0.7 : 0.3), y); b.a(i + 1 + per, 2 * zw + zw * (i % 2 ? 0.3 : 0.7), y); });
    spread(mid, W, W * 0.2).forEach((y, i) => b.b(i + 1, zw * 1.5 + (i % 2 ? 1.5 : -1.5), y));
    b.joker(zw * 1.5, W * 0.5);
    b.ball(zw * 0.3 + 1, W * 0.15 + 1);
    b.pass(zw * 0.7, spread(per, W, W * 0.15)[1], zw * 1.5 - 1, W * 0.5);
    b.pass(zw * 1.5, W * 0.5, 2 * zw + zw * 0.3, spread(per, W, W * 0.15)[1]);
    out.push(drill(cfg, 5, `Gra pozycyjna w trzech strefach ${per}+${per} na ${mid}`, b, {
      category: 'Gra pozycyjna', duration: String(cfg.minutes[2]), players: `${2 * per + mid + 1} (${per}+${per}+J na ${mid})`, area: `${L}×${W} m, 3 strefy`, load: cfg.load[1],
      objective: 'Przeniesienie piłki z własnej strefy do strefy ataku przez środek, z wykorzystaniem zawodnika między liniami.',
      organization: `Pole ${L}×${W} m podzielone na 3 równe strefy. Niebiescy po ${per} w strefach skrajnych, ${mid} czerwonych w strefie środkowej, joker w strefie środkowej gra z posiadającymi.`,
      description: `Niebiescy wymieniają minimum 4 podania w swojej strefie i szukają podania do drugiej strefy: przez jokera albo bezpośrednio. Jeden czerwony może wejść do strefy z piłką i pressować. Po odbiorze czerwoni zamieniają się z zespołem, który stracił piłkę.`,
      coachingPoints: 'Cierpliwość: przesuwamy piłkę, aż otworzy się linia podania. Joker pokazuje się w „okienku” między przeciwnikami. Strefa bez piłki przygotowuje się do przyjęcia: szeroko i w różnych liniach.',
      variations: 'Dwóch pressujących w strefie z piłką. Punkt tylko za podanie przez jokera. Limit 2 kontaktów.',
    }));
  }

  { // 6. Small-sided game: play out and score in mini goals
    const [L, W] = cfg.small.area; const { a, b: nb } = cfg.small;
    const b = board(L, W);
    b.zone(0, 0, L * 0.35, W, '#2563eb', 0.1);
    b.goalLeft(W / 2); b.gk(L * 0.05, W / 2);
    const back = Math.ceil(a / 2), front = a - back;
    spread(back, W, W * 0.15).forEach((y, i) => b.a(i + 2, L * 0.22, y));
    spread(front, W, W * 0.25).forEach((y, i) => b.a(i + 2 + back, L * 0.55, y));
    const pressers = Math.ceil(nb / 2);
    spread(pressers, W, W * 0.28).forEach((y, i) => b.b(i + 1, L * 0.4, y));
    spread(nb - pressers, W, W * 0.2).forEach((y, i) => b.b(i + 1 + pressers, L * 0.75, y));
    [W * 0.25, W * 0.75].forEach(y => b.miniRight(y));
    b.ball(L * 0.08, W / 2 + 1);
    out.push(drill(cfg, 6, `Gra ${a}+Br na ${nb} na dwie małe bramki`, b, {
      category: 'Małe gry', duration: String(cfg.minutes[3]), players: `${a + nb + 1} (${a}+Br v ${nb})`, area: `${L}×${W} m`, load: cfg.load[2],
      objective: 'Otwarcie gry w warunkach meczowych: decyzja, czy grać krótko, czy dłuższym podaniem za linię pressingu.',
      organization: `Pole ${L}×${W} m z dużą bramką i bramkarzem po jednej stronie oraz dwiema małymi bramkami po drugiej. Strefa otwarcia zaznaczona na 1/3 długości. Niebiescy ${a}+Br, czerwoni ${nb}.`,
      description: 'Każda akcja zaczyna się od bramkarza niebieskich. Niebiescy zdobywają bramkę w małych bramkach: 1 punkt, a 2 punkty, jeśli wcześniej wymienili 3 podania w strefie otwarcia. Czerwoni po odbiorze atakują dużą bramkę. Zmiana ról po serii.',
      coachingPoints: 'Bramkarz ocenia: ilu pressuje i gdzie jest wolny zawodnik. Jeśli przeciwnik wysoko, szukamy podania za jego linię. Po stracie natychmiast reakcja: najbliższy doskakuje, reszta zamyka środek.',
      variations: 'Czerwoni dostają dodatkowego zawodnika. Zakaz podania górą. Bramka liczy się tylko po akcji z udziałem bramkarza.',
    }));
  }

  { // 7. Rondo with a switch between two squares
    const { side: S, out: N, mid: M } = cfg.switchRondo;
    const b = board(2 * S + 8, S + 6);
    b.zone(2, 3, S, S); b.zone(S + 6, 3, S, S, '#16a34a', 0.12);
    const left = onSquare(N, S, 2, 3), right = onSquare(N, S, S + 6, 3);
    left.forEach(([x, y], i) => b.a(i + 1, x, y));
    right.forEach(([x, y], i) => b.a(i + 1 + N, x, y));
    spread(M, S, S * 0.3).forEach((y, i) => b.b(i + 1, 2 + S / 2 + (i % 2 ? 1.5 : -1.5), 3 + y));
    spread(M, 6, 0).forEach((x, i) => b.b(i + 1 + M, S + 1 + x, S + 5)); // waiting below the gap
    b.ball(left[0][0] + 1, left[0][1] + 0.8);
    b.pass(left[1][0], left[1][1], right[0][0], right[0][1]);
    out.push(drill(cfg, 7, `Rondo ${N}v${M} ze zmianą pola`, b, {
      category: 'Rondo', duration: String(cfg.minutes[1]), players: `${2 * N + 2 * M} (2 × ${N}v${M})`, area: `2 × ${S}×${S} m`, load: cfg.load[0],
      objective: 'Utrzymanie piłki pod presją i szybka zmiana strony gry, gdy przeciwnik zagęści jedną strefę.',
      organization: `Dwa kwadraty ${S}×${S} m w odstępie 4 m. W każdym ${N} niebieskich na obwodzie. ${2 * M} czerwonych: ${M} pressuje w polu z piłką, ${M} czeka między polami.`,
      description: `Niebiescy w pierwszym polu wymieniają minimum 5 podań i przenoszą piłkę do drugiego pola. Wtedy czekający czerwoni wbiegają do pressingu, a poprzedni wracają między pola. Odbiór albo przechwyt podania między polami oznacza zmianę zespołów.`,
      coachingPoints: 'Przyciągnij przeciwnika krótkimi podaniami, potem graj daleko. Podanie zmieniające stronę: mocne, po ziemi, na dalszą nogę. Drugi kwadrat ustawia się zanim piłka przyleci.',
      variations: 'Zmiana pola dozwolona już po 3 podaniach. Podanie zmieniające tylko jednym kontaktem.',
    }));
  }

  // full-pitch drills: A builds from the left goal in its system, B presses with its front players
  const team = (b, lines, side) => {
    const xs = lines.map((_, i) => 0.16 + (i * 0.42) / Math.max(1, lines.length - 1));
    const shift = side === 'B' ? FW * 0.09 : 0; // B a little lower: facing players stand side by side
    let n = 2;
    lines.forEach((count, i) => spread(count, FW, FW * (count > 3 ? 0.1 : 0.2)).forEach(y => {
      const x = FL * xs[i], yy = Math.min(FW - 2, y + (i > 0 ? shift : 0));
      if (side === 'A') b.a(n++, x, yy); else b.b(n++, FL - x, yy);
    }));
  };

  { // 8. Build-up into finishing
    const b = board(FL, FW);
    b.zone(0, 0, FL / 3, FW, '#2563eb', 0.1);
    b.goalLeft(FW / 2); b.goalRight(FW / 2);
    b.gk(FL * 0.04, FW / 2); b.gk(FL * 0.96, FW / 2, 'B');
    team(b, cfg.lines, 'A');
    const press = cfg.lines[cfg.lines.length - 1] + 1;
    spread(press, FW, FW * 0.22).forEach((y, i) => b.b(i + 2, FL * (i % 2 ? 0.29 : 0.25), y)); // between A's back line and midfield
    spread(cfg.lines[0], FW, FW * 0.15).forEach((y, i) => b.b(i + 2 + press, FL * 0.8, y));
    b.ball(FL * 0.06, FW / 2 + 1.5);
    b.pass(FL * 0.04, FW / 2, FL * 0.15, FW * 0.14);
    b.dribble(FL * 0.37, FW * 0.5, FL * 0.55, FW * 0.5);
    out.push(drill(cfg, 8, 'Otwarcie i atak na bramkę', b, {
      category: 'Finalizacja', duration: String(cfg.minutes[2]), players: `${cfg.label === '11v11' ? '20–22' : cfg.label === '9v9' ? '16–18' : '12–14'}`, area: `${FL}×${FW} m (całe boisko ${cfg.label})`, load: cfg.load[1],
      objective: 'Połączenie otwarcia z dalszą fazą: po wyjściu spod pressingu szybki atak i strzał.',
      organization: `Całe boisko ${cfg.label}. Niebiescy w ${cfg.system}. Czerwoni: ${press} pressujących w strefie otwarcia i linia obrony na własnej połowie. Strefa otwarcia zaznaczona na 1/3 boiska.`,
      description: 'Bramkarz niebieskich wznawia grę. Po wyprowadzeniu piłki ze strefy otwarcia niebiescy mają 10 sekund na zakończenie akcji strzałem. Pressujący czerwoni nie wracają za linię środkową. Po odbiorze w strefie otwarcia czerwoni atakują bramkę niebieskich.',
      coachingPoints: 'Po wyjściu ze strefy przyspieszamy: pierwsze podanie do przodu. Napastnicy dają głębię już w chwili otwarcia. Zawodnicy bez piłki wbiegają w pole karne w trzech liniach.',
      variations: 'Jeden pressujący może wrócić za linię środkową. Limit 8 sekund. Bramka po akcji z maksymalnie 5 podaniami liczy się podwójnie.',
    }));
  }

  { // 9. The match format with a build-up rule
    const b = board(FL, FW);
    b.zone(0, 0, FL / 3, FW, '#2563eb', 0.1); b.zone((2 * FL) / 3, 0, FL / 3, FW, '#dc2626', 0.08);
    b.goalLeft(FW / 2); b.goalRight(FW / 2);
    b.gk(FL * 0.04, FW / 2); b.gk(FL * 0.96, FW / 2, 'B');
    team(b, cfg.lines, 'A'); team(b, cfg.lines, 'B');
    b.ball(FL * 0.06, FW / 2 + 1.5);
    out.push(drill(cfg, 9, `Gra ${cfg.label} z zasadą otwarcia`, b, {
      category: 'Gra', duration: String(cfg.minutes[3]), players: cfg.label === '11v11' ? '22' : cfg.label === '9v9' ? '18' : '14', area: `${FL}×${FW} m (całe boisko ${cfg.label})`, load: cfg.load[2],
      objective: 'Przeniesienie nawyków z tygodnia do gry: każde wznowienie od bramki to okazja do otwarcia krótkim podaniem.',
      organization: `Mecz ${cfg.label} na pełnym boisku, oba zespoły w ${cfg.system}. Boisko podzielone na trzy strefy.`,
      description: 'Gra według przepisów formatu. Dodatkowa zasada: bramka zdobyta po akcji rozpoczętej krótkim podaniem bramkarza we własnej strefie liczy się podwójnie. Przy wznowieniu od bramki przeciwnik ustawia się poza strefą otwarcia.',
      coachingPoints: 'Trener zatrzymuje grę najwyżej 2–3 razy, tylko przy wznowieniach od bramki. Pytania zamiast gotowych odpowiedzi: „Gdzie była przewaga?”, „Kto był wolny?”. Chwalimy odwagę w grze od tyłu, także po stracie.',
      variations: 'Przeciwnik może pressować od razu. Ostatnia tercja czasu bez dodatkowych zasad.',
    }));
  }

  return out;
}

// ── Three session plans ──────────────────────────────────────────
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

function sessions(cfg, monday) {
  const m = cfg.minutes;
  const plan = (n, day, title, goal, warmup, ids, summary) => ({
    id: `pack-otwarcie-${cfg.label}-s${n}`, title: `Otwarcie gry ${cfg.label} — ${title}`, date: addDays(monday, day), group: cfg.group, goal,
    notes: `Tydzień „Otwarcie gry” (${cfg.label}, ${cfg.system}), trening ${n} z 3. Gotowy pakiet PlanGry: zmieniaj czasy, pola i liczbę zawodników pod swoją grupę.`,
    phases: [PHASE], createdAt: VERSION, updatedAt: VERSION,
    blocks: [
      { id: `pack-otwarcie-${cfg.label}-s${n}-b1`, drillId: null, title: 'Rozgrzewka', minutes: String(m[0]), note: warmup, part: 'wstepna' },
      ...ids.map((d, i) => ({ id: `pack-otwarcie-${cfg.label}-s${n}-b${i + 2}`, drillId: `pack-otwarcie-${cfg.label}-d${d}`, minutes: String(m[i + 1]), note: '', part: 'glowna' })),
      { id: `pack-otwarcie-${cfg.label}-s${n}-b5`, drillId: null, title: 'Zakończenie', minutes: String(m[4]), note: summary, part: 'koncowa' },
    ],
  });
  return [
    plan(1, 0, 'ustawienie i pierwsze podanie', 'Ustawienie zespołu przy otwarciu od bramki i pewne pierwsze podanie bramkarza.',
      'Podania w parach i trójkach w ruchu, przyjęcie kierunkowe na obie nogi. Bramkarze ćwiczą razem z zespołem. Na koniec krótka gra w „dziadka” 3v1.',
      [1, 2, 3], 'Rozciąganie. Pytania: gdzie ustawiamy się, gdy bramkarz ma piłkę? Kto jest wolny, gdy pressuje dwóch?'),
    plan(2, 2, 'gra na trzeciego zawodnika', 'Wyjście spod pressingu podaniem w głąb i odegraniem do trzeciego zawodnika.',
      'Prowadzenie piłki ze zmianą kierunku, podania po trójkącie z ruchem za piłką. Zabawa „berek z piłką” w polu 15×15 m.',
      [4, 5, 6], 'Rozciąganie. Pytania: kiedy gramy w głąb, a kiedy do boku? Co robi zawodnik po podaniu?'),
    plan(3, 4, 'otwarcie w grze', 'Zastosowanie otwarcia w grze: zmiana strony, przyspieszenie po wyjściu spod pressingu i mecz z zasadą otwarcia.',
      'Koordynacja z piłką i bez, szybkość reakcji w parach. Podania na dalszą nogę w czwórkach ze zmianą pozycji.',
      [7, 8, 9], 'Rozciąganie. Podsumowanie tygodnia: każdy zawodnik mówi jedną rzecz, którą robi przy otwarciu gry.'),
  ];
}

// The whole week for one format, ready for the app's import (drills and session plans only).
export function buildPack(format, monday) {
  const cfg = FORMATS[format];
  return { tactics: null, squad: [], settings: null, club: null, drills: drills(cfg), sessions: sessions(cfg, monday) };
}

export const PACKS = Object.values(FORMATS).map(cfg => ({
  id: cfg.label,
  title: `Otwarcie gry ${cfg.label}`,
  group: cfg.group,
  description: `Tydzień treningów w systemie ${cfg.system}: od ronda z bramkarzem do meczu z zasadą otwarcia.`,
  contents: '3 konspekty · 9 ćwiczeń',
}));
