/* Bazoš Rider — background/background.js
 *
 * Puts the number of good deals on the current Bazoš page on the toolbar
 * icon, for that tab only. The content script sends the count after every
 * redraw; Firefox clears a tab's number by itself when the tab navigates.
 *
 * Nothing else runs here: no timers, no requests, no storage.
 */
"use strict";

const api = globalThis.browser || globalThis.chrome;

api.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== "br-deals" || !sender.tab) return;
  const tabId = sender.tab.id;
  const action = api.action;
  /* Firefox for Android has no badge on its menu entry. */
  if (!action || !action.setBadgeText) return;
  const text = msg.count > 0 ? String(msg.count) : "";
  Promise.resolve(action.setBadgeText({ tabId, text })).catch(() => {});
  if (action.setBadgeBackgroundColor) {
    Promise.resolve(action.setBadgeBackgroundColor({ tabId, color: "#1a7f37" })).catch(() => {});
  }
  if (action.setBadgeTextColor) {
    Promise.resolve(action.setBadgeTextColor({ tabId, color: "#ffffff" })).catch(() => {});
  }
});
