/* Bazoš Rider — options/options.js
 *
 * Filters (one block per module in src/filters/), automatic comparison,
 * manual products, and the price history. Nothing is stored until "Uložiť".
 */
(async function (BR) {
  "use strict";

  const { h } = BR.dom;
  const { clamp, lines } = BR.text;
  const api = globalThis.browser || globalThis.chrome;
  const $ = (id) => document.getElementById(id);

  BR.dom.localize(document);
  $("version").textContent = "v" + api.runtime.getManifest().version;

  let { settings, history } = await BR.store.load();

  /* --- filters ----------------------------------------------------------- */

  const filterBoxes = new Map();

  function renderFilters() {
    const root = $("filters");
    root.textContent = "";
    for (const f of BR.filters.all()) {
      const saved = settings.filters[f.id];
      const body = h("div", { class: "body" });
      const block = h("div", { class: "filter" + (saved.enabled ? "" : " off") });
      const toggle = h("input", {
        type: "checkbox",
        checked: saved.enabled,
        onchange: () => block.classList.toggle("off", !toggle.checked)
      });
      block.append(
        h("label", {}, toggle, BR.t(f.title || f.id)),
        f.hint ? h("p", { class: "hint" }, BR.t(f.hint)) : null,
        body);
      if (f.editor) f.editor.render(body, saved.config || {}, h);
      root.append(block);
      filterBoxes.set(f.id, { toggle, body });
    }
  }

  function readFilters() {
    for (const f of BR.filters.all()) {
      const { toggle, body } = filterBoxes.get(f.id);
      const saved = settings.filters[f.id];
      saved.enabled = toggle.checked;
      if (f.editor) saved.config = f.editor.read(body, saved.config);
    }
  }

  /* --- comparison -------------------------------------------------------- */

  function renderComparison() {
    $("auto-enabled").checked = settings.auto.enabled;
    $("auto-share").value = Math.round(settings.auto.minShare * 100);
    $("auto-min").value = settings.auto.minComparables;
    $("products").value = settings.products.join("\n");
    $("threshold").value = Math.round(settings.dealThreshold * 100);
  }

  function readComparison() {
    const C = BR.config;
    settings.auto = {
      enabled: $("auto-enabled").checked,
      minShare: clamp(Number($("auto-share").value), 1, 90, C.AUTO.minShare * 100) / 100,
      minComparables: clamp(Number($("auto-min").value), 2, 20, C.AUTO.minComparables)
    };
    settings.products = lines($("products").value);
    settings.dealThreshold = clamp(Number($("threshold").value), 1, 90, C.DEAL_THRESHOLD * 100) / 100;
  }

  /* --- history ----------------------------------------------------------- */

  function renderHistory() {
    const n = Object.keys(history).length;
    $("history-count").textContent = BR.t("options_history_count", { n: n.toLocaleString(BR.lang) });
  }

  /* --- actions ----------------------------------------------------------- */

  $("save").addEventListener("click", async () => {
    /* The popup may have cleared a list since this page opened: start from
     * what is stored and apply only what this page owns. */
    const fresh = await BR.store.loadSettings();
    settings = { ...fresh, filters: settings.filters };
    readFilters();
    readComparison();
    await BR.store.saveSettings(settings);
    renderComparison();
    flash(BR.t("options_saved"));
  });

  $("reset-history").addEventListener("click", async () => {
    if (!confirm(BR.t("options_history_confirm"))) return;
    history = {};
    await BR.store.saveHistory(history);
    renderHistory();
    flash(BR.t("options_history_done"));
  });

  let flashTimer = 0;
  function flash(text) {
    $("status").textContent = text;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { $("status").textContent = ""; }, 4000);
  }

  renderFilters();
  renderComparison();
  renderHistory();
})(globalThis.BR);
