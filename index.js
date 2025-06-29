// Global state
let storageKey = 'gottapack';

function recursivelyUpdateItems(items, name, newCheckedState) {
    for (const item of items) {
        if (item.name === name) {
            item.is_packed = newCheckedState;
            break;
        }

        if (item.items.length > 0) {
            recursivelyUpdateItems(item.items, name, newCheckedState);
        }
    };
}

// Update the state of a checkbox
function updateCheckedState(checkbox, name) {
    const state = JSON.parse(localStorage.getItem(storageKey));
    
    recursivelyUpdateItems(state, name, checkbox.checked);

    localStorage.setItem(storageKey, JSON.stringify(state));
}

function generateCheckboxItem({ itemName, isPacked, indent, isCollapsed, isCollapsible }) {
    const itemNameWithoutSpaces = itemName.replace(/ /g, '_');

    const li = document.createElement('li');

    // Create the checkbox.
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = itemNameWithoutSpaces;
    checkbox.onclick = function () { updateCheckedState(this, itemNameWithoutSpaces); };
    checkbox.style.marginLeft = `${indent * 3}rem`;
    if (isPacked) checkbox.checked = true;

    // Create the button to collapse the item when possible.
    const collapseButton = document.createElement('button');
    collapseButton.textContent = isCollapsed ? '>' : 'V';
    collapseButton.style.opacity = isCollapsible ? 1 : 0;

    // Create the name of the item.
    const span = document.createElement('span');
    span.textContent = itemName;

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'delete';
    deleteButton.onclick = function () { deleteItem(this); };

    // This is the stuff that goes on the left side of the screen; so, the
    // checkbox and the name of the item.
    const checkboxDiv = document.createElement('div');
    checkboxDiv.style.display    = 'flex';
    checkboxDiv.style.alignItems = 'center';
    checkboxDiv.style.textAlign  = 'center';
    checkboxDiv.style.gap        = '8px';

    checkboxDiv.appendChild(collapseButton);
    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(span);
    li.appendChild(checkboxDiv);
    li.appendChild(deleteButton);

    document.getElementById('packing-list').appendChild(li);
}

function addNewItem() {
    const itemName = document.getElementById('new-item').value;
    if (!itemName) return;

    // If item already exists, do nothing.
    if (document.getElementById(itemName.replace(/ /g, '_'))) return;

    // Add the new item to the document.
    generateCheckboxItem({
        name: itemName,
        isPacked: false,
        indent: 0,
        isCollapsed: false,
        isCollapsible: false
    });

    // Reset the state of the "new item" input.
    document.getElementById('new-item').value = '';

    // Update local storage to have this new item.
    const currentLocalStorage = JSON.parse(localStorage.getItem(storageKey));
    const newLocalStorage = { ...currentLocalStorage, [itemName]: '' };
    localStorage.setItem(storageKey, JSON.stringify(newLocalStorage));

    // TODO: update checked state.
}

// TODO: handle nested items.
function deleteItem(item) {
    const itemName = item.parentElement.querySelector('span').textContent;
    document.getElementById(itemName.replace(/ /g, '_')).checked = false;
    
    // Remove the item from the document.
    item.parentElement.remove();

    // Remove the item from local storage.
    const currentLocalStorage = JSON.parse(localStorage.getItem(storageKey));
    const newLocalStorage = { ...currentLocalStorage };
    delete newLocalStorage[itemName];
    localStorage.setItem(storageKey, JSON.stringify(newLocalStorage));

    // TODO: update checked state
}

function reset() {
    localStorage.removeItem(storageKey);
    location.reload();
}

function recursivelyGenerateCheckboxes(items, indent) {
    items.forEach(({ name, is_packed, is_collapsed, items }) => {
        generateCheckboxItem({
            itemName: name,
            isPacked: is_packed,
            indent,
            isCollapsed: is_collapsed,
            isCollapsible: items.length > 0,
        });

        if (items.length > 0) {
            recursivelyGenerateCheckboxes(items, indent + 1);
        }
    });
};

async function init() {
    window.reset = reset;
    window.addNewItem = addNewItem;
    
    // `page` refers to the different pages that have starter packs for different kinds of outings.
    // e.g. /dog, /backpacking, etc.
    const page = window.location.pathname.replaceAll('/', '');
    if (page) {
        storageKey += '-' + page;
    }

    // See defaultItems.json for schema. 
    const storedItems = localStorage.getItem(storageKey);

    // If we are loading a page that already has some stored items in its local storage from an
    // existing session, then we're going to want to populate the document with the state.
    if (storedItems) {
        const items = JSON.parse(storedItems);
        recursivelyGenerateCheckboxes(items, 0);
    }
    // If we are loading a page that has no state in its localstorage for gottapack, then we want
    // to initialize the document with the defaultItems.
    else {
        const res = await fetch(`./defaultItems.json`);
        const defaultItems = await res.json();

        recursivelyGenerateCheckboxes(defaultItems, 0);

        localStorage.setItem(storageKey, JSON.stringify(defaultItems));
    }

    // TODO: update checked state
}