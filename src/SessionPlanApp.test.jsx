import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionPlanApp, { parseSessionFile, SESSION_FORMAT, SESSION_LIBRARY_FORMAT } from './SessionPlanApp.jsx';

describe('parseSessionFile', () => {
  const session = { id: 's1', blocks: [] };
  const drill = { id: 'd1', frames: [] };

  it('czyta pojedynczy konspekt i bibliotekę konspektów', () => {
    expect(parseSessionFile({ format: SESSION_FORMAT, session, drills: [drill] })).toEqual({ sessions: [session], drills: [drill] });
    expect(parseSessionFile({ format: SESSION_LIBRARY_FORMAT, sessions: [session] })).toEqual({ sessions: [session], drills: [] });
  });

  it('czyta konspekty i ćwiczenia z pełnej kopii (Dane)', () => {
    const backup = { format: 'model-gry-backup', version: 1, sections: { sessions: [session], drills: [drill] } };
    expect(parseSessionFile(backup)).toEqual({ sessions: [session], drills: [drill] });
  });

  it('odrzuca kopię bez konspektów i nieznane pliki', () => {
    expect(parseSessionFile({ format: 'model-gry-backup', sections: { drills: [drill] } })).toBeNull();
    expect(parseSessionFile({ format: 'coś-innego' })).toBeNull();
    expect(parseSessionFile(null)).toBeNull();
  });
});

describe('Konspekt zgodny z certyfikacją PZPN', () => {
  const textBlock = (id, title, minutes) => ({ id, drillId: null, title, minutes: String(minutes), note: '' });
  const seedSession = () => localStorage.setItem('trainingSessions', JSON.stringify([{
    id: 's1', title: 'Trening 1', date: '2026-10-19', group: 'U13', goal: 'Wyjście spod pressingu', notes: '', phases: [],
    blocks: [textBlock('b1', 'Rozgrzewka', 10), textBlock('b2', 'Gra 8v8', 30), textBlock('b3', 'Rozciąganie', 5)],
  }]));
  const club = { name: 'AP BKS Naprzód Brwinów', team: '2013', logo: '', coach: 'Paweł Olejniczak', assistant: '' };

  it('bez włączenia konspekt wygląda jak dotąd', () => {
    seedSession();
    render(<SessionPlanApp club={club} />);
    expect(screen.queryByLabelText('Część treningu')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Drukuj konspekt do certyfikacji' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Drukuj / PDF' })).toBeInTheDocument();
  });

  it('pola do wypełnienia, części treningu i wydruk w układzie formularza', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    seedSession();
    render(<SessionPlanApp club={club} />);

    await user.click(screen.getByRole('checkbox', { name: /Konspekt zgodny z certyfikacją PZPN/ }));
    expect(screen.getByText('AP BKS Naprzód Brwinów - 2013')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Część treningu').map(s => s.value)).toEqual(['wstepna', 'glowna', 'koncowa']);
    expect(screen.getByLabelText('Trener')).toHaveAttribute('placeholder', 'Paweł Olejniczak');

    await user.type(screen.getByLabelText('Miejsce'), 'Orlik');
    await user.type(screen.getByLabelText('Zawodnicy'), '16');
    await user.selectOptions(screen.getAllByLabelText('Część treningu')[1], 'wstepna');
    await user.click(screen.getByRole('button', { name: 'Dodaj' }));
    await user.type(screen.getByLabelText('Sprzęt 1'), 'Znaczniki');

    const saved = JSON.parse(localStorage.getItem('trainingSessions'))[0];
    expect(saved.cert).toMatchObject({ enabled: true, place: 'Orlik', players: '16', equipment: [{ name: 'Znaczniki', count: '' }] });
    expect(saved.blocks[1].part).toBe('wstepna');

    await user.click(screen.getByRole('button', { name: 'Drukuj konspekt do certyfikacji' }));
    await waitFor(() => expect(print).toHaveBeenCalled());
    const sheet = document.querySelector('.print-root');
    expect(sheet).toHaveTextContent('AP BKS Naprzód Brwinów - 2013');
    expect(sheet).toHaveTextContent('Paweł Olejniczak');
    expect(sheet).toHaveTextContent('Temat zajęćWyjście spod pressingu');
    expect(sheet).toHaveTextContent('Data zajęć19-10-2026');
    expect(sheet).toHaveTextContent('Zawodnicy16 osób');
    expect(sheet).toHaveTextContent('Część wstępna · 40 min');
    expect(sheet).toHaveTextContent('Część końcowa · 5 min');
    expect(sheet).toHaveTextContent('SprzętZnaczniki');
    expect(document.body).toHaveClass('printing-session');

    fireEvent(window, new Event('afterprint'));
    expect(document.body).not.toHaveClass('printing-session');
    expect(document.querySelector('.print-root')).not.toHaveTextContent('Część wstępna');
  });

  it('nowy konspekt zostaje w trybie certyfikacji, gdy poprzedni w nim był', async () => {
    const user = userEvent.setup();
    seedSession();
    render(<SessionPlanApp club={club} />);
    await user.click(screen.getByRole('checkbox', { name: /Konspekt zgodny z certyfikacją PZPN/ }));
    await user.click(screen.getAllByRole('button', { name: /Nowy konspekt/ })[0]);
    expect(screen.getByRole('checkbox', { name: /Konspekt zgodny z certyfikacją PZPN/ })).toBeChecked();
  });
});
