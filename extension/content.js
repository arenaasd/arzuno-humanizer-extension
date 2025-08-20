// Create notification element
const notification = Object.assign(document.createElement('div'), {
  style: `
    position: fixed; top: 20px; right: 20px;
    background: #4CAF50; color: white;
    padding: 12px 20px; border-radius: 8px;
    z-index: 10000; font-size: 14px;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    display: none; transform: translateX(100%);
    transition: transform 0.3s ease-in-out;
    min-width: 200px; text-align: center;
  `
});
document.body.appendChild(notification);

// Loading cursor toggle
function setLoadingCursor(isLoading) {
  if (isLoading) {
    document.body.style.cursor = 'wait';
    if (!document.getElementById('loading-cursor-style')) {
      const style = document.createElement('style');
      style.id = 'loading-cursor-style';
      style.textContent = '* { cursor: wait !important; }';
      document.head.appendChild(style);
    }
  } else {
    document.body.style.cursor = '';
    const style = document.getElementById('loading-cursor-style');
    if (style) style.remove();
  }
}

// Show notification
function showNotification(message, isError = false, duration = 3000) {
  notification.textContent = message;
  notification.style.background = isError ? '#f44336' : '#4CAF50';
  notification.style.display = 'block';
  setTimeout(() => notification.style.transform = 'translateX(0)', 10);
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.style.display = 'none', 300);
  }, duration);
}

// Clipboard copy
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    setLoadingCursor(false);
    showNotification('✅ Text copied to clipboard!', false, 2500);
  } catch {
    setLoadingCursor(false);
    showNotification('❌ Failed to copy to clipboard', true);
  }
}

// Chrome message handling
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'start-humanizing') {
    setLoadingCursor(true);
    showNotification('🔄 Humanizing text...', false, 10000);
  } else if (message.type === 'copy-to-clipboard') {
    copyToClipboard(message.text);
  } else if (message.type === 'humanization-failed') {
    setLoadingCursor(false);
    showNotification('⚠️ Humanization failed, copying original text...', true, 3000);
    copyToClipboard(message.text);
  }
});

// Floating button and spinner
const button = document.createElement('button');
const img = Object.assign(document.createElement('img'), {
  src: chrome.runtime.getURL('icon.png'),
  alt: 'Prompt',
  style: 'width:31px;height:31px;border-radius:50%;object-fit:cover;'
});
button.appendChild(img);
Object.assign(button.style, {
  position: 'absolute',
  display: 'none',
  zIndex: '9999',
  padding: '0',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer'
});
document.body.appendChild(button);

// Spinner setup
const spinner = document.createElement('div');
Object.assign(spinner.style, {
  width: '30px',
  height: '30px',
  border: '4px solid #f3f3f3',
  borderTop: '4px solid purple',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  position: 'absolute',
  top: '60%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: '10000',
  display: 'none'
});
document.body.appendChild(spinner);

// Spinner animation keyframes
const spinStyle = document.createElement('style');
spinStyle.textContent = `@keyframes spin { 0% { transform: rotate(0); } 100% { transform: rotate(360deg); } }`;
document.head.appendChild(spinStyle);

let lastTypedText = '';

// Floating button click
button.addEventListener('click', () => {
  button.style.display = 'none';
  spinner.style.display = 'block';
  chrome.runtime.sendMessage({ type: 'enhance-prompt', prompt: lastTypedText }, (response) => {
    const enhancedText = response?.result || lastTypedText;
    const selection = window.getSelection();
    if (selection.rangeCount) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(enhancedText));
      selection.removeAllRanges();
    }
    spinner.style.display = 'none';
  });
});
