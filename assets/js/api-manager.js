document.addEventListener('DOMContentLoaded', function() {
    // สถานะและการจัดการข้อมูล
    let apiData = null;
    let isDarkMode = localStorage.getItem('darkMode') === 'true';
    let currentEditingItem = null;
    
    // ตัวแปรและอิลิเมนต์ที่ใช้บ่อย
    const searchInput = document.getElementById('searchInput');
    const filterType = document.getElementById('filterType');
    const filterCategory = document.getElementById('filterCategory');
    const dataContainer = document.getElementById('dataContainer');
    const modal = document.getElementById('detailModal');
    const modalContent = document.getElementById('modalContent');
    const closeModal = document.querySelector('.close');

    // ปิด Modal เมื่อคลิกที่ปุ่มปิดหรือคลิกนอก Modal
    closeModal.onclick = () => modal.style.display = "none";
    window.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    }

    // อัพเดทธีม
    function updateTheme() {
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        document.getElementById('themeSwitcher').innerHTML = 
            `<i class="fas fa-${isDarkMode ? 'sun' : 'moon'}"></i>`;
    }
    updateTheme();

    // โหลดข้อมูลเริ่มต้น
    async function loadInitialData() {
        try {
            const response = await fetch('/assets/json/api-database.json');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            apiData = await response.json();
            updateUI();
            showToast('โหลดข้อมูลสำเร็จ', 'success');
        } catch (error) {
            console.error('ไม่สามารถโหลดข้อมูลได้:', error);
            showToast('ไม่สามารถโหลดข้อมูลได้', 'error');
            apiData = {
                emoji: { category: [] },
                symbol: { category: [] }
            };
        }
    }

    // อัพเดท UI ทั้งหมด
    function updateUI() {
        updateCategorySelect();
        updateFilterCategories();
        updateStatistics();
        renderData();
    }

    // อัพเดทตัวเลือกหมวดหมู่
    function updateCategorySelect() {
        const mainType = document.getElementById('mainType').value;
        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = '';
        
        if (apiData[mainType]) {
            apiData[mainType].category.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.name;
                option.textContent = cat.name;
                categorySelect.appendChild(option);
            });
        }
    }

    // อัพเดทตัวกรองหมวดหมู่
    function updateFilterCategories() {
        const categories = new Set();
        Object.values(apiData).forEach(type => {
            if (type.category) {
                type.category.forEach(cat => categories.add(cat.name));
            }
        });

        filterCategory.innerHTML = '<option value="all">ทุกหมวดหมู่</option>';
        [...categories].sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filterCategory.appendChild(option);
        });
    }

    // อัพเดทสถิติ
    function updateStatistics() {
        let emojiCount = 0;
        let symbolCount = 0;
        let categoryCount = new Set();

        Object.entries(apiData).forEach(([type, data]) => {
            if (data.category) {
                data.category.forEach(cat => {
                    categoryCount.add(cat.name);
                    if (type === 'emoji') {
                        emojiCount += cat.data ? cat.data.length : 0;
                    } else {
                        symbolCount += cat.data ? cat.data.length : 0;
                    }
                });
            }
        });

        document.getElementById('emojiCount').textContent = emojiCount;
        document.getElementById('symbolCount').textContent = symbolCount;
        document.getElementById('categoryCount').textContent = categoryCount.size;
    }

    // แก้ไขรายการ
    window.editItem = function(type, category, index) {
        const categoryData = apiData[type].category.find(c => c.name === category);
        if (!categoryData || !categoryData.data) return;

        const item = categoryData.data[index];
        if (!item) return;

        currentEditingItem = { type, category, index };
        
        modalContent.innerHTML = `
            <div class="edit-form">
                <div class="form-group">
                    <label>ข้อความ/สัญลักษณ์:</label>
                    <input type="text" id="editText" value="${item.text}" class="form-control">
                </div>
                <div class="form-group">
                    <label>รหัส API:</label>
                    <input type="text" id="editApi" value="${item.api}" class="form-control">
                </div>
                <div class="form-actions">
                    <button onclick="saveEdit()" class="btn btn-primary">
                        <i class="fas fa-save"></i> บันทึก
                    </button>
                    <button onclick="closeModal()" class="btn btn-secondary">
                        <i class="fas fa-times"></i> ยกเลิก
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = "block";
    };

    // บันทึกการแก้ไข
    window.saveEdit = function() {
        if (!currentEditingItem) return;

        const newText = document.getElementById('editText').value.trim();
        const newApi = document.getElementById('editApi').value.trim();

        if (!validateInput(newText, newApi)) return;

        const { type, category, index } = currentEditingItem;
        const categoryData = apiData[type].category.find(c => c.name === category);
        
        if (categoryData && categoryData.data) {
            categoryData.data[index] = { text: newText, api: newApi };
            updateUI();
            closeModal();
            showToast('แก้ไขข้อมูลสำเร็จ', 'success');
        }
    };

    // ลบรายการ
    window.deleteItem = function(type, category, index) {
        if (confirm('คุณแน่ใจหรือไม่ที่จะลบรายการนี้?')) {
            const categoryData = apiData[type].category.find(c => c.name === category);
            if (categoryData && categoryData.data) {
                categoryData.data.splice(index, 1);
                updateUI();
                showToast('ลบข้อมูลสำเร็จ', 'success');
            }
        }
    };

    // ปิด Modal
    window.closeModal = function() {
        modal.style.display = "none";
        currentEditingItem = null;
    };

    // แสดงข้อมูล
    function renderData() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedType = filterType.value;
        const selectedCategory = filterCategory.value;
        
        dataContainer.innerHTML = '';

        Object.entries(apiData).forEach(([type, data]) => {
            if (selectedType !== 'all' && type !== selectedType) return;
            if (!data.category) return;

            const typeSection = document.createElement('div');
            typeSection.className = 'type-section';
            typeSection.innerHTML = `<h3>${type.toUpperCase()}</h3>`;

            data.category.forEach(category => {
                if (selectedCategory !== 'all' && category.name !== selectedCategory) return;
                if (!category.data) category.data = [];

                const filteredData = category.data.filter(item => {
                    return item.text.toLowerCase().includes(searchTerm) ||
                           item.api.toLowerCase().includes(searchTerm);
                });

                if (filteredData.length === 0) return;

                const categoryDiv = createCategorySection(type, category.name, filteredData);
                typeSection.appendChild(categoryDiv);
            });

            if (typeSection.children.length > 1) {
                dataContainer.appendChild(typeSection);
            }
        });

        setupDragAndDrop();
    }

    // สร้างส่วนแสดงผลหมวดหมู่
    function createCategorySection(type, categoryName, items) {
        const div = document.createElement('div');
        div.className = 'data-group';
        div.innerHTML = `
            <div class="data-group-header">
                ${categoryName}
                <span class="item-count">(${items.length} รายการ)</span>
            </div>
            <div class="data-items" data-type="${type}" data-category="${categoryName}">
                ${items.map((item, index) => createDataItemHTML(type, categoryName, item, index)).join('')}
            </div>
        `;
        return div;
    }

    // สร้าง HTML สำหรับรายการข้อมูล
    function createDataItemHTML(type, category, item, index) {
        return `
            <div class="data-item" draggable="true" data-index="${index}">
                <div class="item-content">
                    <span class="item-text">${item.text}</span>
                    <span class="item-api">${item.api}</span>
                </div>
                <div class="item-actions">
                    <button onclick="editItem('${type}', '${category}', ${index})" class="btn-edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteItem('${type}', '${category}', ${index})" class="btn-delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // ตั้งค่าการลากและวาง
    function setupDragAndDrop() {
        const items = document.querySelectorAll('.data-item');
        const containers = document.querySelectorAll('.data-items');

        items.forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
            item.addEventListener('dragenter', handleDragEnter);
            item.addEventListener('dragleave', handleDragLeave);
        });

        containers.forEach(container => {
            container.addEventListener('dragover', handleDragOver);
            container.addEventListener('drop', handleDrop);
        });
    }

    // จัดการเมื่อเริ่มลาก
    function handleDragStart(e) {
        e.target.classList.add('dragging');
        e.target.style.opacity = '0.6';
        e.dataTransfer.effectAllowed = 'move';
        const container = e.target.closest('.data-items');
        e.dataTransfer.setData('text/plain', JSON.stringify({
            index: e.target.dataset.index,
            type: container.dataset.type,
            category: container.dataset.category
        }));
    }

    // จัดการเมื่อลากผ่านรายการอื่น
    function handleDragEnter(e) {
        e.preventDefault();
        if (e.target.classList.contains('data-item') && !e.target.classList.contains('dragging')) {
            e.target.style.opacity = '0.4';
            e.target.classList.add('drop-target');
        }
    }

    // จัดการเมื่อลากออกจากรายการ
    function handleDragLeave(e) {
        e.preventDefault();
        if (e.target.classList.contains('data-item')) {
            e.target.style.opacity = '1';
            e.target.classList.remove('drop-target');
        }
    }

    // จัดการเมื่อลากอยู่เหนือพื้นที่ที่สามารถวางได้
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const container = e.target.closest('.data-items');
        if (!container) return;

        const draggingItem = document.querySelector('.dragging');
        if (!draggingItem) return;

        const items = [...container.querySelectorAll('.data-item:not(.dragging)')];
        const afterElement = items.reduce((closest, item) => {
            const box = item.getBoundingClientRect();
            const offset = e.clientY - (box.top + box.height / 2);
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: item };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;

        items.forEach(item => {
            item.style.opacity = '1';
            item.classList.remove('drop-target');
        });
        
        if (afterElement) {
            afterElement.style.opacity = '0.4';
            afterElement.classList.add('drop-target');
        }
    }

    // จัดการเมื่อวางรายการ
    function handleDrop(e) {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const targetContainer = e.target.closest('.data-items');
        
        if (!targetContainer) return;

        document.querySelectorAll('.data-item').forEach(item => {
            item.style.opacity = '1';
            item.classList.remove('drop-target');
        });

        const sourceType = data.type;
        const sourceCategory = data.category;
        const targetType = targetContainer.dataset.type;
        const targetCategory = targetContainer.dataset.category;
        
        const dropTarget = e.target.closest('.data-item');
        const targetIndex = dropTarget ? 
            Array.from(targetContainer.children).indexOf(dropTarget) : 
            targetContainer.children.length;
        
        moveItem(sourceType, sourceCategory, parseInt(data.index), targetType, targetCategory, targetIndex);
        updateUI();
    }

    // จัดการเมื่อการลากสิ้นสุด
    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.data-item').forEach(item => {
            item.style.opacity = '1';
            item.classList.remove('drop-target');
        });
    }

    // ย้ายรายการ
    function moveItem(fromType, fromCategory, fromIndex, toType, toCategory, toIndex) {
        const sourceCat = apiData[fromType].category.find(c => c.name === fromCategory);
        const targetCat = apiData[toType].category.find(c => c.name === toCategory);
        
        if (sourceCat && sourceCat.data && targetCat) {
            if (!targetCat.data) targetCat.data = [];
            const [item] = sourceCat.data.splice(fromIndex, 1);
            targetCat.data.splice(toIndex, 0, item);
        }
    }

    // เพิ่มข้อมูลใหม่
    document.getElementById('addNewItem').addEventListener('click', function() {
        const mainType = document.getElementById('mainType').value;
        const category = document.getElementById('category').value;
        const text = document.getElementById('symbolText').value.trim();
        const api = document.getElementById('apiCode').value.trim();

        if (!validateInput(text, api)) return;

        let categoryData = apiData[mainType].category.find(c => c.name === category);
        if (!categoryData) {
            categoryData = { name: category, data: [] };
            apiData[mainType].category.push(categoryData);
        }
        if (!categoryData.data) categoryData.data = [];
        
        categoryData.data.push({ api, text });
        clearForm();
        updateUI();
        showToast('เพิ่มข้อมูลสำเร็จ', 'success');
    });

    // เพิ่มหมวดหมู่ใหม่
    document.getElementById('addNewCategory').addEventListener('click', function() {
        const name = prompt('กรุณาใส่ชื่อหมวดหมู่ใหม่:');
        if (name && name.trim()) {
            const mainType = document.getElementById('mainType').value;
            if (!apiData[mainType].category.some(c => c.name === name)) {
                apiData[mainType].category.push({
                    name: name.trim(),
                    data: []
                });
                updateUI();
                showToast('เพิ่มหมวดหมู่สำเร็จ', 'success');
            } else {
                showToast('หมวดหมู่นี้มีอยู่แล้ว', 'error');
            }
        }
    });

    // ตรวจสอบข้อมูลที่ป้อน
    function validateInput(text, api) {
        if (!text || !api) {
            showToast('กรุณากรอกข้อมูลให้ครบ', 'error');
            return false;
        }

        const apiFormat = /^(U\+[\dA-F]{4,6}|\\u[\dA-F]{4,6})$/i;
        if (!apiFormat.test(api)) {
            showToast('รูปแบบรหัส API ไม่ถูกต้อง', 'error');
            return false;
        }

        return true;
    }

    // ล้างฟอร์ม
    function clearForm() {
        document.getElementById('symbolText').value = '';
        document.getElementById('apiCode').value = '';
    }

    // แสดง Toast notification
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toastContainer');
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // สลับธีม
    document.getElementById('themeSwitcher').addEventListener('click', function() {
        isDarkMode = !isDarkMode;
        localStorage.setItem('darkMode', isDarkMode);
        updateTheme();
    });

    // Event Listeners
    searchInput.addEventListener('input', debounce(renderData, 300));
    filterType.addEventListener('change', renderData);
    filterCategory.addEventListener('change', renderData);
    document.getElementById('mainType').addEventListener('change', updateCategorySelect);

    // คัดลอก JSON
    document.getElementById('copyJSON').addEventListener('click', function() {
        const jsonString = JSON.stringify(apiData, null, 2);
        navigator.clipboard.writeText(jsonString)
            .then(() => showToast('คัดลอก JSON สำเร็จ', 'success'))
            .catch(() => showToast('ไม่สามารถคัดลอก JSON ได้', 'error'));
    });

    // ส่งออก CSV
    document.getElementById('exportCSV').addEventListener('click', function() {
        const csv = convertToCSV();
        downloadCSV(csv);
        showToast('ส่งออก CSV สำเร็จ', 'success');
    });

    // Utility Functions
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function convertToCSV() {
        const rows = [['Type', 'Category', 'Text', 'API Code']];
        
        Object.entries(apiData).forEach(([type, data]) => {
            if (data.category) {
                data.category.forEach(category => {
                    if (category.data) {
                        category.data.forEach(item => {
                            rows.push([type, category.name, item.text, item.api]);
                        });
                    }
                });
            }
        });

        return rows.map(row => 
            row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    function downloadCSV(csv) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `api_database_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // เริ่มต้นโหลดข้อมูล
    loadInitialData();
});