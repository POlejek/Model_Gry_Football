import React from 'react';
import { clubTitle } from '../utils/club.js';
import { equipmentSummary, normalizeDrill } from '../utils/drill.js';
import { certOf, groupByPart, printedEquipment, equipmentGrid, playersText } from '../utils/certPlan.js';

// Printout of a session plan in the layout of the PZPN certification form: header table with red and
// dark labels, then one row per block with its part of the session written down the left edge,
// the drill picture, its description and time. Inline styles: it is only printed.
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

export default function CertPlanPrint({ session, club, timed, total, drills, phaseText, phaseName = k => k, imageFor }) {
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

      {parts.flatMap(part => part.items.map(({ block: b, drill, number }) => {
        const meta = drill?.meta || {};
        const img = drill && imageFor(drill.id);
        const labelled = [
          ['Cel', meta.objective],
          ['Wskazówki', meta.coachingPoints],
          ['Warianty / progresje', meta.variations],
          ['Uwagi', b.note],
        ].filter(([, t]) => t && String(t).trim());
        const tags = drill ? [session.group, meta.category, ...(meta.phases || []).map(phaseName)].filter(Boolean) : [];
        const facts = drill ? [
          ['Obciążenie', meta.load],
          ['Zawodnicy', meta.players],
          ['Pole', meta.area],
          ['Sprzęt', equipmentSummary(normalizeDrill(drill).frames) || 'b/d'],
        ].filter(([, t]) => t && String(t).trim()) : [];
        return (
          <table key={b.id} className="print-block" style={{ ...table, marginTop: -1, breakInside: 'avoid' }}>
            <colgroup>
              <col style={{ width: '5%' }} /><col style={{ width: '48%' }} /><col style={{ width: '37%' }} /><col style={{ width: '10%' }} />
            </colgroup>
            <tbody>
              {/* fixed header and a minimum body height: the upright part name then never stretches the red bar */}
              <tr style={{ height: 24 }}>
                <td rowSpan={2} style={{ background: DARK, border: `1px solid ${LINE}`, verticalAlign: 'middle', padding: 0 }}>
                  <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: '#fff', fontWeight: 700, fontSize: 10, letterSpacing: 0.3, margin: '0 auto', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                    {part.label}
                  </div>
                </td>
                <th colSpan={2} style={{ ...label(RED), textAlign: 'left', fontSize: 12 }}>{number}. {drill ? drill.name : (b.title || 'Blok')}</th>
                <th style={{ ...label(RED), textAlign: 'center' }}>Czas</th>
              </tr>
              <tr style={{ height: 96 }}>
                {drill && (
                  <td style={{ ...value, verticalAlign: 'top', padding: 4 }}>
                    {img && <img src={img} alt="" className="print-drill-img" style={{ display: 'block', width: '100%', maxHeight: '110mm', objectFit: 'contain' }} />}
                  </td>
                )}
                <td colSpan={drill ? 1 : 2} style={{ ...value, verticalAlign: 'top', padding: '5px 7px', fontSize: 10.5 }}>
                  {[meta.organization, meta.description].filter(t => t && String(t).trim()).map((t, i) => <p key={i} style={{ margin: '0 0 6px' }}>{t}</p>)}
                  {labelled.map(([k, t]) => <p key={k} style={{ margin: '0 0 6px' }}><strong>{k}: </strong>{t}</p>)}
                  {tags.length > 0 && (
                    <p style={{ margin: '0 0 6px', display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {tags.map((t, i) => (
                        <span key={i} style={{ background: i === 0 && session.group ? '#17a2b8' : '#28a745', color: '#fff', fontWeight: 700, fontSize: 9, padding: '2px 4px', borderRadius: 2 }}>{t}</span>
                      ))}
                    </p>
                  )}
                  {facts.map(([k, t]) => <p key={k} style={{ margin: '0 0 2px', fontSize: 9.5 }}><strong>{k}: </strong>{t}</p>)}
                </td>
                <td style={{ ...value, verticalAlign: 'top', textAlign: 'center', fontWeight: 700 }}>{minutesOf(b)} min</td>
              </tr>
            </tbody>
          </table>
        );
      }))}

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
