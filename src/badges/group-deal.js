/* "−12 % vs. 4 podobných": under the median of similar listings found
 * automatically (core/groups.js). Quiet when a manual product already said
 * the same thing more precisely. */
BR.badges.add({
  id: "group-deal",
  order: 40,
  color: "#7a4bb3",
  test(listing, entry, ctx, shown) {
    if (!entry || !listing.price || shown.has("product-deal") || !ctx.groups) return null;
    const s = ctx.groups.shareOf(listing.id);
    if (!s || s.free || s.share < ctx.settings.auto.minShare) return null;
    return BR.t("badge_group", { pct: BR.text.percent(s.share), n: s.n });
  }
});
