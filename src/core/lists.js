/* Bazoš Rider — core/lists.js
 *
 * Helpers for the popup's list modules (src/lists/), and the one function the
 * popup calls to get a list's rows.
 *
 * A list module's items(ctx) returns rows, already sorted, each a history
 * entry plus whatever the row shows:
 *   { ...entry, share, free, median, n, group, product }
 * itemsOf() then drops rows a hide filter matches and rows seen before the
 * list was last cleared. Clearing never deletes history.
 */
(function (BR) {
  "use strict";

  /** First seen today ("day") or this calendar year ("year"). */
  function inPeriod(entry, period, ctx) {
    const first = entry.firstSeen || "";
    return period === "day" ? first === ctx.today : first.slice(0, 4) === ctx.year;
  }

  /** Keeps the first n rows of each category, in the order given. */
  function topPerCategory(rows, n) {
    const groups = new Map();
    for (const r of rows) {
      const key = r.category || "";
      if (!groups.has(key)) groups.set(key, []);
      const g = groups.get(key);
      if (g.length < n) g.push(r);
    }
    return [...groups.entries()].map(([category, items]) => ({ category, items }));
  }

  /**
   * Rows for list `def`, with hidden and cleared rows removed, each with its
   * distance as `km`. With the popup on "V okolí", rows outside the radius
   * (or without a known place) are left out too, unless the list says
   * `scoped: false` (the watchdogs show near and far themselves).
   */
  function itemsOf(def, ctx) {
    const cleared = ctx.settings.clearedAt[def.id] || null;
    const nearOnly = def.scoped !== false && ctx.settings.scope === "near" && ctx.homeSet;
    return def.items(ctx).filter((r) => {
      if (r.empty) return true;               // a placeholder row, see rows.js
      if (ctx.hidden(r)) return false;
      if (cleared && (r.firstSeenAt || r.firstSeen) <= cleared) return false;
      if (nearOnly && !ctx.near(r)) return false;
      return true;
    }).map((r) => (r.empty || r.km !== undefined ? r : { ...r, km: ctx.km(r) }));
  }

  /** The group comparison of one history entry, as row fields. */
  function groupFields(entry, ctx) {
    const groups = ctx.groups;
    if (!groups) return { share: null, free: entry.price === 0, group: "", n: 0, median: null };
    const s = groups.shareOf(entry.id);
    const g = groups.groupOf(entry.id);
    return {
      share: s ? s.share : null,
      free: s ? s.free : entry.price === 0,
      group: g ? g.label : "",
      n: g ? g.n : 0,
      median: g ? g.median : null
    };
  }

  /** "videné 24.11.", or null when it was seen today: then it says nothing. */
  function seen(row) {
    if (!row.lastSeen || row.lastSeen === BR.text.localDay(new Date())) return null;
    return BR.t("meta_seen", { date: BR.text.shortDate(row.lastSeen) });
  }

  Object.assign(BR.lists, { inPeriod, topPerCategory, itemsOf, groupFields, seen });
})(globalThis.BR);
