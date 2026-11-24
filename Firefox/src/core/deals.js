/* Bazoš Rider — core/deals.js
 *
 * "Is this listing a good price?", answered once for the badges, the page
 * highlight, the summary bar and the toolbar count.
 *
 *   BR.deals.product(listing, entry, ctx)  against a manual product's median
 *   BR.deals.group(listing, entry, ctx)    against similar listings (groups.js)
 *   BR.deals.best(listing, entry, ctx)     product first, then group
 *   BR.deals.isGood(deal, ctx)             worth highlighting on the page
 *
 * A deal: { source, share, n, median, suspicious, comparables() }
 *   share        0.25 for 25 % under the median
 *   suspicious   SUSPICIOUS_SHARE or more under: more often a different
 *                product, a broken one or a scam than a bargain
 *   comparables  the listings it was compared with, cheapest first
 */
(function (BR) {
  "use strict";

  const C = BR.config;

  const byPrice = (entries) =>
    entries.filter((e) => e && e.price > 0).sort((a, b) => a.price - b.price);

  function finish(deal) {
    deal.suspicious = deal.share >= C.SUSPICIOUS_SHARE;
    return deal;
  }

  function product(listing, entry, ctx) {
    const s = ctx.settings;
    if (listing.skip || !s.products.length) return null;
    const d = BR.products.dealOf(listing, s.products, ctx.productStats);
    if (!d || d.share < s.dealThreshold) return null;
    return finish({
      source: "product",
      share: d.share,
      n: d.n,
      median: d.median,
      comparables: () => byPrice(Object.values(ctx.history).filter((e) =>
        e.id !== listing.id && BR.products.productOf(e.title, s.products) === d.product))
    });
  }

  function group(listing, entry, ctx) {
    if (listing.skip || !entry || !listing.price || !ctx.groups) return null;
    const g = ctx.groups.shareOf(listing.id);
    if (!g || g.free || g.share < ctx.settings.auto.minShare) return null;
    return finish({
      source: "group",
      share: g.share,
      n: g.n,
      median: g.median,
      comparables: () => byPrice(ctx.groups.membersOf(listing.id))
    });
  }

  const best = (listing, entry, ctx) => product(listing, entry, ctx) || group(listing, entry, ctx);

  const isGood = (deal, ctx) =>
    !!deal && !deal.suspicious && deal.share >= ctx.settings.highlightShare;

  /** What a deal badge module returns: normal, or orange with a warning. */
  function badge(deal, key) {
    const text = BR.t(key, { pct: BR.text.percent(deal.share), n: deal.n });
    if (deal.suspicious) {
      return { text: "⚠ " + text, color: C.SUSPICIOUS_COLOR,
               title: BR.t("badge_suspicious_title"), details: deal };
    }
    return { text, title: BR.t("badge_details_title"), details: deal };
  }

  BR.deals = { product, group, best, isGood, badge };
})(globalThis.BR);
