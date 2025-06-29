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
    const newCheckedState = checkbox.checked;
    
    const state = JSON.parse(localStorage.getItem(storageKey));
    
    recursivelyUpdateItems(state, name, newCheckedState);

    localStorage.setItem(storageKey, JSON.stringify(state));
}

function generateCheckboxItem(itemName, isPacked) {
    const itemNameWithoutSpaces = itemName.replace(/ /g, '_');

    const li = document.createElement('li');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = itemNameWithoutSpaces;
    // TODO: redefine this
    checkbox.onclick = function () { updateCheckedState(this, itemNameWithoutSpaces); };
    if (isPacked) checkbox.checked = true;

    const span = document.createElement('span');
    span.textContent = itemName;

    const button = document.createElement('button');
    button.textContent = 'delete';
    button.onclick = function () { deleteItem(this); };

    // This is the stuff that goes on the left side of the screen; so, the
    // checkbox and the name of the item.
    const checkboxDiv = document.createElement('div');
    checkboxDiv.style.display    = 'flex';
    checkboxDiv.style.alignItems = 'center';
    checkboxDiv.style.textAlign  = 'center';

    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(span);
    li.appendChild(checkboxDiv);
    li.appendChild(button);

    document.getElementById('packing-list').appendChild(li);
}

function addNewItem() {
    const itemName = document.getElementById('new-item').value;
    if (!itemName) return;

    // If item already exists, do nothing.
    if (document.getElementById(itemName.replace(/ /g, '_'))) return;

    // Add the new item to the document.
    generateCheckboxItem(itemName, false);

    // Reset the state of the "new item" input.
    document.getElementById('new-item').value = '';

    // Update local storage to have this new item.
    const currentLocalStorage = JSON.parse(localStorage.getItem(storageKey));
    const newLocalStorage = { ...currentLocalStorage, [itemName]: '' };
    localStorage.setItem(storageKey, JSON.stringify(newLocalStorage));

    // TODO: update checked state.
}

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

function recursivelyGenerateCheckboxes(items) {
    items.forEach(({ name, is_packed, items }) => {
        generateCheckboxItem(name, is_packed);

        if (items.length > 0) recursivelyGenerateCheckboxes(items)
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

    // Store in the form
    // "gottapack": [
    //    {
    //        "name": "pkw",
    //        "is_packed": false,
    //        "items": []
    //    },
    //    {
    //        "name": "backpack",
    //        "is_packed": false,
    //        "items": [
    //            {
    //                "name": "sunglasses",
    //                "is_packed": false,
    //                "items": []
    //            },
    //     ...
    // ];
    // 
    // See defaultItems.json for a fuller understanding of the schema. 
    const storedItems = localStorage.getItem(storageKey);

    // If we are loading a page that already has some stored items in its local storage from an
    // existing session, then we're going to want to populate the document with the state.
    if (storedItems) {
        const items = JSON.parse(storedItems);
        recursivelyGenerateCheckboxes(items);
    }
    // If we are loading a page that has no state in its localstorage for gottapack, then we want
    // to initialize the document with the defaultItems.
    else {
        const res = await fetch(`./defaultItems.json`);
        const defaultItems = await res.json();

        recursivelyGenerateCheckboxes(defaultItems);

        localStorage.setItem(storageKey, JSON.stringify(defaultItems));
    }

    // TODO: update checked state
}