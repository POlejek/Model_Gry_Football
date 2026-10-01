import React, { useState } from 'react';
import FootballTacticsApp from './FootballTacticsApp';
import TrainingDrillApp from './TrainingDrillApp';

const TABS = [
  { id: 'tactics',  label: '⚽ Taktyka', title: 'Edytor taktyki: fazy, schematy, animacje' },
  { id: 'training', label: '🏃 Trening', title: 'Budowanie ćwiczeń treningowych' },
];
const TAB_KEY = 'modelGryActiveTab';

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

  const selectTab = (id) => {
    setActiveTab(id);
    try { localStorage.setItem(TAB_KEY, id); } catch { /* private mode: not remembered */ }
  };

  return (
    <div
      className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col overflow-hidden"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex-shrink-0 flex items-end gap-1 bg-slate-950/80 border-b border-white/10 px-3 pt-1" role="tablist">
        <span className="hidden md:inline-flex items-center gap-2 self-center mr-3 text-sm font-semibold text-slate-200">
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs">⚽</span>
          Model Gry
        </span>
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => selectTab(tab.id)}
            title={tab.title}
            className={`px-5 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-400 text-blue-300 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Both tabs stay mounted so switching keeps the open scheme, frame and undo history. */}
      <div className={`flex-1 flex-col overflow-hidden ${activeTab === 'tactics' ? 'flex' : 'hidden'}`}>
        <FootballTacticsApp embedded active={activeTab === 'tactics'} />
      </div>
      <div className={`flex-1 flex-col overflow-hidden ${activeTab === 'training' ? 'flex' : 'hidden'}`}>
        <TrainingDrillApp active={activeTab === 'training'} />
      </div>
    </div>
  );
}
