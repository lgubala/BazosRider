/* "−12 % vs. 4 podobných": under the median of similar listings found
 * automatically (core/groups.js). Quiet when a manual product already said
 * the same thing more precisely. Orange with a ⚠ when it is suspiciously
 * cheap. Click it to see what it was compared with. */
BR.badges.add({
  id: "group-deal",
  order: 40,
  color: "#7a4bb3",
  test(listing, entry, ctx, shown) {
    if (shown.has("product-deal")) return null;
    const deal = BR.deals.group(listing, entry, ctx);
    return deal && BR.deals.badge(deal, "badge_group");
  }
});
