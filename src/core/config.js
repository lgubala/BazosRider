/* Bazoš Rider — core/config.js
 * ============================================================================
 * Every number and selector in one place. Ordinary tuning should not need any
 * other file. Values the user can change in the popup settings are only the
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

    /* --- manual products (popup settings → "Ručne zadané produkty") ------- */

    MIN_SAMPLE: 5,          // listings needed before a product median is trusted
    DEAL_THRESHOLD: 0.2,    // default: 20 % under the median

    /* --- automatic grouping of similar listings ------------------------- */

    AUTO: { enabled: true, minComparables: 2, minShare: 0.05, mode: "strict" },

    SIMILARITY: 0.6,        // Dice score a title needs to join a group
    MIN_SHARED: 2,          // and at least this many shared words
    MODEL_TOKEN_MIN: 3,     // "i30", "5340": a word with a digit, at least this long
    CORE_SHARE: 0.75,       // a group's label is the words in 75 % of its members

    /* "loose" mode only: titles without a shared model number join when
     * their words overlap at least this much. Higher than SIMILARITY because
     * nothing else vouches for them. */
    LOOSE_SIMILARITY: 0.75,
    LOOSE_MIN_SHARED: 2,

    /* Words that say nothing about which product it is. Written plain; they
     * are compared after diacritics are stripped. */
    STOP_WORDS: [
      "predam", "predaj", "ponukam", "ponuka", "na", "a", "v", "z", "s", "so", "ako",
      "nove", "novy", "nova", "zachovaly", "zachovala", "kupene", "kupeny", "top", "stav",
      "cena", "dohodou", "ihned", "pekny", "dobry", "skvely", "kus", "ks", "km", "kw",
      "bez", "pre", "od", "do", "aj", "je", "sa", "ale", "rok", "rv", "super", "vymenim",
      "mam", "moj", "moja", "the", "and", "of", "darujem", "zadarmo", "osobny", "odber"
    ],

    /* --- on the Bazoš page ---------------------------------------------- */

    /* Rows at least this far under their median get a green highlight and
     * count in the page's summary bar and on the toolbar icon. The user's
     * copy is settings.highlightShare (popup settings → "Na stránke"). */
    HIGHLIGHT_SHARE: 0.15,

    /* This far under the median or more is more often a different product,
     * a broken one or a scam than a bargain: an orange ⚠ badge instead, and
     * it never counts as a deal. */
    SUSPICIOUS_SHARE: 0.7,
    SUSPICIOUS_COLOR: "#bc4c00",

    DETAILS_LIMIT: 8,       // comparables shown when a deal badge is clicked

    /* "Prejsť ďalšie strany": how many result pages, and the pause between
     * two requests so Bazoš is not hammered. */
    SCAN_PAGES: 10,
    SCAN_DELAY_MS: 1500,
    SCAN_SHOWN: 8,          // deals from those pages listed in the bar

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
