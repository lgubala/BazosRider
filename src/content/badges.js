/* Bazoš Rider — content/badges.js
 * Draws badges under a listing's price. Inline styles, because a stylesheet
 * injected into Bazoš would have to fight theirs. */
(function (BR) {
  "use strict";

  const STYLE =
    "display:block;margin-top:2px;padding:1px 5px;border-radius:3px;font-size:12px;" +
    "font-weight:bold;white-space:nowrap;color:#fff;font-family:system-ui,sans-serif;";

  function draw(element, badges) {
    const cell = element.querySelector(BR.config.SELECTORS.price);
    if (!cell || !badges.length) return;
    cell.querySelectorAll(".br-badge").forEach((old) => old.remove());
    for (const b of badges) {
      const span = document.createElement("span");
      span.className = "br-badge br-badge-" + b.id;
      span.textContent = b.text;
      span.style.cssText = STYLE + "background:" + b.color + ";";
      cell.append(span);
    }
  }

  BR.page = Object.assign(BR.page || {}, { drawBadges: draw });
})(globalThis.BR);
