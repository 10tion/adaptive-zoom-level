const contentLoadConfigurations = () => {
    chrome.runtime.sendMessage({ action: "load" }, response => {
        if (!!response.configs) {
            renderPage(response.configs);
        }
        if (!!response.exceptions) {
            renderExceptions(response.exceptions);
        }
    });
}

const contentSaveConfigurations = () => {
    chrome.runtime.sendMessage({ action: "save", configs: getPageData(), exceptions: getExceptions() }, response => {
        const saveResult = document.getElementById("saveResult");
        if (response.status === "success") {
            saveResult.textContent = "Saved!";
            setTimeout(() => {
                saveResult.textContent = "";
            }, 3000);
        } else {
            saveResult.textContent = "Save failed. See console for details.";
        }
    });
}

const deleteCurrentRow = (event) => {
    let td = event.target.parentNode;
    let tr = td.parentNode;
    tr.parentNode.removeChild(tr);
}

const addNewRow = (res, zoomLevel) => {
    let table = document.getElementById("configurations");
    let row = table.insertRow(-1);
    let deleteButton = document.createElement('input');
    deleteButton.type = "button";
    deleteButton.value = "Delete";
    deleteButton.onclick = deleteCurrentRow;

    row.insertCell(0).innerText = res;
    row.insertCell(1).innerText = zoomLevel;
    row.insertCell(2).appendChild(deleteButton);
}

const addNewExceptionRow = (exception) => {
    let table = document.getElementById("exceptions");
    let row = table.insertRow(-1);
    let deleteButton = document.createElement('input');
    deleteButton.type = "button";
    deleteButton.value = "Delete";
    deleteButton.onclick = deleteCurrentRow;

    row.insertCell(0).innerText = exception;
    row.insertCell(1).appendChild(deleteButton);
}

const renderPage = (configs) => {
    for (const [res, zoomLevel] of Object.entries(configs)) {
        addNewRow(res, zoomLevel);
    }
}

const renderExceptions = (exceptions) => {
    for (const exception of exceptions) {
        addNewExceptionRow(exception);
    }
}

const getPageData = () => {
    let table = document.getElementById("configurations");
    let configs = {}
    for (let i = 1, row; row = table.rows[i]; i++) {
        configs[row.cells[0].innerText] = row.cells[1].innerText;
    }
    return configs;
}

const getExceptions = () => {
    let table = document.getElementById("exceptions");
    let exceptions = []
    for (let i = 1, row; row = table.rows[i]; i++) {
        exceptions.push(row.cells[0].innerText);
    }
    return exceptions;
}

const addConfiguration = () => {
    let newRes = document.getElementById("newResolution").value;
    let newZoomLevel = document.getElementById("newZoomLevel").value;
    addNewRow(newRes, newZoomLevel);

    document.getElementById("newResolution").value = "";
    document.getElementById("newZoomLevel").value = "";
}

const addException = () => {
    let newException = document.getElementById("newException").value;
    addNewExceptionRow(newException);
    document.getElementById("newException").value = "";
}

const detectDisplay = () => {
    const { screen: { height, width } } = window;
    document.getElementById("newResolution").value = width + "x" + height;
}

contentLoadConfigurations();

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("addNewConfigButton").addEventListener("click", addConfiguration);
    document.getElementById("addExceptionButton").addEventListener("click", addException);
    document.getElementById("detectDisplay").addEventListener("click", detectDisplay);
    document.getElementById("save").addEventListener("click", contentSaveConfigurations);
});