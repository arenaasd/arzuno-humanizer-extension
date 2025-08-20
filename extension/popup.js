// popup.js - Updated with premium features

// DOM Elements
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const humanizeBtn = document.getElementById('humanizeBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const outputSection = document.getElementById('outputSection');
const spinner = document.getElementById('spinner');
const btnText = humanizeBtn.querySelector('.btn-text');
const btnIcon = humanizeBtn.querySelector('.btn-icon');

// Premium elements
const loadingStatus = document.getElementById('loadingStatus');
const userStatus = document.getElementById('userStatus');
const userEmail = document.getElementById('userEmail');
const wordsLeft = document.getElementById('wordsLeft');
const premiumBadge = document.getElementById('premiumBadge');
const premiumBtn = document.getElementById('premiumBtn');
const refreshBtn = document.getElementById('refreshBtn');
const errorMessage = document.getElementById('errorMessage');

// User data
let currentUser = null;

// Show loading state
function showLoading() {
    humanizeBtn.disabled = true;
    btnText.style.display = 'none';
    btnIcon.style.display = 'none';
    spinner.style.display = 'block';
    document.body.style.cursor = 'wait';
}

// Hide loading state
function hideLoading() {
    humanizeBtn.disabled = false;
    btnText.style.display = 'inline';
    btnIcon.style.display = 'inline';
    spinner.style.display = 'none';
    document.body.style.cursor = 'default';
}

// Show notification
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${isError ? '#f44336' : '#4CAF50'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Load user data
async function loadUserData() {
    try {
        loadingStatus.style.display = 'block';
        userStatus.style.display = 'none';
        
        // Get user data from service worker
        chrome.runtime.sendMessage({ type: 'get-user-data' }, (response) => {
            if (response && response.user) {
                currentUser = response.user;
                updateUserDisplay();
            } else {
                showError('Please sign in to your Chrome account to use this extension');
                loadingStatus.style.display = 'none';
            }
        });
    } catch (error) {
        console.error('Failed to load user data:', error);
        showError('Failed to load user data. Please refresh.');
        loadingStatus.style.display = 'none';
    }
}

// Update user display
function updateUserDisplay() {
    if (!currentUser) return;
    
    loadingStatus.style.display = 'none';
    userStatus.style.display = 'block';
    
    // Update user email
    userEmail.textContent = currentUser.email || 'Unknown user';
    
    // Update premium status
    const isPremium = currentUser.isPremium && currentUser.premiumExpiry && 
                     new Date(currentUser.premiumExpiry) > new Date();
    
    if (isPremium) {
        premiumBadge.textContent = 'Premium';
        premiumBadge.className = 'premium-badge premium';
        wordsLeft.textContent = '∞ Unlimited words';
        wordsLeft.className = 'words-left premium';
        premiumBtn.classList.add('hidden');
    } else {
        premiumBadge.textContent = 'Free';
        premiumBadge.className = 'premium-badge free';
        
        const words = currentUser.wordsLeft || 0;
        wordsLeft.textContent = `${words} words left`;
        
        if (words <= 0) {
            wordsLeft.className = 'words-left warning';
            humanizeBtn.disabled = true;
        } else if (words <= 500) {
            wordsLeft.className = 'words-left warning';
        } else {
            wordsLeft.className = 'words-left normal';
        }
        
        premiumBtn.classList.remove('hidden');
    }
}

// Count words in text
function countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Check if user can use the service
function canUseService(text) {
    if (!currentUser) {
        return { allowed: false, message: 'Please sign in to Chrome to use this extension' };
    }
    
    // Check if premium and not expired
    const isPremium = currentUser.isPremium && currentUser.premiumExpiry && 
                     new Date(currentUser.premiumExpiry) > new Date();
    
    if (isPremium) {
        return { allowed: true }; // Premium users have unlimited access
    }
    
    // Check word limit for free users
    const wordCount = countWords(text);
    if (currentUser.wordsLeft >= wordCount) {
        return { allowed: true };
    } else {
        return { 
            allowed: false, 
            message: `Not enough words remaining. You need ${wordCount} words but have ${currentUser.wordsLeft} left.` 
        };
    }
}

// Copy text to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('✅ Text copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            showNotification('✅ Text copied to clipboard!');
        } catch (err) {
            showNotification('❌ Failed to copy text', true);
        }
        
        document.body.removeChild(textArea);
    }
}

// Humanize text function
async function humanizeText(text) {
    if (!text.trim()) {
        showNotification('⚠️ Please enter some text to humanize', true);
        return;
    }
    
    // Check if user can use the service
    const canUse = canUseService(text);
    if (!canUse.allowed) {
        showNotification(canUse.message, true);
        return;
    }
    
    showLoading();
    
    try {
        // Send message to service worker to handle the API call
        chrome.runtime.sendMessage({
            type: 'enhance-prompt',
            prompt: text
        }, (response) => {
            hideLoading();
            
            if (response.error) {
                if (response.error === 'insufficient_words') {
                    showNotification(response.message, true);
                } else {
                    showNotification('❌ Failed to humanize text. Please try again.', true);
                }
                return;
            }
            
            const humanizedText = response.result || text;
            
            // Show output
            outputText.value = humanizedText;
            outputSection.style.display = 'block';
            
            // Scroll to output
            outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            showNotification('✅ Text humanized successfully!');
            
            // Refresh user data after humanization to show updated word count
            setTimeout(() => {
                loadUserData();
            }, 500);
        });
        
    } catch (error) {
        console.error('Humanization failed:', error);
        showNotification('❌ Failed to humanize text. Please try again.', true);
        hideLoading();
    }
}

// Refresh user data
async function refreshUserData() {
    chrome.runtime.sendMessage({ type: 'refresh-user-data' }, (response) => {
        if (response && response.user) {
            currentUser = response.user;
            updateUserDisplay();
            showNotification('✅ User data refreshed');
        } else {
            showError('Failed to refresh user data');
        }
    });
}

// Handle premium button click
function handlePremiumClick() {
    // Open premium page - you can replace this with your actual premium page URL
    const premiumUrl = 'https://arzuno-humanizer.vercel.app/premium';
    chrome.tabs.create({ url: premiumUrl });
}

// Event Listeners
humanizeBtn.addEventListener('click', () => {
    const text = inputText.value.trim();
    humanizeText(text);
});

copyBtn.addEventListener('click', () => {
    const text = outputText.value;
    if (text) {
        copyToClipboard(text);
    }
});

clearBtn.addEventListener('click', () => {
    inputText.value = '';
    outputText.value = '';
    outputSection.style.display = 'none';
    inputText.focus();
    showNotification('🗑️ Text cleared');
});

refreshBtn.addEventListener('click', refreshUserData);

premiumBtn.addEventListener('click', handlePremiumClick);

// Handle Enter key in textarea (with Ctrl/Cmd)
inputText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const text = inputText.value.trim();
        humanizeText(text);
    }
});

// Auto-resize textarea
inputText.addEventListener('input', () => {
    inputText.style.height = 'auto';
    inputText.style.height = Math.min(inputText.scrollHeight, 200) + 'px';
});

// Listen for word updates from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'fill-text' && message.text) {
        inputText.value = message.text;
        inputText.style.height = 'auto';
        inputText.style.height = Math.min(inputText.scrollHeight, 200) + 'px';
        inputText.focus();
    } else if (message.type === 'words-updated') {
        if (currentUser) {
            currentUser.wordsLeft = message.wordsLeft;
            updateUserDisplay();
        }
    }
});

// Initialize when popup opens
window.addEventListener('load', () => {
    inputText.focus();
    loadUserData();
});