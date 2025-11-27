// Settings Page JavaScript

let settingsState = null;

// Initialize settings page
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!checkAdminAuth()) {
        window.location.href = 'login.html';
        return;
    }
    
    loadSettings();
    setupEventListeners();
});

// Check admin authentication
function checkAdminAuth() {
    if (window.AdminAuth && window.AdminAuth.checkAdminAuth) {
        return window.AdminAuth.checkAdminAuth();
    }
    
    // Fallback check
    const authData = localStorage.getItem('mkAdminAuth') || sessionStorage.getItem('mkAdminAuth');
    return authData !== null;
}

// Load settings data
function loadSettings() {
    fetchSettingsFromServer()
        .then(() => {
            loadStoreSettings();
            loadOrderSettings();
            loadNotificationSettings();
            loadAppearanceSettings();
        })
        .catch(err => {
            showNotification('تعذر تحميل الإعدادات', 'error');
        });
}

// Load store settings
function loadStoreSettings() {
    const store = settingsState.store;
    document.getElementById('store-name').value = store.name;
    document.getElementById('store-description').value = store.description;
    document.getElementById('store-phone').value = store.phone;
    document.getElementById('store-email').value = store.email;
    document.getElementById('store-address').value = store.address;
}

// Load order settings
function loadOrderSettings() {
    const orders = settingsState.orders;
    document.getElementById('order-prefix').value = orders.prefix;
    document.getElementById('min-order-amount').value = orders.minAmount;
    document.getElementById('delivery-fee').value = orders.deliveryFee;
    document.getElementById('auto-confirm').checked = orders.autoConfirm;
}

// Load notification settings
function loadNotificationSettings() {
    const notifications = settingsState.notifications;
    document.getElementById('new-order-notif').checked = notifications.newOrder;
    document.getElementById('low-stock-notif').checked = notifications.lowStock;
    document.getElementById('email-notif').checked = notifications.email;
}

// Load appearance settings
function loadAppearanceSettings() {
    const appearance = settingsState.appearance;
    document.getElementById('dark-mode').checked = appearance.darkMode;
    document.getElementById('font-size').value = appearance.fontSize;
    document.getElementById('language').value = appearance.language;
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.getAttribute('data-tab'));
        });
    });
    
    // Form submissions
    document.getElementById('store-info-form').addEventListener('submit', handleStoreInfoSubmit);
    document.getElementById('order-settings-form').addEventListener('submit', handleOrderSettingsSubmit);
    document.getElementById('change-password-form').addEventListener('submit', handlePasswordChange);
    
    // Real-time settings updates
    document.querySelectorAll('.toggle-input').forEach(toggle => {
        toggle.addEventListener('change', handleToggleChange);
    });
    
    document.getElementById('font-size').addEventListener('change', handleFontSizeChange);
    document.getElementById('language').addEventListener('change', handleLanguageChange);
    const refreshBtn = document.getElementById('refresh-storage');
    const saveQuotaBtn = document.getElementById('save-storage-quota');
    if (refreshBtn) refreshBtn.addEventListener('click', handleRefreshStorage);
    if (saveQuotaBtn) saveQuotaBtn.addEventListener('click', handleSaveStorageQuota);
}

// Switch between tabs
function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Show corresponding tab content
    document.querySelectorAll('.settings-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Handle store info form submission
function handleStoreInfoSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const storeData = {
        name: formData.get('store-name'),
        description: formData.get('store-description'),
        phone: formData.get('store-phone'),
        email: formData.get('store-email'),
        address: formData.get('store-address')
    };
    
    updateSettingsOnServer({ store: storeData })
        .then(updated => {
            settingsState = updated;
            showNotification('تم حفظ معلومات المتجر بنجاح!', 'success');
        })
        .catch(err => showNotification(err.message || 'فشل حفظ الإعدادات', 'error'));
}

// Handle order settings form submission
function handleOrderSettingsSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const orderData = {
        prefix: formData.get('order-prefix'),
        minAmount: parseFloat(formData.get('min-order-amount')),
        deliveryFee: parseFloat(formData.get('delivery-fee')),
        autoConfirm: formData.get('auto-confirm') === 'on'
    };
    
    updateSettingsOnServer({ orders: orderData })
        .then(updated => {
            settingsState = updated;
            showNotification('تم حفظ إعدادات الطلبات بنجاح!', 'success');
        })
        .catch(err => showNotification(err.message || 'فشل حفظ الإعدادات', 'error'));
}

// Handle password change
function handlePasswordChange(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const currentPassword = formData.get('current-password');
    const newPassword = formData.get('new-password');
    const confirmPassword = formData.get('confirm-password');
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
        showNotification('كلمة المرور الجديدة غير متطابقة!', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('يجب أن تكون كلمة المرور 6 أحرف على الأقل!', 'error');
        return;
    }
    
    changePasswordOnServer(currentPassword, newPassword)
        .then(() => {
            showNotification('تم تغيير كلمة المرور بنجاح!', 'success');
            this.reset();
        })
        .catch(err => showNotification(err.message || 'فشل تغيير كلمة المرور', 'error'));
}

// Handle toggle changes
function handleToggleChange(e) {
    const settingId = e.target.id;
    const isChecked = e.target.checked;
    
    // Update mock settings based on toggle
    if (settingId === 'new-order-notif') {
        settingsState.notifications.newOrder = isChecked;
    } else if (settingId === 'low-stock-notif') {
        settingsState.notifications.lowStock = isChecked;
    } else if (settingId === 'email-notif') {
        settingsState.notifications.email = isChecked;
    } else if (settingId === 'two-factor') {
        showNotification(isChecked ? 'تم تفعيل التحقق بخطوتين' : 'تم إلغاء التحقق بخطوتين', 'info');
    } else if (settingId === 'login-logs') {
        showNotification(isChecked ? 'تم تفعيل تسجيل محاولات الدخول' : 'تم إلغاء تسجيل محاولات الدخول', 'info');
    } else if (settingId === 'dark-mode') {
        settingsState.appearance.darkMode = isChecked;
        document.body.classList.toggle('dark-mode', isChecked);
        showNotification(isChecked ? 'تم تفعيل الوضع المظلم' : 'تم إلغاء الوضع المظلم', 'info');
    }
}

// Handle font size change
function handleFontSizeChange(e) {
    const fontSize = e.target.value;
    settingsState.appearance.fontSize = fontSize;
    
    // Apply font size to body
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${fontSize}`);
    
    showNotification(`تم تغيير حجم الخط إلى ${getFontSizeText(fontSize)}`, 'info');
}

// Handle language change
function handleLanguageChange(e) {
    const language = e.target.value;
    settingsState.appearance.language = language;
    
    showNotification(`تم تغيير اللغة إلى ${language === 'ar' ? 'العربية' : 'English'}`, 'info');
}

// Storage tab handlers
async function handleRefreshStorage() {
    try {
        const stats = await fetchStorageStatsFromServer();
        renderStorageStats(stats);
    } catch (err) {
        showNotification(err.message || 'تعذر تحديث حالة التخزين', 'error');
    }
}

async function handleSaveStorageQuota() {
    const input = document.getElementById('storage-quota-input');
    const quota = Number(input.value);
    if (!Number.isFinite(quota) || quota < 0) {
        showNotification('قيمة الحصة غير صحيحة', 'error');
        return;
    }
    try {
        const updated = await updateSettingsOnServer({ storage: { quotaMB: quota } });
        settingsState = updated;
        showNotification('تم حفظ الحصة بنجاح', 'success');
        const stats = await fetchStorageStatsFromServer();
        renderStorageStats(stats);
    } catch (err) {
        showNotification(err.message || 'تعذر حفظ الحصة', 'error');
    }
}

function renderStorageStats(stats) {
    const usedMB = stats.usedMB || 0;
    const quotaMB = (settingsState.storage && settingsState.storage.quotaMB) != null ? Number(settingsState.storage.quotaMB) : null;
    document.getElementById('storage-used').textContent = `${usedMB} MB`;
    document.getElementById('storage-quota').textContent = quotaMB != null ? `${quotaMB} MB` : 'غير محدد';
    const remaining = quotaMB != null ? Math.max(0, quotaMB - usedMB) : '—';
    document.getElementById('storage-remaining').textContent = quotaMB != null ? `${remaining} MB` : '—';
    const progress = quotaMB != null && quotaMB > 0 ? Math.min(100, Math.round((usedMB / quotaMB) * 100)) : 0;
    document.getElementById('storage-progress').style.width = `${progress}%`;
    const note = document.getElementById('storage-mode-note');
    if (stats.mode === 'mongo') note.textContent = 'وضع التخزين: MongoDB (قيمة الحصة يدوية حسب خطة الاستضافة)';
    else note.textContent = 'وضع التخزين: ملفات محلية (حجم مجلدات البيانات والرفع)';
}

async function fetchStorageStatsFromServer() {
    const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
    const res = await fetch('/api/admin/storage', {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'خطأ في جلب حالة التخزين');
    return data.data;
}

// End all sessions
function endAllSessions() {
    if (confirm('هل أنت متأكد من إنهاء جميع الجلسات النشطة؟')) {
        // Clear all authentication data
        localStorage.removeItem('mkAdminAuth');
        sessionStorage.removeItem('mkAdminAuth');
        
        showNotification('تم إنهاء جميع الجلسات النشطة', 'success');
        
        // Redirect to login
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }
}

// Utility functions
function getFontSizeText(size) {
    const sizeMap = {
        'small': 'صغير',
        'medium': 'متوسط',
        'large': 'كبير'
    };
    return sizeMap[size] || size;
}

function showNotification(message, type = 'info') {
    if (window.AdminAuth && window.AdminAuth.showNotification) {
        window.AdminAuth.showNotification(message, type);
    } else {
        alert(message);
    }
}

// Export for use in other files
window.SettingsManager = {
    settingsState,
    loadSettings,
    switchTab
};

// Backend integration helpers
async function fetchSettingsFromServer() {
    const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
    const res = await fetch('/api/admin/settings', {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'خطأ في تحميل الإعدادات');
    settingsState = data.data;
}

async function updateSettingsOnServer(partial) {
    const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
    const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(partial)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'خطأ في تحديث الإعدادات');
    return data.data;
}

async function changePasswordOnServer(currentPassword, newPassword) {
    const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
    const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'خطأ في تغيير كلمة المرور');
    return true;
}
