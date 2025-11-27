// Admin Products Management JavaScript

// Products data from backend
let adminProducts = [];

// Current editing product
let currentEditingProduct = null;

// DOM Elements
const productsBody = document.getElementById('products-body');
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const modalTitle = document.getElementById('modal-title');

// Initialize products page
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!checkAdminAuth()) {
        window.location.href = 'login.html';
        return;
    }
    
    loadProducts();
    setupEventListeners();
    setupCategoryNewBinding();
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

// Load products
async function loadProducts() {
    try {
        const res = await fetch('/api/products?limit=200');
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'خطأ في تحميل المنتجات');
        adminProducts = data.data;
        displayProducts(adminProducts);
    } catch (err) {
        // Fallback to mock data if available
        if (window.mockProducts && Array.isArray(window.mockProducts) && window.mockProducts.length) {
            adminProducts = window.mockProducts;
            displayProducts(adminProducts);
            showNotification('تعذر تحميل البيانات من الخادم — تم عرض بيانات افتراضية', 'warn');
        } else {
            showNotification(err.message, 'error');
        }
    }
}

// Display products in table
function displayProducts(products) {
    if (!productsBody) return;
    if (!products || products.length === 0) {
        productsBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:1.5rem;">
                    لا توجد منتجات حالياً
                </td>
            </tr>
        `;
        return;
    }
    productsBody.innerHTML = products.map(product => `
        <tr>
            <td data-label="الصورة">
                <div class="product-image-cell">
                    ${product.images && product.images.length ? `<img src="${product.images[0]}" alt="${product.name}" class="table-product-image">` : '📦'}
                </div>
            </td>
            <td data-label="الاسم"><strong>${product.name}</strong></td>
            <td data-label="التصنيف">${product.category}</td>
            <td data-label="السعر">
                ${(() => { const dp = Number(product.discountPercent ?? product.discount) || 0; return dp > 0 ? `
                    <strong>${formatPrice((Number(product.price)||0) * (1 - Math.min(Math.max(dp,0),100)/100))}</strong>
                    <small class="price-old">${formatPrice(product.price)}</small>
                    <span class="discount-badge">-${dp}%</span>
                ` : `<strong>${formatPrice(product.price)}</strong>`; })()}
            </td>
            <td data-label="المخزون">
                <span class="stock-badge ${getStockStatusClass(product.stock)}">
                    ${product.stock}
                </span>
            </td>
            <td data-label="مميز">
                ${product.featured ? '<span class="featured-badge">✨</span>' : '<span class="text-muted">-</span>'}
            </td>
            <td data-label="التاريخ">${formatDate(product.createdAt)}</td>
            <td data-label="الإجراءات">
                <button class="btn-action btn-edit" onclick="editProduct('${product._id || product.id}')" title="تعديل">✏️</button>
                <button class="btn-action btn-view" onclick="viewProduct('${product._id || product.id}')" title="عرض">👁️</button>
                <button class="btn-action btn-delete" onclick="deleteProduct('${product._id || product.id}')" title="حذف">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Product form submission
    if (productForm) {
        productForm.addEventListener('submit', handleProductForm);
    }
}

// Bind creating new category to select
function setupCategoryNewBinding() {
    const newCatInput = document.getElementById('product-category-new');
    const catSelect = document.getElementById('product-category');
    if (!newCatInput || !catSelect) return;
    newCatInput.addEventListener('input', function() {
        const val = this.value.trim();
        if (!val) return;
        // if option not exists, add it
        const exists = Array.from(catSelect.options).some(opt => String(opt.value) === val);
        if (!exists) {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            catSelect.appendChild(opt);
        }
        catSelect.value = val;
    });
}

// Show add product modal
function showAddProductModal() {
    currentEditingProduct = null;
    modalTitle.textContent = 'إضافة منتج جديد';
    productForm.reset();
    populateAdminCategories();
    showModal();
}

// Show edit product modal
function editProduct(productId) {
    const product = adminProducts.find(p => String(p._id || p.id) === String(productId));
    if (!product) return;
    
    currentEditingProduct = product;
    modalTitle.textContent = 'تعديل المنتج';
    
    // Fill form with product data
    document.getElementById('product-name').value = product.name;
    populateAdminCategories();
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-description').value = product.description;
    document.getElementById('product-sizes').value = product.sizes ? product.sizes.join(',') : '';
    document.getElementById('product-colors').value = product.colors ? product.colors.join(',') : '';
    document.getElementById('product-featured').checked = product.featured;
    const discountEl = document.getElementById('product-discount');
    if (discountEl) {
        const dp = Number(product.discountPercent ?? product.discount) || 0;
        discountEl.value = dp;
    }
    
    showModal();
}

// Show product details
function viewProduct(productId) {
    const product = adminProducts.find(p => String(p._id || p.id) === String(productId));
    if (!product) return;
    
    alert(`تفاصيل المنتج:\n\nالاسم: ${product.name}\nالتصنيف: ${product.category}\nالسعر: ${formatPrice(product.price)}\nالمخزون: ${product.stock} قطعة\nالوصف: ${product.description}\nالمقاسات: ${product.sizes ? product.sizes.join(', ') : 'غير متاح'}\nالألوان: ${product.colors ? product.colors.join(', ') : 'غير متاح'}\nمميز: ${product.featured ? 'نعم' : 'لا'}`);
}

// Delete product
function deleteProduct(productId) {
    const product = adminProducts.find(p => String(p._id || p.id) === String(productId));
    if (!product) return;
    
    if (confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`)) {
        const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
        fetch(`/api/admin/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok || !data.success) throw new Error(data.message || 'خطأ في حذف المنتج');
            showNotification(`تم حذف المنتج: ${product.name}`, 'success');
            loadProducts();
        })
        .catch(err => showNotification(err.message, 'error'));
    }
}

// Handle product form submission
function handleProductForm(e) {
    e.preventDefault();
    
    const formData = new FormData(productForm);
    // Resolve category from either select or new input
    const selectedCategory = (formData.get('category') || '').trim();
    const newCategory = (formData.get('category-new') || '').trim();
    const resolvedCategory = newCategory || selectedCategory;
    formData.set('category', resolvedCategory);
    formData.delete('category-new');
    const productData = {
        name: (formData.get('name') || '').trim(),
        category: resolvedCategory,
        price: Number(formData.get('price')),
        stock: Number(formData.get('stock')),
        description: (formData.get('description') || '').trim(),
        sizes: formData.get('sizes') ? formData.get('sizes').split(',').map(s => s.trim()).filter(Boolean) : [],
        colors: formData.get('colors') ? formData.get('colors').split(',').map(c => c.trim()).filter(Boolean) : [],
        featured: formData.get('featured') === 'on',
        discountPercent: Number(formData.get('discount')) || 0
    };
    
    // Validate form data
    if (!validateProductData(productData)) {
        return;
    }
    
    // Require at least one image on create
    if (!currentEditingProduct) {
        const files = formData.getAll('images');
        if (!files || files.length === 0 || !files[0] || !(files[0] instanceof File)) {
            showNotification('يرجى إرفاق صورة واحدة على الأقل للمنتج', 'error');
            return;
        }
    }

    // Show loading state
    showLoadingState();
    
    const token = window.AdminAuth && window.AdminAuth.getToken ? window.AdminAuth.getToken() : null;
    const url = currentEditingProduct ? `/api/admin/products/${currentEditingProduct._id || currentEditingProduct.id}` : '/api/admin/products';
    const method = currentEditingProduct ? 'PUT' : 'POST';
    // Use FormData directly to support file upload
    fetch(url, {
        method,
        headers: {
            'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
        if (!ok || !data.success) throw new Error(data.message || 'خطأ في حفظ المنتج');
        showNotification(currentEditingProduct ? 'تم تحديث المنتج' : 'تم إضافة المنتج', 'success');
        hideLoadingState();
        closeProductModal();
        loadProducts();
    })
    .catch(err => {
        showNotification(err.message, 'error');
        hideLoadingState();
    });
}

// Populate categories from current products
function populateAdminCategories() {
    try {
        const catSelect = document.getElementById('product-category');
        if (!catSelect) return;
        const list = Array.isArray(adminProducts) && adminProducts.length ? adminProducts : [];
        const unique = Array.from(new Set(list.map(p => p.category).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
        // Preserve first option (placeholder)
        const first = catSelect.querySelector('option');
        catSelect.innerHTML = '';
        if (first) {
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = first.textContent || 'اختر التصنيف';
            catSelect.appendChild(placeholder);
        } else {
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'اختر التصنيف';
            catSelect.appendChild(placeholder);
        }
        unique.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            catSelect.appendChild(opt);
        });
    } catch {}
}

// Validate product data
function validateProductData(data) {
    const errors = [];
    
    if (!data.name || data.name.length < 3) {
        errors.push('اسم المنتج يجب أن يكون 3 أحرف على الأقل');
    }
    
    if (!data.category) {
        errors.push('يرجى اختيار تصنيف للمنتج');
    }
    
    if (!Number.isFinite(data.price) || data.price <= 0) {
        errors.push('السعر يجب أن يكون رقماً موجباً');
    }
    
    if (!Number.isFinite(data.stock) || data.stock < 0) {
        errors.push('المخزون يجب أن يكون رقماً غير سالب');
    }
    
    if (!data.description || data.description.length < 10) {
        errors.push('الوصف يجب أن يكون 10 أحرف على الأقل');
    }
    if (!Number.isFinite(data.discountPercent) || data.discountPercent < 0 || data.discountPercent > 100) {
        errors.push('نسبة الخصم يجب أن تكون بين 0 و 100');
    }
    
    if (errors.length > 0) {
        showNotification(errors.join('\n'), 'error');
        return false;
    }
    
    return true;
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        'قمصان': '👔',
        'بناطيل': '👖',
        'اكسسوارات': '👜',
        'جاكيتات': '🧥',
        'احذية': '👟'
    };
    return icons[category] || '📦';
}

// Modal functions
function showModal() {
    if (!productModal) return;
    productModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    if (!productModal) return;
    productModal.classList.remove('show');
    document.body.style.overflow = '';
    currentEditingProduct = null;
}

// Loading state
function showLoadingState() {
    const submitBtn = productForm.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'flex';
}

function hideLoadingState() {
    const submitBtn = productForm.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    if (submitBtn) submitBtn.disabled = false;
    if (btnText) btnText.style.display = 'block';
    if (btnLoading) btnLoading.style.display = 'none';
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

function formatDate(date) {
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return '-';
    }
}

function getStockStatusClass(stock) {
    if (stock > 20) return 'in-stock';
    if (stock > 10) return 'medium-stock';
    if (stock > 0) return 'low-stock';
    return 'out-of-stock';
}

function showNotification(message, type = 'info') {
    if (window.AdminAuth && window.AdminAuth.showNotification) {
        window.AdminAuth.showNotification(message, type);
    } else {
        alert(message);
    }
}

// Close modal on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && productModal && productModal.classList.contains('show')) {
        closeProductModal();
    }
});

// Export functions
window.AdminProducts = {
    loadProducts,
    showAddProductModal,
    editProduct,
    deleteProduct
};
