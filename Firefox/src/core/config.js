/* Bazoš Rider — core/config.js
 * ============================================================================
 * Every number and selector in one place. Ordinary tuning should not need any
 * other file. Values the user can change on the options page are only the
 * defaults here; their saved copy lives in settings.
 * ============================================================================
 */
(function (BR) {
  "use strict";

  BR.config = {

    /* --- price history ------------------------------------------------- */

    HISTORY_DAYS: 370,      // a year and a bit, so "deal of the year" works
    HISTORY_CAP: 20000,     // entries; the least recently seen go first

    /* A drop is recorded only when the old price is at most this many times
     * the new one. Guards against a "↓ −490 953 €" badge seen once and never
     * reproduced. */
    DROP_GUARD: 10,

    /* --- manual products (options page → "Ručne zadané produkty") ------- */

    MIN_SAMPLE: 5,          // listings needed before a product median is trusted
    DEAL_THRESHOLD: 0.2,    // default: 20 % under the median

    /* --- automatic grouping of similar listings ------------------------- */

    AUTO: { enabled: true, minComparables: 2, minShare: 0.05 },

    SIMILARITY: 0.6,        // Dice score a title needs to join a group
    MIN_SHARED: 2,          // and at least this many shared words
    MODEL_TOKEN_MIN: 3,     // "i30", "5340": a word with a digit, at least this long
    CORE_SHARE: 0.75,       // a group's label is the words in 75 % of its members

    /* Words that say nothing about which product it is. Written plain; they
     * are compared after diacritics are stripped. */
    STOP_WORDS: [
      "predam", "predaj", "ponukam", "ponuka", "na", "a", "v", "z", "s", "so", "ako",
      "nove", "novy", "nova", "zachovaly", "zachovala", "kupene", "kupeny", "top", "stav",
      "cena", "dohodou", "ihned", "pekny", "dobry", "skvely", "kus", "ks", "km", "kw",
      "bez", "pre", "od", "do", "aj", "je", "sa", "ale", "rok", "rv", "super", "vymenim",
      "mam", "moj", "moja", "the", "and", "of", "darujem", "zadarmo", "osobny", "odber"
    ],

    /* --- popup ---------------------------------------------------------- */

    LIST_LIMIT: 5,          // rows per category, or per list for "top" lists

    /* --- Bazoš markup ---------------------------------------------------
     * If Bazoš changes its HTML, this is the only place to fix. */

    DOMAIN: "bazos.sk",
    SELECTORS: {
      listing: "div.inzeraty",
      link: 'a[href*="/inzerat/"]',
      title: "h2.nadpis",
      description: "div.popis",
      price: "div.inzeratycena",
      pagination: ".strankovani a",
      resultsAnchor: ".listainzerat"
    },
    NEXT_PAGE_TEXT: "Ďalšia",
    FREE_WORDS: ["zadarmo"]
  };
})(globalThis.BR);
