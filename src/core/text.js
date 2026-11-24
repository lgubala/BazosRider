/* Bazoš Rider — core/text.js
 * Small pure helpers used everywhere: text normalising, dates, money.
 */
(function (BR) {
  "use strict";

  /** Lowercase without diacritics, so "Náhradné" matches "nahradne". */
  function normalize(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  }

  function median(nums) {
    if (!nums.length) return null;
    const s = [...nums].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  /** Local calendar day as "YYYY-MM-DD". History compares days as strings. */
  function localDay(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  /** "2026-11-24" → "24.11." */
  function shortDate(day) {
    const [, m, d] = String(day || "").split("-");
    return d ? `${Number(d)}.${Number(m)}.` : "";
  }

  function money(n) {
    return Math.round(n).toLocaleString(BR.lang) + " €";
  }

  function percent(share) {
    return Math.round(share * 100);
  }

  function clamp(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
  }

  /** "a\n b \n\n" → ["a", "b"] */
  function lines(text) {
    return String(text || "").split("\n").map((s) => s.trim()).filter(Boolean);
  }

  BR.text = { normalize, median, localDay, shortDate, money, percent, clamp, lines };
})(globalThis.BR);
