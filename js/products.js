// Products Page JavaScript

// Use mockProducts from main.js or fetch from API
// If main.js is not loaded, define it here
if (typeof window.mockProducts === 'undefined') {
    window.mockProducts = [
    {
        id: 1,
        name: "قميص MK كلاسيكي",
        description: "قميص قطني عالي الجودة بتصميم كلاسيكي أنيق",
        price: 89.99,
        category: "قمصان",
        stock: 25,
        sizes: ["S", "M", "L", "XL"],
        colors: ["أبيض", "أسود", "رمادي"],
        featured: true,
        image: "👔",
        createdAt: new Date('2024-01-15')
    },
    {
        id: 2,
        name: "بنطال MK رياضي",
        description: "بنطال رياضي مريح بتصميم عصري وعملي",
        price: 129.99,
        category: "بناطيل",
        stock: 15,
        sizes: ["M", "L", "XL"],
        colors: ["أسود", "كحلي"],
        featured: true,
        image: "👖",
        createdAt: new Date('2024-01-20')
    },
    {
        id: 3,
        name: "جاكيت MK شتوي",
        description: "جاكيت شتوي دافئ بجودة ممتازة",
        price: 199.99,
        category: "جاكيتات",
        stock: 10,
        sizes: ["S", "M", "L", "XL", "XXL"],
        colors: ["أسود", "بني", "كحلي"],
        featured: true,
        image: "🧥",
        createdAt: new Date('2024-01-10')
    },
    {
        id: 4,
        name: "حقيبة MK يد",
        description: "حقيبة يد أنيقة بجودة عالية",
        price: 149.99,
        category: "اكسسوارات",
        stock: 20,
        colors: ["أسود", "بني", "رمادي"],
        featured: true,
        image: "👜",
        createdAt: new Date('2024-01-25')
    },
    {
        id: 5,
        name: "قميص MK رسمي",
        description: "قميص رسمي أنيق للمناسبات الخاصة",
        price: 119.99,
        category: "قمصان",
        stock: 18,
        sizes: ["S", "M", "L", "XL", "XXL"],
        colors: ["أبيض", "أزرق فاتح", "وردي"],
        featured: false,
        image: "👔",
        createdAt: new Date('2024-02-01')
    },
    {
        id: 6,
        name: "بنطال MK جينز",
        description: "بنطال جينز كلاسيكي بقصة مريحة",
        price: 159.99,
        category: "بناطيل",
        stock: 30,
        sizes: ["S", "M", "L", "XL"],
        colors: ["أزرق داكن", "أزرق فاتح", "رمادي"],
        featured: false,
        image: "👖",
        createdAt: new Date('2024-02-05')
    },
    {
        id: 7,
        name: "كاب MK رياضي",
        description: "كاب رياضي عصري لحماية من الشمس",
        price: 49.99,
        category: "اكسسوارات",
        stock: 35,
        colors: ["أسود", "أبيض", "أحمر", "أزرق"],
        featured: false,
        image: "🧢",
        createdAt: new Date('2024-02-10')
    },
    {
        id: 8,
        name: "سويت شيرت MK",
        description: "سويت شيرت قطني مريح للأيام الباردة",
        price: 179.99,
        category: "جاكيتات",
        stock: 22,
        sizes: ["S", "M", "L", "XL"],
        colors: ["رمادي", "أسود", "كحلي"],
        featured: false,
        image: "👕",
        createdAt: new Date('2024-02-15')
    }
];

// DOM Elements
const productsGrid = document.getElementById('products-grid');
const productsCount = document.getElementById('products-count');
const categoryFilter = document.getElementById('category-filter');
const priceFilter = document.getElementById('price-filter');
const sortFilter = document.getElementById('sort-filter');
const resetFiltersBtn = document.getElementById('reset-filters');
const pagination = document.getElementById('pagination');

// State management
let currentProducts = [...mockProducts];
let filteredProducts = [...mockProducts];
let currentPage = 1;
const productsPerPage = 6;

// Initialize the products page
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    setupEventListeners();
    refreshProductsFromAPI();
    populateCategoryFilter();
});

async function refreshProductsFromAPI() {
    try {
        const res = await fetch('/api/products?limit=200');
        const data = await res.json();
        if (!res.ok || !data.success) return;
        window.mockProducts = data.data;
        currentProducts = [...window.mockProducts];
        filteredProducts = [...window.mockProducts];
        currentPage = 1;
        displayProducts(filteredProducts);
        setupPagination();
        updateProductsCount();
        populateCategoryFilter();
    } catch (err) {
        // If API fails, keep existing mock data
        populateCategoryFilter();
    }
}

// Load and display products
function loadProducts() {
    displayProducts(filteredProducts);
    updateProductsCount();
    setupPagination();
    populateCategoryFilter();
}

// Display products in grid
function displayProducts(products) {
    if (!productsGrid) return;
    
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const productsToDisplay = products.slice(startIndex, endIndex);
    
    if (productsToDisplay.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-products">
                <div class="no-products-icon">📦</div>
                <h3>لا توجد منتجات</h3>
                <p>لم يتم العثور على منتجات تطابق معايير البحث الخاصة بك.</p>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = productsToDisplay.map(product => `
        <div class="product-card" data-product-id="${product._id || product.id}">
            <div class="product-image">
                ${product.images && product.images.length ? `<img src="${product.images[0]}" alt="${product.name}" class="card-product-image">` : `${product.image}`}
            </div>
            <div class="product-info">
                <div class="product-header">
                    <div class="name-row">
                        <h3 class="product-name">${product.name}</h3>
                    </div>
                    ${(() => { const dp = Number(product.discountPercent ?? product.discount) || 0; return dp > 0 ? `<span class="discount-badge">-${dp}%</span>` : (product.featured ? '<span class="featured-badge">الأكثر مبيعًا</span>' : '') })()}
                </div>
                <div class="product-submeta">
                    <span class="product-category">${product.category}</span>
                    <span class="product-stock ${getStockStatusClass(product.stock)}">${getStockStatus(product.stock)}</span>
                </div>
                <p class="product-description clamp-1">${product.description}</p>
                <div class="product-price">
                    ${(() => { const dp = Number(product.discountPercent ?? product.discount) || 0; return dp > 0 ? `
                        <span class="price-new">${formatPrice((Number(product.price)||0) * (1 - Math.min(Math.max(dp,0),100)/100))}</span>
                        <span class="price-old">${formatPrice(product.price)}</span>
                    ` : `${formatPrice(product.price)}`; })()}
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary btn-view-product" data-product-id="${product._id || product.id}">عرض التفاصيل</button>
                    <button class="btn btn-outline btn-add-to-cart" data-product-id="${product._id || product.id}">اطلب الآن</button>
                </div>
            </div>
        </div>
    `).join('');

    // Add event listeners to product buttons
    addProductEventListeners();
}

// Add event listeners to product buttons
function addProductEventListeners() {
    // View product details
    document.querySelectorAll('.btn-view-product').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            viewProductDetails(productId);
        });
    });
    
    // Add to cart
    document.querySelectorAll('.btn-add-to-cart').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            addToCart(productId);
        });
    });
}

// View product details
function viewProductDetails(productId) {
    const product = window.mockProducts.find(p => (p._id || p.id) == productId);
    if (!product) return;
    
    // Create modal for product details
    const modal = createProductModal(product);
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Create product details modal
function createProductModal(product) {
    const modal = document.createElement('div');
    modal.className = 'product-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeProductModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>${product.name}</h2>
                <button class="modal-close" onclick="closeProductModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="product-images">
                    <div class="main-image">${product.images && product.images.length ? `<img id="modal-main-image" src="${product.images[0]}" alt="${product.name}" class="modal-product-image">` : `${product.image}`}</div>
                    ${product.images && product.images.length > 1 ? `
                    <div class="thumbs">
                        ${product.images.map((src, i) => `
                            <img src="${src}" class="thumb-image ${i === 0 ? 'active' : ''}" data-index="${i}" alt="${product.name}">
                        `).join('')}
                    </div>` : ''}
                </div>
                <div class="product-details">
                    <div class="product-price">
                        ${(() => { const dp = Number(product.discountPercent ?? product.discount) || 0; return dp > 0 ? `
                            <span class="price-new">${formatPrice((Number(product.price)||0) * (1 - Math.min(Math.max(dp,0),100)/100))}</span>
                            <span class="price-old">${formatPrice(product.price)}</span>
                        ` : `${formatPrice(product.price)}`; })()}
                    </div>
                    <p class="product-description">${product.description}</p>
                    
                    <div class="product-options">
                        ${product.sizes ? `
                            <div class="option-group">
                                <label>المقاس:</label>
                                <div class="size-options">
                                    ${product.sizes.map(size => `
                                        <button class="size-option" data-size="${size}">${size}</button>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${product.colors ? `
                            <div class="option-group">
                                <label>اللون:</label>
                                <div class="color-options">
                                    ${product.colors.map(color => `
                                        <button class="color-option" data-color="${color}">${color}</button>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="product-meta">
                        <span class="product-category">${product.category}</span>
                        <span class="product-stock ${getStockStatusClass(product.stock)}">
                            ${getStockStatus(product.stock)}
                        </span>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-primary btn-add-to-cart" data-product-id="${product._id || product.id}">
                            اطلب الآن
                        </button>
                        <button class="btn btn-outline" onclick="closeProductModal()">
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners for size and color selection
    setTimeout(() => {
        modal.querySelectorAll('.size-option').forEach(btn => {
            btn.addEventListener('click', function() {
                modal.querySelectorAll('.size-option').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
        
        modal.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', function() {
                modal.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
        
        // Thumbnails click to change main image
        const mainImg = modal.querySelector('#modal-main-image');
        modal.querySelectorAll('.thumb-image').forEach(img => {
            img.addEventListener('click', function() {
                const src = this.getAttribute('src');
                if (mainImg) mainImg.setAttribute('src', src);
                modal.querySelectorAll('.thumb-image').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Order from modal
        const orderBtn = modal.querySelector('.btn-add-to-cart');
        if (orderBtn) {
            orderBtn.textContent = 'اطلب الآن';
            orderBtn.addEventListener('click', function() {
                openOrderModal(product);
            });
        }
    }, 100);
    
    return modal;
}

// Close product modal
function closeProductModal() {
    const modal = document.querySelector('.product-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    }
}

// Add to cart function
function addToCart(productId) {
    const product = window.mockProducts.find(p => (p._id || p.id) == productId);
    if (!product) return;
    openOrderModal(product);
}

function openOrderModal(product) {
    const modal = document.createElement('div');
    modal.className = 'product-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeProductModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>طلب: ${product.name}</h2>
                <button class="modal-close" onclick="closeProductModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="order-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>الاسم *</label>
                            <input type="text" name="customerName" required />
                        </div>
                        <div class="form-group">
                            <label>رقم الهاتف *</label>
                            <input type="tel" name="customerPhone" required />
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>الكمية *</label>
                            <input type="number" name="quantity" min="1" value="1" required />
                        </div>
                        <div class="form-group">
                            <label>البريد الإلكتروني</label>
                            <input type="email" name="customerEmail" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label>ملاحظات</label>
                        <textarea name="notes" rows="3"></textarea>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">إرسال الطلب</button>
                        <button type="button" class="btn btn-outline" onclick="closeProductModal()">إلغاء</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    const form = modal.querySelector('#order-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        submitOrder({
            productId: product._id || product.id,
            customerName: fd.get('customerName'),
            customerPhone: fd.get('customerPhone'),
            customerEmail: fd.get('customerEmail'),
            quantity: parseInt(fd.get('quantity')) || 1,
            notes: fd.get('notes') || ''
        });
    });
}

async function submitOrder(orderData) {
    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'فشل إرسال الطلب');
        showNotification('تم إرسال طلبك بنجاح! سنتواصل معك قريباً.', 'success');
        closeProductModal();
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Filter change listeners
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
    
    if (priceFilter) {
        priceFilter.addEventListener('change', applyFilters);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', applyFilters);
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
}

// Apply filters
function applyFilters() {
    const category = categoryFilter ? categoryFilter.value : '';
    const priceRange = priceFilter ? priceFilter.value : '';
    const sortBy = sortFilter ? sortFilter.value : 'name';
    
    // Filter products
    filteredProducts = window.mockProducts.filter(product => {
        // Category filter
        if (category && category !== 'all' && product.category !== category) {
            return false;
        }
        
        // Price filter
        if (priceRange) {
            if (priceRange === '0-100' && product.price >= 100) return false;
            if (priceRange === '100-200' && (product.price < 100 || product.price > 200)) return false;
            if (priceRange === '200+' && product.price <= 200) return false;
        }
        
        return true;
    });
    
    // Sort products
    filteredProducts.sort((a, b) => {
        switch (sortBy) {
            case 'price-low':
                return a.price - b.price;
            case 'price-high':
                return b.price - a.price;
            case 'newest':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'name':
            default:
                return a.name.localeCompare(b.name);
        }
    });
    
    // Reset to first page and display
    currentPage = 1;
    displayProducts(filteredProducts);
    setupPagination();
    updateProductsCount();
}

// Reset filters
function resetFilters() {
    if (categoryFilter) categoryFilter.value = 'all';
    if (priceFilter) priceFilter.value = '';
    if (sortFilter) sortFilter.value = 'name';
    
    filteredProducts = [...window.mockProducts];
    currentPage = 1;
    displayProducts(filteredProducts);
    setupPagination();
    updateProductsCount();
}

// Populate category dropdown dynamically
function populateCategoryFilter() {
    try {
        if (!categoryFilter) return;
        const list = Array.isArray(window.mockProducts) ? window.mockProducts : (Array.isArray(currentProducts) ? currentProducts : []);
        const unique = Array.from(new Set(list.map(p => p.category).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
        const currentVal = categoryFilter.value;
        categoryFilter.innerHTML = '';
        const allOpt = document.createElement('option');
        allOpt.value = 'all';
        allOpt.textContent = 'جميع التصنيفات';
        categoryFilter.appendChild(allOpt);
        unique.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            categoryFilter.appendChild(opt);
        });
        // restore value if exists, otherwise 'all'
        const newVal = unique.includes(currentVal) || currentVal === 'all' ? currentVal : 'all';
        categoryFilter.value = newVal;
    } catch {}
}

// Update products count
function updateProductsCount() {
    if (!productsCount) return;
    
    const total = filteredProducts.length;
    const start = ((currentPage - 1) * productsPerPage) + 1;
    const end = Math.min(currentPage * productsPerPage, total);
    
    productsCount.textContent = total === 0 
        ? 'لا توجد منتجات' 
        : `عرض ${start} إلى ${end} من ${total} منتج`;
}

// Setup pagination
function setupPagination() {
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `
            <button class="pagination-btn" data-page="${currentPage - 1}">
                السابق
            </button>
        `;
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `
                <button class="pagination-btn active" data-page="${i}">
                    ${i}
                </button>
            `;
        } else {
            paginationHTML += `
                <button class="pagination-btn" data-page="${i}">
                    ${i}
                </button>
            `;
        }
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `
            <button class="pagination-btn" data-page="${currentPage + 1}">
                التالي
            </button>
        `;
    }
    
    pagination.innerHTML = paginationHTML;
    
    // Add event listeners to pagination buttons
    pagination.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = parseInt(this.getAttribute('data-page'));
            if (page !== currentPage) {
                currentPage = page;
                displayProducts(filteredProducts);
                setupPagination();
                updateProductsCount();
                
                // Scroll to top of products
                productsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
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

function getStockStatus(stock) {
    if (stock > 10) return 'متوفر';
    if (stock > 0) return 'قارب على النفاد';
    return 'غير متوفر';
}

function getStockStatusClass(stock) {
    if (stock > 10) return 'in-stock';
    if (stock > 0) return 'low-stock';
    return 'out-of-stock';
}

function showNotification(message, type = 'info') {
    // Use the notification system from main.js if available
    if (window.MKApp && window.MKApp.showNotification) {
        window.MKApp.showNotification(message, type);
    } else {
        // Fallback to alert
        alert(message);
    }
}

function splitDescription(text) {
    try {
        const words = String(text).trim().split(/\s+/);
        if (words.length <= 1) return [text, ''];
        const mid = Math.ceil(words.length / 2);
        return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    } catch {
        return [text || '', ''];
    }
}

// Close the if statement from the beginning
} // This closes: if (typeof window.mockProducts === 'undefined') {
