// popup.js - Updated with premium tone restrictions

// DOM Elements
const authSection = document.getElementById('authSection');
const statusSection = document.getElementById('statusSection');
const mainContent = document.getElementById('mainContent');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authError = document.getElementById('authError');
const authSuccess = document.getElementById('authSuccess'); 

// Main content elements
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const humanizeBtn = document.getElementById('humanizeBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const outputSection = document.getElementById('outputSection');
const spinner = document.getElementById('spinner');
const btnText = humanizeBtn.querySelector('.btn-text');
const btnIcon = humanizeBtn.querySelector('.btn-icon');
const toneSelect = document.getElementById('toneSelect');

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
let isLoggedIn = false;
let isPremiumUser = false;

// Initialize the popup
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    setupToneSelectListener();
});

// Setup tone select listener
function setupToneSelectListener() {
    toneSelect.addEventListener('change', function() {
        const selectedOption = toneSelect.options[toneSelect.selectedIndex];
        const isPremiumTone = selectedOption.getAttribute('data-premium') === 'true';
        
        if (isPremiumTone && !isPremiumUser) {
            showNotification('⭐ This tone is only available for Premium users', true);
            // Reset to default
            toneSelect.value = 'default';
            // Open premium page
            setTimeout(() => {
                handlePremiumClick();
            }, 500);
        }
    });
}

// Check authentication state
async function checkAuthState() {
    try {
        // Check if user is signed in to Chrome
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (chrome.runtime.lastError || !token) {
                showLoginScreen();
                return;
            }
            
            // User has token, try to get user info
            fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`)
                .then(response => response.json())
                .then(userInfo => {
                    if (userInfo.email) {
                        // User is authenticated, initialize user data
                        initializeAuthenticatedUser(userInfo.email);
                    } else {
                        showLoginScreen();
                    }
                })
                .catch(error => {
                    console.error('Error getting user info:', error);
                    showLoginScreen();
                });
        });
    } catch (error) {
        console.error('Error checking auth state:', error);
        showLoginScreen();
    }
}

// Show login screen
function showLoginScreen() {
    authSection.classList.remove('hidden');
    statusSection.classList.add('hidden');
    mainContent.classList.add('disabled');
    isLoggedIn = false;
    isPremiumUser = false;
}

// Show authenticated screen
function showAuthenticatedScreen() {
    authSection.classList.add('hidden');
    statusSection.classList.remove('hidden');
    mainContent.classList.remove('disabled');
    isLoggedIn = true;
    inputText.focus();
}

// Initialize authenticated user
async function initializeAuthenticatedUser(email) {
    try {
        // Initialize user in database via service worker
        chrome.runtime.sendMessage({ type: 'get-user-data' }, (response) => {
            if (response && response.user) {
                currentUser = response.user;
                showAuthenticatedScreen();
                updateUserDisplay();
                updatePremiumToneOptions();
                showSuccessMessage(`Welcome back, ${email.split('@')[0]}!`);
            } else {
                showErrorMessage('Failed to initialize user. Please try again.');
                showLoginScreen();
            }
        });
    } catch (error) {
        console.error('Failed to initialize user:', error);
        showErrorMessage('Failed to initialize user. Please try again.');
        showLoginScreen();
    }
}

// Update premium tone options based on user status
function updatePremiumToneOptions() {
    const options = toneSelect.querySelectorAll('option[data-premium="true"]');
    
    console.log('Updating tone options. isPremiumUser:', isPremiumUser);
    
    if (!isPremiumUser) {
        // Disable premium options for free users
        options.forEach(option => {
            option.disabled = true;
            // Ensure premium label is shown
            if (!option.textContent.includes('⭐ Premium')) {
                const baseText = option.textContent.replace(' ⭐ Premium', '');
                option.textContent = baseText + ' ⭐ Premium';
            }
        });
        console.log('Premium tones disabled for free user');
    } else {
        // Enable all options for premium users
        options.forEach(option => {
            option.disabled = false;
            // Remove premium badge text for premium users
            option.textContent = option.textContent.replace(' ⭐ Premium', '');
        });
        console.log('✅ All tones enabled for premium user');
    }
}

// Handle login
async function handleLogin() {
    loginBtn.disabled = true;
    loginBtn.innerHTML = `
        <div class="loading-spinner"></div>
        Signing in...
    `;
    
    try {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                console.error('Auth error:', chrome.runtime.lastError);
                showAuthError('Failed to sign in. Please try again.');
                resetLoginButton();
                return;
            }
            
            if (!token) {
                showAuthError('Authentication failed. Please try again.');
                resetLoginButton();
                return;
            }
            
            // Get user info
            fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`)
                .then(response => response.json())
                .then(userInfo => {
                    if (userInfo.email) {
                        showAuthSuccess('Successfully signed in!');
                        setTimeout(() => {
                            initializeAuthenticatedUser(userInfo.email);
                        }, 1000);
                    } else {
                        showAuthError('Failed to get user information.');
                        resetLoginButton();
                    }
                })
                .catch(error => {
                    console.error('Error getting user info:', error);
                    showAuthError('Failed to get user information.');
                    resetLoginButton();
                });
        });
    } catch (error) {
        console.error('Login error:', error);
        showAuthError('Authentication failed. Please try again.');
        resetLoginButton();
    }
}

// Handle logout
async function handleLogout() {
    try {
        // Revoke the auth token
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (token) {
                chrome.identity.removeCachedAuthToken({ token: token }, () => {
                    // Clear user data
                    currentUser = null;
                    isLoggedIn = false;
                    isPremiumUser = false;
                    
                    // Reset UI
                    inputText.value = '';
                    outputText.value = '';
                    outputSection.classList.add('hidden');
                    toneSelect.value = 'default';
                    
                    // Show login screen
                    showLoginScreen();
                    showAuthSuccess('Successfully signed out!');
                    
                    setTimeout(() => {
                        hideAuthMessages();
                    }, 2000);
                });
            } else {
                // No token to revoke, just clear state
                currentUser = null;
                isLoggedIn = false;
                isPremiumUser = false;
                showLoginScreen();
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
        showErrorMessage('Failed to sign out. Please try again.');
    }
}

// Reset login button
function resetLoginButton() {
    loginBtn.disabled = false;
    loginBtn.innerHTML = `
        <svg class="google-icon" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
    `;
}

// Update user display
function updateUserDisplay() {
    if (!currentUser) return;
    
    loadingStatus.classList.add('hidden');
    userStatus.classList.remove('hidden');
    
    // Update user email
    userEmail.textContent = currentUser.email || 'Unknown user';
    
    console.log('Updating user display:', {
        email: currentUser.email,
        isPremium: currentUser.isPremium,
        premiumExpiry: currentUser.premiumExpiry,
        wordsLeft: currentUser.wordsLeft
    });
    
    // Update premium status (check both isPremium and premiumExpiry)
    isPremiumUser = false;
    
    if (currentUser.isPremium) {
        // If premiumExpiry exists, check if it's valid
        if (currentUser.premiumExpiry) {
            const expiryDate = new Date(currentUser.premiumExpiry);
            const now = new Date();
            isPremiumUser = expiryDate > now;
            console.log('Premium expiry check:', {
                expiryDate: expiryDate.toISOString(),
                now: now.toISOString(),
                isPremiumUser: isPremiumUser
            });
        } else {
            // No expiry set, just trust isPremium flag
            isPremiumUser = true;
            console.log('Premium user (no expiry set)');
        }
    }
    
    console.log('Final isPremiumUser:', isPremiumUser);
    
    const premiumStatusCard = document.getElementById('premiumStatusCard');
    
    if (isPremiumUser) {
        // Update premium status card styling
        premiumStatusCard.classList.remove('free');
        premiumStatusCard.classList.add('premium');
        
        premiumBadge.textContent = '⭐ Premium';
        premiumBadge.className = 'premium-badge premium';
        wordsLeft.textContent = '∞ Unlimited';
        wordsLeft.className = 'words-left premium';
        premiumBtn.classList.add('hidden');
        humanizeBtn.disabled = false;
        console.log('✅ Displaying as Premium user');
    } else {
        // Update free status card styling
        premiumStatusCard.classList.remove('premium');
        premiumStatusCard.classList.add('free');
        
        premiumBadge.textContent = 'Free';
        premiumBadge.className = 'premium-badge free';
        
        const words = currentUser.wordsLeft || 0;
        wordsLeft.textContent = `${words.toLocaleString()} words`;
        
        if (words <= 0) {
            wordsLeft.className = 'words-left warning';
            humanizeBtn.disabled = true;
        } else if (words <= 500) {
            wordsLeft.className = 'words-left warning';
            humanizeBtn.disabled = false;
        } else {
            wordsLeft.className = 'words-left normal';
            humanizeBtn.disabled = false;
        }
        
        premiumBtn.classList.remove('hidden');
        console.log('Displaying as Free user with', words, 'words');
    }
    
    // Update tone options based on premium status
    updatePremiumToneOptions();
}

// Show auth error
function showAuthError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
    setTimeout(() => {
        authError.classList.add('hidden');
    }, 5000);
}

// Show auth success
function showAuthSuccess(message) {
    authSuccess.textContent = message;
    authSuccess.classList.remove('hidden');
    setTimeout(() => {
        authSuccess.classList.add('hidden');
    }, 3000);
}

// Hide auth messages
function hideAuthMessages() {
    authError.classList.add('hidden');
    authSuccess.classList.add('hidden');
}

// Show loading state
function showLoading() {
    if (!isLoggedIn) return;
    
    humanizeBtn.disabled = true;
    btnText.style.display = 'none';
    btnIcon.style.display = 'none';
    spinner.style.display = 'block';
    document.body.style.cursor = 'wait';
}

// Hide loading state
function hideLoading() {
    if (!isLoggedIn) return;
    
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
function showErrorMessage(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

// Show success message
function showSuccessMessage(message) {
    showNotification(message, false);
}

// Count words in text
function countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Check if user can use the service
function canUseService(text) {
    if (!currentUser || !isLoggedIn) {
        return { allowed: false, message: 'Please sign in to use this extension' };
    }
    
    // Check word limit for free users
    if (isPremiumUser) {
        return { allowed: true }; // Premium users have unlimited access
    }
    
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
    if (!isLoggedIn) {
        showNotification('⚠️ Please sign in to use this feature', true);
        return;
    }

    if (!text.trim()) {
        showNotification('⚠️ Please enter some text to humanize', true);
        return;
    }
    
 if (isPremiumUser) {
    console.log("⭐ Premium user - unlimited words, skipping word check");
} else {
    const canUse = canUseService(text);
    if (!canUse.allowed) {
        showNotification(canUse.message, true);
        return;
    }
}

    // Get selected tone
    const selectedTone = toneSelect.value;
    
    // Double-check premium tone restriction
    if (selectedTone !== 'default' && !isPremiumUser) {
        showNotification('⭐ Premium tones are only available for Premium users', true);
        toneSelect.value = 'default';
        return;
    }
    
    showLoading();
    
    try {
        // Send message to service worker to handle the API call
        chrome.runtime.sendMessage({
            type: 'enhance-prompt',
            prompt: text,
            tone: selectedTone
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
            outputSection.classList.remove('hidden');
            
            // Scroll to output
            outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            if (isPremiumUser) {
                showNotification('✅ Text humanized successfully! (Unlimited)');
            } else {
                showNotification('✅ Text humanized successfully!');
            }
            
            // Only refresh user data for free users (to update word count)
            if (!isPremiumUser) {
                setTimeout(() => {
                    loadUserData();
                }, 500);
            }
        });
        
    } catch (error) {
        console.error('Humanization failed:', error);
        showNotification('❌ Failed to humanize text. Please try again.', true);
        hideLoading();
    }
}

// Load user data
async function loadUserData() {
    if (!isLoggedIn) return;
    
    try {
        loadingStatus.classList.remove('hidden');
        userStatus.classList.add('hidden');
        
        // Get user data from service worker
        chrome.runtime.sendMessage({ type: 'get-user-data' }, (response) => {
            if (response && response.user) {
                currentUser = response.user;
                updateUserDisplay();
            } else {
                showErrorMessage('Failed to load user data. Please refresh.');
                loadingStatus.classList.add('hidden');
            }
        });
    } catch (error) {
        console.error('Failed to load user data:', error);
        showErrorMessage('Failed to load user data. Please refresh.');
        loadingStatus.classList.add('hidden');
    }
}

// Refresh user data
async function refreshUserData() {
    if (!isLoggedIn) return;
    
    chrome.runtime.sendMessage({ type: 'refresh-user-data' }, (response) => {
        if (response && response.user) {
            currentUser = response.user;
            updateUserDisplay();
            showNotification('✅ User data refreshed');
        } else {
            showErrorMessage('Failed to refresh user data');
        }
    });
}

// Handle premium button click
function handlePremiumClick() {
    // Open premium page
   showNotification("Premium is not available yet. Contact support: arzunoteam@gmail.com to get premium access.", true);
}

// Event Listeners
loginBtn.addEventListener('click', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
refreshBtn.addEventListener('click', refreshUserData);
premiumBtn.addEventListener('click', handlePremiumClick);

humanizeBtn.addEventListener('click', () => {
    if (!isLoggedIn) {
        showNotification('⚠️ Please sign in to use this feature', true);
        return;
    }
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
    outputSection.classList.add('hidden');
    toneSelect.value = 'default';
    if (isLoggedIn) {
        inputText.focus();
    }
    showNotification('🗑️ Text cleared');
});

// Handle Enter key in textarea (with Ctrl/Cmd)
inputText.addEventListener('keydown', (e) => {
    if (!isLoggedIn) return;
    
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

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'fill-text' && message.text) {
        if (isLoggedIn) {
            inputText.value = message.text;
            inputText.style.height = 'auto';
            inputText.style.height = Math.min(inputText.scrollHeight, 200) + 'px';
            inputText.focus();
        }
    } else if (message.type === 'words-updated') {
        if (currentUser && isLoggedIn) {
            currentUser.wordsLeft = message.wordsLeft;
            updateUserDisplay();
        }
    } else if (message.type === 'auth-required') {
        if (!isLoggedIn) {
            showAuthError('Please sign in to use this extension');
        }
    }
});