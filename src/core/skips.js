/* Bazoš Rider — core/skips.js
 *
 * Runs the skip rules from src/skip/. A skipped listing is never written to
 * price history, and an old entry that matches is removed, because its
 * number is not the item's price (a leasing down payment, a monthly
 * installment) and would drag every median in its category.
 *
 * Skipped listings stay visible on the page, with a grey badge saying why.
 */
(function (BR) {
  "use strict";

  /** The first rule that matches, or null. `item` needs title, description, price. */
  function reasonFor(item) {
    for (const rule of BR.skips.all()) {
      try {
        if (rule.test(item)) return rule;
      } catch (e) {
        console.error(`[bazos-rider] skip rule "${rule.id}" failed`, e);
      }
    }
    return null;
  }

  Object.assign(BR.skips, { reasonFor });
})(globalThis.BR);
