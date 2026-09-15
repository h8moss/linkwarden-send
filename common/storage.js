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
const getMenus = () => getStorageValue(desiredActionsStoragekey, []);
