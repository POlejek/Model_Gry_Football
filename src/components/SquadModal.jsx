import React, { useState, useRef } from 'react';
import { Plus, Trash2, X, ClipboardPaste } from 'lucide-react';
import { POSITIONS, sortSquad, parseSquadText, mergeSquad } from '../utils/squad.js';

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

  // Pasting a list from Excel or a text editor: the text goes to a box with a preview first.
  const [pasteText, setPasteText] = useState(null);
  const dialogRef = useRef(null);
  // closing the box keeps the keyboard in the window, so Escape still closes it
  const closePaste = () => { setPasteText(null); dialogRef.current?.focus(); };
  const parsed = pasteText ? parseSquadText(pasteText) : [];
  const applyPaste = (mode) => { update(sortSquad(mergeSquad(rows, parsed, mode))); closePaste(); };
  const posLabel = (id) => POSITIONS.find(p => p.id === id)?.label || id;
  // Ctrl+V anywhere in the window (outside the fields) opens the box with the pasted list
  const onPaste = (e) => {
    if (pasteText !== null || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const text = e.clipboardData?.getData('text') || '';
    if (!text.trim()) return;
    e.preventDefault();
    setPasteText(text);
  };

  const numberCounts = rows.reduce((acc, r) => {
    const k = String(r.number).trim();
    if (k) acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Kadra zespołu"
        className="bg-slate-900 border border-white/15 rounded-2xl shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col text-white outline-none"
        onClick={e => e.stopPropagation()} onPaste={onPaste} tabIndex={-1} ref={dialogRef}
        onKeyDown={e => { if (e.key === 'Escape') { if (pasteText !== null) closePaste(); else onClose(); } }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold">Kadra zespołu <span className="text-sm font-normal text-slate-400">({rows.length})</span></h2>
            <p className="text-xs text-slate-400">Numery łączą kadrę z zawodnikami na boisku w Taktyce i Treningu.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white" aria-label="Zamknij kadrę"><X size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3">
          {pasteText !== null && (
            <section aria-label="Wklej listę zawodników" className="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/[0.06] p-3 space-y-2">
              <p className="text-sm font-semibold">Wklej listę zawodników</p>
              <p className="text-xs text-slate-400">
                Skopiuj kolumny z Excela albo listę z notatnika (Ctrl+C) i wklej tutaj (Ctrl+V). Jeden zawodnik w wierszu:
                numer, imię i nazwisko, pozycja (np. „7 Jan Kowalski POM”). Numer i pozycja nie są wymagane.
              </p>
              <textarea autoFocus value={pasteText} onChange={e => setPasteText(e.target.value)} rows={5} aria-label="Lista zawodników"
                placeholder={'1  Jan Kowalski  Bramkarz\n4  Piotr Nowak  Obrońca\n10  Adam Zieliński  POM'}
                className={`${inputCls} font-mono text-xs`} />
              {parsed.length > 0 ? (
                <>
                  <p className="text-xs text-emerald-300">Rozpoznano zawodników: {parsed.length}</p>
                  <ul className="max-h-32 overflow-y-auto text-xs text-slate-300 space-y-0.5">
                    {parsed.map((p, i) => (
                      <li key={i} className="grid grid-cols-[2.5rem_1fr_6rem] gap-2">
                        <span className="text-slate-400">{p.number || '—'}</span><span className="truncate">{p.name || '—'}</span><span className="text-slate-400">{posLabel(p.position)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : pasteText.trim() && <p className="text-xs text-amber-300">Nie rozpoznano zawodników. Każdy zawodnik w osobnym wierszu.</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => applyPaste('add')} disabled={!parsed.length}
                  className="px-3 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40">Dodaj do kadry</button>
                {rows.length > 0 && (
                  <button onClick={() => applyPaste('replace')} disabled={!parsed.length}
                    className="px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/15 disabled:opacity-40">Zastąp kadrę</button>
                )}
                <button onClick={closePaste} className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:bg-white/10">Anuluj</button>
              </div>
            </section>
          )}
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Kadra jest pusta.<br />
              <span className="text-slate-400">Dodaj zawodników albo wklej listę z Excela lub notatnika (Ctrl+V), aby wybierać ich na boisku i pokazywać nazwiska zamiast numerów.</span>
            </p>
          ) : (
            // phone: number, position and delete share a row and the name gets the full width below
            <div className="text-sm">
              <div className="hidden sm:grid grid-cols-[4rem_1fr_8rem_2rem] gap-2 pb-2 text-left text-xs text-slate-400 font-medium" aria-hidden="true">
                <span>Nr</span><span>Imię i nazwisko</span><span>Pozycja</span><span />
              </div>
              <ul className="space-y-3 sm:space-y-1">
                {rows.map(r => {
                  const duplicate = numberCounts[String(r.number).trim()] > 1;
                  return (
                    <li key={r.id} className="grid grid-cols-[4rem_1fr_auto] sm:grid-cols-[4rem_1fr_8rem_2rem] gap-2 items-center">
                      <input value={r.number} onChange={e => patch(r.id, 'number', e.target.value)} aria-label="Numer"
                        className={`${inputCls} text-center ${duplicate ? 'border-amber-400' : ''}`} title={duplicate ? 'Ten numer ma już inny zawodnik' : undefined} />
                      <input value={r.name} onChange={e => patch(r.id, 'name', e.target.value)} aria-label="Imię i nazwisko"
                        placeholder="np. Jan Kowalski" className={`${inputCls} order-last col-span-3 sm:order-none sm:col-span-1`} />
                      <select value={r.position} onChange={e => patch(r.id, 'position', e.target.value)} aria-label="Pozycja" className={inputCls}>
                        {POSITIONS.map(p => <option key={p.id} value={p.id} className="bg-slate-800">{p.label}</option>)}
                      </select>
                      <button onClick={() => remove(r.id)} aria-label={`Usuń ${r.name || r.number}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-white/5 justify-self-end"><Trash2 size={14} /></button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {Object.values(numberCounts).some(c => c > 1) && (
            <p className="mt-2 text-xs text-amber-300">Powtórzony numer — na boisku pokaże się pierwszy zawodnik z tym numerem.</p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/10 flex items-center gap-2">
          <button onClick={addRow} className="px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/15 inline-flex items-center gap-1.5">
            <Plus size={14} /> Dodaj zawodnika
          </button>
          <button onClick={() => setPasteText(pasteText ?? '')} className="px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/15 inline-flex items-center gap-1.5">
            <ClipboardPaste size={14} /> Wklej listę
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-500">Gotowe</button>
        </div>
      </div>
    </div>
  );
}
