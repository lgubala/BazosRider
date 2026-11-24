/* Najlacnejšie dnes: the cheapest priced listings first seen today, five per
 * category. Ranked by absolute price, not by discount: a 30 € item beats a
 * 99 € one here even if the 99 € one is a bigger bargain. */
BR.lists.add({
  id: "cheapest",
  order: 10,
  title: "list_cheapest_title",   // _locales keys
  hint: "list_cheapest_hint",
  empty: "list_cheapest_empty",
  layout: "categories",           // tabs per category, LIST_LIMIT rows each
  tall: true,                     // left column of the popup; the rest stack on the right
  clearable: true,
  rank: true,                     // "#1" pill when there is no comparison

  items(ctx) {
    const rows = [];
    for (const e of Object.values(ctx.history)) {
      if (!e.price || !BR.lists.inPeriod(e, "day", ctx)) continue;
      rows.push({ ...e, ...BR.lists.groupFields(e, ctx), free: false });
    }
    return rows.sort((a, b) => a.price - b.price ||
                               String(b.firstSeenAt).localeCompare(String(a.firstSeenAt)));
  },

  meta(row) {
    const parts = [];
    if (row.group && row.n >= 2) parts.push(BR.t("meta_group", { name: row.group }));
    if (row.median != null && row.n >= 2) {
      parts.push(BR.t("meta_median", { price: BR.text.money(row.median), n: row.n }));
    }
    parts.push(BR.t("meta_seen", { date: BR.text.shortDate(row.lastSeen) }));
    return parts;
  }
});
