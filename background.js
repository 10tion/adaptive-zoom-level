const isChrome = chrome.runtime.getURL('').startsWith('chrome-extension://');

const loadConfigurations = () => {
    return chrome.storage.local.get(["configs", "exceptions"]);
}

const saveConfigurations = (configs, exceptions) => {
    return chrome.storage.local.set({ configs: configs, exceptions: exceptions }).then(() => {
        console.log("Configuration saved.");
        resUAMap = new Map(Object.entries(configs));
        exceptionsList = Array.from(exceptions);
    });
}

let resUAMap = new Map();
let exceptionsList = new Array();

let currentDisplay = { height: 0, width: 0 }

loadConfigurations().then((result) => {
    if (!!result.configs) {
        resUAMap = new Map(Object.entries(result.configs));
    }
    if (!!result.exceptions) {
        exceptionsList = Array.from(result.exceptions);
    }
    setZoomLevel();
});

const isInExceptionsList = (tab) => {
    if (!tab || !tab.url)
        return true;
    for (const exception of exceptionsList) {
        if (tab.url.startsWith(exception)) {
            return true;
        }
    }
    return false;
}

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
        if (isInExceptionsList(tab))
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
        saveConfigurations(request.configs, request.exceptions)
            .then(() => {
                setZoomLevel();
                sendResponse({ status: "success" });
            })
            .catch(error => {
                console.error("Failed to save configurations:", error);
                sendResponse({ status: "failure", error: error.message });
            });
    } else if (request.action === "load") {
        loadConfigurations().then((res) => sendResponse({configs: res.configs, exceptions: res.exceptions}));
    } else if (request.action === "updateDisplayInfo") {
        if (request.displayInfo.height != currentDisplay.height || request.displayInfo.width != currentDisplay.width) {
            currentDisplay = request.displayInfo;
        }
        setZoomLevel();
    }
    return true;
});

setZoomLevel();