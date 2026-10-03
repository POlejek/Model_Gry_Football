import React, { useMemo, useRef, useState } from 'react';
import { X, Download, Upload, Undo2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  SECTIONS, readAll, describe, buildBackup, markBackupDone, backupAgeDays, parseAnyFile, combineParsed,
  applyImport, replaceLosses, undoInfo, undoLastImport, storageUsage, STORAGE_LIMIT, plural, SECTION_SLUGS,
} from '../utils/backup.js';

export const IMPORT_RESULT_KEY = 'modelGryImportResult';

function download(data, fileName) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Components keep their data in memory, so after changing storage the app reloads to show it.
function reloadWith(message) {
  try { sessionStorage.setItem(IMPORT_RESULT_KEY, message); } catch { /* ignore */ }
  window.location.reload();
}

const card = 'rounded-xl border border-white/10 bg-white/[0.03] p-4';
const btnPrimary = 'h-9 px-4 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none';
const btnSecondary = 'h-9 px-3 rounded-md text-sm bg-white/10 hover:bg-white/15 text-slate-200 inline-flex items-center gap-1.5';

export default function DataModal({ onClose }) {
  const current = useMemo(() => readAll(), []);
  const available = SECTIONS.filter(s => describe(s.id, current));
  const [selected, setSelected] = useState(() => new Set(available.map(s => s.id)));
  const [incoming, setIncoming] = useState(null); // { data, files, bad }
  const [choices, setChoices] = useState({});
  const [exportNote, setExportNote] = useState(null);
  const fileRef = useRef(null);
  const undo = undoInfo();

  const age = backupAgeDays();
  const used = storageUsage();
  const usedPct = Math.min(100, Math.round((used / STORAGE_LIMIT) * 100));

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const doExport = () => {
    const { backup, addedDrills } = buildBackup(selected, current);
    const full = available.every(s => selected.has(s.id));
    const date = new Date().toISOString().slice(0, 10);
    download(backup, full ? `model-gry_kopia_${date}.json` : `model-gry_${[...selected].map(id => SECTION_SLUGS[id]).join('-')}_${date}.json`);
    if (full) markBackupDone();
    setExportNote(addedDrills
      ? `Pobrano. Dołączono ${plural(addedDrills, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')} z konspektów, aby konspekty były kompletne.`
      : full ? 'Pobrano pełną kopię zapasową.' : 'Pobrano wybrane dane.');
  };

  const readFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    const parsed = [];
    const bad = [];
    await Promise.all(files.map(async (f) => {
      try {
        const p = parseAnyFile(JSON.parse(await f.text()), f.name);
        if (p) parsed.push(p); else bad.push(f.name);
      } catch {
        bad.push(f.name);
      }
    }));
    const data = combineParsed(parsed);
    const present = SECTIONS.filter(s => describe(s.id, data));
    setIncoming({ data, files: files.length - bad.length, bad });
    setChoices(Object.fromEntries(present.map(s => [s.id, s.id === 'settings' ? 'skip' : 'add'])));
  };

  const doImport = () => {
    const full = Object.fromEntries(SECTIONS.map(s => [s.id, choices[s.id] || 'skip']));
    if (Object.values(full).every(v => v === 'skip')) return;
    const losses = replaceLosses(full, current);
    if (losses.length && !window.confirm(`„Zastąp” usunie z tego urządzenia: ${losses.join(', ')}.\n\nStan sprzed importu będzie można przywrócić przyciskiem „Cofnij ostatni import”. Kontynuować?`)) return;
    const result = applyImport(incoming.data, full);
    if (!result.ok) { setExportNote(result.summary[0]); return; }
    const undoNote = result.undoSaved ? '' : ' (bez możliwości cofnięcia — za mało miejsca w pamięci)';
    reloadWith(`Import zakończony${undoNote}: ${result.summary.join(' · ')}`);
  };

  const doUndo = () => {
    if (!window.confirm('Przywrócić dane sprzed ostatniego importu? Zmiany wprowadzone po imporcie zostaną utracone.')) return;
    if (undoLastImport()) reloadWith('Przywrócono dane sprzed ostatniego importu.');
  };

  const incomingSections = incoming ? SECTIONS.filter(s => describe(s.id, incoming.data)) : [];

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Dane i kopia zapasowa"
        className="bg-slate-900 border border-white/15 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col text-white"
        onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
        <div className="flex items-start justify-between gap-3 px-5 py-3 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold">Dane i kopia zapasowa</h2>
            <p className={`text-xs ${age === null || age > 14 ? 'text-amber-300' : 'text-slate-400'}`}>
              {age === null ? 'Nie zrobiono jeszcze pełnej kopii zapasowej.' : `Ostatnia pełna kopia: ${age === 0 ? 'dzisiaj' : age === 1 ? 'wczoraj' : `${age} dni temu`}.`}
              {' '}Dane są zapisane tylko w tej przeglądarce.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white" aria-label="Zamknij okno danych"><X size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Storage */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Pamięć przeglądarki</span>
              <span className="tabular-nums">{(used / 1024 / 1024).toFixed(2)} MB z ok. 5 MB</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={usedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Zajęta pamięć">
              <div className={`h-full ${usedPct > 80 ? 'bg-red-500' : usedPct > 60 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.max(2, usedPct)}%` }} />
            </div>
            {usedPct > 80 && <p className="text-xs text-red-300 mt-1">Pamięć prawie pełna — zrób kopię i usuń niepotrzebne schematy lub ćwiczenia.</p>}
          </div>

          {/* Export */}
          <section className={card} aria-labelledby="export-title">
            <h3 id="export-title" className="font-semibold mb-1">Eksport</h3>
            <p className="text-xs text-slate-400 mb-3">Zaznacz, co zapisać do pliku. Pełna kopia pozwala odtworzyć wszystko na innym urządzeniu.</p>
            <div className="space-y-1.5">
              {SECTIONS.map(s => {
                const info = describe(s.id, current);
                return (
                  <label key={s.id} className={`flex items-center gap-3 px-2 py-1.5 rounded-md ${info ? 'hover:bg-white/5 cursor-pointer' : 'opacity-40'}`}>
                    <input type="checkbox" checked={!!info && selected.has(s.id)} disabled={!info} onChange={() => toggle(s.id)} />
                    <span className="flex-1 min-w-0">
                      <span className="text-sm">{s.label}</span>
                      <span className="block text-xs text-slate-400 truncate">{info || 'brak danych'} · {s.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button onClick={doExport} disabled={![...selected].some(id => describe(id, current))} className={btnPrimary}>
                <Download size={15} /> {available.every(s => selected.has(s.id)) ? 'Pobierz pełną kopię' : 'Pobierz wybrane'}
              </button>
              <button onClick={() => setSelected(new Set(available.map(s => s.id)))} className="text-xs text-slate-400 hover:text-white underline">Zaznacz wszystko</button>
            </div>
            {exportNote && <p className="mt-2 text-xs text-emerald-300 flex items-center gap-1.5"><CheckCircle2 size={13} /> {exportNote}</p>}
          </section>

          {/* Import */}
          <section className={card} aria-labelledby="import-title">
            <h3 id="import-title" className="font-semibold mb-1">Import</h3>
            <p className="text-xs text-slate-400 mb-3">
              Wczytaj kopię zapasową albo dowolny plik z aplikacji (eksport Taktyki, ćwiczenia, konspekty) — można kilka naraz.
            </p>
            <input ref={fileRef} type="file" accept=".json,application/json" multiple onChange={readFiles} className="hidden" aria-label="Pliki do importu" />
            <button onClick={() => fileRef.current?.click()} className={btnSecondary}><Upload size={15} /> Wybierz pliki…</button>

            {incoming && (
              <div className="mt-3 space-y-2">
                {incoming.bad.length > 0 && (
                  <p className="text-xs text-amber-300 flex items-center gap-1.5"><AlertTriangle size={13} /> Nierozpoznane pliki: {incoming.bad.join(', ')}</p>
                )}
                {incomingSections.length === 0 ? (
                  <p className="text-sm text-slate-400">W wybranych plikach nie ma danych do wczytania.</p>
                ) : (
                  <>
                    <p className="text-xs text-slate-400">Zawartość ({plural(incoming.files, 'plik', 'pliki', 'plików')}) — wybierz, co zrobić z każdą częścią:</p>
                    {incomingSections.map(s => {
                      const opts = s.id === 'settings' ? [['skip', 'Pomiń'], ['replace', 'Wczytaj']] : [['skip', 'Pomiń'], ['add', 'Dodaj'], ['replace', 'Zastąp']];
                      return (
                        <div key={s.id} className="flex flex-wrap items-center gap-2 px-2 py-1.5 rounded-md bg-white/5">
                          <span className="flex-1 min-w-[10rem]">
                            <span className="text-sm">{s.label}</span>
                            <span className="block text-xs text-slate-400">{describe(s.id, incoming.data)}</span>
                          </span>
                          <div className="flex gap-0.5 p-0.5 rounded-md bg-black/20" role="radiogroup" aria-label={`${s.label}: co zrobić`}>
                            {opts.map(([value, label]) => (
                              <button key={value} role="radio" aria-checked={choices[s.id] === value}
                                onClick={() => setChoices(c => ({ ...c, [s.id]: value }))}
                                className={`px-2.5 py-1 rounded text-xs ${choices[s.id] === value
                                  ? (value === 'replace' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white')
                                  : 'text-slate-300 hover:bg-white/10'}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-slate-500">
                      „Dodaj” dopisuje nowe elementy i pomija te, które już masz. „Zastąp” usuwa obecne dane tej części i wstawia te z pliku.
                    </p>
                    <button onClick={doImport} disabled={Object.values(choices).every(v => v === 'skip')} className={btnPrimary}>
                      <Upload size={15} /> Importuj
                    </button>
                  </>
                )}
              </div>
            )}
          </section>

          {undo && (
            <section className={`${card} flex flex-wrap items-center gap-3`}>
              <p className="flex-1 text-sm text-slate-300">
                Ostatni import: {new Date(undo.at).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
              <button onClick={doUndo} className={btnSecondary}><Undo2 size={15} /> Cofnij ostatni import</button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
