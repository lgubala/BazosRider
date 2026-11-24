/* Bazoš Rider — core/i18n.js
 *
 * All visible text comes from _locales/<lang>/messages.json. Slovak is the
 * default; English is used when the browser runs in English.
 *
 *   BR.t("bar_hidden", { hidden: 3, total: 20 })
 *   BR.tn("bar_deals", 3)      → bar_deals_few: "3 výhodné ponuky …"
 *
 * Substitutions are written {name} in messages.json, not Firefox's $1/$NAME$
 * placeholders: they read better, and a "$" in a message cannot break them.
 */
(function (BR) {
  "use strict";

  const api = globalThis.browser || globalThis.chrome || null;
  const i18n = api && api.i18n ? api.i18n : null;

  BR.t = function (key, subs) {
    let text = i18n ? i18n.getMessage(key) : "";
    if (!text) text = key;
    if (subs) text = text.replace(/\{(\w+)\}/g, (m, k) => (k in subs ? String(subs[k]) : m));
    return text;
  };

  /** Plural by count: key_one (1), key_few (2–4), key_many (0, 5+). Slovak
   * needs all three; English writes the same text in _few and _many. */
  BR.tn = function (key, n, subs) {
    const form = n === 1 ? "one" : n >= 2 && n <= 4 ? "few" : "many";
    return BR.t(key + "_" + form, { n, ...(subs || {}) });
  };

  /** The UI language, for number formatting. */
  BR.lang = (i18n && i18n.getUILanguage && i18n.getUILanguage()) || "sk";
})(globalThis.BR);
