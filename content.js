// Comprehensive Urdu/Arabic script regex
const urduRegexRange = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\FB50-\uFDFF\uFE70-\uFEFF]+/;
const urduLettersOnly = /[\u0621-\u064A\u0671-\u06D3\u06D5\u06F0-\u06F9]/;

let extensionSettings = {
    globalEnable: true,
    fontFamily: "Noto Nastaliq Urdu",
    fontSize: 18,
    compatMode: false,
    isSiteEnabled: true
};

let isWokenUp = false;

/**
 * Lazy activation: Only injects fonts and core styles if confirmed Urdu is found.
 */
function wakeUp() {
    if (isWokenUp) return;
    isWokenUp = true;

    const extensionId = chrome.runtime.id;
    const fontFaces = `
        @font-face {
            font-family: 'Noto Nastaliq Urdu';
            font-style: normal;
            font-weight: 400;
            src: url('chrome-extension://${extensionId}/fonts/NotoNastaliqUrdu-Regular.ttf') format('truetype');
            unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        @font-face {
            font-family: 'Noto Nastaliq Urdu';
            font-style: normal;
            font-weight: 700;
            src: url('chrome-extension://${extensionId}/fonts/NotoNastaliqUrdu-Bold.ttf') format('truetype');
            unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        @font-face {
            font-family: 'Jameel Noori Nastaleeq';
            src: url('chrome-extension://${extensionId}/fonts/JameelNooriNastaleeq.ttf') format('truetype');
            unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        @font-face {
            font-family: 'Gulzar';
            src: url('chrome-extension://${extensionId}/fonts/Gulzar-Regular.ttf') format('truetype');
            unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        span.urdu-nastaleeq {
            /* Basic resets to prevent English layout shifts */
            display: inline !important;
            unicode-bidi: isolate !important;
            direction: rtl !important;
            margin: 0 !important;
            padding: 0 !important;
            text-rendering: optimizeLegibility !important;
            vertical-align: baseline !important;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'urdu-nastaleeq-core-v19';
    styleEl.textContent = fontFaces;
    document.head.appendChild(styleEl);
}

function applyNastaleeq(node) {
    if (!node) return;

    if (!extensionSettings.globalEnable || !extensionSettings.isSiteEnabled) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const spans = Array.from(node.querySelectorAll('span.urdu-nastaleeq'));
            spans.forEach(span => {
                const parent = span.parentNode;
                if (parent) {
                    while (span.firstChild) parent.insertBefore(span.firstChild, span);
                    parent.removeChild(span);
                    parent.normalize();
                }
            });
        }
        return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text && urduRegexRange.test(text)) {
            const parent = node.parentElement;
            if (!parent || !node.parentNode || !node.isConnected) return;

            // Exclude non-content tags
            if (parent.classList.contains('urdu-nastaleeq') ||
                ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'CODE', 'PRE', 'OPTION'].includes(parent.tagName)) {
                return;
            }

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;
            const globalUrduRegex = new RegExp(urduRegexRange, 'g');
            let hasValidMatch = false;

            while ((match = globalUrduRegex.exec(text)) !== null) {
                const matchedText = match[0];

                // CRITICAL SAFETY 1: Ignore matches that are entirely English/ASCII
                if (/^[a-zA-Z0-9\s!@#$%^&*()_+=\-\[\]{}|\\:;"'<>,.?/`~]+$/.test(matchedText)) continue;

                // CRITICAL SAFETY 2: Ignore segments with no actual Urdu letters/numbers
                if (!urduLettersOnly.test(matchedText)) continue;

                hasValidMatch = true;
                wakeUp(); // Confirmed real Urdu found

                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                }

                if (!extensionSettings.compatMode || matchedText.trim().length >= 2) {
                    const span = document.createElement('span');
                    span.className = 'urdu-nastaleeq';
                    span.textContent = matchedText;
                    fragment.appendChild(span);
                } else {
                    fragment.appendChild(document.createTextNode(matchedText));
                }
                lastIndex = globalUrduRegex.lastIndex;
            }

            if (hasValidMatch) {
                if (lastIndex < text.length) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
                }
                try {
                    node.parentNode.replaceChild(fragment, node);
                } catch (e) { /* Node vanished */ }
            }
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (!['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'CODE', 'PRE', 'OPTION'].includes(node.tagName) &&
            !node.classList.contains('urdu-nastaleeq')) {
            const children = Array.from(node.childNodes);
            children.forEach(applyNastaleeq);
        }
    }
}

function updateStyles() {
    let styleEl = document.getElementById('urdu-font-size-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'urdu-font-size-style';
        document.head.appendChild(styleEl);
    }

    if (!extensionSettings.globalEnable || !extensionSettings.isSiteEnabled) {
        styleEl.textContent = "";
        return;
    }

    const { fontSize, fontFamily } = extensionSettings;
    styleEl.textContent = `
        span.urdu-nastaleeq { 
            font-size: ${fontSize}px !important; 
            font-family: '${fontFamily}', 'Noto Nastaliq Urdu', serif !important;
            line-height: normal !important;
        }
    `;

    applyNastaleeq(document.body);
}

// Init settings
chrome.storage.sync.get(['globalEnable', 'siteSettings', 'fontSize', 'fontFamily', 'compatMode'], (result) => {
    const host = window.location.hostname;
    extensionSettings = {
        globalEnable: result.globalEnable !== false,
        fontFamily: result.fontFamily || "Noto Nastaliq Urdu",
        fontSize: result.fontSize || 18,
        compatMode: result.compatMode === true,
        isSiteEnabled: (result.siteSettings && result.siteSettings[host] !== false)
    };

    if (extensionSettings.globalEnable && extensionSettings.isSiteEnabled) {
        updateStyles();
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateSettings") {
        extensionSettings = request.settings;
        extensionSettings.isSiteEnabled = request.isSiteEnabled;
        updateStyles();
    }
});

const observer = new MutationObserver((mutations) => {
    if (extensionSettings.globalEnable && extensionSettings.isSiteEnabled) {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach(child => {
                if (child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.TEXT_NODE) {
                    applyNastaleeq(child);
                }
            });
        });
    }
});

observer.observe(document.body, { childList: true, subtree: true });
