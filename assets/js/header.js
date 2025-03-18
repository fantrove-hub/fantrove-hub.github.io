/**
 * header.js - Enhanced version (แก้ไขปัญหาการนำทางและ URL)
 */
document.addEventListener('DOMContentLoaded', () => {
    // ประกาศตัวแปรสำหรับใช้ทั้งไฟล์
    const state = {
        isRendering: false,
        debounceTimer: null,
        buttonConfig: null,
        cache: new Map(),
        navigationState: {
            isNavigating: false,
            currentMainRoute: '',
            currentSubRoute: '',
            isInitialLoad: true,
            previousUrl: ''
        }
    };


    // Element selectors
    const elements = {
        header: document.querySelector('header'),
        navButtons: document.querySelectorAll('nav ul li button'),
        logo: document.querySelector('.logo'),
        navList: document.getElementById('nav-list'),
        subButtonsContainer: document.getElementById('sub-buttons-container')
    };

    // Constants
    const CONSTANTS = {
        ANIMATION_DURATION: 500,
        SCROLL_THRESHOLD: 1.27,
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
        FETCH_TIMEOUT: 5000,
        RETRY_DELAY: 2000,
        MAX_RETRIES: 3
    };

    // Error handling
    class AppError extends Error {
        constructor(message, type = 'general', original = null) {
            super(message);
            this.name = 'AppError';
            this.type = type;
            this.original = original;
        }
    }

    // Utils
    const utils = {
        async debounce(func, wait) {
            clearTimeout(state.debounceTimer);
            return new Promise(resolve => {
                state.debounceTimer = setTimeout(() => {
                    resolve(func());
                }, wait);
            });
        },

        isOnline() {
            return navigator.onLine;
        },

        async copyToClipboard(content) {
            try {
                await navigator.clipboard.writeText(content);
                this.showNotification('เนื้อหาถูกคัดลอกไปยังคลิปบอร์ดแล้ว!', 'success');
            } catch (error) {
                throw new AppError('ไม่สามารถคัดลอกข้อความได้', 'clipboard', error);
            }
        },

        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }
    };

const NavigationManager = {
    // เก็บประวัติการนำทาง
    history: [],
    maxHistory: 50,
    
    // เพิ่มการจัดการสถานะ
    state: {
        isNavigating: false,
        currentMainRoute: '',
        currentSubRoute: '',
        isInitialLoad: true,
        previousUrl: '',
        lastScrollPosition: 0
    },

    // เพิ่มรายการใหม่ในประวัติ
    addToHistory(url, type = 'user') {
        this.history.unshift({
            url: this.normalizeUrl(url),
            type,
            timestamp: Date.now()
        });
        
        // จำกัดขนาดของประวัติ
        if (this.history.length > this.maxHistory) {
            this.history.pop();
        }
    },

    // ทำความสะอาด URL
    normalizeUrl(url) {
        if (!url) return '';
        return url.toLowerCase().trim().replace(/^#/, '');
    },

    // เปรียบเทียบ URL อย่างแม่นยำ
    compareUrls(url1, url2) {
        return this.normalizeUrl(url1) === this.normalizeUrl(url2);
    },

    // ตรวจสอบความถูกต้องของ URL
    async validateUrl(url) {
        if (!url) return false;
        
        try {
            if (!state.buttonConfig) {
                await ButtonManager.loadConfig();
            }

            const [mainRoute, subRoute] = url.split('-');
            const mainButton = state.buttonConfig.mainButtons.find(
                btn => btn.url === mainRoute || btn.jsonFile === mainRoute
            );

            if (!mainButton) return false;

            // ถ้ามี subRoute ต้องตรวจสอบด้วย
            if (subRoute) {
                if (!mainButton.subButtons) return false;
                return mainButton.subButtons.some(
                    sub => sub.url === subRoute || sub.jsonFile === subRoute
                );
            }

            return true;
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการตรวจสอบ URL:', error);
            return false;
        }
    },

    // ฟังก์ชันหลักสำหรับการนำทาง
    async navigateTo(route, options = {}) {
        // ตรวจสอบว่ากำลังนำทางอยู่หรือไม่
        if (this.state.isNavigating) {
            console.log('กำลังนำทางอยู่ กรุณารอสักครู่...');
            return;
        }

        try {
            this.state.isNavigating = true;
            this.state.lastScrollPosition = window.pageYOffset;

            // ตรวจสอบว่าเป็น URL ที่ถูกต้องหรือไม่
            const isValidUrl = await this.validateUrl(route);
            if (!isValidUrl) {
                console.log('URL ไม่ถูกต้อง จะใช้ default route แทน');
                route = await this.getDefaultRoute();
            }

            // บันทึกเส้นทางปัจจุบัน
            const [mainRoute, subRoute] = route.split('-');
            this.state.currentMainRoute = mainRoute;
            this.state.currentSubRoute = subRoute || '';

            // อัพเดท URL ถ้าไม่ได้กำหนดให้ข้าม
            if (!options.skipUrlUpdate) {
                await this.changeURL(route);
            }

            // อัพเดทสถานะปุ่ม
            await this.updateButtonStates(route);

            // บันทึกประวัติ
            this.addToHistory(route);

            // จัดการการเลื่อนหน้า
            if (!options.maintainScroll) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการนำทาง:', error);
            utils.showNotification('เกิดข้อผิดพลาดในการนำทาง', 'error');
        } finally {
            this.state.isNavigating = false;
        }
    },

    // หา default route
    async getDefaultRoute() {
        try {
            if (!state.buttonConfig) {
                await ButtonManager.loadConfig();
            }
            
            const defaultMainButton = state.buttonConfig.mainButtons.find(btn => btn.isDefault);
            if (!defaultMainButton) return '';

            const mainRoute = defaultMainButton.url || defaultMainButton.jsonFile;
            
            if (!defaultMainButton.subButtons) return mainRoute;

            const defaultSubButton = defaultMainButton.subButtons.find(btn => btn.isDefault);
            if (!defaultSubButton) return mainRoute;

            const subRoute = defaultSubButton.url || defaultSubButton.jsonFile;
            return `${mainRoute}-${subRoute}`;
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการหา default route:', error);
            return '';
        }
    },

    // เปลี่ยน URL
    async changeURL(url, force = false) {
        try {
            if (!url) return;

            const newUrl = url.includes('#') ? url : `#${url}`;
            
            // ตรวจสอบว่า URL เปลี่ยนไปจริงๆ หรือถูกบังคับให้เปลี่ยน
            if (force || window.location.hash !== newUrl) {
                // ใช้ replaceState แทน pushState เพื่อไม่ให้เกิดการซ้ำซ้อนในประวัติ
                history.replaceState(
                    { 
                        url: newUrl,
                        scrollPosition: this.state.lastScrollPosition
                    },
                    '',
                    newUrl
                );
                
                // เก็บ URL ปัจจุบัน
                this.state.previousUrl = newUrl;

                // แจ้งเตือนการเปลี่ยนแปลง URL
                window.dispatchEvent(new CustomEvent('urlChanged', {
                    detail: { 
                        url: newUrl,
                        mainRoute: this.state.currentMainRoute,
                        subRoute: this.state.currentSubRoute
                    }
                }));
            }
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการเปลี่ยน URL:', error);
            throw new AppError('ไม่สามารถเปลี่ยน URL ได้', 'navigation', error);
        }
    },

    // อัพเดทสถานะปุ่ม
    async updateButtonStates(route) {
        try {
            const normalizedRoute = this.normalizeUrl(route);
            const [mainRoute, subRoute] = normalizedRoute.split('-');

            // ล้างสถานะปุ่มทั้งหมด
            document.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('active');
            });

            // อัพเดทปุ่มหลัก
            const mainButton = document.querySelector(`button[data-url="${mainRoute}"]`);
            if (mainButton) {
                mainButton.classList.add('active');
            }

            // อัพเดทปุ่มย่อย
            if (subRoute) {
                const subButton = document.querySelector(`button[data-url="${normalizedRoute}"]`);
                if (subButton) {
                    subButton.classList.add('active');
                }
            }

            // เลื่อนปุ่มที่ active เข้ามาในมุมมอง
            this.scrollActiveButtonsIntoView();

        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการอัพเดทสถานะปุ่ม:', error);
        }
    },

    // เลื่อนปุ่มที่ active เข้ามาในมุมมอง
    scrollActiveButtonsIntoView() {
        ['nav ul', '#sub-buttons-container'].forEach(selector => {
            const container = document.querySelector(selector);
            const activeButton = container?.querySelector('button.active');
            
            if (container && activeButton) {
                requestAnimationFrame(() => {
                    const containerBounds = container.getBoundingClientRect();
                    const buttonBounds = activeButton.getBoundingClientRect();
                    
                    const scrollLeft = container.scrollLeft + 
                        (buttonBounds.left - containerBounds.left) - 20;
                    
                    container.scrollTo({
                        left: Math.max(0, scrollLeft),
                        behavior: 'smooth'
                    });
                });
            }
        });
    },

    // จัดการการ refresh
    handleRefresh() {
        const currentHash = window.location.hash.replace('#', '');
        if (currentHash) {
            this.navigateTo(currentHash, { skipUrlUpdate: true });
        } else {
            this.navigateTo(this.getDefaultRoute());
        }
    },

    // รีเซ็ตสถานะทั้งหมด
    reset() {
        this.state = {
            isNavigating: false,
            currentMainRoute: '',
            currentSubRoute: '',
            isInitialLoad: true,
            previousUrl: '',
            lastScrollPosition: 0
        };
        this.history = [];
    }
};

// เพิ่ม Event Listener สำหรับการ resize หน้าจอ
window.addEventListener('resize', () => {
 NavigationManager.scrollActiveButtonToLeft();
});

// เพิ่ม Event Listener สำหรับการโหลดหน้าเว็บครั้งแรก
document.addEventListener('DOMContentLoaded', () => {
 NavigationManager.updateButtonStates();
});

    // Content Management
    const ContentManager = {
        async clearContent() {
            const contentElements = document.querySelectorAll('[id^="content-"]');
            
            await Promise.all(Array.from(contentElements).map(element => {
                return new Promise(resolve => {
                    const handleAnimationEnd = () => {
                        element.innerHTML = '';
                        element.classList.remove('fade-out');
                        element.removeEventListener('animationend', handleAnimationEnd);
                        resolve();
                    };

                    element.addEventListener('animationend', handleAnimationEnd);
                    element.classList.add('fade-out');

                    // Fallback
                    setTimeout(handleAnimationEnd, CONSTANTS.ANIMATION_DURATION);
                });
            }));
        },

        async renderContent(data) {
            if (!Array.isArray(data)) {
                throw new AppError('ข้อมูลที่ได้รับไม่ใช่อาร์เรย์', 'render');
            }

            await this.clearContent();
            if (state.isRendering) return;
            
            state.isRendering = true;
            
            try {
                await Promise.all(data.map(async item => {
                    const targetElement = document.getElementById(item.id);
                    if (!targetElement) return;

                    targetElement.innerHTML = '';
                    const container = this.createContainer(item);
                    
                    if (item.group?.items) {
                        await this.renderGroupItems(container, item.group);
                    } else {
                        await this.renderSingleItem(container, item);
                    }
                    
                    targetElement.appendChild(container);
                }));
            } finally {
                state.isRendering = false;
            }
        },

    createContainer(item) {
     const container = document.createElement('div');
     container.className = item.group?.type === 'button' ?
      'button-content-container' : 'card-content-container';
     
     // เพิ่ม custom class สำหรับ container ถ้ามีการระบุ
     if (item.group?.containerClass) {
      container.classList.add(item.group.containerClass);
     }
     
     return container;
    },

    async renderGroupItems(container, group) {
      // เพิ่มการสร้าง Group Header ถ้ามีการระบุ
      if (group.header) {
       const headerElement = this.createGroupHeader(group.header);
       container.appendChild(headerElement);
      }
      
      const renderPromises = group.items.map(item =>
       group.type === 'button' ?
       this.createButton(item.content) :
       this.createCard(item)
      );
      
      const elements = await Promise.all(renderPromises);
      elements.forEach(element => {
       if (element) container.appendChild(element);
      });
     },
     
// ปรับปรุงโครงสร้างของ Group Header ให้เรียบง่ายขึ้น
createGroupHeader(headerConfig) {
  // สร้าง container หลัก
  const headerContainer = document.createElement('div');
  headerContainer.className = 'group-header';
  
  // รับภาษาปัจจุบัน
  const currentLang = localStorage.getItem('selectedLang') || 'en';
  
  // จัดการกับ headerConfig ที่เป็น string
  if (typeof headerConfig === 'string') {
   return this.createSimpleHeader(headerConfig, headerContainer);
  }
  
  // เพิ่ม custom class ถ้ามี
  if (headerConfig.className) {
   headerContainer.classList.add(headerConfig.className);
  }
  
  // สร้างส่วนประกอบต่างๆ
  this.createHeaderComponents(headerContainer, headerConfig, currentLang);
  
  // เพิ่ม event listener สำหรับการเปลี่ยนภาษา
  this.addLanguageChangeListener(headerContainer, headerConfig);
  
  return headerContainer;
 },
 
 // สร้าง header แบบง่าย
 createSimpleHeader(text, container) {
  const headerText = document.createElement('h2');
  headerText.className = 'group-header-text';
  headerText.textContent = text;
  container.appendChild(headerText);
  return container;
 },
 
 // สร้างส่วนประกอบของ header
 createHeaderComponents(container, config, currentLang) {
  // 1. สร้างไอคอน (ถ้ามี)
  if (config.icon) {
   container.appendChild(this.createHeaderIcon(config.icon));
  }
  
  // 2. สร้างส่วนหัว
  const headerContent = document.createElement('div');
  headerContent.className = 'header-content';
  
  // 2.1 สร้างหัวข้อ
  const title = this.createHeaderTitle(config, currentLang);
  headerContent.appendChild(title);
  
  // 2.2 สร้างคำอธิบาย (ถ้ามี)
  if (config.description) {
   const desc = this.createHeaderDescription(config.description, currentLang);
   headerContent.appendChild(desc);
  }
  
  container.appendChild(headerContent);
  
  // 3. สร้างปุ่มเสริม (ถ้ามี)
  if (config.actions) {
   container.appendChild(this.createHeaderActions(config.actions, currentLang));
  }
 },
 
 // สร้างหัวข้อ
 createHeaderTitle(config, currentLang) {
  const title = document.createElement('h2');
  title.className = 'group-header-text';
  
  // เก็บข้อมูลภาษาใน data attributes
  if (typeof config.title === 'object') {
   Object.entries(config.title).forEach(([lang, text]) => {
    title.dataset[`title${lang.toUpperCase()}`] = text;
   });
   title.textContent = config.title[currentLang] || config.title.en;
  } else {
   title.textContent = config.title;
  }
  
  return title;
 },
 
 // สร้างคำอธิบาย
 createHeaderDescription(description, currentLang) {
  const desc = document.createElement('p');
  desc.className = 'group-header-description';
  
  if (typeof description === 'object') {
   Object.entries(description).forEach(([lang, text]) => {
    desc.dataset[`desc${lang.toUpperCase()}`] = text;
   });
   desc.textContent = description[currentLang] || description.en;
  } else {
   desc.textContent = description;
  }
  
  return desc;
 },
 
 // เพิ่ม event listener สำหรับการเปลี่ยนภาษา
 addLanguageChangeListener(container, config) {
  window.addEventListener('languageChange', (event) => {
   const newLang = event.detail.language;
   this.updateHeaderLanguage(container, config, newLang);
  });
 },

        async renderSingleItem(container, item) {
            const element = item.type === 'button' ? 
                await this.createButton(item.content) : 
                await this.createCard(item);
            
            if (element) container.appendChild(element);
        },

    async createButton(content) {
      const button = document.createElement('button');
      button.className = 'button-content';
      button.textContent = content;
      const wrapper = document.createElement('div');
      wrapper.appendChild(button);
      
      button.addEventListener('click', async () => {
       try {
        await utils.copyToClipboard(content);
       } catch (error) {
        utils.showNotification(error.message, 'error');
       }
      });
      
      return this.animateElement(wrapper);
     },
     
async createCard(cardConfig) {
  const lang = localStorage.getItem('selectedLang') || 'en';
  const card = document.createElement('button');
  card.className = 'card';
  const wrapper = document.createElement('div');
  
  // จัดการรูปภาพ
  if (cardConfig.image) {
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = cardConfig.image;
    img.loading = 'lazy';
    
    // เพิ่มการรองรับ alt text หลายภาษา
    img.alt = cardConfig.imageAlt?.[lang] || cardConfig.imageAlt?.en || '';
    
    card.appendChild(img);
  }
  
  // จัดการหัวข้อ
  const titleDiv = document.createElement('h1');
  titleDiv.className = 'card-title';
  
  // เก็บข้อความหลายภาษาใน data attributes
  if (typeof cardConfig.title === 'object') {
    Object.entries(cardConfig.title).forEach(([langCode, text]) => {
      titleDiv.dataset[`title${langCode.toUpperCase()}`] = text;
    });
    titleDiv.textContent = cardConfig.title[lang] || cardConfig.title.en;
  } else {
    titleDiv.textContent = cardConfig.title;
  }
  card.appendChild(titleDiv);
  
  // จัดการคำอธิบาย
  const descDiv = document.createElement('p');
  descDiv.className = 'card-description';
  
  // เก็บข้อความหลายภาษาใน data attributes
  if (typeof cardConfig.description === 'object') {
    Object.entries(cardConfig.description).forEach(([langCode, text]) => {
      descDiv.dataset[`desc${langCode.toUpperCase()}`] = text;
    });
    descDiv.textContent = cardConfig.description[lang] || cardConfig.description.en;
  } else {
    descDiv.textContent = cardConfig.description;
  }
  card.appendChild(descDiv);
  
  // จัดการลิงก์
  if (cardConfig.link) {
    card.addEventListener('click', () => {
      window.open(cardConfig.link, '_blank', 'noopener');
    });
  }
  
  // เพิ่มคลาสเพิ่มเติม (ถ้ามี)
  if (cardConfig.className) {
    card.classList.add(cardConfig.className);
  }
  
  wrapper.appendChild(card);
  return this.animateElement(wrapper);
},

// เพิ่มในส่วน DataManager หรือ ContentManager
updateCardsLanguage(lang) {
  document.querySelectorAll('.card').forEach(card => {
    // อัพเดทหัวข้อ
    const titleElement = card.querySelector('.card-title');
    if (titleElement) {
      const newTitle = titleElement.dataset[`title${lang.toUpperCase()}`];
      if (newTitle) {
        titleElement.textContent = newTitle;
      }
    }
    
    // อัพเดทคำอธิบาย
    const descElement = card.querySelector('.card-description');
    if (descElement) {
      const newDesc = descElement.dataset[`desc${lang.toUpperCase()}`];
      if (newDesc) {
        descElement.textContent = newDesc;
      }
    }
    
    // อัพเดท alt text ของรูปภาพ
    const imgElement = card.querySelector('.card-image');
    if (imgElement) {
      const newAlt = imgElement.dataset[`alt${lang.toUpperCase()}`];
      if (newAlt) {
        imgElement.alt = newAlt;
      }
    }
  });
},

      
      async animateElement(element) {
       return new Promise(resolve => {
        requestAnimationFrame(() => {
         const handleAnimationEnd = () => {
          element.removeEventListener('animationend', handleAnimationEnd);
          resolve(element);
         };
         
         element.addEventListener('animationend', handleAnimationEnd);
         element.classList.add('fade-in');
         
         // Fallback
         setTimeout(() => handleAnimationEnd(), CONSTANTS.ANIMATION_DURATION);
        });
       });
      }
    };

    // Data Management
    const DataManager = {
        async fetchWithTimeout(url, options = {}, timeout = CONSTANTS.FETCH_TIMEOUT) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, { 
                    ...options, 
                    signal: controller.signal,
                    headers: {
                        'Cache-Control': 'no-cache',
                        ...options.headers
                    }
                });

                if (!response.ok) {
                    throw new AppError(`HTTP error! status: ${response.status}`, 'fetch');
                }

                return await response.json();
            } finally {
                clearTimeout(timeoutId);
            }
        },

        async fetchWithRetry(url, retries = CONSTANTS.MAX_RETRIES) {
            try {
                return await this.fetchWithTimeout(url);
            } catch (error) {
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, CONSTANTS.RETRY_DELAY));
                    return this.fetchWithRetry(url, retries - 1);
                }
                throw error;
            }
        },

        getCached(key) {
            const cached = state.cache.get(key);
            if (!cached) return null;

            const isExpired = Date.now() - cached.timestamp > CONSTANTS.CACHE_DURATION;
            if (isExpired) {
                state.cache.delete(key);
                return null;
            }

            return cached.data;
        },

        setCache(key, data) {
            state.cache.set(key, {
                data,
                timestamp: Date.now()
            });
        }
    };

    // Scroll Management
// ScrollManager ที่ปรับปรุงใหม่ใช้ Animation-based
const ScrollManager = {
 init() {
  // ตัวแปรสำหรับควบคุมสถานะ
  const state = {
   isAnimating: false,
   lastScrollY: window.pageYOffset,
   headerVisible: true,
   animationFrame: null,
   headerHeight: 0,
   scrollDirection: 0,
   scrollTimeout: null
  };
  
  // ค่าคงที่สำหรับการปรับแต่ง
  const SETTINGS = {
   // ระยะ scroll ขั้นต่ำที่จะเริ่มทำงาน (px)
   SCROLL_THRESHOLD: 20,
   // ความเร็วในการแสดง/ซ่อน header (ms)
   ANIMATION_DURATION: 300,
   // ระยะเวลารอก่อนรีเซ็ต header (ms)
   RESET_DELAY: 130,
   // ระยะการเลื่อนขั้นต่ำที่จะเริ่มตรวจจับทิศทาง (px)
   DIRECTION_THRESHOLD: 5,
   // ความเร็วในการ scroll ที่จะทริกเกอร์ animation (px/ms)
   VELOCITY_THRESHOLD: 0.5
  };
  
  // Keyframes สำหรับ animation
  const ANIMATIONS = {
   hideHeader: [
    { transform: 'translateY(0)', offset: 0 },
    { transform: 'translateY(-50%)', offset: 1 }
   ],
   showHeader: [
    { transform: 'translateY(-50%)', offset: 0 },
    { transform: 'translateY(0)', offset: 1 }
   ]
  };
  
  // Animation timing
  const TIMING = {
   duration: SETTINGS.ANIMATION_DURATION,
   easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)', // Material Design easing
   fill: 'forwards'
  };
  
  // ฟังก์ชันสำหรับคำนวณความเร็วการ scroll
  const calculateScrollVelocity = (() => {
   let lastScrollY = window.pageYOffset;
   let lastScrollTime = performance.now();
   
   return () => {
    const currentScrollY = window.pageYOffset;
    const currentTime = performance.now();
    const timeDiff = currentTime - lastScrollTime;
    const scrollDiff = currentScrollY - lastScrollY;
    
    lastScrollY = currentScrollY;
    lastScrollTime = currentTime;
    
    return timeDiff > 0 ? scrollDiff / timeDiff : 0;
   };
  })();
  
  // ฟังก์ชันจัดการ animation
  const animateHeader = (show) => {
   const { header } = elements;
   if (!header || state.isAnimating) return;
   
   // ยกเลิก animation ที่กำลังเล่นอยู่
   header.getAnimations().forEach(animation => animation.cancel());
   
   // สร้างและเริ่ม animation ใหม่
   const animation = header.animate(
    show ? ANIMATIONS.showHeader : ANIMATIONS.hideHeader,
    TIMING
   );
   
   state.isAnimating = true;
   state.headerVisible = show;
   
   animation.onfinish = () => {
    state.isAnimating = false;
   };
  };
  
  // ฟังก์ชันหลักจัดการ scroll
  const handleScroll = () => {
   if (state.animationFrame) {
    cancelAnimationFrame(state.animationFrame);
   }
   
   state.animationFrame = requestAnimationFrame(() => {
    const currentScrollY = window.pageYOffset;
    const scrollDiff = currentScrollY - state.lastScrollY;
    const velocity = calculateScrollVelocity();
    
    // ตรวจสอบทิศทางและความเร็วของการ scroll
    if (Math.abs(scrollDiff) > SETTINGS.DIRECTION_THRESHOLD) {
     const scrollingDown = scrollDiff > 0;
     const velocityTriggered = Math.abs(velocity) > SETTINGS.VELOCITY_THRESHOLD;
     
     // เช็คเงื่อนไขการแสดง/ซ่อน header
     if (currentScrollY > SETTINGS.SCROLL_THRESHOLD) {
      if (scrollingDown && state.headerVisible && velocityTriggered) {
       // ซ่อน header เมื่อเลื่อนลงเร็วๆ
       animateHeader(false);
      } else if (!scrollingDown && !state.headerVisible && velocityTriggered) {
       // แสดง header เมื่อเลื่อนขึ้นเร็วๆ
       animateHeader(true);
      }
     } else if (currentScrollY <= 0 && !state.headerVisible) {
      // แสดง header เมื่ออยู่บนสุด
      animateHeader(true);
     }
    }
    
    state.lastScrollY = currentScrollY;
    state.scrollDirection = scrollDiff;
   });
   
   // รีเซ็ต timeout สำหรับการตรวจสอบการหยุด scroll
   clearTimeout(state.scrollTimeout);
   state.scrollTimeout = setTimeout(() => {
    const currentScrollY = window.pageYOffset;
    if (currentScrollY <= SETTINGS.SCROLL_THRESHOLD && !state.headerVisible) {
     animateHeader(true);
    }
   }, SETTINGS.RESET_DELAY);
  };
  
  // Touch handling สำหรับมือถือ
  let touchStartY = 0;
  let lastTouchY = 0;
  let touchStartTime = 0;
  
  const handleTouchStart = (e) => {
   touchStartY = e.touches[0].clientY;
   lastTouchY = touchStartY;
   touchStartTime = performance.now();
   state.isAnimating = false;
  };
  
  const handleTouchMove = (e) => {
   const currentY = e.touches[0].clientY;
   const touchDiff = currentY - lastTouchY;
   const timeDiff = performance.now() - touchStartTime;
   const velocity = touchDiff / timeDiff;
   
   if (Math.abs(velocity) > SETTINGS.VELOCITY_THRESHOLD) {
    if (velocity > 0 && !state.headerVisible) {
     animateHeader(true);
    } else if (velocity < 0 && state.headerVisible) {
     animateHeader(false);
    }
   }
   
   lastTouchY = currentY;
  };
  
  // Event Listeners
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('touchstart', handleTouchStart, { passive: true });
  window.addEventListener('touchmove', handleTouchMove, { passive: true });
  
  // Resize Observer
  const resizeObserver = new ResizeObserver((entries) => {
   for (const entry of entries) {
    if (entry.target === elements.header) {
     state.headerHeight = entry.contentRect.height;
    }
   }
  });
  
  if (elements.header) {
   resizeObserver.observe(elements.header);
  }
 },
 
 // รีเซ็ต ScrollManager
 reset() {
  const { header } = elements;
  if (header) {
   header.getAnimations().forEach(animation => animation.cancel());
   header.style.transform = 'translateY(0)';
  }
 }
};

// ButtonManager - จัดการระบบปุ่มทั้งหมด
const ButtonManager = {
 async loadConfig() {
  try {
   // ตรวจสอบว่ามีการโหลด config แล้วหรือไม่
   if (state.buttonConfig) {
    this.renderMainButtons();
    return;
   }
   
   // ตรวจสอบ cache
   const cached = DataManager.getCached('buttonConfig');
   if (cached) {
    state.buttonConfig = cached;
    this.renderMainButtons();
    return;
   }
   
   // ถ้ายังไม่มีข้อมูลใน cache ให้โหลดใหม่
   const response = await DataManager.fetchWithRetry('./assets/json/buttons.json');
   state.buttonConfig = response;
   DataManager.setCache('buttonConfig', response);
   
   this.renderMainButtons();
   await NavigationManager.updateButtonStates();
   
  } catch (error) {
   throw new AppError('ไม่สามารถโหลดการตั้งค่าปุ่มได้', 'config', error);
  }
 },
 
 renderMainButtons() {
  const lang = localStorage.getItem('selectedLang') || 'en';
  const { mainButtons } = state.buttonConfig;
  const { navList } = elements;
  const currentUrl = window.location.hash.replace('#', '') || '';
  
  navList.innerHTML = '';
  
  // สร้างแมพของปุ่มเพื่อเก็บการอ้างอิง
  const buttonMap = new Map();
  let defaultButton = null;
  
  mainButtons.forEach(button => {
   const label = button[`${lang}_label`];
   if (!label) return;
   
   const li = document.createElement('li');
   const mainButton = document.createElement('button');
   mainButton.textContent = label;
   const buttonUrl = button.url || button.jsonFile;
   mainButton.setAttribute('data-url', buttonUrl);
   
   // เก็บการอ้างอิงปุ่มและข้อมูล
   buttonMap.set(buttonUrl, {
    button: mainButton,
    config: button
   });
   
   if (button.isDefault) {
    defaultButton = {
     button: mainButton,
     config: button
    };
   }
   
   mainButton.addEventListener('click', async () => {
    try {
     await ContentManager.clearContent();
     
     if (!button.subButtons && button.url) {
      await NavigationManager.navigateTo(button.url);
     }
     
     if (button.jsonFile) {
      const data = await DataManager.fetchWithRetry(button.jsonFile);
      await ContentManager.renderContent(data);
     } else if (button.subButtons) {
      await this.renderSubButtons(button.subButtons, button.url, lang, currentUrl);
     }
    } catch (error) {
     utils.showNotification(error.message, 'error');
    }
   });
   
   li.appendChild(mainButton);
   navList.appendChild(li);
  });
  
  // จัดการการนำทางเริ่มต้น
  this.handleInitialNavigation(currentUrl, buttonMap, defaultButton);
 },
 
 async handleInitialNavigation(currentUrl, buttonMap, defaultButton) {
  try {
   const initialUrl = currentUrl;
   let mainRoute = '';
   let subRoute = '';
   
   if (initialUrl) {
    [mainRoute, subRoute] = initialUrl.split('-');
    const mainButtonData = buttonMap.get(mainRoute);
    
    if (mainButtonData) {
     const { button, config } = mainButtonData;
     await this.triggerButtonClick(button, { skipUrlUpdate: true });
     
     if (subRoute && config.subButtons) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const subButton = document.querySelector(`button[data-url="${initialUrl}"]`);
      if (subButton) {
       await this.triggerButtonClick(subButton);
      } else {
       await this.handleDefaultSubButton(config);
      }
     }
     return;
    }
   }
   
   if (defaultButton) {
    await this.triggerButtonClick(defaultButton.button);
   }
   
  } catch (error) {
   console.error('Error handling initial navigation:', error);
   utils.showNotification('เกิดข้อผิดพลาดในการนำทาง กรุณาลองใหม่', 'error');
  }
 },
 
 async triggerButtonClick(button, options = {}) {
  if (button && button.click) {
   const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    ...options
   });
   button.dispatchEvent(clickEvent);
  }
 },
 
 async renderSubButtons(subButtons, mainButtonUrl, lang, initialUrl) {
  const { subButtonsContainer } = elements;
  
  subButtonsContainer.innerHTML = '';
  subButtonsContainer.classList.add('fade-out');
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  let defaultSubButton = null;
  const subButtonMap = new Map();
  
  subButtons.forEach(button => {
   const label = button[`${lang}_label`];
   if (!label) return;
   
   const subButton = document.createElement('button');
   subButton.className = 'button-sub sub-button';
   subButton.textContent = label;
   
   const fullUrl = button.url ?
    `${mainButtonUrl}-${button.url}` :
    `${mainButtonUrl}-${button.jsonFile}`;
   
   subButton.setAttribute('data-url', fullUrl);
   
   subButtonMap.set(fullUrl, subButton);
   if (button.isDefault) {
    defaultSubButton = subButton;
   }
   
   subButton.addEventListener('click', () => {
    this.handleSubButtonClick(subButton, fullUrl, button.jsonFile);
   });
   
   subButtonsContainer.appendChild(subButton);
  });
  
  const matchingSubButton = subButtonMap.get(initialUrl);
  if (matchingSubButton) {
   setTimeout(() => {
    this.handleSubButtonClick(matchingSubButton, initialUrl,
     subButtons.find(b => b.url === initialUrl.split('-')[1])?.jsonFile
    );
   }, 0);
  } else if (defaultSubButton && !initialUrl) {
   setTimeout(() => {
    const defaultButtonConfig = subButtons.find(b => b.isDefault);
    const defaultUrl = `${mainButtonUrl}-${defaultButtonConfig.url || defaultButtonConfig.jsonFile}`;
    this.handleSubButtonClick(defaultSubButton, defaultUrl, defaultButtonConfig.jsonFile);
   }, 0);
  }
  
  subButtonsContainer.classList.remove('fade-out');
  subButtonsContainer.classList.add('fade-in');
 },
 
 async handleSubButtonClick(button, fullUrl, jsonFile) {
  try {
   // ตรวจสอบว่าปุ่มถูก active อยู่แล้วหรือไม่
   if (button.classList.contains('active')) {
    return; // ไม่ต้องทำงานถ้าปุ่มถูก active อยู่แล้ว
   }
   
   // ล้าง active state ของปุ่มอื่นๆ ก่อน
   const subButtons = document.querySelectorAll('.button-sub');
   subButtons.forEach(btn => {
    if (btn !== button) {
     btn.classList.remove('active');
    }
   });
   
   // ทำให้ปุ่มที่ถูกคลิกเป็น active
   button.classList.add('active');
   
   // เลื่อนปุ่มไปทางซ้าย
   this.scrollActiveSubButtonIntoView(button);
   
   // อัพเดท URL และโหลดเนื้อหา
   await Promise.all([
    NavigationManager.navigateTo(fullUrl),
    jsonFile ? (async () => {
     try {
      const data = await DataManager.fetchWithRetry(jsonFile);
      await ContentManager.renderContent(data);
     } catch (error) {
      utils.showNotification(error.message, 'error');
     }
    })() : Promise.resolve()
   ]);
   
  } catch (error) {
   utils.showNotification(error.message, 'error');
  }
 },
 
 // ฟังก์ชันสำหรับเลื่อนปุ่มย่อยที่ active
 scrollActiveSubButtonIntoView(activeButton) {
  if (!activeButton) return;
  
  const container = elements.subButtonsContainer;
  if (!container) return;
  
  requestAnimationFrame(() => {
   const containerLeft = container.getBoundingClientRect().left;
   const buttonLeft = activeButton.getBoundingClientRect().left;
   const scrollLeft = container.scrollLeft;
   
   const targetScroll = scrollLeft + (buttonLeft - containerLeft) - 20;
   
   if (Math.abs(container.scrollLeft - targetScroll) > 1) {
    container.scrollTo({
     left: targetScroll,
     behavior: 'smooth'
    });
   }
  });
 },
 
 // จัดการกับปุ่มย่อยเริ่มต้น
 async handleDefaultSubButton(config) {
  if (!config.subButtons) return;
  
  const defaultSubButton = config.subButtons.find(b => b.isDefault);
  if (defaultSubButton) {
   const defaultUrl = `${config.url}-${defaultSubButton.url || defaultSubButton.jsonFile}`;
   const button = document.querySelector(`button[data-url="${defaultUrl}"]`);
   if (button) {
    await this.handleSubButtonClick(button, defaultUrl, defaultSubButton.jsonFile);
   }
  }
 }
};

    // Performance Optimizations
    const PerformanceOptimizer = {
     init() {
      this.setupLazyLoading();
      this.setupPrefetching();
      this.setupErrorBoundary();
     },
     
     setupLazyLoading() {
      if ('loading' in HTMLImageElement.prototype) {
       document.querySelectorAll('img').forEach(img => {
        img.loading = 'lazy';
       });
      } else {
       this.setupIntersectionObserver();
      }
     },
     
     setupIntersectionObserver() {
      const imageObserver = new IntersectionObserver((entries, observer) => {
       entries.forEach(entry => {
        if (entry.isIntersecting) {
         const img = entry.target;
         if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
         }
         observer.unobserve(img);
        }
       });
      });
      
      document.querySelectorAll('img[data-src]').forEach(img => {
       imageObserver.observe(img);
      });
     },
     
     setupPrefetching() {
      const prefetchLinks = new Set();
      
      document.querySelectorAll('a[href], button[data-url]').forEach(element => {
       const url = element.href || element.dataset.url;
       if (url && !prefetchLinks.has(url)) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = url.endsWith('.json') ? 'fetch' : 'document';
        document.head.appendChild(link);
        prefetchLinks.add(url);
       }
      });
     },
     
     setupErrorBoundary() {
      window.addEventListener('error', event => {
       console.error('Global error:', event.error);
       utils.showNotification(
        'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง',
        'error'
       );
      });
      
      window.addEventListener('unhandledrejection', event => {
       console.error('Unhandled promise rejection:', event.reason);
       utils.showNotification(
        'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
        'error'
       );
      });
     }
    };
    
    // Event Listeners and Initialization
    const initializeApp = async () => {
     try {
      // Initialize scroll handling
      ScrollManager.init();
      
      // Initialize performance optimizations
      PerformanceOptimizer.init();
      
      // Setup button event listeners
      elements.navButtons.forEach(button => {
       button.addEventListener('click', async event => {
        event.preventDefault();
        const route = button.getAttribute('data-url');
        if (route) {
         try {
          await NavigationManager.navigateTo(route);
         } catch (error) {
          utils.showNotification(error.message, 'error');
         }
        }
       });
      });
      
        // ปรับปรุงการจัดการ URL changes
  window.addEventListener('popstate', () => {
   if (!NavigationManager.state.isNavigating) {
    NavigationManager.updateButtonStates();
   }
  });
  
  window.addEventListener('hashchange', (event) => {
   if (!NavigationManager.state.isNavigating) {
    const newHash = event.newURL.split('#')[1] || '';
    NavigationManager.navigateTo(newHash);
   }
  });
  
  // เพิ่มการจัดการ beforeunload
  window.addEventListener('beforeunload', () => {
   NavigationManager.state.isInitialLoad = true;
  });
      
      // Setup network status monitoring
      window.addEventListener('online', () => {
       utils.showNotification('การเชื่อมต่อกลับมาแล้ว', 'success');
      });
      
      window.addEventListener('offline', () => {
       utils.showNotification('ขาดการเชื่อมต่ออินเทอร์เน็ต', 'warning');
      });
      
      // Handle URL changes
      window.addEventListener('popstate', () => {
       NavigationManager.updateButtonStates();
      });
      
      window.addEventListener('hashchange', () => {
       NavigationManager.updateButtonStates();
      });
      
      // Load initial configuration
      await ButtonManager.loadConfig();
      
     } catch (error) {
      console.error('Initialization error:', error);
      utils.showNotification(
       'เกิดข้อผิดพลาดในการเริ่มต้นแอปพลิเคชัน กรุณารีเฟรชหน้า',
       'error'
      );
     }
    };
    
    // เพิ่ม Event Listener สำหรับการเปลี่ยนภาษา
window.addEventListener('languageChange', (event) => {
  const newLang = event.detail.language;
  this.updateCardsLanguage(newLang);
});
    
    // Start the application
    if (document.readyState === 'loading') {
     document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
     initializeApp();
    }
    });