import React, { useRef, useState } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { clubTitle, normalizeClub } from '../utils/club.js';

const inputCls = 'w-full px-2 py-1.5 bg-white/10 border border-white/15 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400';
const LOGO_MAX = 240; // px; enough for the printout header and small in storage
const RAW_LOGO_LIMIT = 300 * 1024;

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(file);
});

// Downscaled PNG of the logo; when the browser cannot draw it, a small original is kept as is.
async function logoFromFile(file) {
  const src = await readAsDataUrl(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = src;
    });
    // an SVG without its own size reports 0 × 0
    const w = img.naturalWidth || img.width || LOGO_MAX;
    const h = img.naturalHeight || img.height || LOGO_MAX;
    const scale = Math.min(1, LOGO_MAX / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch {
    if (src.length > RAW_LOGO_LIMIT) throw new Error('Logo jest za duże — wybierz mniejszy plik (PNG lub JPG).');
    return src;
  }
}

export default function ClubModal({ club, onChange, onClose }) {
  const [data, setData] = useState(() => normalizeClub(club));
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const patch = (p) => {
    const next = { ...data, ...p };
    setData(next);
    onChange(next);
  };

  const takeLogoFile = async (file) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('To nie jest obraz — wybierz plik PNG, JPG lub SVG.'); return; }
    try {
      patch({ logo: await logoFromFile(file) });
    } catch (err) {
      setError(err.message || 'Nie udało się wczytać logo.');
    }
  };

  // A dropped image becomes the logo here instead of going to the app-wide file import.
  const dropProps = {
    onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); },
    onDragLeave: () => setDragOver(false),
    onDrop: (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); takeLogoFile(e.dataTransfer.files?.[0]); },
  };

  const field = (key, label, placeholder) => (
    <label className="text-xs text-slate-400">{label}
      <input value={data[key]} onChange={e => patch({ [key]: e.target.value })} placeholder={placeholder} className={`${inputCls} mt-1`} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Szkółka i trener"
        className="bg-slate-900 border border-white/15 rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col text-white"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold">Szkółka i trener</h2>
            <p className="text-xs text-slate-400">Pojawiają się w nagłówku konspektu zgodnego z certyfikacją.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white" aria-label="Zamknij ustawienia szkółki"><X size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">{field('name', 'Nazwa szkółki / klubu', 'np. AP BKS Naprzód Brwinów')}</div>
            {field('team', 'Drużyna / rocznik', 'np. 2013')}
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">Logo</p>
            <div {...dropProps}
              className={`flex items-center gap-3 p-3 rounded-lg border border-dashed ${dragOver ? 'border-blue-400 bg-blue-500/10' : 'border-white/20 bg-white/[0.03]'}`}>
              {data.logo
                ? <img src={data.logo} alt="Logo szkółki" className="h-14 w-14 object-contain rounded bg-white p-1" />
                : <span className="h-14 w-14 rounded bg-white/5 flex items-center justify-center text-xs text-slate-500 text-center">brak</span>}
              <div className="flex-1 text-xs text-slate-400">Przeciągnij obraz tutaj albo wybierz plik (PNG, JPG, SVG).</div>
              <div className="flex flex-col gap-1">
                <button onClick={() => fileRef.current?.click()} className="px-2.5 py-1.5 rounded-md text-xs bg-white/10 hover:bg-white/15 inline-flex items-center gap-1.5">
                  <Upload size={13} /> Wybierz…
                </button>
                {data.logo && (
                  <button onClick={() => patch({ logo: '' })} className="px-2.5 py-1.5 rounded-md text-xs text-slate-300 hover:text-red-300 hover:bg-white/5 inline-flex items-center gap-1.5">
                    <Trash2 size={13} /> Usuń
                  </button>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="Plik z logo"
              onChange={e => { takeLogoFile(e.target.files?.[0]); e.target.value = ''; }} />
            {error && <p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field('coach', 'Trener', 'np. Jan Kowalski')}
            {field('assistant', 'Asystent', 'opcjonalnie')}
          </div>

          {(clubTitle(data) || data.logo) && (
            <div className="rounded-lg bg-white p-3 flex items-center gap-2 text-black">
              {data.logo && <img src={data.logo} alt="" className="h-8 w-8 object-contain" />}
              <span className="font-bold">{clubTitle(data)}</span>
              <span className="ml-auto text-[10px] text-slate-500">podgląd nagłówka</span>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/10 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-500">Gotowe</button>
        </div>
      </div>
    </div>
  );
}
