// Comprehensive Urdu/Arabic script regex
const urduRegexRange = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\FB50-\uFDFF\uFE70-\uFEFF\u200C\u200F\u064B-\u065F\u06D6-\u06ED]+/;
const urduLettersOnly = /[\u0621-\u064A\u0671-\u06D3\u06D5\u06F0-\u06F9]/;

let extensionSettings = {
    globalEnable: true,
    fontFamily: "Jameel Noori Nastaleeq",
    fontSize: 24,
    compatMode: false,
    isSiteEnabled: true
};

let isWokenUp = false;

// Known Urdu News Domains
const NEWS_DOMAINS = [
    'jang.com.pk',
    'bbc.com',
    'express.pk',
    'dawn.com',
    'geonews.tv',
    'thenews.com.pk',
    'independenturdu.com',
    'urduvoa.com'
];

// KEYBOARD PROTECTION: Heuristic keywords to identify virtual keyboards
const KEYBOARD_KEYWORDS = ['keyboard', 'keypad', 'virtual', 'kb-', '-kb', 'vk_'];

/**
 * Checks if a node is part of a virtual keyboard or interactive input
 */
function isProtectedElement(node) {
    // 1. Strict Tag Exclusion
    const tag = node.tagName;
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'OPTION', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'IFRAME', 'SVG', 'VIDEO'].includes(tag)) {
        return true;
    }

    // 2. Class Blocklist
    if (node.classList && node.classList.contains('urdu-nastaleeq')) {
        return true;
    }

    // 3. Heuristic Ancestry Check (Limit to 4 levels up for performance)
    let parent = node;
    let levels = 0;
    while (parent && levels < 5 && parent !== document.body) {
        if (parent.id || parent.className) {
            const id = (parent.id || '').toLowerCase();
            const cls = (typeof parent.className === 'string' ? parent.className : '').toLowerCase();

            // Fast check for common keywords
            for (const keyword of KEYBOARD_KEYWORDS) {
                if (id.includes(keyword) || cls.includes(keyword)) {
                    return true;
                }
            }
        }
        parent = parent.parentElement;
        levels++;
    }

    return false;
}

/**
 * Lazy activation
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
            font-display: swap;
            src: url('chrome-extension://${extensionId}/fonts/NotoNastaliqUrdu-Regular.ttf') format('truetype');
            unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        @font-face {
            font-family: 'Noto Nastaliq Urdu';
            font-style: normal;
            font-weight: 700;
            font-display: swap;
            src: url('chrome-extension://${extensionId}/fonts/NotoNastaliqUrdu-Bold.ttf') format('truetype');
            unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        @font-face {
            font-family: 'Jameel Noori Nastaleeq';
            font-display: swap;
            src: url('chrome-extension://${extensionId}/fonts/JameelNooriNastaleeq.ttf') format('truetype');
            unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        @font-face {
            font-family: 'Gulzar';
            font-display: swap;
            src: url('chrome-extension://${extensionId}/fonts/Gulzar-Regular.ttf') format('truetype');
            unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        span.urdu-nastaleeq {
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
    styleEl.id = 'urdu-nastaleeq-core-v191';
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
        // Basic filter
        if (!text || text.length < 1 || !/[\u0600-\u06FF]/.test(text)) return;

        const parent = node.parentElement;
        if (!parent || !node.parentNode || !node.isConnected) return;

        // CHECK PROTECTION BEFORE PROCEEDING
        if (isProtectedElement(parent)) {
            return;
        }

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match;
        const phraseRegex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\FB50-\uFDFF\uFE70-\uFEFF\u200C\u200F\u064B-\u065F\u06D6-\u06ED\s\d،؛؟۔’‘“”]+)/g;
        let hasValidMatch = false;

        while ((match = phraseRegex.exec(text)) !== null) {
            const matchedText = match[0];
            if (!urduLettersOnly.test(matchedText)) continue;

            hasValidMatch = true;
            wakeUp();

            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            }

            if (!extensionSettings.compatMode || matchedText.trim().replace(/[0-9\s]/g, '').length >= 1) {
                const span = document.createElement('span');
                span.className = 'urdu-nastaleeq';
                span.textContent = matchedText;
                fragment.appendChild(span);
            } else {
                fragment.appendChild(document.createTextNode(matchedText));
            }
            lastIndex = phraseRegex.lastIndex;
        }

        if (hasValidMatch) {
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }
            try {
                node.parentNode.replaceChild(fragment, node);
            } catch (e) { /* Node vanished */ }
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Tag Check
        if (isProtectedElement(node)) return;

        const children = Array.from(node.childNodes);
        if (children.length > 50) {
            window.requestIdleCallback(() => children.forEach(applyNastaleeq), { timeout: 1000 });
        } else {
            children.forEach(applyNastaleeq);
        }
    }
}

function updateStyles() {
    let styleEl = document.getElementById('urdu-font-size-style-v191');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'urdu-font-size-style-v191';
        document.head.appendChild(styleEl);
    }

    if (!extensionSettings.globalEnable || !extensionSettings.isSiteEnabled) {
        styleEl.textContent = "";
        return;
    }

    const { fontSize, fontFamily } = extensionSettings;
    const host = window.location.hostname;

    // SMART NEWS DETECTION LOGIC
    const isKnownNewsSite = NEWS_DOMAINS.some(d => host.includes(d));
    const isUrduPage = document.documentElement.lang === 'ur' || document.documentElement.lang === 'ur-PK';
    const isNewsOrUrduSite = isKnownNewsSite || isUrduPage;

    // "Auto" Mode logic check
    const userIsUsingDefault = fontSize == 24;

    let appliedFontSize;
    let appliedLineHeight;

    if (isNewsOrUrduSite && userIsUsingDefault) {
        appliedFontSize = 'inherit';
        appliedLineHeight = 'inherit';
    } else {
        appliedFontSize = fontSize + 'px';
        appliedLineHeight = '2.0';
    }

    styleEl.textContent = `
        span.urdu-nastaleeq { 
            font-size: ${appliedFontSize} !important; 
            line-height: ${appliedLineHeight} !important;
            font-family: '${fontFamily}', 'Noto Nastaliq Urdu', serif !important;
        }
        
        ${(!isNewsOrUrduSite || !userIsUsingDefault) ? `
             h1, h2, h3, h4, h5, h6 {
                 overflow: visible !important;
                 line-height: ${appliedLineHeight} !important;
             }
        ` : ''}
    `;

    applyNastaleeq(document.body);
    setTimeout(() => applyNastaleeq(document.body), 500);
}

// Init settings
function init() {
    const host = window.location.hostname;
    chrome.storage.sync.get(['globalEnable', 'siteSettings', 'fontSize', 'fontFamily', 'compatMode'], (result) => {
        extensionSettings = {
            globalEnable: result.globalEnable !== false,
            fontFamily: result.fontFamily || "Jameel Noori Nastaleeq",
            fontSize: result.fontSize || 24,
            compatMode: result.compatMode === true,
            isSiteEnabled: (result.siteSettings && result.siteSettings[host] !== false)
        };

        if (extensionSettings.globalEnable && extensionSettings.isSiteEnabled) {
            updateStyles();
        }
    });
}

init();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateSettings") {
        extensionSettings = request.settings;
        extensionSettings.isSiteEnabled = request.isSiteEnabled;
        updateStyles();
    }
});

let mutationQueue = [];
let isProcessingMutations = false;
let throttleTimer = null;

function processQueue() {
    if (mutationQueue.length === 0) {
        isProcessingMutations = false;
        return;
    }
    const batch = mutationQueue.splice(0, 150);
    batch.forEach(node => applyNastaleeq(node));
    if (mutationQueue.length > 0) {
        window.requestIdleCallback(processQueue);
    } else {
        isProcessingMutations = false;
    }
}

const observer = new MutationObserver((mutations) => {
    if (!extensionSettings.globalEnable || !extensionSettings.isSiteEnabled) return;

    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.TEXT_NODE) {
                mutationQueue.push(child);
            }
        });
    });

    if (mutationQueue.length > 0 && !isProcessingMutations) {
        if (throttleTimer) clearTimeout(throttleTimer);
        throttleTimer = setTimeout(() => {
            isProcessingMutations = true;
            window.requestIdleCallback(processQueue);
        }, 150);
    }
});

if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
            init();
        }
    });
}
