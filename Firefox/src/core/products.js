/* Bazoš Rider — core/products.js
 *
 * Manual products: phrases you type on the options page ("romer king").
 * Every recorded listing whose title contains the phrase counts towards that
 * product's median. The median is trusted from MIN_SAMPLE listings.
 */
(function (BR) {
  "use strict";

  const C = BR.config;
  const { normalize, median } = BR.text;

  /** The first product phrase the title contains, normalised, or null. */
  function productOf(title, products) {
    const t = normalize(title);
    for (const p of products || []) {
      const key = normalize(p);
      if (key && t.includes(key)) return key;
    }
    return null;
  }

  /** { [product]: { median, n } } over every recorded listing priced above 0. */
  function stats(history, products) {
    const byProduct = {};
    for (const e of Object.values(history)) {
      if (e.price == null || e.price === 0) continue;
      const key = productOf(e.title, products);
      if (key) (byProduct[key] ||= []).push(e.price);
    }
    const out = {};
    for (const [key, prices] of Object.entries(byProduct)) {
      out[key] = { median: median(prices), n: prices.length };
    }
    return out;
  }

  /** 0.25 for 25 % under the median; null without a trusted median. */
  function shareBelow(price, stat) {
    if (!stat || stat.n < C.MIN_SAMPLE || !stat.median) return null;
    return (stat.median - price) / stat.median;
  }

  /** For one priced listing: { product, share, median, n } or null. */
  function dealOf(item, products, productStats) {
    if (item.price == null || item.price === 0) return null;
    const key = productOf(item.title, products);
    if (!key) return null;
    const stat = productStats[key];
    const share = shareBelow(item.price, stat);
    return share == null ? null : { product: key, share, median: stat.median, n: stat.n };
  }

  BR.products = { productOf, stats, shareBelow, dealOf };
})(globalThis.BR);
