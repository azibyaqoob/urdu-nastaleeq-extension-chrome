// Comprehensive Urdu/Arabic script regex
const urduRegexRange = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\FB50-\uFDFF\uFE70-\uFEFF\u200C\u200F\u064B-\u065F\u06D6-\u06ED]+/;
const urduLettersOnly = /[\u0621-\u064A\u0671-\u06D3\u06D5\u06F0-\u06F9\uFDF2\uFDFA-\uFDFB]/;

let extensionSettings = {
    globalEnable: true,
    fontFamily: "Jameel Noori Nastaleeq",
    fontSize: 24,
    compatMode: false,
    isSiteEnabled: true
};

let isWokenUp = false;

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

/**
 * Normalizes Urdu text to ensure maximum compatibility with Jameel Noori Nastaleeque ligatures.
 */
function normalizeUrduText(text) {
    if (!text) return text;
    // 1. Standardize Allah word: Some sites use U+0670 (Khari Zabar) which breaks Jameel Noori ligatures
    // We convert Alif + Lam + Lam + KhariZabar + Ha -> Alif + Lam + Lam + Ha
    return text.replace(/\u0627\u0644\u0644\u0670\u0647/g, '\u0627\u0644\u0644\u0647');
}

/**
 * Heuristic to determine if text is specifically Urdu (distinguishing from Arabic/Persian).
 */
function isUrdu(text, element) {
    if (!text) return false;

    // 0. NEGATIVE DETECTION: If Arabic/Persian specific characters are found, it's NOT Urdu
    // ARABIC: ة (Teh Marbuta), ي (Yeh with 2 dots), ك (Kaf with different shape), أ, إ, ئ
    // PERSIAN: پ, چ, ژ, گ (These are shared with Urdu, so we don't exclude them)
    if (/[\u0629\u064A\u0643\u0623\u0625\u0626]/.test(text)) return false;

    // Heuristic 1: Ancestor lang attribute
    let el = element;
    let depth = 0;
    while (el && depth < 3) {
        if (el.lang === 'ur' || el.lang === 'ur-PK') return true;
        el = el.parentElement;
        depth++;
    }

    // Heuristic 2: Known Urdu news site
    const host = window.location.hostname;
    if (NEWS_DOMAINS.some(d => host.includes(d))) return true;

    // Heuristic 3: Presence of Urdu-unique characters (ٹ ڈ ڑ ں ھ ے)
    if (/[\u0679\u0688\u0691\u06BA\u06BE\u06D2]/.test(text)) return true;

    // Heuristic 4: Presence of Urdu-specific variants of shared characters
    // Urdu uses ک (\u06A9) vs Arabic ك (\u0643)
    // Urdu uses ہ (\u06DB / \u06C1) vs Arabic ه (\u0647)
    // Urdu uses ی (\u06CC) vs Arabic ي (\u064A)
    if (/[\u06A9\u06C1\u06CC]/.test(text)) return true;

    // Heuristic 5: Urdu digits and punctuation (۰۱۲۳۴۵۶۷۸۹ ، ؛ ؟ ۔)
    if (/[\u06F0-\u06F9\u060C\u061B\u061F\u06D4]/.test(text)) return true;

    // If none found, assume it might be Arabic/Persian and skip
    return false;
}

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
    styleEl.id = 'urdu-nastaleeq-core-v192';
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
            if (!urduLettersOnly.test(matchedText)) continue;

            // STRICT LANGUAGE DETECTION: Skip if it doesn't look like Urdu (e.g. Arabic/Persian)
            if (!isUrdu(matchedText, parent)) continue;

            hasValidMatch = true;
            wakeUp();

            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            }

            // NORMALIZE: Ensure "Allah" and other complex scripts work with Jameel Noori
            matchedText = normalizeUrduText(matchedText);

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

let lastAppliedStyles = "";

function updateStyles() {
    let styleEl = document.getElementById('urdu-font-size-style-v192');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'urdu-font-size-style-v192';
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

    const styles = `
        /* SURGICAL APPLICATION: Broad styles ONLY on known Urdu sites or if user changed font size */
        ${(isNewsOrUrduSite || !userIsUsingDefault) ? `
        article, section, main, p, li, h1, h2, h3, h4, h5, h6, [role="article"], .article-content, .entry-content, .post-content {
            font-family: "${fontFamily}", "Noto Nastaliq Urdu", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            font-feature-settings: "kern" 1, "liga" 1, "clig" 1, "calt" 1, "ccmp" 1, "locl" 1 !important;
            font-variant-ligatures: common-ligatures contextual !important;
            font-kerning: normal !important;
            font-synthesis: none !important;
            letter-spacing: normal !important;
            word-spacing: normal !important;
            text-rendering: optimizeLegibility !important;
            text-shadow: none !important;
            font-style: normal !important;
        }
        ` : ''}

        /* Essential wrappers applied surgically by our code */
        span.urdu-nastaleeq { 
            font-size: ${appliedFontSize} !important; 
            line-height: ${appliedLineHeight} !important;
            font-family: "${fontFamily}", "Noto Nastaliq Urdu", serif !important;
            font-feature-settings: "kern" 1, "liga" 1, "clig" 1, "calt" 1, "ccmp" 1, "locl" 1 !important;
            font-variant-ligatures: common-ligatures contextual !important;
            font-kerning: normal !important;
            font-synthesis: none !important;
            letter-spacing: normal !important;
            word-spacing: normal !important;
            text-rendering: optimizeLegibility !important;
            display: inline !important;
            direction: rtl !important;
            font-style: normal !important;
        }
        
        /* FIX FOR FACEBOOK/INPUT CLIPPING: Focused specifically on actual inputs */
        input, textarea, [contenteditable], [role="textbox"], .input-box {
            line-height: 1.5 !important;
            padding-bottom: 2px !important;
            overflow-y: visible !important;
            font-family: "${fontFamily}", "Noto Nastaliq Urdu", serif !important;
            font-feature-settings: "kern" 1, "liga" 1, "clig" 1, "calt" 1, "ccmp" 1, "locl" 1 !important;
            letter-spacing: normal !important;
        }
        
        ${(!isNewsOrUrduSite || !userIsUsingDefault) ? `
             h1, h2, h3, h4, h5, h6 {
                 overflow: visible !important;
                 line-height: ${appliedLineHeight} !important;
             }
        ` : ''}
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
