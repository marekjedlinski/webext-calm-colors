'use strict';

// Firefox defines both 'browser' and 'chrome'.
// Chrome only defines 'chrome'
const browserIsChrome = !browser;
const browserDefaultTheme = browserIsChrome ? 'chrome-default' : 'moz-default';
if  (browserIsChrome) {
  var browser = chrome;
}

// prefix for menu items
const prefix = 'tonedown';
// actions for menu items
const actionApplyFile = 'apply-file';
const actionDropTheme = 'no-theme';
const actionQueryTheme = 'query-theme';

// we must keep track of items we create,
// because webext API does not provide a way to query context menu items
const themeActions = makeThemeItems();
buildContextMenuItems();

browser.tabs.onUpdated.addListener(handleTabUpdated);
browser.tabs.onActivated.addListener(handleTabActivated);


function handleTabUpdated(tabId, changeInfo, tabInfo) {
    if (changeInfo.status && changeInfo.status === 'complete') {
        // [x] update menu state ONLY if the updated tab is the currently active tab
        // (the updated tab may be a background tab, in which case we should not update the menu)
        if (tabInfo.active) {
            updateMenuItemStates(tabId);
        }
    }
}

function handleTabActivated(activeInfo) {
    // updateMenuItemStates() needs to send a message to find out which theme is active,
    // if any, on this tab. but, onActivated is also fired for opening a new tab,
    // and our content script does not run on a new tab page (or any about: URLs).
    // We *could* check for this here, but in the end updateMenuItemStates() will still
    // do the correct thing in .catch() when IT gets the error.
    updateMenuItemStates(activeInfo.tabId);
/*
    browser.tabs.get(activeInfo.tabId)
        .then(tab => {
            if (tab.url.startsWith('about')) {
                checkActiveMenuItem(actionDropTheme);
            } else {
                updateMenuItemStates(activeInfo.tabId);
            }
        })
        .catch(error => {
            checkActiveMenuItem(actionDropTheme);
        });
*/
}


function buildContextMenuItems() {
    const itemContexts = ['page', 'frame', 'selection', 'link', 'image'];
    for (let item of themeActions) {
        if (item.sep) {
            browser.contextMenus.create({
                contexts: itemContexts,
                type: 'separator',
            });
        }
        browser.contextMenus.create({
            id: item.menuItemId,
            title: item.menuItemLabel,
            contexts: itemContexts,
            onclick: handleThemeClick,
            type: 'checkbox',
            checked: item.action === actionDropTheme, // "No Theme" is initially checked
        });
    }
}

function handleThemeClick(info, tab) {
    const action = findActionFromMenuItem(info.menuItemId);
    if (action) {
        sendThemeRequest(tab.id, action.action, action.itemId);
    }
}

function sendThemeRequest(tabId, actionName, itemName) {
    if (tabId && actionName) {
        browser.tabs.sendMessage(tabId, {
            command: actionName,
            scheme: itemName,
        }).then(() => {
            updateMenuItemStates(tabId);
        }).catch(error => {
            // console.error('error in sendThemeRequest', error);
            // this happens when we cannot send the message, e.g. when current tab is about:blank
            // In this case updateMenuItemStates() will fail too, since it also sends a message to tab.
            checkActiveMenuItem(actionDropTheme);
        });
    }
}

function updateMenuItemStates(tabId) {
    if (browserIsChrome) return; // updating 'checked' does not currently work in Chrome
    browser.tabs.sendMessage(tabId, {
        command: actionQueryTheme,
    }).then(response => {
        // if no theme is applied, response.theme is an empty string
        checkActiveMenuItem(response.theme || actionDropTheme);
    }).catch(error => {
        // console.error('error in updateMenuItemStates', error);
        checkActiveMenuItem(actionDropTheme);
    });
}

function checkActiveMenuItem(itemName) {
    if (browserIsChrome) return; // updating 'checked' does not currently work in Chrome
    const menuItemId = findMenuItemFromActionId(itemName);
    setTimeout(function() {
        if (menuItemId) {
            themeActions.forEach(item => {
                const isChecked = menuItemId === item.menuItemId;
                browser.contextMenus.update(item.menuItemId, {checked: isChecked}, function() {
                    // console.log('updated!', item.menuItemId, isChecked);
                });
            })
        }
    }, 100); // minimal timeout appears sufficient for Firefox
}

function findMenuItemFromActionId(itemId) {
    // takes an action id and returns the menu item id
    const action = themeActions.find(item => {
        return itemId === item.itemId;
    });
    if (action) {
        return action.menuItemId;
    }
    console.warn('Could not find menu item for', itemId);
    return '';
 }

function findActionFromMenuItem(menuItemId) {
    // takes a menu item id and returns the action
    const action = themeActions.find(item => {
        return item.menuItemId === menuItemId;
    });
    if (!action) {
        console.warn('Could not find action for', menuItemId);
    }
    return action;
}



function makeThemeItem(itemId, itemLabel, itemAction, sep=false) {
    return {
        menuItemId: `${prefix}-${itemAction}-${itemId}`, // unique identifier for context menu item
        menuItemLabel: itemLabel, // user-friendly label for the menu item
        itemId: itemId, // name of css file (sans 'css'), or 'drop'
        action: itemAction, // load theme, drop theme
        sep: sep,
    };
}

function makeThemeItems() {
    return [
        makeThemeItem(browserDefaultTheme, 'Default', actionApplyFile),
        makeThemeItem('light', 'Light', actionApplyFile),
        makeThemeItem('sepia', 'Sepia', actionApplyFile),
        makeThemeItem('dark', 'Dark', actionApplyFile),
        makeThemeItem(actionDropTheme, 'No Theme', actionDropTheme, true),
    ];
}


// https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
function extractHostname(url) {
    let hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname
    if (url.indexOf("://") > -1) {
        hostname = url.split('/')[2];
    }
    else {
        hostname = url.split('/')[0];
    }
    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];
    return hostname;
}


