/* "Kúpim", "Hľadám", "Vymením": someone wants to buy or swap.
 *
 * The price on such a listing is what they are willing to pay, or nothing
 * to do with money at all, so it would pull a median down and show up as a
 * bargain. Only the title is checked, and only at its start for "vymením":
 * "Predám alebo vymením" is an ordinary sale.
 */
(function () {
  "use strict";

  const WANTED = [
    /^\W*(?:kupim|hladam|zhanam|shanam)\b/,           // at the start of the title
    /\b(?:kupim|hladam)\s+(?:\w+\s+)?(?:do|za|max)\b/, // "kúpim iPhone do 300 €"
    /^\W*vymenim\b/
  ];

  BR.skips.add({
    id: "wanted",
    order: 20,
    badge: "skip_wanted_badge",
    test: (item) => {
      const title = BR.text.normalize(item.title);
      return WANTED.some((re) => re.test(title));
    }
  });
})();
