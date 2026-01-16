const fontSizeInput = document.getElementById('fontSize');
const sizeVal = document.getElementById('sizeVal');
const resetBtn = document.getElementById('resetBtn');

// Load current settings
chrome.storage.sync.get(['fontSize'], (result) => {
    const currentSize = result.fontSize || 18;
    fontSizeInput.value = currentSize;
    sizeVal.textContent = currentSize;
});

// Handle change
fontSizeInput.addEventListener('input', (e) => {
    const size = e.target.value;
    sizeVal.textContent = size;
    chrome.storage.sync.set({ fontSize: size });

    // Send message to active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "updateFontSize", size: size });
        }
    });
});

// Reset
resetBtn.addEventListener('click', () => {
    const defaultSize = 18;
    fontSizeInput.value = defaultSize;
    sizeVal.textContent = defaultSize;
    chrome.storage.sync.set({ fontSize: defaultSize });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "updateFontSize", size: defaultSize });
        }
    });
});
