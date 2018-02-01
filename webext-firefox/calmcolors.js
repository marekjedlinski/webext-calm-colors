'use strict';

const CSS_NODE_ID = 'tonedown-css-theme-override';
const CSS_THEME_ID = 'data-tonedown-theme';

const requestApplyFile = 'apply-file';
const requestDropTheme = 'no-theme';
const requestQueryTheme = 'query-theme';


browser.runtime.onMessage.addListener(request => {
    const response = {
        msg: 'ok'
    }
    switch (request.command) {
        case requestApplyFile:
            applyCssScheme(request.scheme);
            break;
        case requestDropTheme:
            removeCssScheme();
            break;
        case requestQueryTheme:
            // if no theme is applied, an empty string will be returned
            response.theme = getThemeState();
            break;
        default:
            response.msg = `unrecognized command ${request.command}`;
            console.warn(response.msg);
    }
    return Promise.resolve(response);
});

function applyCssScheme(schemeFile) {
    const head = getDocumentHead();
    const oldCssNode = findCssNode();
    if (oldCssNode && oldCssNode.tagName.toLowerCase() === 'link') {
        // If we applied a style previously,
        // we can change the contents of its href attribute
        updateCssNode(oldCssNode, schemeFile);
    } else {
        // old node does not exist or is a <style> node, not a <link> node.
        // first add a new one, then remove the old one, if it exists.
        const newCssNode = createLinkNode(schemeFile);
        head.appendChild(newCssNode);
        // remove the old one, if exists
        if (oldCssNode) {
            removeCssNode(oldCssNode);
        }
    }
}

function getThemeState() {
    // returns id of currently applied theme,
    // or an empty string if no theme is applied
    let currentTheme = '';
    const cssNode = findCssNode();
    if (cssNode) {
        // return 'no-data' if we have the node but do not have the attribute
        // (should bever happen)
        // Instead of duplicating theme knowledge in CSS_THEME_ID attribute,
        // we could derive it from the href attribute. And when theme is applied
        // via <style>, there would only be one id: 'custom'.
        currentTheme = cssNode.getAttribute(CSS_THEME_ID) || 'no-data';
    }
    return currentTheme;
}

function updateCssNode(cssNode, themeName) {
    // add href attribute to css file and a data attribute to keep track of theme id
    const cssThemeFile = getCssSchemeUrl(themeName);
    cssNode.setAttribute('href', cssThemeFile);
    cssNode.setAttribute(CSS_THEME_ID, themeName);
}

function findCssNode() {
    const head = getDocumentHead();
    return head.querySelector(`#${CSS_NODE_ID}`);
}

function createLinkNode(themeFileName) {
    const linkNode = document.createElement('link');
    linkNode.setAttribute('type', 'text/css');
    linkNode.setAttribute('rel', 'stylesheet');
    linkNode.setAttribute('id', CSS_NODE_ID);
    if (themeFileName) {
        updateCssNode(linkNode, themeFileName);
    }
    return linkNode;
}

function removeCssScheme() {
    removeCssNode();
}

function removeCssNode(oldNode) {
    // node to be removed can be specified as a parameter.
    // If not specified, we try to find it.
    const nodeToRemove = oldNode || findCssNode();
    if (nodeToRemove) {
        nodeToRemove.parentElement.removeChild(nodeToRemove);
    }
}


function getDocumentHead() {
    let head = document.head;
    if (!head) {
        head = document.createElement('head');
        document.insertBefore(document.body, head);
    }
    return head;
}
function getCssSchemeUrl(scheme) {
    return browser.runtime.getURL(`css/${scheme}.css`);
}
