/* Bazoš Rider — ui/dom.js
 * DOM helpers for the popup. Never innerHTML: listing
 * titles come from strangers. */
(function (BR) {
  "use strict";

  /**
   * h("a", { href, class: "x", onclick: fn }, "text", child)
   * Keys that are element properties (checked, value, disabled) are set as
   * properties; "on*" keys become listeners; everything else is an attribute.
   */
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value == null || value === false) continue;
      if (key.startsWith("on") && typeof value === "function") {
        el.addEventListener(key.slice(2), value);
      } else if (key === "class") {
        el.className = value;
      } else if (key in el && key !== "list") {
        el[key] = value;
      } else {
        el.setAttribute(key, value === true ? "" : value);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : String(c));
    }
    return el;
  }

  /** Fills [data-i18n], [data-i18n-placeholder] and [data-i18n-title] from _locales. */
  function localize(root) {
    root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = BR.t(el.dataset.i18n); });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = BR.t(el.dataset.i18nPlaceholder);
    });
    root.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = BR.t(el.dataset.i18nTitle); });
    const lang = BR.t("@@ui_locale");
    if (lang && lang !== "@@ui_locale") document.documentElement.lang = lang.split("_")[0];
  }

  BR.dom = { h, localize };
})(globalThis.BR);
