/* Bazoš Rider — core/badges.js
 *
 * Runs the badge modules from src/badges/ for one listing on a Bazoš page.
 * Each module's test(listing, entry, ctx, shown) returns the badge text or
 * null. Modules run in `order`; `shown` holds the ids that already said
 * something, so a module can stay quiet when a more important one spoke.
 *
 *   listing  the parsed listing (listing.skip is the skip rule, if any)
 *   entry    its history entry, or null when skipped or without an id
 */
(function (BR) {
  "use strict";

  /** [{ id, text, color }] for one listing. */
  function forListing(listing, entry, ctx) {
    const out = [];
    const shown = new Set();
    for (const b of BR.badges.all()) {
      let text = null;
      try {
        text = b.test(listing, entry, ctx, shown);
      } catch (e) {
        console.error(`[bazos-rider] badge "${b.id}" failed`, e);
      }
      if (!text) continue;
      shown.add(b.id);
      out.push({ id: b.id, text, color: b.color || "#57606a" });
    }
    return out;
  }

  Object.assign(BR.badges, { for: forListing });
})(globalThis.BR);
