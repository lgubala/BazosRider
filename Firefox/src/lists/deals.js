/* Deal dňa and Deal roka: the biggest discounts against similar listings
 * (core/groups.js), five across all categories. Both lists are one module
 * registered twice, because they differ only in the period. */
(function () {
  "use strict";

  function deals(period) {
    return function (ctx) {
      const rows = [];
      const min = ctx.settings.auto.minShare;
      for (const e of Object.values(ctx.history)) {
        if (!e.price || !BR.lists.inPeriod(e, period, ctx)) continue;
        const f = BR.lists.groupFields(e, ctx);
        if (f.share == null || f.free || f.share < min) continue;
        rows.push({ ...e, ...f });
      }
      return rows.sort((a, b) => b.share - a.share);
    };
  }

  function meta(row) {
    const parts = [BR.categories.label(row.category)];
    if (row.median != null) parts.push(BR.t("meta_median", { price: BR.text.money(row.median), n: row.n }));
    if (row.group) parts.push(BR.t("meta_group", { name: row.group }));
    parts.push(BR.t("meta_seen", { date: BR.text.shortDate(row.lastSeen) }));
    return parts;
  }

  /* An empty deal list says why. Groups need a shared model number, so a
   * page of "Šaty na stužkovú" and "Balerínky" has nothing to compare. */
  function empty(period) {
    return function (ctx) {
      let n = 0;
      let comparable = 0;
      for (const e of Object.values(ctx.history)) {
        if (!e.price || !BR.lists.inPeriod(e, period, ctx) || ctx.hidden(e)) continue;
        n++;
        if (BR.lists.groupFields(e, ctx).share != null) comparable++;
      }
      const when = BR.t(period === "day" ? "deals_when_day" : "deals_when_year");
      if (!n) return BR.t(period === "day" ? "list_day_empty" : "list_year_empty");
      if (!comparable) {
        const key = ctx.settings.auto.mode === "loose" ? "deals_none_comparable_loose" : "deals_none_comparable";
        return BR.t(key, { when, n });
      }
      return BR.t("deals_none_cheaper", {
        when, n, comparable, pct: BR.text.percent(ctx.settings.auto.minShare)
      });
    };
  }

  const common = { layout: "top", clearable: true, needsGroups: true, meta };

  BR.lists.add({
    ...common,
    id: "day",
    order: 20,
    title: "list_day_title",
    hint: "list_day_hint",
    empty: empty("day"),
    items: deals("day")
  });

  BR.lists.add({
    ...common,
    id: "year",
    order: 30,
    title: "list_year_title",
    hint: "list_year_hint",
    empty: empty("year"),
    items: deals("year")
  });
})();
