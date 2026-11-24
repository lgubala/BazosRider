/* Bazoš Rider — content/banner.js
 * "Bazoš Rider: skryté 12 · zobrazené 8 z 20 → ďalšia strana", above the
 * results, only when something was hidden. The link is Bazoš's own "Ďalšia",
 * so a page emptied by filters is one click from the next one. */
(function (BR) {
  "use strict";

  function show(doc, counts) {
    const anchor = doc.querySelector(BR.config.SELECTORS.resultsAnchor);
    if (!anchor) return;
    doc.getElementById("br-banner")?.remove();

    const banner = doc.createElement("div");
    banner.id = "br-banner";
    banner.style.cssText =
      "margin:.5em 0;padding:.5em .8em;background:#fff3cd;border:1px solid #e0c060;" +
      "border-radius:4px;font-size:14px;color:#1f2328;font-family:system-ui,sans-serif;";
    banner.append(BR.t("banner_hidden", {
      hidden: counts.hidden,
      shown: counts.total - counts.hidden,
      total: counts.total
    }));

    const next = BR.parse.nextPageUrl(doc);
    if (next) {
      const link = doc.createElement("a");
      link.href = next;
      link.textContent = BR.t("banner_next");
      link.style.marginLeft = ".5em";
      banner.append(link);
    }
    anchor.insertAdjacentElement("afterend", banner);
  }

  BR.page = Object.assign(BR.page || {}, { showBanner: show });
})(globalThis.BR);
