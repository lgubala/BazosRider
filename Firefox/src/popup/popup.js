/* Bazoš Rider — popup/popup.js
 *
 * Builds one card per list module (src/lists/), in `order`. Settings live on
 * the options page; the popup only reads them, except for the clear buttons.
 */
(async function (BR) {
  "use strict";

  const { h } = BR.dom;
  const C = BR.config;
  const tabState = {};

  BR.dom.localize(document);
  document.getElementById("open-options").addEventListener("click", () => {
    (globalThis.browser || globalThis.chrome).runtime.openOptionsPage();
    window.close();
  });

  const data = await BR.store.load();
  const count = Object.keys(data.history).length;
  document.getElementById("count").textContent = BR.t("popup_history_count", { n: count.toLocaleString(BR.lang) });

  /* Tall lists go in the left column, the rest stack on the right. A grid
   * with a row-spanning card left big gaps between the right-hand cards. */
  const columns = { tall: document.getElementById("col-tall"), rest: document.getElementById("col-rest") };
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

  renderAll();

  function context() {
    return BR.context(data.history, data.settings, new Date());
  }

  function renderAll() {
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
      const key = typeof def.empty === "function" ? def.empty(ctx) : def.empty;
      box.append(h("div", { class: "empty" }, BR.t(key || "list_empty")));
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
})(globalThis.BR);
