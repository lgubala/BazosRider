/* Bazoš Rider — content/detail.js
 *
 * The price check on a listing's own page, right under its title:
 *
 *   Bazoš Rider · o 29 % lacnejší ako podobné
 *   Medián 420 € z 8 podobných · od 250 do 520 €
 *   V tvojej histórii od 20.11. · cena klesla z 350 € 24.11.
 *   Porovnané s:  250 €  iPhone 13 128GB zlatý …
 *   [Hľadať podobné na Bazoši]
 *
 * It says "drahší" as plainly as "lacnejší", and explains when there is
 * nothing to compare with. Inline styles, like everything drawn on Bazoš.
 */
(function (BR) {
  "use strict";

  const C = BR.config;
  const { money, percent, shortDate, normalize } = BR.text;
  const STOP = new Set(C.STOP_WORDS.map(normalize));

  const BOX =
    "margin:.6em 0;padding:.6em .9em;border-radius:6px;font-size:14px;line-height:1.6;" +
    "color:#1f2328;font-family:system-ui,sans-serif;border:1px solid ";
  const TONES = {
    good: "#9fd5ad;background:#eaf7ec;",
    warn: "#f0b37e;background:#fff4e8;",
    neutral: "#d0d7de;background:#f6f8fa;"
  };
  const MUTED = "color:#57606a;";

  function el(tag, css, text) {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }

  function link(href, text, css) {
    const a = el("a", css || "", text);
    a.href = href;
    return a;
  }

  /** A Bazoš search for this kind of item: the group's words, or the title's first few. */
  function searchUrl(listing, verdict) {
    const words = verdict && verdict.label
      ? verdict.label
      : listing.title.split(/\s+/).filter((w) => w && !STOP.has(normalize(w))).slice(0, 4).join(" ");
    const cat = listing.category || "www";
    const q = new URLSearchParams({ hledat: words, rubriky: cat });
    return `https://${cat}.${C.DOMAIN}/?${q}`;
  }

  /** The headline and tone for a verdict. */
  function headline(v) {
    const pct = percent(Math.abs(v.share));
    if (v.suspicious) return { tone: "warn", text: "⚠ " + BR.t("detail_suspicious", { pct }) };
    if (Math.abs(v.share) < C.FAIR_BAND) return { tone: "neutral", text: BR.t("detail_fair") };
    if (v.share > 0) return { tone: "good", text: BR.t("detail_cheaper", { pct }) };
    return { tone: "neutral", text: BR.t("detail_dearer", { pct }) };
  }

  /** "V tvojej histórii od 20.11. · cena klesla z 350 € 24.11." */
  function historyLine(entry) {
    if (!entry) return null;
    const parts = [BR.t("detail_since", { date: shortDate(entry.firstSeen) })];
    if (entry.drop) {
      parts.push(BR.t("detail_drop", { from: money(entry.drop.from), date: shortDate(entry.drop.day) }));
    } else if (entry.prevPrice != null && entry.prevPrice !== entry.price) {
      parts.push(BR.t("detail_changed", { from: money(entry.prevPrice) }));
    }
    return el("div", MUTED, parts.join(" · "));
  }

  function comparablesList(v) {
    const rows = v.comparables();
    const box = el("div", "margin-top:.3em;");
    box.append(el("div", "font-weight:bold;", BR.t("detail_compared")));
    for (const e of rows.slice(0, C.DETAILS_LIMIT)) {
      const row = el("div", "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;");
      row.append(el("b", "display:inline-block;min-width:5.5em;", money(e.price)));
      row.append(link(e.url, e.title));
      box.append(row);
    }
    if (rows.length > C.DETAILS_LIMIT) {
      box.append(el("div", MUTED, BR.t("details_more", { n: rows.length - C.DETAILS_LIMIT })));
    }
    return box;
  }

  function draw(doc, listing, entry, ctx) {
    doc.getElementById("br-price-check")?.remove();
    const v = BR.deals.verdict(listing, entry, ctx);
    const box = el("div");
    box.id = "br-price-check";

    const title = el("div", "font-size:15px;");
    title.append(el("b", "margin-right:.5em;", "Bazoš Rider"));
    box.append(title);
    let tone = "neutral";

    if (listing.skip) {
      title.append(BR.t("detail_skipped", { why: BR.t(listing.skip.badge) }));
    } else if (listing.price === 0) {
      title.append(BR.t("detail_free"));
      tone = "good";
    } else if (listing.price == null) {
      title.append(BR.t("detail_no_price"));
    } else if (!v) {
      title.append(BR.t("detail_nothing"));
      box.append(el("div", MUTED, BR.t("detail_nothing_hint")));
    } else {
      const h = headline(v);
      tone = h.tone;
      title.append(el("b", h.tone === "good" ? "color:#1a7f37;" : h.tone === "warn" ? "color:#bc4c00;" : "", h.text));
      const facts = [BR.t(v.source === "product" ? "detail_median_product" : "detail_median",
        { median: money(v.median), n: v.n })];
      if (v.min != null && v.max != null && v.min !== v.max) {
        facts.push(BR.t("detail_range", { min: money(v.min), max: money(v.max) }));
      }
      box.append(el("div", "", facts.join(" · ")));
      if (v.suspicious) box.append(el("div", "color:#bc4c00;", BR.t("details_suspicious")));
    }

    const since = historyLine(entry);
    if (since) box.append(since);
    if (v) box.append(comparablesList(v));
    if (!listing.skip) {
      box.append(link(searchUrl(listing, v), BR.t("detail_search"),
        "display:inline-block;margin-top:.4em;font-weight:bold;"));
    }

    box.style.cssText = BOX + TONES[tone];
    const row = listing.element.closest(".listainzerat") || listing.element;
    row.after(box);
    return v;
  }

  BR.page = Object.assign(BR.page || {}, { priceCheck: draw });
})(globalThis.BR);
