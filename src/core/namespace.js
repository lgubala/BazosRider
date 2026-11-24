/* Bazoš Rider — core/namespace.js
 *
 * The one global every file hangs off, and the four registries that modules
 * join. Loaded first on every page.
 *
 *   BR.filters   hide listings          src/filters/*.js
 *   BR.skips     never record listings  src/skip/*.js
 *   BR.badges    labels on Bazoš pages  src/badges/*.js
 *   BR.lists     cards in the popup     src/lists/*.js
 *
 * A module file calls e.g. BR.filters.add({ id, order, ... }) once at load
 * time. The core files later add the helpers that run them
 * (BR.filters.hides, BR.badges.for, ...) to the same objects.
 */
(function (root) {
  "use strict";

  const BR = root.BR || (root.BR = {});

  function registry(kind, required) {
    const items = [];
    return {
      kind,

      /** Register a module. A second module with the same id replaces the first. */
      add(def) {
        for (const key of ["id", ...required]) {
          if (def == null || def[key] == null) {
            console.error(`[bazos-rider] ${kind} without "${key}" ignored`, def);
            return null;
          }
        }
        const at = items.findIndex((x) => x.id === def.id);
        if (at >= 0) items.splice(at, 1);
        items.push(def);
        items.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.id.localeCompare(b.id));
        return def;
      },

      /** Every registered module, in `order`. */
      all() { return items.slice(); },

      get(id) { return items.find((x) => x.id === id) || null; }
    };
  }

  BR.filters = registry("filter", ["matches"]);
  BR.skips = registry("skip rule", ["test"]);
  BR.badges = registry("badge", ["test"]);
  BR.lists = registry("list", ["items"]);
})(globalThis);
