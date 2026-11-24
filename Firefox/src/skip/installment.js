/* Leasing, down payments and monthly installments.
 *
 * "599 €" on a leasing transfer is the down payment, not the car's price.
 * Recording it would drag every median in "auto" down, so such listings are
 * never stored. They stay visible on the page with a grey badge.
 *
 * Text is compared normalised: lowercase, no diacritics ("splátka" → "splatka").
 */
(function () {
  "use strict";

  /* Phrases that mention leasing but describe an ordinary sale at full price:
   * "auto z leasingu", "po leasingu", "leasing splatený", "možnosť leasingu".
   * They are cut out before the leasing test. */
  const SALE_PHRASES = [
    /\b(?:z|zo|po|bez)\s+leasing\w*/g,
    /\b(?:vyplaten|ukoncen|splaten)\w*\s+leasing\w*/g,
    /\bleasing\w*\s+(?:vyplaten|ukoncen|splaten|mozn)\w*/g,
    /\b(?:moznost\w*|mozny|mozne|aj\s+na|aj\s+cez|cez)\s+leasing\w*/g
  ];

  /* Signs that the shown number is not the item price. */
  const INSTALLMENT = [
    /\bleasing/,                                        // what is left after SALE_PHRASES
    /\bsplat(?:k|ok)/,                                  // splátka, splátky, splátok
    /\bodstupn/,                                        // odstupné
    /\bodstupim\b/,                                     // odstúpim leasing
    /\bakontaci/,                                       // akontácia
    /(?:€|eur)\s*(?:\/\s*|za\s+|na\s+)?mes(?:iac|acn|\b)/, // 199 € / mes, 199 € mesačne
    /\bmesacne\s+(?:len\s+|iba\s+|od\s+)?\d/            // mesačne 199
  ];

  function test(item) {
    let text = BR.text.normalize(item.title + " " + (item.description || ""));
    for (const re of SALE_PHRASES) text = text.replace(re, " ");
    return INSTALLMENT.some((re) => re.test(text));
  }

  BR.skips.add({
    id: "installment",
    order: 10,
    badge: "skip_installment_badge",   // _locales key for the grey badge
    test
  });
})();
