import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
