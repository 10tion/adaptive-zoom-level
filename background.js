const isChrome = chrome.runtime.getURL('').startsWith('chrome-extension://');

const isInBlockList = (tab) => {
    const blockList = ['https://music.youtube.com', 'https://keep.google.com', 'https://photos.google.com/', 'http://192.168.68.67:8080'];
    if (!tab || !tab.url)
        return true;
    if (tab.url.includes('127.0.0.1'))
        return true;
    for (const block of blockList) {
        if (tab.url.startsWith(block)) {
            return true;
        }
    }
    return false;
}

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
        setZoomLevel();
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
        if (isInBlockList(tab))
            return;

        let zoomLevelF = zoomLevel / 100;
        chrome.tabs.getZoom(tab.id).then((curZoomLevelF) => {
            if (Math.abs(curZoomLevelF - zoomLevelF) > 0.0001) {
                chrome.tabs.setZoom(tab.id, zoomLevelF);
            }
        }).catch((err) => {
            console.log("Failed to fetch current zoom settings: ", err);
            chrome.tabs.setZoom(tab.id, zoomLevelF);
        });
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
        if (tab && tab.url && (tab.url.startsWith("chrome://") || tab.url.startsWith("localhost:")))
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