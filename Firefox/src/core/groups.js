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
 * That is the "strict" mode, the default. "loose" mode (settings.auto.mode)
 * also groups titles without a model number when their words overlap even
 * more ("Šaty na stužkovú" + "Šaty na stužkovú červené").
 *
 * In both modes, two titles whose numbers disagree never group: "iPhone 13
 * 128GB" and "iPhone 15 128GB" share "128gb" but are different phones.
 */
(function (BR) {
  "use strict";

  const C = BR.config;
  const { normalize, median } = BR.text;
  const STOP = new Set(C.STOP_WORDS.map(normalize));

  /** Distinct meaningful words of a title. */
  function tokensOf(title) {
    const out = new Set();
    for (const w of normalize(title).split(/[^a-z0-9]+/)) {
      if (!w || STOP.has(w)) continue;
      if (w.length < 2 && !/\d/.test(w)) continue;
      out.add(w);
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
    const denom = tokens.length + core.size;
    return {
      score: denom ? (2 * shared) / denom : 0,
      shared,
      sharedModel,
      /* Each side has a number the other lacks ("iPhone 13 128GB" against
       * "iPhone 15 128GB", "Octavia 2008" against "Octavia 2015"): different
       * models, however alike the rest is. A number on one side only
       * ("Samsung QE55Q60" + "TV Samsung QE55Q60 55") is fine. */
      modelConflict: ownOnly > 0 && coreOnly > 0
    };
  }

  function canJoin(tokens, core, mode) {
    const m = matchOf(tokens, core);
    if (m.modelConflict) return false;
    if (m.score >= C.SIMILARITY && m.shared >= C.MIN_SHARED && m.sharedModel >= 1) return true;
    if (mode !== "loose") return false;
    return m.score >= C.LOOSE_SIMILARITY && m.shared >= C.LOOSE_MIN_SHARED;
  }

  /** Words present in at least CORE_SHARE of the group's members. */
  function coreOf(counts, size) {
    const need = Math.max(1, Math.ceil(size * C.CORE_SHARE));
    return new Set([...counts].filter(([, c]) => c >= need).map(([t]) => t));
  }

  /**
   * Groups the whole history. Returns
   *   shareOf(id) → { share, free, n, label, median } | null
   *   groupOf(id) → { label, n, median } | null
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

    for (const e of entries) {
      const tokens = tokensOf(e.title);
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
        best = { key: "g" + groups.length, members: [], counts: new Map(), core: new Set() };
        groups.push(best);
        list.push(best);
      }
      best.members.push(e.price);
      for (const t of tokens) best.counts.set(t, (best.counts.get(t) || 0) + 1);
      best.core = coreOf(best.counts, best.members.length);
      groupKey[e.id] = best.key;
    }

    const info = {};
    for (const g of groups) {
      const prices = g.members.filter((p) => p != null && p > 0);
      const label = [...g.core]
        .sort((a, b) => g.counts.get(b) - g.counts.get(a) || b.length - a.length)
        .slice(0, 3)
        .join(" ");
      info[g.key] = { label, n: prices.length, median: median(prices) };
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

    return { shareOf, groupOf };
  }

  BR.groups = { tokensOf, matchOf, canJoin, build };
})(globalThis.BR);
