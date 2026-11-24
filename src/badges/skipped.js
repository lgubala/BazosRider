/* Grey "splátky / leasing": a skip rule kept this listing out of price
 * history (src/skip/), which is why it never gets a comparison. */
BR.badges.add({
  id: "skipped",
  order: 90,
  color: "#6e7781",
  test: (listing) => (listing.skip && listing.skip.badge ? BR.t(listing.skip.badge) : null)
});
