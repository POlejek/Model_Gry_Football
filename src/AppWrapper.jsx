import React, { useState, useEffect } from 'react';
import FootballTacticsApp from './FootballTacticsApp';
import TrainingDrillApp from './TrainingDrillApp';
import SessionPlanApp from './SessionPlanApp.jsx';
import SquadModal from './components/SquadModal.jsx';
import ClubModal from './components/ClubModal.jsx';
import DataModal, { IMPORT_RESULT_KEY } from './components/DataModal.jsx';
import { needsBackup, backupAgeDays } from './utils/backup.js';
import { loadSquad, saveSquad } from './utils/squad.js';
import { loadClub, saveClub } from './utils/club.js';

const TABS = [
  { id: 'tactics',  label: '⚽ Taktyka', title: 'Edytor taktyki: fazy, schematy, animacje' },
  { id: 'training', label: '🏃 Trening', title: 'Budowanie ćwiczeń treningowych' },
  { id: 'session',  label: '📋 Konspekt', title: 'Plan jednostki treningowej z ćwiczeń, druk i PDF' },
];
const TAB_KEY = 'modelGryActiveTab';

// Browser noise that is not an app error (fired by layout observers, harmless).
const IGNORED_ERRORS = [/ResizeObserver loop/i];

const describeError = (err) => {
  if (!err) return 'Nieznany błąd';
  if (typeof err === 'string') return err;
  return [err.name, err.message].filter(Boolean).join(': ') || String(err);
};

// Keeps one tab's crash from blanking the whole app and shows what actually failed.
class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Błąd w zakładce', this.props.name, error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-950/60 border border-red-500/40 rounded-2xl p-5 text-sm text-red-100 space-y-3">
          <p className="text-base font-semibold">Coś poszło nie tak w zakładce „{this.props.name}”.</p>
          <p className="font-mono text-xs break-words bg-black/30 rounded p-2">{describeError(this.state.error)}</p>
          <p className="text-red-200/80">Twoje dane są zapisane. Zrób zrzut ekranu tego komunikatu, jeśli zgłaszasz problem.</p>
          <div className="flex gap-2">
            <button onClick={() => this.setState({ error: null })} className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20">Spróbuj ponownie</button>
            <button onClick={() => window.location.reload()} className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white">Odśwież stronę</button>
          </div>
        </div>
      </div>
    );
  }
}

const readTab = () => {
  try {
    const t = localStorage.getItem(TAB_KEY);
    return TABS.some(x => x.id === t) ? t : 'tactics';
  } catch {
    return 'tactics';
  }
};

export default function AppWrapper() {
  const [activeTab, setActiveTab] = useState(readTab);
  const [runtimeError, setRuntimeError] = useState(null);
  const [squad, setSquad] = useState(loadSquad);
  const [showSquad, setShowSquad] = useState(false);
  const [drillRequest, setDrillRequest] = useState(null);
  const [showData, setShowData] = useState(false);
  const [club, setClub] = useState(loadClub);
  const [showClub, setShowClub] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState(null);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [backupDue, setBackupDue] = useState(() => needsBackup());
  // result of an import/undo, shown once after the reload that applied it
  const [notice, setNotice] = useState(() => {
    try {
      const msg = sessionStorage.getItem(IMPORT_RESULT_KEY);
      sessionStorage.removeItem(IMPORT_RESULT_KEY);
      return msg;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);
  const updateSquad = (list) => { setSquad(list); saveSquad(list); };
  const updateClub = (data) => { setClub(data); saveClub(data); };

  // Files dragged from the computer and dropped anywhere open the import in "Dane" (add / replace / skip).
  // Drags inside the app (equipment, frames, schemes) carry no files and are left alone; places that
  // take a file themselves (the logo field) stop the event before it gets here.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
    const onEnter = (e) => { if (hasFiles(e)) { depth++; setDraggingFiles(true); } };
    const onLeave = (e) => { if (hasFiles(e) && --depth <= 0) { depth = 0; setDraggingFiles(false); } };
    const onOver = (e) => { if (hasFiles(e)) e.preventDefault(); };
    // capture phase: also runs for drops that a field handled and stopped
    const onDropAnywhere = () => { depth = 0; setDraggingFiles(false); };
    const onDrop = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // otherwise the browser opens the file instead of the app
      const files = [...e.dataTransfer.files];
      if (!files.length) return;
      setDroppedFiles({ files, nonce: Date.now() });
      setShowData(true);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDropAnywhere, true);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('drop', onDropAnywhere, true);
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  // Errors thrown outside React rendering (timers, animation, event handlers) would otherwise be
  // invisible; surface them so a broken action is visible and can be reported precisely.
  useEffect(() => {
    const show = (err) => {
      const text = describeError(err);
      if (IGNORED_ERRORS.some(re => re.test(text))) return;
      setRuntimeError(text);
    };
    const onError = (e) => show(e.error || e.message);
    const onRejection = (e) => show(e.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  const selectTab = (id) => {
    setActiveTab(id);
    try { localStorage.setItem(TAB_KEY, id); } catch { /* private mode: not remembered */ }
  };

  return (
    <div
      className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col overflow-hidden"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex-shrink-0 flex items-end gap-1 bg-slate-950/80 border-b border-white/10 px-2 sm:px-3 pt-1" role="tablist">
        <span className="hidden md:inline-flex items-center gap-2 self-center mr-3 text-sm font-semibold text-slate-200">
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs">⚽</span>
          PlanGry
        </span>
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => selectTab(tab.id)}
            title={tab.title}
            className={`px-3 sm:px-5 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-400 text-blue-300 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setShowData(true)}
          title={backupDue ? 'Zrób kopię zapasową — ostatnia ponad 14 dni temu albo nigdy' : 'Eksport, import i kopia zapasowa danych'}
          aria-label="Dane"
          className="ml-auto self-center mb-1 px-3 py-1.5 rounded-md text-sm text-slate-300 hover:text-white hover:bg-white/10 inline-flex items-center gap-1.5"
        >
          <span aria-hidden="true">💾</span><span className="hidden sm:inline">Dane</span>
          {backupDue && (() => {
            const age = backupAgeDays();
            return (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 text-xs whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="hidden md:inline">{age === null ? 'brak kopii' : `kopia: ${age} dni temu`}</span>
              </span>
            );
          })()}
        </button>
        <button
          onClick={() => setShowSquad(true)}
          title="Kadra zespołu: numery, nazwiska i pozycje" aria-label="Kadra"
          className="self-center mb-1 px-3 py-1.5 rounded-md text-sm text-slate-300 hover:text-white hover:bg-white/10 inline-flex items-center gap-1.5"
        >
          <span aria-hidden="true">👥</span><span className="hidden sm:inline">Kadra</span>{squad.length ? <span className="text-xs text-slate-400">({squad.length})</span> : null}
        </button>
        <button
          onClick={() => setShowClub(true)}
          title="Szkółka: nazwa, logo, trener i asystent (nagłówek konspektu)" aria-label="Szkółka"
          className="self-center mb-1 px-3 py-1.5 rounded-md text-sm text-slate-300 hover:text-white hover:bg-white/10 inline-flex items-center gap-1.5"
        >
          {club.logo
            ? <img src={club.logo} alt="" className="w-5 h-5 object-contain rounded-sm bg-white" />
            : <span aria-hidden="true">🏫</span>}
          <span className="hidden sm:inline">Szkółka</span>
        </button>
      </div>

      {/* Both tabs stay mounted so switching keeps the open scheme, frame and undo history. */}
      <div className={`flex-1 flex-col overflow-hidden ${activeTab === 'tactics' ? 'flex' : 'hidden'}`}>
        <TabErrorBoundary name="Taktyka"><FootballTacticsApp embedded active={activeTab === 'tactics'} squad={squad} onOpenDrill={(id) => { selectTab('training'); setDrillRequest({ id, nonce: Date.now() }); }} /></TabErrorBoundary>
      </div>
      <div className={`flex-1 flex-col overflow-hidden ${activeTab === 'training' ? 'flex' : 'hidden'}`}>
        <TabErrorBoundary name="Trening"><TrainingDrillApp active={activeTab === 'training'} squad={squad} openDrillRequest={drillRequest} /></TabErrorBoundary>
      </div>
      <div className={`flex-1 flex-col overflow-hidden ${activeTab === 'session' ? 'flex' : 'hidden'}`}>
        <TabErrorBoundary name="Konspekt">
          <SessionPlanApp active={activeTab === 'session'} club={club} onEditClub={() => setShowClub(true)}
            onOpenDrill={(id) => { selectTab('training'); setDrillRequest({ id, nonce: Date.now() }); }} />
        </TabErrorBoundary>
      </div>

      {showData && <DataModal droppedFiles={droppedFiles} onClose={() => { setShowData(false); setDroppedFiles(null); setBackupDue(needsBackup()); }} />}
      {showClub && <ClubModal club={club} onChange={updateClub} onClose={() => setShowClub(false)} />}
      {draggingFiles && !showClub && (
        <div className="fixed inset-0 z-[400] pointer-events-none flex items-center justify-center bg-blue-950/60 border-4 border-dashed border-blue-400/70">
          <div className="px-6 py-4 rounded-2xl bg-slate-900/95 border border-blue-400/40 text-center shadow-2xl">
            <p className="text-lg font-semibold text-white">Upuść pliki, aby je zaimportować</p>
            <p className="text-sm text-slate-300">kopia zapasowa, taktyka, ćwiczenia lub konspekty (.json) — potem wybierzesz: dodaj / zastąp / pomiń</p>
          </div>
        </div>
      )}
      {notice && (
        <div role="status" aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] w-[min(92vw,40rem)] px-4 py-3 rounded-xl bg-slate-900/95 border border-emerald-500/40 text-sm text-emerald-100 shadow-2xl flex items-start gap-3">
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-300 hover:text-white" aria-label="Zamknij komunikat">✕</button>
        </div>
      )}
      {showSquad && <SquadModal squad={squad} onChange={updateSquad} onClose={() => setShowSquad(false)} />}

      {runtimeError && (
        <div role="alert" className="fixed top-3 left-1/2 -translate-x-1/2 z-[300] w-[min(92vw,36rem)] flex items-start gap-3 bg-red-950/95 border border-red-500/50 rounded-xl px-4 py-3 shadow-2xl text-sm text-red-100">
          <span className="flex-shrink-0">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Wystąpił błąd</p>
            <p className="font-mono text-xs break-words mt-0.5">{runtimeError}</p>
          </div>
          <button onClick={() => setRuntimeError(null)} className="text-red-300 hover:text-white" aria-label="Zamknij">✕</button>
        </div>
      )}
    </div>
  );
}
