// Requesting the specific server's origin (rather than <all_urls>) keeps the
// permission prompt scoped and specific ("access your data for
// links.example.com" instead of "...for all websites"), and Firefox is far
// more consistent about remembering a granted narrow origin than a granted
// <all_urls> optional permission.
const toOriginPattern = (server) => {
  try {
    const url = new URL(normalizeServerUrl(server));
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.protocol}//${url.host}/*`;
  } catch {
    return null;
  }
};

// Must be called synchronously from within a genuine user-gesture handler
// (e.g. a click listener), with no prior await - Firefox only honors the
// request while it's still riding the click's transient activation, so this
// is only usable from the popup, not from the background script.
const requestHostPermission = (server) => {
  const pattern = toOriginPattern(server);
  if (!pattern) return Promise.resolve(false);
  return browser.permissions.request({ origins: [pattern] });
};

const hasHostPermission = (server) => {
  const pattern = toOriginPattern(server);
  if (!pattern) return Promise.resolve(false);
  return browser.permissions.contains({ origins: [pattern] });
};
