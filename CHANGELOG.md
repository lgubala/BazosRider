# Changelog

## 1.5.0

- **Price check on a listing's own page.** Open any listing and a box under
  its title says *o 28 % lacnejší ako podobné*, *o 12 % drahší* or
  *približne bežná cena*, with the median, the price range and the listings
  it was compared with. It also says since when the listing is in your
  history and whether its price dropped. Nothing to compare with yet? It
  says so, and *Hľadať podobné na Bazoši* opens a search for the same kind of
  item, where the scan fills the history
- **A listing's "Podobné inzeráty" are recorded** and badged like search
  results. Before, they were read with an empty title, and the page got a
  results bar it did not need
- **"13Pro" is "13 Pro"**: a variant written together with the number is
  still recognised, so "iPhone 13Pro" is never compared with "iPhone 13"
- Badges wrap onto two lines instead of running over Bazoš's narrow price
  column
- Checked against real bazos.sk pages (results and a listing) from 25
  November 2026

## 1.4.0

- **The scan continues instead of starting over.** After *Prejsť ďalších 10
  strán*, the button becomes *Pokračovať ďalšími 10 stranami* and reads pages
  11–20, then 21–30, adding to the deals already listed. *→ na poslednú
  prečítanú stranu* takes you to the last page read; scanning from there
  continues too. At the end of the search the bar says so
- **Many more listings find their match**:
  - "128GB" and "128 GB" are the same word now. Before, the two spellings
    looked like different numbers and were kept apart on purpose
  - "iPhone 13", "Golf 7", "PS 5": a short number counts as a model together
    with the word before it, and equals "iPhone13" or "PS5"
  - "1.6 TDI" and "1,6 TDI" match; "1.6" and "2.0" never do
  - Slovak word endings are ignored: "kočík", "kočíka", "kočíky"
  - "Pro", "Max", "Mini", "Plus", "Ultra", "Lite", "FE" and "XL" keep a
    variant apart, so an "iPhone 13 Pro" is never a cheap "iPhone 13"
- **Voľnejšie is the default grouping.** Settings saved by an older version
  switch to it once; choosing *Prísne* again sticks
- **Export and import** under *Nastavenia → Záloha*, to move settings and
  price history to another computer. Import replaces the settings and merges
  the history. It opens in a tab, because a file picker closes the popup
- Group labels in the popup read "iphone 13 128gb" instead of word stems

## 1.3.0

- **The good deals are visible as soon as a page opens.** A bar above the
  results says how many there are, *3 výhodné ponuky na tejto strane*, with a
  chip per deal that scrolls to it. Deals get a green edge, and the toolbar
  icon shows the count for that tab. "Good" is 15 % or more under the median,
  adjustable in *Nastavenia → Na stránke Bazoša*
- **Len výhodné** fades out everything that is not a deal. **Zoradiť podľa
  zľavy** puts the biggest discount first; switching it off restores Bazoš's
  order. Both are remembered across pages
- **Prejsť ďalších 10 strán** reads the next pages of the current search, one
  every 1.5 seconds, saves their prices to history and lists the good deals
  found there. Only on a click, with a stop button. This is the first time
  Bazoš Rider loads a page by itself; PRIVACY.md says exactly what it does
- **Click a discount badge** to see what it was compared with: the median and
  the cheapest listings of the same group, each a link
- **Suspiciously cheap gets a warning.** 70 % or more under the median is an
  orange *⚠* badge instead of a deal, is not highlighted, not counted, and
  left out of *Deal dňa* and *Deal roka*
- **"Kúpim / Hľadám / Vymením"** ads and **broken or for-parts** items ("na
  diely", "nefunkčný", "prasknutý displej", "iCloud lock") are no longer
  recorded. Their prices pulled medians down and made them look like
  bargains. They show a grey badge saying why

## 1.2.0

- **Looser grouping, if you want it.** *Nastavenia → Automatické
  porovnávanie* now has *Prísne* (the default: titles must share a model
  number) and *Voľnejšie*, which also groups titles without a model number
  when their words overlap strongly: "Šaty na stužkovú" with "Šaty na
  stužkovú červené", "Apple iPhone 13" with "iPhone 13". More comparisons in
  sections like clothes and books, at the price of an occasional wrong one
- **Titles whose numbers disagree never group**, in either mode. Strict mode
  used to put "iPhone 13 128GB" and "iPhone 15 128GB" together because both
  say "128gb"; now each having a number the other lacks keeps them apart.
  The same keeps "Octavia 2008" away from "Octavia 2015"

## 1.1.0

- **Settings are back in the popup.** *Nastavenia* in the popup's header swaps
  the lists for the settings, and *← Zoznamy* swaps back. The separate options
  page is gone: one place to look, and on Android the popup is already a full
  page. Saving redraws the lists at once, so a newly hidden category drops out
  of them without reopening the popup
- **Empty deal lists say why.** *Deal dňa* and *Deal roka* only compare
  listings whose titles share a model number, so a page of clothes and books
  has nothing to compare. Instead of "nothing yet" they now say, for example,
  "Dnes: 71 inzerátov s cenou, ale žiadne dva nemajú v názve rovnaké číslo
  modelu", or how many had a comparison but were not cheap enough
- **Deleting the price history asks with a second click** instead of a dialog,
  which Firefox does not show from a toolbar popup

## 1.0.0 — Bazoš Rider

The "Bazoš filter" prototype (0.10.0), rebuilt as an open-source project.

- **Everything is a module.** Hide filters, page badges, popup lists and skip
  rules are each one file in `src/filters/`, `src/badges/`, `src/lists/` or
  `src/skip/`. Adding one is dropping a file in and running `npm run build`;
  the build picks it up and writes the load order into the manifest and the
  pages
- Settings on a separate options page (moved back into the popup in 1.1.0)
- **Works on a phone.** The popup has a viewport tag, so Firefox for Android no
  longer draws it at desktop scale, and switches to one column with bigger tap
  targets on touch screens
- **Leasing no longer catches normal sales.** "Auto z leasingu", "po leasingu",
  "leasing splatený" and "možnosť leasingu" are ordinary sales at full price
  and are now recorded. A monthly-price check also stopped matching "6 mesačné
  dieťa"; it now needs a price next to it ("150 € / mes", "mesačne 199")
- **Skipped listings say so.** A grey *splátky / leasing* badge marks listings
  kept out of price history, so it is clear why they never get a comparison
- **Slovak and English.** The UI follows the browser's language; Slovak is the
  default
- The popup's two columns no longer leave a gap under the right-hand cards
- A listing priced above its group's median no longer shows a "−−40 %" pill;
  it gets its rank instead
- *Najlacnejšie dnes* shows a group only when it has something to compare with
- Dark mode in the popup and the options page
- Settings are stored per filter id instead of a list, so a new filter appears
  with its defaults without a migration. Settings and history from the
  prototype are not carried over: it was a different add-on id
