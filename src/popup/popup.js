/* Bazoš Rider — popup/popup.js
 *
 * Two views in one popup: the lists (one card per module in src/lists/, in
 * `order`) and the settings (popup/settings.js). The header button switches
 * between them.
 *
 * Above the lists: the V okolí / Celé Slovensko switch in the header, and a
 * line about background reading with a button to run it now. While reading
 * runs, the lists redraw as new listings arrive.
 */
(async function (BR) {
  "use strict";

  const { h } = BR.dom;
  const C = BR.config;
  const $ = (id) => document.getElementById(id);
  const tabState = {};
  const api = globalThis.browser || globalThis.chrome;
  /* The host access background reading needs. Asked for on the click that
   * first needs it, which is when Firefox allows asking. */
  const HOSTS = { origins: ["*://bazos.sk/*", "*://*.bazos.sk/*"] };
  BR.hostAccess = () => api.permissions.request(HOSTS);

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
    renderScope();
    renderReader();
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
    if (def.layout === "sections") {
      BR.rows.sections(box, def, rows, ctx);
    } else if (def.layout === "categories") {
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

  /* --- V okolí / Celé Slovensko --------------------------------------------- */

  function renderScope() {
    const home = data.settings.home;
    const known = BR.geo.known(home.psc);
    const scope = known ? data.settings.scope : "all";
    for (const b of document.querySelectorAll("#scope .tab")) {
      b.classList.toggle("on", b.dataset.scope === scope);
      if (b.dataset.scope !== "near") continue;
      b.textContent = BR.t("scope_near", { km: home.radiusKm });
      b.disabled = !known;
      b.title = known ? "" : BR.t("scope_near_off");
    }
  }

  for (const b of document.querySelectorAll("#scope .tab")) {
    b.addEventListener("click", async () => {
      const saved = await BR.store.updateSettings((s) => { s.scope = b.dataset.scope; });
      data.settings.scope = saved.scope;
      renderAll();
    });
  }

  /* --- background reading ---------------------------------------------------- */

  function when(iso) {
    const d = new Date(iso);
    const time = d.toLocaleTimeString(BR.lang, { hour: "2-digit", minute: "2-digit" });
    return BR.text.localDay(d) === BR.text.localDay(new Date())
      ? time : BR.text.shortDate(BR.text.localDay(d)) + " " + time;
  }

  function button(key, onclick) {
    return h("button", { type: "button", class: "small", onclick }, BR.t(key));
  }

  function runNow() {
    /* Asking for host access must be the first thing the click does. */
    BR.hostAccess().then((ok) => {
      if (ok) api.runtime.sendMessage({ type: "br-reader-now" }).then(renderReader, () => {});
    }, () => {});
  }

  async function renderReader() {
    const line = $("reader-line");
    const st = (await api.storage.local.get("reader")).reader || {};
    const r = data.settings.reader;
    line.textContent = "";
    if (st.queue && st.run) {
      line.append(BR.t("reader_running", {
        done: st.run.pages, total: st.run.total, n: st.run.listings.toLocaleString(BR.lang)
      }), button("reader_stop", () => api.runtime.sendMessage({ type: "br-reader-stop" })));
      return;
    }
    const parts = [];
    if (st.lastRun) {
      const res = st.lastResult || {};
      parts.push(BR.t("reader_last", {
        when: when(st.lastRun), pages: res.pages || 0, fresh: (res.fresh || 0).toLocaleString(BR.lang)
      }));
    }
    line.append(r.enabled ? BR.t("reader_on", { every: r.everyMinutes / 60 }) : BR.t("reader_off"));
    if (parts.length) line.append(" · " + parts.join(" · "));
    if (st.lastResult && st.lastResult.error) {
      line.append(h("span", { class: "bad" }, BR.t("reader_error", { error: st.lastResult.error })));
    }
    if (st.pausedUntil && Date.now() < Date.parse(st.pausedUntil)) {
      line.append(h("span", { class: "bad" }, BR.t("reader_paused", { until: when(st.pausedUntil) })));
      return;
    }
    line.append(button("reader_now", runNow));
  }

  /* New listings from background reading (or another tab) redraw the lists. */
  let redraw = 0;
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.reader) renderReader();
    if (changes.history) {
      data.history = changes.history.newValue || {};
      clearTimeout(redraw);
      redraw = setTimeout(renderAll, 400);
    }
  });

  /* --- start --------------------------------------------------------------- */

  BR.settingsView.mount(data, renderAll);
  renderAll();
  /* #settings opens the settings view; #import is the same page in a tab,
   * where a file picker works (popup/settings.js). */
  const hash = location.hash;
  show(hash === "#settings" || hash === "#import" ? "settings" : "lists");
  if (hash === "#import") $("import").closest(".card").scrollIntoView();
})(globalThis.BR);
