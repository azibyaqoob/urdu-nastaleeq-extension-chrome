// Regex to detect Urdu/Arabic script characters
const urduRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function applyNastaleeq(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (parent && urduRegex.test(node.textContent)) {
            if (!parent.classList.contains('urdu-nastaleeq')) {
                parent.classList.add('urdu-nastaleeq');
            }
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && node.tagName !== 'TEXTAREA') {
            node.childNodes.forEach(applyNastaleeq);
        }
    }
}

// Initial application
applyNastaleeq(document.body);

// Observer to handle dynamic content
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach(applyNastaleeq);
    });
});

observer.observe(document.body, { childList: true, subtree: true });

// Listen for font size changes
chrome.storage.sync.get(['fontSize'], (result) => {
    const size = result.fontSize || 18;
    updateFontSize(size);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateFontSize") {
        updateFontSize(request.size);
    }
});

function updateFontSize(size) {
    let styleEl = document.getElementById('urdu-font-size-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'urdu-font-size-style';
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = `.urdu-nastaleeq { font-size: ${size}px !important; }`;
}
