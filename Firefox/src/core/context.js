/* Bazoš Rider — core/context.js
 *
 * The object every badge and list module receives. Expensive parts (groups,
 * product medians) are computed on first use and only once per page.
 *
 *   ctx.history, ctx.settings, ctx.now
 *   ctx.today      "YYYY-MM-DD"
 *   ctx.year       "YYYY"
 *   ctx.groups     BR.groups.build(...) result, or null when automatic
 *                  comparison is switched off
 *   ctx.productStats   { [product]: { median, n } }
 *   ctx.hidden(item)   true when a hide filter matches
 *   ctx.km(item)       kilometres from your postal code, or null (no home
 *                      set, no PSČ on the listing, or no geo/ loaded: the
 *                      content script does not load it)
 *   ctx.near(item)     within settings.home.radiusKm
 *   ctx.homeSet        a home postal code is set and known
 */
(function (BR) {
  "use strict";

  BR.context = function (history, settings, now) {
    const today = BR.text.localDay(now);
    let groups;
    let productStats;
    const homeSet = !!(BR.geo && settings.home.psc && BR.geo.known(settings.home.psc));
    const km = (item) => (homeSet && item && item.psc ? BR.geo.km(settings.home.psc, item.psc) : null);

    return {
      history,
      settings,
      now,
      today,
      year: today.slice(0, 4),

      get groups() {
        if (groups === undefined) {
          groups = settings.auto.enabled ? BR.groups.build(history, settings.auto) : null;
        }
        return groups;
      },

      get productStats() {
        if (productStats === undefined) productStats = BR.products.stats(history, settings.products);
        return productStats;
      },

      hidden: (item) => BR.filters.hides(item, settings),
      km,
      near: (item) => {
        const d = km(item);
        return d != null && d <= settings.home.radiusKm;
      },
      homeSet
    };
  };
})(globalThis.BR);
