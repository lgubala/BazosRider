/* "ZADARMO": the listing gives the item away. Most important, so first. */
BR.badges.add({
  id: "free",
  order: 10,
  color: "#1a7f37",
  test: (listing) => (listing.price === 0 ? BR.t("badge_free") : null)
});
