/* "−25 % vs. medián (8 inz.)": well under the median of a product you typed
 * in the popup settings. The threshold is set there too. */
BR.badges.add({
  id: "product-deal",
  order: 30,
  color: "#0a66c2",
  test(listing, entry, ctx) {
    const s = ctx.settings;
    if (!s.products.length) return null;
    const deal = BR.products.dealOf(listing, s.products, ctx.productStats);
    if (!deal || deal.share < s.dealThreshold) return null;
    return BR.t("badge_product", { pct: BR.text.percent(deal.share), n: deal.n });
  }
});
