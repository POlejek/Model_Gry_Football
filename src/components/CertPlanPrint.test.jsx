import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CertPlanPrint from './CertPlanPrint.jsx';

const drill = (id, meta) => ({ id, name: `Ćwiczenie ${id}`, frames: [{ items: [], lines: [], zones: [] }], meta });

describe('CertPlanPrint — kolumna „Czas”', () => {
  it('rozpisanie obciążenia stoi nad minutami bloku, a nie w opisie', () => {
    const d1 = drill('d1', { load: '3 × 7′, przerwa 2′', description: 'Gra 7v7' });
    const d2 = drill('d2', { description: 'Rondo' });
    const timed = [
      { block: { id: 'b1', drillId: 'd1', minutes: '25' }, drill: d1 },
      { block: { id: 'b2', drillId: 'd2', minutes: '10' }, drill: d2 },
    ];
    render(<CertPlanPrint session={{ id: 's', date: '', group: 'U14', blocks: [] }} club={{}} timed={timed} total={35} drills={[d1, d2]} imageFor={() => null} />);

    const [first, second] = screen.getAllByRole('table').slice(1);
    const time = (table) => table.querySelectorAll('tr')[1].lastElementChild.textContent;
    expect(time(first)).toBe('3 × 7′, przerwa 2′25 min');
    expect(time(second)).toBe('10 min');
    expect(first).not.toHaveTextContent('Obciążenie');
  });
});
