# chrome-translator-explainer
# Smart Text Helper - AI Translator & Explainer

A powerful Chrome extension that instantly translates and explains any text on web pages using OpenAI's GPT models. Simply select text and get AI-powered translations or explanations in a beautiful, intuitive interface.

## ✨ Features

### Core Functionality
- **🌐 Smart Translation**: Translate text between 16+ languages with automatic language detection
- **🧠 AI Explanations**: Get clear, concise explanations of complex text or concepts
- **⚡ Auto-Action Mode**: Automatically perform your last action when selecting text
- **🎯 Context Menu Integration**: Right-click any selected text for quick access
- **🔄 Smart Language Switching**: Automatic alternative language suggestions

### User Experience
- **🎨 Beautiful UI**: Modern, glassmorphic design with smooth animations
- **📱 Responsive Design**: Works perfectly on desktop and mobile browsers
- **⌨️ Keyboard Shortcuts**: ESC to close, Enter to save settings
- **🖱️ Draggable Popups**: Move result windows anywhere on screen
- **📋 One-Click Copy**: Copy results to clipboard instantly

### Advanced Features
- **🔄 Mode Toggle**: Switch between translate/explain modes in real-time
- **🌍 Language Picker**: Quick access to 16 supported languages
- **💾 Smart Memory**: Remembers your preferences and last actions
- **🔐 Secure Storage**: All data stored locally in your browser
- **⚙️ Customizable**: Configure default languages and behaviors

## 🚀 Installation

### Option 1: Chrome Web Store (Recommended)
*Coming soon - extension will be published to Chrome Web Store*

### Option 2: Developer Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your toolbar

## 🔧 Setup

1. **Get OpenAI API Key**
   - Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Create a new API key
   - Copy the key (starts with `sk-`)

2. **Configure Extension**
   - Click the extension icon in your toolbar
   - Paste your API key in the "OpenAI API Key" field
   - Click "Save Key"
   - Set your preferred languages
   - Configure auto-action if desired

## 📖 How to Use

### Basic Usage
1. **Select any text** on any webpage
2. **Choose an action** from the floating menu:
   - Click "Translate" to translate the text
   - Click "Explain" to get an AI explanation
3. **View results** in the popup window
4. **Copy results** or close when done

### Advanced Usage
- **Auto-Action**: Enable in settings to automatically perform your last action on text selection
- **Context Menu**: Right-click selected text → "Translate/Explain Selected Text"
- **Mode Switching**: Use the toggle in result popups to switch between translate/explain
- **Language Switching**: Use the dropdown in translate mode to change target language
- **Alternative Languages**: If text is already in your default language, choose an alternative

### Keyboard Shortcuts
- **ESC**: Close any popup or picker
- **Enter**: Save settings in popup
- **Double-click**: Quick text selection

## 🌍 Supported Languages

- English
- Chinese (Simplified)
- Chinese (Traditional)
- Spanish
- French
- German
- Japanese
- Korean
- Portuguese
- Russian
- Arabic
- Hindi
- Malay
- Indonesian
- Thai
- Vietnamese

## 🔒 Privacy & Security

- **Local Storage Only**: All settings stored locally in your browser
- **No Data Collection**: We don't collect or store any personal information
- **OpenAI Integration**: Selected text sent to OpenAI for processing only
- **Secure API**: Your API key stored securely in Chrome's sync storage

See our [Privacy Policy](privacy.html) for complete details.

## 🛠️ Technical Details

### Built With
- **Manifest V3**: Latest Chrome extension standard
- **OpenAI GPT-4o-mini**: Fast, accurate AI processing
- **Modern CSS**: Glassmorphic design with backdrop filters
- **Vanilla JavaScript**: No external dependencies
- **Chrome Storage API**: Secure, synchronized settings

### File Structure
```
smart-text-helper/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for API calls
├── content.js            # Content script for page interaction
├── popup.html            # Settings popup interface
├── popup.js              # Settings popup logic
├── popup.css             # Settings popup styles
├── styles.css            # Content script styles
├── privacy.html          # Privacy policy
└── icons/               # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Permissions
- `activeTab`: Access current tab for text selection
- `contextMenus`: Right-click menu integration
- `storage`: Save user preferences
- `https://api.openai.com/*`: OpenAI API access

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Setup
1. Clone the repository
2. Make your changes
3. Test thoroughly in Chrome
4. Ensure all features work as expected
5. Submit pull request with detailed description

## 📝 Changelog

### Version 1.0.0
- Initial release
- Translation and explanation functionality
- Auto-action mode
- 16+ language support
- Modern UI with glassmorphic design
- Context menu integration
- Draggable popups
- Local settings storage

## 🐛 Known Issues

- None currently reported

## 📞 Support

- **Issues**: Report bugs on GitHub Issues
- **Feature Requests**: Submit via GitHub Issues
- **Questions**: Check existing issues or create new one

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing the GPT API
- **Chrome Extensions Team** for excellent documentation
- **Community** for feedback and suggestions

---

**Made with ❤️ for productivity and learning**

*Star ⭐ this repository if you find it helpful!*
