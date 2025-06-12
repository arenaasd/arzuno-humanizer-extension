const button = document.createElement('button');
const img = document.createElement('img');
const spinner = document.createElement('div');

// Create and style the floating icon button (smaller)
img.src = chrome.runtime.getURL('icon.png');
img.alt = 'Prompt';
img.style.width = '31px';  // smaller size
img.style.height = '31px'; // smaller size
img.style.borderRadius = '50%';
img.style.objectFit = 'cover';

button.appendChild(img);
button.style.position = 'absolute';
button.style.display = 'none';
button.style.zIndex = '9999';
button.style.padding = '0';
button.style.border = 'none';
button.style.background = 'transparent';
button.style.cursor = 'pointer';

document.body.appendChild(button);

// Create a purple spinner with rotation animation
spinner.style.width = '30px';
spinner.style.height = '30px';
spinner.style.border = '4px solid #f3f3f3';
spinner.style.borderTop = '4px solid purple';
spinner.style.borderRadius = '50%';
spinner.style.animation = 'spin 1s linear infinite'; // Rotation animation
spinner.style.position = 'absolute';
spinner.style.top = '60%';
spinner.style.left = '50%';
spinner.style.transform = 'translate(-50%, -50%)';
spinner.style.zIndex = '10000';
spinner.style.display = 'none';
document.body.appendChild(spinner);

// Create and apply rotation animation for the spinner
const style = document.createElement('style');
style.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

let lastTypedText = '';

// Show button only when text is selected
document.addEventListener('mouseup', () => {
  const selection = window.getSelection().toString().trim();
  if (selection.length > 0) {
    lastTypedText = selection;
    const range = window.getSelection().getRangeAt(0);
    const rect = range.getBoundingClientRect();
    button.style.top = `${rect.bottom + window.scrollY + 10}px`;
    button.style.left = `${rect.right + window.scrollX + 10}px`;
    button.style.display = 'block';
  } else {
    button.style.display = 'none';
  }
});

button.addEventListener('click', () => {
  button.style.display = 'none';
  spinner.style.display = 'block'; // Show the spinner when the button is clicked

  // Send the selected text to be enhanced
  chrome.runtime.sendMessage({ type: 'enhance-prompt', prompt: lastTypedText }, function(response) {
    const enhancedText = response?.result || lastTypedText;

    console.log("Enhanced prompt:", enhancedText);

    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(enhancedText));
      selection.removeAllRanges();
    }

    // After text replacement, hide the spinner
    spinner.style.display = 'none';
  });
});
