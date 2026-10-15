// Converts the scheme comment HTML (from the rich-text editor) into lines that keep
// paragraphs, line breaks, bullet lists and bold / italic / underline — used by the PowerPoint export.

const BLOCK = new Set(['P', 'DIV', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'TR']);

/** @returns {{ bullet: boolean, runs: { text: string, bold?: boolean, italic?: boolean, underline?: boolean, strike?: boolean }[] }[]} */
export function htmlToLines(html = '') {
  const lines = [];
  let line = null;
  const newLine = (bullet = false) => { line = { bullet, runs: [] }; lines.push(line); };
  const endLine = () => { line = null; };

  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  const walk = (node, style, inList) => {
    if (node.nodeType === 3) {
      const text = node.textContent.replace(/\s+/g, ' ');
      if (!text.trim() && !line) return;
      if (!line) newLine(false);
      line.runs.push({ text: line.runs.length ? text : text.replace(/^\s+/, ''), ...style });
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName;
    if (tag === 'BR') { if (!line) newLine(false); endLine(); return; }
    if (tag === 'HR') { endLine(); newLine(false); line.runs.push({ text: '────────', ...style }); endLine(); return; }
    const next = { ...style };
    if (tag === 'B' || tag === 'STRONG' || /^H\d$/.test(tag)) next.bold = true;
    if (tag === 'I' || tag === 'EM') next.italic = true;
    if (tag === 'U') next.underline = true;
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') next.strike = true;
    const block = BLOCK.has(tag);
    if (block) endLine();
    if (tag === 'LI') newLine(true);
    node.childNodes.forEach(child => walk(child, next, inList || tag === 'UL' || tag === 'OL'));
    if (block) endLine();
  };
  doc.body.firstChild.childNodes.forEach(n => walk(n, {}, false));

  // trim trailing spaces and drop empty bullet / leading-trailing empty lines
  lines.forEach(l => { const last = l.runs[l.runs.length - 1]; if (last) last.text = last.text.replace(/\s+$/, ''); });
  const filled = lines.filter(l => l.runs.some(r => r.text.trim()) || !l.bullet);
  while (filled.length && !filled[0].runs.some(r => r.text.trim())) filled.shift();
  while (filled.length && !filled[filled.length - 1].runs.some(r => r.text.trim())) filled.pop();
  return filled;
}

/** pptxgenjs text runs: one paragraph per line, bullets for list items. */
export function htmlToPptRuns(html, { fontSize = 12, color = '374151' } = {}) {
  const lines = htmlToLines(html);
  const out = [];
  lines.forEach((l, i) => {
    const runs = l.runs.length ? l.runs : [{ text: '' }];
    runs.forEach((r, j) => {
      const options = {
        fontSize, color, bold: !!r.bold, italic: !!r.italic, underline: r.underline ? { style: 'sng' } : undefined,
        strike: r.strike ? 'sngStrike' : undefined, paraSpaceAfter: 4,
      };
      if (l.bullet) options.bullet = { indent: 14 };
      if (j === runs.length - 1 && i < lines.length - 1) options.breakLine = true;
      out.push({ text: r.text, options });
    });
  });
  return out;
}

/** Font size that keeps a long comment inside the text box. */
export const commentFontSize = (lines) => {
  const chars = lines.reduce((n, l) => n + l.runs.reduce((m, r) => m + r.text.length, 0) + 40, 0);
  if (chars <= 700) return 14;
  if (chars <= 1100) return 12;
  if (chars <= 1600) return 11;
  return 10;
};
