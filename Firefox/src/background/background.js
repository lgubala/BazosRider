/* Bazoš Rider — background/background.js
 *
 * The background page. Two jobs:
 *
 *   1. The number of good deals on the current Bazoš page, on the toolbar
 *      icon for that tab only. The content script sends it after every
 *      redraw; Firefox clears a tab's number by itself when it navigates.
 *   2. Background reading (background/reader.js): its alarms, and the
 *      popup's "Obnoviť teraz" / "Zastaviť" buttons.
 *
 * Messages: { type: "br-deals", count }, { type: "br-reader-now" },
 * { type: "br-reader-stop" }.
 */
(function (BR) {
  "use strict";

  const api = globalThis.browser || globalThis.chrome;

  function showCount(tabId, count) {
    const action = api.action;
    /* Firefox for Android has no badge on its menu entry. */
    if (!action || !action.setBadgeText) return;
    const text = count > 0 ? String(count) : "";
    Promise.resolve(action.setBadgeText({ tabId, text })).catch(() => {});
    if (action.setBadgeBackgroundColor) {
      Promise.resolve(action.setBadgeBackgroundColor({ tabId, color: "#1a7f37" })).catch(() => {});
    }
    if (action.setBadgeTextColor) {
      Promise.resolve(action.setBadgeTextColor({ tabId, color: "#ffffff" })).catch(() => {});
    }
  }

  api.runtime.onMessage.addListener((msg, sender) => {
    if (!msg) return undefined;
    if (msg.type === "br-deals" && sender.tab) { showCount(sender.tab.id, msg.count); return undefined; }
    if (msg.type === "br-reader-now") return BR.reader.start("manual");
    if (msg.type === "br-reader-stop") return BR.reader.stop();
    return undefined;
  });

  api.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "br-reader") BR.reader.start("alarm");
    if (alarm.name === BR.reader.TICK) BR.reader.tick();
  });

  /* Re-plan whenever the reading settings change (the popup saved them). */
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.settings) return;
    const before = JSON.stringify((changes.settings.oldValue || {}).reader || null);
    const after = JSON.stringify((changes.settings.newValue || {}).reader || null);
    if (before !== after) BR.reader.schedule();
  });

  api.runtime.onStartup.addListener(() => BR.reader.schedule());
  api.runtime.onInstalled.addListener(() => BR.reader.schedule());
})(globalThis.BR);
