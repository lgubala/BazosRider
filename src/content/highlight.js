/* Bazoš Rider — content/highlight.js
 *
 * What a good deal looks like on the page:
 *   - a green edge and a light green background on the whole listing
 *   - "Len výhodné": every other listing fades out (it stays readable)
 *   - "Zoradiť podľa zľavy": deals move to the top, biggest discount first
 *
 * A listing is a deal when content/main.js set listing.deal. Sorting keeps a
 * placeholder at every listing's original place, so switching it off puts
 * everything back, ads and other Bazoš boxes included.
 */
(function (BR) {
  "use strict";

  const EDGE = "inset 4px 0 0 #1a7f37";
  const BACKGROUND = "#eaf7ec";
  const FADED = "0.35";

  let slots = null;           // one comment node per listing, where it was

  function mark(l, onlyDeals) {
    const s = l.element.style;
    s.boxShadow = l.deal ? EDGE : "";
    s.backgroundColor = l.deal ? BACKGROUND : "";
    s.opacity = onlyDeals && !l.deal ? FADED : "";
    s.transition = "opacity .15s";
  }

  function order(listings, sorted) {
    if (!slots) {
      if (!sorted) return;
      slots = listings.map((l) => {
        const slot = document.createComment("br-slot");
        l.element.before(slot);
        return slot;
      });
    }
    let rows = listings;
    if (sorted) {
      rows = listings
        .map((l, i) => ({ l, i }))
        .sort((a, b) => (b.l.deal ? b.l.deal.share : -1) - (a.l.deal ? a.l.deal.share : -1) || a.i - b.i)
        .map((x) => x.l);
    }
    rows.forEach((l, i) => slots[i].after(l.element));
  }

  /** Applies highlight, fading and order for `prefs` = settings.page. */
  function highlight(listings, prefs) {
    for (const l of listings) if (!l.hidden) mark(l, prefs.onlyDeals);
    order(listings, prefs.sortByDeal);
  }

  /** Scrolls to a listing and flashes its outline. */
  function reveal(element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.style.outline = "3px solid #1a7f37";
    setTimeout(() => { element.style.outline = ""; }, 1600);
  }

  BR.page = Object.assign(BR.page || {}, { highlight, reveal });
})(globalThis.BR);
