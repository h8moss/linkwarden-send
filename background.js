const updateContextMenu = async () => {
  await browser.contextMenus.removeAll();

  const server = await getServer();
  const apikey = await getApiKey();
  if (!server || !apikey) return;
  if (!(await hasHostPermission(server))) return;

  try {
    await testLinkwardenConnection(server, apikey);
  } catch (e) {
    console.error("Linkwarden Send: connection check failed", e);
    return;
  }

  const menus = await getMenus();
  if (menus.length === 0) {
    console.warn("Linkwarden Send: no context menu actions configured");
  }
  for (const { id, title } of menus) {
    try {
      await browser.contextMenus.create({
        id,
        title,
        contexts: ["link", "tab"],
      });
    } catch (e) {
      console.error(`Linkwarden Send: failed to create context menu "${title}"`, e);
    }
  }
};

// A right-click on a tab that's part of a multi-selection keeps the whole
// selection (that's why the native menu offers "Reload N Tabs" in that
// case) - so for a "tab"-context click, send every highlighted tab in the
// window rather than only the one the click landed on.
const getTargetUrls = async (info, tab) => {
  if (info.linkUrl) return [info.linkUrl];

  // The active tab is always highlighted, so querying highlighted tabs
  // unconditionally would send the active tab even when the click landed
  // on an unrelated, non-highlighted background tab. Only fall back to the
  // whole highlighted set when the clicked tab is actually part of it.
  if (tab.highlighted) {
    const highlighted = await browser.tabs.query({
      highlighted: true,
      windowId: tab.windowId,
    });
    const urls = highlighted.map((t) => t.url).filter(Boolean);
    if (urls.length > 0) return urls;
  }

  return tab.url ? [tab.url] : [];
};

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  const menus = await getMenus();
  const menu = menus.find((m) => m.id === info.menuItemId);
  if (!menu) return;

  const server = await getServer();
  const apikey = await getApiKey();
  const urls = await getTargetUrls(info, tab);
  if (urls.length === 0) {
    console.error("Linkwarden Send: no URL available for this click", info);
    return;
  }

  for (const url of urls) {
    try {
      await saveLinkToLinkwarden(server, apikey, {
        url,
        collectionId: menu.collectionId,
        tags: menu.tags,
      });
    } catch (e) {
      console.error(`Linkwarden Send: failed to save link ${url}`, e);
    }
  }
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area == "local") {
    if (Object.keys(changes).some((v) => myStoragekeys.includes(v))) {
      updateContextMenu();
    }
  }
});

updateContextMenu();
