// ----------------------------------------------------------------------------------------------------
// Global state
// ----------------------------------------------------------------------------------------------------

/**
 * storageKey is the key by which you can access the program state within local
 * storage. The schema for the program state is:
 *  
 * storageKey: {
 *   itemName1: boolean;
 *   itemName2: boolean;
 *   ...
 *   itemNameN: boolean;
 * }
 *
 * The need for a storage key arises from there being mulitple potential lists one
 * can store locally. Think about the different paths of /dog, /backpacking, etc.
 * In those cases, the storageKey is mutated into `${gottapack}-${path}`; so,
 * gottapack-dog, gottapack-backpacking, etc. The default page / does not mutate the
 * storageKey, and therefore is accessed as "gottapack".
 */
let storageKey = 'gottapack';

/** Websocket connection */
let ws; 

// ----------------------------------------------------------------------------------------------------
// Functions
// ----------------------------------------------------------------------------------------------------

function toggleCheckbox(checkboxElement) {
    const itemName = checkboxElement.id.replace(/-/g, ' ');  
    const newCheckboxState = checkboxElement.checked;
   
    updateClientState(itemName, newCheckboxState);
    updateApplicationState(itemName, newCheckboxState, true);
}

/**
 * updateApplicationState updates the underlying state of the program. This is in constrast to updating the physical checkboxes.
 *
 * @param itemName:        string, "toothbrush" or "hair brush"
 * @param newCheckedState: boolean, true when checking a previously unchecked box. false when checking a previously checked box.
 * @param broadcast:       boolean, true when all other clients should know about update, false when that info should not be shared. In practice, broadcast should be true only when a user pressed the checkbox themselves, and all other users should be updated. In other words, if should be false when getting updated about other users' actions. If these updates from other clients are also broadcast, you will get a recursive loop of sending.      
 */
function updateApplicationState(itemName, newCheckedState, broadcast = false) {
    const oldLocalStorage = JSON.parse(localStorage.getItem(storageKey));

    const newStateObject = { [itemName]: newCheckedState };
    const newStateString = JSON.stringify({ ...oldLocalStorage, ...newStateObject });
    localStorage.setItem(storageKey, newStateString);
    if (broadcast) {
        ws.send(JSON.stringify(newStateObject));
    }

    const checkboxes = document.getElementById('packing-list').querySelectorAll('input[type="checkbox"]');
    const areAllCheckboxesChecked = [...checkboxes].every(checkbox => checkbox.checked);
    document.getElementById('all-packed').checked = areAllCheckboxesChecked;
}

function updateClientState(itemName, newCheckedState) {
    // Update the actual checkbox.
    const itemNameAsCheckboxId = itemName.replace(/ /g, '-');
    const checkboxElement = document.getElementById(itemNameAsCheckboxId);
    checkboxElement.checked = newCheckedState;

    // See if all of the checkboxes are checked now. If so, check the "All packed" checkbox.
    const checkboxes = document.getElementById('packing-list').querySelectorAll('input[type="checkbox"]');
    const areAllCheckboxesChecked = [...checkboxes].every(checkbox => checkbox.checked);
    document.getElementById('all-packed').checked = areAllCheckboxesChecked;
}

function checkOrUncheckAll() {
    const checkboxes = document.getElementById('packing-list').querySelectorAll('input[type="checkboxchecked"]');
    const allAreChecked = [...checkboxes].every(checkbox => checkbox.checked);
    const someAreChecked = [...checkboxes].some(checkbox => checkbox.checked);
    const noneAreChecked = !someAreChecked;

    const oldLocalStorage = JSON.parse(localStorage.getItem(storageKey));
    let newLocalStorage = {};
    // if all checkboxes are currently checked, then uncheck them all
    if (allAreChecked) { 
        [...checkboxes].forEach(checkbox => checkbox.checked = false);
        Object.entries(oldLocalStorage).forEach(([key, value]) => { newLocalStorage[key] = false });
    }
    // if only some or none of the checkboxes are currently checked, then check them all      	
    else {
        [...checkboxes].forEach(checkbox => checkbox.checked = true);
        Object.entries(oldLocalStorage).forEach(([key, value]) => { newLocalStorage[key] = true });
    }
    
    localStorage.setItem(storageKey, JSON.stringify(newLocalStorage));
}

/**
 * @param itemNameWithSpaces: string, "toothbrush" or "hair brush"
 * @param isPacked:           boolean   
 */
function generateCheckboxItem(itemNameWithSpaces, isPacked, broadcast = false) {
    const itemName = itemNameWithSpaces;
    const itemNameAsCheckboxId = itemName.replace(/ /g, '-');

    const li = document.createElement('li');

    const checkbox   = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.id      = itemNameAsCheckboxId;
    checkbox.onclick = () => { toggleCheckbox(checkbox) }; 
    checkbox.checked = isPacked;

    const label       = document.createElement('label');
    label.textContent = itemName;
    label.for         = itemNameAsCheckboxId;

    const button       = document.createElement('button');
    button.textContent = 'delete';
    button.onclick     = function () { deleteItem(checkbox); };

    const checkboxDiv            = document.createElement('div');
    // TODO: should probably just give this div a class and have the styles for it in a stylesheet.
    checkboxDiv.style.display    = 'flex';
    checkboxDiv.style.alignItems = 'center';
    checkboxDiv.style.textAlign  = 'center';

    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(label);
    li.appendChild(checkboxDiv);
    li.appendChild(button);

    document.getElementById('packing-list').appendChild(li);
}

// TODO: this is a potential XSS site. 
function addNewItem() {
    const defaultNewItemPackedState = false;

    // Get the new item name from the name text input.
    const itemName = document.getElementById('new-item').value;

    // If the item name text input is empty, do nothing.
    if (!itemName) return;

    // If item already exists, do nothing.
    const itemNameAsCheckboxId = itemName.replace(/ /g, '-');  
    if (document.getElementById(itemNameAsCheckboxId)) return;

    generateCheckboxItem(itemName, defaultNewItemPackedState, true);

    // Clear the new item name text input.
    document.getElementById('new-item').value = '';

    const oldLocalStorage = JSON.parse(localStorage.getItem(storageKey));
    const newLocalStorage = { ...oldLocalStorage, [itemName]: defaultNewItemPackedState };
    
    localStorage.setItem(storageKey, JSON.stringify(newLocalStorage));
    ws.send(JSON.stringify({ [itemName]: defaultNewItemPackedState }));
}

// TODO: might be nice to pop an "are you sure" thing up.
function deleteItem(checkboxElement) {
    const itemName = checkboxElement.id.replace(/ /g, '-');  
    checkboxElement.parentElement.parentElement.remove();

    // TODO: I keep seeing this pattern of getting the old local state and updating to a new state and sending the update over websockets. Probably a good idea to extract that to a function?
    const oldLocalStorage = JSON.parse(localStorage.getItem(storageKey));
    const newLocalStorage = { ...oldLocalStorage };
    delete newLocalStorage[itemName];
    localStorage.setItem(storageKey, JSON.stringify(newLocalStorage));
    // TODO: how will we transmit deletions? 
}

// TODO: might be nice to pop an "are you sure" thing up.
function reset() {
    localStorage.removeItem(storageKey);
    location.reload();
    // TODO: how will we transmit resetting?
}

async function init() {
    window.reset = reset;
    window.addNewItem = addNewItem;
    
    const page = window.location.pathname.replaceAll('/', '');
    if (page) {
        storageKey += '-' + page;
    }

    // Store in the form
    // "gottapack": {
    //   "brush":  true,
    //   "phone":  true,
    //   "wallet": false,
    // };
    //
    // If on a specific page like /dog, suffix the storageKey
    // "gottapack-dog": {
    //   "poop bags": false,
    //   "treats":    true,
    // }
    // ... 
    const storedItems = localStorage.getItem(storageKey);

    if (storedItems) {
        const itemNames = [];
        const items = JSON.parse(storedItems);
        Object.entries(items).forEach(([itemName, isPacked]) => {
            itemNames.push(itemName);
            generateCheckboxItem(itemName, isPacked);
        });
    } else {
        const res = await fetch(`./defaultItems.json`);
        const defaultItems = await res.json();

        const freshLocalState = {};
        defaultItems.forEach(itemName => {
            generateCheckboxItem(itemName, false);
            freshLocalState[itemName] = false;
        });

        localStorage.setItem(storageKey, JSON.stringify(freshLocalState));
    }

    // Websocket stuff
    ws = new WebSocket(`http://${window.location.host}/ws`); 
    ws.onmessage = (event) => {
	const messageData = JSON.parse(event.data);
	const itemName = Object.keys(messageData)[0]; 
	const isPacked = Object.values(messageData)[0]; 
       
	// TODO: should these even be separate at this point? I don't even remember why I separated them in the first place.
	updateClientState(itemName, isPacked);
	updateApplicationState(itemName, isPacked);
    }
}

