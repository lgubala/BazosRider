/* Broken, faulty or "for parts".
 *
 * A dead phone at 40 € is not a 60 % deal on a working one. Only the title is
 * checked: a description often says "predám aj na diely" about a car that
 * runs, or "nie je nefunkčný".
 */
(function () {
  "use strict";

  const BROKEN = [
    /\bna\s+(?:nahradne\s+)?(?:diely|suciastky)\b/,   // na diely, na náhradné diely
    /\bnefunkcn/,                                     // nefunkčný, nefunkčné
    /\bpokazen/,                                      // pokazený
    /\brozbit/,                                       // rozbitý displej
    /\bprasknut/,                                     // prasknutý
    /\bposkoden/,                                     // poškodený
    /\bnezapn/,                                       // nezapne sa
    /\bblokovan/,                                     // blokovaný (iCloud, operátor)
    /\bicloud\s*lock/
  ];

  BR.skips.add({
    id: "broken",
    order: 30,
    badge: "skip_broken_badge",
    test: (item) => {
      const title = BR.text.normalize(item.title);
      return BROKEN.some((re) => re.test(title));
    }
  });
})();
