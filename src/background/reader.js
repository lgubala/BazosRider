/* Bazoš Rider — background/reader.js
 *
 * Background reading: the newest pages of each Bazoš section, so the popup
 * knows today's deals without you clicking through Bazoš.
 *
 * What it reads, and what it never does:
 *   - only section pages: https://mobil.bazos.sk/, then its "Ďalšia" (/40/,
 *     /80/ ...). Bazoš's robots.txt allows them. Search URLs (search.php,
 *     hledat=, hlokalita= ...) are refused, see config DISALLOWED_URL_PARTS
 *   - only sections you have not hidden, plus your watchdogs' sections
 *   - at most settings.reader.pages pages per section, one request every
 *     READER_DELAY_MS, every settings.reader.everyMinutes
 *   - if Bazoš answers 403, 429 or 5xx, nothing more for READER_PAUSE_HOURS
 *   - off until the user switches it on
 *
 * Only what is new: Bazoš numbers listings in order, so each section
 * remembers the newest listing id a finished reading saw ("frontier"). The
 * next reading stops in that section at the first page that is mostly older
 * than it. The first reading goes settings.reader.pages deep; later ones
 * usually need a page or two per section.
 *
 * Firefox may stop an idle background page after ~30 s, so the run is a queue
 * kept in storage and saved after every page. The "br-reader-tick" alarm
 * (every half minute while a run is on) carries on if the page was stopped;
 * a stopped page loses at most the page it was reading.
 *
 * State, in storage.local "reader":
 *   { queue: [{ category, url, left, max }] | null,
 *     frontier: { category: newest listing id read },
 *     run: { startedAt, total, pages, listings, fresh } | null,
 *     lastRun, lastResult: { pages, listings, fresh, error }, pausedUntil }
 */
(function (BR) {
  "use strict";

  const C = BR.config;
  const api = globalThis.browser || globalThis.chrome;
  const KEY = "reader";
  const TICK = "br-reader-tick";

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const readable = BR.parse.readable;

  async function loadState() {
    const stored = await api.storage.local.get(KEY);
    return stored[KEY] && typeof stored[KEY] === "object" ? stored[KEY] : {};
  }
  const saveState = (state) => api.storage.local.set({ [KEY]: state });

  const sections = BR.settings.readerSections;

  async function fetchPage(url) {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) {
      const e = new Error("HTTP " + res.status);
      e.status = res.status;
      throw e;
    }
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    const base = doc.createElement("base");
    base.href = url;
    doc.head.prepend(base);
    return doc;
  }

  /** Starts a run. reason "alarm" respects the pause and the interval;
   * "manual" (the popup's button) only the pause. */
  async function start(reason) {
    const settings = await BR.store.loadSettings();
    const state = await loadState();
    const now = Date.now();
    if (state.queue && state.queue.length) return { started: false, why: "running" };
    if (state.pausedUntil && now < Date.parse(state.pausedUntil)) return { started: false, why: "paused" };
    if (reason === "alarm") {
      if (!settings.reader.enabled) return { started: false, why: "off" };
      const age = state.lastRun ? now - Date.parse(state.lastRun) : Infinity;
      if (age < settings.reader.everyMinutes * 60000 * 0.9) return { started: false, why: "recent" };
    }
    const queue = sections(settings).map((category) => ({
      category, url: `https://${category}.${C.DOMAIN}/`, left: settings.reader.pages, max: 0
    }));
    await saveState({
      ...state,
      queue,
      run: { startedAt: new Date(now).toISOString(), total: queue.length * settings.reader.pages,
             pages: 0, listings: 0, fresh: 0 }
    });
    api.alarms.create(TICK, { periodInMinutes: 0.5 });
    tick();
    return { started: true };
  }

  const idNumber = (l) => Number(l.id) || 0;

  /** The middle id of a page: TOP listings (old, pinned first) do not move it. */
  function middleId(listings) {
    const ids = listings.map(idNumber).filter(Boolean).sort((a, b) => a - b);
    return ids.length ? ids[Math.floor(ids.length / 2)] : 0;
  }

  /** Records one page's listings in the history; returns how many were new. */
  async function record(listings) {
    if (!listings.length) return 0;
    const { history } = await BR.store.load();
    const fresh = new Set(listings.filter((l) => l.id && !history[l.id]).map((l) => l.id));
    const now = new Date();
    BR.history.record(history, listings, now);
    BR.history.prune(history, now);
    await BR.store.saveHistory(history);
    return [...fresh].filter((id) => history[id]).length;
  }

  let busy = false;

  /**
   * Works through the queue page by page, READER_DELAY_MS apart, saving after
   * each one. Runs until the queue is empty or Firefox stops the page; the
   * tick alarm then calls it again.
   */
  async function tick() {
    if (busy) return;
    busy = true;
    try {
      let state = await loadState();
      let first = true;
      while (state.queue && state.queue.length) {
        const queue = state.queue;
        const run = state.run || { pages: 0, listings: 0, fresh: 0, total: 0 };
        const frontier = { ...(state.frontier || {}) };
        const item = queue[0];
        let error = null;
        let pause = false;

        if (!item.url || item.left <= 0 || !readable(item.url)) {
          queue.shift();
        } else {
          if (!first) await wait(C.READER_DELAY_MS);
          first = false;
          /* The popup's Stop may have cleared the queue while we waited. */
          const now = await loadState();
          if (!now.queue || !now.queue.length) break;
          try {
            const doc = await fetchPage(item.url);
            const listings = BR.parse.listings(doc).map((l) => ({ ...l, element: null }));
            run.pages++;
            run.listings += listings.length;
            run.fresh += await record(listings);
            item.left--;
            item.max = Math.max(item.max || 0, ...listings.map(idNumber));
            item.url = BR.parse.nextPageUrl(doc);
            /* Reached what the last reading already read: this section is done. */
            const known = frontier[item.category] || 0;
            const caughtUp = known && middleId(listings) <= known;
            if (!item.url || item.left <= 0 || caughtUp) {
              if (caughtUp) run.total -= item.left;   // the progress line's "of N"
              frontier[item.category] = Math.max(known, item.max);
              queue.shift();
            }
          } catch (e) {
            error = e.message || String(e);
            /* Bazoš saying no: stop and leave it alone for a day. Anything
             * else (offline, a timeout): stop this run, try again next time. */
            pause = e.status === 403 || e.status === 429 || e.status >= 500;
            queue.length = 0;
          }
        }

        /* Stopped from the popup while this page loaded: its listings are
         * recorded, the stop stands. */
        if (!(await loadState()).queue) break;
        const next = { ...state, queue, run, frontier };
        if (!queue.length) {
          next.queue = null;
          next.run = null;
          next.lastRun = new Date().toISOString();
          next.lastResult = { pages: run.pages, listings: run.listings, fresh: run.fresh, error };
          if (pause) next.pausedUntil = new Date(Date.now() + C.READER_PAUSE_HOURS * 3600e3).toISOString();
          api.alarms.clear(TICK);
        }
        await saveState(next);
        state = next;
      }
      if (!state.queue) api.alarms.clear(TICK);
    } catch (e) {
      console.error("[bazos-rider] reader", e);
    } finally {
      busy = false;
    }
  }

  /** The periodic alarm, set from settings.reader. */
  async function schedule() {
    const settings = await BR.store.loadSettings();
    await api.alarms.clear("br-reader");
    if (!settings.reader.enabled) return;
    api.alarms.create("br-reader", { delayInMinutes: 1, periodInMinutes: settings.reader.everyMinutes });
  }

  /** Stops a run in progress; what was read so far is already recorded. */
  async function stop() {
    const state = await loadState();
    if (!state.queue) return;
    const run = state.run || {};
    await saveState({
      ...state, queue: null, run: null, lastRun: new Date().toISOString(),
      lastResult: { pages: run.pages || 0, listings: run.listings || 0, fresh: run.fresh || 0, error: null }
    });
    api.alarms.clear(TICK);
  }

  BR.reader = { KEY, TICK, start, tick, stop, schedule, sections, readable };
})(globalThis.BR);
