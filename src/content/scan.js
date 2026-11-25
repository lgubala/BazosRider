/* Bazoš Rider — content/scan.js
 *
 * "Prejsť ďalšie strany": reads the next result pages of the search you are
 * on, the same pages you would get by clicking "Ďalšia", one at a time with a
 * pause between them. Only bazos.sk is contacted, only when you click, and
 * what is read goes into the same local price history as pages you open.
 *
 *   BR.scan.run(doc, { from, pages, signal, onPage })
 *       → { listings, pages, last, next, error }
 *     from      the first page to read; default: this page's "Ďalšia"
 *     listings  parsed listings, without page elements
 *     last      the URL of the last page read, null when none was
 *     next      that page's "Ďalšia", where a further scan continues;
 *               null at the end of the search
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

  async function run(doc, { from, pages = C.SCAN_PAGES, signal, onPage } = {}) {
    const found = [];
    const seen = new Set();
    let url = from || BR.parse.nextPageUrl(doc);
    let last = null;
    let done = 0;
    let error = null;
    try {
      while (url && done < pages && !seen.has(url)) {
        if (done > 0) await wait(C.SCAN_DELAY_MS, signal);
        seen.add(url);
        const read = await page(url, signal);
        for (const l of BR.parse.listings(read)) {
          l.element = null;
          found.push(l);
        }
        done++;
        last = url;
        url = BR.parse.nextPageUrl(read);
        onPage?.(done, pages, found.length);
      }
    } catch (e) {
      /* Stopping is not an error; `url` is then the page not read yet. */
      if (!signal?.aborted) error = e.message || String(e);
    }
    return { listings: found, pages: done, last, next: url || null, error };
  }

  BR.scan = { run };
})(globalThis.BR);
