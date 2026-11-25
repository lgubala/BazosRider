# Contributing

No dependencies. Plain JavaScript, loaded as classic scripts. Node is only
needed for the build script.

## Running it

```sh
npm run build
```

Then in Firefox: `about:debugging#/runtime/this-firefox` → Load Temporary
Add-on → pick `Firefox/manifest.json`. Open any bazos.sk search page.

After changing a file: `npm run build`, then *Reload* on the about:debugging
page, then reload the Bazoš tab.

On Android, with the phone connected over USB debugging:
`npx web-ext run --target=firefox-android --android-device=<id> --source-dir Firefox`
(`adb devices` lists the id).

## Layout

```
src/
  core/         shared logic, one concern per file
    namespace.js   the BR global and the four module registries
    config.js      every number and Bazoš selector
    i18n.js        BR.t(): text from _locales/
    parse.js       reads listings off a Bazoš page
    history.js     local price history
    groups.js      automatic "similar listings" grouping
    products.js    manual product medians
    context.js     what every badge and list module receives
    deals.js       "is this a good price?" for badges, highlight, bar, icon
    ...
  filters/      hide filters, one file each           ← modules
  skip/         "never record this" rules, one each   ← modules
  badges/       labels on Bazoš pages, one each       ← modules
  lists/        cards in the popup, one each          ← modules
  content/      runs on bazos.sk: badges, highlight, scan, the bar, the
                listing-page price check (detail.js), main
  background/   the toolbar count, and background reading (reader.js)
  geo/          postal code → position (data.js is generated) and distances
  popup/        the toolbar popup: lists view and settings view
  ui/           shared CSS and DOM helpers
_locales/       sk (default) and en
build/modules.json   the core load order and each page's own files
scripts/build.mjs    writes Firefox/ from all of the above
Firefox/        GENERATED, committed. Never edit it.
```

## Where to make a change

| You want to | Edit |
|---|---|
| Change a threshold, history length, list size | `src/core/config.js` |
| Fix parsing after Bazoš changes its HTML | `src/core/config.js` → `SELECTORS` |
| Change any visible text | `_locales/sk/messages.json` and `_locales/en/messages.json` |
| Add a way to hide listings | new file in `src/filters/` |
| Add a label on Bazoš pages | new file in `src/badges/` |
| Add a list to the popup | new file in `src/lists/` |
| Keep a kind of listing out of price history | new file in `src/skip/` |
| Change how similar listings are grouped | `src/core/groups.js` |
| Add a unit ("128 GB"), a Slovak ending or a variant word ("Pro") | `config.js` → `UNITS`, `WORD_ENDINGS`, `VARIANT_WORDS` |
| Change export and import | `src/core/backup.js`, buttons in `src/popup/settings.js` |
| Change what counts as a good deal or a suspicious one | `src/core/deals.js`, thresholds in `config.js` |
| Change the bar above the results | `src/content/banner.js` |
| Change the price check on a listing's page | `src/content/detail.js`; the verdict is `BR.deals.verdict` |
| Fix listing-page parsing after Bazoš changes its HTML | `config.js` → `SELECTORS.detail*` |
| Change the green highlight, fading or sorting | `src/content/highlight.js` |
| Change how further pages are read | `src/content/scan.js`, `SCAN_*` in `config.js` |
| Change background reading | `src/background/reader.js`, `READER*` in `config.js` |
| Change which URLs may be read | `config.js` → `DISALLOWED_URL_PARTS` (from Bazoš's robots.txt) |
| Change how watchdogs match | `src/core/watches.js` |
| Rebuild the postal code table | `node scripts/make-psc.mjs SK.txt` (GeoNames dump) |
| The look | `src/ui/base.css`, `src/popup/popup.css` |

## Adding a module

Every module is one file that registers itself. The build finds files in the
four module folders on its own, so there is no list to update:

1. Put the file in the folder.
2. Add its text to both `_locales/*/messages.json`.
3. `npm run build`.

The order of modules on screen comes from each module's `order` field, never
from the file name. A module that throws is logged and skipped; it does not
take the others down.

### A hide filter

```js
/* src/filters/price.js — hide listings above a price */
BR.filters.add({
  id: "price",                    // also its key in settings.filters
  order: 30,                      // position in the popup settings
  title: "filter_price_title",    // _locales keys
  hint: "filter_price_hint",
  enabledByDefault: false,

  defaults: () => ({ max: 1000 }),

  /* listing: { id, url, category, title, description, price }.
   * Also called with history entries, which have the same fields. */
  matches: (listing, config) => listing.price != null && listing.price > config.max,

  /* The popup settings view draws this. h(tag, attributes, ...children). */
  editor: {
    render(box, config, h) {
      box.append(h("input", { type: "number", min: 0, value: config.max }), " €");
    },
    read: (box) => ({ max: Number(box.querySelector("input").value) || 0 })
  }
});
```

Settings for a new filter appear with its `defaults()`; nothing to migrate.

### A badge

```js
/* src/badges/old.js — listings you have seen for a month */
BR.badges.add({
  id: "old",
  order: 60,                      // lower runs first and shows first
  color: "#57606a",
  /* Return the text, or null for no badge. Return { text, color, title }
   * instead to change the colour or add a tooltip; add details: deal (from
   * BR.deals) and a click shows what the deal was compared with.
   * entry is the history entry (null when skipped).
   * shown is the set of badge ids that already spoke for this listing. */
  test(listing, entry, ctx, shown) {
    if (!entry || shown.has("free")) return null;
    const days = (Date.parse(ctx.today) - Date.parse(entry.firstSeen)) / 864e5;
    return days >= 30 ? BR.t("badge_old", { days }) : null;
  }
});
```

`ctx` is described at the top of `src/core/context.js`: history, settings,
today, the automatic groups and the product medians, computed once per page.

### A popup list

```js
/* src/lists/drops.js — today's price drops */
BR.lists.add({
  id: "drops",                    // also its key in settings.clearedAt
  order: 45,
  title: "list_drops_title",
  empty: "list_drops_empty",
  layout: "top",                  // or "categories" for tabs per category
  limit: 10,                      // default: config.LIST_LIMIT
  clearable: true,                // shows "Vyčistiť"

  /* Sorted rows: a history entry plus share / free when there is a discount. */
  items: (ctx) => Object.values(ctx.history)
    .filter((e) => e.drop && e.drop.day === ctx.today)
    .map((e) => ({ ...e, share: (e.drop.from - e.price) / e.drop.from }))
    .sort((a, b) => b.share - a.share),

  /* The grey line under the title, as parts joined with " · ". */
  meta: (row) => [BR.t("meta_seen", { date: BR.text.shortDate(row.lastSeen) })]
});
```

Hidden listings and rows cleared with *Vyčistiť* are removed for you. Add
`tall: true` to put the list in the popup's left column, `needsGroups: true`
if it is meaningless with automatic comparison switched off.

### A skip rule

```js
/* src/skip/rent.js — monthly rent is not a sale price */
BR.skips.add({
  id: "rent",
  order: 20,
  badge: "skip_rent_badge",       // the grey badge text on Bazoš
  test: (item) => /\bprenajom\b/.test(BR.text.normalize(item.title))
});
```

A matching listing is never recorded, and old entries that match are pruned on
the next page load. Skip rules decide what goes into every median, so be
narrow: `src/skip/installment.js` shows how to cut out phrases that only look
like a match ("z leasingu") before testing.

## The build

```sh
npm run build     # write Firefox/
npm run check     # verify the committed Firefox/ matches the source
npm run syntax    # every .js and .json parses
npm run verify    # syntax + check, what CI runs first
npm run lint      # web-ext lint, what AMO runs on submission
npm run pack      # dist/*.zip for AMO
```

`Firefox/` is committed so the add-on can be loaded from a clone and uploaded
without a build step. CI fails if it differs from what `src/` builds to, so
always commit both.

## Rules of the house

- **Read Bazoš the way robots.txt asks.** Only URLs `BR.parse.readable`
  allows: section and listing pages, never search (`search.php`, `hledat=`,
  `hlokalita=` ...). Background reading is off until the user switches it on,
  reads one page every `READER_DELAY_MS`, and pauses `READER_PAUSE_HOURS` when
  Bazoš answers 403, 429 or 5xx. Do not make it faster, wider or default-on:
  being blocked would also block the user's own browsing. Bazoš's robots.txt
  bans a bot called "pricebot" outright; staying slow is what keeps this a
  person's tool rather than one.
- **Nothing about the user leaves the browser.** The postal code and
  distances never go into a request.
- **No `innerHTML`** with listing text. Titles come from strangers.
- **Slovak first.** Every string goes into both locales; Slovak is the
  default.
- **Prefer no comparison to a wrong one.** Grouping and skip rules feed every
  median; a loose rule makes all of them worse.

## Known limitations

- **Tested in Firefox desktop by hand; Android not yet.** On Android the
  toolbar count does not show: Firefox for Android has no icon badge.
- **Two writers at once** (two Bazoš tabs, or a tab and background reading)
  can overwrite each other's history writes. Rare and harmless: the next read
  records the listings again.
- **Watchdogs only see what was read.** Bazoš search is off-limits, so a
  watchdog finds listings from background reading and browsing, not a listing
  posted a month ago in a section nobody read since.
- **Distances are from postal codes**, straight-line, and only for listings
  read since 1.6.0; older history has no location. Czech postal codes are not
  in the table.
- **Background reading and Firefox's idle limit**: a run is a queue saved
  after every page, and a half-minute alarm carries on, so Firefox stopping
  an idle background page only delays it.
- **Products without a model number** are rarely grouped in strict mode.
  Loose mode helps; manual products are the precise option.
- **Group medians mix days, versions and used/new.** A stricter "seen several
  times" rule is a possible improvement.
- **The "↓ −490 953 €" drop** from the prototype was never reproduced. A guard
  ignores drops where the old price is over 10× the new one.
- **The "Ďalšie strany" list lives on the page.** Leaving it, even for the
  last page read, starts a fresh list; the deals themselves stay in history
  and the popup.
- **Stemming is crude.** It cuts endings, it does not know Slovak grammar, so
  rare words can collide. English titles get the same treatment.
- **Open decisions:** watched searches with notifications, and whether to read
  Bazoš's bare `rss.php` (allowed by robots.txt) for them or rely on Bazoš's
  own e-mail alerts.
