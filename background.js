// Create context menu items when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explainText",
    title: "Explain Selected Text",
    contexts: ["selection"]
  });
  
  chrome.contextMenus.create({
    id: "translateText",
    title: "Translate Selected Text",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explainText" || info.menuItemId === "translateText") {
    const action = info.menuItemId === "explainText" ? "explain" : "translate";
    
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, {
      action: action,
      text: info.selectionText
    });
  }
});

// Handle API requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "callChatGPT") {
    callChatGPT(request.text, request.type, request.targetLanguage)
      .then(result => {
        sendResponse({ success: true, result: result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
});

async function callChatGPT(text, type, customTargetLanguage) {
  const result = await chrome.storage.sync.get(['apiKey', 'explainLanguage', 'translateLanguage']);
  const apiKey = result.apiKey;
  const explainLanguage = result.explainLanguage || 'en';
  const translateLanguage = customTargetLanguage || result.translateLanguage || 'en';
  
  if (!apiKey) {
    throw new Error('API key not set. Please set it in the extension popup.');
  }
  
  const languageNames = {
    'en': 'English',
    'zh': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ja': 'Japanese',
    'ko': 'Korean',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'ms': 'Malay',
    'id': 'Indonesian',
    'th': 'Thai',
    'vi': 'Vietnamese'
  };
  
  const explainLangName = languageNames[explainLanguage] || 'English';
  const translateLangName = languageNames[translateLanguage] || 'English';
  
  const prompts = {
    explain: `Please explain the following text in simple, clear terms. Provide the explanation in ${explainLangName}:\n\n"${text}"`,
    translate: `Please translate the following text to ${translateLangName}. If the text is already in ${translateLangName}, just let me know it's already in that language:\n\n"${text}"`
  };
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that explains and translates text clearly and concisely. Keep responses brief but comprehensive. When translating, if the source text is already in the target language, respond with "This text is already in ${translateLangName}."`
        },
        {
          role: 'user',
          content: prompts[type]
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }
  
  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  if (type === 'translate' && responseText.toLowerCase().includes('already in')) {
    return {
      text: responseText,
      alreadyInTargetLanguage: true
    };
  }
  
  return {
    text: responseText,
    alreadyInTargetLanguage: false
  };
}