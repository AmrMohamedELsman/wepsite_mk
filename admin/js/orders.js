// Orders Management JavaScript

let currentOrders = [];
let productsMap = new Map();

document.addEventListener('DOMContentLoaded', function() {
    if (!checkAdminAuth()) {
        window.location.href = 'login.html';
        return;
    }
    
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    const editId = params.get('edit');
    const viewStats = params.get('view') === 'stats';
    
    Promise.all([loadProductsMap(), loadOrders()]).then(() => {}).catch(() => {});
    setupEventListeners();
    
    if (viewStats) {
        showNotification('عرض إحصائيات الإيرادات الشهرية', 'info');
    }
});

function checkAdminAuth() {
    if (window.AdminAuth && window.AdminAuth.checkAdminAuth) {
        return window.AdminAuth.checkAdminAuth();
    }
    const authData = localStorage.getItem('mkAdminAuth') || sessionStorage.getItem('mkAdminAuth');
    return authData !== null;
}

async function loadOrders() {
    try {
        const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
        const res = await fetch('/api/admin/orders?limit=200', {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'خطأ في تحميل الطلبات');
        currentOrders = data.data;
        renderOrdersTable(currentOrders);
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('orders-body');
    if (!tbody) return;
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><strong class="order-code">${order.orderCode || order._id || order.id}</strong></td>
            <td>${order.customerName || (order.customer && order.customer.name) || '-'}</td>
            <td>${order.customerPhone || (order.customer && order.customer.phone) || '-'}</td>
            <td>${order.productName || (productsMap.get(String(order.productId)) && productsMap.get(String(order.productId)).name) || '-'}</td>
            <td>${order.quantity}</td>
            <td><strong>${formatPrice(order.total || order.totalAmount || 0)}</strong></td>
            <td><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></td>
            <td>${formatDate(order.orderDate)}</td>
            <td>
                <button class="btn-action btn-view" onclick="viewOrder('${order._id || order.id}')" title="عرض">
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
    `).join('');
}

async function loadProductsMap() {
    try {
        const res = await fetch('/api/products?limit=500');
        const data = await res.json();
        if (!res.ok || !data.success) return;
        productsMap = new Map((data.data || []).map(p => [String(p._id || p.id), p]));
    } catch {}
}

function viewOrder(orderId) {
    const order = currentOrders.find(o => String(o._id || o.id) === String(orderId));
    if (!order) return;
    const product = productsMap.get(String(order.productId));
    const body = document.getElementById('order-modal-body');
    document.getElementById('order-modal-title').textContent = `تفاصيل الطلب ${order.orderCode || (order._id || order.id)}`;
    body.innerHTML = `
        <p><strong>العميل:</strong> ${order.customerName || '-'}</p>
        <p><strong>الهاتف:</strong> ${order.customerPhone || '-'}</p>
        <p><strong>المنتج:</strong> ${(order.productName) || (product && product.name) || '-'}</p>
        <p><strong>الكمية:</strong> ${order.quantity}</p>
        <p><strong>الإجمالي:</strong> ${formatPrice(order.total || order.totalAmount || 0)}</p>
        <p><strong>الحالة:</strong> ${getStatusText(order.status)}</p>
    `;
    document.getElementById('order-modal').classList.add('show');
}

function closeOrderModal() {
    document.getElementById('order-modal').classList.remove('show');
}

function editOrder(orderId) {
    const order = currentOrders.find(o => String(o._id || o.id) === String(orderId));
    if (!order) return;
    const body = document.getElementById('order-modal-body');
    document.getElementById('order-modal-title').textContent = `تعديل الطلب ${order.orderCode || (order._id || order.id)}`;
    body.innerHTML = `
        <div class="form-group">
            <label>الحالة</label>
            <select id="order-status-select">
                <option value="pending" ${order.status==='pending'?'selected':''}>قيد الانتظار</option>
                <option value="confirmed" ${order.status==='confirmed'?'selected':''}>تم التأكيد</option>
                <option value="processing" ${order.status==='processing'?'selected':''}>قيد المعالجة</option>
                <option value="shipped" ${order.status==='shipped'?'selected':''}>تم الشحن</option>
                <option value="delivered" ${order.status==='delivered'?'selected':''}>تم التوصيل</option>
                <option value="cancelled" ${order.status==='cancelled'?'selected':''}>تم الإلغاء</option>
            </select>
        </div>
        <div class="modal-actions">
            <button class="btn btn-primary" id="save-order-status">حفظ</button>
            <button class="btn btn-outline" onclick="closeOrderModal()">إلغاء</button>
        </div>
    `;
    document.getElementById('order-modal').classList.add('show');
    document.getElementById('save-order-status').onclick = async function() {
        const newStatus = document.getElementById('order-status-select').value;
        try {
            const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
            const res = await fetch(`/api/admin/orders/${order._id || order.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'خطأ في تحديث الطلب');
            closeOrderModal();
            loadOrders();
            showNotification('تم تحديث حالة الطلب بنجاح', 'success');
        } catch (err) {
            showNotification(err.message, 'error');
        }
    };
}

function setupEventListeners() {
    const statusFilter = document.getElementById('status-filter');
    const refreshBtn = document.getElementById('refresh-orders');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            const status = this.value;
            const base = [...currentOrders];
            currentOrders = status ? base.filter(o => o.status === status) : base;
            renderOrdersTable(currentOrders);
        });
    }
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            showNotification('تم تحديث قائمة الطلبات', 'success');
            renderOrdersTable(currentOrders);
        });
    }
}

// Remove duplicate simple implementations (now handled above with modal)

function deleteOrder(orderId) {
    const order = currentOrders.find(o => (o._id || o.id) === orderId);
    if (!order) return;
    if (confirm(`هل أنت متأكد من حذف الطلب ${order._id || order.id}؟`)) {
        const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
        fetch(`/api/admin/orders/${order._id || order.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok || !data.success) throw new Error(data.message || 'خطأ في حذف الطلب');
            showNotification('تم حذف الطلب بنجاح', 'success');
            loadOrders();
        })
        .catch(err => showNotification(err.message, 'error'));
    }
}

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
    const statusMap = { pending: 'قيد الانتظار', confirmed: 'تم التأكيد', processing: 'قيد المعالجة', shipped: 'تم الشحن', delivered: 'تم التوصيل', cancelled: 'تم الإلغاء' };
    return statusMap[status] || status;
}

function showNotification(message, type = 'info') {
    if (window.AdminAuth && window.AdminAuth.showNotification) {
        window.AdminAuth.showNotification(message, type);
    } else {
        alert(message);
    }
}

window.AdminOrders = {
    loadOrders,
    viewOrder,
    editOrder,
    deleteOrder
};
