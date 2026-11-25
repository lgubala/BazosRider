/* Bazoš Rider — core/watches.js
 *
 * Watchdogs ("Strážcovia"): things you are looking for, set in the popup
 * settings. A watch is { id, query, category, maxPrice }. A history entry
 * matches when its title contains every word of the query (any case, any
 * diacritics, any Slovak ending: "sony hifi" finds "Sony Hi-Fi systém" and
 * "hifi veža Sony"), it is in the watch's section if one is set, and it costs
 * no more than maxPrice.
 *
 * Bazoš search is off-limits to programs (robots.txt), so a watch sees what
 * the background reader and your own browsing have recorded.
 *
 *   BR.watches.matches(watch, entry) → true / false
 *   BR.watches.results(watch, ctx)   → { near, all, n, median }
 *       near, all  cheapest first, WATCH_LIMIT each; near is empty without a
 *                  home postal code
 *       n, median  over every match, for "medián 120 € z 14"
 */
(function (BR) {
  "use strict";

  const C = BR.config;

  /** The query's words, compared the way groups.js compares titles. */
  const wordsCache = new Map();
  function queryWords(query) {
    if (!wordsCache.has(query)) {
      const words = BR.groups.words(query.replace(/-/g, "")).map(BR.groups.stem);
      wordsCache.set(query, words);
    }
    return wordsCache.get(query);
  }

  /** "Hi-Fi" and "hifi" are the same word, so hyphens are dropped first. */
  function titleWords(title) {
    return BR.groups.words(String(title || "").replace(/-/g, "")).map(BR.groups.stem);
  }

  function matches(watch, entry) {
    if (!entry || !entry.title || !(entry.price > 0)) return false;
    if (watch.category && entry.category !== watch.category) return false;
    if (watch.maxPrice && entry.price > watch.maxPrice) return false;
    const want = queryWords(watch.query);
    if (!want.length) return false;
    const have = titleWords(entry.title);
    /* A query word also matches the start of a longer title word, so
     * "hifi" finds "hifisystem" and "sony" finds "sonyericsson". */
    return want.every((w) => have.some((h) => h === w || h.startsWith(w)));
  }

  function results(watch, ctx) {
    const found = Object.values(ctx.history)
      .filter((e) => matches(watch, e) && !ctx.hidden(e))
      .sort((a, b) => a.price - b.price);
    const withKm = (e) => ({ ...e, km: ctx.km(e) });
    return {
      n: found.length,
      median: BR.text.median(found.map((e) => e.price)),
      all: found.slice(0, C.WATCH_LIMIT).map(withKm),
      near: ctx.homeSet ? found.filter((e) => ctx.near(e)).slice(0, C.WATCH_LIMIT).map(withKm) : []
    };
  }

  BR.watches = { matches, results };
})(globalThis.BR);
