// PDF of the prepared printout, for iPhones and iPads: iOS cannot print a web app opened from the home
// screen, so there the plan is turned into an A4 PDF and handed to the share sheet (Drukuj, Pliki…).
// The printout (.print-root) is drawn once and cut into pages between its blocks, the way the print
// layout would break them; a block taller than a page continues on the next one.

export const A4_MM = { w: 210, h: 297, margin: 12 };

export const isIOS = () => typeof navigator !== 'undefined'
  && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// Page ranges [top, bottom) in px for blocks laid out top to bottom. A block starts a new page when it
// is marked so (breakBefore) or does not fit in what is left; a block taller than a page is cut.
export function pageRanges(blocks, pageH) {
  const pages = [];
  let start = 0;
  blocks.forEach(({ top, bottom, breakBefore }) => {
    if (top > start && (breakBefore || bottom - start > pageH)) {
      pages.push([start, top]);
      start = top;
    }
    while (bottom - start > pageH) {
      pages.push([start, start + pageH]);
      start += pageH;
    }
  });
  const end = blocks.length ? Math.max(...blocks.map(b => b.bottom)) : 0;
  if (end > start) pages.push([start, end]);
  return pages;
}

// The element that holds the printout's blocks: the root itself, or its only child (fit-to-pages and
// certification layouts wrap their blocks in one element).
const contentOf = (root) => (root.children.length === 1 ? root.firstElementChild : root);

export async function printoutToPdf(root, fileName) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const content = contentOf(root);
  // fit-to-pages shrinks with CSS zoom, which the renderer ignores: draw unzoomed at the wider width instead
  const zoom = parseFloat(content.style.zoom) || 1;
  content.style.zoom = '1';
  document.body.classList.add('pdf-render');
  try {
    const box = content.getBoundingClientRect();
    const pxPerMm = box.width / (A4_MM.w - 2 * A4_MM.margin);
    const pageH = (A4_MM.h - 2 * A4_MM.margin) * pxPerMm;
    const blocks = [...content.children].map(el => {
      const r = el.getBoundingClientRect();
      return { top: r.top - box.top, bottom: r.bottom - box.top, breakBefore: el.style.breakBefore === 'page' };
    }).filter(b => b.bottom > b.top);
    const ranges = pageRanges(blocks, pageH);
    const canvas = await html2canvas(content, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
    const k = canvas.width / box.width;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    ranges.forEach(([top, bottom], i) => {
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.max(1, Math.round((bottom - top) * k));
      slice.getContext('2d').drawImage(canvas, 0, Math.round(top * k), canvas.width, slice.height, 0, 0, slice.width, slice.height);
      if (i) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', A4_MM.margin, A4_MM.margin, A4_MM.w - 2 * A4_MM.margin, (bottom - top) / pxPerMm);
    });
    const blob = pdf.output('blob');
    return { file: new File([blob], fileName, { type: 'application/pdf' }), pages: ranges.length };
  } finally {
    document.body.classList.remove('pdf-render');
    content.style.zoom = zoom === 1 ? '' : String(zoom);
  }
}

// Share sheet (needs a fresh tap, so the file must be ready before); without it the PDF opens or downloads.
export async function sharePdf(file) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name.replace(/\.pdf$/, '') });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'downloaded';
}
