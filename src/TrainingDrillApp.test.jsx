import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainingDrillApp from './TrainingDrillApp.jsx';
import { DRILL_FORMAT, LIBRARY_FORMAT } from './utils/drill.js';

// Desktop and phone layouts are both in the DOM (Tailwind breakpoints are CSS-only), so queries
// are scoped to the desktop side panels / toolbar.
const leftPanel = () => screen.getAllByRole('complementary')[0];
const inspector = () => screen.getAllByRole('complementary')[1];
const frameStatus = () => within(inspector()).getByText(/Klatka \d+\/\d+/).textContent;
const saveStatus = () => within(leftPanel()).getByText(/Nowe ćwiczenie|Niezapisane zmiany|Zapisano w bibliotece/).textContent;
const addFromPalette = (user, label) => user.click(within(leftPanel()).getByTitle(new RegExp(`^${label} —`)));
const library = () => JSON.parse(localStorage.getItem('trainingDrillLibrary') || '[]');

const setup = () => {
  const user = userEvent.setup();
  const utils = render(<TrainingDrillApp />);
  return { user, ...utils };
};

describe('Trening — dodawanie i edycja elementów', () => {
  it('nowe ćwiczenie jest puste i podpowiada, jak zacząć', () => {
    setup();
    expect(frameStatus()).toContain('0 el.');
    expect(saveStatus()).toBe('Nowe ćwiczenie');
    expect(screen.getByText(/Kliknij sprzęt w lewym panelu/)).toBeInTheDocument();
  });

  it('kliknięcie w sprzęt dodaje go na boisko i pokazuje jego właściwości', async () => {
    const { user } = setup();
    await addFromPalette(user, 'Stożek');
    expect(frameStatus()).toContain('1 el.');
    expect(within(inspector()).getByText('Stożek')).toBeInTheDocument();
    expect(saveStatus()).toMatch(/niezapisane/);
  });

  it('kolejni zawodnicy drużyny dostają kolejne numery, a numer można zmienić na imię', async () => {
    const { user } = setup();
    await addFromPalette(user, 'Zawodnik A');
    await addFromPalette(user, 'Zawodnik A');
    const label = within(inspector()).getByPlaceholderText('np. 10 lub Jan');
    expect(label).toHaveValue('2');
    await user.clear(label);
    await user.type(label, 'Jan');
    expect(label).toHaveValue('Jan');
  });

  it('Backspace podczas pisania w polu tekstowym nie usuwa zaznaczonego elementu', async () => {
    const { user } = setup();
    await addFromPalette(user, 'Zawodnik A');
    const label = within(inspector()).getByPlaceholderText('np. 10 lub Jan');
    await user.click(label);
    await user.keyboard('{Backspace}');
    expect(frameStatus()).toContain('1 el.');
  });

  it('Delete usuwa zaznaczony element, a Ctrl+Z go przywraca', async () => {
    const { user } = setup();
    await addFromPalette(user, 'Piłka');
    await user.keyboard('{Delete}');
    expect(frameStatus()).toContain('0 el.');
    await user.keyboard('{Control>}z{/Control}');
    expect(frameStatus()).toContain('1 el.');
    await user.keyboard('{Control>}y{/Control}');
    expect(frameStatus()).toContain('0 el.');
  });

  it('Ctrl+D duplikuje zaznaczenie', async () => {
    const { user } = setup();
    await addFromPalette(user, 'Tyczka');
    await user.keyboard('{Control>}d{/Control}');
    expect(frameStatus()).toContain('2 el.');
  });
});

describe('Trening — narzędzia i animacja', () => {
  it('skróty V / L / S przełączają narzędzie i pokazują podpowiedź', async () => {
    const { user } = setup();
    await user.keyboard('l');
    expect(screen.getAllByRole('button', { name: 'Linie' })[0]).toHaveClass('bg-blue-600');
    expect(screen.getByText(/aby narysować linię/)).toBeInTheDocument();
    await user.keyboard('s');
    expect(screen.getByText(/aby narysować strefę/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getAllByRole('button', { name: 'Zaznacz' })[0]).toHaveClass('bg-blue-600');
  });

  it('„Odtwórz” jest nieaktywne przy jednej klatce i aktywne po dodaniu drugiej', async () => {
    const { user } = setup();
    const play = () => screen.getByRole('button', { name: /Odtwórz/ });
    expect(play()).toBeDisabled();
    await user.click(screen.getAllByRole('button', { name: 'Dodaj klatkę' })[0]);
    expect(frameStatus()).toContain('Klatka 2/2');
    expect(play()).toBeEnabled();
  });

  it('animację można odtworzyć ponownie po jej zakończeniu', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout'] });
    try {
      render(<TrainingDrillApp />);
      fireEvent.click(screen.getAllByRole('button', { name: 'Dodaj klatkę' })[0]);
      for (let run = 1; run <= 2; run++) {
        fireEvent.click(screen.getByRole('button', { name: /Odtwórz/ }));
        expect(screen.getByRole('button', { name: /Stop/ })).toBeInTheDocument();
        await act(async () => { vi.advanceTimersByTime(3000); });
        expect(screen.getByRole('button', { name: /Odtwórz/ })).toBeInTheDocument();
      }
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Trening — biblioteka ćwiczeń', () => {
  it('zapis dodaje ćwiczenie do biblioteki i zmienia stan; kolejna zmiana oznacza „Niezapisane”', async () => {
    const { user } = setup();
    await addFromPalette(user, 'Stożek');
    await user.type(within(leftPanel()).getByRole('textbox', { name: 'Nazwa ćwiczenia' }), 'Rondo 4v2');
    await user.click(within(leftPanel()).getByRole('button', { name: /Zapisz/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Zapisano „Rondo 4v2”');
    expect(saveStatus()).toBe('Zapisano w bibliotece');
    expect(library()).toHaveLength(1);
    expect(library()[0]).toMatchObject({ name: 'Rondo 4v2' });

    await addFromPalette(user, 'Piłka');
    expect(saveStatus()).toBe('Niezapisane zmiany');
  });

  it('Ctrl+S zapisuje także wtedy, gdy kursor jest w polu nazwy', async () => {
    const { user } = setup();
    const name = within(leftPanel()).getByRole('textbox', { name: 'Nazwa ćwiczenia' });
    await user.type(name, 'Skrót');
    await user.keyboard('{Control>}s{/Control}');
    expect(library().map(d => d.name)).toEqual(['Skrót']);
  });

  it('biblioteka filtruje po nazwie, otwiera ćwiczenie i zamyka się klawiszem Esc', async () => {
    localStorage.setItem('trainingDrillLibrary', JSON.stringify([
      { id: 'a', name: 'Rondo', updatedAt: '2026-01-01T10:00:00Z', frames: [{ items: [{ id: 1, type: 'cone', x: 10, y: 10 }], lines: [], zones: [] }] },
      { id: 'b', name: 'Gra 3v3', updatedAt: '2026-01-02T10:00:00Z', frames: [{ items: [], lines: [], zones: [] }] },
    ]));
    const { user } = setup();
    await user.click(within(leftPanel()).getByRole('button', { name: /Biblioteka/ }));
    const dialog = screen.getByRole('dialog', { name: 'Biblioteka ćwiczeń' });
    await user.type(within(dialog).getByRole('searchbox'), 'ron');
    expect(within(dialog).queryByText('Gra 3v3')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Otwórz' }));
    expect(screen.queryByRole('dialog', { name: 'Biblioteka ćwiczeń' })).not.toBeInTheDocument();
    expect(within(leftPanel()).getByRole('textbox', { name: 'Nazwa ćwiczenia' })).toHaveValue('Rondo');
    expect(frameStatus()).toContain('1 el.');

    await user.click(within(leftPanel()).getByRole('button', { name: /Biblioteka/ }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Biblioteka ćwiczeń' })).not.toBeInTheDocument();
  });

  it('przed porzuceniem niezapisanych zmian pyta o potwierdzenie', async () => {
    localStorage.setItem('trainingDrillLibrary', JSON.stringify([
      { id: 'a', name: 'Rondo', updatedAt: '2026-01-01T10:00:00Z', frames: [{ items: [], lines: [], zones: [] }] },
    ]));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { user } = setup();
    await addFromPalette(user, 'Stożek');
    await user.click(within(leftPanel()).getByRole('button', { name: /Biblioteka/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Otwórz' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(frameStatus()).toContain('1 el.');
  });

  it('import wielu plików naraz dodaje ćwiczenia, pomija duplikaty i zgłasza błędne pliki', async () => {
    localStorage.setItem('trainingDrillLibrary', JSON.stringify([
      { id: 'dup', name: 'Istniejące', updatedAt: '2026-01-01T00:00:00Z', frames: [{ items: [], lines: [], zones: [] }] },
    ]));
    const { user, container } = setup();
    const json = (obj, name) => new File([JSON.stringify(obj)], name, { type: 'application/json' });
    const files = [
      json({ format: LIBRARY_FORMAT, drills: [
        { id: 'dup', name: 'Istniejące', updatedAt: '2026-01-01T00:00:00Z', frames: [{ items: [], lines: [], zones: [] }] },
        { id: 'new', name: 'Nowe', updatedAt: '2026-02-01T00:00:00Z', frames: [{ items: [], lines: [], zones: [] }] },
      ] }, 'biblioteka.json'),
      json({ format: DRILL_FORMAT, name: 'Pojedyncze', frames: [{ items: [], lines: [], zones: [] }] }, 'jedno.json'),
      new File(['to nie jest json'], 'zly.json', { type: 'application/json' }),
    ];
    await user.upload(container.querySelector('input[type=file]'), files);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Zaimportowano: 2'));
    expect(screen.getByRole('status')).toHaveTextContent('pominięte duplikaty: 1');
    expect(screen.getByRole('status')).toHaveTextContent('błędne pliki: 1');
    expect(library().map(d => d.name).sort()).toEqual(['Istniejące', 'Nowe', 'Pojedyncze']);
  });
});

describe('Trening — szkic', () => {
  it('zapamiętuje pracę w szkicu i przywraca ją po ponownym otwarciu', async () => {
    const { user, unmount } = setup();
    await addFromPalette(user, 'Stożek');
    await user.type(within(leftPanel()).getByRole('textbox', { name: 'Nazwa ćwiczenia' }), 'Szkic');
    unmount();
    render(<TrainingDrillApp />);
    expect(within(leftPanel()).getByRole('textbox', { name: 'Nazwa ćwiczenia' })).toHaveValue('Szkic');
    expect(frameStatus()).toContain('1 el.');
  });
});
