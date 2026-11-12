import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppWrapper from './AppWrapper.jsx';

describe('Zakładki aplikacji', () => {
  it('domyślnie otwiera Taktykę', () => {
    render(<AppWrapper />);
    expect(screen.getByRole('tab', { name: /Taktyka/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Trening/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('przełącza zakładkę i zapamiętuje wybór po ponownym uruchomieniu', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AppWrapper />);
    await user.click(screen.getByRole('tab', { name: /Trening/ }));
    expect(screen.getByRole('tab', { name: /Trening/ })).toHaveAttribute('aria-selected', 'true');
    unmount();
    render(<AppWrapper />);
    expect(screen.getByRole('tab', { name: /Trening/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('ignoruje nieznaną zapamiętaną zakładkę', () => {
    localStorage.setItem('modelGryActiveTab', 'cos-innego');
    render(<AppWrapper />);
    expect(screen.getByRole('tab', { name: /Taktyka/ })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Komunikaty o błędach', () => {
  it('pokazuje treść nieobsłużonego błędu i pozwala go zamknąć', async () => {
    const user = userEvent.setup();
    render(<AppWrapper />);
    fireEvent(window, new ErrorEvent('error', { error: new TypeError('Coś się zepsuło'), message: 'Coś się zepsuło' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('TypeError: Coś się zepsuło');
    await user.click(screen.getByRole('button', { name: 'Zamknij' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('nie pokazuje paska dla nieszkodliwego komunikatu przeglądarki (ResizeObserver)', () => {
    render(<AppWrapper />);
    fireEvent(window, new ErrorEvent('error', { message: 'ResizeObserver loop completed with undelivered notifications.' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Szkółka, przeciąganie plików i czyszczenie danych', () => {
  it('nazwa szkółki i trener zapisują się na stałe', async () => {
    const user = userEvent.setup();
    render(<AppWrapper />);
    await user.click(screen.getByRole('button', { name: 'Szkółka' }));
    const dialog = screen.getByRole('dialog', { name: 'Szkółka i trener' });
    await user.type(within(dialog).getByLabelText('Nazwa szkółki / klubu'), 'AP BKS Naprzód Brwinów');
    await user.type(within(dialog).getByLabelText('Drużyna / rocznik'), '2013');
    await user.type(within(dialog).getByLabelText('Trener'), 'Paweł');
    expect(within(dialog).getByText('AP BKS Naprzód Brwinów - 2013')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Gotowe' }));
    expect(JSON.parse(localStorage.getItem('modelGryClub'))).toMatchObject({ name: 'AP BKS Naprzód Brwinów', team: '2013', coach: 'Paweł' });
  });

  it('upuszczony plik otwiera import z wyborem: pomiń / dodaj / zastąp', async () => {
    render(<AppWrapper />);
    const file = new File([JSON.stringify({ format: 'model-gry-training-library', drills: [{ id: 'd1', name: 'Rondo', frames: [{ items: [], lines: [], zones: [] }] }] })],
      'cwiczenia.json', { type: 'application/json' });
    fireEvent.dragEnter(document.body, { dataTransfer: { types: ['Files'], files: [] } });
    expect(screen.getByText('Upuść pliki, aby je zaimportować')).toBeInTheDocument();
    fireEvent.drop(document.body, { dataTransfer: { types: ['Files'], files: [file] } });
    expect(screen.queryByText('Upuść pliki, aby je zaimportować')).not.toBeInTheDocument();

    const dialog = await screen.findByRole('dialog', { name: 'Dane i kopia zapasowa' });
    const choice = await within(dialog).findByRole('radiogroup', { name: 'Biblioteka ćwiczeń: co zrobić' });
    expect(within(choice).getAllByRole('radio').map(r => r.textContent)).toEqual(['Pomiń', 'Dodaj', 'Zastąp']);
    expect(within(choice).getByRole('radio', { name: 'Dodaj' })).toHaveAttribute('aria-checked', 'true');
  });

  it('przeciąganie elementów wewnątrz aplikacji (bez plików) nie otwiera importu', () => {
    render(<AppWrapper />);
    fireEvent.dragEnter(document.body, { dataTransfer: { types: ['text/plain'], files: [] } });
    fireEvent.drop(document.body, { dataTransfer: { types: ['text/plain'], files: [] } });
    expect(screen.queryByText('Upuść pliki, aby je zaimportować')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Dane i kopia zapasowa' })).not.toBeInTheDocument();
  });

  it('„Wyczyść wszystko” pyta o potwierdzenie; anulowanie zostawia dane', async () => {
    const user = userEvent.setup();
    localStorage.setItem('modelGrySquad', JSON.stringify([{ id: 'p', number: '9', name: 'Jan', position: 'NAP' }]));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<AppWrapper />);
    await user.click(screen.getByRole('button', { name: 'Dane' }));
    await user.click(screen.getByRole('button', { name: 'Wyczyść wszystko' }));
    expect(confirm.mock.calls[0][0]).toContain('Kadra (1 zawodnik)');
    expect(JSON.parse(localStorage.getItem('modelGrySquad'))).toHaveLength(1);
  });
});

describe('Zgoda na statystyki', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('bez identyfikatora Google Analytics okienko się nie pokazuje', () => {
    render(<AppWrapper />);
    expect(screen.queryByRole('dialog', { name: 'Zgoda na statystyki' })).not.toBeInTheDocument();
  });

  it('pyta przy pierwszym wejściu, zapamiętuje odmowę i pozwala zmienić zdanie w „Dane”', async () => {
    vi.stubEnv('VITE_GA_ID', 'G-TEST123');
    const user = userEvent.setup();
    const { unmount } = render(<AppWrapper />);
    const banner = screen.getByRole('dialog', { name: 'Zgoda na statystyki' });
    await user.click(within(banner).getByRole('button', { name: 'Szczegóły i prywatność' }));
    expect(banner).toHaveTextContent('Nie wysyłamy Twoich danych z aplikacji');
    await user.click(within(banner).getByRole('button', { name: 'Odrzucam' }));
    expect(screen.queryByRole('dialog', { name: 'Zgoda na statystyki' })).not.toBeInTheDocument();
    expect(localStorage.getItem('plangryAnalyticsConsent')).toBe('denied');

    unmount();
    render(<AppWrapper />);
    expect(screen.queryByRole('dialog', { name: 'Zgoda na statystyki' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dane' }));
    await user.click(screen.getByRole('button', { name: 'Włącz statystyki' }));
    expect(localStorage.getItem('plangryAnalyticsConsent')).toBe('granted');
    expect(screen.getByRole('button', { name: 'Wyłącz statystyki' })).toBeInTheDocument();
  });

  it('liczy zakładkę startową po zgodzie i każde przejście do innej zakładki', async () => {
    vi.stubEnv('VITE_GA_ID', 'G-TEST123');
    const user = userEvent.setup();
    render(<AppWrapper />);
    await user.click(screen.getByRole('button', { name: 'Akceptuję' }));
    await user.click(screen.getByRole('tab', { name: /Konspekt/ }));
    const titles = window.dataLayer.map(a => [...a]).filter(a => a[0] === 'event' && a[1] === 'page_view').map(a => a[2].page_title);
    expect(titles).toEqual(['Taktyka', 'Konspekt']);
  });
});

describe('Instrukcja', () => {
  it('nowy użytkownik widzi raz małą podpowiedź zamiast całej instrukcji; z podpowiedzi otwiera instrukcję', async () => {
    const user = userEvent.setup();
    localStorage.removeItem('plangryGuideSeen');
    const { unmount } = render(<AppWrapper />);
    expect(screen.queryByRole('dialog', { name: 'Instrukcja' })).not.toBeInTheDocument();
    const hint = screen.getByRole('complementary', { name: 'Podpowiedź: instrukcja' });
    await user.click(within(hint).getByRole('button', { name: 'Otwórz instrukcję' }));
    const guide = screen.getByRole('dialog', { name: 'Instrukcja' });
    expect(within(guide).getByRole('heading', { name: 'Linie wyrównania' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Podpowiedź: instrukcja' })).not.toBeInTheDocument();
    unmount();
    render(<AppWrapper />);
    expect(screen.queryByRole('complementary', { name: 'Podpowiedź: instrukcja' })).not.toBeInTheDocument();
  });

  it('„Nie teraz” chowa podpowiedź na stałe', async () => {
    const user = userEvent.setup();
    localStorage.removeItem('plangryGuideSeen');
    const { unmount } = render(<AppWrapper />);
    await user.click(screen.getByRole('button', { name: 'Nie teraz' }));
    expect(screen.queryByRole('complementary', { name: 'Podpowiedź: instrukcja' })).not.toBeInTheDocument();
    unmount();
    render(<AppWrapper />);
    expect(screen.queryByRole('complementary', { name: 'Podpowiedź: instrukcja' })).not.toBeInTheDocument();
  });

  it('trener z zapisanymi danymi nie dostaje podpowiedzi, a instrukcja jest pod przyciskiem', async () => {
    const user = userEvent.setup();
    localStorage.removeItem('plangryGuideSeen');
    localStorage.setItem('trainingSessions', JSON.stringify([{ id: 's', title: 'Mój', blocks: [] }]));
    render(<AppWrapper />);
    expect(screen.queryByRole('complementary', { name: 'Podpowiedź: instrukcja' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Instrukcja' }));
    expect(screen.getByRole('dialog', { name: 'Instrukcja' })).toBeInTheDocument();
  });
});
