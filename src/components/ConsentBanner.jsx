import React, { useState } from 'react';

// What the statistics collect, shown in the consent banner and in "Dane".
export function PrivacyNote() {
  return (
    <div className="text-xs text-slate-300 space-y-1.5">
      <p>
        Za Twoją zgodą PlanGry korzysta z Google Analytics, aby liczyć wejścia i sprawdzać, z których funkcji
        trenerzy korzystają (np. otwarcie zakładki, druk konspektu, eksport ćwiczenia). Google zapisuje w tym celu
        ciasteczka <code>_ga</code> i przetwarza anonimowe dane o urządzeniu, przeglądarce i przybliżonej lokalizacji.
      </p>
      <p>
        Nie wysyłamy Twoich danych z aplikacji: ćwiczeń, konspektów, kadry, nazwy szkółki ani logo — one zostają
        tylko w tej przeglądarce. Dane statystyczne są przechowywane do 14 miesięcy, bez reklam i bez Google Signals.
      </p>
      <p>Zgodę możesz w każdej chwili zmienić w oknie „Dane”.</p>
    </div>
  );
}

export default function ConsentBanner({ onChoose }) {
  const [details, setDetails] = useState(false);
  return (
    <div role="dialog" aria-label="Zgoda na statystyki"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[250] w-[min(94vw,36rem)] rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl p-4 text-white">
      <p className="text-sm font-semibold">Statystyki odwiedzin</p>
      <p className="text-sm text-slate-300 mt-1">
        Czy zgadzasz się na anonimowe statystyki (Google Analytics)? Pomagają nam rozwijać PlanGry. Twoje ćwiczenia
        i konspekty nigdzie nie są wysyłane.
      </p>
      {details && <div className="mt-2"><PrivacyNote /></div>}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button onClick={() => onChoose('granted')} className="h-9 px-4 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500">Akceptuję</button>
        <button onClick={() => onChoose('denied')} className="h-9 px-4 rounded-md text-sm bg-white/10 hover:bg-white/15">Odrzucam</button>
        <button onClick={() => setDetails(d => !d)} className="ml-auto text-xs text-slate-400 hover:text-white underline">
          {details ? 'Ukryj szczegóły' : 'Szczegóły i prywatność'}
        </button>
      </div>
    </div>
  );
}
