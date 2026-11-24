/* Bazoš Rider — content/scan.js
 *
 * "Prejsť ďalšie strany": reads the next result pages of the search you are
 * on, the same pages you would get by clicking "Ďalšia", one at a time with a
 * pause between them. Only bazos.sk is contacted, only when you click, and
 * what is read goes into the same local price history as pages you open.
 *
 *   BR.scan.run(doc, { pages, signal, onPage }) → { listings, pages, error }
 *     listings  parsed listings, without page elements
 *     error     the message when a page failed; what was read before is kept.
 *               Stopping (signal aborted) is not an error.
 *     onPage(done, pages, listingsSoFar)  after each page, for the progress line
 */
(function (BR) {
  "use strict";

  const C = BR.config;

  const wait = (ms, signal) => new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); reject(signal.reason); }, { once: true });
  });

  /** Fetches one results page and parses it as if it were open. */
  async function page(url, signal) {
    const res = await fetch(url, { signal, credentials: "same-origin" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    /* Links in the fetched page are relative to it, not to this page. */
    const base = doc.createElement("base");
    base.href = url;
    doc.head.prepend(base);
    return doc;
  }

  async function run(doc, { pages = C.SCAN_PAGES, signal, onPage } = {}) {
    const found = [];
    const seen = new Set();
    let url = BR.parse.nextPageUrl(doc);
    let done = 0;
    try {
      while (url && done < pages && !seen.has(url)) {
        if (done > 0) await wait(C.SCAN_DELAY_MS, signal);
        seen.add(url);
        const next = await page(url, signal);
        for (const l of BR.parse.listings(next)) {
          l.element = null;
          found.push(l);
        }
        done++;
        onPage?.(done, pages, found.length);
        url = BR.parse.nextPageUrl(next);
      }
    } catch (e) {
      if (!signal?.aborted) return { listings: found, pages: done, error: e.message || String(e) };
    }
    return { listings: found, pages: done, error: null };
  }

  BR.scan = { run };
})(globalThis.BR);
