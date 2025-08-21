// service-worker.js - Updated with authentication system

const API_BASE_URL = 'https://arzuno-humanizer.vercel.app'; // Your API URL

// Initialize extension on install/startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  
  // Create context menu
  chrome.contextMenus.create({
    id: "humanize-text",
    title: "Humanize text",
    contexts: ["selection"],
    documentUrlPatterns: ["<all_urls>"]
  });
});

// Get authenticated user info
async function getAuthenticatedUser() {
  try {
    // Get user's Google account token
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });

    if (!token) {
      return null;
    }

    // Get user info from Google API
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`);
    const userInfo = await response.json();
    
    if (!userInfo.email) {
      return null;
    }

    // Initialize/get user from database
    const userResponse = await fetch(`${API_BASE_URL}/api/user/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: userInfo.email })
    });
    
    if (!userResponse.ok) {
      console.error('Failed to initialize user:', await userResponse.text());
      return null;
    }

    const userData = await userResponse.json();
    console.log('User authenticated:', userData.email);
    
    return userData;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "humanize-text" && info.selectionText) {
    try {
      // Check authentication first
      const user = await getAuthenticatedUser();
      
      if (!user) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'auth-required'
        });
        return;
      }

      // Check if user has enough words
      const canUse = await checkWordUsage(info.selectionText, user);
      
      if (!canUse.allowed) {
        chrome.tabs.sendMessage(tab.id, {
          type: canUse.error === 'insufficient_words' ? 'insufficient-words' : 'show-premium-required',
          message: canUse.message
        });
        return;
      }

      // Send message to content script to show loading state
      chrome.tabs.sendMessage(tab.id, { type: 'start-humanizing' });
      
      // Call the API to humanize the text
      const response = await fetch(`${API_BASE_URL}/api/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: info.selectionText })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update word usage
      await updateWordUsage(info.selectionText, user.email);
      
      // Copy the humanized text to clipboard
      chrome.tabs.sendMessage(tab.id, {
        type: 'copy-to-clipboard',
        text: data.text || info.selectionText
      });
      
    } catch (err) {
      console.error("Humanization failed:", err);
      chrome.tabs.sendMessage(tab.id, {
        type: 'humanization-failed',
        text: info.selectionText
      });
    }
  }
});

// Handle messages from popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'enhance-prompt') {
    handleEnhancePrompt(message.prompt, sendResponse);
    return true; // Keep port open for async response
  } else if (message.type === 'get-user-data') {
    getUserData(sendResponse);
    return true;
  } else if (message.type === 'refresh-user-data') {
    refreshUserData(sendResponse);
    return true;
  }
});

// Enhanced prompt handler with authentication and word checking
async function handleEnhancePrompt(prompt, sendResponse) {
  try {
    // Check authentication first
    const user = await getAuthenticatedUser();
    
    if (!user) {
      sendResponse({ 
        error: 'auth_required',
        message: 'Please sign in to Chrome to use this extension'
      });
      return;
    }

    // Check if user has enough words
    const canUse = await checkWordUsage(prompt, user);
    
    if (!canUse.allowed) {
      sendResponse({ 
        error: canUse.error,
        message: canUse.message 
      });
      return;
    }

    // Call API to humanize text
    const response = await fetch(`${API_BASE_URL}/api/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update word usage
    await updateWordUsage(prompt, user.email);
    
    sendResponse({ result: data.text });
  } catch (err) {
    console.error("Enhancement failed:", err);
    sendResponse({ 
      error: 'api_error',
      message: 'Failed to humanize text. Please try again.'
    });
  }
}

// Check if user can use words
async function checkWordUsage(text, user) {
  try {
    const wordCount = countWords(text);
    
    // Check if premium and not expired
    if (user.isPremium && user.premiumExpiry) {
      const expiryDate = new Date(user.premiumExpiry);
      if (expiryDate > new Date()) {
        return { allowed: true }; // Premium user, unlimited words
      }
    }
    
    // Check free words limit
    if (user.wordsLeft >= wordCount) {
      return { allowed: true };
    } else {
      return { 
        allowed: false,
        error: 'insufficient_words',
        message: `Not enough words remaining. You need ${wordCount} words but have ${user.wordsLeft} left. Upgrade to Premium for unlimited usage!` 
      };
    }
  } catch (error) {
    console.error('Error checking word usage:', error);
    return { 
      allowed: false, 
      error: 'check_error',
      message: 'Error checking word limit' 
    };
  }
}

// Update word usage
async function updateWordUsage(text, email) {
  try {
    const wordCount = countWords(text);
    
    const response = await fetch(`${API_BASE_URL}/api/user/update-words`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: email,
        wordsUsed: wordCount
      })
    });
    
    if (!response.ok) {
      console.error('Failed to update word usage:', await response.text());
      return;
    }
    
    const result = await response.json();
    console.log(`Words updated for ${email}: ${wordCount} words used`);
    
    return result;
  } catch (error) {
    console.error('Error updating word usage:', error);
  }
}

// Get user data for popup
async function getUserData(sendResponse) {
  try {
    const user = await getAuthenticatedUser();
    sendResponse({ user });
  } catch (error) {
    console.error('Error getting user data:', error);
    sendResponse({ user: null });
  }
}

// Refresh user data
async function refreshUserData(sendResponse) {
  try {
    const user = await getAuthenticatedUser();
    sendResponse({ user });
  } catch (error) {
    console.error('Error refreshing user data:', error);
    sendResponse({ user: null });
  }
}

// Count words in text
function countWords(text) {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Log service worker startup
console.log('🚀 Arzuno Humanizer service worker loaded');