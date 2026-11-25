/* Bazoš Rider — core/settings.js
 *
 * The saved settings, and how a stored copy is brought up to date. Defaults
 * are built from the registries, so a new filter module appears in settings
 * with its own defaults without touching this file.
 *
 * {
 *   schema: 2,
 *   filters:  { [filterId]: { enabled, config } },
 *   products: ["romer king", "iphone 13"],      manual product search terms
 *   dealThreshold: 0.2,                          manual product: 20 % under median
 *   auto: { enabled, minComparables, minShare, mode }, automatic grouping;
 *         mode "strict" (model number needed) or "loose"
 *   highlightShare: 0.15,                        page highlight from 15 % under
 *   page: { onlyDeals, sortByDeal }              the switches in the page's bar
 *   home: { psc: "97401", radiusKm: 25 }         where "v okolí" is measured from
 *   scope: "all" | "near"                        the popup's V okolí / Celé Slovensko
 *   reader: { enabled, pages, everyMinutes }     background reading (background/)
 *   watches: [{ id, query, category, maxPrice }] the watchdogs ("Strážcovia")
 *   clearedAt: { [listId]: ISO time | null }     the popup's "Vyčistiť" buttons
 * }
 */
(function (BR) {
  "use strict";

  /* 2 (1.4.0): loose grouping became the default. Strict was the only
   * default before, not a choice anyone made, so schema-1 settings move to
   * loose once. Choosing strict again sticks. */
  const SCHEMA = 2;
  const C = BR.config;

  const plain = (v) => v && typeof v === "object" && !Array.isArray(v);
  const copy = (v) => JSON.parse(JSON.stringify(v));

  function defaults() {
    const filters = {};
    for (const f of BR.filters.all()) {
      filters[f.id] = {
        enabled: f.enabledByDefault !== false,
        config: copy(f.defaults ? f.defaults() : {})
      };
    }
    return {
      schema: SCHEMA,
      filters,
      products: [],
      dealThreshold: C.DEAL_THRESHOLD,
      auto: { ...C.AUTO },
      highlightShare: C.HIGHLIGHT_SHARE,
      page: { onlyDeals: false, sortByDeal: false },
      home: { ...C.HOME },
      scope: "all",
      reader: { ...C.READER },
      watches: [],
      clearedAt: {}
    };
  }

  /** One watchdog, cleaned up, or null when it has no words to look for. */
  function watch(w) {
    if (!plain(w) || typeof w.query !== "string" || !w.query.trim()) return null;
    const max = Number(w.maxPrice);
    return {
      id: typeof w.id === "string" && w.id ? w.id : "w" + Math.random().toString(36).slice(2, 9),
      query: w.query.trim(),
      category: typeof w.category === "string" && w.category ? w.category : null,
      maxPrice: Number.isFinite(max) && max > 0 ? max : null
    };
  }

  /** Any stored value (or nothing) → a complete, valid settings object. */
  function normalize(raw) {
    const out = defaults();
    if (!plain(raw)) return out;

    if (plain(raw.filters)) {
      for (const [id, saved] of Object.entries(raw.filters)) {
        if (!plain(saved)) continue;
        /* Unknown ids are kept: a filter removed from the code should not
         * wipe its config if it comes back. */
        const base = out.filters[id] || { enabled: true, config: {} };
        out.filters[id] = {
          enabled: saved.enabled !== undefined ? !!saved.enabled : base.enabled,
          config: { ...base.config, ...(plain(saved.config) ? saved.config : {}) }
        };
      }
    }
    if (Array.isArray(raw.products)) out.products = raw.products.filter((p) => typeof p === "string");
    if (Number.isFinite(raw.dealThreshold)) out.dealThreshold = raw.dealThreshold;
    if (plain(raw.auto)) out.auto = { ...out.auto, ...raw.auto };
    if (!(raw.schema >= 2) && out.auto.mode === "strict") out.auto.mode = "loose";
    if (!["strict", "loose"].includes(out.auto.mode)) out.auto.mode = C.AUTO.mode;
    if (Number.isFinite(raw.highlightShare)) out.highlightShare = raw.highlightShare;
    if (plain(raw.page)) {
      out.page = { onlyDeals: !!raw.page.onlyDeals, sortByDeal: !!raw.page.sortByDeal };
    }
    if (plain(raw.home)) {
      const psc = String(raw.home.psc || "").replace(/\s/g, "");
      out.home = {
        psc: /^\d{5}$/.test(psc) ? psc : "",
        radiusKm: BR.text.clamp(Number(raw.home.radiusKm), 1, 300, C.HOME.radiusKm)
      };
    }
    if (raw.scope === "near" || raw.scope === "all") out.scope = raw.scope;
    if (plain(raw.reader)) {
      const r = raw.reader;
      out.reader = {
        enabled: !!r.enabled,
        pages: BR.text.clamp(Number(r.pages), 1, C.READER_MAX_PAGES, C.READER.pages),
        everyMinutes: BR.text.clamp(Number(r.everyMinutes), C.READER_MIN_MINUTES, 24 * 60, C.READER.everyMinutes)
      };
    }
    if (Array.isArray(raw.watches)) out.watches = raw.watches.map(watch).filter(Boolean);
    if (plain(raw.clearedAt)) out.clearedAt = { ...raw.clearedAt };
    return out;
  }

  /** Sections background reading visits: every one not hidden by the
   * category filter, plus each watchdog's own section. */
  function readerSections(settings) {
    const f = settings.filters.category;
    const hidden = new Set(f && f.enabled ? f.config.categories || [] : []);
    const ids = BR.categories.IDS.filter((id) => !hidden.has(id));
    for (const w of settings.watches) if (w.category && !ids.includes(w.category)) ids.push(w.category);
    return ids;
  }

  BR.settings = { SCHEMA, defaults, normalize, watch, readerSections };
})(globalThis.BR);
