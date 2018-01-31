'use strict';

// Firefox defines both 'browser' and 'chrome'.
// Chrome only defines 'chrome'
const browserIsChrome = !browser;
if  (browserIsChrome) {
  var browser = chrome;
}

const prefix = 'tonedown-';
const commandApply = 'apply';
const commandRemove = 'remove';

const menuThemes = [
    makeDefaultThemeItem(),
    ...makeStandardThemeItems(),
    makeRemoveThemeItem()
];
buildContextMenuItems();


function buildContextMenuItems() {
    const itemContexts = ['page', 'frame', 'selection', 'link', 'image'];

    for (let theme of menuThemes) {
        if (theme.command === commandApply) {
            // theme items
            chrome.contextMenus.create({
                id: theme.menuItemId,
                title: theme.menuLabel,
                contexts: itemContexts,
                onclick: handleThemeApplyClick,
                // in Chrome we cannot update checked state of an item,
                // so we do not use checks at all
                type: 'normal',
                checked: false,
            });
        } else if (theme.command === commandRemove) {
            // separator
            chrome.contextMenus.create({
                contexts: itemContexts,
                type: 'separator'
            });

            // No theming, remove theme
            chrome.contextMenus.create({
                id: theme.menuItemId,
                title: theme.menuLabel,
                contexts: itemContexts,
                onclick: handleThemeRemoveClick,
                type: 'normal',
                checked: true,
            });
        }
    }
}

function sendLoadThemeRequest(tabId, themeName) {
    if (tabId && themeName) {
        chrome.tabs.sendMessage(tabId,
        {
            command: 'apply',
            scheme: themeName
        });
    }
}

function findMenuItemFromThemeName(themeName) {
    // takes a theme name (e.g. from storage) and returns the menu item id
    // associated with this theme
    const themeItem = menuThemes.find(item => {
        return themeName === item.themeName;
    });
    if (themeItem) {
        return themeItem.menuItemId;
    }
    console.error('Could not find menu item for', themeName);
    return '';
 }

function findThemeNameFromMenuItem(menuItemId) {
    // takes a menu item id and returns the theme namme
    // (which identifies the css filename or - in the future - a custom theme)
    const themeItem = menuThemes.find(item => {
        return item.menuItemId === menuItemId;
    });
    if (themeItem) {
        return themeItem.themeName;
    }
    console.error('Could not find theme item', menuItemId);
    return '';
}

function handleThemeApplyClick(info, tab) {
    sendLoadThemeRequest(tab.id, findThemeNameFromMenuItem(info.menuItemId));
}

function handleThemeRemoveClick(info, tab) {
    // remove theme (restore original page styles)
    chrome.tabs.sendMessage(tab.id,
    {
        command: 'remove'
    });
}


function makeDefaultThemeItem() {
    if (browserIsChrome) {
        return makeThemeItem('chrome-default', 'Default', 'file');
    }
    return makeThemeItem('moz-default', 'Default', 'file');
}

function makeStandardThemeItems() {
    return [
        makeThemeItem('light', 'Light', 'file'),
        makeThemeItem('sepia', 'Sepia', 'file'),
        makeThemeItem('dark', 'Dark', 'file')
    ];
}

function makeRemoveThemeItem() {
    return makeThemeItem('remove', 'No Theme', '', commandRemove);
}

function makeThemeItem(themeName, themeLabel, themeType, itemCommand=commandApply) {
    return {
        menuItemId: prefix + themeName, // unique identifier for context menu item
        menuLabel: themeLabel, // user-friendly label for the menu item
        themeName: themeName, // name of css file (sans 'css')
        type: themeType, // 'file' or, later 'custom'
        command: itemCommand // menu item action: apply or remove theme
    };
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
