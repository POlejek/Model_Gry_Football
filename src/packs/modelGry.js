// Starter game model for the ready-made packs: three animated build-up schemes per format
// (phase "Atak – Otwarcie") for the Taktyka tab, in a possession style: the goalkeeper as the first
// playmaker, centre-backs very wide, a midfielder dropping between them, rotations against man-marking
// and a planned long ball when the middle is closed.
// Positions are fractions of the pitch (x: 0 = left touchline, 1 = right; y: 0 = own goal line,
// 1 = opponent's goal line), turned into the tactics editor's portrait pitch, own goal at the bottom.

import { SCHEME_W, SCHEME_H } from '../utils/draw.js';
import { DEFAULT_PHASES } from '../utils/modelPhases.js';

const MARGIN = 20;
const INK = '#111827';
const KEY = 'Atak-Otwarcie';

const px = ([fx, fy]) => ({ x: Math.round(MARGIN + fx * (SCHEME_W - 2 * MARGIN)), y: Math.round(SCHEME_H - MARGIN - fy * (SCHEME_H - 2 * MARGIN)) });

// Per format: the system shape, the build-up shape, three opponent shapes (zonal press with two or three
// forwards, man-marking in midfield, high man-to-man press), the roles used in texts and drills, and
// three scripts. A script step moves players (`move` ours, `opp` theirs), gives the ball holder and arrows
// [type, from, to]; from / to are a player number or a point [fx, fy].
const FORMATS = {
  '7v7': {
    system: '1-2-3-1',
    team: { 1: [0.5, 0.03], 4: [0.3, 0.12], 5: [0.7, 0.12], 11: [0.12, 0.32], 6: [0.5, 0.28], 7: [0.88, 0.32], 9: [0.5, 0.52] },
    build: { 1: [0.5, 0.03], 4: [0.1, 0.1], 5: [0.9, 0.1], 6: [0.5, 0.14], 11: [0.08, 0.42], 7: [0.92, 0.42], 9: [0.5, 0.5] },
    opp: {
      press: { 1: [0.5, 0.97], 4: [0.35, 0.66], 5: [0.65, 0.66], 7: [0.18, 0.44], 11: [0.82, 0.44], 9: [0.38, 0.22], 8: [0.62, 0.22] },
      man: { 1: [0.5, 0.97], 4: [0.46, 0.6], 5: [0.65, 0.66], 7: [0.18, 0.44], 11: [0.82, 0.44], 9: [0.3, 0.17], 8: [0.5, 0.21] },
      high: { 1: [0.5, 0.97], 4: [0.42, 0.6], 5: [0.6, 0.6], 7: [0.4, 0.32], 8: [0.5, 0.21], 9: [0.2, 0.15], 11: [0.8, 0.15] },
    },
    roles: { cbL: 4, cbR: 5, piv: 6, swap: 9, free: 11, st: 9, second: '11 i 7', backs: 'Obaj obrońcy', drop: ', 6 schodzi między nich', pressers: 'napastnika i pomocnika rywala', overload: '4 na 2' },
    scripts: {
      wide: [
        { ball: 1, lines: [['run', 4, [0.1, 0.1]], ['run', 5, [0.9, 0.1]], ['run', 6, [0.5, 0.14]]] },
        { team: 'build', opp: { 9: [0.36, 0.18], 8: [0.64, 0.18] }, ball: 1, lines: [['pass', 1, 4]] },
        { move: { 9: [0.36, 0.36] }, opp: { 9: [0.2, 0.16] }, ball: 4, lines: [['pass', 4, 9], ['run', 11, [0.1, 0.6]]] },
        { move: { 11: [0.1, 0.6] }, ball: 9, lines: [['pass', 9, 11]] },
      ],
      rotation: [
        { ball: 1, lines: [['run', 6, [0.62, 0.34]], ['run', 9, [0.44, 0.26]]] },
        { move: { 6: [0.62, 0.34], 9: [0.44, 0.26] }, opp: { 8: [0.62, 0.27], 4: [0.46, 0.42] }, ball: 1, lines: [['pass', 1, 5]] },
        { ball: 5, lines: [['pass', 5, 9], ['run', 7, [0.9, 0.6]]] },
        { move: { 7: [0.9, 0.6] }, ball: 9, lines: [['pass', 9, 7]] },
      ],
      long: [
        { ball: 1, lines: [['long', 1, 9], ['run', 11, [0.3, 0.56]], ['run', 7, [0.72, 0.56]]] },
        { move: { 11: [0.3, 0.56], 7: [0.72, 0.56] }, opp: { 4: [0.46, 0.6] }, ball: 9, lines: [['pass', 9, 11], ['run', 7, [0.75, 0.72]]] },
        { move: { 7: [0.75, 0.72] }, ball: 11, lines: [['pass', 11, 7]] },
      ],
    },
  },
  '9v9': {
    system: '1-3-2-3',
    team: { 1: [0.5, 0.03], 3: [0.2, 0.12], 5: [0.5, 0.09], 2: [0.8, 0.12], 6: [0.38, 0.26], 8: [0.62, 0.26], 11: [0.1, 0.44], 9: [0.5, 0.52], 7: [0.9, 0.44] },
    build: { 1: [0.5, 0.03], 3: [0.08, 0.12], 5: [0.5, 0.12], 2: [0.92, 0.12], 6: [0.42, 0.24], 8: [0.62, 0.34], 11: [0.1, 0.48], 9: [0.5, 0.58], 7: [0.9, 0.48] },
    opp: {
      press: { 1: [0.5, 0.97], 2: [0.2, 0.64], 5: [0.5, 0.68], 3: [0.8, 0.64], 6: [0.4, 0.38], 8: [0.6, 0.42], 11: [0.22, 0.18], 9: [0.5, 0.2], 7: [0.78, 0.18] },
      man: { 1: [0.5, 0.97], 2: [0.2, 0.64], 5: [0.5, 0.68], 3: [0.8, 0.64], 6: [0.42, 0.31], 8: [0.62, 0.41], 11: [0.22, 0.18], 9: [0.5, 0.2], 7: [0.78, 0.18] },
      high: { 1: [0.5, 0.97], 2: [0.2, 0.66], 5: [0.48, 0.68], 3: [0.8, 0.66], 6: [0.42, 0.31], 8: [0.62, 0.41], 11: [0.18, 0.17], 9: [0.5, 0.2], 7: [0.82, 0.17] },
    },
    roles: { cbL: 3, cbR: 2, piv: 6, swap: 8, free: 6, st: 9, second: '8 i 11', backs: 'Boczni z trzech obrońców', drop: ', środkowy zostaje między nimi', pressers: 'trzech napastników rywala', overload: '4 na 3' },
    scripts: {
      wide: [
        { ball: 1, lines: [['run', 3, [0.08, 0.12]], ['run', 2, [0.92, 0.12]], ['run', 8, [0.62, 0.34]]] },
        { team: 'build', ball: 1, lines: [['pass', 1, 3]] },
        { move: { 6: [0.32, 0.3] }, opp: { 11: [0.16, 0.17] }, ball: 3, lines: [['pass', 3, 6], ['run', 11, [0.12, 0.6]]] },
        { move: { 11: [0.12, 0.6] }, ball: 6, lines: [['pass', 6, 11], ['run', 9, [0.42, 0.7]]] },
      ],
      rotation: [
        { ball: 1, lines: [['run', 6, [0.48, 0.38]], ['run', 8, [0.6, 0.22]]] },
        { move: { 6: [0.48, 0.38], 8: [0.6, 0.22] }, opp: { 6: [0.46, 0.45], 8: [0.62, 0.32] }, ball: 1, lines: [['pass', 1, 2]] },
        { opp: { 7: [0.84, 0.17] }, ball: 2, lines: [['pass', 2, 8], ['run', 7, [0.74, 0.36]]] },
        { move: { 7: [0.74, 0.36] }, ball: 8, lines: [['pass', 8, 7], ['run', 9, [0.6, 0.68]]] },
      ],
      long: [
        { ball: 1, lines: [['long', 1, 9], ['run', 8, [0.6, 0.5]], ['run', 11, [0.3, 0.56]]] },
        { move: { 8: [0.6, 0.5], 11: [0.3, 0.56] }, opp: { 5: [0.5, 0.67] }, ball: 9, lines: [['pass', 9, 8], ['run', 7, [0.84, 0.72]]] },
        { move: { 7: [0.84, 0.72] }, ball: 8, lines: [['pass', 8, 7]] },
      ],
    },
  },
  '11v11': {
    system: '1-4-2-3-1',
    team: { 1: [0.5, 0.03], 4: [0.35, 0.09], 5: [0.65, 0.09], 3: [0.08, 0.16], 2: [0.92, 0.16], 6: [0.38, 0.26], 8: [0.62, 0.26], 11: [0.12, 0.42], 10: [0.5, 0.38], 7: [0.88, 0.42], 9: [0.5, 0.52] },
    build: { 1: [0.5, 0.03], 4: [0.1, 0.09], 5: [0.9, 0.09], 6: [0.5, 0.13], 8: [0.4, 0.28], 3: [0.05, 0.36], 2: [0.95, 0.36], 11: [0.3, 0.47], 10: [0.58, 0.4], 7: [0.72, 0.48], 9: [0.5, 0.6] },
    opp: {
      press: { 1: [0.5, 0.97], 2: [0.2, 0.64], 4: [0.4, 0.68], 5: [0.6, 0.68], 3: [0.8, 0.64], 7: [0.18, 0.48], 6: [0.42, 0.38], 8: [0.66, 0.34], 11: [0.82, 0.48], 9: [0.38, 0.19], 10: [0.62, 0.19] },
      man: { 1: [0.5, 0.97], 2: [0.2, 0.64], 4: [0.42, 0.68], 5: [0.58, 0.68], 3: [0.8, 0.64], 7: [0.18, 0.48], 6: [0.42, 0.34], 8: [0.6, 0.46], 11: [0.82, 0.48], 9: [0.3, 0.15], 10: [0.5, 0.19] },
      high: { 1: [0.5, 0.97], 2: [0.25, 0.64], 4: [0.42, 0.68], 5: [0.58, 0.68], 3: [0.75, 0.64], 7: [0.12, 0.4], 6: [0.5, 0.2], 8: [0.42, 0.35], 11: [0.88, 0.4], 9: [0.18, 0.13], 10: [0.82, 0.13] },
    },
    roles: { cbL: 4, cbR: 5, piv: 6, swap: 8, free: 8, st: 9, second: '10 i 11', backs: 'Środkowi obrońcy', drop: ', 6 schodzi między nich, boczni obrońcy idą wysoko i szeroko', pressers: 'dwóch napastników rywala', overload: '4 na 2' },
    scripts: {
      wide: [
        { ball: 1, lines: [['run', 4, [0.1, 0.09]], ['run', 5, [0.9, 0.09]], ['run', 6, [0.5, 0.13]]] },
        { team: 'build', opp: { 9: [0.36, 0.17], 10: [0.64, 0.17] }, ball: 1, lines: [['pass', 1, 4]] },
        { move: { 8: [0.3, 0.25] }, opp: { 9: [0.2, 0.14] }, ball: 4, lines: [['pass', 4, 8], ['run', 3, [0.06, 0.55]]] },
        { move: { 3: [0.06, 0.55] }, ball: 8, lines: [['pass', 8, 11]] },
      ],
      rotation: [
        { ball: 1, lines: [['run', 6, [0.54, 0.3]], ['run', 8, [0.44, 0.15]]] },
        { move: { 6: [0.54, 0.3], 8: [0.44, 0.15] }, opp: { 10: [0.52, 0.23], 6: [0.42, 0.26] }, ball: 1, lines: [['pass', 1, 8]] },
        { opp: { 9: [0.36, 0.2] }, ball: 8, lines: [['pass', 8, 5], ['run', 7, [0.74, 0.36]]] },
        { move: { 7: [0.74, 0.36] }, ball: 5, lines: [['pass', 5, 7], ['run', 2, [0.95, 0.52]]] },
      ],
      long: [
        { ball: 1, lines: [['long', 1, 9], ['run', 10, [0.56, 0.52]], ['run', 11, [0.36, 0.56]]] },
        { move: { 10: [0.56, 0.52], 11: [0.36, 0.56] }, opp: { 4: [0.48, 0.69] }, ball: 9, lines: [['pass', 9, 10], ['run', 7, [0.7, 0.68]]] },
        { move: { 7: [0.7, 0.68] }, ball: 10, lines: [['pass', 10, 7]] },
      ],
    },
  },
};

// Which opponent shape each scheme plays against, and how it starts.
const SCHEMES = {
  wide: { start: 'team', opp: 'press' },
  rotation: { start: 'build', opp: 'man' },
  long: { start: 'build', opp: 'high' },
};
export const SCHEME_KINDS = Object.keys(SCHEMES);

const TEXT = {
  wide: {
    name: 'Wznowienie: szerocy obrońcy, bramkarz jako czwarty',
    comments: (s, r) => `<p><b>Cel:</b> ściągnąć pressing ${r.pressers} i wyjść spod niego z przewagą ${r.overload}, a potem znaleźć wolnego zawodnika dalej.</p>`
      + `<p><b>Ustawienie (${s}):</b> ${r.backs.toLowerCase()} rozchodzą się bardzo szeroko, aż do linii bocznych${r.drop}, a bramkarz jest czwartym zawodnikiem w budowaniu. Z przodu szerokość i głębia, żeby rozciągnąć rywala.</p>`
      + `<ul><li>Bramkarz jest pierwszym rozgrywającym: czeka, aż napastnik rywala ruszy, i dopiero wtedy podaje.</li>`
      + `<li>Szeroko ustawieni obrońcy wydłużają drogę pressującym: każde podanie daje więcej czasu.</li>`
      + `<li>Gdy rywal doskoczy do obrońcy, wolny jest zawodnik dalej. Szukamy go podaniem przez linię, najlepiej do półprzestrzeni.</li>`
      + `<li>Odległości ważniejsze niż ustawienie: blisko przy piłce, szeroko po drugiej stronie.</li></ul>`,
  },
  rotation: {
    name: 'Rotacja w środku przeciw kryciu indywidualnemu',
    comments: (s, r) => `<p><b>Cel:</b> rozbić krycie indywidualne rywala zamianą pozycji: jeden zawodnik wychodzi i zabiera krycie, drugi schodzi i jest wolny.</p>`
      + `<p><b>Ustawienie (${s}):</b> ${r.piv} i ${r.swap} zmieniają się w schodzeniu: ${r.piv} idzie wyżej i ciągnie za sobą kryjącego, ${r.swap} wchodzi w zwolnione miejsce.</p>`
      + `<ul><li>Ruch zaczynamy, zanim bramkarz dostanie piłkę: rywal nie może wiedzieć, kogo kryć.</li>`
      + `<li>Bramkarz gra do wolnego: zawodnika, który zszedł, albo obrońcy, którego nikt nie atakuje.</li>`
      + `<li>Kolejne podanie do trzeciego zawodnika, który wbiegł w półprzestrzeń i przyjmuje przodem do bramki rywala.</li>`
      + `<li>Najpierw 1–2 stałe rotacje. Swobodne zamiany przyjdą, gdy zespół je opanuje.</li></ul>`,
  },
  long: {
    name: 'Plan B: długie podanie do napastnika i druga piłka',
    comments: (s, r) => `<p><b>Cel:</b> gdy krótkie otwarcie jest zamknięte, przejść pressing długim podaniem i wygrać drugą piłkę.</p>`
      + `<p><b>Ustawienie (${s}):</b> rywal kryje wysoko każdego zawodnika. Warunek planu B: <b>środek zasłonięty i 6 kryty indywidualnie</b>. Wtedy bramkarz gra długo do ${r.st}.</p>`
      + `<ul><li>To decyzja, a nie wybicie: bramkarz widzi warunek i gra do napastnika.</li>`
      + `<li>Napastnik gra tyłem do bramki: zgrywa piłkę głową albo nogą do partnera.</li>`
      + `<li>${r.second} ruszają po drugą piłkę w chwili podania, nie po nim.</li>`
      + `<li>Po wygraniu drugiej piłki od razu do przodu, zanim pressujący rywale wrócą za piłkę.</li></ul>`,
  },
};

const arrowType = { pass: 'arrow-solid', run: 'arrow-dashed', long: 'curve-arrow-solid' };

function buildScheme(format, kind) {
  const F = FORMATS[format];
  const { start, opp: oppShape } = SCHEMES[kind];
  let team = { ...F[start] };
  let opp = { ...F.opp[oppShape] };
  const frames = F.scripts[kind].map((step) => {
    if (step.team) team = { ...F[step.team] };
    team = { ...team, ...(step.move || {}) };
    opp = { ...opp, ...(step.opp || {}) };
    const at = (who) => (Array.isArray(who) ? who : team[who]);
    const ballPos = px(at(step.ball));
    return {
      team: Object.entries(team).map(([n, pos]) => ({ id: `t${n}`, number: String(n), rotation: 0, ...px(pos) })),
      opponent: Object.entries(opp).map(([n, pos]) => ({ id: `o${n}`, number: String(n), rotation: Math.PI, ...px(pos) })),
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
    comments: TEXT[kind].comments(F.system, F.roles),
    frames,
  };
}

export const MODEL_SYSTEMS = Object.fromEntries(Object.entries(FORMATS).map(([f, s]) => [f, s.system]));

// Shapes for the drills of the week: our build-up shape, the opponent's press and who plays which role.
export const modelShapes = (format) => {
  const F = FORMATS[format];
  return { build: F.build, press: F.opp.press, roles: F.roles };
};

// Tactics part of a pack: the full default phases (so a new device keeps every phase) and the schemes.
export function buildModel(format) {
  return {
    phases: JSON.parse(JSON.stringify(DEFAULT_PHASES)),
    schemes: { [format]: { [KEY]: SCHEME_KINDS.map(k => buildScheme(format, k)) } },
  };
}
