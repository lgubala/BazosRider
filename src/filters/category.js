/* Hide whole Bazoš sections: cars, jobs, real estate, ... */
BR.filters.add({
  id: "category",
  order: 10,
  title: "filter_category_title",     // _locales key
  hint: "filter_category_hint",

  defaults: () => ({ categories: [] }),

  matches(listing, config) {
    return !!listing.category && (config.categories || []).includes(listing.category);
  },

  /* The options page calls render() to draw the editor and read() on save.
   * `h` is BR.dom.h: h(tag, attributes, ...children). */
  editor: {
    render(box, config, h) {
      const selected = new Set(config.categories || []);
      const grid = h("div", { class: "checks" });
      for (const cat of BR.categories.all()) {
        grid.append(h("label", {},
          h("input", { type: "checkbox", value: cat.id, checked: selected.has(cat.id) }),
          " " + cat.label));
      }
      box.append(grid);
    },
    read(box) {
      return {
        categories: [...box.querySelectorAll("input[type=checkbox]:checked")].map((cb) => cb.value)
      };
    }
  }
});
