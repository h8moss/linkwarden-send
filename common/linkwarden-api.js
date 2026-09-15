const linkwardenFetch = (server, apikey, path, options = {}) => {
  const base = normalizeServerUrl(server);
  return fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apikey}`,
      ...(options.headers || {}),
    },
  });
};

// GET /api/v1/users/me is a cheap authenticated, read-only endpoint, so it
// doubles as a connectivity + credentials check without side effects.
// Throws with a human-readable reason on failure instead of returning a bare
// boolean, since "it failed" with no cause is unactionable from the popup.
const testLinkwardenConnection = async (server, apikey) => {
  if (!server || !apikey) throw new Error("Server and API key are required.");

  const response = await linkwardenFetch(server, apikey, "/api/v1/users/me");
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.response || `Server responded with status ${response.status}`,
    );
  }
  return true;
};

const getLinkwardenCollections = async (server, apikey) => {
  const response = await linkwardenFetch(server, apikey, "/api/v1/collections");
  if (!response.ok) throw new Error(`Failed to load collections (${response.status})`);
  const json = await response.json();
  return json.response || [];
};

const getLinkwardenTags = async (server, apikey) => {
  const response = await linkwardenFetch(server, apikey, "/api/v1/tags");
  if (!response.ok) throw new Error(`Failed to load tags (${response.status})`);
  const json = await response.json();
  return json.data?.tags || [];
};

const saveLinkToLinkwarden = async (server, apikey, { url, collection, tags }) => {
  const body = {
    url,
    ...(collection ? { collection: { name: collection } } : {}),
    tags: (tags || []).filter(Boolean).map((name) => ({ name })),
  };

  const response = await linkwardenFetch(server, apikey, "/api/v1/links", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.response || `Failed to save link (${response.status})`,
    );
  }

  return response.json();
};
