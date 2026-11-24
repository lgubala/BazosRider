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

  const common = { layout: "top", clearable: true, needsGroups: true, meta };

  BR.lists.add({
    ...common,
    id: "day",
    order: 20,
    title: "list_day_title",
    hint: "list_day_hint",
    empty: "list_day_empty",
    items: deals("day")
  });

  BR.lists.add({
    ...common,
    id: "year",
    order: 30,
    title: "list_year_title",
    hint: "list_year_hint",
    empty: "list_year_empty",
    items: deals("year")
  });
})();
