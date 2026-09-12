const apikeyStoragekey = "lws-apikey";
const serverStoragekey = "lws-server";
const desiredActionsStoragekey = "lws-actions";
const myStoragekeys = [
  apikeyStoragekey,
  serverStoragekey,
  desiredActionsStoragekey,
];

const saveLink = (url, collection, tags) => {
  // todo
};

const testConnection = async () => {
  // todo
  return true;
};

const updateContextMenu = async () => {
  browser.contextMenus.removeAll();
  if (!(await testConnection())) return;
  const menus = await browser.storage.local.get(desiredActionsStoragekey);
  for (const { id, title } of menus) {
    browser.menus.create({
      id: id,
      title: title,
      contexts: ["all"],
    });
  }
};

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  const menus = await browser.storage.local.get(desiredActionsStoragekey);
  for (const { id, collection, tags } of menus) {
    if (info.menuItemId == id) {
      saveLink(tab.url, collection, tags);
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
