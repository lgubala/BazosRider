/* Bazoš Rider — core/groups.js
 *
 * Automatic grouping: finds "the same product" without a manual list, so a
 * listing can be compared with the median of its group ("−30 % vs. 4
 * podobných").
 *
 * Groups are built per category, greedily, in first-seen order. A title
 * joins a group only when its words overlap strongly AND a model-like word
 * ("5340", "i30") matches. Brand and category words alone ("britax romer",
 * "autosedacka") cover many different products: grouping on them once put a
 * budget and a premium child seat together and produced a "−84 %" against the
 * wrong product. A missing comparison is better than a wrong one.
 *
 * That is the "strict" mode. "loose" mode (settings.auto.mode, the default
 * since 1.4.0) also groups titles without a model number when their words
 * overlap even more ("Šaty na stužkovú" + "Šaty na stužkovú červené").
 *
 * In both modes, two titles whose numbers disagree never group: "iPhone 13
 * 128GB" and "iPhone 15 128GB" share "128gb" but are different phones.
 */
(function (BR) {
  "use strict";

  const C = BR.config;
  const { normalize, median } = BR.text;
  const STOP = new Set(C.STOP_WORDS.map(normalize));
  const VARIANTS = new Set(C.VARIANT_WORDS);
  const UNIT = new RegExp("(\\d)\\s+(" + C.UNITS.join("|") + ")\\b", "g");
  const ENDINGS = [...C.WORD_ENDINGS].sort((a, b) => b.length - a.length);

  /** Normalised words, with "128 GB" → "128gb" and "1,5 l" → "1p5l", so a
   * number and its unit are one word however they are written. */
  function words(title) {
    return normalize(title)
      .replace(/(\d)[.,](\d)/g, "$1p$2")
      .replace(UNIT, "$1$2")
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  }

  /** "kocika", "kociky" → "kocik": Slovak endings off, so the forms of one
   * word match. Words with digits and short words are left alone. */
  function stem(w) {
    if (/\d/.test(w) || w.length < 5) return w;
    for (const end of ENDINGS) {
      if (w.endsWith(end) && w.length - end.length >= 4) return w.slice(0, -end.length);
    }
    return w;
  }

  /**
   * Distinct meaningful words of a title. A short number is joined to the
   * word before it, "iPhone 13" → "iphone13", "Golf 7" → "golf7": on its own
   * "13" says nothing, and joined it is the model, written the same as
   * "iPhone13". `shown`, when given, collects a readable form of each token
   * for group labels.
   */
  function tokensOf(title, shown) {
    const out = new Set();
    let prev = null;
    const add = (token, label) => {
      out.add(token);
      if (shown && !shown.has(token)) shown.set(token, label);
    };
    for (const w of words(title)) {
      if (STOP.has(w)) { prev = null; continue; }
      const digits = /^\d+$/.test(w);
      if (digits && w.length < C.MODEL_TOKEN_MIN && prev) {
        add(prev + w, prev + " " + w);
        prev = null;
        continue;
      }
      if (w.length < 2 && !digits) { prev = null; continue; }
      add(stem(w), w);
      prev = /\d/.test(w) ? null : w;
    }
    return [...out];
  }

  const isModelToken = (t) => /\d/.test(t) && t.length >= C.MODEL_TOKEN_MIN;

  /** Dice score of a title's words against a group's core words. */
  function matchOf(tokens, core) {
    let shared = 0;
    let sharedModel = 0;
    let ownOnly = 0;          // numbers in the title the group does not have
    for (const t of tokens) {
      const number = /\d/.test(t);
      if (!core.has(t)) {
        if (number) ownOnly++;
        continue;
      }
      shared++;
      if (isModelToken(t)) sharedModel++;
    }
    const own = new Set(tokens);
    let coreOnly = 0;         // numbers in the group the title does not have
    for (const t of core) if (/\d/.test(t) && !own.has(t)) coreOnly++;
    let variantConflict = false;   // "pro", "mini", "max" on one side only
    for (const t of own) if (VARIANTS.has(t) && !core.has(t)) variantConflict = true;
    for (const t of core) if (VARIANTS.has(t) && !own.has(t)) variantConflict = true;
    const denom = tokens.length + core.size;
    return {
      score: denom ? (2 * shared) / denom : 0,
      shared,
      sharedModel,
      /* Each side has a number the other lacks ("iPhone 13 128GB" against
       * "iPhone 15 128GB", "Octavia 2008" against "Octavia 2015"): different
       * models, however alike the rest is. A number on one side only
       * ("Samsung QE55Q60" + "TV Samsung QE55Q60 55") is fine. */
      modelConflict: ownOnly > 0 && coreOnly > 0,
      /* "iPhone 13 Pro" is not an "iPhone 13" at a discount. */
      variantConflict
    };
  }

  function canJoin(tokens, core, mode) {
    const m = matchOf(tokens, core);
    if (m.modelConflict || m.variantConflict) return false;
    if (m.score >= C.SIMILARITY && m.shared >= C.MIN_SHARED && m.sharedModel >= 1) return true;
    if (mode !== "loose") return false;
    return m.score >= C.LOOSE_SIMILARITY && m.shared >= C.LOOSE_MIN_SHARED;
  }

  /** Words present in at least CORE_SHARE of the group's members. */
  function coreOf(counts, size) {
    const need = Math.max(1, Math.ceil(size * C.CORE_SHARE));
    return new Set([...counts].filter(([, c]) => c >= need).map(([t]) => t));
  }

  /** "iphone 13 128gb": the group's most common core words, readable, a word
   * left out when a joined token already shows it ("iphone" in "iphone 13"). */
  function labelOf(g, shown) {
    const parts = [...g.core]
      .sort((a, b) => g.counts.get(b) - g.counts.get(a) || b.length - a.length)
      .slice(0, 4)
      .map((t) => shown.get(t) || t);
    return parts
      .filter((p) => !parts.some((q) => q !== p && q.split(" ").includes(p)))
      .slice(0, 3)
      .join(" ");
  }

  /**
   * Groups the whole history. Returns
   *   shareOf(id) → { share, free, n, label, median } | null
   *   groupOf(id) → { label, n, median } | null
   *   membersOf(id) → the other history entries in the same group
   * Free listings always get share 1.
   */
  function build(history, opts) {
    const o = { ...C.AUTO, ...(opts || {}) };
    const entries = Object.values(history)
      .filter((e) => e.title)
      .sort((a, b) => (a.firstSeen || "").localeCompare(b.firstSeen || "") ||
                      String(a.id).localeCompare(String(b.id)));

    const groups = [];
    const byCategory = {};
    const groupKey = {};
    const shown = new Map();       // token → readable form, for labels

    for (const e of entries) {
      const tokens = tokensOf(e.title, shown);
      if (!tokens.length) continue;
      const list = (byCategory[e.category] ||= []);

      let best = null;
      let bestScore = -1;
      for (const g of list) {
        if (!canJoin(tokens, g.core, o.mode)) continue;
        const { score } = matchOf(tokens, g.core);
        if (score > bestScore) { best = g; bestScore = score; }
      }
      if (!best) {
        best = { key: "g" + groups.length, members: [], ids: [], counts: new Map(), core: new Set() };
        groups.push(best);
        list.push(best);
      }
      best.members.push(e.price);
      best.ids.push(e.id);
      for (const t of tokens) best.counts.set(t, (best.counts.get(t) || 0) + 1);
      best.core = coreOf(best.counts, best.members.length);
      groupKey[e.id] = best.key;
    }

    const info = {};
    const idsOf = {};
    for (const g of groups) {
      idsOf[g.key] = g.ids;
      const prices = g.members.filter((p) => p != null && p > 0);
      info[g.key] = { label: labelOf(g, shown), n: prices.length, median: median(prices) };
    }

    const groupOf = (id) => info[groupKey[id]] || null;

    function shareOf(id) {
      const entry = history[id];
      if (!entry || entry.price == null) return null;
      const g = groupOf(id) || { label: "", n: 0, median: null };
      if (entry.price === 0) return { share: 1, free: true, ...g };
      if (g.n < o.minComparables || g.median == null) return null;
      return { share: (g.median - entry.price) / g.median, free: false, ...g };
    }

    /** The other entries of id's group (the listing itself left out). */
    function membersOf(id) {
      return (idsOf[groupKey[id]] || []).filter((m) => m !== id).map((m) => history[m]).filter(Boolean);
    }

    return { shareOf, groupOf, membersOf };
  }

  BR.groups = { words, stem, tokensOf, matchOf, canJoin, build };
})(globalThis.BR);
