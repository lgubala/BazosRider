/* Bazoš Rider — content/main.js
 *
 * Runs on every bazos.sk page, after everything else is loaded:
 *   1. hide listings the filters match, and count them
 *   2. record every listing in local price history (no extra requests)
 *   3. badge the visible listings and mark the good deals
 *   4. draw the bar above the results and the count on the toolbar icon
 *
 * The bar's switches and "Prejsť ďalšie strany" come back here as actions.
 */
(async function (BR) {
  "use strict";

  const api = globalThis.browser || globalThis.chrome;
  const listings = BR.parse.listings(document);
  if (!listings.length) return;

  const loaded = await BR.store.load();
  const state = {
    listings,
    now: new Date(),
    settings: loaded.settings,
    history: loaded.history,
    counts: null,
    scannedListings: [],  // listings read from further pages
    more: [],          // [{ listing, deal }] the good deals among them
    scan: null,        // { controller, done, pages, found } while scanning
    scanned: null      // { pages, listings, last, next, error }, totals over every scan
  };

  state.counts = BR.filters.apply(listings, state.settings);
  for (const l of listings) l.skip = BR.skips.reasonFor(l);

  BR.history.record(state.history, listings, state.now);
  BR.history.prune(state.history, state.now);
  await BR.store.saveHistory(state.history);

  const actions = {
    async setPref(key, on) {
      state.settings = await BR.store.updateSettings((s) => { s.page[key] = on; });
      BR.page.highlight(listings, state.settings.page);
      bar();
    },
    scan,
    stopScan: () => state.scan && state.scan.controller.abort()
  };

  render();

  /* ------------------------------------------------------------------------ */

  function bar() {
    BR.page.showBanner(document, state, actions);
  }

  function render() {
    const ctx = BR.context(state.history, state.settings, state.now);
    for (const l of listings) {
      l.deal = null;
      if (l.hidden) continue;
      const entry = l.id && !l.skip ? state.history[l.id] || null : null;
      BR.page.drawBadges(l.element, BR.badges.for(l, entry, ctx));
      const deal = BR.deals.best(l, entry, ctx);
      if (BR.deals.isGood(deal, ctx)) l.deal = deal;
    }
    state.more = goodAmong(state.scannedListings, ctx);
    BR.page.highlight(listings, state.settings.page);
    bar();
    toolbar(listings.filter((l) => l.deal).length + state.more.length);
  }

  /** Good deals among listings read from further pages, best first. */
  function goodAmong(items, ctx) {
    const out = [];
    for (const l of items) {
      if (l.hidden || l.skip) continue;
      const deal = BR.deals.best(l, state.history[l.id] || null, ctx);
      if (BR.deals.isGood(deal, ctx)) out.push({ listing: l, deal });
    }
    return out.sort((a, b) => b.deal.share - a.deal.share);
  }

  async function scan() {
    if (state.scan) return;
    const controller = new AbortController();
    state.scan = { controller, done: 0, pages: BR.config.SCAN_PAGES, found: 0 };
    bar();

    /* A second click continues after the last page read, not from here. */
    const before = state.scanned;
    const result = await BR.scan.run(document, {
      from: before ? before.next : null,
      signal: controller.signal,
      onPage(done, pages, found) {
        Object.assign(state.scan, { done, pages, found });
        bar();
      }
    });

    /* Fresh history: another tab may have written since this page loaded. */
    const { history } = await BR.store.load();
    const now = new Date();
    const known = new Set([...listings, ...state.scannedListings].map((l) => l.id));
    const read = result.listings.filter((l) => {
      if (!l.id || known.has(l.id)) return false;
      known.add(l.id);
      return true;
    });
    for (const l of read) {
      l.hidden = BR.filters.hides(l, state.settings);
      l.skip = BR.skips.reasonFor(l);
    }
    BR.history.record(history, read, now);
    BR.history.prune(history, now);
    await BR.store.saveHistory(history);

    state.history = history;
    state.scannedListings = [...state.scannedListings, ...read];
    state.scanned = {
      pages: (before ? before.pages : 0) + result.pages,
      listings: state.scannedListings.length,
      last: result.last || (before && before.last) || null,
      next: result.next,
      error: result.error
    };
    state.scan = null;
    render();
  }

  /** The number on the toolbar icon, for this tab (background/background.js). */
  function toolbar(count) {
    try {
      const sent = api.runtime.sendMessage({ type: "br-deals", count });
      if (sent && sent.catch) sent.catch(() => {});
    } catch (e) {
      /* No background page (an old build): no number, nothing else lost. */
    }
  }
})(globalThis.BR);
