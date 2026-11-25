/* Bazoš Rider — popup/popup.js
 *
 * Two views in one popup: the lists (one card per module in src/lists/, in
 * `order`) and the settings (popup/settings.js). The header button switches
 * between them.
 *
 * The same page opened in a tab with #dashboard is the dashboard: the whole
 * window, cards side by side, and a few numbers in the header.
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

  const full = location.hash === "#dashboard";
  document.body.classList.toggle("full", full);
  $("open-full").hidden = full;
  $("open-full").addEventListener("click", () => {
    const url = new URL("popup.html#dashboard", location.href).href;
    Promise.resolve(api.tabs.create({ url })).then(() => window.close(), () => window.open(url));
  });

  const data = await BR.store.load();

  /* --- views --------------------------------------------------------------- */

  let view = "lists";
  function show(next) {
    view = next;
    $("view-lists").hidden = view !== "lists";
    $("view-settings").hidden = view !== "settings";
    $("toggle-view").textContent = BR.t(view === "lists" ? "popup_settings" : "popup_back");
    /* The dashboard fits the window only while it shows the lists. */
    document.body.classList.toggle("fit", full && view === "lists");
    window.scrollTo(0, 0);
  }
  $("toggle-view").addEventListener("click", () => show(view === "lists" ? "settings" : "lists"));

  /* --- lists --------------------------------------------------------------- */

  /*
   * Lists sit in cards; a card with several lists has a tab per list, with
   * how many rows each has. In the popup everything is one card, so one list
   * fills the window and the tabs say what the others hold. On the dashboard
   * a list's `card` puts it with others (Deal dňa + Deal roka, Moje produkty
   * + Zadarmo) and the cards stand side by side, the height of the window.
   */
  const cardList = [];
  for (const def of BR.lists.all()) {
    const key = full ? def.card || def.id : "all";
    let card = cardList.find((c) => c.key === key);
    if (!card) {
      card = { key, defs: [], active: null, el: h("section", { class: "card list" }) };
      cardList.push(card);
      $("cards").append(card.el);
    }
    card.defs.push(def);
  }
  const remembered = JSON.parse(localStorage.getItem("br-tabs") || "{}");
  for (const c of cardList) {
    c.picked = c.defs.some((d) => d.id === remembered[c.key]);
    c.active = c.picked ? remembered[c.key] : c.defs[0].id;
  }
  $("cards").dataset.cards = cardList.length;

  let lastCtx = null;
  const listRows = {};

  function context() {
    return BR.context(data.history, data.settings, new Date());
  }

  function renderAll() {
    const n = Object.keys(data.history).length;
    $("count").textContent = BR.t("popup_history_count", { n: n.toLocaleString(BR.lang) });
    renderScope();
    renderReader();
    const ctx = lastCtx = context();
    for (const def of BR.lists.all()) listRows[def.id] = rowsOf(def, ctx);
    for (const c of cardList) renderCard(c, ctx);
    if (full) renderStats(ctx);
  }

  /** The dashboard's few numbers, in the header. */
  function renderStats(ctx) {
    let today = 0;
    for (const e of Object.values(ctx.history)) if (e.firstSeen === ctx.today) today++;
    const count = (id) => (listRows[id] || []).filter((r) => !r.empty).length;
    const stat = (n, key) => h("span", { class: "stat" },
      h("b", {}, n.toLocaleString(BR.lang)), " " + BR.t(key));
    $("stats").replaceChildren(
      stat(count("day"), "stat_day"),
      stat(count("watches"), "stat_watches"),
      stat(today, "stat_new_today"));
  }

  function rowsOf(def, ctx) {
    if (def.needsGroups && !ctx.settings.auto.enabled) return [];
    try {
      return BR.lists.itemsOf(def, ctx);
    } catch (e) {
      console.error(`[bazos-rider] list "${def.id}" failed`, e);
      return [];
    }
  }

  function renderCard(card, ctx) {
    const has = (d) => (listRows[d.id] || []).some((r) => !r.empty);
    /* Until you pick a tab, an empty list gives way to one with rows. */
    if (!card.picked && !card.defs.some((d) => d.id === card.active && has(d))) {
      card.active = (card.defs.find(has) || card.defs[0]).id;
    }
    const def = card.defs.find((d) => d.id === card.active) || card.defs[0];
    const old = card.el.querySelector(".body");
    /* Background reading redraws every few seconds: keep the scroll. */
    const scroll = old && old.dataset.list === def.id ? old.scrollTop : 0;
    const body = h("div", { class: "body", "data-list": def.id });

    const count = (d) => (listRows[d.id] || []).filter((r) => !r.empty).length;
    const title = card.defs.length > 1
      ? h("div", { class: "tabs cardtabs" }, card.defs.map((d) =>
          h("button", {
            type: "button",
            class: "tab" + (d === def ? " on" : ""),
            onclick: () => {
              card.active = d.id;
              card.picked = true;
              remembered[card.key] = d.id;
              localStorage.setItem("br-tabs", JSON.stringify(remembered));
              renderCard(card, lastCtx);
            }
          }, BR.t(d.tab || d.title), h("span", { class: "n" }, String(count(d))))))
      : h("h2", {}, BR.t(def.title));
    card.el.replaceChildren(...[
      h("div", { class: "head" }, title,
        def.clearable
          ? h("button", { type: "button", class: "small", onclick: () => clear(def) }, BR.t("popup_clear"))
          : null),
      def.hint ? h("div", { class: "hint sub" }, BR.t(def.hint)) : null,
      body].filter(Boolean));
    fill(body, def, ctx);
    body.scrollTop = scroll;
  }

  function fill(box, def, ctx) {
    if (def.needsGroups && !ctx.settings.auto.enabled) {
      box.append(h("div", { class: "empty" }, BR.t("list_auto_off")));
      return;
    }
    const rows = listRows[def.id] || [];
    if (!rows.length) {
      /* `empty` is a _locales key, or a function returning finished text. */
      const text = typeof def.empty === "function" ? def.empty(ctx) : BR.t(def.empty || "list_empty");
      box.append(h("div", { class: "empty" }, text));
      return;
    }
    /* One list at a time, compact rows: room for twice the usual. */
    const limit = (def.limit || C.LIST_LIMIT) * 2;
    if (def.layout === "sections") {
      BR.rows.sections(box, def, rows, ctx);
    } else if (def.layout === "categories") {
      BR.rows.tabbed(box, def, BR.lists.topPerCategory(rows, limit), ctx, tabState,
        () => renderCard(cardList.find((c) => c.defs.includes(def)), lastCtx));
    } else {
      for (const r of rows.slice(0, limit)) box.append(BR.rows.row(r, def.meta(r, ctx), 0));
    }
  }

  /** Hides what the list shows now. History is kept, so comparisons still work. */
  async function clear(def) {
    const at = new Date().toISOString();
    const saved = await BR.store.updateSettings((s) => { s.clearedAt[def.id] = at; });
    data.settings.clearedAt = saved.clearedAt;
    renderAll();
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
