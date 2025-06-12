chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'enhance-prompt') {
    const prompt = message.prompt;

    fetch("https://arzuno-prompts.vercel.app/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    })
    .then(res => res.json())
    .then(data => sendResponse({ result: data.text }))
    .catch(err => {
      console.error("Enhancement failed:", err);
      sendResponse({ result: prompt });
    });

    return true; // Keep port open for async response
  }
});
