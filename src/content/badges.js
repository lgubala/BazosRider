/* Bazoš Rider — content/badges.js
 * Draws badges under a listing's price. Inline styles, because a stylesheet
 * injected into Bazoš would have to fight theirs.
 *
 * A badge carrying a deal (core/deals.js) is clickable: it opens a small
 * panel under the listing with the listings it was compared with, so a wrong
 * comparison is easy to spot. */
(function (BR) {
  "use strict";

  const C = BR.config;
  const FONT = "font-family:system-ui,sans-serif;";
  const STYLE =
    "display:block;margin-top:2px;padding:1px 5px;border-radius:3px;font-size:12px;" +
    "font-weight:bold;white-space:normal;line-height:1.3;max-width:100%;box-sizing:border-box;" +
    "color:#fff;" + FONT;   // wraps: Bazoš's price column is narrow
  /* Bazoš rows are flex rows: flex-basis 100 % (with the row wrapping while
   * the panel is open) puts the panel under the listing, not beside it. */
  const PANEL =
    "clear:both;flex:0 0 100%;box-sizing:border-box;margin:4px 0 6px;padding:6px 8px;background:#f6f8fa;border:1px solid #d0d7de;" +
    "border-radius:4px;font-size:13px;color:#1f2328;line-height:1.5;" + FONT;

  function el(tag, css, text) {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }

  function panelFor(deal) {
    const panel = el("div", PANEL);
    panel.className = "br-details";
    panel.append(el("div", "font-weight:bold;margin-bottom:2px;",
      BR.t("details_title", { median: BR.text.money(deal.median), n: deal.n })));
    const rows = deal.comparables();
    for (const e of rows.slice(0, C.DETAILS_LIMIT)) {
      const row = el("div", "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;");
      row.append(el("b", "display:inline-block;min-width:5.5em;", BR.text.money(e.price)));
      const a = el("a", "", e.title);
      a.href = e.url;
      a.target = "_blank";
      a.rel = "noopener";
      row.append(a);
      panel.append(row);
    }
    if (rows.length > C.DETAILS_LIMIT) {
      panel.append(el("div", "color:#57606a;", BR.t("details_more", { n: rows.length - C.DETAILS_LIMIT })));
    }
    panel.append(el("div", "color:#57606a;font-size:12px;margin-top:2px;",
      BR.t(deal.suspicious ? "details_suspicious" : "details_hint")));
    return panel;
  }

  function toggle(element, deal) {
    if (close(element)) return;
    element.style.flexWrap = "wrap";
    element.append(panelFor(deal));
  }

  /** Removes an open panel; true if there was one. */
  function close(element) {
    const open = element.querySelector(".br-details");
    if (!open) return false;
    open.remove();
    element.style.flexWrap = "";
    return true;
  }

  function draw(element, badges) {
    close(element);
    element.querySelectorAll(".br-badge").forEach((old) => old.remove());
    const cell = element.querySelector(C.SELECTORS.price);
    if (!cell || !badges.length) return;
    for (const b of badges) {
      const span = el("span", STYLE + "background:" + b.color + ";", b.text);
      span.className = "br-badge br-badge-" + b.id;
      if (b.title) span.title = b.title;
      if (b.details) {
        span.style.cursor = "pointer";
        span.setAttribute("role", "button");
        span.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          toggle(element, b.details);
        });
      }
      cell.append(span);
    }
  }

  BR.page = Object.assign(BR.page || {}, { drawBadges: draw });
})(globalThis.BR);
