/* Bazoš Rider — geo/geo.js
 *
 * Distances for "v okolí": a listing's postal code (PSČ, read off the page)
 * against yours (popup settings → Moja lokalita), straight-line kilometres.
 * Nothing is sent anywhere; the table is geo/data.js, built from GeoNames.
 *
 * Loaded by the popup and the background page only. Content scripts just
 * read the PSČ off the page and never need the 80 kB table.
 *
 *   BR.geo.km(fromPsc, toPsc) → kilometres, or null when either is unknown
 *   BR.geo.known(psc)         → true when the table has it
 */
(function (BR) {
  "use strict";

  const clean = (psc) => String(psc || "").replace(/\s/g, "");

  /** A postal code's position. An unknown code falls back to the average of
   * codes sharing its first three digits (the same post office area). */
  const prefixCache = {};
  function where(psc) {
    const p = clean(psc);
    if (!/^\d{5}$/.test(p)) return null;
    if (BR.PSC[p]) return BR.PSC[p];
    const head = p.slice(0, 3);
    if (!(head in prefixCache)) {
      let lat = 0, lon = 0, n = 0;
      for (const [code, [a, b]] of Object.entries(BR.PSC)) {
        if (code.startsWith(head)) { lat += a; lon += b; n++; }
      }
      prefixCache[head] = n ? [lat / n, lon / n] : null;
    }
    return prefixCache[head];
  }

  const rad = (d) => (d * Math.PI) / 180;

  function km(from, to) {
    const a = where(from);
    const b = where(to);
    if (!a || !b) return null;
    const dLat = rad(b[0] - a[0]);
    const dLon = rad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  }

  BR.geo = { km, known: (psc) => !!where(psc) };
})(globalThis.BR);
