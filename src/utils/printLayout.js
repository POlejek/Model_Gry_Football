// Compact session printout: pack measured units (header, drills, notes) onto A4 pages.
// A unit that fits on a page is never split; it starts a new page when it does not fit in what is left.
// Units taller than a page get the smaller "shrink" variant; if still too tall they simply flow over pages.

export const A4_CONTENT_MM = 273; // 297 mm − 2 × 12 mm margins
export const MM = 96 / 25.4; // CSS px per mm

/** Ids of units that should render in the smaller variant (taller than a page). */
export const unitsToShrink = (units, pageH) => units
  .filter((u, i) => u.shrinkable && u.h > (i === 1 && units[0].id === 'header' ? pageH - units[0].h : pageH)) // first drill shares its page with the header
  .map(u => u.id);

/**
 * units: [{ id, h }] in print order (heights in px, gap between units included by the caller in h).
 * Returns the ids of units that must start on a new page.
 */
export function pageBreaks(units, pageH) {
  const breaks = [];
  let left = pageH;
  units.forEach((u, i) => {
    // the session header always stays with the first drill
    if (i > 0 && u.h > left && !(i === 1 && units[0].id === 'header')) {
      breaks.push(u.id);
      left = pageH;
    }
    if (u.h <= left) left -= u.h;
    else left = pageH - (u.h % pageH); // flows over pages: what is left on its last page
  });
  return breaks;
}

/** Number of pages the units take when packed with pageBreaks (a unit taller than a page spans several). */
export function pagesNeeded(units, pageH) {
  if (!units.length) return 0;
  let pages = 1;
  let left = pageH;
  units.forEach((u, i) => {
    if (i > 0 && u.h > left && !(i === 1 && units[0].id === 'header')) { pages++; left = pageH; }
    if (u.h <= left) left -= u.h;
    else { pages += Math.ceil((u.h - left) / pageH); left = pageH - ((u.h - left) % pageH || pageH); }
  });
  return pages;
}

/**
 * Fit-to-pages printout: the largest scale (between min and max) at which the content fits on maxPages.
 * measure(scale) lays the content out at that scale and returns its units ({ id, h } in px).
 */
export function fitScale(measure, maxPages, pageH, { min = 0.3, max = 1.15, steps = 12 } = {}) {
  if (pagesNeeded(measure(max), pageH) <= maxPages) return max;
  let lo = min;
  let hi = max;
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2;
    if (pagesNeeded(measure(mid), pageH) <= maxPages) lo = mid; else hi = mid;
  }
  return lo;
}
