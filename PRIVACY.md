# Privacy Policy for Bazoš Rider

_Last updated: 25 November 2026_

## The short version

Bazoš Rider does not collect, transmit, or sell any data. There is no server,
no account and no analytics. Everything happens in your own browser.

## Network requests

Only to bazos.sk, and only in two cases:

- **Background reading, if you switch it on** (*Nastavenia → Čítanie Bazoša
  na pozadí*; it is off by default). The extension then loads the newest pages
  of the Bazoš sections you have not hidden, for example
  `https://mobil.bazos.sk/` and `https://mobil.bazos.sk/40/`, a few pages per
  section, one page every 2 seconds, as often as you set (every 3 hours by
  default). These are section pages, which Bazoš's `robots.txt` allows; it
  never loads search URLs. If Bazoš refuses a request, it stops for a day.
- **When you click** *Prejsť ďalších 10 strán* on a section page: the next
  pages of that section, one at a time.

Each request is an ordinary page request with no cookies and nothing about
you. No other site is ever contacted. Distances ("v okolí") are computed in
your browser from a bundled table of postal codes; nothing is looked up
online.

## What the extension stores

Two things, in the browser's local extension storage (`storage.local`), on
your device only:

- **Your settings**: hidden categories and words, the products and things
  you watch for, comparison thresholds, and your postal code if you enter it
  (for "v okolí").
- **Price history**: for each Bazoš listing that appears on a page you open
  or that background reading loads, its id, title, the start of its
  description, link, section, price, the town and postal code Bazoš shows
  for it, and the days it was first and last seen. Nothing about you, and
  nothing else about the seller.
- **Background reading's state**: when it last ran and how it went.

History is built only from pages you open yourself, and from the pages
loaded when you click *Prejsť ďalších 10 strán*. Entries not seen for about
a year are deleted automatically, and the popup settings have a button that
deletes all of it. Uninstalling the extension removes everything.

Storage is never synced to other devices.

## Permissions

| Permission | Why |
|---|---|
| Access to `bazos.sk` | To hide listings, read their prices and add badges on Bazoš pages. No other site. |
| `storage` | To keep your settings and the price history. |
| `unlimitedStorage` | A year of history can grow past the default storage quota. It still never leaves your device. |

## Contact

Questions: [open an issue](https://github.com/lgubala/BazosRider/issues).
