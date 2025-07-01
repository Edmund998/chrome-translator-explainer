// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
  // Load API key
  chrome.storage.sync.get(['apiKey'], (result) => {
    if (result.apiKey) {
      document.getElementById('apiKey').value = result.apiKey;
    }
  });
  
  // Load language settings and auto-action settings
  chrome.storage.sync.get(['explainLanguage', 'translateLanguage', 'autoAction', 'lastAction'], (result) => {
    if (result.explainLanguage) {
      document.getElementById('explainLanguage').value = result.explainLanguage;
    }
    if (result.translateLanguage) {
      document.getElementById('translateLanguage').value = result.translateLanguage;
    }
    if (result.autoAction !== undefined) {
      document.getElementById('autoAction').checked = result.autoAction;
    }
    if (result.lastAction) {
      document.getElementById('lastActionValue').textContent = result.lastAction;
    }
  });
});

// Save API key
document.getElementById('saveKey').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  const status = document.getElementById('status');
  
  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }
  
  if (!apiKey.startsWith('sk-')) {
    showStatus('Invalid API key format', 'error');
    return;
  }
  
  chrome.storage.sync.set({ apiKey: apiKey }, () => {
    showStatus('API key saved successfully', 'success');
  });
});

// Save language settings
document.getElementById('saveLanguages').addEventListener('click', () => {
  const explainLanguage = document.getElementById('explainLanguage').value;
  const translateLanguage = document.getElementById('translateLanguage').value;
  
  chrome.storage.sync.set({ 
    explainLanguage: explainLanguage,
    translateLanguage: translateLanguage
  }, () => {
    showStatus('Language settings saved successfully', 'success');
  });
});

// Handle auto-action toggle
document.getElementById('autoAction').addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  chrome.storage.sync.set({ autoAction: isEnabled }, () => {
    showStatus(isEnabled ? 'Auto-action enabled' : 'Auto-action disabled', 'success');
  });
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  // Smooth fade out
  setTimeout(() => {
    status.style.opacity = '0';
    setTimeout(() => {
      status.className = 'status';
      status.style.display = 'none';
      status.style.opacity = '1';
    }, 300);
  }, 3000);
}

// Handle enter key in input
document.getElementById('apiKey').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('saveKey').click();
  }
});

// Listen for storage changes to update last action display
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.lastAction) {
    document.getElementById('lastActionValue').textContent = changes.lastAction.newValue || 'None';
  }
});