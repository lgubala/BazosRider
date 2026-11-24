/* Zadarmo: everything given away this year, five per category. */
BR.lists.add({
  id: "free",
  order: 40,
  title: "list_free_title",
  empty: "list_free_empty",
  layout: "categories",
  clearable: true,

  items(ctx) {
    return Object.values(ctx.history)
      .filter((e) => e.price === 0 && BR.lists.inPeriod(e, "year", ctx))
      .map((e) => ({ ...e, share: 1, free: true }))
      .sort((a, b) => String(b.firstSeenAt).localeCompare(String(a.firstSeenAt)));
  },

  meta: (row) => [BR.t("meta_seen", { date: BR.text.shortDate(row.lastSeen) })]
});
