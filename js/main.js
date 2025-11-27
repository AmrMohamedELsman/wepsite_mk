// MK Local Brand - Main JavaScript

// Mock product data (will be replaced with MongoDB data later)
const mockProducts = [
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
        image: "👔"
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
        image: "👖"
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
        image: "🧥"
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
        image: "👜"
    }
];

// DOM Elements
const featuredProductsContainer = document.getElementById('featured-products');
const categoriesGrid = document.querySelector('.categories-grid');
const contactForm = document.querySelector('.contact-form');
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    refreshProductsFromAPI().then(() => {
        renderCategories();
        loadFeaturedProducts();
    }).catch(() => {
        renderCategories();
        loadFeaturedProducts();
    });
    setupEventListeners();
    setupSmoothScrolling();
});

async function refreshProductsFromAPI() {
    try {
        const res = await fetch('/api/products?limit=200');
        const data = await res.json();
        if (!res.ok || !data.success) return;
        window.mockProducts = data.data;
    } catch (err) {
        // keep local mock
    }
}

// Load featured products
function loadFeaturedProducts() {
    if (!featuredProductsContainer) return;
    
    const list = Array.isArray(window.mockProducts) ? window.mockProducts : mockProducts;
    const featuredProducts = list.filter(product => product.featured);
    
    featuredProductsContainer.innerHTML = featuredProducts.map(product => `
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
                    <span class="product-category">${product.category || '-'}</span>
                    <span class="product-stock ${getStockStatusClass(product.stock)}">${getStockStatus(product.stock)}</span>
                </div>
                <p class="product-description clamp-1">${product.description}</p>
                <div class="product-price">
                    ${(() => { const dp = Number(product.discountPercent ?? product.discount) || 0; return dp > 0 ? `
                        <span class="price-new">${formatPrice((Number(product.price)||0) * (1 - Math.min(Math.max(dp,0),100)/100))}</span>
                        <span class="price-old">${formatPrice(product.price)}</span>
                    ` : `${formatPrice(product.price)}`; })()}
                </div>
                <button class="btn btn-primary btn-view-product" data-product-id="${product._id || product.id}">عرض التفاصيل</button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners to product cards
    document.querySelectorAll('.btn-view-product').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            viewProductDetails(productId);
        });
    });

    // تم توحيد ارتفاع حاوية الصورة عبر CSS إلى 160px
}

// View product details
function viewProductDetails(productId) {
    const list = Array.isArray(window.mockProducts) ? window.mockProducts : mockProducts;
    const product = list.find(p => (p._id || p.id) == productId);
    if (!product) return;
    const modal = createProductModal(product);
    document.body.appendChild(modal);
    setTimeout(() => { modal.classList.add('show'); }, 10);
}

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
                        ${Number(product.discountPercent) > 0 ? `
                            <span class="price-new">${formatPrice((Number(product.price)||0) * (1 - Math.min(Math.max(Number(product.discountPercent),0),100)/100))}</span>
                            <span class="price-old">${formatPrice(product.price)}</span>
                        ` : `${formatPrice(product.price)}`}
                    </div>
                    <p class="product-description two-col">${product.description || ''}</p>
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
                        <span class="product-category">${product.category || '-'}</span>
                        <span class="product-stock ${getStockStatusClass(product.stock)}">${getStockStatus(product.stock)}</span>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary btn-add-to-cart" data-product-id="${product._id || product.id}">اطلب الآن</button>
                        <button class="btn btn-outline" onclick="closeProductModal()">إغلاق</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => {
        const mainImg = modal.querySelector('#modal-main-image');
        modal.querySelectorAll('.thumb-image').forEach(img => {
            img.addEventListener('click', function() {
                const src = this.getAttribute('src');
                if (mainImg) mainImg.setAttribute('src', src);
                modal.querySelectorAll('.thumb-image').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            });
        });
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
        const orderBtn = modal.querySelector('.btn-add-to-cart');
        if (orderBtn) {
            orderBtn.addEventListener('click', function() {
                openOrderModal(product);
            });
        }
    }, 50);
    return modal;
}

function closeProductModal() {
    const modal = document.querySelector('.product-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => { document.body.removeChild(modal); }, 300);
    }
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

function getStockStatus(stock) {
    if (Number(stock) > 10) return 'متوفر';
    if (Number(stock) > 0) return 'قارب على النفاد';
    return 'غير متوفر';
}

function getStockStatusClass(stock) {
    if (Number(stock) > 10) return 'in-stock';
    if (Number(stock) > 0) return 'low-stock';
    return 'out-of-stock';
}

// Setup event listeners
function setupEventListeners() {
    
    // Contact form submission
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }
    
    // Mobile menu toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Navigation link clicks
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
}

// Filter products by category
function filterProductsByCategory(category) {
    window.location.href = `products.html?category=${encodeURIComponent(category)}`;
}

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

function renderCategories() {
    if (!categoriesGrid) return;
    const list = Array.isArray(window.mockProducts) ? window.mockProducts : mockProducts;
    const unique = Array.from(new Set(list.map(p => p.category))).filter(Boolean);
    if (unique.length === 0) return;
    categoriesGrid.innerHTML = unique.map(cat => `
        <div class="category-card" data-category="${cat}">
            <div class="category-icon">${getCategoryIcon(cat)}</div>
            <h3>${cat}</h3>
            <p>عرض منتجات تصنيف ${cat}</p>
        </div>
    `).join('');
    categoriesGrid.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            filterProductsByCategory(category);
        });
    });
}

// Handle contact form submission
function handleContactForm(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const name = this.querySelector('input[type="text"]').value;
    const email = this.querySelector('input[type="email"]').value;
    const message = this.querySelector('textarea').value;
    
    // Basic validation
    if (!name || !email || !message) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('يرجى إدخال بريد إلكتروني صحيح');
        return;
    }
    
    // Simulate form submission
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'جاري الإرسال...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        alert('تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.');
        this.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }, 2000);
}

// Toggle mobile menu
function toggleMobileMenu() {
    navMenu.classList.toggle('active');
    this.classList.toggle('active');
}

// Setup smooth scrolling
function setupSmoothScrolling() {
    // Add smooth scrolling for all internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
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

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '5px',
        zIndex: '10000',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// API Functions (will be implemented with backend)
async function fetchProducts() {
    try {
        // This will be replaced with actual API call
        // const response = await fetch('/api/products');
        // const data = await response.json();
        // return data;
        
        // For now, return mock data
        return mockProducts;
    } catch (error) {
        console.error('Error fetching products:', error);
        showNotification('حدث خطأ في تحميل المنتجات', 'error');
        return [];
    }
}

async function fetchProductById(id) {
    try {
        // This will be replaced with actual API call
        // const response = await fetch(`/api/product/${id}`);
        // const data = await response.json();
        // return data;
        
        // For now, return mock data
        return mockProducts.find(product => product.id == id);
    } catch (error) {
        console.error('Error fetching product:', error);
        showNotification('حدث خطأ في تحميل تفاصيل المنتج', 'error');
        return null;
    }
}

// Export functions for use in other files
window.MKApp = {
    fetchProducts,
    fetchProductById,
    formatPrice,
    getStockStatus,
    showNotification
};
