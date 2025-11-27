// Inventory Management JavaScript

// Mock inventory data
const mockInventory = [
    {
        id: 1,
        name: 'قميص MK كلاسيكي',
        category: 'قمصان',
        currentStock: 25,
        minStock: 10,
        price: 89.99,
        totalValue: 2249.75,
        status: 'in-stock',
        lastUpdated: '2024-01-20'
    },
    {
        id: 2,
        name: 'بنطال MK رياضي',
        category: 'بناطيل',
        currentStock: 15,
        minStock: 20,
        price: 129.99,
        totalValue: 1949.85,
        status: 'low-stock',
        lastUpdated: '2024-01-19'
    },
    {
        id: 3,
        name: 'جاكيت MK شتوي',
        category: 'جاكيتات',
        currentStock: 10,
        minStock: 15,
        price: 199.99,
        totalValue: 1999.90,
        status: 'low-stock',
        lastUpdated: '2024-01-18'
    },
    {
        id: 4,
        name: 'حقيبة MK يد',
        category: 'اكسسوارات',
        currentStock: 20,
        minStock: 10,
        price: 149.99,
        totalValue: 2999.80,
        status: 'in-stock',
        lastUpdated: '2024-01-17'
    },
    {
        id: 5,
        name: 'كاب MK رياضي',
        category: 'اكسسوارات',
        currentStock: 5,
        minStock: 10,
        price: 59.99,
        totalValue: 299.95,
        status: 'critical',
        lastUpdated: '2024-01-16'
    },
    {
        id: 6,
        name: 'حذاء MK رياضي',
        category: 'أحذية',
        currentStock: 0,
        minStock: 15,
        price: 249.99,
        totalValue: 0,
        status: 'out-of-stock',
        lastUpdated: '2024-01-15'
    }
];

let currentInventory = [...mockInventory];
let masterInventory = [...mockInventory];
let currentEditingId = null;
let alertSettingsCache = null;

// Initialize inventory page
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAdminAuth()) {
        window.location.href = 'login.html';
        return;
    }
    loadInventoryData();
    setupEventListeners();
});

// Check admin authentication
function checkAdminAuth() {
    if (window.AdminAuth && window.AdminAuth.checkAdminAuth) {
        return window.AdminAuth.checkAdminAuth();
    }
    // Fallback check with token requirement
    const authData = localStorage.getItem('mkAdminAuth') || sessionStorage.getItem('mkAdminAuth');
    if (!authData) return null;
    try {
        const parsed = JSON.parse(authData);
        return parsed && parsed.token ? parsed : null;
    } catch {
        return null;
    }
}

// Load inventory data
async function loadInventoryData() {
    try {
        const res = await fetch('/api/products?limit=200');
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'خطأ في تحميل المخزون');
        const s = getAlertSettings();
        currentInventory = data.data.map(p => {
            const stock = Number(p.stock ?? 0);
            const price = Number(p.price ?? 0);
            const dp = Number(p.discountPercent ?? p.discount) || 0;
            const effectivePrice = price * (1 - Math.min(Math.max(dp,0),100)/100);
            return {
                id: p._id || p.id,
                name: p.name,
                category: p.category,
                currentStock: stock,
                minStock: Number(s.minStockDefault || 15),
                price: price,
                discountPercent: dp,
                totalValue: stock * effectivePrice,
                status: stock === 0 ? 'out-of-stock' : (stock < Number(s.criticalThreshold || 10) ? 'critical' : (stock < Number(s.lowThreshold || 15) ? 'low-stock' : 'in-stock')),
                lastUpdated: p.updatedAt || p.createdAt
            };
        });
        masterInventory = [...currentInventory];
        updateInventoryStats();
        renderInventoryTable(currentInventory);
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

// Update inventory statistics
function updateInventoryStats() {
    const totalProducts = currentInventory.length;
    const lowStockItems = currentInventory.filter(item => item.status === 'low-stock').length;
    const outOfStock = currentInventory.filter(item => item.status === 'out-of-stock').length;
    const totalValue = currentInventory.reduce((sum, item) => sum + (Number.isFinite(item.totalValue) ? item.totalValue : 0), 0);
    
    document.getElementById('total-products').textContent = totalProducts;
    document.getElementById('low-stock-items').textContent = lowStockItems;
    document.getElementById('out-of-stock').textContent = outOfStock;
    document.getElementById('total-value').textContent = formatPrice(totalValue);
}

// Render inventory table
function renderInventoryTable(inventory) {
    const tbody = document.getElementById('inventory-body');
    if (!tbody) return;
    
    tbody.innerHTML = inventory.map(item => `
        <tr class="inventory-item ${item.status}">
            <td><strong>${item.name}</strong></td>
            <td>${item.category}</td>
            <td><span class="stock-number ${item.status}">${item.currentStock}</span></td>
            <td>${item.minStock}</td>
            <td>
                ${item.discountPercent > 0 ? `
                    <strong>${formatPrice(item.price * (1 - Math.min(Math.max(item.discountPercent,0),100)/100))}</strong>
                    <small class="price-old">${formatPrice(item.price)}</small>
                    <span class="discount-badge">-${item.discountPercent}%</span>
                ` : `${formatPrice(item.price)}`}
            </td>
            <td><strong>${formatPrice(item.totalValue)}</strong></td>
            <td><span class="status-badge status-${item.status}">${getStockStatusText(item.status)}</span></td>
            <td>${formatDate(item.lastUpdated)}</td>
            <td>
                <button class="btn-action btn-edit" onclick="updateStock('${item.id}')" title="تحديث المخزون">
                    📦
                </button>
                <button class="btn-action btn-view" onclick="viewProduct('${item.id}')" title="عرض المنتج">
                    👁️
                </button>
                <button class="btn-action btn-delete" onclick="deleteStockItem('${item.id}')" title="حذف">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Stock update modal
    document.getElementById('stock-update-form').addEventListener('submit', handleStockUpdate);
    
    // Modal close on outside click
    document.getElementById('stock-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeStockModal();
        }
    });

    const addForm = document.getElementById('add-product-form');
    if (addForm) {
        addForm.addEventListener('submit', handleAddProductSubmit);
    }
    const addModal = document.getElementById('add-product-modal');
    if (addModal) {
        addModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAddProductModal();
            }
        });
    }
}

// Filter inventory
function filterInventory() {
    const categoryFilter = document.getElementById('category-filter').value;
    const stockFilter = document.getElementById('stock-filter').value;
    
    let filtered = [...masterInventory];
    
    if (categoryFilter) {
        filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    if (stockFilter) {
        filtered = filtered.filter(item => item.status === stockFilter);
    }
    
    currentInventory = filtered;
    renderInventoryTable(currentInventory);
    updateInventoryStats();
}

// Search inventory
function searchInventory() {
    const searchTerm = document.getElementById('search-inventory').value.toLowerCase();
    
    if (searchTerm === '') {
        currentInventory = [...masterInventory];
    } else {
        currentInventory = masterInventory.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm)
        );
    }
    
    renderInventoryTable(currentInventory);
}

// Update stock for specific item
function updateStock(itemId) {
    const item = currentInventory.find(i => i.id === itemId);
    if (!item) return;
    
    currentEditingId = itemId;
    
    // Populate modal with current data
    document.getElementById('current-stock').value = item.currentStock;
    document.getElementById('min-stock').value = item.minStock;
    document.getElementById('stock-notes').value = '';
    
    // Show modal
    document.getElementById('stock-modal').style.display = 'block';
}

// Handle stock update form submission
function handleStockUpdate(e) {
    e.preventDefault();
    
    if (!currentEditingId) return;
    
    const formData = new FormData(this);
    const newStock = parseInt(formData.get('current-stock'));
    const newMinStock = parseInt(formData.get('min-stock'));
    const notes = formData.get('stock-notes');
    
    // Update the item
    const item = currentInventory.find(i => i.id === currentEditingId);
    if (!item) return;
    const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
    fetch(`/api/admin/products/${item.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ stock: newStock })
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
        if (!ok || !data.success) throw new Error(data.message || 'خطأ في تحديث المخزون');
        showNotification(`تم تحديث مخزون ${item.name} بنجاح!`, 'success');
        closeStockModal();
        loadInventoryData();
    })
    .catch(err => showNotification(err.message, 'error'));
}

// Close stock modal
function closeStockModal() {
    document.getElementById('stock-modal').style.display = 'none';
    currentEditingId = null;
}

// View product details
function viewProduct(itemId) {
    const item = currentInventory.find(i => i.id === itemId);
    if (item) {
        showNotification(`عرض تفاصيل المنتج: ${item.name}`, 'info');
        // Later: Navigate to product details page
    }
}

// Delete stock item
function deleteStockItem(itemId) {
    const item = currentInventory.find(i => i.id === itemId);
    if (!item) return;
    
    if (confirm(`هل أنت متأكد من حذف ${item.name} من المخزون؟`)) {
        const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
        fetch(`/api/admin/products/${itemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok || !data.success) throw new Error(data.message || 'خطأ في حذف المنتج');
            showNotification(`تم حذف ${item.name} من المخزون`, 'success');
            loadInventoryData();
        })
        .catch(err => showNotification(err.message, 'error'));
    }
}

// Quick action functions
function exportInventory() {
    try {
        const rows = [
            ['name','category','currentStock','minStock','price','discountPercent','totalValue','status','lastUpdated']
        ];
        const data = (Array.isArray(currentInventory) ? currentInventory : []).map(i => ({
            name: i.name || '',
            category: i.category || '',
            currentStock: Number(i.currentStock||0),
            minStock: Number(i.minStock||0),
            price: Number(i.price||0),
            discountPercent: Number(i.discountPercent||0),
            totalValue: Number(i.totalValue||0),
            status: i.status || '',
            lastUpdated: i.lastUpdated || ''
        }));
        data.forEach(i => rows.push([
            i.name,
            i.category,
            i.currentStock,
            i.minStock,
            i.price,
            i.discountPercent,
            i.totalValue,
            i.status,
            i.lastUpdated
        ]));
        const csv = rows.map(r => r.map(v => String(v).replace(/"/g,'""')).map(v => /[",\n]/.test(v)?`"${v}"`:v).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        const today = new Date();
        const fn = `inventory-export-${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}.csv`;
        a.download = fn;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('تم تنزيل ملف CSV لتقرير المخزون', 'success');
    } catch (err) {
        showNotification('تعذر تصدير التقرير: '+ err.message, 'error');
    }
}

function addStockItem() {
    document.getElementById('add-product-modal').style.display = 'block';
}

function closeAddProductModal() {
    document.getElementById('add-product-modal').style.display = 'none';
}

function updateAllStock() {
    if (confirm('هل أنت متأكد من تحديث جميع الكميات؟')) {
        showNotification('جاري تحديث جميع الكميات...', 'info');
        
        // Simulate bulk update
        setTimeout(() => {
            showNotification('تم تحديث جميع الكميات بنجاح!', 'success');
            loadInventoryData();
        }, 1500);
    }
}

function printInventory() {
    showNotification('جاري تحضير المخزون للطباعة...', 'info');
    
    // Simulate print
    setTimeout(() => {
        window.print();
    }, 1000);
}

function generateReorderList() {
    const items = (Array.isArray(currentInventory) ? currentInventory : []).filter(item => item.status === 'low-stock' || item.status === 'critical' || Number(item.currentStock||0) < Number(item.minStock||0));
    if (items.length === 0) {
        showNotification('لا توجد منتجات تحتاج لإعادة الطلب', 'info');
        return;
    }
    const rows = [['name','category','currentStock','minStock','needToOrder','price','discountPercent']];
    items.forEach(i => {
        const need = Math.max(Number(i.minStock||0) - Number(i.currentStock||0), 0);
        rows.push([i.name, i.category, Number(i.currentStock||0), Number(i.minStock||0), need, Number(i.price||0), Number(i.discountPercent||0)]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = 'reorder-list.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`تم إنشاء وتنزيل قائمة إعادة الطلب (${items.length} منتج)`, 'success');
}

function generateStockReport() {
    const rows = [['category','itemsCount','totalQty','totalValue(EGP)']];
    const byCat = {};
    (Array.isArray(currentInventory) ? currentInventory : []).forEach(i => {
        const c = i.category || 'غير مصنّف';
        if (!byCat[c]) byCat[c] = { items:0, qty:0, value:0 };
        byCat[c].items += 1;
        byCat[c].qty += Number(i.currentStock||0);
        byCat[c].value += Number(i.totalValue||0);
    });
    Object.entries(byCat).forEach(([c,v]) => rows.push([c, v.items, v.qty, Math.round(v.value)]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = 'stock-report-summary.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('تم إنشاء وتنزيل تقرير المخزون الملخص', 'success');
}

function importStock() {
    try {
        let input = document.getElementById('import-file');
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.id = 'import-file';
            input.accept = '.csv,application/json';
            input.style.display = 'none';
            document.body.appendChild(input);
        }
        input.onchange = async () => {
            const file = input.files && input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const text = String(reader.result || '');
                    let records = [];
                    if (file.type.includes('json') || text.trim().startsWith('[')) {
                        records = JSON.parse(text);
                    } else {
                        records = parseCSV(text);
                    }
                    if (!Array.isArray(records) || records.length === 0) {
                        showNotification('لا توجد بيانات للاستيراد', 'warn');
                        return;
                    }
                    const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
                    let success = 0, failed = 0;
                    for (const r of records) {
                        try {
                            const fd = new FormData();
                            fd.append('name', (r.name||'').trim());
                            fd.append('category', (r.category||'').trim());
                            fd.append('price', String(Number(r.price||0)));
                            fd.append('stock', String(Number(r.currentStock||r.stock||0)));
                            if (r.discountPercent != null) fd.append('discount', String(Number(r.discountPercent||0)));
                            fd.append('description', (r.description||'مستورد عبر ملف').trim());
                            if (Array.isArray(r.sizes)) fd.append('sizes', r.sizes.join(','));
                            if (Array.isArray(r.colors)) fd.append('colors', r.colors.join(','));
                            // Images: if provided as URLs, attach first one
                            if (Array.isArray(r.images) && r.images[0]) fd.append('images', r.images[0]);
                            const res = await fetch('/api/admin/products', {
                                method: 'POST',
                                headers: { 'Authorization': token ? `Bearer ${token}` : '' },
                                body: fd
                            });
                            const data = await res.json();
                            if (!res.ok || !data.success) throw new Error(data.message || 'فشل إضافة منتج');
                            success++;
                        } catch (e) {
                            failed++;
                        }
                    }
                    showNotification(`تم الاستيراد: ناجح ${success} / فشل ${failed}`, failed ? 'warn' : 'success');
                    loadInventoryData();
                } catch (e) {
                    showNotification('تعذر قراءة الملف: '+ e.message, 'error');
                }
                input.value = '';
            };
            reader.readAsText(file);
        };
        input.click();
    } catch (err) {
        showNotification('تعذر فتح الاستيراد: '+ err.message, 'error');
    }
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
    if (lines.length === 0) return [];
    const header = splitCSVLine(lines[0]).map(h => h.trim());
    const idx = (k) => header.findIndex(h => h.toLowerCase() === k.toLowerCase());
    const recs = [];
    for (let i=1; i<lines.length; i++) {
        const cols = splitCSVLine(lines[i]);
        const get = (k) => {
            const j = idx(k);
            return j >=0 ? cols[j] : '';
        };
        recs.push({
            name: get('name'),
            category: get('category'),
            currentStock: Number(get('currentStock')||get('stock')||0),
            minStock: Number(get('minStock')||0),
            price: Number(get('price')||0),
            discountPercent: Number(get('discountPercent')||get('discount')||0),
            totalValue: Number(get('totalValue')||0),
            status: get('status'),
            lastUpdated: get('lastUpdated')
        });
    }
    return recs;
}

function splitCSVLine(line) {
    const res = [];
    let cur = '';
    let inQ = false;
    for (let i=0; i<line.length; i++) {
        const ch = line[i];
        if (inQ) {
            if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
            else if (ch === '"') { inQ = false; }
            else { cur += ch; }
        } else {
            if (ch === ',') { res.push(cur); cur=''; }
            else if (ch === '"') { inQ = true; }
            else { cur += ch; }
        }
    }
    res.push(cur);
    return res;
}

function stockAlertSettings() {
    const modal = document.getElementById('alert-settings-modal');
    if (!modal) { showNotification('تعذر فتح إعدادات التنبيهات', 'error'); return; }
    const s = getAlertSettings();
    document.getElementById('alert-low-threshold').value = Number(s.lowThreshold||15);
    document.getElementById('alert-critical-threshold').value = Number(s.criticalThreshold||10);
    document.getElementById('alert-minstock-default').value = Number(s.minStockDefault||15);
    modal.style.display = 'block';
    const saveBtn = document.getElementById('save-alert-settings');
    if (saveBtn) {
        saveBtn.onclick = () => {
            const low = Number(document.getElementById('alert-low-threshold').value||15);
            const crit = Number(document.getElementById('alert-critical-threshold').value||10);
            const minD = Number(document.getElementById('alert-minstock-default').value||15);
            setAlertSettings({ lowThreshold: low, criticalThreshold: crit, minStockDefault: minD });
            modal.style.display = 'none';
            loadInventoryData();
            showNotification('تم حفظ إعدادات التنبيهات', 'success');
        };
    }
}

function getAlertSettings() {
    if (alertSettingsCache) return alertSettingsCache;
    try {
        const raw = localStorage.getItem('stockAlertSettings');
        alertSettingsCache = raw ? JSON.parse(raw) : { lowThreshold: 15, criticalThreshold: 10, minStockDefault: 15 };
    } catch {
        alertSettingsCache = { lowThreshold: 15, criticalThreshold: 10, minStockDefault: 15 };
    }
    return alertSettingsCache;
}

function setAlertSettings(s) {
    alertSettingsCache = s;
    try { localStorage.setItem('stockAlertSettings', JSON.stringify(s)); } catch {}
}

// Utility functions
function formatPrice(price) {
    try {
        const n = Number(price);
        const fmt = new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 });
        return fmt.format(Number.isFinite(n) ? n : 0);
    } catch {
        return `EGP ${Number(price||0).toFixed(0)}`;
    }
}

function formatDate(dateString) {
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return '-';
    }
}

function getStockStatusText(status) {
    const statusMap = {
        'in-stock': 'متوفر',
        'low-stock': 'منخفض',
        'critical': 'حرج',
        'out-of-stock': 'نفد'
    };
    return statusMap[status] || status;
}

function showNotification(message, type = 'info') {
    if (window.AdminAuth && window.AdminAuth.showNotification) {
        window.AdminAuth.showNotification(message, type);
    } else {
        alert(message);
    }
}

// Export for use in other files
window.InventoryManager = {
    mockInventory,
    loadInventoryData,
    filterInventory,
    searchInventory,
    updateStock,
    exportInventory,
    generateReorderList
};
function handleAddProductSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('add-product-form');
    const formData = new FormData(form);
    const name = formData.get('name');
    const selectedCategory = (formData.get('category') || '').trim();
    const newCategory = (formData.get('category-new') || '').trim();
    const category = newCategory || selectedCategory;
    formData.set('category', category);
    formData.delete('category-new');
    const price = parseFloat(formData.get('price'));
    const stock = parseInt(formData.get('stock'));
    const description = formData.get('description');
    const images = formData.getAll('images');
    if (!name || !category || !description || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0 || images.length === 0) {
        showNotification('يرجى ملء البيانات المطلوبة وإرفاق صورة المنتج', 'error');
        return;
    }
    const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
    fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        body: formData
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
        if (!ok || !data.success) throw new Error(data.message || 'خطأ في إضافة المنتج');
        showNotification('تم إضافة المنتج بنجاح', 'success');
        closeAddProductModal();
        form.reset();
        loadInventoryData();
    })
    .catch(err => showNotification(err.message, 'error'));
}
