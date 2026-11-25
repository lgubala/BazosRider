/* Bazoš Rider — core/storage.js
 *
 * Three keys in browser.storage.local, nothing else, nothing synced:
 *   settings   written by the popup: its settings view and its clear buttons
 *   history    written by the content script on every Bazoš page you open,
 *              and by background reading (background/reader.js)
 *   reader     background reading's own state, written only by reader.js
 */
(function (BR) {
  "use strict";

  const area = () => (globalThis.browser || globalThis.chrome).storage.local;

  async function load() {
    const stored = await area().get(["settings", "history"]);
    return {
      settings: BR.settings.normalize(stored.settings),
      history: stored.history && typeof stored.history === "object" ? stored.history : {}
    };
  }

  async function loadSettings() {
    const stored = await area().get("settings");
    return BR.settings.normalize(stored.settings);
  }

  const saveSettings = (settings) => area().set({ settings });
  const saveHistory = (history) => area().set({ history });

  /** Read, change, write: for small edits from pages that may be stale. */
  async function updateSettings(change) {
    const settings = await loadSettings();
    change(settings);
    await saveSettings(settings);
    return settings;
  }

  BR.store = { load, loadSettings, saveSettings, saveHistory, updateSettings };
})(globalThis.BR);
