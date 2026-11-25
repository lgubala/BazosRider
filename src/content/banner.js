/* Bazoš Rider — content/banner.js
 *
 * The bar above the results:
 *
 *   Bazoš Rider  3 výhodné ponuky na tejto strane: [−42 %] [−31 %] [−25 %] · skryté 12 z 20
 *   [ ] Len výhodné  [ ] Zoradiť podľa zľavy  [Prejsť ďalších 10 strán]  → ďalšia strana
 *   Na ďalších stranách 2 výhodné: −45 %  iPhone 13 128GB  280 € …
 *
 * A [−42 %] chip scrolls to its listing. Everything it does goes through
 * `actions`, supplied by content/main.js; this file only draws.
 */
(function (BR) {
  "use strict";

  const C = BR.config;
  const GREEN = "#1a7f37";
  const BAR =
    "margin:.5em 0;padding:.5em .8em;border-radius:4px;font-size:14px;color:#1f2328;" +
    "line-height:1.9;font-family:system-ui,sans-serif;border:1px solid ";
  const CHIP =
    "display:inline-block;margin:0 .25em;padding:0 .45em;border-radius:3px;background:" + GREEN +
    ";color:#fff;font-weight:bold;font-size:13px;line-height:1.6;cursor:pointer;border:0;";
  const BUTTON =
    "margin-right:.6em;padding:.1em .6em;font-size:13px;border:1px solid #8c959f;border-radius:4px;" +
    "background:#fff;color:#1f2328;cursor:pointer;";

  function el(tag, css, text) {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }

  const pct = (deal) => "−" + BR.text.percent(deal.share) + " %";

  function chip(label, onClick, title) {
    const b = el("button", CHIP, label);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", onClick);
    return b;
  }

  function toggle(label, on, onChange) {
    const wrap = el("label", "margin-right:1em;white-space:nowrap;cursor:pointer;");
    const box = el("input", "margin:0 .3em 0 0;vertical-align:middle;");
    box.type = "checkbox";
    box.checked = on;
    box.addEventListener("change", () => onChange(box.checked));
    wrap.append(box, label);
    return wrap;
  }

  function summaryLine(state) {
    const line = el("div");
    line.append(el("b", "margin-right:.5em;", "Bazoš Rider"));
    const deals = state.listings.filter((l) => l.deal)
      .sort((a, b) => b.deal.share - a.deal.share);
    if (deals.length) {
      line.append(BR.tn("bar_deals", deals.length));
      for (const l of deals.slice(0, 12)) {
        line.append(chip(pct(l.deal), () => BR.page.reveal(l.element), l.title));
      }
    } else {
      line.append(el("span", "color:#57606a;", BR.t("bar_no_deals")));
    }
    if (state.counts.hidden > 0) {
      line.append(el("span", "color:#57606a;", " · " + BR.t("bar_hidden", {
        hidden: state.counts.hidden, total: state.counts.total
      })));
    }
    return line;
  }

  function controlsLine(state, actions) {
    const line = el("div");
    const prefs = state.settings.page;
    line.append(
      toggle(BR.t("bar_only_deals"), prefs.onlyDeals, (on) => actions.setPref("onlyDeals", on)),
      toggle(BR.t("bar_sort"), prefs.sortByDeal, (on) => actions.setPref("sortByDeal", on)));

    const next = BR.parse.nextPageUrl(document);
    if (state.scan) {
      line.append(el("span", "margin-right:.6em;", BR.t("bar_scanning", {
        done: state.scan.done, pages: state.scan.pages, n: state.scan.found
      })));
      const stop = el("button", BUTTON, BR.t("bar_stop"));
      stop.type = "button";
      stop.addEventListener("click", actions.stopScan);
      line.append(stop);
    } else if (state.scanned && !state.scanned.next) {
      line.append(el("span", "margin-right:.6em;color:#57606a;", BR.t("bar_scan_end")));
    } else if (next) {
      /* After a scan the button continues from the last page read. */
      const key = state.scanned ? "bar_scan_more" : "bar_scan";
      const scan = el("button", BUTTON, BR.t(key, { pages: C.SCAN_PAGES }));
      scan.type = "button";
      scan.title = BR.t("bar_scan_title");
      scan.addEventListener("click", actions.scan);
      line.append(scan);
    }
    if (next) line.append(link(next, BR.t("banner_next")));
    if (state.scanned && state.scanned.last) {
      line.append(link(state.scanned.last, BR.t("bar_scan_last", { pages: state.scanned.pages })));
    }
    return line;
  }

  function link(href, text) {
    const a = el("a", "white-space:nowrap;margin-right:.8em;", text);
    a.href = href;
    return a;
  }

  /** What the scan of further pages turned up. */
  function moreLine(state) {
    const s = state.scanned;
    if (!s) return null;
    const box = el("div", "margin-top:.2em;");
    if (s.error) box.append(el("div", "color:#cf222e;", BR.t("bar_scan_error", { error: s.error })));
    if (!state.more.length) {
      box.append(el("span", "color:#57606a;",
        BR.t("bar_more_none", { pages: s.pages, n: s.listings })));
      return box;
    }
    box.append(BR.tn("bar_more", state.more.length, { pages: s.pages }));
    for (const { listing, deal } of state.more.slice(0, C.SCAN_SHOWN)) {
      const row = el("div", "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;");
      row.append(el("span", CHIP + "cursor:default;margin-left:0;", pct(deal)));
      const a = el("a", "", listing.title);
      a.href = listing.url;
      row.append(a, el("b", "margin-left:.5em;", BR.text.money(listing.price)));
      box.append(row);
    }
    if (state.more.length > C.SCAN_SHOWN) {
      box.append(el("div", "color:#57606a;", BR.t("bar_more_rest", { n: state.more.length - C.SCAN_SHOWN })));
    }
    return box;
  }

  function show(doc, state, actions) {
    const anchor = doc.querySelector(C.SELECTORS.resultsAnchor);
    if (!anchor) return;
    const any = state.listings.some((l) => l.deal) || state.more.length > 0;
    const bar = el("div", BAR + (any ? "#9fd5ad;background:#eaf7ec;" : "#d0d7de;background:#f6f8fa;"));
    bar.id = "br-banner";
    bar.append(summaryLine(state), controlsLine(state, actions));
    const more = moreLine(state);
    if (more) bar.append(more);

    const old = doc.getElementById("br-banner");
    if (old) old.replaceWith(bar);
    else anchor.insertAdjacentElement("afterend", bar);
  }

  BR.page = Object.assign(BR.page || {}, { showBanner: show });
})(globalThis.BR);
