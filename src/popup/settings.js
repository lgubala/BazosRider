/* Bazoš Rider — popup/settings.js
 *
 * The popup's settings view: filters (one block per module in src/filters/),
 * automatic comparison, manual products, the price history and backups.
 * Nothing is stored until "Uložiť", except a history reset and an import.
 *
 *   BR.settingsView.mount(data, onChange)
 *     data      { settings, history }, shared with the lists view
 *     onChange  called after a save or a history reset, so the lists redraw
 */
(function (BR) {
  "use strict";

  const { h } = BR.dom;
  const { clamp, lines } = BR.text;
  const $ = (id) => document.getElementById(id);

  function mount(data, onChange) {
    const api = globalThis.browser || globalThis.chrome;
    $("version").textContent = "v" + api.runtime.getManifest().version;

    /* --- filters --------------------------------------------------------- */

    const filterBoxes = new Map();

    function renderFilters() {
      const root = $("filters");
      root.textContent = "";
      for (const f of BR.filters.all()) {
        const saved = data.settings.filters[f.id];
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

    function readFilters(settings) {
      for (const f of BR.filters.all()) {
        const { toggle, body } = filterBoxes.get(f.id);
        const saved = settings.filters[f.id];
        saved.enabled = toggle.checked;
        if (f.editor) saved.config = f.editor.read(body, saved.config);
      }
    }

    /* --- comparison ------------------------------------------------------ */

    function renderComparison() {
      const s = data.settings;
      $("auto-enabled").checked = s.auto.enabled;
      for (const r of document.querySelectorAll("input[name=auto-mode]")) r.checked = r.value === s.auto.mode;
      $("auto-share").value = Math.round(s.auto.minShare * 100);
      $("auto-min").value = s.auto.minComparables;
      $("products").value = s.products.join("\n");
      $("threshold").value = Math.round(s.dealThreshold * 100);
      $("highlight").value = Math.round(s.highlightShare * 100);
    }

    function readComparison(settings) {
      const C = BR.config;
      settings.auto = {
        enabled: $("auto-enabled").checked,
        mode: document.querySelector("input[name=auto-mode]:checked")?.value || C.AUTO.mode,
        minShare: clamp(Number($("auto-share").value), 1, 90, C.AUTO.minShare * 100) / 100,
        minComparables: clamp(Number($("auto-min").value), 2, 20, C.AUTO.minComparables)
      };
      settings.products = lines($("products").value);
      settings.dealThreshold = clamp(Number($("threshold").value), 1, 90, C.DEAL_THRESHOLD * 100) / 100;
      /* Below SUSPICIOUS_SHARE, or nothing could ever be highlighted. */
      const maxHighlight = Math.round(C.SUSPICIOUS_SHARE * 100) - 1;
      settings.highlightShare =
        clamp(Number($("highlight").value), 1, maxHighlight, C.HIGHLIGHT_SHARE * 100) / 100;
    }

    /* --- history --------------------------------------------------------- */

    function renderHistory() {
      const n = Object.keys(data.history).length;
      $("history-count").textContent = BR.t("options_history_count", { n: n.toLocaleString(BR.lang) });
    }

    /* --- actions --------------------------------------------------------- */

    $("save").addEventListener("click", async () => {
      /* Start from what is stored (a clear button may have written since)
       * and apply only what this view owns. */
      const settings = await BR.store.loadSettings();
      settings.filters = data.settings.filters;
      readFilters(settings);
      readComparison(settings);
      await BR.store.saveSettings(settings);
      data.settings = settings;
      renderComparison();
      flash(BR.t("options_saved"));
      onChange();
    });

    /* Two clicks instead of confirm(): Firefox does not show dialogs from a
     * toolbar popup. The first click arms the button for five seconds. */
    let armed = 0;
    $("reset-history").addEventListener("click", async () => {
      const button = $("reset-history");
      if (!armed) {
        button.textContent = BR.t("options_history_confirm");
        armed = setTimeout(() => {
          armed = 0;
          button.textContent = BR.t("options_history_reset");
        }, 5000);
        return;
      }
      clearTimeout(armed);
      armed = 0;
      button.textContent = BR.t("options_history_reset");
      data.history = {};
      await BR.store.saveHistory(data.history);
      renderHistory();
      flash(BR.t("options_history_done"));
      onChange();
    });

    /* --- backup ---------------------------------------------------------- */

    const inTab = location.hash === "#import";
    const version = api.runtime.getManifest().version;

    $("export").addEventListener("click", async () => {
      const { settings, history } = await BR.store.load();
      const now = new Date();
      const json = JSON.stringify(BR.backup.make(settings, history, version, now));
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const a = h("a", { href: url, download: `bazos-rider-${BR.text.localDay(now)}.json` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      backupStatus(BR.t("backup_exported", { n: Object.keys(history).length.toLocaleString(BR.lang) }));
    });

    $("import").addEventListener("click", () => {
      if (inTab) { $("import-file").click(); return; }
      api.tabs.create({ url: api.runtime.getURL("src/popup/popup.html#import") });
      window.close();
    });

    $("import-file").addEventListener("change", async () => {
      const file = $("import-file").files[0];
      $("import-file").value = "";
      if (!file) return;
      try {
        const backup = BR.backup.read(await file.text());
        const { history } = await BR.store.load();
        const { added, updated } = BR.backup.merge(history, backup.history);
        const settings = BR.settings.normalize(backup.settings);
        await BR.store.saveSettings(settings);
        await BR.store.saveHistory(history);
        data.settings = settings;
        data.history = history;
        renderFilters();
        renderComparison();
        renderHistory();
        onChange();
        backupStatus(BR.t("backup_imported", { added, updated }));
      } catch (e) {
        backupStatus(BR.t("backup_failed", { error: e.message }), true);
      }
    });

    function backupStatus(text, bad) {
      const p = $("backup-status");
      p.textContent = text;
      p.classList.toggle("bad", !!bad);
    }

    let flashTimer = 0;
    function flash(text) {
      $("status").textContent = text;
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => { $("status").textContent = ""; }, 4000);
    }

    renderFilters();
    renderComparison();
    renderHistory();
  }

  BR.settingsView = { mount };
})(globalThis.BR);
