/* Bazoš Rider — core/backup.js
 *
 * Export and import, to move settings and price history to another computer
 * or browser. A backup is one JSON file:
 *
 *   { format: "bazos-rider-backup", version, exportedAt, settings, history }
 *
 * Importing replaces the settings and merges the history: listings only one
 * side knows are added, and for a listing both know, the copy seen most
 * recently wins while the earlier "first seen" is kept.
 */
(function (BR) {
  "use strict";

  const FORMAT = "bazos-rider-backup";
  const plain = (v) => v && typeof v === "object" && !Array.isArray(v);

  function make(settings, history, version, now) {
    return { format: FORMAT, version, exportedAt: now.toISOString(), settings, history };
  }

  /** The parsed backup, or an Error with a message for the user. */
  function read(text) {
    let o;
    try {
      o = JSON.parse(text);
    } catch (e) {
      throw new Error(BR.t("backup_not_json"));
    }
    if (!plain(o) || o.format !== FORMAT || !plain(o.history)) throw new Error(BR.t("backup_not_ours"));
    return o;
  }

  const earlier = (a, b) => (!a ? b : !b ? a : a < b ? a : b);

  /** Merges `incoming` into `history` (mutated). Returns { added, updated }. */
  function merge(history, incoming) {
    let added = 0;
    let updated = 0;
    for (const [id, e] of Object.entries(incoming || {})) {
      if (!plain(e) || String(e.id) !== id || !e.title || !e.lastSeen) continue;
      const have = history[id];
      if (!have) {
        history[id] = { ...e };
        added++;
        continue;
      }
      const theirs = e.lastSeen > (have.lastSeen || "");
      const base = theirs ? e : have;
      history[id] = {
        ...base,
        firstSeen: earlier(have.firstSeen, e.firstSeen),
        firstSeenAt: earlier(have.firstSeenAt, e.firstSeenAt)
      };
      if (theirs) updated++;
    }
    return { added, updated };
  }

  BR.backup = { FORMAT, make, read, merge };
})(globalThis.BR);
