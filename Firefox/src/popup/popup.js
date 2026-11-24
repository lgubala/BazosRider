/* Bazoš Rider — popup/popup.js
 *
 * Two views in one popup: the lists (one card per module in src/lists/, in
 * `order`) and the settings (popup/settings.js). The header button switches
 * between them.
 */
(async function (BR) {
  "use strict";

  const { h } = BR.dom;
  const C = BR.config;
  const $ = (id) => document.getElementById(id);
  const tabState = {};

  BR.dom.localize(document);

  const data = await BR.store.load();

  /* --- views --------------------------------------------------------------- */

  let view = "lists";
  function show(next) {
    view = next;
    $("view-lists").hidden = view !== "lists";
    $("view-settings").hidden = view !== "settings";
    $("toggle-view").textContent = BR.t(view === "lists" ? "popup_settings" : "popup_back");
    window.scrollTo(0, 0);
  }
  $("toggle-view").addEventListener("click", () => show(view === "lists" ? "settings" : "lists"));

  /* --- lists --------------------------------------------------------------- */

  /* Tall lists go in the left column, the rest stack on the right. */
  const columns = { tall: $("col-tall"), rest: $("col-rest") };
  const cards = new Map();

  for (const def of BR.lists.all()) {
    const body = h("div", { class: "body" });
    const card = h("section", { class: "card" + (def.tall ? " tall" : "") },
      h("div", { class: "head" },
        h("h2", {}, BR.t(def.title), def.hint ? h("small", {}, " " + BR.t(def.hint)) : null),
        def.clearable
          ? h("button", { type: "button", class: "small", onclick: () => clear(def) }, BR.t("popup_clear"))
          : null),
      body);
    (def.tall ? columns.tall : columns.rest).append(card);
    cards.set(def.id, body);
  }

  function context() {
    return BR.context(data.history, data.settings, new Date());
  }

  function renderAll() {
    const n = Object.keys(data.history).length;
    $("count").textContent = BR.t("popup_history_count", { n: n.toLocaleString(BR.lang) });
    const ctx = context();
    for (const def of BR.lists.all()) render(def, ctx);
  }

  function render(def, ctx) {
    const box = cards.get(def.id);
    box.textContent = "";
    if (def.needsGroups && !ctx.settings.auto.enabled) {
      box.append(h("div", { class: "empty" }, BR.t("list_auto_off")));
      return;
    }
    let rows;
    try {
      rows = BR.lists.itemsOf(def, ctx);
    } catch (e) {
      console.error(`[bazos-rider] list "${def.id}" failed`, e);
      rows = [];
    }
    if (!rows.length) {
      /* `empty` is a _locales key, or a function returning finished text. */
      const text = typeof def.empty === "function" ? def.empty(ctx) : BR.t(def.empty || "list_empty");
      box.append(h("div", { class: "empty" }, text));
      return;
    }
    const limit = def.limit || C.LIST_LIMIT;
    if (def.layout === "categories") {
      BR.rows.tabbed(box, def, BR.lists.topPerCategory(rows, limit), ctx, tabState, () => render(def, context()));
    } else {
      for (const r of rows.slice(0, limit)) box.append(BR.rows.row(r, def.meta(r, ctx), 0));
    }
  }

  /** Hides what the list shows now. History is kept, so comparisons still work. */
  async function clear(def) {
    const at = new Date().toISOString();
    const saved = await BR.store.updateSettings((s) => { s.clearedAt[def.id] = at; });
    data.settings.clearedAt = saved.clearedAt;
    render(def, context());
  }

  /* --- start --------------------------------------------------------------- */

  BR.settingsView.mount(data, renderAll);
  renderAll();
  show(location.hash === "#settings" ? "settings" : "lists");
})(globalThis.BR);
