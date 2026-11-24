/* Bazoš Rider — core/categories.js
 *
 * Bazoš's top-level sections. The id is the subdomain: a listing linked from
 * auto.bazos.sk is in "auto". Labels are translated: _locales → "cat_<id>".
 * A new Bazoš section works without being listed here; it just shows its id.
 */
(function (BR) {
  "use strict";

  const IDS = [
    "auto", "deti", "dom", "elektro", "foto", "hudba", "knihy", "mobil", "motocykle",
    "nabytok", "oblecenie", "pc", "praca", "reality", "sluzby", "sport", "stroje",
    "vstupenky", "zvierata", "ostatne"
  ];

  function label(id) {
    if (!id) return BR.t("cat_other");
    const text = BR.t("cat_" + id);
    return text === "cat_" + id ? id : text;
  }

  /** [{ id, label }] sorted by label in the UI language. */
  function all() {
    return IDS.map((id) => ({ id, label: label(id) }))
      .sort((a, b) => a.label.localeCompare(b.label, BR.lang));
  }

  BR.categories = { IDS, label, all };
})(globalThis.BR);
