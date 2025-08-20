// service-worker.js - Updated with premium system

const API_BASE_URL = 'https://arzuno-humanizer.vercel.app'; // Your API URL

// Initialize user on extension install/startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  
  if (details.reason === 'install' || details.reason === 'update') {
    await initializeUser();
  }
  
  // Create context menu
  chrome.contextMenus.create({
    id: "humanize-text",
    title: "Humanize text",
    contexts: ["selection"],
    documentUrlPatterns: ["<all_urls>"]
  });
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeUser();
});

// Initialize user with Chrome identity and API
async function initializeUser() {
  try {
    // Get user's Google account email
    const token = await chrome.identity.getAuthToken({ interactive: false });
    if (!token) {
      console.log('User not signed in to Chrome');
      return;
    }

    // Get user info from Google API
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`);
    const userInfo = await response.json();
    
    if (userInfo.email) {
      // Initialize user in your database
      const initResponse = await fetch(`${API_BASE_URL}/api/user/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userInfo.email })
      });
      
      const userData = await initResponse.json();
      
      console.log('User initialized:', userData);
    }
  } catch (error) {
    console.error('Failed to initialize user:', error);
  }
}

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "humanize-text" && info.selectionText) {
    // Check if user has enough words
    const canUse = await checkWordUsage(info.selectionText);
    
    if (!canUse.allowed) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'show-premium-required',
        message: canUse.message
      });
      return;
    }

    // Send message to content script to show loading state
    chrome.tabs.sendMessage(tab.id, { type: 'start-humanizing' });
    
    // Call the API to humanize the text
    try {
      const response = await fetch(`${API_BASE_URL}/api/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: info.selectionText })
      });
      
      const data = await response.json();
      
      // Update word usage
      await updateWordUsage(info.selectionText);
      
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
    initializeUser().then(() => {
      getUserData(sendResponse);
    });
    return true;
  }
});

// Enhanced prompt handler with word checking
async function handleEnhancePrompt(prompt, sendResponse) {
  try {
    // Check if user has enough words
    const canUse = await checkWordUsage(prompt);
    
    if (!canUse.allowed) {
      sendResponse({ 
        error: 'insufficient_words',
        message: canUse.message 
      });
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    
    const data = await response.json();
    
    // Update word usage
    await updateWordUsage(prompt);
    
    sendResponse({ result: data.text });
  } catch (err) {
    console.error("Enhancement failed:", err);
    sendResponse({ result: prompt });
  }
}

// Check if user can use words
async function checkWordUsage(text) {
  try {
    // Get fresh user data from Google identity
    const token = await chrome.identity.getAuthToken({ interactive: false });
    if (!token) {
      return { allowed: false, message: 'Please sign in to Chrome to use this extension' };
    }

    const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`);
    const userInfo = await response.json();
    
    if (!userInfo.email) {
      return { allowed: false, message: 'Unable to get user email' };
    }

    // Get current user data from database
    const userResponse = await fetch(`${API_BASE_URL}/api/user/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userInfo.email })
    });
    
    const userData = await userResponse.json();
    const wordCount = countWords(text);
    
    // Check if premium and not expired
    if (userData.isPremium && userData.premiumExpiry) {
      const expiryDate = new Date(userData.premiumExpiry);
      if (expiryDate > new Date()) {
        return { allowed: true }; // Premium user, unlimited words
      }
    }
    
    // Check free words limit
    if (userData.wordsLeft >= wordCount) {
      return { allowed: true };
    } else {
      return { 
        allowed: false, 
        message: `Not enough words remaining. You need ${wordCount} words but have ${userData.wordsLeft} left. Upgrade to Premium for unlimited usage!` 
      };
    }
  } catch (error) {
    console.error('Error checking word usage:', error);
    return { allowed: false, message: 'Error checking word limit' };
  }
}

// Update word usage
async function updateWordUsage(text) {
  try {
    // Get fresh user data from Google identity
    const token = await chrome.identity.getAuthToken({ interactive: false });
    if (!token) return;

    const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`);
    const userInfo = await response.json();
    
    if (!userInfo.email) return;
    
    const wordCount = countWords(text);
    
    // Update words in database
    await fetch(`${API_BASE_URL}/api/user/update-words`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: userInfo.email,
        wordsUsed: wordCount
      })
    });
    
    console.log(`Words updated for ${userInfo.email}: ${wordCount} words used`);
    
  } catch (error) {
    console.error('Error updating word usage:', error);
  }
}

// Get user data from database
async function getUserData(sendResponse) {
  try {
    // Get fresh user data from Google identity
    const token = await chrome.identity.getAuthToken({ interactive: false });
    if (!token) {
      sendResponse({ user: null });
      return;
    }

    const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`);
    const userInfo = await response.json();
    
    if (!userInfo.email) {
      sendResponse({ user: null });
      return;
    }

    // Get current user data from database
    const userResponse = await fetch(`${API_BASE_URL}/api/user/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userInfo.email })
    });
    
    const userData = await userResponse.json();
    sendResponse({ user: userData });
  } catch (error) {
    console.error('Error getting user data:', error);
    sendResponse({ user: null });
  }
}

// Count words in text
function countWords(text) {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}