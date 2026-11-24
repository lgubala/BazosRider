/* "↓ −200 €": the price went down today, compared with the last time you saw it. */
BR.badges.add({
  id: "drop",
  order: 20,
  color: "#1a7f37",
  test(listing, entry, ctx) {
    if (!entry || !entry.drop || entry.drop.day !== ctx.today) return null;
    return BR.t("badge_drop", { amount: BR.text.money(entry.drop.from - entry.price) });
  }
});
