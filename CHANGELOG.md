# Changelog

## 1.0.0 — Bazoš Rider

The "Bazoš filter" prototype (0.10.0), rebuilt as an open-source project.

- **Everything is a module.** Hide filters, page badges, popup lists and skip
  rules are each one file in `src/filters/`, `src/badges/`, `src/lists/` or
  `src/skip/`. Adding one is dropping a file in and running `npm run build`;
  the build picks it up and writes the load order into the manifest and the
  pages
- **Settings moved to a real options page.** The popup is now only the lists,
  which was the point of opening it. The options page opens from the popup's
  *Nastavenia* button or from the add-ons manager
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
