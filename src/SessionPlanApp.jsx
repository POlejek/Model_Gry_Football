import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Trash2, ArrowUp, ArrowDown, Printer, Search, X, Copy, FileText, ExternalLink, ClipboardList, Download, Upload,
} from 'lucide-react';
import { renderDrillImage } from './TrainingDrillApp.jsx';
import { TYPE_LABELS, META_FIELDS, safeFileName } from './utils/drill.js';
import { phaseOptions, readModelPhases, phaseLabel, readDrillLibrary } from './utils/modelPhases.js';

const SESSIONS_KEY = 'trainingSessions';
const DRILLS_KEY = 'trainingDrillLibrary';
export const SESSION_FORMAT = 'model-gry-training-session';
export const SESSION_LIBRARY_FORMAT = 'model-gry-session-library';

function downloadJson(data, fileName) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Sessions from a session file or a session-library file, plus the drills they reference.
function parseSessionFile(data) {
  if (data?.format === SESSION_FORMAT && data.session) return { sessions: [data.session], drills: data.drills || [] };
  if (data?.format === SESSION_LIBRARY_FORMAT && Array.isArray(data.sessions)) return { sessions: data.sessions, drills: data.drills || [] };
  return null;
}

const isValidSession = (s) => s && typeof s === 'object' && Array.isArray(s.blocks);

const readSessions = () => {
  try {
    const list = JSON.parse(localStorage.getItem(SESSIONS_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);
const newSession = () => ({
  id: uid('session'), title: '', date: today(), group: '', goal: '', notes: '', phases: [], blocks: [],
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});
const minutesOf = (b) => Math.max(0, parseInt(b.minutes, 10) || 0);
const formatDate = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '');

// Equipment needed for the whole session: for each type the largest amount any single drill uses.
function sessionEquipment(drills) {
  const max = {};
  drills.forEach(d => {
    const perType = {};
    (d.frames || []).forEach(f => (f.items || []).forEach(i => {
      if (['player', 'text', 'step', 'coach'].includes(i.type) || !TYPE_LABELS[i.type]) return;
      (perType[i.type] ||= new Set()).add(i.id);
    }));
    Object.entries(perType).forEach(([t, ids]) => { max[t] = Math.max(max[t] || 0, ids.size); });
  });
  return Object.entries(max).map(([t, n]) => `${TYPE_LABELS[t]} ×${n}`).join(', ');
}

const inputCls = 'w-full px-2 py-1.5 bg-white/10 border border-white/15 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400';
const btn = 'px-2.5 py-1.5 rounded-md text-sm bg-white/5 hover:bg-white/10 text-slate-200 transition-colors inline-flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none';
const iconBtn = 'p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none';

export default function SessionPlanApp({ active = true, onOpenDrill = null }) {
  const [sessions, setSessions] = useState(readSessions);
  const [currentId, setCurrentId] = useState(() => readSessions()[0]?.id || null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerPhase, setPickerPhase] = useState('');

  // drills and phases live in the other tabs; refresh whenever this tab becomes visible
  const [libraryVersion, setLibraryVersion] = useState(0);
  const library = useMemo(() => readDrillLibrary(), [active, showPicker, libraryVersion]);
  const options = useMemo(() => phaseOptions(readModelPhases()), [active]);
  const drillById = useMemo(() => new Map(library.map(d => [d.id, d])), [library]);

  const thumbs = useMemo(() => {
    const map = new Map();
    library.forEach(d => {
      try { map.set(d.id, renderDrillImage(d, 0.4)); } catch { /* broken drill: no thumbnail */ }
    });
    return map;
  }, [library]);

  useEffect(() => {
    try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); } catch { /* storage full */ }
  }, [sessions]);

  const current = sessions.find(s => s.id === currentId) || null;

  const patchSession = (patch) => setSessions(list => list.map(s => (
    s.id === currentId ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s
  )));
  const patchBlocks = (fn) => patchSession({ blocks: fn(current.blocks) });

  const createSession = () => {
    const s = newSession();
    setSessions(list => [s, ...list]);
    setCurrentId(s.id);
  };

  const duplicateSession = () => {
    if (!current) return;
    const copy = { ...current, id: uid('session'), title: `${current.title || 'Konspekt'} (kopia)`, date: today(),
      blocks: current.blocks.map(b => ({ ...b, id: uid('block') })), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setSessions(list => [copy, ...list]);
    setCurrentId(copy.id);
  };

  const deleteSession = (id) => {
    if (!window.confirm('Usunąć ten konspekt?')) return;
    const rest = sessions.filter(s => s.id !== id);
    setSessions(rest);
    if (id === currentId) setCurrentId(rest[0]?.id || null);
  };

  // ── Download / import ──
  const importInputRef = useRef(null);
  const [message, setMessage] = useState(null);
  const flash = (text, tone = 'ok') => {
    setMessage({ text, tone });
    setTimeout(() => setMessage(null), 5000);
  };

  // drills are bundled so the file works on another device / browser
  const drillsUsedBy = (list) => {
    const ids = new Set(list.flatMap(s => s.blocks.map(b => b.drillId).filter(Boolean)));
    return library.filter(d => ids.has(d.id));
  };

  const exportSession = () => {
    if (!current) return;
    downloadJson(
      { format: SESSION_FORMAT, version: 1, exportedAt: new Date().toISOString(), session: current, drills: drillsUsedBy([current]) },
      `konspekt_${safeFileName(current.title || 'trening')}${current.date ? `_${current.date}` : ''}.json`,
    );
  };

  const exportAllSessions = () => {
    if (!sessions.length) return;
    downloadJson(
      { format: SESSION_LIBRARY_FORMAT, version: 1, exportedAt: new Date().toISOString(), sessions, drills: drillsUsedBy(sessions) },
      `biblioteka_konspektow_${today()}.json`,
    );
  };

  const importFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    const incomingSessions = [];
    const incomingDrills = [];
    let badFiles = 0;
    await Promise.all(files.map(async (file) => {
      try {
        const parsed = parseSessionFile(JSON.parse(await file.text()));
        if (!parsed) throw new Error('format');
        incomingSessions.push(...parsed.sessions.filter(isValidSession));
        incomingDrills.push(...parsed.drills.filter(d => d && typeof d.id === 'string' && Array.isArray(d.frames)));
      } catch {
        badFiles++;
      }
    }));

    // drills: add the ones this device does not have yet (an existing drill with the same id is kept)
    let drillLibrary = readDrillLibrary();
    const knownDrills = new Set(drillLibrary.map(d => d.id));
    const newDrills = incomingDrills.filter(d => !knownDrills.has(d.id) && knownDrills.add(d.id));
    if (newDrills.length) {
      drillLibrary = [...newDrills, ...drillLibrary];
      try { localStorage.setItem(DRILLS_KEY, JSON.stringify(drillLibrary)); } catch { flash('Brak miejsca w pamięci przeglądarki', 'warn'); return; }
    }

    // sessions: identical ones (same id and last change) are skipped, others are added as new
    let skipped = 0;
    const added = [];
    incomingSessions.forEach((s) => {
      const known = [...added, ...sessions];
      if (known.some(x => x.id === s.id && x.updatedAt === s.updatedAt)) { skipped++; return; }
      const idTaken = !s.id || known.some(x => x.id === s.id);
      added.push({ ...newSession(), ...s, id: idTaken ? uid('session') : s.id, blocks: s.blocks.map(b => ({ ...b, id: b.id || uid('block') })) });
    });
    if (added.length) {
      setSessions(list => [...added, ...list]);
      setCurrentId(added[0].id);
    }
    setLibraryVersion(v => v + 1);

    const parts = [`Zaimportowano konspekty: ${added.length}`];
    if (newDrills.length) parts.push(`nowe ćwiczenia: ${newDrills.length}`);
    if (skipped) parts.push(`pominięte duplikaty: ${skipped}`);
    if (badFiles) parts.push(`błędne pliki: ${badFiles}`);
    flash(parts.join(' · '), badFiles ? 'warn' : 'ok');
  };

  const addDrillBlock = (drill) => {
    patchBlocks(blocks => [...blocks, { id: uid('block'), drillId: drill.id, minutes: String(parseInt(drill.meta?.duration, 10) || 15), note: '' }]);
    setShowPicker(false);
  };
  const addTextBlock = () => patchBlocks(blocks => [...blocks, { id: uid('block'), drillId: null, title: 'Rozgrzewka', minutes: '10', note: '' }]);
  const moveBlock = (i, d) => patchBlocks(blocks => {
    const next = [...blocks];
    const [b] = next.splice(i, 1);
    next.splice(i + d, 0, b);
    return next;
  });
  const patchBlock = (id, patch) => patchBlocks(blocks => blocks.map(b => (b.id === id ? { ...b, ...patch } : b)));
  const removeBlock = (id) => patchBlocks(blocks => blocks.filter(b => b.id !== id));

  const total = current ? current.blocks.reduce((sum, b) => sum + minutesOf(b), 0) : 0;
  const sessionDrills = current ? current.blocks.map(b => drillById.get(b.drillId)).filter(Boolean) : [];
  const trainedPhases = [...new Set(sessionDrills.flatMap(d => d.meta?.phases || []))];
  const equipment = sessionEquipment(sessionDrills);

  const pickerList = library.filter(d => {
    const q = pickerSearch.trim().toLowerCase();
    if (pickerPhase && !(d.meta?.phases || []).includes(pickerPhase)) return false;
    return !q || d.name.toLowerCase().includes(q) || (d.meta?.category || '').toLowerCase().includes(q);
  });

  // Print: the plan lives in a body-level portal; the body class makes print CSS show only the plan,
  // so the browser's own Ctrl+P on other tabs still prints the app as before.
  const printPlan = () => {
    document.body.classList.add('printing-session');
    const cleanup = () => {
      document.body.classList.remove('printing-session');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  let minute = 0;
  const timed = current ? current.blocks.map(b => {
    const from = minute;
    minute += minutesOf(b);
    return { block: b, from, to: minute, drill: drillById.get(b.drillId) };
  }) : [];

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Session list ── */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col bg-slate-950/80 border-r border-white/10 min-h-0">
        <div className="p-3 border-b border-white/10">
          <button onClick={createSession} className="w-full h-9 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium inline-flex items-center justify-center gap-1.5">
            <Plus size={15} /> Nowy konspekt
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && <p className="text-xs text-slate-500 p-2">Brak konspektów.</p>}
          {sessions.map(s => {
            const mins = s.blocks.reduce((sum, b) => sum + minutesOf(b), 0);
            return (
              <div key={s.id} className={`group flex items-center gap-1 rounded-lg px-2 py-2 ${s.id === currentId ? 'bg-blue-600/20 ring-1 ring-blue-500/50' : 'hover:bg-white/5'}`}>
                <button onClick={() => setCurrentId(s.id)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm text-slate-100 truncate">{s.title || 'Bez tytułu'}</p>
                  <p className="text-xs text-slate-500 truncate">{[s.date && formatDate(s.date), `${mins} min`].filter(Boolean).join(' · ')}</p>
                </button>
                <button onClick={() => deleteSession(s.id)} className={iconBtn} aria-label={`Usuń konspekt ${s.title || ''}`} title="Usuń konspekt">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="p-2 border-t border-white/10 grid grid-cols-2 gap-1">
          <button onClick={exportAllSessions} disabled={!sessions.length} className={`${btn} justify-center text-xs`}
            title="Wszystkie konspekty z użytymi ćwiczeniami w jednym pliku .json">
            <Download size={13} /> Wszystkie
          </button>
          <button onClick={() => importInputRef.current?.click()} className={`${btn} justify-center text-xs`}
            title="Wczytaj jeden lub wiele plików z konspektami">
            <Upload size={13} /> Importuj
          </button>
        </div>
      </aside>
      <input ref={importInputRef} type="file" accept=".json,application/json" multiple onChange={importFiles} className="hidden" aria-label="Plik z konspektami" />

      {/* ── Editor ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="lg:hidden flex gap-2 p-3 border-b border-white/10 bg-slate-950/60">
          <select value={currentId || ''} onChange={e => setCurrentId(e.target.value || null)} aria-label="Wybierz konspekt" className={inputCls}>
            {sessions.length === 0 && <option value="">Brak konspektów</option>}
            {sessions.map(s => <option key={s.id} value={s.id} className="bg-slate-800">{s.title || 'Bez tytułu'} · {s.date}</option>)}
          </select>
          <button onClick={createSession} className={btn} aria-label="Nowy konspekt"><Plus size={15} /></button>
          <button onClick={exportAllSessions} disabled={!sessions.length} className={btn} aria-label="Pobierz wszystkie konspekty"><Download size={15} /></button>
          <button onClick={() => importInputRef.current?.click()} className={btn} aria-label="Importuj konspekty"><Upload size={15} /></button>
        </div>

        {!current ? (
          <div className="max-w-lg mx-auto text-center py-16 px-6 text-slate-400">
            <ClipboardList size={40} className="mx-auto mb-3 text-slate-500" />
            <p className="text-lg text-slate-200 mb-1">Konspekt jednostki treningowej</p>
            <p className="text-sm mb-5">Złóż trening z ćwiczeń z biblioteki: kolejność, czas, cel i fazy modelu gry. Wydrukuj albo zapisz jako PDF.</p>
            <button onClick={createSession} className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium inline-flex items-center gap-2">
              <Plus size={16} /> Utwórz pierwszy konspekt
            </button>
            <p className="mt-3 text-xs">
              lub <button onClick={() => importInputRef.current?.click()} className="underline text-slate-300 hover:text-white">zaimportuj konspekty z pliku</button>
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-5">
            {/* Header */}
            <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <label className="sm:col-span-2 text-xs text-slate-400">Tytuł
                <input value={current.title} onChange={e => patchSession({ title: e.target.value })} placeholder="np. Mikrocykl 3 — trening 2"
                  className={`${inputCls} mt-1 text-base font-semibold`} aria-label="Tytuł konspektu" />
              </label>
              <label className="text-xs text-slate-400">Data
                <input type="date" value={current.date} onChange={e => patchSession({ date: e.target.value })} className={`${inputCls} mt-1`} />
              </label>
              <label className="text-xs text-slate-400">Grupa / drużyna
                <input value={current.group} onChange={e => patchSession({ group: e.target.value })} placeholder="np. U15" className={`${inputCls} mt-1`} />
              </label>
              <label className="sm:col-span-4 text-xs text-slate-400">Cel treningu
                <textarea rows={2} value={current.goal} onChange={e => patchSession({ goal: e.target.value })}
                  placeholder="np. Wyjście spod pressingu przez trzeciego zawodnika" className={`${inputCls} mt-1 resize-y`} />
              </label>
              <div className="sm:col-span-4 text-xs text-slate-400">
                Fazy modelu gry w centrum uwagi
                <div className="mt-1 flex flex-wrap gap-1">
                  {options.map(o => {
                    const on = current.phases.includes(o.key);
                    return (
                      <button key={o.key} aria-pressed={on}
                        onClick={() => patchSession({ phases: on ? current.phases.filter(k => k !== o.key) : [...current.phases, o.key] })}
                        className={`px-2 py-1 rounded-md text-xs transition-colors ${on ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Summary + actions */}
            <section className="flex flex-wrap items-center gap-x-5 gap-y-2 p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
              <span><span className="text-slate-400">Łącznie:</span> <strong className="text-white tabular-nums">{total} min</strong></span>
              <span><span className="text-slate-400">Bloki:</span> {current.blocks.length}</span>
              {trainedPhases.length > 0 && (
                <span className="text-slate-300"><span className="text-slate-400">Ćwiczenia trenują:</span> {trainedPhases.map(k => phaseLabel(k, options)).join(', ')}</span>
              )}
              <div className="flex-1" />
              <button onClick={duplicateSession} className={btn} title="Kopia konspektu z dzisiejszą datą"><Copy size={14} /> Duplikuj</button>
              <button onClick={exportSession} className={btn} title="Pobierz ten konspekt z ćwiczeniami jako plik .json (np. dla asystenta lub na inne urządzenie)">
                <Download size={14} /> Pobierz
              </button>
              <button onClick={printPlan} disabled={!current.blocks.length} className={`${btn} bg-blue-600/80 hover:bg-blue-500 text-white`}
                title="Drukuj albo zapisz jako PDF (w oknie drukowania wybierz „Zapisz jako PDF”)">
                <Printer size={14} /> Drukuj / PDF
              </button>
            </section>
            {equipment && <p className="text-xs text-slate-400 -mt-2">Sprzęt na trening: <span className="text-slate-200">{equipment}</span></p>}

            {/* Blocks */}
            <section className="space-y-2">
              {timed.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8 border border-dashed border-white/15 rounded-xl">
                  Dodaj ćwiczenia z biblioteki albo blok tekstowy (np. rozgrzewka, odprawa).
                </p>
              )}
              {timed.map(({ block: b, from, to, drill }, i) => (
                <article key={b.id} className="flex gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/10">
                  <div className="w-16 flex-shrink-0 text-center">
                    <p className="text-xs text-slate-400">#{i + 1}</p>
                    <p className="text-sm font-semibold text-white tabular-nums">{from}–{to}′</p>
                  </div>
                  {drill && thumbs.get(drill.id) && (
                    <img src={thumbs.get(drill.id)} alt="" className="hidden sm:block w-36 h-24 object-contain rounded-md bg-white flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {b.drillId ? (
                      drill ? (
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">{drill.name}</p>
                            <p className="text-xs text-slate-400 truncate">
                              {[drill.meta?.category, drill.meta?.players && `${drill.meta.players} zaw.`, ...(drill.meta?.phases || []).map(k => phaseLabel(k, options))].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          {onOpenDrill && (
                            <button onClick={() => onOpenDrill(drill.id)} className={iconBtn} title="Otwórz ćwiczenie w zakładce Trening" aria-label={`Otwórz ${drill.name}`}>
                              <ExternalLink size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-amber-300">Ćwiczenie zostało usunięte z biblioteki.</p>
                      )
                    ) : (
                      <input value={b.title} onChange={e => patchBlock(b.id, { title: e.target.value })} aria-label="Nazwa bloku"
                        className={`${inputCls} font-semibold`} />
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-slate-400">
                        Czas
                        <input type="number" min={0} value={b.minutes} onChange={e => patchBlock(b.id, { minutes: e.target.value })}
                          aria-label="Czas w minutach" className={`${inputCls} w-16 text-center`} />
                        min
                      </label>
                      <input value={b.note} onChange={e => patchBlock(b.id, { note: e.target.value })} placeholder="Notatka (np. warianty, grupy)"
                        aria-label="Notatka" className={`${inputCls} flex-1 min-w-[10rem]`} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className={iconBtn} aria-label="Przesuń wyżej"><ArrowUp size={14} /></button>
                    <button onClick={() => moveBlock(i, 1)} disabled={i === timed.length - 1} className={iconBtn} aria-label="Przesuń niżej"><ArrowDown size={14} /></button>
                    <button onClick={() => removeBlock(b.id)} className={`${iconBtn} hover:text-red-400`} aria-label="Usuń blok"><Trash2 size={14} /></button>
                  </div>
                </article>
              ))}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowPicker(true)} className={`${btn} bg-blue-600/80 hover:bg-blue-500 text-white`}><Plus size={14} /> Dodaj ćwiczenie</button>
                <button onClick={addTextBlock} className={btn}><FileText size={14} /> Blok tekstowy</button>
              </div>
            </section>

            <label className="block text-xs text-slate-400">Uwagi po treningu
              <textarea rows={3} value={current.notes} onChange={e => patchSession({ notes: e.target.value })}
                placeholder="Co zadziałało, co poprawić, obecność…" className={`${inputCls} mt-1 resize-y`} />
            </label>
          </div>
        )}
      </main>

      {message && (
        <div role="status" aria-live="polite"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] text-center px-4 py-2 rounded-lg shadow-2xl text-sm border ${
            message.tone === 'warn' ? 'bg-amber-950/95 border-amber-500/40 text-amber-200' : 'bg-slate-900/95 border-emerald-500/40 text-emerald-200'}`}>
          {message.text}
        </div>
      )}

      {/* ── Drill picker ── */}
      {showPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPicker(false)}>
          <div role="dialog" aria-modal="true" aria-label="Wybierz ćwiczenie"
            className="bg-slate-900 border border-white/15 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setShowPicker(false); }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Wybierz ćwiczenie</h2>
              <button onClick={() => setShowPicker(false)} className={iconBtn} aria-label="Zamknij wybór ćwiczenia"><X size={18} /></button>
            </div>
            <div className="px-5 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input autoFocus type="search" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Szukaj po nazwie lub kategorii…" className={`${inputCls} pl-8`} />
              </div>
              <select value={pickerPhase} onChange={e => setPickerPhase(e.target.value)} aria-label="Filtruj po fazie modelu gry" className={inputCls}>
                <option value="" className="bg-slate-800">Wszystkie fazy</option>
                {options.map(o => <option key={o.key} value={o.key} className="bg-slate-800">{o.label}</option>)}
              </select>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {library.length === 0 && (
                <p className="sm:col-span-2 text-sm text-slate-400 text-center py-10">Biblioteka jest pusta — zapisz ćwiczenia w zakładce Trening.</p>
              )}
              {library.length > 0 && pickerList.length === 0 && (
                <p className="sm:col-span-2 text-sm text-slate-500 text-center py-10">Brak pasujących ćwiczeń.</p>
              )}
              {pickerList.map(d => (
                <button key={d.id} onClick={() => addDrillBlock(d)}
                  className="flex gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-left transition-colors">
                  {thumbs.get(d.id) && <img src={thumbs.get(d.id)} alt="" className="w-24 h-16 object-contain rounded bg-white flex-shrink-0" />}
                  <span className="min-w-0">
                    <span className="block text-sm text-slate-100 truncate">{d.name}</span>
                    <span className="block text-xs text-slate-400 truncate">
                      {[d.meta?.category, d.meta?.duration && `${d.meta.duration} min`].filter(Boolean).join(' · ')}
                    </span>
                    <span className="block text-[10px] text-emerald-300 truncate">{(d.meta?.phases || []).map(k => phaseLabel(k, options)).join(', ')}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {active && current && createPortal(
        <div className="print-root text-black bg-white">
          <header style={{ borderBottom: '3px solid #1e3a8a', paddingBottom: 8, marginBottom: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{current.title || 'Konspekt treningu'}</h1>
            <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0' }}>
              {[formatDate(current.date), current.group, `Czas: ${total} min`].filter(Boolean).join('   ·   ')}
            </p>
          </header>
          {current.goal && <p style={{ fontSize: 13, margin: '0 0 6px' }}><strong>Cel: </strong>{current.goal}</p>}
          {(current.phases.length > 0 || trainedPhases.length > 0) && (
            <p style={{ fontSize: 13, margin: '0 0 6px' }}>
              <strong>Fazy modelu gry: </strong>{[...new Set([...current.phases, ...trainedPhases])].map(k => phaseLabel(k, options)).join(', ')}
            </p>
          )}
          {equipment && <p style={{ fontSize: 13, margin: '0 0 12px' }}><strong>Sprzęt: </strong>{equipment}</p>}
          {timed.map(({ block: b, from, to, drill }, i) => (
            <section key={b.id} style={{ breakInside: 'avoid', borderTop: '1px solid #cbd5e1', padding: '10px 0', display: 'flex', gap: 12 }}>
              <div style={{ width: 70, flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>#{i + 1}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{from}–{to}′</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{minutesOf(b)} min</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>{drill ? drill.name : (b.title || 'Blok')}</h2>
                {drill && (
                  <p style={{ fontSize: 11, color: '#475569', margin: '0 0 6px' }}>
                    {[drill.meta?.category, drill.meta?.players && `Zawodnicy: ${drill.meta.players}`, drill.meta?.area && `Pole: ${drill.meta.area}`].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                  {drill && thumbs.get(drill.id) && <img src={thumbs.get(drill.id)} alt="" style={{ width: 230, maxHeight: 230, objectFit: 'contain', border: '1px solid #e2e8f0' }} />}
                  <div style={{ fontSize: 11.5, lineHeight: 1.45 }}>
                    {drill && META_FIELDS.filter(([key]) => ['organization', 'coachingPoints', 'variations'].includes(key) && drill.meta?.[key]).map(([key, label]) => (
                      <p key={key} style={{ margin: '0 0 6px', whiteSpace: 'pre-wrap' }}><strong>{label}: </strong>{drill.meta[key]}</p>
                    ))}
                    {b.note && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}><strong>Notatka: </strong>{b.note}</p>}
                  </div>
                </div>
              </div>
            </section>
          ))}
          {current.notes && <p style={{ fontSize: 12, borderTop: '1px solid #cbd5e1', paddingTop: 8, whiteSpace: 'pre-wrap' }}><strong>Uwagi: </strong>{current.notes}</p>}
        </div>,
        document.body,
      )}
    </div>
  );
}
