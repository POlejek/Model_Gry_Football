// Starter game model for the ready-made packs: three animated build-up schemes per format
// (phase "Atak – Otwarcie") for the Taktyka tab. Positions are given as fractions of the pitch
// (x: 0 = left touchline, 1 = right; y: 0 = own goal line, 1 = opponent's goal line) and turned into
// the tactics editor's portrait pitch, own goal at the bottom.

import { SCHEME_W, SCHEME_H } from '../utils/draw.js';
import { DEFAULT_PHASES } from '../utils/modelPhases.js';

const MARGIN = 20;
const INK = '#111827';
const KEY = 'Atak-Otwarcie';

const px = ([fx, fy]) => ({ x: Math.round(MARGIN + fx * (SCHEME_W - 2 * MARGIN)), y: Math.round(SCHEME_H - MARGIN - fy * (SCHEME_H - 2 * MARGIN)) });

// Team in its build-up shape and the opponent's pressing shape, per format.
const SHAPES = {
  '7v7': {
    system: '1-2-3-1',
    team: { 1: [0.5, 0.03], 4: [0.2, 0.12], 5: [0.8, 0.12], 8: [0.5, 0.22], 11: [0.08, 0.36], 7: [0.92, 0.36], 9: [0.5, 0.55] },
    press: { 1: [0.5, 0.97], 4: [0.35, 0.62], 5: [0.65, 0.62], 7: [0.22, 0.38], 8: [0.5, 0.42], 11: [0.78, 0.38], 9: [0.5, 0.27] },
    highPress: { 1: [0.5, 0.97], 4: [0.35, 0.52], 5: [0.65, 0.52], 7: [0.2, 0.17], 8: [0.5, 0.28], 11: [0.8, 0.17], 9: [0.5, 0.1] },
  },
  '9v9': {
    system: '1-3-2-3',
    team: { 1: [0.5, 0.03], 3: [0.15, 0.12], 5: [0.5, 0.08], 2: [0.85, 0.12], 6: [0.38, 0.24], 8: [0.62, 0.24], 11: [0.07, 0.42], 9: [0.5, 0.55], 7: [0.93, 0.42] },
    press: { 1: [0.5, 0.97], 2: [0.2, 0.6], 5: [0.5, 0.65], 3: [0.8, 0.6], 8: [0.4, 0.38], 6: [0.6, 0.38], 7: [0.2, 0.3], 9: [0.5, 0.22], 11: [0.8, 0.3] },
    highPress: { 1: [0.5, 0.97], 2: [0.2, 0.5], 5: [0.5, 0.52], 3: [0.8, 0.5], 8: [0.45, 0.33], 6: [0.58, 0.36], 7: [0.17, 0.16], 9: [0.36, 0.11], 11: [0.83, 0.16] },
  },
  '11v11': {
    system: '1-4-3-3',
    team: { 1: [0.5, 0.02], 4: [0.3, 0.07], 5: [0.7, 0.07], 3: [0.06, 0.14], 2: [0.94, 0.14], 6: [0.5, 0.2], 8: [0.33, 0.3], 10: [0.67, 0.3], 11: [0.1, 0.44], 9: [0.5, 0.48], 7: [0.9, 0.44] },
    press: { 1: [0.5, 0.98], 2: [0.15, 0.55], 5: [0.4, 0.58], 4: [0.6, 0.58], 3: [0.85, 0.55], 6: [0.5, 0.4], 10: [0.42, 0.35], 8: [0.58, 0.35], 7: [0.22, 0.25], 9: [0.44, 0.13], 11: [0.78, 0.25] },
    highPress: { 1: [0.5, 0.98], 2: [0.15, 0.4], 5: [0.42, 0.5], 4: [0.58, 0.5], 3: [0.85, 0.4], 6: [0.5, 0.27], 10: [0.38, 0.2], 8: [0.62, 0.2], 7: [0.22, 0.11], 9: [0.5, 0.07], 11: [0.78, 0.11] },
  },
};

// Roles used by the scripts below, per format: who receives where.
const ROLES = {
  '7v7': { cbL: 4, cbR: 5, wideL: 11, wideR: 7, piv: 8, mid: 8, st: 9 },
  '9v9': { cbL: 3, cbR: 2, cbC: 5, wideL: 11, wideR: 7, piv: 6, mid: 8, st: 9 },
  '11v11': { cbL: 4, cbR: 5, fbL: 3, fbR: 2, wideL: 11, wideR: 7, piv: 6, mid: 10, midL: 8, st: 9 },
};

// A scheme script: frames, each with moved players (by role or number), the ball holder and arrows.
// Arrow: [type, from, to] where from / to are a role, a number or a fraction point [fx, fy].
function scripts(format) {
  const r = ROLES[format];
  const side = format === '11v11'
    ? [
      { ball: 1, lines: [['pass', 1, 'cbL'], ['run', 'fbL', [0.05, 0.22]]] },
      { move: { cbL: [0.27, 0.1], fbL: [0.05, 0.22], midL: [0.28, 0.26] }, opp: { 9: [0.38, 0.13] }, ball: 'cbL', lines: [['pass', 'cbL', 'fbL'], ['run', 'midL', [0.25, 0.33]]] },
      { move: { fbL: [0.06, 0.25], midL: [0.25, 0.33], wideL: [0.07, 0.48] }, opp: { 7: [0.12, 0.28] }, ball: 'fbL', lines: [['pass', 'fbL', 'wideL'], ['run', 'st', [0.4, 0.46]]] },
      { move: { wideL: [0.07, 0.5], st: [0.4, 0.46] }, ball: 'wideL', lines: [['pass', 'wideL', 'st'], ['run', 'midL', [0.3, 0.52]]] },
    ]
    : [
      { ball: 1, lines: [['pass', 1, 'cbL'], ['run', 'wideL', [0.06, 0.45]]] },
      { move: { cbL: [0.17, 0.17], wideL: [0.06, 0.45], piv: [0.33, 0.28] }, opp: { 9: [0.32, 0.2], 7: [0.14, 0.38] }, ball: 'cbL', lines: [['pass', 'cbL', 'wideL'], ['run', 'piv', [0.28, 0.38]]] },
      { move: { wideL: [0.06, 0.47], piv: [0.28, 0.38], st: [0.38, 0.52] }, ball: 'wideL', lines: [['pass', 'wideL', 'st'], ['run', 'wideR', [0.75, 0.6]]] },
    ];
  const centre = [
    { ball: 1, lines: [['pass', 1, 'cbR']] },
    { move: { cbR: format === '11v11' ? [0.72, 0.1] : [0.8, 0.16], st: [0.64, 0.45] }, opp: { 9: [0.62, 0.2] }, ball: 'cbR', lines: [['pass', 'cbR', 'st'], ['run', 'mid', [0.52, 0.33]]] },
    { move: { st: [0.64, 0.45], mid: [0.52, 0.33] }, ball: 'st', lines: [['pass', 'st', 'mid']] },
    { move: { mid: [0.52, 0.35], wideL: [0.08, 0.48] }, ball: 'mid', lines: [['pass', 'mid', 'wideL'], ['run', 'st', [0.45, 0.6]]] },
  ];
  const long = [
    { press: true, move: { wideL: [0.1, 0.5], wideR: [0.9, 0.5], st: [0.5, 0.6] }, ball: 1, lines: [['long', 1, [0.88, 0.57]], ['run', 'wideR', [0.88, 0.57]]] },
    { press: true, move: { wideR: [0.88, 0.58], st: [0.58, 0.64], wideL: [0.14, 0.58] }, ball: 'wideR', lines: [['pass', 'wideR', 'st'], ['run', 'wideL', [0.3, 0.74]]] },
  ];
  return { side, centre, long, r };
}

const TEXT = {
  side: {
    name: 'Wyjście przez boczny sektor',
    comments: (system) => `<p><b>Cel:</b> wyprowadzić piłkę od bramkarza bokiem boiska, gdy przeciwnik zamyka środek.</p>`
      + `<p><b>Ustawienie (${system}):</b> obrońcy szeroko, przy linii pola karnego. Skrzydłowy daje szerokość przy linii bocznej, pomocnik pokazuje się między liniami.</p>`
      + `<ul><li>Bramkarz gra do obrońcy na dalszą nogę, otwierając go do boku.</li><li>Obrońca prowadzi piłkę do przodu, żeby przyciągnąć pressującego.</li><li>Podanie do skrzydłowego przy linii, pomocnik i napastnik dają wsparcie bliżej piłki.</li><li>Po stracie: najbliższy doskakuje, reszta zamyka środek.</li></ul>`,
  },
  centre: {
    name: 'Wyjście przez środek z trzecim zawodnikiem',
    comments: (system) => `<p><b>Cel:</b> przejść przez pierwszą linię pressingu środkiem, grając na trzeciego zawodnika.</p>`
      + `<p><b>Ustawienie (${system}):</b> napastnik schodzi głębiej między linie, pomocnik ustawia się tak, by po odegraniu przyjąć piłkę twarzą do gry.</p>`
      + `<ul><li>Obrońca gra mocne podanie w głąb do schodzącego napastnika.</li><li>Napastnik odgrywa jednym kontaktem do wbiegającego pomocnika.</li><li>Pomocnik, ustawiony przodem do bramki rywala, zmienia stronę lub gra prostopadle.</li><li>Kluczowy jest moment ruchu: pomocnik rusza w chwili podania w głąb.</li></ul>`,
  },
  long: {
    name: 'Długie podanie za linię pressingu',
    comments: (system) => `<p><b>Cel:</b> gdy przeciwnik pressuje wysoko wieloma zawodnikami, ominąć jego pierwszą linię długim podaniem.</p>`
      + `<p><b>Ustawienie (${system}):</b> skrzydłowi wysoko i szeroko, napastnik przy linii obrony rywala. Za plecami pressujących robi się wolna przestrzeń.</p>`
      + `<ul><li>Bramkarz ocenia: jeśli krótkie opcje są zamknięte, gra długo w wolny sektor.</li><li>Skrzydłowy wybiega do piłki, napastnik i drugi skrzydłowy atakują przestrzeń za obrońcami.</li><li>Po przyjęciu: szybkie podanie do przodu, zanim rywal wróci za linię piłki.</li><li>Długie podanie to też otwarcie gry, a nie wybicie.</li></ul>`,
  },
};

const arrowType = { pass: 'arrow-solid', run: 'arrow-dashed', long: 'curve-arrow-solid' };

function buildScheme(format, kind) {
  const shape = SHAPES[format];
  const { r, ...all } = scripts(format);
  const script = all[kind];
  const num = (who) => (typeof who === 'number' ? who : r[who]);
  let team = { ...shape.team };
  let lastOpp = {};
  const frames = script.map((step) => {
    Object.entries(step.move || {}).forEach(([who, pos]) => { team[num(who) ?? who] = pos; });
    const oppBase = step.press ? shape.highPress : shape.press;
    lastOpp = { ...oppBase, ...lastOpp, ...(step.opp || {}) };
    if (step.press) lastOpp = { ...shape.highPress, ...(step.opp || {}) };
    const at = (who) => (Array.isArray(who) ? who : team[num(who)]);
    const holder = at(step.ball);
    const ballPos = px(holder);
    return {
      team: Object.entries(team).map(([n, pos]) => ({ id: `t${n}`, number: String(n), rotation: 0, ...px(pos) })),
      opponent: Object.entries(lastOpp).map(([n, pos]) => ({ id: `o${n}`, number: String(n), rotation: Math.PI, ...px(pos) })),
      ball: { x: ballPos.x + 9, y: ballPos.y - 14 },
      lines: (step.lines || []).map(([kindOf, from, to]) => {
        const a = px(at(from)), b = px(at(to));
        const d = Math.hypot(b.x - a.x, b.y - a.y) || 1, cut = Math.min(18, d / 4);
        const line = {
          type: arrowType[kindOf], color: INK,
          startX: Math.round(a.x + ((b.x - a.x) * cut) / d), startY: Math.round(a.y + ((b.y - a.y) * cut) / d),
          endX: Math.round(b.x - ((b.x - a.x) * cut) / d), endY: Math.round(b.y - ((b.y - a.y) * cut) / d),
        };
        if (kindOf === 'long') Object.assign(line, { controlX: Math.round((a.x + b.x) / 2 + 90), controlY: Math.round((a.y + b.y) / 2) });
        return line;
      }),
      zones: [],
    };
  });
  return {
    id: `pack-model-${format}-${kind}`,
    name: TEXT[kind].name,
    comments: TEXT[kind].comments(shape.system),
    frames,
  };
}

export const MODEL_SYSTEMS = Object.fromEntries(Object.entries(SHAPES).map(([f, s]) => [f, s.system]));

// Tactics part of a pack: the full default phases (so a new device keeps every phase) and the schemes.
export function buildModel(format) {
  return {
    phases: JSON.parse(JSON.stringify(DEFAULT_PHASES)),
    schemes: { [format]: { [KEY]: ['side', 'centre', 'long'].map(k => buildScheme(format, k)) } },
  };
}
