/* Ručne zadané produkty: today's listings well under the median of a product
 * you typed in the popup settings. */
BR.lists.add({
  id: "products",
  order: 50,
  title: "list_products_title",
  tab: "tab_products",
  card: "extra",
  empty: (ctx) => BR.t(ctx.settings.products.length ? "list_products_empty" : "list_products_none"),
  layout: "top",
  limit: 15,

  items(ctx) {
    const { products, dealThreshold } = ctx.settings;
    if (!products.length) return [];
    const rows = [];
    for (const e of Object.values(ctx.history)) {
      if (e.firstSeen !== ctx.today) continue;
      const deal = BR.products.dealOf(e, products, ctx.productStats);
      if (deal && deal.share >= dealThreshold) rows.push({ ...e, ...deal, free: false });
    }
    return rows.sort((a, b) => b.share - a.share);
  },

  meta: (row) => [
    BR.t("meta_median", { price: BR.text.money(row.median), n: row.n }),
    BR.t("meta_product", { name: row.product })
  ]
});
