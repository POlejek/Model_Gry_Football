import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FootballTacticsApp from './FootballTacticsApp.jsx';

const stored = () => JSON.parse(localStorage.getItem('footballTacticsData') || 'null');
const allSchemes = (format) => Object.values(stored()?.schemes?.[format] || {}).flat();
const frameCounter = () => screen.getByText(/^\d+ \/ \d+$/).textContent;
const createScheme = (user) => user.click(screen.getAllByRole('button', { name: /^Nowy schemat$/ })[0]);

const setup = () => {
  const user = userEvent.setup();
  render(<FootballTacticsApp embedded />);
  return { user };
};

describe('Taktyka — schematy', () => {
  it('bez schematu ostrzega, że zmiany nie są zapisywane, i proponuje utworzenie schematu', () => {
    setup();
    expect(screen.getAllByText(/Bez schematu/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Nowy schemat w fazie „Atak – Otwarcie”/ })).toBeInTheDocument();
  });

  it('„Nowy schemat” tworzy i zapisuje schemat w bieżącej fazie', async () => {
    const { user } = setup();
    await createScheme(user);
    expect(screen.getAllByText(/Zapisano/).length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Schemat 1')).toBeInTheDocument();
    expect(stored().schemes['11v11']['Atak-Otwarcie']).toHaveLength(1);
  });

  it('dodawanie klatek i cofanie (Ctrl+Z) działa na otwartym schemacie', async () => {
    const { user } = setup();
    await createScheme(user);
    expect(frameCounter()).toBe('1 / 1');
    await user.click(screen.getByRole('button', { name: 'Dodaj klatkę' }));
    expect(frameCounter()).toBe('2 / 2');
    expect(allSchemes('11v11')[0].frames).toHaveLength(2);
    await user.keyboard('{Control>}z{/Control}');
    expect(frameCounter()).toBe('1 / 1');
    expect(screen.getAllByRole('button', { name: 'Ponów' })[0]).toBeEnabled();
  });
});

describe('Taktyka — formaty gry', () => {
  it.each([
    ['5v5', 5],
    ['7v7', 7],
    ['9v9', 9],
    ['11v11', 11],
  ])('format %s tworzy schemat z %i zawodnikami na drużynę', async (format, players) => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: format }));
    await createScheme(user);
    const [scheme] = allSchemes(format);
    expect(scheme.frames[0].team).toHaveLength(players);
    expect(scheme.frames[0].opponent).toHaveLength(players);
    expect(stored().gameFormat).toBe(format);
  });

  it('formacje są dostępne tylko dla 11v11', async () => {
    const { user } = setup();
    expect(screen.getByRole('button', { name: /Formacja/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '5v5' }));
    expect(screen.queryByRole('button', { name: /Formacja/ })).not.toBeInTheDocument();
  });

  it('wczytuje zapis sprzed dodania 5v5 i pozwala od razu użyć nowego formatu', async () => {
    localStorage.setItem('footballTacticsData', JSON.stringify({
      _version: 2, gameFormat: '11v11', schemes: { '11v11': { 'Atak-Otwarcie': [] }, '9v9': {}, '7v7': {} },
    }));
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: '5v5' }));
    await createScheme(user);
    expect(allSchemes('5v5')).toHaveLength(1);
  });
});

describe('Taktyka — narzędzia', () => {
  it('skróty V / L / S przełączają tryb, a Esc wraca do przesuwania', async () => {
    const { user } = setup();
    const pressed = (name) => screen.getAllByRole('button', { name })[0];
    await user.keyboard('l');
    expect(pressed('Linie')).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('s');
    expect(pressed('Strefy')).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{Escape}');
    expect(pressed('Przesuwanie')).toHaveAttribute('aria-pressed', 'true');
  });

  it('skróty są wyłączone, gdy zakładka jest nieaktywna', async () => {
    const user = userEvent.setup();
    render(<FootballTacticsApp embedded active={false} />);
    await user.keyboard('l');
    expect(screen.getAllByRole('button', { name: 'Linie' })[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('Kopiuj i Usuń są nieaktywne, dopóki nie zaznaczysz linii ani strefy', () => {
    setup();
    expect(screen.getAllByRole('button', { name: 'Kopiuj' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Usuń' })[0]).toBeDisabled();
  });
});

describe('Taktyka — odtwarzanie animacji', () => {
  it('po zakończeniu animacji ponowne „Odtwórz” zaczyna od pierwszej klatki', async () => {
    vi.useFakeTimers();
    try {
      render(<FootballTacticsApp embedded />);
      fireEvent.click(screen.getAllByRole('button', { name: /^Nowy schemat$/ })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Dodaj klatkę' }));
      fireEvent.click(screen.getByRole('button', { name: 'Dodaj klatkę' }));
      expect(frameCounter()).toBe('3 / 3');
      for (let run = 1; run <= 2; run++) {
        fireEvent.click(screen.getByRole('button', { name: 'Odtwórz animację' }));
        expect(frameCounter()).toBe('1 / 3');
        for (let t = 0; t < 40; t++) await act(async () => { vi.advanceTimersByTime(100); });
        expect(frameCounter()).toBe('3 / 3');
        expect(screen.getByRole('button', { name: 'Odtwórz animację' })).toBeInTheDocument();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('nawet gdy wiele kroków animacji wykona się przed odświeżeniem ekranu, klatka nie wychodzi poza koniec', async () => {
    vi.useFakeTimers();
    try {
      render(<FootballTacticsApp embedded />);
      fireEvent.click(screen.getAllByRole('button', { name: /^Nowy schemat$/ })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Dodaj klatkę' }));
      fireEvent.click(screen.getByRole('button', { name: 'Odtwórz animację' }));
      await act(async () => { vi.advanceTimersByTime(5000); });
      expect(frameCounter()).toBe('2 / 2');
      fireEvent.click(screen.getByRole('button', { name: 'Odtwórz animację' }));
      expect(frameCounter()).toBe('1 / 2');
    } finally {
      vi.useRealTimers();
    }
  });
});
