/* Bazoš Rider — core/filters.js
 *
 * Runs the hide filters from src/filters/. A listing is hidden when any
 * enabled filter matches it. Works on parsed listings and on history entries
 * alike, since both have category, title, description and price.
 */
(function (BR) {
  "use strict";

  /** The first enabled filter that matches, or null. */
  function matchOf(item, settings) {
    for (const f of BR.filters.all()) {
      const saved = settings.filters[f.id];
      if (!saved || !saved.enabled) continue;
      try {
        if (f.matches(item, saved.config || {})) return f;
      } catch (e) {
        console.error(`[bazos-rider] filter "${f.id}" failed`, e);
      }
    }
    return null;
  }

  const hides = (item, settings) => matchOf(item, settings) !== null;

  /** Hides matching listings on the page. Returns { total, hidden }. */
  function apply(listings, settings) {
    let hidden = 0;
    for (const l of listings) {
      if (!hides(l, settings)) continue;
      l.hidden = true;
      l.element.style.display = "none";
      l.element.dataset.brHidden = "1";
      hidden++;
    }
    return { total: listings.length, hidden };
  }

  Object.assign(BR.filters, { matchOf, hides, apply });
})(globalThis.BR);
