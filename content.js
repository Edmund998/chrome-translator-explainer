// Variables to track selection
let selectedText = '';
let selectionMenu = null;
let lastSelection = null;
let autoActionEnabled = false;
let lastAction = null;
let wasAutoAction = false;
let isProcessing = false;
let lastProcessedText = null;
let settingsLoaded = false;
let currentPopupMode = null; // Track current popup mode (translate/explain)
let lastClosedText = null; // Track text that was just closed
let alternativeLanguage = null; // Remember alternative language choice
let currentTranslateLanguage = null; // Current translation language in popup

// Language names mapping
const languageNames = {
  'auto': 'Detect Language',
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

// Load settings on startup
chrome.storage.sync.get(['autoAction', 'lastAction', 'alternativeLanguage', 'translateLanguage'], (result) => {
  autoActionEnabled = result.autoAction || false;
  lastAction = result.lastAction || 'translate'; // Default to translate
  alternativeLanguage = result.alternativeLanguage || null; // Load saved alternative language
  currentTranslateLanguage = result.translateLanguage || 'en'; // Load default translation language
  settingsLoaded = true; // Mark settings as loaded
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.autoAction) {
      autoActionEnabled = changes.autoAction.newValue;
    }
    if (changes.lastAction) {
      lastAction = changes.lastAction.newValue;
    }
    if (changes.alternativeLanguage) {
      alternativeLanguage = changes.alternativeLanguage.newValue;
    }
    if (changes.translateLanguage) {
      currentTranslateLanguage = changes.translateLanguage.newValue;
    }
  }
});

// Create selection menu
function createSelectionMenu() {
  const menu = document.createElement('div');
  menu.className = 'chatgpt-helper-menu';
  menu.innerHTML = `
    <button class="menu-button" data-action="translate">Translate</button>
    <button class="menu-button" data-action="explain">Explain</button>
  `;
  menu.style.display = 'none';
  menu.style.opacity = '0';
  menu.style.transform = 'translateY(4px)';
  document.body.appendChild(menu);
  
  menu.addEventListener('click', (e) => {
    const button = e.target.closest('.menu-button');
    if (button && button.dataset.action) {
      const action = button.dataset.action;
      // Save last action
      chrome.storage.sync.set({ lastAction: action });
      // Reset auto-action flag for manual clicks
      wasAutoAction = false;
      lastProcessedText = null; // Reset before processing
      hideSelectionMenu();
      // Store text before updating internal state
      const textToProcess = selectedText;
      // Don't clear the selection - user may want to right-click
      selectedText = '';
      
      // Check if there's an existing popup - if so, it will be replaced by processText
      currentPopupMode = action;
      
      processText(textToProcess, action);
    }
  });
  
  return menu;
}

// Update menu to show last action
function updateMenuForLastAction() {
  if (!selectionMenu) return;
  
  // Use 'translate' as default if no last action
  const actionToHighlight = lastAction || 'translate';
  
  // Reset all buttons
  selectionMenu.querySelectorAll('.menu-button').forEach(btn => {
    btn.classList.remove('last-used');
  });
  
  // Highlight last used action
  const lastUsedButton = selectionMenu.querySelector(`[data-action="${actionToHighlight}"]`);
  if (lastUsedButton) {
    lastUsedButton.classList.add('last-used');
  }
}

// Process selected text
function processText(text, action, targetLanguage = null) {
  // Prevent duplicate processing (unless switching modes or selecting new language)
  if (isProcessing) {
    return;
  }
  
  // Allow reprocessing if mode changed or target language specified
  if (lastProcessedText === text && currentPopupMode === action && !targetLanguage) {
    return;
  }
  
  // Save last action whenever processing text
  if (action === 'translate' || action === 'explain') {
    chrome.storage.sync.set({ lastAction: action });
  }
  
  isProcessing = true;
  lastProcessedText = text;
  showLoader();
  
  // Use alternative language if translating and no specific target language provided
  let languageToUse = targetLanguage;
  if (!languageToUse && action === 'translate') {
    languageToUse = alternativeLanguage || currentTranslateLanguage;
  }
  
  // Send message to background script
  chrome.runtime.sendMessage({
    action: 'callChatGPT',
    text: text,
    type: action,
    targetLanguage: languageToUse
  }, (response) => {
    hideLoader();
    isProcessing = false;
    
    if (response && response.success) {
      if (response.result.alreadyInTargetLanguage && !targetLanguage && !alternativeLanguage) {
        currentPopupMode = null; // Clear mode when showing language picker
        showLanguagePicker();
      } else {
        showResult(response.result.text, action, languageToUse);
      }
    } else {
      showError(response?.error || 'Unknown error occurred');
      lastProcessedText = null; // Reset on error
      currentPopupMode = null; // Reset mode on error
      // Don't clear selection on error - user may want to try again
      selectedText = '';
    }
  });
}

// Show loading indicator
function showLoader() {
  const existingLoader = document.querySelector('.chatgpt-helper-loader');
  if (existingLoader) return;
  
  const loader = document.createElement('div');
  loader.className = 'chatgpt-helper-loader';
  loader.innerHTML = `
    <div class="loader-content">
      <div class="spinner"></div>
      <div class="loader-text">Processing...</div>
    </div>
  `;
  document.body.appendChild(loader);
  
  // Add subtle entrance animation
  requestAnimationFrame(() => {
    loader.style.opacity = '1';
  });
}

function hideLoader() {
  const loader = document.querySelector('.chatgpt-helper-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      if (loader && loader.parentNode) {
        loader.remove();
      }
    }, 200);
  }
}

// Generate language dropdown options
function generateLanguageOptions(selectedLang = null) {
  const options = Object.entries(languageNames).map(([code, name]) => {
    const selected = (selectedLang === code) ? 'selected' : '';
    return `<option value="${code}" ${selected}>${name}</option>`;
  }).join('');
  return options;
}

// Show result popup
function showResult(result, type, usedLanguage = null) {
  const existingPopup = document.querySelector('.chatgpt-helper-popup');
  if (existingPopup) existingPopup.remove();
  
  // Track current mode
  currentPopupMode = type;
  
  // Ensure result is a string and escape HTML
  const resultText = String(result || 'No response received');
  const escapedResult = resultText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
  
  const popup = document.createElement('div');
  popup.className = 'chatgpt-helper-popup';
  
  // Add auto-action indicator if it was triggered automatically
  const autoActionIndicator = wasAutoAction ? 
    '<span class="auto-action-indicator">Auto</span>' : '';
  
  // Determine current language for dropdown
  const currentLang = usedLanguage || alternativeLanguage || currentTranslateLanguage || 'en';
  
  popup.innerHTML = `
    <div class="popup-header">
      <span class="popup-title">${type === 'explain' ? 'Explanation' : 'Translation'}${autoActionIndicator}</span>
      <div class="header-controls">
        <div class="language-selector" ${type === 'explain' ? 'style="display: none;"' : ''}>
          <select class="language-dropdown" id="languageSelect">
            ${generateLanguageOptions(currentLang)}
          </select>
        </div>
        <div class="mode-toggle">
          <label class="toggle-switch-popup">
            <input type="checkbox" id="modeToggle" ${type === 'explain' ? 'checked' : ''}>
            <span class="toggle-slider-popup">
              <span class="toggle-label translate-label">Translate</span>
              <span class="toggle-label explain-label">Explain</span>
            </span>
          </label>
        </div>
      </div>
      <button class="header-close-btn" title="Close (ESC)">×</button>
    </div>
    <div class="popup-content">${escapedResult}</div>
    <div class="popup-footer">
      <button class="copy-btn">Copy</button>
      <button class="close-btn">Close</button>
    </div>
  `;
  document.body.appendChild(popup);
  
  // Reset auto-action flag
  wasAutoAction = false;
  
  // Don't clear the selection - user may want to right-click
  // Just update our internal tracking
  selectedText = '';
  
  // Force a reflow for smooth animation
  popup.offsetHeight;
  
  // Add toggle event listener
  const toggle = popup.querySelector('#modeToggle');
  const languageSelector = popup.querySelector('.language-selector');
  
  toggle.addEventListener('change', (e) => {
    const newMode = e.target.checked ? 'explain' : 'translate';
    
    // Show/hide language selector based on mode
    if (newMode === 'explain') {
      languageSelector.style.display = 'none';
    } else {
      languageSelector.style.display = 'flex';
    }
    
    if (newMode !== currentPopupMode) {
      // Update title immediately for better UX
      const titleSpan = popup.querySelector('.popup-title');
      if (titleSpan) {
        const autoIndicator = popup.querySelector('.auto-action-indicator');
        const autoIndicatorHTML = autoIndicator ? autoIndicator.outerHTML : '';
        titleSpan.innerHTML = (newMode === 'explain' ? 'Explanation' : 'Translation') + autoIndicatorHTML;
      }
      // Force process with new mode
      currentPopupMode = null; // Reset to force reprocessing
      processText(lastProcessedText, newMode);
    }
  });
  
  // Add language dropdown event listener
  const languageDropdown = popup.querySelector('#languageSelect');
  languageDropdown.addEventListener('change', (e) => {
    const selectedLanguage = e.target.value;
    if (selectedLanguage !== currentLang && currentPopupMode === 'translate') {
      // Update current translation language
      currentTranslateLanguage = selectedLanguage;
      // Force reprocess with new language
      currentPopupMode = null; // Reset to force reprocessing
      processText(lastProcessedText, 'translate', selectedLanguage);
    }
  });
  
  // Add event listeners
  popup.querySelector('.header-close-btn').addEventListener('click', () => {
    lastClosedText = lastProcessedText; // Remember closed text
    lastProcessedText = null; // Reset when manually closing
    currentPopupMode = null;
    setTimeout(() => { lastClosedText = null; }, 2000); // Clear after 2 seconds
    popup.remove();
  });
  popup.querySelector('.close-btn').addEventListener('click', () => {
    lastClosedText = lastProcessedText; // Remember closed text
    lastProcessedText = null; // Reset when manually closing
    currentPopupMode = null;
    setTimeout(() => { lastClosedText = null; }, 2000); // Clear after 2 seconds
    popup.remove();
  });
  popup.querySelector('.copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(resultText).then(() => {
      const btn = popup.querySelector('.copy-btn');
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text:', err);
      showError('Failed to copy text');
    });
  });
  
  // Add keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      lastClosedText = lastProcessedText; // Remember closed text
      lastProcessedText = null; // Reset when pressing Escape
      currentPopupMode = null;
      setTimeout(() => { lastClosedText = null; }, 2000); // Clear after 2 seconds
      popup.remove();
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  
  // Clean up event listener when popup is removed
  const originalRemove = popup.remove;
  popup.remove = function() {
    document.removeEventListener('keydown', handleKeyDown);
    lastProcessedText = null; // Reset when popup is removed
    currentPopupMode = null;
    originalRemove.call(this);
  };
  
  // Make popup draggable
  makeElementDraggable(popup, popup.querySelector('.popup-header'));
  
  // Focus on copy button for keyboard navigation
  setTimeout(() => {
    popup.querySelector('.copy-btn').focus();
  }, 100);
}

// Show language picker
function showLanguagePicker() {
  const existingPicker = document.querySelector('.chatgpt-helper-language-picker');
  if (existingPicker) existingPicker.remove();
  
  const picker = document.createElement('div');
  picker.className = 'chatgpt-helper-language-picker';
  
  // Add indicator for current alternative language
  const currentLanguageMsg = alternativeLanguage ? 
    `Text is already in your default language. Current alternative: ${getLanguageName(alternativeLanguage)}. Select another:` :
    'Text is already in your default language. Select another:';
  
  picker.innerHTML = `
    <div class="picker-header">
      <span class="picker-title">Select Language</span>
      <button class="header-close-btn">×</button>
    </div>
    <div class="picker-content">
      <p class="picker-message">${currentLanguageMsg}</p>
      ${alternativeLanguage ? `<button class="reset-language-btn">Reset to default</button>` : ''}
      <div class="language-grid">
        <button class="language-btn" data-lang="en">English</button>
        <button class="language-btn" data-lang="zh">Chinese (Simplified)</button>
        <button class="language-btn" data-lang="zh-TW">Chinese (Traditional)</button>
        <button class="language-btn" data-lang="es">Spanish</button>
        <button class="language-btn" data-lang="fr">French</button>
        <button class="language-btn" data-lang="de">German</button>
        <button class="language-btn" data-lang="ja">Japanese</button>
        <button class="language-btn" data-lang="ko">Korean</button>
        <button class="language-btn" data-lang="pt">Portuguese</button>
        <button class="language-btn" data-lang="ru">Russian</button>
        <button class="language-btn" data-lang="ar">Arabic</button>
        <button class="language-btn" data-lang="hi">Hindi</button>
        <button class="language-btn" data-lang="ms">Malay</button>
        <button class="language-btn" data-lang="id">Indonesian</button>
        <button class="language-btn" data-lang="th">Thai</button>
        <button class="language-btn" data-lang="vi">Vietnamese</button>
      </div>
    </div>
  `;
  document.body.appendChild(picker);
  
  // Store the text to translate before updating internal state
  const textToTranslate = selectedText || lastProcessedText;
  
  // Don't clear the selection - user may want to right-click
  selectedText = '';
  
  // Force a reflow for smooth animation
  picker.offsetHeight;
  
  // Add event listeners
  picker.querySelector('.header-close-btn').addEventListener('click', () => {
    lastProcessedText = null; // Reset when closing picker
    currentPopupMode = null; // Reset mode
    picker.remove();
  });
  
  // Handle reset button if present
  const resetBtn = picker.querySelector('.reset-language-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      alternativeLanguage = null;
      chrome.storage.sync.remove('alternativeLanguage');
      lastProcessedText = null; // Reset when clearing language
      currentPopupMode = null; // Reset mode
      picker.remove();
    });
  }
  
  // Handle language selection
  picker.querySelectorAll('.language-btn').forEach(btn => {
    // Highlight current alternative language
    if (btn.dataset.lang === alternativeLanguage) {
      btn.classList.add('current-language');
    }
    
    btn.addEventListener('click', () => {
      const targetLang = btn.dataset.lang;
      // Save alternative language choice
      alternativeLanguage = targetLang;
      chrome.storage.sync.set({ alternativeLanguage: targetLang });
      lastProcessedText = null; // Reset before new translation
      picker.remove();
      processText(textToTranslate, 'translate', targetLang);
      wasAutoAction = false; // Reset flag after language selection
    });
  });
  
  // Make picker draggable
  makeElementDraggable(picker, picker.querySelector('.picker-header'));
}

// Helper function to get language name
function getLanguageName(code) {
  return languageNames[code] || code;
}

// Show error message
function showError(error) {
  isProcessing = false; // Reset processing flag on error
  const existingError = document.querySelector('.chatgpt-helper-error');
  if (existingError) existingError.remove();
  
  const errorEl = document.createElement('div');
  errorEl.className = 'chatgpt-helper-error';
  errorEl.innerHTML = `
    <div class="error-content">
      <span>Error: ${error}</span>
      <button class="error-close-btn">×</button>
    </div>
  `;
  document.body.appendChild(errorEl);
  
  // Auto-remove after 5 seconds
  errorEl.querySelector('.error-close-btn').addEventListener('click', () => errorEl.remove());
  setTimeout(() => {
    if (errorEl && errorEl.parentNode) {
      errorEl.style.opacity = '0';
      errorEl.style.transform = 'translateX(100%)';
      setTimeout(() => errorEl.remove(), 300);
    }
  }, 5000);
}

// Make element draggable
function makeElementDraggable(element, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  handle.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    // Don't drag if clicking on interactive elements
    if (e.target.closest('.mode-toggle') || 
        e.target.closest('.header-close-btn') ||
        e.target.closest('.language-selector') ||
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'SELECT') {
      return;
    }
    
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Show selection menu
function showSelectionMenu(left, top) {
  if (!selectionMenu) return;
  
  selectionMenu.style.left = left + 'px';
  selectionMenu.style.top = top + 'px';
  selectionMenu.style.display = 'flex';
  
  // Force a reflow to ensure the display change is applied
  selectionMenu.offsetHeight;
  
  selectionMenu.style.opacity = '1';
  selectionMenu.style.transform = 'translateY(0)';
}

// Hide selection menu
function hideSelectionMenu() {
  if (!selectionMenu) return;
  
  selectionMenu.style.opacity = '0';
  selectionMenu.style.transform = 'translateY(4px)';
  
  setTimeout(() => {
    if (selectionMenu) {
      selectionMenu.style.display = 'none';
    }
  }, 150);
}

// Handle text selection
function handleTextSelection() {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (text.length > 0 && text.length < 5000) {
    // Don't process if this is the same text that was just closed
    if (text === lastClosedText) {
      return;
    }
    
    selectedText = text;
    
    // If there's an existing popup, update it with new content
    const existingPopup = document.querySelector('.chatgpt-helper-popup');
    if (existingPopup && currentPopupMode) {
      // Reset processed text to allow new processing
      lastProcessedText = null;
      // Don't clear selection when updating existing popup
      processText(selectedText, currentPopupMode);
      return;
    }
    
    // Don't show menu if loader or language picker is open
    if (document.querySelector('.chatgpt-helper-loader') ||
        document.querySelector('.chatgpt-helper-language-picker')) {
      return;
    }
    
    // Check if auto-action is enabled and settings are loaded
    if (settingsLoaded && autoActionEnabled) {
      // Set flag for auto-action
      wasAutoAction = true;
      // Store text before updating internal state
      const textToProcess = selectedText;
      // Don't clear the selection - user may want to right-click
      selectedText = '';
      
      // Use current popup mode if available, otherwise use last action (default to translate)
      const actionToUse = currentPopupMode || lastAction || 'translate';
      
      // Automatically execute the action
      processText(textToProcess, actionToUse);
      return;
    }
    
    // Reset auto-action flag if showing menu
    wasAutoAction = false;
    
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Position menu above or below selection based on space
      const menuHeight = 40;
      const menuWidth = 150;
      let top = rect.bottom + window.scrollY + 8;
      let left = rect.left + rect.width / 2 - menuWidth / 2;
      
      // Check if menu would go off screen bottom
      if (rect.bottom + menuHeight + 8 > window.innerHeight) {
        top = rect.top + window.scrollY - menuHeight - 8;
      }
      
      // Check if menu would go off screen right
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 10;
      }
      
      // Check if menu would go off screen left
      if (left < 10) {
        left = 10;
      }
      
      // Update menu to show last action indicator
      updateMenuForLastAction();
      
      showSelectionMenu(left, top);
      lastSelection = range.cloneRange();
    } catch (error) {
      console.error('Error showing selection menu:', error);
      hideSelectionMenu();
    }
  } else {
    hideSelectionMenu();
    lastSelection = null;
  }
}

// Mouse up event listener
document.addEventListener('mouseup', (e) => {
  // Don't handle text selection if interacting with any of our UI elements
  if (e.target.closest('.chatgpt-helper-menu') || 
      e.target.closest('.chatgpt-helper-popup') ||
      e.target.closest('.chatgpt-helper-loader') ||
      e.target.closest('.chatgpt-helper-language-picker') ||
      e.target.closest('.chatgpt-helper-error')) {
    return;
  }
  
  setTimeout(() => {
    handleTextSelection();
  }, 10);
});

// Double click event listener
document.addEventListener('dblclick', (e) => {
  setTimeout(() => {
    handleTextSelection();
  }, 10);
});

// Hide menu when clicking outside or starting new selection
document.addEventListener('mousedown', (e) => {
  // Check if clicking on any of our UI elements
  const isOurUI = e.target.closest('.chatgpt-helper-menu') || 
                  e.target.closest('.chatgpt-helper-popup') ||
                  e.target.closest('.chatgpt-helper-loader') ||
                  e.target.closest('.chatgpt-helper-language-picker') ||
                  e.target.closest('.chatgpt-helper-error');
  
  if (!isOurUI) {
    hideSelectionMenu();
    
    // Close popup if clicking outside
    const popup = document.querySelector('.chatgpt-helper-popup');
    if (popup) {
      lastClosedText = lastProcessedText; // Remember closed text
      lastProcessedText = null;
      currentPopupMode = null;
      setTimeout(() => { lastClosedText = null; }, 2000); // Clear after 2 seconds
      popup.remove();
    }
    
    // Close language picker if clicking outside
    const picker = document.querySelector('.chatgpt-helper-language-picker');
    if (picker) {
      lastProcessedText = null;
      currentPopupMode = null; // Reset mode when closing picker
      picker.remove();
    }
  }
});

// Handle messages from background script for context menu
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'explain' || request.action === 'translate') {
    // Store the text globally for language picker
    selectedText = request.text;
    wasAutoAction = false; // Context menu is manual action
    lastProcessedText = null; // Reset to allow processing
    // Don't clear selection - user has right-clicked on it
    processText(request.text, request.action);
  }
});

// Initialize
selectionMenu = createSelectionMenu();