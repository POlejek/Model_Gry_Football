import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { POSITIONS, sortSquad } from '../utils/squad.js';

const inputCls = 'w-full px-2 py-1.5 bg-white/10 border border-white/15 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400';

export default function SquadModal({ squad, onChange, onClose }) {
  const [rows, setRows] = useState(() => sortSquad(squad));

  const update = (next) => { setRows(next); onChange(next); };
  const patch = (id, field, value) => update(rows.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  const addRow = () => {
    const used = new Set(rows.map(r => parseInt(r.number, 10)));
    let n = 1;
    while (used.has(n)) n++;
    update([...rows, { id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, number: String(n), name: '', position: 'POM' }]);
  };
  const remove = (id) => update(rows.filter(r => r.id !== id));

  const numberCounts = rows.reduce((acc, r) => {
    const k = String(r.number).trim();
    if (k) acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Kadra zespołu"
        className="bg-slate-900 border border-white/15 rounded-2xl shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col text-white"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold">Kadra zespołu <span className="text-sm font-normal text-slate-400">({rows.length})</span></h2>
            <p className="text-xs text-slate-400">Numery łączą kadrę z zawodnikami na boisku w Taktyce i Treningu.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white" aria-label="Zamknij kadrę"><X size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Kadra jest pusta.<br />
              <span className="text-slate-500">Dodaj zawodników, aby wybierać ich na boisku i pokazywać nazwiska zamiast numerów.</span>
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="pb-2 w-16 font-medium">Nr</th>
                  <th className="pb-2 font-medium">Imię i nazwisko</th>
                  <th className="pb-2 w-32 font-medium">Pozycja</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const duplicate = numberCounts[String(r.number).trim()] > 1;
                  return (
                    <tr key={r.id}>
                      <td className="py-1 pr-2">
                        <input value={r.number} onChange={e => patch(r.id, 'number', e.target.value)} aria-label="Numer"
                          className={`${inputCls} text-center ${duplicate ? 'border-amber-400' : ''}`} title={duplicate ? 'Ten numer ma już inny zawodnik' : undefined} />
                      </td>
                      <td className="py-1 pr-2">
                        <input value={r.name} onChange={e => patch(r.id, 'name', e.target.value)} aria-label="Imię i nazwisko"
                          placeholder="np. Jan Kowalski" className={inputCls} />
                      </td>
                      <td className="py-1 pr-2">
                        <select value={r.position} onChange={e => patch(r.id, 'position', e.target.value)} aria-label="Pozycja" className={inputCls}>
                          {POSITIONS.map(p => <option key={p.id} value={p.id} className="bg-slate-800">{p.label}</option>)}
                        </select>
                      </td>
                      <td className="py-1 text-right">
                        <button onClick={() => remove(r.id)} aria-label={`Usuń ${r.name || r.number}`}
                          className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-white/5"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {Object.values(numberCounts).some(c => c > 1) && (
            <p className="mt-2 text-xs text-amber-300">Powtórzony numer — na boisku pokaże się pierwszy zawodnik z tym numerem.</p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/10 flex items-center gap-2">
          <button onClick={addRow} className="px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/15 inline-flex items-center gap-1.5">
            <Plus size={14} /> Dodaj zawodnika
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-500">Gotowe</button>
        </div>
      </div>
    </div>
  );
}
