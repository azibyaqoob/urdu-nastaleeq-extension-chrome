const globalEnable = document.getElementById('globalEnable');
const siteEnable = document.getElementById('siteEnable');
const fontSelect = document.getElementById('fontSelect');
const fontSizeInput = document.getElementById('fontSize');
const sizeVal = document.getElementById('sizeVal');
const compatMode = document.getElementById('compatMode');
const resetBtn = document.getElementById('resetBtn');

let currentHost = "";

// Get current tab info
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
        try {
            const url = new URL(tabs[0].url);
            currentHost = url.hostname;
        } catch (e) {
            console.error("Invalid URL", tabs[0].url);
        }
    }

    // Load settings
    chrome.storage.sync.get(['globalEnable', 'siteSettings', 'fontSize', 'fontFamily', 'compatMode'], (result) => {
        globalEnable.checked = result.globalEnable !== false;

        const siteSettings = result.siteSettings || {};
        siteEnable.checked = siteSettings[currentHost] !== false;

        fontSelect.value = result.fontFamily || "Noto Nastaliq Urdu";
        fontSizeInput.value = result.fontSize || 18;
        sizeVal.textContent = (result.fontSize || 18) + "px";
        compatMode.checked = result.compatMode === true;
    });
});

function saveSettings() {
    const settings = {
        globalEnable: globalEnable.checked,
        fontFamily: fontSelect.value,
        fontSize: fontSizeInput.value,
        compatMode: compatMode.checked
    };

    chrome.storage.sync.get(['siteSettings'], (result) => {
        const siteSettings = result.siteSettings || {};
        siteSettings[currentHost] = siteEnable.checked;
        settings.siteSettings = siteSettings;

        chrome.storage.sync.set(settings, () => {
            // Update the active tab immediately
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "updateSettings",
                        settings: settings,
                        isSiteEnabled: siteEnable.checked
                    });
                }
            });
        });
    });
}

// Event Listeners
globalEnable.addEventListener('change', saveSettings);
siteEnable.addEventListener('change', saveSettings);
fontSelect.addEventListener('change', saveSettings);
fontSizeInput.addEventListener('input', (e) => {
    sizeVal.textContent = e.target.value + "px";
    saveSettings();
});
compatMode.addEventListener('change', saveSettings);

resetBtn.addEventListener('click', () => {
    const defaultSettings = {
        globalEnable: true,
        fontFamily: "Noto Nastaliq Urdu",
        fontSize: 18,
        compatMode: false
    };

    globalEnable.checked = defaultSettings.globalEnable;
    fontSelect.value = defaultSettings.fontFamily;
    fontSizeInput.value = defaultSettings.fontSize;
    sizeVal.textContent = defaultSettings.fontSize + "px";
    compatMode.checked = defaultSettings.compatMode;
    siteEnable.checked = true;

    saveSettings();
});
