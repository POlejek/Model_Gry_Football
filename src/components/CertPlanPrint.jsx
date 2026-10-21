import React from 'react';
import { clubTitle } from '../utils/club.js';
import { certOf, groupByPart, printedEquipment, equipmentGrid, playersText } from '../utils/certPlan.js';

// Printout of a session plan in the layout of the PZPN certification form (header table with red and
// dark labels, then the session split into its methodical parts). Inline styles: it is only printed.
const RED = '#e30613';
const DARK = '#1f2a30';
const LINE = '#c8ccd0';

const table = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 10.5 };
const label = (bg) => ({
  background: bg, color: '#fff', fontWeight: 700, textAlign: 'right', padding: '3px 5px',
  border: `1px solid ${LINE}`, lineHeight: 1.2, verticalAlign: 'middle', fontSize: 9.5, overflowWrap: 'anywhere',
});
// long labels may wrap after the slash, as on the form
const BR = '\u200B';
const value = { padding: '3px 5px', border: `1px solid ${LINE}`, verticalAlign: 'middle', whiteSpace: 'pre-wrap', lineHeight: 1.3 };

const minutesOf = (b) => Math.max(0, parseInt(b.minutes, 10) || 0);

export default function CertPlanPrint({ session, club, timed, total, drills, phaseText, imageFor }) {
  const cert = certOf(session);
  const title = clubTitle(club) || session.title || 'Konspekt zajęć';
  const grid = equipmentGrid(printedEquipment(cert, drills));
  const parts = groupByPart(timed);

  const L = (text, bg = RED, span = 1) => <th colSpan={span} style={label(bg)}>{text}</th>;
  const V = (text, span = 1) => <td colSpan={span} style={value}>{text}</td>;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#000' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {club.logo && <img src={club.logo} alt="" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />}
        <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{title}</h1>
      </header>

      <table style={table} aria-label="Nagłówek konspektu">
        <colgroup>{Array.from({ length: 8 }, (_, i) => <col key={i} style={{ width: '12.5%' }} />)}</colgroup>
        <tbody>
          <tr>{L('Trener')}{V(cert.coach || club.coach, 4)}{L('Asystent')}{V(cert.assistant || club.assistant, 2)}</tr>
          <tr>{L('Temat zajęć')}{V(cert.topic || session.goal, 7)}</tr>
          <tr>{L('Mikrocykl', DARK)}{V(cert.microcycle, 7)}</tr>
          <tr>{L(`Technika/${BR}działania indywidualne`, DARK)}{V(cert.technique, 3)}{L('Motoryka', DARK)}{V(cert.motor, 3)}</tr>
          <tr>{L(`Działania grupowe/${BR}zespołowe`, DARK)}{V(cert.teamplay, 3)}{L('Mentalność/ wiedza', DARK)}{V(cert.mental, 3)}</tr>
          {phaseText && <tr>{L('Fazy modelu gry', DARK)}{V(phaseText, 7)}</tr>}
          <tr>
            {L('Data zajęć')}{V(session.date ? session.date.split('-').reverse().join('-') : '')}
            {L('Godzina')}{V(cert.time)}
            {L('Miejsce')}{V(cert.place, 3)}
          </tr>
          <tr>
            {L('Kategoria')}{V(session.group)}
            {L('Czas ćwicz.')}{V(`${total} min`)}
            {L('Nr zajęć')}{V(cert.number)}
            {L('Zawodnicy')}{V(playersText(cert.players))}
          </tr>
          {grid.map((row, r) => (
            <React.Fragment key={r}>
              <tr>{L('Sprzęt')}{row.map((e, i) => <td key={i} style={value}>{e.name}</td>)}</tr>
              <tr>{L('Liczba')}{row.map((e, i) => <td key={i} style={value}>{e.count}</td>)}</tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {parts.map(part => (
        <section key={part.id} style={{ marginTop: 10 }}>
          <div style={{ ...label(RED), textAlign: 'left', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, breakAfter: 'avoid' }}>
            {part.label} · {part.minutes} min
          </div>
          {part.items.map(({ block: b, from, to, drill, number }) => {
            const meta = drill?.meta || {};
            const img = drill && imageFor(drill.id);
            const facts = [
              ['Cel', meta.objective],
              ['Organizacja', meta.organization],
              ['Zawodnicy', meta.players],
              ['Pole', meta.area],
              ['Obciążenie', meta.load],
            ].filter(([, t]) => t && String(t).trim());
            const wide = [
              ['Przebieg', meta.description],
              ['Wskazówki / punkty trenerskie', meta.coachingPoints],
              ['Warianty / progresje', meta.variations],
              ['Uwagi', b.note],
            ].filter(([, t]) => t && String(t).trim());
            return (
              <article key={b.id} className="print-block" style={{ border: `1px solid ${LINE}`, borderTop: 'none' }}>
                <div style={{ breakInside: 'avoid' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '4px 6px', background: '#f1f3f5', borderBottom: `1px solid ${LINE}` }}>
                    <strong style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{number}. {from}–{to}′</strong>
                    <strong style={{ fontSize: 12, flex: 1 }}>{drill ? drill.name : (b.title || 'Blok')}</strong>
                    <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{minutesOf(b)} min</span>
                  </div>
                  {drill ? (
                    <div style={{ display: 'flex', gap: 6, padding: 6 }}>
                      {img && <img src={img} alt="" className="print-drill-img" style={{ width: facts.length ? '55%' : '100%', maxHeight: '95mm', objectFit: 'contain', border: `1px solid ${LINE}`, alignSelf: 'flex-start' }} />}
                      {facts.length > 0 && (
                        <table style={{ ...table, flex: 1, alignSelf: 'flex-start' }}>
                          <colgroup><col style={{ width: '32%' }} /><col /></colgroup>
                          <tbody>{facts.map(([k, t]) => <tr key={k}>{L(k, DARK)}{V(t)}</tr>)}</tbody>
                        </table>
                      )}
                    </div>
                  ) : (
                    b.note ? <p style={{ fontSize: 11, margin: 0, padding: 6, whiteSpace: 'pre-wrap' }}>{b.note}</p> : null
                  )}
                </div>
                {drill && wide.length > 0 && (
                  <table style={{ ...table, margin: '0 6px 6px', width: 'calc(100% - 12px)' }}>
                    <colgroup><col style={{ width: '18%' }} /><col /></colgroup>
                    <tbody>{wide.map(([k, t]) => <tr key={k} style={{ breakInside: 'avoid' }}>{L(k, DARK)}{V(t)}</tr>)}</tbody>
                  </table>
                )}
              </article>
            );
          })}
        </section>
      ))}

      {session.notes && (
        <table style={{ ...table, marginTop: 10 }}>
          <colgroup><col style={{ width: '12.5%' }} /><col /></colgroup>
          <tbody><tr>{L('Uwagi')}{V(session.notes)}</tr></tbody>
        </table>
      )}
      <p style={{ marginTop: 18, fontSize: 11, textAlign: 'right' }}>Podpis trenera: ..........................................</p>
    </div>
  );
}
