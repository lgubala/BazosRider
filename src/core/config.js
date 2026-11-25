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

    AUTO: { enabled: true, minComparables: 2, minShare: 0.05, mode: "loose" },

    SIMILARITY: 0.6,        // Dice score a title needs to join a group
    MIN_SHARED: 2,          // and at least this many shared words
    MODEL_TOKEN_MIN: 3,     // "i30", "5340": a word with a digit, at least this long
    CORE_SHARE: 0.75,       // a group's label is the words in 75 % of its members

    /* "loose" mode only: titles without a shared model number join when
     * their words overlap at least this much. Higher than SIMILARITY because
     * nothing else vouches for them. */
    LOOSE_SIMILARITY: 0.75,
    LOOSE_MIN_SHARED: 2,

    /* Units joined to the number before them, "128 GB" → "128gb", so the two
     * spellings are one word. Compared after diacritics are stripped. */
    UNITS: ["gb", "tb", "mb", "mah", "ah", "w", "kw", "hp", "ps", "l", "ml", "cm", "mm",
            "m", "kg", "g", "eu", "v", "hz", "mpx", "mp", "palcov", "inch"],

    /* Endings cut off longer words before comparing, so "kočík", "kočíka" and
     * "kočíky" match. The longest that fits is cut, and at least four letters
     * stay. */
    WORD_ENDINGS: ["ami", "ach", "ov", "om", "ej", "ou", "ia", "ie", "iu",
                   "a", "e", "i", "o", "u", "y"],

    /* A title with one of these never groups with one without it: an "iPhone
     * 13 Pro" is not an "iPhone 13" at a discount. */
    VARIANT_WORDS: ["pro", "max", "mini", "plus", "ultra", "lite", "fe", "xl"],

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

    DETAILS_LIMIT: 8,

    /* --- location ("v okolí") ------------------------------------------ */

    HOME: { psc: "", radiusKm: 25 },

    /* --- background reading (background/reader.js) ---------------------
     * Off until the user switches it on. Reads only section pages
     * ("mobil.bazos.sk/", "/40/", ...), which Bazoš's robots.txt allows,
     * never search URLs. Slow on purpose: one page every READER_DELAY_MS. */
    READER: { enabled: false, pages: 3, everyMinutes: 180 },
    READER_MAX_PAGES: 10,
    READER_MIN_MINUTES: 60,
    READER_DELAY_MS: 2000,
    READER_CHUNK: 8,          // pages per one-minute tick, see background/reader.js
    READER_PAUSE_HOURS: 24,   // after Bazoš answers with an error

    /* robots.txt (checked November 2026) disallows these in any URL. Neither
     * the background reader nor the scan button reads a page that has one. */
    DISALLOWED_URL_PARTS: ["search.php", "hledat=", "hlokalita=", "humkreis", "order=", "cenaod=",
                           "cenado=", "rubriky=", "type=", "category="],

    /* --- watchdogs ("Strážcovia") ------------------------------------- */

    WATCH_LIMIT: 5,           // listings shown per watchdog, near and nationwide

    /* A listing's own page calls a price within this much of the median
     * "about the usual price" instead of cheaper or dearer. */
    FAIR_BAND: 0.05,       // comparables shown when a deal badge is clicked

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
      /* h2 on results pages, span in a listing page's "Podobné inzeráty". */
      title: ".nadpis",
      description: "div.popis",
      price: "div.inzeratycena",
      pagination: ".strankovani a",
      resultsAnchor: ".listainzerat",
      location: ".inzeratylok",

      /* A single listing's own page (/inzerat/<id>/...). Checked against
       * mobil.bazos.sk in November 2026. */
      detailTitle: "h1.nadpisdetail",
      detailHeader: ".inzeratydetnadpis",
      detailDescription: "div.popisdetail",
      detailInfo: "td.listadvlevo td",
      canonical: 'link[rel="canonical"]'
    },
    DETAIL_PRICE_LABEL: "Cena:",
    DETAIL_LOCATION_LABEL: "Lokalita:",
    DETAIL_DESCRIPTION_MAX: 400,   // characters kept in history, like a results snippet
    NEXT_PAGE_TEXT: "Ďalšia",
    FREE_WORDS: ["zadarmo"]
  };
})(globalThis.BR);
