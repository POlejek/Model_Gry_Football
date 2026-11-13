import React, { useEffect, useRef, useState } from 'react';
import {
  X, Route, Dumbbell, ClipboardList, Users, School, Sparkles, Database, Keyboard, Magnet, Rocket, Goal,
} from 'lucide-react';

// In-app user guide ("Instrukcja"): one page with a table of contents, opened from the top bar,
// from the editors' hints (a section id) and from the hint card a new user sees once.
export const GUIDE_SEEN_KEY = 'plangryGuideSeen';
export const OPEN_GUIDE_EVENT = 'plangry:guide';
export const openGuide = (section) => window.dispatchEvent(new CustomEvent(OPEN_GUIDE_EVENT, { detail: { section } }));

const K = ({ children }) => <kbd className="bg-white/10 border border-white/10 px-1.5 py-0.5 rounded text-[0.8em] text-slate-200 whitespace-nowrap">{children}</kbd>;
const B = ({ children }) => <span className="font-semibold text-white">{children}</span>;
const Steps = ({ items }) => (
  <ol className="space-y-1.5 list-decimal pl-5 marker:text-blue-300 marker:font-semibold">{items.map((t, i) => <li key={i}>{t}</li>)}</ol>
);
const Points = ({ items }) => (
  <ul className="space-y-1.5 list-disc pl-5 marker:text-slate-500">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
);
const Sub = ({ children }) => <h4 className="text-sm font-semibold text-blue-200 pt-2">{children}</h4>;

export const GUIDE_SECTIONS = [
  {
    id: 'start', title: 'Pierwsze kroki', Icon: Rocket,
    body: (
      <>
        <p>PlanGry prowadzi od modelu gry do gotowego treningu w trzech zakładkach:</p>
        <Points items={[
          <><B>Taktyka</B> – model gry: fazy, podfazy i animowane schematy.</>,
          <><B>Trening</B> – rysowanie ćwiczeń z opisem, zapisywanych w bibliotece.</>,
          <><B>Konspekt</B> – plan jednostki treningowej z ćwiczeń, druk i PDF.</>,
        ]} />
        <Sub>Od czego zacząć</Sub>
        <Steps items={[
          <>Uzupełnij <B>Szkółkę</B> (nazwa, logo, trener) i <B>Kadrę</B> – pojawią się w konspektach i na boisku.</>,
          <>Wczytaj przykład z <B>Gotowych treningów</B> albo utwórz pierwszy schemat w Taktyce.</>,
          <>Narysuj ćwiczenie w Treningu i zapisz je w bibliotece.</>,
          <>W Konspekcie złóż z ćwiczeń trening i wydrukuj go albo zapisz jako PDF.</>,
        ]} />
        <Sub>Gdzie są moje dane</Sub>
        <p>Wszystko zapisuje się samo, w tej przeglądarce na tym urządzeniu – bez konta i bez wysyłania na serwer.
          Dlatego regularnie rób <B>kopię zapasową</B> w oknie <B>Dane</B>; tym samym plikiem przeniesiesz pracę na inny komputer.
          Na telefonie dodaj PlanGry do ekranu początkowego – działa wtedy jak aplikacja.</p>
      </>
    ),
  },
  {
    id: 'tactics', title: 'Taktyka – model gry', Icon: Route,
    body: (
      <>
        <Sub>Fazy i schematy</Sub>
        <Points items={[
          <>Po lewej są fazy gry (Atak, A/O, Obrona, O/A, SFG) i ich podfazy. <B>Dodaj fazę</B> albo „+” przy fazie dodaje własne.</>,
          <>Wybierz podfazę i kliknij <B>Nowy schemat</B>. Nazwę, fazę i komentarze (zadania dla zawodników) uzupełnisz po prawej.</>,
          <>Format gry (5v5, 7v7, 9v9, 11v11) zmienisz na górnym pasku; dla 11v11 w menu <B>Formacja</B> ustawisz formację drużyny i przeciwnika.</>,
        ]} />
        <Sub>Ustawianie i rysowanie</Sub>
        <Points items={[
          <>Przeciągaj zawodników i piłkę. Uchwyt nad zaznaczonym zawodnikiem obraca go, a <B>dwuklik</B> zmienia numer i kolor.</>,
          <>Narzędzia na pasku: przesuwanie, <B>linie</B> (strzałki podań, biegu, prowadzenia), <B>strefy</B> i <B>tekst</B>.</>,
          <><B>Nr / Nazwiska</B> – na boisku numery albo nazwiska z Kadry.</>,
          <>Kolory drużyn zmienisz kwadracikami na pasku. W menu <B>Formacja</B> (na telefonie w panelu Drużyny) jest też <B>Ukryj przeciwnika</B> – chowa jego zawodników na boisku i w eksportach.</>,
        ]} />
        <Sub>Animacja</Sub>
        <Steps items={[
          <>Ustaw zawodników i kliknij <B>Dodaj klatkę</B> – nowa klatka kopiuje ustawienie.</>,
          <>Przesuń zawodników do następnej pozycji, powtórz.</>,
          <>Przyciskiem odtwarzania zobaczysz ruch między klatkami.</>,
        ]} />
        <Sub>Eksport</Sub>
        <Points items={[
          <>Ikona obrazka – <B>PNG</B> bieżącej klatki, np. do wysłania zawodnikom.</>,
          <><B>Pobierz animację</B> – wideo schematu.</>,
          <><B>PowerPoint</B> – prezentacja całego modelu: slajd na schemat z animacją i komentarzem.</>,
        ]} />
      </>
    ),
  },
  {
    id: 'align', title: 'Linie wyrównania', Icon: Magnet,
    body: (
      <>
        <p>Pomagają ustawić zawodników i sprzęt równo w pionie lub w poziomie – tak jak w PowerPoint. Działają w Taktyce i w Treningu.</p>
        <Sub>Jak to działa</Sub>
        <Steps items={[
          <>Chwyć zawodnika, piłkę albo sprzęt i przesuwaj go po boisku.</>,
          <>Gdy element znajdzie się prawie w tym samym pionie lub poziomie co inny, sam się do niego dociągnie i pojawi się
            <span className="text-rose-300 font-semibold"> czerwona przerywana linia</span>: pionowa – ten sam pion, pozioma – ta sama wysokość, obie – wyrównanie w obu kierunkach.</>,
          <>Puść element – zostaje dokładnie na linii, a linie znikają.</>,
        ]} />
        <Sub>Do czego się przyciąga</Sub>
        <Points items={[
          <><B>Taktyka:</B> zawodnicy obu drużyn i piłka (ukryty przeciwnik nie przyciąga).</>,
          <><B>Trening:</B> wszystkie elementy na boisku – zawodnicy, sprzęt, bandy.</>,
          <><B>Oba edytory:</B> środek boiska – linia przez środek bramek i linia środkowa.</>,
          <>Kilka zaznaczonych elementów (Trening) przyciąga się razem i zachowuje odstępy.</>,
        ]} />
        <Sub>Bez przyciągania</Sub>
        <Points items={[
          <>Komputer: przytrzymaj <K>Alt</K> (Mac: <K>Option</K>) podczas przeciągania.</>,
          <>Trening: <K>Strzałki</K> przesuwają o 1 px (z <K>Shift</K> o 10 px) – zawsze bez przyciągania.</>,
          <>Telefon: przyciąganie działa tylko kilka pikseli od linii – przesuń element trochę dalej.</>,
        ]} />
        <p className="text-slate-400">Linie widać tylko w edytorze: nie ma ich w PNG, wideo, PowerPoincie ani na wydruku.</p>
      </>
    ),
  },
  {
    id: 'training', title: 'Trening – ćwiczenia', Icon: Dumbbell,
    body: (
      <>
        <Sub>Rysowanie ćwiczenia</Sub>
        <Points items={[
          <>Z palety po lewej <B>przeciągnij</B> zawodników i sprzęt (pachołki, bramki, tyczki, bandy…) na boisko albo kliknij element, aby go dodać.</>,
          <>W zakładce <B>Boisko i kolory</B> wybierzesz pole (całe, połowa, własny wymiar w metrach, w poziomie lub pionie), kolory drużyn i bandy z logo Szkółki. Po zmianie boiska ćwiczenie dopasowuje się proporcjonalnie.</>,
          <>Tam też <B>Rozmiar zawodników</B> – jeden suwak zmienia wszystkich zawodników we wszystkich klatkach, a nowi dostają ten sam rozmiar. Rozmiar jednego elementu zmienisz w jego <B>Właściwościach</B>; przy zawodniku jest też „Ten rozmiar dla wszystkich zawodników”.</>,
          <>Przeciągnij po pustym polu, aby zaznaczyć kilka elementów; <K>Shift</K>+klik dodaje do zaznaczenia. <B>Dwuklik</B> – szybka zmiana koloru.</>,
          <><B>+ Klatka</B> kopiuje ustawienie – przesuń zawodników i odtwórz animację.</>,
        ]} />
        <Sub>Opis i biblioteka</Sub>
        <Points items={[
          <>W zakładce <B>Opis ćwiczenia</B> wpisz kategorię, czas, liczbę zawodników, wymiary, cel, organizację, przebieg, obciążenie, punkty trenerskie i warianty, a także <B>fazę modelu gry</B>, którą ćwiczenie trenuje.</>,
          <><B>Zapisz</B> (<K>Ctrl+S</K>) dodaje ćwiczenie do <B>Biblioteki</B>; <B>Nowe</B> zaczyna kolejne.</>,
          <>Przyciski <B>PNG</B> i <B>Karta</B> pobierają obraz boiska albo kartę ćwiczenia z opisem.</>,
        ]} />
      </>
    ),
  },
  {
    id: 'session', title: 'Konspekt – plan treningu', Icon: ClipboardList,
    body: (
      <>
        <Sub>Układanie treningu</Sub>
        <Steps items={[
          <><B>Nowy konspekt</B> – wpisz tytuł, datę, grupę, cel i temat zajęć. Konspekty są pogrupowane w tygodnie (mikrocykle).</>,
          <><B>Dodaj ćwiczenie</B> wstawia ćwiczenie z biblioteki (z filtrem po fazie modelu gry), a <B>Blok tekstowy</B> – własny punkt, np. rozgrzewkę. Kolejność zmienisz strzałkami.</>,
          <>Każdemu blokowi ustaw czas i część treningu (wstępna, główna, końcowa) – łączny czas liczy się sam.</>,
        ]} />
        <Sub>Druk i PDF</Sub>
        <Points items={[
          <><B>Drukuj / PDF</B> ma cztery układy: <B>Szczegółowy</B>, <B>Ćwiczenie na stronę</B>, <B>Cały trening na 1 stronie</B> i <B>na 2 stronach</B>.</>,
          <><B>Certyfikacja</B> drukuje konspekt w układzie zgodnym z certyfikacją PZPN (nagłówek ze Szkółką, boisko, czas i obciążenie).</>,
          <>Na iPhonie i iPadzie aplikacja przygotuje plik PDF – stuknij <B>Udostępnij</B>, a potem Drukuj albo Zachowaj w Plikach.</>,
          <><B>Eksportuj</B> zapisuje konspekt do pliku, który można wysłać innemu trenerowi.</>,
        ]} />
      </>
    ),
  },
  {
    id: 'squad', title: 'Kadra', Icon: Users,
    body: (
      <Points items={[
        <><B>Dodaj zawodnika</B> – numer, imię i nazwisko, pozycja. Numer łączy zawodnika z kółkiem na boisku.</>,
        <><B>Wklej listę</B> albo <K>Ctrl+V</K> w oknie Kadry: skopiuj kolumny z Excela lub listę z notatnika – jeden zawodnik w wierszu, np. „7 Jan Kowalski POM”. Przed zapisaniem zobaczysz podgląd i wybierzesz <B>Dodaj do kadry</B> albo <B>Zastąp kadrę</B>.</>,
        <>W Taktyce przełącznik <B>Nazwiska</B> pokazuje nazwiska zamiast numerów.</>,
        <>W Taktyce możesz też <B>dwukliknąć zawodnika i wpisać nazwisko</B> (albo „9 Kowalski”) – zapisze się w Kadrze pod numerem tego zawodnika, a na boisku pokażą się nazwiska.</>,
      ]} />
    ),
  },
  {
    id: 'club', title: 'Szkółka', Icon: School,
    body: (
      <Points items={[
        <>Nazwa i logo szkółki, rocznik, trener i asystent trafiają do nagłówka konspektu i wydruku do certyfikacji.</>,
        <>Logo pojawia się też na <B>bandach reklamowych</B> wokół boiska w ćwiczeniach.</>,
      ]} />
    ),
  },
  {
    id: 'packs', title: 'Gotowe treningi', Icon: Sparkles,
    body: (
      <Points items={[
        <>Gotowe modele gry i zestawy treningów do wczytania jednym kliknięciem – wybierz format swojej drużyny i kliknij <B>Dodaj</B>.</>,
        <>Schematy trafiają do Taktyki, konspekty do bieżącego tygodnia, a ćwiczenia do biblioteki. Twoje treningi zostają bez zmian, a wszystko możesz potem zmienić.</>,
        <>Dodanie cofniesz w oknie <B>Dane</B>.</>,
      ]} />
    ),
  },
  {
    id: 'data', title: 'Dane i kopia zapasowa', Icon: Database,
    body: (
      <Points items={[
        <><B>Eksport</B> zapisuje całą pracę (lub wybrane części) do jednego pliku – to Twoja kopia zapasowa. Gdy kopia jest stara, przycisk Dane świeci na żółto.</>,
        <><B>Import</B> wczytuje plik; możesz też <B>przeciągnąć plik</B> na okno aplikacji. Wybierzesz, czy dodać, czy zastąpić dane, a import da się cofnąć.</>,
        <><B>Wyczyść wszystko</B> usuwa dane z tej przeglądarki – zrób wcześniej kopię.</>,
      ]} />
    ),
  },
  {
    id: 'keys', title: 'Skróty klawiszowe', Icon: Keyboard,
    body: (
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {[
          ['V / L / S', 'przesuwanie / linie / strefy'],
          ['Ctrl+Z / Ctrl+Y', 'cofnij / ponów'],
          ['Ctrl+C / Ctrl+V', 'kopiuj / wklej'],
          ['Ctrl+D', 'duplikuj (Trening)'],
          ['Ctrl+A', 'zaznacz wszystko (Trening)'],
          ['Ctrl+S', 'zapisz ćwiczenie (Trening)'],
          ['Strzałki', 'przesuń o 1 px, z Shift o 10 px (Trening)'],
          ['Delete', 'usuń zaznaczone'],
          ['Esc', 'anuluj rysowanie / odznacz'],
          ['Alt + przeciąganie', 'bez przyciągania do linii wyrównania'],
          ['Dwuklik', 'numer i kolor zawodnika / kolor elementu'],
        ].map(([k, d]) => <p key={k}><K>{k}</K> <span className="text-slate-300">{d}</span></p>)}
      </div>
    ),
  },
];

export default function GuideModal({ section, onClose }) {
  const [active, setActive] = useState(section || GUIDE_SECTIONS[0].id);
  const scrollRef = useRef(null);
  const go = (id) => {
    setActive(id);
    const el = scrollRef.current?.querySelector(`#guide-${id}`);
    if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' });
  };
  useEffect(() => {
    try { localStorage.setItem(GUIDE_SEEN_KEY, '1'); } catch { /* ignore */ }
    if (section) requestAnimationFrame(() => go(section));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // the table of contents follows the section being read
  const onScroll = () => {
    const box = scrollRef.current;
    if (!box) return;
    const top = box.scrollTop + 80;
    let current = GUIDE_SECTIONS[0].id;
    GUIDE_SECTIONS.forEach(s => { const el = box.querySelector(`#guide-${s.id}`); if (el && el.offsetTop <= top) current = s.id; });
    if (current !== active) setActive(current);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Instrukcja"
      className="fixed inset-0 z-[160] bg-slate-950 text-white flex flex-col"
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/10 bg-slate-900/80">
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><Goal size={18} aria-hidden="true" /></span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold leading-tight">Instrukcja PlanGry</h2>
          <p className="text-xs text-slate-400 truncate">Od modelu gry do treningu – opis wszystkich opcji</p>
        </div>
        <button onClick={onClose} className="h-9 px-4 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 hidden sm:inline-flex items-center">Zaczynamy</button>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white" aria-label="Zamknij instrukcję"><X size={20} /></button>
      </header>

      {/* phone: chapters as a scrolling row; wider screens: a list on the left */}
      <nav aria-label="Spis treści" className="md:hidden flex-shrink-0 flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-white/10">
        {GUIDE_SECTIONS.map(s => (
          <button key={s.id} onClick={() => go(s.id)} aria-current={active === s.id ? 'true' : undefined}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs ${active === s.id ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-300'}`}>
            {s.title}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-h-0 flex">
        <nav aria-label="Spis treści" className="hidden md:flex flex-col w-64 flex-shrink-0 border-r border-white/10 p-3 gap-0.5 overflow-y-auto">
          {GUIDE_SECTIONS.map(s => (
            <button key={s.id} onClick={() => go(s.id)} aria-current={active === s.id ? 'true' : undefined}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                active === s.id ? 'bg-blue-600/20 text-blue-100' : 'text-slate-300 hover:bg-white/5'}`}>
              <s.Icon size={16} aria-hidden="true" className={active === s.id ? 'text-blue-300' : 'text-slate-500'} />{s.title}
            </button>
          ))}
        </nav>
        <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 min-w-0 overflow-y-auto scrollbar-custom">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 space-y-10 text-sm leading-relaxed text-slate-300">
            {GUIDE_SECTIONS.map(s => (
              <section key={s.id} id={`guide-${s.id}`} aria-labelledby={`guide-h-${s.id}`} className="space-y-2 scroll-mt-4">
                <h3 id={`guide-h-${s.id}`} className="flex items-center gap-2.5 text-xl font-semibold text-white">
                  <span className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center"><s.Icon size={16} className="text-blue-300" aria-hidden="true" /></span>
                  {s.title}
                </h3>
                {s.body}
              </section>
            ))}
            <p className="text-xs text-slate-500 border-t border-white/10 pt-4">Instrukcję otworzysz w każdej chwili przyciskiem „Instrukcja” na górnym pasku.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
