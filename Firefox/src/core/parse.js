/* Bazoš Rider — core/parse.js
 *
 * Reads the listings off a Bazoš results page. Nothing else touches Bazoš's
 * markup; selectors are in config.js.
 *
 * A listing: { element, id, url, category, title, description, price }
 *   price   number; 0 for "Zadarmo"; null for "V texte", "Dohodou", unknown
 */
(function (BR) {
  "use strict";

  const C = BR.config;
  const { normalize } = BR.text;

  /** https://oblecenie.bazos.sk/inzerat/197697149/x.php → "oblecenie" */
  function categoryFromUrl(href) {
    try {
      const host = new URL(href).hostname;
      const suffix = "." + C.DOMAIN;
      if (!host.endsWith(suffix)) return null;
      const sub = host.slice(0, -suffix.length);
      return sub && sub !== "www" ? sub : null;
    } catch (e) {
      return null;
    }
  }

  /** "/inzerat/197697149/slug.php" → "197697149" */
  function listingId(url) {
    const m = /\/inzerat\/(\d+)\//.exec(url || "");
    return m ? m[1] : null;
  }

  /** "4 999 €" → 4999, "Zadarmo" → 0, "V texte" → null */
  function price(text) {
    const n = normalize(text);
    if (C.FREE_WORDS.some((w) => n.includes(w))) return 0;
    const digits = n.replace(/[^\d]/g, "");
    return digits ? Number(digits) : null;
  }

  function listings(doc) {
    const S = C.SELECTORS;
    const out = [];
    doc.querySelectorAll(S.listing).forEach((el) => {
      const link = el.querySelector(S.link);
      if (!link) return;
      const url = link.href || link.getAttribute("href") || "";
      const titleEl = el.querySelector(S.title);
      const descEl = el.querySelector(S.description);
      const priceEl = el.querySelector(S.price);
      out.push({
        element: el,
        id: listingId(url),
        url,
        category: categoryFromUrl(url),
        title: titleEl ? titleEl.textContent.trim() : "",
        description: descEl ? descEl.textContent.trim() : "",
        price: priceEl ? price(priceEl.textContent) : null
      });
    });
    return out;
  }

  /** Bazoš's own "Ďalšia" link, or null. */
  function nextPageUrl(doc) {
    for (const a of doc.querySelectorAll(C.SELECTORS.pagination)) {
      if (a.textContent.trim() === C.NEXT_PAGE_TEXT) return a.href || a.getAttribute("href");
    }
    return null;
  }

  BR.parse = { categoryFromUrl, listingId, price, listings, nextPageUrl };
})(globalThis.BR);
