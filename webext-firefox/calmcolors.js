'use strict';

const CSS_NODE_ID = 'tonedown-css-theme-override';
const CSS_THEME_ID = 'data-theme';

chrome.runtime.onMessage.addListener(
    function(request) {
        // console.log(window.location);
        switch (request.command) {
            case 'apply':
                applyCssScheme(request.scheme);
                break;
            case 'remove':
                removeCssScheme();
                break;
            default:
                console.log(`tonedown error: unrecognized command ${request.command}`);
        }
    }
);

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
    return chrome.runtime.getURL(`css/${scheme}.css`);
}
