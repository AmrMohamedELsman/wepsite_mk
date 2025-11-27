// Admin Dashboard JavaScript

// Mock data for dashboard
const mockDashboardData = {
    stats: {
        totalProducts: 24,
        totalOrders: 15,
        lowStock: 3,
        monthlyRevenue: 12500
    },
    recentOrders: [
        {
            id: 'ORD-001',
            customerName: 'أحمد محمد',
            customerPhone: '0501234567',
            productName: 'قميص MK كلاسيكي',
            quantity: 2,
            total: 179.98,
            status: 'pending',
            orderDate: '2024-01-20'
        },
        {
            id: 'ORD-002',
            customerName: 'سارة أحمد',
            customerPhone: '0502345678',
            productName: 'بنطال MK رياضي',
            quantity: 1,
            total: 129.99,
            status: 'confirmed',
            orderDate: '2024-01-19'
        },
        {
            id: 'ORD-003',
            customerName: 'محمد علي',
            customerPhone: '0503456789',
            productName: 'جاكيت MK شتوي',
            quantity: 1,
            total: 199.99,
            status: 'shipped',
            orderDate: '2024-01-18'
        },
        {
            id: 'ORD-004',
            customerName: 'فاطمة حسن',
            customerPhone: '0504567890',
            productName: 'حقيبة MK يد',
            quantity: 1,
            total: 149.99,
            status: 'delivered',
            orderDate: '2024-01-17'
        }
    ],
    lowStockProducts: [
        {
            id: 3,
            name: 'جاكيت MK شتوي',
            category: 'جاكيتات',
            currentStock: 10,
            minStock: 15,
            status: 'low'
        },
        {
            id: 7,
            name: 'كاب MK رياضي',
            category: 'اكسسوارات',
            currentStock: 5,
            minStock: 10,
            status: 'critical'
        },
        {
            id: 2,
            name: 'بنطال MK رياضي',
            category: 'بناطيل',
            currentStock: 15,
            minStock: 20,
            status: 'low'
        }
    ]
};

// Backend data fetch helpers
async function fetchDashboardStats() {
    const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
    const res = await fetch('/api/admin/dashboard', {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'خطأ في تحميل الإحصائيات');
    return data.data;
}

async function fetchRecentOrders(limit = 8) {
    const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
    const res = await fetch(`/api/admin/orders?limit=${limit}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'خطأ في تحميل الطلبات');
    return data.data;
}

async function fetchProducts(limit = 100) {
    const res = await fetch(`/api/products?limit=${limit}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'خطأ في تحميل المنتجات');
    return data.data;
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for AdminAuth to be available
    setTimeout(() => {
        // Check authentication
        if (!checkAdminAuth()) {
            window.location.href = 'login.html';
            return;
        }
        
        loadDashboardData();
        setupEventListeners();
    }, 100);
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

// Load dashboard data
async function loadDashboardData() {
    try {
        const [stats, orders, products] = await Promise.all([
            fetchDashboardStats(),
            fetchRecentOrders(8),
            fetchProducts(100)
        ]);
        loadStatistics(stats);
        loadRecentOrders(orders, products);
        const lowStock = products
            .filter(p => typeof p.stock === 'number' && p.stock < 15)
            .map(p => ({
                id: p._id || p.id,
                name: p.name,
                category: p.category,
                currentStock: p.stock,
                minStock: 15,
                status: p.stock === 0 ? 'out' : (p.stock < 10 ? 'critical' : 'low')
            }));
        loadLowStockProducts(lowStock);
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

// Load statistics
function loadStatistics(stats) {
    animateNumber('total-products', (stats && stats.totalProducts) || 0);
    animateNumber('total-orders', (stats && stats.totalOrders) || 0);
    animateNumber('low-stock', (stats && stats.lowStock) || 0);
    animateCurrency('total-revenue', (stats && stats.monthlyRevenue) || 0);
}

// Animate number counting
function animateNumber(elementId, targetValue, suffix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    const startValue = 0;
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);
        
        element.textContent = currentValue.toLocaleString() + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// Animate currency (EGP) with formatting
function animateCurrency(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const duration = 2000;
    const startTime = performance.now();
    const startValue = 0;
    const fmt = new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 });
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);
        element.textContent = fmt.format(currentValue);
        if (progress < 1) requestAnimationFrame(updateNumber);
    }
    requestAnimationFrame(updateNumber);
}

// Load recent orders
function loadRecentOrders(orders, products = []) {
    const ordersBody = document.getElementById('recent-orders-body');
    if (!ordersBody) return;
    const prodMap = new Map(Array.isArray(products) ? products.map(p => [String(p._id || p.id), p]) : []);
    ordersBody.innerHTML = orders.map(order => {
        const pid = order.productId && typeof order.productId === 'object' ? String(order.productId._id || order.productId.id) : String(order.productId || '');
        const pObj = prodMap.get(pid);
        const pName = order.productName || (order.productId && typeof order.productId === 'object' ? order.productId.name : (pObj ? pObj.name : '-'));
        return `
        <tr>
            <td><strong>${order._id || order.id}</strong></td>
            <td>${order.customerName || (order.customer && order.customer.name) || '-'}</td>
            <td>${pName}</td>
            <td>${order.quantity}</td>
            <td><strong>${formatPrice(order.total || order.totalAmount || 0)}</strong></td>
            <td><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></td>
            <td>${formatDate(order.orderDate)}</td>
            <td>
                <button class="btn-action btn-view" onclick="viewOrder('${order._id || order.id}')" title="عرض التفاصيل">
                    👁️
                </button>
                <button class="btn-action btn-edit" onclick="editOrder('${order._id || order.id}')" title="تعديل">
                    ✏️
                </button>
                <button class="btn-action btn-delete" onclick="deleteOrder('${order._id || order.id}')" title="حذف">
                    🗑️
                </button>
            </td>
        </tr>
    `}).join('');
}

// Load low stock products
function loadLowStockProducts(products) {
    const lowStockBody = document.getElementById('low-stock-body');
    if (!lowStockBody) return;
    
    lowStockBody.innerHTML = products.map(product => `
        <tr>
            <td><strong>${product.name}</strong></td>
            <td>${product.category}</td>
            <td><span class="stock-number ${product.status}">${product.currentStock}</span></td>
            <td>${product.minStock}</td>
            <td><span class="status-badge status-${product.status}">${getStockStatusText(product.status)}</span></td>
            <td>
                <button class="btn-action btn-edit" onclick="updateStock('${product.id}')" title="تحديث المخزون">
                    📦
                </button>
                <button class="btn-action btn-view" onclick="viewProduct('${product.id}')" title="عرض المنتج">
                    👁️
                </button>
            </td>
        </tr>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Add click listeners to stat cards with navigation
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', function() {
            const label = this.querySelector('.stat-label').textContent.trim();
            if (label.includes('إجمالي المنتجات')) {
                window.location.href = 'products.html';
            } else if (label.includes('الطلبات')) {
                window.location.href = 'orders.html';
            } else if (label.includes('نفاد')) {
                window.location.href = 'inventory.html';
            } else if (label.includes('الإيرادات')) {
                window.location.href = 'orders.html?view=stats';
            }
        });
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl + N for new product
        if (e.ctrlKey && e.key === 'ن') {
            e.preventDefault();
            window.location.href = 'products.html?action=new';
        }
        
        // Ctrl + O for orders
        if (e.ctrlKey && e.key === 'ط') {
            e.preventDefault();
            window.location.href = 'orders.html';
        }
    });
}

// Order management functions
function viewOrder(orderId) {
    window.location.href = `orders.html?orderId=${orderId}`;
}

function editOrder(orderId) {
    window.location.href = `orders.html?edit=${orderId}`;
}

function deleteOrder(orderId) {
    if (confirm(`هل أنت متأكد من حذف الطلب: ${orderId}؟`)) {
        showNotification(`تم حذف الطلب: ${orderId}`, 'success');
        // Later: Implement actual deletion
    }
}

// Product management functions
async function updateStock(productId) {
    const newStock = prompt(`أدخل الكمية الجديدة للمخزون:`);
    if (newStock === null) return;
    const parsed = parseInt(newStock);
    if (isNaN(parsed) || parsed < 0) {
        showNotification('قيمة المخزون غير صحيحة', 'error');
        return;
    }
    try {
        const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
        const res = await fetch(`/api/admin/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ stock: parsed })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'خطأ في تحديث المخزون');
        showNotification('تم تحديث المخزون بنجاح', 'success');
        loadDashboardData();
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

function viewProduct(productId) {
    window.location.href = `products.html?productId=${productId}`;
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

function getStatusText(status) {
    const statusMap = {
        'pending': 'قيد الانتظار',
        'confirmed': 'تم التأكيد',
        'processing': 'قيد المعالجة',
        'shipped': 'تم الشحن',
        'delivered': 'تم التوصيل',
        'cancelled': 'تم الإلغاء'
    };
    return statusMap[status] || status;
}

function getStockStatusText(status) {
    const statusMap = {
        'low': 'منخفض',
        'critical': 'حرج',
        'out': 'نفد'
    };
    return statusMap[status] || status;
}

function showNotification(message, type = 'info') {
    // Use AdminAuth notification if available
    if (window.AdminAuth && window.AdminAuth.showNotification) {
        window.AdminAuth.showNotification(message, type);
    } else {
        // Fallback notification
        alert(message);
    }
}

// Export functions for use in other admin files
window.AdminDashboard = {
    loadDashboardData,
    viewOrder,
    editOrder,
    deleteOrder,
    updateStock,
    viewProduct
};
