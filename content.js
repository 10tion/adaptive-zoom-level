const { screen: { height, width } } = window;

// Notify service worker about current screen size on page initialization.
chrome.runtime.sendMessage({ action: "updateDisplayInfo", displayInfo: { height: height, width: width }});

// Listen to service worker for new screen size query.
// 
// This usually happens when display changes and service worker does not know
// the new size.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { screen: { height, width } } = window;
    if (request.action === 'getDisplayInfo') {
        sendResponse({ displayInfo: { height: height, width: width }});
    }
    return true;
});