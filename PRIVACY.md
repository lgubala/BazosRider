# Privacy Policy for Bazoš Rider

_Last updated: 25 November 2026_

## The short version

Bazoš Rider does not collect, transmit, or sell any data. There is no server,
no account and no analytics. Everything happens in your own browser.

## Network requests

None, except one you ask for. When you click *Prejsť ďalších 10 strán* in the
bar above Bazoš results, the extension loads the next pages of the search you
are on from bazos.sk, the same pages Bazoš's *Ďalšia* link opens, one at a
time with a pause between them, up to ten. It sends nothing but the ordinary
page request your browser would send. It never loads anything on its own or
in the background, and never contacts any other site.

## What the extension stores

Two things, in the browser's local extension storage (`storage.local`), on
your device only:

- **Your settings**: hidden categories and words, the products you track, and
  comparison thresholds.
- **Price history**: for each Bazoš listing that appears on a page you open,
  its id, title, the start of its description, link, section, price, and the
  days it was first and last seen. Nothing about you, and nothing about the
  seller.

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
