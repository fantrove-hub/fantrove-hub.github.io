class LanguageManager {    
  constructor() {    
    this.languagesConfig = {};    
    this.selectedLang = '';    
    this.isLanguageDropdownOpen = false;    
    this.languageCache = {};    
    this.isUpdatingLanguage = false;    
  }    
    
  async loadLanguagesConfig() {    
    try {    
      const storedConfig = localStorage.getItem('languagesConfig');    
      if (storedConfig) {    
        const parsedConfig = JSON.parse(storedConfig);    
        if (parsedConfig && typeof parsedConfig === 'object' && Object.keys(parsedConfig).length > 0) {    
          this.languagesConfig = parsedConfig;    
        }    
      }    
    
      if (Object.keys(this.languagesConfig).length === 0) {    
        const response = await fetch('https://fantrove-hub.github.io/assets/json/language.json');    
        if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);    
    
        const newConfig = await response.json();    
        if (!newConfig || typeof newConfig !== 'object' || Object.keys(newConfig).length === 0) {    
          throw new Error('Invalid or empty language configuration');    
        }    
    
        this.languagesConfig = newConfig;    
        localStorage.setItem('languagesConfig', JSON.stringify(this.languagesConfig));    
      }    
          
      this.handleInitialLanguage();    
      this.initializeCustomLanguageSelector();    
    } catch (error) {    
      console.warn('Error loading languages config:', error);    
      this.showAlertAndRefresh('Failed to load language data.');    
    }    
  }    
    
  detectBrowserLanguage() {    
    const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage];    
    return browserLanguages.map(lang => lang.split('-')[0]).find(lang => this.languagesConfig[lang]) || 'en';    
  }    
    
handleInitialLanguage() {    
 document.querySelectorAll('[data-translate]').forEach(el => el.setAttribute('data-original-text', el.textContent));    
     
 const urlParams = new URLSearchParams(window.location.search);    
 const langFromUrl = urlParams.get('lang');    
     
 // ตรวจสอบภาษาในลำดับที่รวดเร็วขึ้น    
 const detectedLang = langFromUrl && this.languagesConfig[langFromUrl] ?    
  langFromUrl :    
  localStorage.getItem('selectedLang') || this.detectBrowserLanguage();    
     
 // ถ้าภาษาเปลี่ยนไปจากเดิม ให้เปลี่ยนและบันทึกใหม่    
 if (localStorage.getItem('selectedLang') !== detectedLang) {    
  localStorage.setItem('selectedLang', detectedLang);    
  this.selectedLang = detectedLang;    
  document.documentElement.lang = this.selectedLang; // อัปเดต lang ของ <html> ทันที    
  this.updatePageLanguage(this.selectedLang);    
      
  // **Force reload เฉพาะเนื้อหาโดยไม่โหลดหน้าใหม่**    
  setTimeout(() => {    
   window.location.reload();    
  }, 50);    
 } else {    
  this.selectedLang = detectedLang;    
  document.documentElement.lang = this.selectedLang;    
  this.updatePageLanguage(this.selectedLang);    
 }    
}    
    
  showAlertAndRefresh(message) {    
    alert(message);    
    setTimeout(() => location.reload(), 500);    
  }    
    
  initializeCustomLanguageSelector() {    
    const languageContainer = document.getElementById('language-selector-container');    
    if (!languageContainer) return;    
    
    this.createOverlay();    
    this.createLanguageButton(languageContainer);    
    this.createLanguageDropdown();    
    
    window.addEventListener('popstate', this.handlePopState.bind(this));    
  }    
    
  createOverlay() {    
    if (!this.languageOverlay) {    
      this.languageOverlay = document.createElement('div');    
      this.languageOverlay.id = 'language-overlay';    
      document.body.appendChild(this.languageOverlay);    
      this.languageOverlay.addEventListener('click', this.closeLanguageDropdown.bind(this));    
    }    
  }    
    
  createLanguageButton(container) {    
    if (!this.languageButton) {    
      this.languageButton = document.createElement('button');    
      this.languageButton.id = 'language-button';    
      this.languageButton.className = container.getAttribute('lang-class') || 'default-lang-class';    
      this.updateButtonText();    
      this.languageButton.addEventListener('click', this.toggleLanguageDropdown.bind(this));    
      container.appendChild(this.languageButton);    
    }    
  }    
    
  createLanguageDropdown() {    
    if (!this.languageDropdown) {    
      this.languageDropdown = document.createElement('div');    
      this.languageDropdown.id = 'language-dropdown';    
      document.body.appendChild(this.languageDropdown);    
    
      const fragment = document.createDocumentFragment();    
      Object.entries(this.languagesConfig).forEach(([lang, config]) => {    
        const option = document.createElement('div');    
        option.className = 'language-option';    
        option.textContent = config.label;    
        option.dataset.language = lang;    
        option.addEventListener('click', () => this.selectLanguage(lang));    
        fragment.appendChild(option);    
      });    
    
      this.languageDropdown.appendChild(fragment);    
    }    
  }    
    
  updateButtonText() {    
    if (this.languageButton) {    
      this.languageButton.textContent = this.languagesConfig[this.selectedLang]?.buttonText || 'Select Language';    
    }    
  }    
    
  toggleLanguageDropdown() {    
    this.isLanguageDropdownOpen ? this.closeLanguageDropdown() : this.openLanguageDropdown();    
  }    
    
  handlePopState() {    
    if (this.isLanguageDropdownOpen) this.closeLanguageDropdown();    
    this.selectedLang = localStorage.getItem('selectedLang') || 'en';    
    this.updatePageLanguage(this.selectedLang);    
  }    
    
  openLanguageDropdown() {    
    if (this.isLanguageDropdownOpen) return;    
    
    this.isLanguageDropdownOpen = true;    
    this.languageOverlay.style.display = 'block';    
    this.languageDropdown.style.display = 'block';    
    document.body.classList.add('no-scroll');    
    
    setTimeout(() => {    
      this.languageOverlay.classList.add('fade-in');    
      this.languageDropdown.classList.add('fade-in');    
    }, 10);    
  }    
    
  closeLanguageDropdown() {    
    if (!this.isLanguageDropdownOpen) return;    
    
    this.isLanguageDropdownOpen = false;    
    this.languageOverlay.classList.remove('fade-in');    
    this.languageDropdown.classList.remove('fade-in');    
    
    // Do not save the state in browser history anymore    
    history.replaceState({}, ''); // Remove dropdown state from history    
    
    setTimeout(() => {    
      this.languageOverlay.style.display = 'none';    
      this.languageDropdown.style.display = 'none';    
      document.body.classList.remove('no-scroll');    
    }, 300);    
  }    
    
async selectLanguage(language) {
    if (!this.languagesConfig[language]) {
        console.warn(`Unsupported language: ${language}. Falling back to English.`);
        language = 'en';
    }

    this.selectedLang = language;
    this.updateButtonText();

    // อัปเดต URL โดยไม่ต้องโหลดใหม่
    const url = new URL(window.location);
    url.searchParams.set('lang', language);
    history.replaceState({}, '', url);

    // บันทึกภาษาที่เลือกลงใน localStorage
    localStorage.setItem('selectedLang', language);

    // อัปเดตค่า lang ของ <html>
    document.documentElement.lang = language;

    // โหลดและอัปเดตเนื้อหาภาษาทันที
    await this.updatePageLanguage(language);

    this.closeLanguageDropdown();
}

async updatePageLanguage(language) {
    if (this.isUpdatingLanguage) return;
    this.isUpdatingLanguage = true;

    if (!this.languagesConfig[language]) {
        console.warn(`Unsupported language: ${language}. Falling back to English.`);
        language = 'en';
    }

    document.documentElement.lang = language;

    if (language === 'en') {
        this.resetToEnglishContent();
        this.updateButtonText();
        this.isUpdatingLanguage = false;
        return;
    }

    if (!this.languageCache[language]) {
        const languageData = await this.loadLanguageData(language);
        if (Object.keys(languageData).length === 0) {
            this.resetToEnglishContent();
            this.updateButtonText();
            this.isUpdatingLanguage = false;
            return;
        }
        this.languageCache[language] = languageData;
    }

    const languageData = this.languageCache[language];

    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (languageData[key]) {
            this.replaceTextOnly(el, languageData[key]);
        }
    });

    this.updateButtonText();
    this.isUpdatingLanguage = false;
}
    
  async loadLanguageData(languageCode) {    
    try {    
      const response = await fetch(`https://fantrove-hub.github.io/assets/json/lang/${languageCode}.json`);    
      if (!response.ok) throw new Error(`Failed to fetch: ${languageCode} - ${response.statusText}`);    
    
      const data = await response.json();    
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {    
        throw new Error(`Invalid or empty language data for ${languageCode}`);    
      }    
    
      return data;    
    } catch (error) {    
      console.warn(`Error loading language data for ${languageCode}:`, error);    
      return {};  // Fallback to empty object to prevent further errors    
    }    
  }    
    
  replaceTextOnly(element, newText) {    
    element.childNodes.forEach(node => {    
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {    
        node.textContent = newText;    
      }    
    });    
  }    
}    
    
const languageManager = new LanguageManager();    
window.addEventListener('DOMContentLoaded', () => languageManager.loadLanguagesConfig());