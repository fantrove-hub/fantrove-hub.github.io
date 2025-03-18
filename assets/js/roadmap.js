document.addEventListener("DOMContentLoaded", async function () {
    const STORAGE_KEY = "feature_data";
    const LANG_KEY = "selectedLang"; // เพิ่มตัวแปรสำหรับเก็บค่าภาษา

    // ฟังก์ชันสำหรับดึงภาษาปัจจุบัน
    const getCurrentLang = () => localStorage.getItem(LANG_KEY) || 'en';

    // ข้อความแปลสำหรับแต่ละภาษา
    const translations = {
        featureStatus: {
            current: {
                th: 'คุณลักษณะนี้อยู่ในเวอร์ชันปัจจุบัน',
                en: 'This feature is in the current version',
            },
            upcoming: {
                th: 'คุณลักษณะนี้จะเพิ่มในเวอร์ชันถัดไป',
                en: 'This feature will be added in the next version',
            },
            version: {
                th: 'เวอร์ชัน',
                en: 'Version',
            }
        }
    };

    // โหลดข้อมูลจากที่เก็บถาวร ถ้ามี
    let storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        storedData = JSON.parse(storedData);
        await displayFeatures(storedData.current_stage, storedData.stages);
    }

    // ดึงข้อมูลล่าสุดจากไฟล์ JSON
    try {
        const response = await fetch('./assets/json/current-stage.json');
        const data = await response.json();

        if (!storedData || JSON.stringify(storedData) !== JSON.stringify(data)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            await displayFeatures(data.current_stage, data.stages);
        }
    } catch (error) {
        console.error('Error loading stage data:', error);
        showError(getCurrentLang());
    }

    // ฟังก์ชันแสดงข้อความผิดพลาด
    function showError(lang) {
        const errorMessages = {
            th: 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง',
            en: 'Error loading data. Please try again.',
        };
        // แสดงข้อความผิดพลาดตามภาษาที่เลือก
        alert(errorMessages[lang] || errorMessages.en);
    }

    // ฟังก์ชันแสดงข้อมูล
    async function displayFeatures(currentStage, stages) {
        const featureList = document.getElementById('feature-list');
        const lang = getCurrentLang();
        
        // เคลียร์ข้อมูลเก่า
        featureList.innerHTML = '';

        stages.forEach(stage => {
            const stageNumber = stage.stage_number;
            const features = stage.features;

            features.forEach(item => {
                const li = document.createElement('li');
                
                // สร้าง feature text ตามภาษา
                const featureText = item.feature[lang] || item.feature.en; // ใช้ภาษาอังกฤษเป็น fallback
                li.textContent = `${featureText} - ${translations.featureStatus.version[lang]} ${stage.version}`;

                if (stageNumber < currentStage) {
                    li.classList.add('past-feature');
                } else if (stageNumber === currentStage) {
                    li.classList.add('new-feature');
                    const smallText = document.createElement('small');
                    smallText.textContent = translations.featureStatus.current[lang];
                    li.appendChild(smallText);
                } else if (stageNumber === currentStage + 1) {
                    li.classList.add('upcoming-feature');
                    const smallText = document.createElement('small');
                    smallText.textContent = translations.featureStatus.upcoming[lang];
                    li.appendChild(smallText);
                } else {
                    li.classList.add('not-feature');
                    li.textContent = `??? - ${translations.featureStatus.version[lang]} ${stage.version}`;
                }

                // เพิ่ม data attributes สำหรับการอัพเดทภาษา
                Object.entries(item.feature).forEach(([langCode, text]) => {
                    li.dataset[`feature${langCode.toUpperCase()}`] = text;
                });

                featureList.appendChild(li);
            });
        });
    }

    // เพิ่ม Event Listener สำหรับการเปลี่ยนภาษา
    window.addEventListener('languageChange', async (event) => {
        const newLang = event.detail.language;
        const storedData = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (storedData) {
            await displayFeatures(storedData.current_stage, storedData.stages);
        }
    });
});