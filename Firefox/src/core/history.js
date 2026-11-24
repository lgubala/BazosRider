/* Bazoš Rider — core/history.js
 *
 * Local price history, built only from pages you open. No extra requests.
 *
 *   history[id] = { id, title, description, url, category, price, prevPrice,
 *                   drop: { from, day } | null,
 *                   firstSeen, firstSeenAt, lastSeen }
 *
 * firstSeen and lastSeen are local "YYYY-MM-DD"; firstSeenAt is an ISO time,
 * used by the popup's clear buttons.
 */
(function (BR) {
  "use strict";

  const C = BR.config;
  const { localDay } = BR.text;

  /** Adds new listings, updates known ones, records drops. Mutates and returns history. */
  function record(history, listings, now) {
    const day = localDay(now);
    for (const l of listings) {
      if (!l.id) continue;
      if (BR.skips.reasonFor(l)) {
        delete history[l.id];
        continue;
      }
      const old = history[l.id];
      if (!old) {
        history[l.id] = {
          id: l.id,
          title: l.title,
          description: l.description,
          url: l.url,
          category: l.category,
          price: l.price,
          prevPrice: null,
          drop: null,
          firstSeen: day,
          firstSeenAt: now.toISOString(),
          lastSeen: day
        };
        continue;
      }
      if (l.price != null && old.price != null && l.price !== old.price) {
        old.prevPrice = old.price;
        const plausible = l.price === 0 || old.price <= C.DROP_GUARD * l.price;
        if (l.price < old.price && plausible) old.drop = { from: old.price, day };
      }
      if (l.price != null) old.price = l.price;
      old.title = l.title || old.title;
      old.description = l.description || old.description;
      old.lastSeen = day;
    }
    return history;
  }

  /** Drops what is too old, what a skip rule now catches, then the oldest above the cap. */
  function prune(history, now) {
    const cutoff = localDay(new Date(now.getTime() - C.HISTORY_DAYS * 864e5));
    for (const [id, e] of Object.entries(history)) {
      if (!e || e.lastSeen < cutoff || BR.skips.reasonFor(e)) delete history[id];
    }
    const ids = Object.keys(history);
    if (ids.length > C.HISTORY_CAP) {
      ids
        .sort((a, b) => history[a].lastSeen.localeCompare(history[b].lastSeen))
        .slice(0, ids.length - C.HISTORY_CAP)
        .forEach((id) => delete history[id]);
    }
    return history;
  }

  BR.history = { record, prune };
})(globalThis.BR);
