import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

// Compact picker for game-model phases: shows only the selected phases,
// the full list (grouped by main phase) opens on demand.
export default function PhasePicker({ options, value = [], onChange, label = 'Fazy modelu gry', hint }) {
  const [open, setOpen] = useState(false);
  const selected = options.filter(o => value.includes(o.key));
  const groups = options.reduce((acc, o) => {
    (acc[o.phase] ||= []).push(o);
    return acc;
  }, {});
  const toggle = (key) => onChange(value.includes(key) ? value.filter(k => k !== key) : [...value, key]);
  const short = (o) => (o.label.startsWith(`${o.phase} – `) ? o.label.slice(o.phase.length + 3) : o.label);

  return (
    <div className="text-xs text-slate-400">
      <div className="flex items-center justify-between gap-2">
        <span>{label}{hint && <span className="text-slate-400/80"> — {hint}</span>}</span>
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-200">
          {open ? 'Gotowe' : 'Wybierz'} <ChevronDown size={12} className={open ? 'rotate-180' : ''} />
        </button>
      </div>
      {!open && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selected.length === 0 && <span className="text-slate-400 italic">nie wybrano</span>}
          {selected.map(o => (
            <span key={o.key} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-emerald-600 text-white">
              {o.label}
              <button type="button" onClick={() => toggle(o.key)} aria-label={`Usuń fazę ${o.label}`} className="p-0.5 rounded hover:bg-black/20"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="mt-1.5 rounded-lg border border-white/10 bg-black/20 p-2 space-y-1.5">
          {Object.entries(groups).map(([phase, opts]) => (
            <div key={phase} className="flex flex-wrap items-center gap-1">
              <span className="w-14 flex-shrink-0 font-semibold text-slate-300">{phase}</span>
              {opts.map(o => {
                const on = value.includes(o.key);
                return (
                  <button key={o.key} type="button" aria-pressed={on} aria-label={o.label} onClick={() => toggle(o.key)}
                    className={`px-2 py-1 rounded-md transition-colors ${on ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                    {short(o)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
