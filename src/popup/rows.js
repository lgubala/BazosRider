/* Bazoš Rider — popup/rows.js
 * How one list row and one set of category tabs look. Shared by every list. */
(function (BR) {
  "use strict";

  const { h } = BR.dom;

  function pill(row, rank) {
    if (row.free) return h("div", { class: "pill free" }, BR.t("badge_free"));
    /* A price above its group's median has a negative share: no pill for
     * that, it is not a discount. Fall back to the rank. */
    if (row.share != null && row.share > 0) {
      const size = row.share >= 0.5 ? "big" : row.share >= 0.25 ? "mid" : "small";
      return h("div", { class: "pill " + size }, `−${BR.text.percent(row.share)} %`);
    }
    return rank ? h("div", { class: "pill rank" }, "#" + rank) : null;
  }

  /** "Čadca · 48 km", or whichever of the two is known. */
  function where(r) {
    const parts = [];
    if (r.place) parts.push(r.place);
    if (r.km != null) {
      /* The same postal code is 0 km apart, which reads oddly: "do 1 km". */
      parts.push(r.km < 1 ? BR.t("meta_km_close")
        : BR.t("meta_km", { km: r.km < 10 ? r.km.toFixed(1) : Math.round(r.km) }));
    }
    return parts.length ? parts.join(" · ") : null;
  }

  /**
   * One line each: price and discount, then the title, then where and the
   * comparison. Long titles are cut; the full text is the tooltip.
   */
  function row(r, metaParts, rank) {
    const place = where(r);
    const meta = [place, ...metaParts].filter(Boolean).join(" · ");
    return h("div", { class: "row" },
      h("div", { class: "price" }, BR.text.money(r.price)),
      h("div", { class: "pillbox" }, pill(r, rank)),
      h("div", { class: "right" },
        h("a", { href: r.url, target: "_blank", rel: "noopener", title: r.title }, r.title),
        h("div", { class: "meta", title: meta }, meta)));
  }

  /**
   * A category picker over groups [{ category, items }]: a dropdown, so a
   * list with 20 categories does not start with a wall of buttons. "Všetky"
   * shows every category under its own heading. `state` remembers the pick.
   */
  function tabbed(box, def, groups, ctx, state, rerender) {
    groups.sort((a, b) =>
      BR.categories.label(a.category).localeCompare(BR.categories.label(b.category), BR.lang));
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    const tabs = [{ key: "all", label: BR.t("tab_all"), count: total }].concat(
      groups.map((g) => ({ key: g.category, label: BR.categories.label(g.category), count: g.items.length })));
    const picked = tabs.some((t) => t.key === state[def.id]) ? state[def.id] : "all";

    const select = h("select", {
      class: "pick",
      onchange: () => { state[def.id] = select.value; rerender(); }
    }, tabs.map((t) => h("option", { value: t.key }, `${t.label} (${t.count})`)));
    select.value = picked;
    box.append(select);

    for (const g of groups) {
      if (picked !== "all" && g.category !== picked) continue;
      if (picked === "all") box.append(h("div", { class: "cathead" }, BR.categories.label(g.category)));
      g.items.forEach((r, i) => box.append(row(r, def.meta(r, ctx), def.rank ? i + 1 : 0)));
    }
  }

  /**
   * Rows under headings: each row has a `section` (and the first row of a
   * section may carry a `summary` line). A row with `empty` is a
   * placeholder: the section has nothing, and that is the text to show.
   */
  function sections(box, def, rows, ctx) {
    let current = null;
    for (const r of rows) {
      if (r.section !== current) {
        current = r.section;
        box.append(h("div", { class: "cathead" }, r.section,
          r.summary ? h("small", {}, " " + r.summary) : null));
      }
      if (r.empty) box.append(h("div", { class: "empty small" }, r.empty));
      else box.append(row(r, def.meta(r, ctx), 0));
    }
  }

  BR.rows = { row, tabbed, sections };
})(globalThis.BR);
