// Comprehensive Urdu/Arabic script regex
const urduRegexRange = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\FB50-\uFDFF\uFE70-\uFEFF\u200C\u200F\u064B-\u065F\u06D6-\u06ED]+/;
// Removed specific ligatures as per user request
const urduLettersOnly = /[\u0621-\u064A\u0671-\u06D3\u06D5\u06F0-\u06F9\uFDFA-\uFDFB]/;

let extensionSettings = {
    globalEnable: true,
    fontFamily: "Jameel Noori Nastaleeq",
    fontSize: 20,
    compatMode: false,
    isSiteEnabled: true
};

let isWokenUp = false;

// KEYBOARD PROTECTION: Heuristic keywords to identify virtual keyboards
const KEYBOARD_KEYWORDS = ['keyboard', 'keypad', 'virtual', 'kb-', '-kb', 'vk_'];

/**
 * Checks if a node is part of a virtual keyboard or interactive input
 */
// IGNORED TAGS: Never contain Urdu text or shouldn't be touched for layout/security/utility
const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'IFRAME', 'SVG', 'VIDEO', 'CANVAS', 'OBJECT', 'EMBED', 'BR', 'HR', 'HEAD', 'META', 'LINK']);

function isProtectedElement(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return true;

    // 1. Tag Check (Set-based lookup is O(1))
    if (IGNORED_TAGS.has(node.tagName)) return true;

    // Form elements
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'OPTION'].includes(node.tagName)) return true;

    // 2. Contenteditable Check
    if (node.isContentEditable || (node.getAttribute && node.getAttribute('contenteditable') === 'true')) {
        return true;
    }

    // 3. Class Blocklist
    if (node.classList && node.classList.contains('urdu-nastaleeq')) {
        return true;
    }

    // 4. Ancestry Check
    let parent = node.parentElement;
    let levels = 0;
    while (parent && levels < 4 && parent !== document.body) {
        // Fast ID/Class check
        const id = parent.id ? parent.id.toLowerCase() : '';
        const cls = typeof parent.className === 'string' ? parent.className.toLowerCase() : '';

        if (id || cls) {
            for (const keyword of KEYBOARD_KEYWORDS) {
                if (id.includes(keyword) || cls.includes(keyword)) return true;
            }
        }

        if (parent.isContentEditable || (parent.getAttribute && parent.getAttribute('contenteditable') === 'true')) {
            return true;
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

    const baseUrl = chrome.runtime.getURL('');
    const fontFaces = `
        @font-face {
            font-family: 'Noto Nastaliq Urdu';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url('${baseUrl}fonts/NotoNastaliqUrdu-Regular.woff2') format('woff2');
            unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        @font-face {
            font-family: 'Noto Nastaliq Urdu';
            font-style: normal;
            font-weight: 700;
            font-display: swap;
            src: url('${baseUrl}fonts/NotoNastaliqUrdu-Bold.woff2') format('woff2');
            unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        @font-face {
            font-family: 'Jameel Noori Nastaleeq';
            font-display: swap;
            src: url('${baseUrl}fonts/JameelNooriNastaleeq.woff2') format('woff2');
            unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        @font-face {
            font-family: 'Gulzar';
            font-display: swap;
            src: url('${baseUrl}fonts/Gulzar-Regular.woff2') format('woff2');
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
    styleEl.id = 'urdu-nastaleeq-core-v194';
    styleEl.textContent = fontFaces;
    document.head.appendChild(styleEl);
}

const phraseRegex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\FB50-\uFDFF\uFE70-\uFEFF\u200C\u200F\u064B-\u065F\u06D6-\u06ED\s\d،؛؟۔’‘“”]+)/g;

function applyNastaleeq(node) {
    if (!node) return;

    // Fast exit if globally disabled
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
        // FAST PATH: Quick test for any character in Urdu/Arabic range
        if (!text || text.length < 1 || !/[\u0600-\u06FF]/.test(text)) return;

        const parent = node.parentElement;
        if (!parent || isProtectedElement(parent)) return;

        let match;
        let lastIndex = 0;
        let hasValidMatch = false;
        const fragment = document.createDocumentFragment();

        phraseRegex.lastIndex = 0; // Reset global regex
        while ((match = phraseRegex.exec(text)) !== null) {
            let matchedText = match[0];
            // Liberal strategy: any Arabic script sequence gets styled
            if (!/[\u0600-\u06FF]/.test(matchedText)) continue;

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
            } catch (e) { }
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (isProtectedElement(node)) return;

        const children = node.childNodes;
        const count = children.length;
        if (count > 0) {
            if (count > 40) {
                window.requestIdleCallback(() => {
                    for (let i = 0; i < count; i++) applyNastaleeq(children[i]);
                }, { timeout: 1000 });
            } else {
                for (let i = 0; i < count; i++) applyNastaleeq(children[i]);
            }
        }
    }
}

// PERFORMANCE: Surgical sub-detection for input fields
function handleInputDetection(e) {
    const target = e.target;
    if (!target) return;

    const value = target.value || target.innerText || "";
    // Speed optimization: search for ANY Urdu char
    const hasUrdu = /[\u0600-\u06FF]/.test(value);

    if (hasUrdu) {
        if (!target.classList.contains('urdu-typing-detected')) {
            target.classList.add('urdu-typing-detected');
            wakeUp();
        }
    } else {
        target.classList.remove('urdu-typing-detected');
    }
}

let lastAppliedStyles = "";

function updateStyles() {
    let styleEl = document.getElementById('urdu-font-size-style-v194');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'urdu-font-size-style-v194';
        document.head.appendChild(styleEl);
    }

    if (!extensionSettings.globalEnable || !extensionSettings.isSiteEnabled) {
        styleEl.textContent = "";
        return;
    }

    const { fontSize, fontFamily } = extensionSettings;

    const userIsUsingDefault = fontSize == 20;
    const appliedFontSize = userIsUsingDefault ? 'inherit' : fontSize + 'px';
    const appliedLineHeight = userIsUsingDefault ? 'inherit' : '1.8';

    const styles = `
        /* ZERO INTERFERENCE MODE (Static Text) */
        span.urdu-nastaleeq { 
            font-size: ${appliedFontSize} !important; 
            line-height: ${appliedLineHeight} !important;
            font-family: "${fontFamily}", "Noto Nastaliq Urdu", serif !important;
            font-feature-settings: "kern" 1, "liga" 1, "clig" 1, "calt" 1, "ccmp" 1, "locl" 1 !important;
            display: inline !important;
            direction: rtl !important;
            font-style: normal !important;
            text-rendering: optimizeLegibility !important;
        }
        
        /* SOCIAL MEDIA OVERRIDE */
        [data-testid="tweetText"] span.urdu-nastaleeq, 
        yt-formatted-string span.urdu-nastaleeq, 
        div[dir="auto"] span.urdu-nastaleeq, 
        span[dir="auto"] span.urdu-nastaleeq, 
        div[dir="rtl"] span.urdu-nastaleeq, 
        span[dir="rtl"] span.urdu-nastaleeq {
            font-size: ${userIsUsingDefault ? '20px' : fontSize + 'px'} !important;
            line-height: 1.8 !important;
        }

        /* SURGICAL TYPING (v1.9.4): Only activiated when Urdu is detected to save English performance */
        .urdu-typing-detected, .urdu-typing-detected * {
            font-family: "${fontFamily}", "Noto Nastaliq Urdu", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            font-feature-settings: "kern" 1, "liga" 1, "clig" 1, "calt" 1, "ccmp" 1, "locl" 1 !important;
            line-height: 1.5 !important;
            padding-bottom: 2px !important;
            overflow-y: visible !important;
            direction: rtl !important;
        }
        
        h1, h2, h3, h4, h5, h6 {
            overflow: visible !important;
        }
    `;

    if (styles !== lastAppliedStyles) {
        styleEl.textContent = styles;
        lastAppliedStyles = styles;
    }

    applyNastaleeq(document.body);
}

// Init settings
function init() {
    const host = window.location.hostname;
    chrome.storage.sync.get(['globalEnable', 'siteSettings', 'fontSize', 'fontFamily', 'compatMode'], (result) => {
        extensionSettings = {
            globalEnable: result.globalEnable !== false,
            fontFamily: result.fontFamily || "Jameel Noori Nastaleeq",
            fontSize: result.fontSize || 20,
            compatMode: result.compatMode === true,
            isSiteEnabled: (result.siteSettings && result.siteSettings[host] !== false)
        };

        if (extensionSettings.globalEnable && extensionSettings.isSiteEnabled) {
            updateStyles();
            // Bind surgical detection
            document.addEventListener('input', handleInputDetection, true);
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
    const batch = mutationQueue.splice(0, 250);
    for (let i = 0; i < batch.length; i++) {
        applyNastaleeq(batch[i]);
    }
    if (mutationQueue.length > 0) {
        window.requestIdleCallback(processQueue);
    } else {
        isProcessingMutations = false;
    }
}

const observer = new MutationObserver((mutations) => {
    if (!extensionSettings.globalEnable || !extensionSettings.isSiteEnabled) return;

    for (let i = 0, len = mutations.length; i < len; i++) {
        const mutation = mutations[i];
        for (let j = 0, nodeLen = mutation.addedNodes.length; j < nodeLen; j++) {
            const child = mutation.addedNodes[j];
            if (child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.TEXT_NODE) {
                mutationQueue.push(child);
            }
        }
    }

    if (mutationQueue.length > 0 && !isProcessingMutations) {
        if (throttleTimer) clearTimeout(throttleTimer);
        throttleTimer = setTimeout(() => {
            isProcessingMutations = true;
            window.requestIdleCallback(processQueue);
        }, 250);
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
