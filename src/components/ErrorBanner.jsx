import React from 'react';

/**
 * Wyświetla błąd eksportu lub inny krytyczny błąd aplikacji.
 * @param {{ message: string, onDismiss: () => void }} props
 */
export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3
                    bg-red-900/95 backdrop-blur border border-red-500/50 rounded-xl px-5 py-3
                    shadow-2xl text-white max-w-lg w-full mx-4 animate-in slide-in-from-top-2">
      <span className="text-xl flex-shrink-0">⚠️</span>
      <span className="text-sm flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="text-red-300 hover:text-white transition-colors text-lg leading-none flex-shrink-0"
        aria-label="Zamknij"
      >
        ✕
      </button>
    </div>
  );
}
