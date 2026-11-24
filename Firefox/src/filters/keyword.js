/* Hide listings whose title or description contains a word or phrase.
 * Case and diacritics are ignored: "na diely" also hides "NA DIELY". */
BR.filters.add({
  id: "keyword",
  order: 20,
  title: "filter_keyword_title",
  hint: "filter_keyword_hint",

  defaults: () => ({ words: [] }),

  matches(listing, config) {
    const words = (config.words || []).map(BR.text.normalize).filter(Boolean);
    if (!words.length) return false;
    const haystack = BR.text.normalize(listing.title + " " + (listing.description || ""));
    return words.some((w) => haystack.includes(w));
  },

  editor: {
    render(box, config, h) {
      box.append(h("textarea", {
        rows: 5,
        placeholder: BR.t("filter_keyword_placeholder"),
        value: (config.words || []).join("\n")
      }));
    },
    read(box) {
      return { words: BR.text.lines(box.querySelector("textarea").value) };
    }
  }
});
