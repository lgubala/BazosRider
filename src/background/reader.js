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
 *   - settings.reader.pages pages per section, one request every
 *     READER_DELAY_MS, every settings.reader.everyMinutes
 *   - if Bazoš answers 403, 429 or 5xx, nothing more for READER_PAUSE_HOURS
 *   - off until the user switches it on
 *
 * Firefox may stop an idle background page after ~30 s, so a run is a queue
 * kept in storage and worked through in chunks of READER_CHUNK pages, one
 * chunk per "br-reader-tick" alarm (every minute). A stopped page loses
 * nothing: the next tick carries on.
 *
 * State, in storage.local "reader":
 *   { queue: [{ category, url, left }] | null,
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
      category, url: `https://${category}.${C.DOMAIN}/`, left: settings.reader.pages
    }));
    await saveState({
      ...state,
      queue,
      run: { startedAt: new Date(now).toISOString(), total: queue.length * settings.reader.pages,
             pages: 0, listings: 0, fresh: 0 }
    });
    api.alarms.create(TICK, { periodInMinutes: 1 });
    tick();
    return { started: true };
  }

  let busy = false;

  /** Reads up to READER_CHUNK pages from the queue, records them, saves. */
  async function tick() {
    if (busy) return;
    busy = true;
    try {
      const state = await loadState();
      if (!state.queue || !state.queue.length) {
        api.alarms.clear(TICK);
        return;
      }
      const queue = state.queue;
      const run = state.run || { pages: 0, listings: 0, fresh: 0, total: 0 };
      const found = [];
      let error = null;
      let pause = false;

      for (let n = 0; n < C.READER_CHUNK && queue.length; n++) {
        const item = queue[0];
        if (!item.url || item.left <= 0 || !readable(item.url)) { queue.shift(); n--; continue; }
        if (n > 0) await wait(C.READER_DELAY_MS);
        try {
          const doc = await fetchPage(item.url);
          for (const l of BR.parse.listings(doc)) { l.element = null; found.push(l); }
          run.pages++;
          item.left--;
          item.url = BR.parse.nextPageUrl(doc);
          if (!item.url || item.left <= 0) queue.shift();
        } catch (e) {
          error = e.message || String(e);
          /* Bazoš saying no: stop and leave it alone for a day. Anything
           * else (offline, a timeout): stop this run, try again next time. */
          pause = e.status === 403 || e.status === 429 || e.status >= 500;
          queue.length = 0;
          break;
        }
      }

      if (found.length) {
        const { history } = await BR.store.load();
        const before = new Set(Object.keys(history));
        const now = new Date();
        BR.history.record(history, found, now);
        BR.history.prune(history, now);
        await BR.store.saveHistory(history);
        run.listings += found.length;
        run.fresh += new Set(found.filter((l) => l.id && !before.has(l.id) && history[l.id]).map((l) => l.id)).size;
      }

      const next = { ...state, queue, run };
      if (!queue.length) {
        next.queue = null;
        next.run = null;
        next.lastRun = new Date().toISOString();
        next.lastResult = { pages: run.pages, listings: run.listings, fresh: run.fresh, error };
        if (pause) next.pausedUntil = new Date(Date.now() + C.READER_PAUSE_HOURS * 3600e3).toISOString();
        api.alarms.clear(TICK);
      }
      await saveState(next);
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
