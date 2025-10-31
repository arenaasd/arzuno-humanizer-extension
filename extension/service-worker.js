// service-worker.js - Updated with tone-based prompts

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

// Generate tone-specific prompt
function generatePrompt(text, tone = 'default') {
  const baseInstruction = 'Rewrite the following text to make it sound more natural, fluent, and human-like.';
  const commonRules = 'Avoid robotic or overly formal phrasing. Don\'t use "-" dashes. Return only the rewritten version without any explanation or labels.';
  
  let toneInstruction = '';
  
  switch (tone) {
    case 'professional':
      toneInstruction = 'Use a formal and professional tone. dont use "-" dashes. Maintain clarity and sophistication while preserving the original meaning. Use business-appropriate language.';
      break;
      
    case 'casual':
      toneInstruction = 'Use everyday conversational language in a casual and relaxed tone. dont use "-" dashes. Make it sound like a friendly conversation while preserving the original meaning.';
      break;
      
    case 'seo':
      toneInstruction = 'Optimize for SEO while maintaining natural readability. dont use "-" dashes. Use relevant keywords naturally, ensure good flow, and make it engaging for both readers and search engines. Preserve the original meaning.';
      break;
      
    case 'friendly':
      toneInstruction = 'Use a warm, friendly, and approachable tone. dont use "-" dashes.  Make it sound welcoming and personable while preserving the original meaning. Use positive and engaging language.';
      break;
      
    case 'default':
    default:
      toneInstruction = 'Use more natural, fluent, and human-like. dont use "-" dashes. Use everyday conversational language while preserving the original meaning. Avoid robotic or overly formal phrasing. Return only the rewritten version without any explanation or labels.';
      break;
  }
  
  return `${baseInstruction} ${toneInstruction} ${commonRules} Text: "${text}"`;
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

      // Check if user is premium
      const isPremium = user.isPremium;
      
      if (!isPremium) {
        // Only check word usage for non-premium users
        const canUse = await checkWordUsage(info.selectionText, user);
        
        if (!canUse.allowed) {
          chrome.tabs.sendMessage(tab.id, {
            type: canUse.error === 'insufficient_words' ? 'insufficient-words' : 'show-premium-required',
            message: canUse.message
          });
          return;
        }
      } else {
        console.log('⭐ Premium user - bypassing word check for context menu');
      }

      // Send message to content script to show loading state
      chrome.tabs.sendMessage(tab.id, { type: 'start-humanizing' });
      
      // Generate prompt with default tone for context menu
      const enhancedPrompt = generatePrompt(info.selectionText, 'default');
      
      // Call the API to humanize the text
      const response = await fetch(`${API_BASE_URL}/api/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: enhancedPrompt })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Only update word usage for non-premium users
      if (!isPremium) {
        await updateWordUsage(info.selectionText, user.email);
      } else {
        console.log('⭐ Premium user - skipping word deduction for context menu');
      }
      
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
    handleEnhancePrompt(message.prompt, message.tone, sendResponse);
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
async function handleEnhancePrompt(prompt, tone = 'default', sendResponse) {
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

    // Check if user is premium first - skip word check if premium
    const isPremium = user.isPremium;
    
    if (!isPremium) {
      // Only check word usage for non-premium users
      const canUse = await checkWordUsage(prompt, user);
      
      if (!canUse.allowed) {
        sendResponse({ 
          error: canUse.error,
          message: canUse.message 
        });
        return;
      }
    } else {
      console.log('⭐ Premium user detected - bypassing word limit check');
    }

    // Generate tone-specific prompt
    const enhancedPrompt = generatePrompt(prompt, tone);
    
    console.log(`Humanizing with tone: ${tone}`);
    
    // Call API to humanize text
    const response = await fetch(`${API_BASE_URL}/api/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: enhancedPrompt })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Only update word usage for non-premium users
    if (!isPremium) {
      await updateWordUsage(prompt, user.email);
    } else {
      console.log('⭐ Premium user - skipping word deduction');
    }
    
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
    
    console.log('Checking word usage for user:', {
      email: user.email,
      isPremium: user.isPremium,
      premiumExpiry: user.premiumExpiry,
      wordsLeft: user.wordsLeft,
      wordCount: wordCount
    });
    
    // Check if premium (check both isPremium boolean and premiumExpiry)
    if (user.isPremium) {
      // If premiumExpiry exists, check if it's not expired
      if (user.premiumExpiry) {
        const expiryDate = new Date(user.premiumExpiry);
        const now = new Date();
        console.log('Premium expiry check:', {
          expiryDate: expiryDate.toISOString(),
          now: now.toISOString(),
          isValid: expiryDate > now
        });
        
        if (expiryDate > now) {
          console.log('✅ Premium user with valid expiry - unlimited access');
          return { allowed: true }; // Premium user with valid expiry, unlimited words
        } else {
          console.log('⚠️ Premium expired, falling back to word limit');
        }
      } else {
        // If no expiry date, just check isPremium flag
        console.log('✅ Premium user (no expiry set) - unlimited access');
        return { allowed: true };
      }
    }
    
    // Check free words limit
    console.log('Checking word limit:', user.wordsLeft, '>=', wordCount);
    if (user.wordsLeft >= wordCount) {
      console.log('✅ Sufficient words available');
      return { allowed: true };
    } else {
      console.log('❌ Insufficient words');
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

// Update word usage (only called for non-premium users)
async function updateWordUsage(text, email) {
  try {
    const wordCount = countWords(text);
    
    console.log(`Updating word usage for free user: ${email}, words: ${wordCount}`);
    
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
    console.log(`Words updated for ${email}: ${wordCount} words used, ${result.wordsLeft} remaining`);
    
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