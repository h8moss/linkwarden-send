let availableCollections = [];
let availableTags = [];

const loadAutocompleteData = async (server, apikey) => {
  try {
    const [collections, tags] = await Promise.all([
      getLinkwardenCollections(server, apikey),
      getLinkwardenTags(server, apikey),
    ]);
    availableCollections = collections.map((c) => c.name);
    availableTags = tags.map((t) => t.name);
  } catch (e) {
    console.error("Linkwarden Send: failed to load collections/tags", e);
    availableCollections = [];
    availableTags = [];
  }
};

const setContextMenuEnabled = (enabled) => {
  document.querySelector("#add-button").disabled = !enabled;
  document.querySelector("#save-context-menu").disabled = !enabled;
  document
    .querySelectorAll("#context-menu-list input, #context-menu-list select, #context-menu-list button")
    .forEach((el) => {
      el.disabled = !enabled;
    });
  document.querySelector("#context-menu-disabled-notice").hidden = enabled;
};

const testConnection = async () => {
  const statusEl = document.querySelector("#connection-status");
  const saveButton = document.querySelector("#save-connection");
  const server = document.querySelector("#server-input").value;
  const apikey = document.querySelector("#api-key-input").value;

  if (!toOriginPattern(server)) {
    saveButton.disabled = true;
    statusEl.textContent = "Enter a valid server URL (e.g. https://my-server.com).";
    statusEl.className = "status error";
    return;
  }

  // Must be the first await in this click handler - Firefox only honors
  // permissions.request() while the call chain still carries the user
  // gesture from the click, and a prior await can drop that.
  const permissionGranted = await requestHostPermission(server);
  if (!permissionGranted) {
    saveButton.disabled = true;
    statusEl.textContent =
      "Permission to contact this server is required and was denied.";
    statusEl.className = "status error";
    return;
  }

  statusEl.textContent = "Testing...";
  statusEl.className = "status";

  try {
    await testLinkwardenConnection(server, apikey);
    saveButton.disabled = false;
    statusEl.textContent = "Connection successful";
    statusEl.className = "status success";
  } catch (e) {
    saveButton.disabled = true;
    statusEl.textContent = e.message || "Could not connect.";
    statusEl.className = "status error";
    console.error("Linkwarden Send: connection test failed", e);
  }
};

const saveConnection = async () => {
  const server = document.querySelector("#server-input").value;
  const apikey = document.querySelector("#api-key-input").value;
  await browser.storage.local.set({
    [serverStoragekey]: server,
    [apikeyStoragekey]: apikey,
  });

  await loadAutocompleteData(server, apikey);
  refreshCollectionOptions();
  setContextMenuEnabled(true);
};

const resetConnectionState = () => {
  document.querySelector("#save-connection").disabled = true;
  const statusEl = document.querySelector("#connection-status");
  statusEl.textContent = "";
  statusEl.className = "status";
};

const clearUIMenus = () => {
  document.getElementById("context-menu-list").innerHTML = "";
};

const createLabeledInput = (labelText, className, value) => {
  const wrapper = document.createElement("div");
  wrapper.className = "column";

  const label = document.createElement("label");
  label.textContent = labelText;

  const input = document.createElement("input");
  input.className = className;
  input.value = value ?? "";

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return wrapper;
};

const populateCollectionSelect = (select, selectedName) => {
  select.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Unorganized";
  select.appendChild(defaultOption);

  for (const name of availableCollections) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }

  if (selectedName && !availableCollections.includes(selectedName)) {
    const option = document.createElement("option");
    option.value = selectedName;
    option.textContent = selectedName;
    select.appendChild(option);
  }

  select.value = selectedName || "";
};

const refreshCollectionOptions = () => {
  document.querySelectorAll(".menu-collection").forEach((select) => {
    populateCollectionSelect(select, select.value);
  });
};

const createCollectionSelect = (selectedName) => {
  const wrapper = document.createElement("div");
  wrapper.className = "column";

  const label = document.createElement("label");
  label.textContent = "Collection";
  wrapper.appendChild(label);

  const select = document.createElement("select");
  select.className = "menu-collection";
  populateCollectionSelect(select, selectedName);

  wrapper.appendChild(select);
  return wrapper;
};

const addTagChip = (chipsContainer, tagName) => {
  const trimmed = (tagName || "").trim();
  if (!trimmed) return;

  const alreadyAdded = [...chipsContainer.querySelectorAll(".tag-chip")].some(
    (chip) => chip.dataset.tag.toLowerCase() === trimmed.toLowerCase(),
  );
  if (alreadyAdded) return;

  const chip = document.createElement("span");
  chip.className = "tag-chip";
  chip.dataset.tag = trimmed;

  const label = document.createElement("span");
  label.textContent = trimmed;
  chip.appendChild(label);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "tag-chip-remove";
  removeButton.textContent = "×";
  removeButton.addEventListener("click", () => chip.remove());
  chip.appendChild(removeButton);

  chipsContainer.appendChild(chip);
};

const createTagAutocomplete = (initialTags) => {
  const wrapper = document.createElement("div");
  wrapper.className = "column tag-autocomplete";

  const label = document.createElement("label");
  label.textContent = "Tags";
  wrapper.appendChild(label);

  const chips = document.createElement("div");
  chips.className = "tag-chips";
  for (const tag of initialTags || []) addTagChip(chips, tag);
  wrapper.appendChild(chips);

  const inputWrapper = document.createElement("div");
  inputWrapper.className = "tag-input-wrapper";

  const input = document.createElement("input");
  input.className = "menu-tags-input";
  input.placeholder = "Add tag...";

  const suggestions = document.createElement("div");
  suggestions.className = "tag-suggestions";
  suggestions.hidden = true;

  const renderSuggestions = () => {
    const query = input.value.trim().toLowerCase();
    suggestions.innerHTML = "";

    if (!query) {
      suggestions.hidden = true;
      return;
    }

    const selected = new Set(
      [...chips.querySelectorAll(".tag-chip")].map((c) => c.dataset.tag.toLowerCase()),
    );
    const matches = availableTags
      .filter((t) => t.toLowerCase().includes(query) && !selected.has(t.toLowerCase()))
      .slice(0, 8);

    if (matches.length === 0) {
      suggestions.hidden = true;
      return;
    }

    for (const tag of matches) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "tag-suggestion";
      option.textContent = tag;
      // mousedown fires before the input's blur, so preventDefault keeps
      // focus on the input long enough for this click to register.
      option.addEventListener("mousedown", (e) => {
        e.preventDefault();
        addTagChip(chips, tag);
        input.value = "";
        suggestions.hidden = true;
      });
      suggestions.appendChild(option);
    }

    suggestions.hidden = false;
  };

  input.addEventListener("input", renderSuggestions);
  input.addEventListener("focus", renderSuggestions);
  input.addEventListener("blur", () => {
    suggestions.hidden = true;
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTagChip(chips, input.value);
      input.value = "";
      suggestions.hidden = true;
    } else if (e.key === "Escape") {
      suggestions.hidden = true;
    }
  });

  inputWrapper.appendChild(input);
  inputWrapper.appendChild(suggestions);
  wrapper.appendChild(inputWrapper);

  return wrapper;
};

const addUIMenu = (menu) => {
  const parent = document.getElementById("context-menu-list");

  const menuItem = document.createElement("div");
  menuItem.className = "menu-item column";
  menuItem.dataset.id = menu.id;

  const row = document.createElement("div");
  row.className = "row";

  row.appendChild(createLabeledInput("Title", "menu-title", menu.title));
  row.appendChild(createCollectionSelect(menu.collection));
  row.appendChild(createTagAutocomplete(menu.tags));

  const removeButton = document.createElement("button");
  removeButton.textContent = "×";
  removeButton.className = "menu-remove";
  removeButton.addEventListener("click", () => menuItem.remove());
  row.appendChild(removeButton);

  menuItem.appendChild(row);
  parent.appendChild(menuItem);
};

const saveContextMenuItems = async () => {
  const statusEl = document.querySelector("#context-menu-status");
  const items = [...document.querySelectorAll(".menu-item")];
  const menus = items
    .map((item) => ({
      id: item.dataset.id,
      title: item.querySelector(".menu-title").value.trim(),
      collection: item.querySelector(".menu-collection").value.trim(),
      tags: [...item.querySelectorAll(".tag-chip")].map((chip) => chip.dataset.tag),
    }))
    .filter((menu) => menu.title !== "");

  await browser.storage.local.set({ [desiredActionsStoragekey]: menus });

  if (menus.length === 0) {
    statusEl.textContent = "Saved, but no actions have a title, so none were added.";
    statusEl.className = "status error";
  } else {
    statusEl.textContent = `Saved ${menus.length} action${menus.length === 1 ? "" : "s"}.`;
    statusEl.className = "status success";
  }
};

const loadSavedValues = (server, apikey, menus) => {
  document.querySelector("#server-input").value = server;
  document.querySelector("#api-key-input").value = apikey;

  if (!menus || menus.length === 0) {
    menus = [
      { id: crypto.randomUUID(), title: "Send to linkwarden", collection: "", tags: [] },
    ];
  }
  clearUIMenus();
  for (const menu of menus) {
    addUIMenu(menu);
  }
};

document
  .querySelector("#test-connection")
  .addEventListener("click", testConnection);
document
  .querySelector("#save-connection")
  .addEventListener("click", saveConnection);
document
  .querySelector("#server-input")
  .addEventListener("input", resetConnectionState);
document
  .querySelector("#api-key-input")
  .addEventListener("input", resetConnectionState);
document.querySelector("#add-button").addEventListener("click", () => {
  addUIMenu({ id: crypto.randomUUID(), title: "", collection: "", tags: [] });
});
document
  .querySelector("#save-context-menu")
  .addEventListener("click", saveContextMenuItems);

(async () => {
  const server = await getServer();
  const apikey = await getApiKey();
  const menus = await getMenus();
  const configured = Boolean(server && apikey);

  if (configured) {
    await loadAutocompleteData(server, apikey);
  }

  loadSavedValues(server, apikey, menus);
  setContextMenuEnabled(configured);
})();
