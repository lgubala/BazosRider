/* "−25 % vs. medián (8 inz.)": well under the median of a product you typed
 * in the popup settings. The threshold is set there too. Orange with a ⚠
 * when it is suspiciously cheap. Click it to see what it was compared with. */
BR.badges.add({
  id: "product-deal",
  order: 30,
  color: "#0a66c2",
  test(listing, entry, ctx) {
    const deal = BR.deals.product(listing, entry, ctx);
    return deal && BR.deals.badge(deal, "badge_product");
  }
});
