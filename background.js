const isChrome = chrome.runtime.getURL('').startsWith('chrome-extension://');

const loadConfigurations = () => {
    return chrome.storage.local.get(["configs"]);
}

const saveConfigurations = (configs) => {
    return chrome.storage.local.set({ configs: configs }).then(() => {
        console.log("Configuration saved.");
        resUAMap = new Map(Object.entries(configs));
    });
}

let resUAMap = new Map();

let currentDisplay = { height: 0, width: 0 }

loadConfigurations().then((result) => {
    if (!!result.configs) {
        resUAMap = new Map(Object.entries(result.configs));
    }
});

const getZoomLevel = (width, height) => {
    let res = width + "x" + height;
    if (resUAMap.has(res)) {
        return parseInt(resUAMap.get(res));
    } else {
        return 100;
    }
};

const setZoomLevel = () => {
    let zoomLevel = getZoomLevel(currentDisplay.width, currentDisplay.height);
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => {
        if (chrome.runtime.lastError)
            console.error(chrome.runtime.lastError);
        if (tab && tab.url && tab.url.startsWith("chrome://"))
            return;

        chrome.tabs.setZoom(tab.id, zoomLevel / 100);
        chrome.action.setBadgeText({text: zoomLevel.toString()});
    });
}

// Reset zoom level on any display changes.
//
// Not sure if we really need this.
isChrome && chrome.system.display.onDisplayChanged.addListener(() => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => {
        if (chrome.runtime.lastError)
            console.error(chrome.runtime.lastError);
        if (tab && tab.url && tab.url.startsWith("chrome://"))
            return;

        chrome.tabs.sendMessage(tab.id, { action: "getDisplayInfo" }, response => {
            if (!!response && !!response.displayInfo) {
                currentDisplay = response.displayInfo;
                setZoomLevel();
            }
        });
    });
})

// Communicate with content script and settings.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "save") {
        saveConfigurations(request.configs).then(() => setZoomLevel());
    } else if (request.action === "load") {
        loadConfigurations().then((res) => sendResponse({configs: res.configs}));
    } else if (request.action === "updateDisplayInfo") {
        if (request.displayInfo.height != currentDisplay.height || request.displayInfo.width != currentDisplay.width) {
            currentDisplay = request.displayInfo;
        }
        setZoomLevel();
    }
    return true;
});

setZoomLevel();