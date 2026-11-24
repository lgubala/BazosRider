/* Bazoš Rider — content/main.js
 *
 * Runs on every bazos.sk page, after everything else is loaded:
 *   1. hide listings the filters match, and count them
 *   2. record every listing in local price history (no extra requests)
 *   3. badge the visible listings
 *   4. show the banner when something was hidden
 */
(async function (BR) {
  "use strict";

  const listings = BR.parse.listings(document);
  if (!listings.length) return;

  const { settings, history } = await BR.store.load();
  const now = new Date();

  const counts = BR.filters.apply(listings, settings);
  for (const l of listings) l.skip = BR.skips.reasonFor(l);

  BR.history.record(history, listings, now);
  BR.history.prune(history, now);
  await BR.store.saveHistory(history);

  const ctx = BR.context(history, settings, now);
  for (const l of listings) {
    if (l.hidden) continue;
    const entry = l.id && !l.skip ? history[l.id] || null : null;
    BR.page.drawBadges(l.element, BR.badges.for(l, entry, ctx));
  }

  if (counts.hidden > 0) BR.page.showBanner(document, counts);
})(globalThis.BR);
