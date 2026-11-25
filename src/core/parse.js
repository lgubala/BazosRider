/* Bazoš Rider — core/parse.js
 *
 * Reads the listings off a Bazoš results page, and a single listing off its
 * own page. Nothing else touches Bazoš's markup; selectors are in config.js.
 *
 * A listing: { element, id, url, category, title, description, price, psc, place }
 *   price   number; 0 for "Zadarmo"; null for "V texte", "Dohodou", unknown
 *   psc     the seller's postal code, "97401", or null
 *   place   the town as Bazoš shows it, "Banská Bystrica", or ""
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

  /** "Čadca 023 54" or "023 54 Čadca" → { psc: "02354", place: "Čadca" } */
  function location(text) {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    const m = /(\d{3}) ?(\d{2})\b/.exec(t);
    return {
      psc: m ? m[1] + m[2] : null,
      place: (m ? t.replace(m[0], " ") : t).replace(/\s+/g, " ").trim()
    };
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
      /* "Čadca<br>023 54" reads as "Čadca023 54"; location() copes. */
      const where = location(el.querySelector(S.location)?.textContent);
      out.push({
        element: el,
        id: listingId(url),
        url,
        category: categoryFromUrl(url),
        title: titleEl ? titleEl.textContent.trim() : "",
        description: descEl ? descEl.textContent.trim() : "",
        price: priceEl ? price(priceEl.textContent) : null,
        psc: where.psc,
        place: where.place
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

  /**
   * A single listing's own page: the listing, or null on any other page.
   * { element, id, url, category, title, description, price, detail: true }
   * `element` is the header row the price check goes under.
   */
  function detail(doc) {
    const S = C.SELECTORS;
    const titleEl = doc.querySelector(S.detailTitle);
    if (!titleEl) return null;
    const canonical = doc.querySelector(S.canonical);
    const url = ((canonical && canonical.href) || doc.location.href).split("#")[0];
    const id = listingId(url) || listingId(doc.location.href);
    if (!id) return null;
    const descEl = doc.querySelector(S.detailDescription);
    const where = location(detailCell(doc, C.DETAIL_LOCATION_LABEL, 2));
    return {
      element: doc.querySelector(S.detailHeader) || titleEl,
      id,
      url,
      category: categoryFromUrl(url),
      title: titleEl.textContent.trim(),
      description: descEl ? descEl.textContent.trim().slice(0, C.DETAIL_DESCRIPTION_MAX) : "",
      price: price(detailCell(doc, C.DETAIL_PRICE_LABEL, 1) || ""),
      psc: where.psc,
      place: where.place,
      detail: true
    };
  }

  /** The text of the `span` cells after a label ("Cena:", "Lokalita:") in
   * the listing's info table, or null. */
  function detailCell(doc, label, span) {
    const cells = [...doc.querySelectorAll(C.SELECTORS.detailInfo)];
    const i = cells.findIndex((td) => td.textContent.trim() === label);
    if (i < 0) return null;
    return cells.slice(i + 1, i + 1 + span).map((td) => td.textContent).join(" ");
  }

  /** False for a URL Bazoš's robots.txt asks programs to stay off (search
   * pages and their filters, config DISALLOWED_URL_PARTS). The scan button
   * and background reading only ever read URLs this allows. */
  const readable = (url) => !!url && !C.DISALLOWED_URL_PARTS.some((p) => String(url).includes(p));

  BR.parse = { categoryFromUrl, listingId, price, location, listings, detail, nextPageUrl, readable };
})(globalThis.BR);
