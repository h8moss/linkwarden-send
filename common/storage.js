const apikeyStoragekey = "lws-apikey";
const serverStoragekey = "lws-server";
const desiredActionsStoragekey = "lws-actions";
const myStoragekeys = [
  apikeyStoragekey,
  serverStoragekey,
  desiredActionsStoragekey,
];

const normalizeServerUrl = (server) => (server || "").trim().replace(/\/+$/, "");

const getStorageValue = async (key, fallback) => {
  const result = await browser.storage.local.get(key);
  return key in result ? result[key] : fallback;
};

const getServer = () => getStorageValue(serverStoragekey, "");
const getApiKey = () => getStorageValue(apikeyStoragekey, "");

// Older saved actions stored the collection as a bare name (`collection`),
// which is what caused duplicate collections to be created server-side.
// Carry that name forward as `collectionName` so it still displays, but
// drop it as something to send to the API - only a resolved `collectionId`
// is ever sent now.
const migrateMenu = (menu) => {
  if (menu.collectionId !== undefined) return menu;
  const { collection, ...rest } = menu;
  return { ...rest, collectionId: "", collectionName: collection || "" };
};

const getMenus = async () => {
  const menus = await getStorageValue(desiredActionsStoragekey, []);
  return menus.map(migrateMenu);
};
