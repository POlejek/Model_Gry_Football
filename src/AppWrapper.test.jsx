import { describe, it, expect, vi } from 'vitest';
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
