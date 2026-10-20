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
