/* Strážcovia: for each watchdog set in the popup settings, the cheapest
 * matches near you and in all of Slovakia (core/watches.js). Not affected by
 * the V okolí / Celé Slovensko switch: it always shows both. */
BR.lists.add({
  id: "watches",
  order: 5,
  title: "list_watches_title",
  hint: "list_watches_hint",
  layout: "sections",
  scoped: false,
  empty: "list_watches_none",

  items(ctx) {
    const rows = [];
    const radius = ctx.settings.home.radiusKm;
    for (const w of ctx.settings.watches) {
      const r = BR.watches.results(w, ctx);
      const name = w.query + (w.maxPrice ? ` ≤ ${BR.text.money(w.maxPrice)}` : "");
      const summary = r.n
        ? BR.t("watch_summary", { n: r.n, median: BR.text.money(r.median) })
        : BR.t("watch_nothing");
      const add = (key, list, none) => {
        const section = BR.t(key, { name, km: radius });
        if (!list.length) rows.push({ section, summary, empty: BR.t(none) });
        else for (const e of list) rows.push({ ...e, section, summary });
      };
      if (ctx.homeSet) add("watch_near", r.near, "watch_near_none");
      add("watch_all", r.all, "watch_all_none");
    }
    return rows;
  },

  meta: (row) => [BR.categories.label(row.category), BR.t("meta_seen", { date: BR.text.shortDate(row.lastSeen) })]
});
