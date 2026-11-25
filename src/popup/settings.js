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

    /* --- watchdogs ------------------------------------------------------- */

    function watchRow(w) {
      const category = h("select", { class: "w-category" },
        h("option", { value: "" }, BR.t("options_watch_any")),
        BR.categories.all().map((c) => h("option", { value: c.id, selected: w.category === c.id }, c.label)));
      const row = h("div", { class: "watch" },
        h("input", { class: "w-query", type: "text", value: w.query || "",
                     placeholder: BR.t("options_watch_placeholder") }),
        category,
        h("input", { class: "w-max", type: "number", min: "1", value: w.maxPrice || "",
                     placeholder: BR.t("options_watch_max") }),
        h("button", { type: "button", class: "small", title: BR.t("options_watch_remove"),
                      onclick: () => row.remove() }, "✕"));
      row.dataset.id = w.id || "";
      return row;
    }

    function renderWatches() {
      const box = $("watches");
      box.textContent = "";
      for (const w of data.settings.watches) box.append(watchRow(w));
    }

    $("watch-add").addEventListener("click", () => {
      const row = watchRow({});
      $("watches").append(row);
      row.querySelector("input").focus();
    });

    function readWatches(settings) {
      settings.watches = [...document.querySelectorAll("#watches .watch")].map((row) => BR.settings.watch({
        id: row.dataset.id,
        query: row.querySelector(".w-query").value,
        category: row.querySelector(".w-category").value,
        maxPrice: row.querySelector(".w-max").value
      })).filter(Boolean);
    }

    /* --- location and background reading ------------------------------------ */

    function checkHome() {
      const psc = $("home-psc").value.replace(/\s/g, "");
      $("home-check").textContent = !psc ? "" : BR.geo.known(psc) ? "✓" : BR.t("options_home_unknown");
    }
    $("home-psc").addEventListener("input", checkHome);

    function renderReading() {
      const s = data.settings;
      $("home-psc").value = s.home.psc;
      $("home-radius").value = s.home.radiusKm;
      checkHome();
      $("reader-enabled").checked = s.reader.enabled;
      $("reader-pages").value = s.reader.pages;
      $("reader-every").value = String(s.reader.everyMinutes);
      const ids = BR.settings.readerSections(s);
      $("reader-sections").textContent = BR.t("options_reader_sections", {
        sections: ids.map(BR.categories.label).join(", "),
        n: ids.length * s.reader.pages
      });
    }

    /* Host access is asked for on the click that switches reading on: the
     * only moment Firefox lets an add-on ask. Saying no leaves it off. */
    $("reader-enabled").addEventListener("change", () => {
      const box = $("reader-enabled");
      if (!box.checked) return;
      BR.hostAccess().then((ok) => { if (!ok) box.checked = false; }, () => { box.checked = false; });
    });

    function readReading(settings) {
      const C = BR.config;
      const psc = $("home-psc").value.replace(/\s/g, "");
      settings.home = {
        psc: /^\d{5}$/.test(psc) ? psc : "",
        radiusKm: clamp(Number($("home-radius").value), 1, 300, C.HOME.radiusKm)
      };
      settings.reader = {
        enabled: $("reader-enabled").checked,
        pages: clamp(Number($("reader-pages").value), 1, C.READER_MAX_PAGES, C.READER.pages),
        everyMinutes: Number($("reader-every").value) || C.READER.everyMinutes
      };
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
      readWatches(settings);
      readReading(settings);
      const clean = BR.settings.normalize(settings);
      await BR.store.saveSettings(clean);
      data.settings = clean;
      renderComparison();
      renderWatches();
      renderReading();
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
        renderWatches();
        renderReading();
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
    renderWatches();
    renderReading();
    renderHistory();
  }

  BR.settingsView = { mount };
})(globalThis.BR);
