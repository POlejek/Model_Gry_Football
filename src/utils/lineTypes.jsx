// Icons and labels shared by the tactics and training editors.

export const LINE_TYPES = [
  ['arrow-solid', 'Prosta ciągła z grotem', <svg width="30" height="17" viewBox="0 0 40 22"><line x1="4" y1="11" x2="32" y2="11" stroke="currentColor" strokeWidth="2"/><polygon points="32,11 28,8 28,14" fill="currentColor"/></svg>],
  ['arrow-dashed', 'Przerywana z grotem', <svg width="30" height="17" viewBox="0 0 40 22"><line x1="4" y1="11" x2="32" y2="11" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"/><polygon points="32,11 28,8 28,14" fill="currentColor"/></svg>],
  ['arrow-wavy', 'Falowana z grotem', <svg width="30" height="17" viewBox="0 0 40 22"><path d="M4 11 C8 5,12 17,16 11 C20 5,24 17,28 11 C30 8,31 10,32 11" stroke="currentColor" strokeWidth="2" fill="none"/><polygon points="32,11 28,8 28,14" fill="currentColor"/></svg>],
  ['double-arrow-solid', 'Podwójna z grotem', <svg width="30" height="17" viewBox="0 0 40 22"><line x1="4" y1="9" x2="32" y2="9" stroke="currentColor" strokeWidth="2"/><line x1="4" y1="13" x2="32" y2="13" stroke="currentColor" strokeWidth="2"/><polygon points="32,11 28,8 28,14" fill="currentColor"/></svg>],
  null,
  ['line-dashed', 'Przerywana bez grotów', <svg width="30" height="17" viewBox="0 0 40 22"><line x1="4" y1="11" x2="36" y2="11" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"/></svg>],
  ['line-solid', 'Ciągła bez grotów', <svg width="30" height="17" viewBox="0 0 40 22"><line x1="4" y1="11" x2="36" y2="11" stroke="currentColor" strokeWidth="2"/></svg>],
  null,
  ['curve-arrow-solid', 'Krzywa ciągła z grotem', <svg width="30" height="17" viewBox="0 0 40 22"><path d="M4 11 Q 18 3, 32 11" stroke="currentColor" strokeWidth="2" fill="none"/><polygon points="32,11 28,9 28,13" fill="currentColor"/></svg>],
  ['curve-arrow-dashed', 'Krzywa przerywana z grotem', <svg width="30" height="17" viewBox="0 0 40 22"><path d="M4 11 Q 18 3, 32 11" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 2"/><polygon points="32,11 28,9 28,13" fill="currentColor"/></svg>],
  ['curve-arrow-wavy', 'Krzywa falowana z grotem', <svg width="30" height="17" viewBox="0 0 40 22"><path d="M4 11 C9 3,13 13,18 7 C22 2,26 15,30 10 C31 9,31.5 10,32 11" stroke="currentColor" strokeWidth="2" fill="none"/><polygon points="32,11 28,9 28,13" fill="currentColor"/></svg>],
  ['curve-line', 'Krzywa bez grotów', <svg width="30" height="17" viewBox="0 0 40 22"><path d="M4 11 Q 18 3, 36 11" stroke="currentColor" strokeWidth="2" fill="none"/></svg>],
];

export const ZONE_SHAPES = [
  ['rectangle', 'Prostokąt', <svg width="30" height="17" viewBox="0 0 40 22"><rect x="4" y="3" width="32" height="16" stroke="currentColor" strokeWidth="2" fill="none"/></svg>],
  ['circle', 'Koło', <svg width="30" height="17" viewBox="0 0 40 22"><circle cx="20" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none"/></svg>],
  ['polygon', 'Wielokąt', <svg width="30" height="17" viewBox="0 0 40 22"><path d="M20 3 L35 9 L30 19 L10 19 L5 9 Z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>],
];
