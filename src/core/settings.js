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
      clearedAt: {}
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
    if (plain(raw.clearedAt)) out.clearedAt = { ...raw.clearedAt };
    return out;
  }

  BR.settings = { SCHEMA, defaults, normalize };
})(globalThis.BR);
