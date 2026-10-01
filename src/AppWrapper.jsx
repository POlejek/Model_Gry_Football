import React, { useState } from 'react';
import FootballTacticsApp from './FootballTacticsApp';
import TrainingDrillApp from './TrainingDrillApp';

const TABS = [
  { id: 'tactics',  label: '⚽ Taktyka',  title: 'Edytor taktyki' },
  { id: 'training', label: '🏃 Trening',  title: 'Budowanie ćwiczeń' },
];

export default function AppWrapper() {
  const [activeTab, setActiveTab] = useState('tactics');

  return (
    <div
      className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col overflow-hidden"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Pasek zakładek */}
      <div className="flex-shrink-0 flex items-center gap-1 bg-slate-950/80 border-b border-white/10 px-4 pt-1" style={{ paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-blue-400 text-blue-300 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Zawartość zakładki */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'tactics'  && <FootballTacticsApp embedded />}
        {activeTab === 'training' && <TrainingDrillApp />}
      </div>
    </div>
  );
}
