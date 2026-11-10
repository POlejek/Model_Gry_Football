import React, { useState } from 'react';
import { X, Plus, CheckCircle2 } from 'lucide-react';
import { PACKS, buildPack } from '../packs/otwarcieGry.js';
import { applyImport } from '../utils/backup.js';
import { weekStart } from '../utils/week.js';
import { track } from '../utils/analytics.js';
import { IMPORT_RESULT_KEY } from './DataModal.jsx';

const DRILLS_KEY = 'trainingDrillLibrary';
const TAB_KEY = 'modelGryActiveTab';

// Packs already added on this device (their drills are in the library).
function addedPacks() {
  try {
    const ids = new Set((JSON.parse(localStorage.getItem(DRILLS_KEY)) || []).map(d => d.id));
    return new Set(PACKS.filter(p => ids.has(`pack-otwarcie-${p.id}-d1`)).map(p => p.id));
  } catch {
    return new Set();
  }
}

export default function PacksModal({ onClose }) {
  const [added] = useState(addedPacks);
  const [error, setError] = useState(null);

  // Adds the pack next to the coach's own work (nothing is replaced), dated in the current week,
  // then reloads into Konspekt, because the editors keep their data in memory.
  const add = (pack) => {
    const monday = weekStart(new Date().toISOString().slice(0, 10));
    const result = applyImport(buildPack(pack.id, monday), { drills: 'add', sessions: 'add' });
    if (!result.ok) { setError(result.summary[0]); return; }
    track('add_pack', { pack: `otwarcie-${pack.id}` });
    try {
      localStorage.setItem(TAB_KEY, 'session');
      sessionStorage.setItem(IMPORT_RESULT_KEY, `Dodano „${pack.title}”: 3 konspekty w bieżącym tygodniu i 9 ćwiczeń w bibliotece. Możesz to cofnąć w oknie „Dane”.`);
    } catch { /* ignore */ }
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Gotowe treningi"
        className="bg-slate-900 border border-white/15 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col text-white"
        onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
        <div className="flex items-start justify-between gap-3 px-5 py-3 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold">Gotowe treningi</h2>
            <p className="text-xs text-slate-400">Tydzień treningów do wczytania jednym kliknięciem. Wszystko możesz potem zmienić po swojemu.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white" aria-label="Zamknij gotowe treningi"><X size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-white">Otwarcie gry</span> — budowanie akcji od bramkarza. Trzy treningi w tygodniu:
            ustawienie i pierwsze podanie, gra na trzeciego zawodnika, otwarcie w grze. Wybierz format swojej drużyny.
          </p>
          <ul className="space-y-2">
            {PACKS.map(p => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <span className="w-14 h-14 flex-shrink-0 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-200">{p.id}</span>
                <span className="flex-1 min-w-[12rem]">
                  <span className="block text-sm font-semibold">{p.title} <span className="font-normal text-slate-400">· {p.group}</span></span>
                  <span className="block text-xs text-slate-400">{p.description}</span>
                  <span className="block text-xs text-slate-300 mt-0.5">{p.contents} · darmowy</span>
                </span>
                {added.has(p.id) ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300"><CheckCircle2 size={14} /> Dodano</span>
                ) : (
                  <button onClick={() => add(p)} aria-label={`Dodaj ${p.title}`}
                    className="h-9 px-3 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1.5">
                    <Plus size={15} /> Dodaj
                  </button>
                )}
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
          <p className="text-xs text-slate-400">
            Konspekty trafią do bieżącego tygodnia (poniedziałek, środa, piątek), a ćwiczenia do biblioteki w Treningu.
            Twoje dotychczasowe treningi zostają bez zmian. Kolejne tematy pojawią się tutaj.
          </p>
        </div>
      </div>
    </div>
  );
}
