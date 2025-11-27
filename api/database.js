// Simple file-based database for MK Local Brand (temporary solution until MongoDB is properly configured)

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files if they don't exist
function initializeFiles() {
    if (!fs.existsSync(PRODUCTS_FILE)) {
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(ADMINS_FILE)) {
        fs.writeFileSync(ADMINS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(ORDERS_FILE)) {
        fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(SETTINGS_FILE)) {
        const defaultSettings = {
            store: {
                name: 'MK Local Brand',
                description: 'متجر ملابس محلي متخصص في تقديم أحدث صيحات الموضة بجودة عالية',
                phone: '',
                email: '',
                address: ''
            },
            orders: {
                prefix: 'ORD-',
                minAmount: 0,
                deliveryFee: 0,
                autoConfirm: false
            },
            notifications: {
                newOrder: true,
                lowStock: true,
                email: false
            },
            appearance: {
                darkMode: false,
                fontSize: 'medium',
                language: 'ar'
            },
            storage: {
                quotaMB: null
            }
        };
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
    }
}

// Initialize default admin
function initializeDefaultAdmin() {
    const admins = readData(ADMINS_FILE);
    if (admins.length === 0) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        
        const defaultAdmin = {
            _id: 'admin-001',
            username: 'admin',
            password: hashedPassword,
            email: 'admin@mk-local.com',
            role: 'super_admin',
            createdAt: new Date().toISOString()
        };
        
        admins.push(defaultAdmin);
        writeData(ADMINS_FILE, admins);
        console.log('✅ Default admin user created (admin/admin123)');
    }
}

// Read data from file
function readData(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return [];
    }
}

// Write data to file
function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
        return false;
    }
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Products CRUD operations
const Products = {
    findAll: (filter = {}) => {
        const products = readData(PRODUCTS_FILE);
        return products.filter(product => {
            if (filter.category && product.category !== filter.category) return false;
            if (filter.featured && product.featured !== filter.featured) return false;
            return true;
        });
    },
    
    findById: (id) => {
        const products = readData(PRODUCTS_FILE);
        return products.find(product => product._id === id);
    },
    
    create: (productData) => {
        const products = readData(PRODUCTS_FILE);
        const newProduct = {
            _id: generateId(),
            ...productData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        products.push(newProduct);
        writeData(PRODUCTS_FILE, products);
        return newProduct;
    },
    
    update: (id, productData) => {
        const products = readData(PRODUCTS_FILE);
        const index = products.findIndex(product => product._id === id);
        
        if (index === -1) return null;
        
        products[index] = {
            ...products[index],
            ...productData,
            updatedAt: new Date().toISOString()
        };
        
        writeData(PRODUCTS_FILE, products);
        return products[index];
    },
    
    delete: (id) => {
        const products = readData(PRODUCTS_FILE);
        const index = products.findIndex(product => product._id === id);
        
        if (index === -1) return false;
        
        products.splice(index, 1);
        writeData(PRODUCTS_FILE, products);
        return true;
    },
    
    countDocuments: (filter = {}) => {
        const products = readData(PRODUCTS_FILE);
        return products.filter(product => {
            if (filter.category && product.category !== filter.category) return false;
            if (filter.featured && product.featured !== filter.featured) return false;
            if (filter.stock && product.stock < filter.stock) return false;
            return true;
        }).length;
    }
};

// Admins CRUD operations
const Admins = {
    findOne: (filter) => {
        const admins = readData(ADMINS_FILE);
        return admins.find(admin => {
            if (filter.username && admin.username !== filter.username) return false;
            if (filter.email && admin.email !== filter.email) return false;
            return true;
        });
    },
    
    create: (adminData) => {
        const admins = readData(ADMINS_FILE);
        const newAdmin = {
            _id: generateId(),
            ...adminData,
            createdAt: new Date().toISOString()
        };
        admins.push(newAdmin);
        writeData(ADMINS_FILE, admins);
        return newAdmin;
    },
    update: (id, updates) => {
        const admins = readData(ADMINS_FILE);
        const idx = admins.findIndex(a => a._id === id || a.username === id);
        if (idx === -1) return null;
        admins[idx] = { ...admins[idx], ...updates };
        writeData(ADMINS_FILE, admins);
        return admins[idx];
    }
};

// Orders CRUD operations
const Orders = {
    findAll: (filter = {}) => {
        const orders = readData(ORDERS_FILE);
        return orders.filter(order => {
            if (filter.status && order.status !== filter.status) return false;
            return true;
        });
    },
    
    findById: (id) => {
        const orders = readData(ORDERS_FILE);
        return orders.find(order => order._id === id);
    },
    
    create: (orderData) => {
        const orders = readData(ORDERS_FILE);
        const newOrder = {
            _id: generateId(),
            ...orderData,
            orderDate: new Date().toISOString()
        };
        orders.push(newOrder);
        writeData(ORDERS_FILE, orders);
        return newOrder;
    },
    
    update: (id, orderData) => {
        const orders = readData(ORDERS_FILE);
        const index = orders.findIndex(order => order._id === id);
        
        if (index === -1) return null;
        
        orders[index] = {
            ...orders[index],
            ...orderData
        };
        
        writeData(ORDERS_FILE, orders);
        return orders[index];
    },
    delete: (id) => {
        const orders = readData(ORDERS_FILE);
        const idx = orders.findIndex(order => order._id === id);
        if (idx === -1) return false;
        orders.splice(idx, 1);
        writeData(ORDERS_FILE, orders);
        return true;
    },
    
    countDocuments: (filter = {}) => {
        const orders = readData(ORDERS_FILE);
        return orders.filter(order => {
            if (filter.status && order.status !== filter.status) return false;
            return true;
        }).length;
    }
};

// Initialize the database
initializeFiles();
initializeDefaultAdmin();

// Add some sample products
function initializeSampleProducts() {
    const products = readData(PRODUCTS_FILE);
    if (products.length === 0) {
        const sampleProducts = [
            {
                _id: 'prod-001',
                name: 'قميص MK كلاسيكي',
                description: 'قميص قطني عالي الجودة بتصميم كلاسيكي أنيق',
                price: 89.99,
                images: ['/images/classic-shirt.jpg'],
                category: 'قمصان',
                stock: 25,
                sizes: ['S', 'M', 'L', 'XL'],
                colors: ['أبيض', 'أسود', 'رمادي'],
                featured: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                _id: 'prod-002',
                name: 'بنطال MK رياضي',
                description: 'بنطال رياضي مريح بتصميم عصري وعملي',
                price: 129.99,
                images: ['/images/sports-pants.jpg'],
                category: 'بناطيل',
                stock: 15,
                sizes: ['M', 'L', 'XL'],
                colors: ['أسود', 'كحلي'],
                featured: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                _id: 'prod-003',
                name: 'جاكيت MK شتوي',
                description: 'جاكيت شتوي دافئ بجودة ممتازة',
                price: 199.99,
                images: ['/images/winter-jacket.jpg'],
                category: 'جاكيتات',
                stock: 10,
                sizes: ['S', 'M', 'L', 'XL', 'XXL'],
                colors: ['أسود', 'بني', 'كحلي'],
                featured: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        
        writeData(PRODUCTS_FILE, sampleProducts);
        console.log('✅ Sample products added');
    }
}

initializeSampleProducts();

// Database class to provide unified interface
class Database {
    constructor() {
        initializeFiles();
        initializeDefaultAdmin();
        initializeSampleProducts();
    }

    // Product methods
    async getProducts(category = null, featured = null, limit = 20) {
        let products = Products.findAll({});
        
        if (category) {
            products = products.filter(p => p.category === category);
        }
        
        if (featured) {
            products = products.filter(p => p.featured === featured);
        }
        
        return products.slice(0, limit);
    }

    async getProductById(id) {
        return Products.findById(id);
    }

    async createProduct(productData) {
        return Products.create(productData);
    }

    async updateProduct(id, productData) {
        return Products.update(id, productData);
    }

    async deleteProduct(id) {
        return Products.delete(id);
    }

    // Admin methods
    async getAdminByUsername(username) {
        return Admins.findOne({ username });
    }
    
    async createAdmin(adminData) {
        return Admins.create(adminData);
    }

    async updateAdmin(idOrUsername, updates) {
        return Admins.update(idOrUsername, updates);
    }

    // Order methods
    async getOrders(status = null, limit = 50) {
        let orders = Orders.findAll({});
        
        if (status) {
            orders = orders.filter(o => o.status === status);
        }
        
        return orders.slice(0, limit);
    }

    async createOrder(orderData) {
        return Orders.create(orderData);
    }

    async updateOrder(id, orderData) {
        return Orders.update(id, orderData);
    }

    async deleteOrder(id) {
        return Orders.delete(id);
    }

    // Dashboard stats
    async getDashboardStats() {
        const products = Products.findAll({});
        const orders = Orders.findAll({});
        
        const totalProducts = products.length;
        const totalOrders = orders.length;
        const lowStock = products.filter(p => p.stock < 15).length;
        
        // Calculate monthly revenue (simplified)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyOrders = orders.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        });
        
        const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        
        return {
            totalProducts,
            totalOrders,
            lowStock,
            monthlyRevenue
        };
    }

    // Settings
    async getSettings() {
        return readData(SETTINGS_FILE);
    }

    async updateSettings(newSettings) {
        const current = readData(SETTINGS_FILE);
        const merged = {
            ...current,
            ...newSettings,
            store: { ...current.store, ...(newSettings.store || {}) },
            orders: { ...current.orders, ...(newSettings.orders || {}) },
            notifications: { ...current.notifications, ...(newSettings.notifications || {}) },
            appearance: { ...current.appearance, ...(newSettings.appearance || {}) },
            storage: { ...current.storage, ...(newSettings.storage || {}) }
        };
        writeData(SETTINGS_FILE, merged);
        return merged;
    }
}

module.exports = Database;
