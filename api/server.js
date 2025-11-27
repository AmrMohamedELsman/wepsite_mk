// Backend server for MK Local Brand
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// MongoDB connection with error handling
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mk-local-brand:mk-local-brand@mk-local-brand.rtq1nys.mongodb.net/mk-local-brand?retryWrites=true&w=majority&appName=mk-local-brand';

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ Connected to MongoDB successfully'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('💡 Switching to file-based database as fallback...');
    // The server will continue running with file-based database
});

// Schemas
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    discountPercent: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    images: [{
        type: String,
        required: true
    }],
    category: {
        type: String,
        required: true,
        trim: true
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    sizes: [{
        type: String,
        enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    }],
    colors: [{
        type: String,
        required: true
    }],
    featured: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    role: {
        type: String,
        enum: ['super_admin', 'admin'],
        default: 'admin'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const orderSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    orderCode: {
        type: String
    },
    productName: {
        type: String
    },
    productPrice: {
        type: Number
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    customerName: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    totalAmount: {
        type: Number,
        required: true
    },
    orderDate: {
        type: Date,
        default: Date.now
    }
});

// Models
const Product = mongoose.model('Product', productSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Order = mongoose.model('Order', orderSchema);

// Database connection status
let isMongoConnected = false;

mongoose.connection.on('connected', () => {
    isMongoConnected = true;
    console.log('🎯 MongoDB is connected and ready');
});

mongoose.connection.on('error', (err) => {
    isMongoConnected = false;
    console.log('❌ MongoDB connection lost, using file-based database');
});

mongoose.connection.on('disconnected', () => {
    isMongoConnected = false;
    console.log('📂 MongoDB disconnected, switching to file-based database');
});

// Import file-based database as fallback
const FileDatabase = require('./database');
const fileDb = new FileDatabase();

// Uploads configuration
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
        cb(null, `${Date.now()}-${base}${ext}`);
    }
});

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid image type'));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadProducts = upload.array('images', 6);

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Routes

// Public Routes - Products
app.get('/api/products', async (req, res) => {
    try {
        const { category, featured, limit = 20 } = req.query;
        let products;
        
        if (isMongoConnected) {
            const filter = {};
            if (category) filter.category = category;
            if (featured === 'true') filter.featured = true;
            
            products = await Product.find(filter)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });
        } else {
            products = await fileDb.getProducts(category, featured === 'true', parseInt(limit));
        }
        
        res.json({
            success: true,
            data: products,
            count: products.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
});

app.get('/api/product/:id', async (req, res) => {
    try {
        let product;
        
        if (isMongoConnected) {
            product = await Product.findById(req.params.id);
        } else {
            product = await fileDb.getProductById(req.params.id);
        }
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching product',
            error: error.message
        });
    }
});

// Admin Authentication Routes
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        let admin;
        
        if (isMongoConnected) {
            admin = await Admin.findOne({ username });
        } else {
            admin = await fileDb.getAdminByUsername(username);
        }
        
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, admin.password);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                id: admin._id || admin.id, 
                username: admin.username, 
                role: admin.role 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            message: 'Login successful',
            user: {
                id: admin._id || admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

// Protected Admin Routes
app.post('/api/admin/products', authenticateToken, uploadProducts, async (req, res) => {
    try {
        const body = req.body || {};
        const imagePaths = Array.isArray(req.files) ? req.files.map(f => `/uploads/products/${f.filename}`) : [];
        const dpRaw = body.discountPercent != null ? body.discountPercent : body.discount;
        const dpNum = Number(dpRaw);
        const discountPercent = Number.isFinite(dpNum) ? Math.max(0, Math.min(100, dpNum)) : 0;
        const productData = {
            name: body.name,
            description: body.description,
            price: body.price ? Number(body.price) : 0,
            images: imagePaths.length ? imagePaths : (Array.isArray(body.images) ? body.images : []),
            category: body.category,
            stock: body.stock ? Number(body.stock) : 0,
            sizes: body.sizes ? (Array.isArray(body.sizes) ? body.sizes : String(body.sizes).split(',').map(s => s.trim()).filter(Boolean)) : [],
            colors: body.colors ? (Array.isArray(body.colors) ? body.colors : String(body.colors).split(',').map(c => c.trim()).filter(Boolean)) : [],
            featured: body.featured === 'on' || body.featured === true,
            discountPercent,
            updatedAt: new Date()
        };

        if (!productData.name || !productData.description || !productData.category) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        if (!productData.images || productData.images.length === 0) {
            return res.status(400).json({ success: false, message: 'Product image is required' });
        }

        let product;
        if (isMongoConnected) {
            product = new Product(productData);
            await product.save();
        } else {
            product = await fileDb.createProduct(productData);
        }

        res.json({ success: true, data: product, message: 'Product created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating product', error: error.message });
    }
});

app.put('/api/admin/products/:id', authenticateToken, uploadProducts, async (req, res) => {
    try {
        const body = req.body || {};
        const imagePaths = Array.isArray(req.files) ? req.files.map(f => `/uploads/products/${f.filename}`) : [];
        const dpRaw = body.discountPercent != null ? body.discountPercent : body.discount;
        const dpNum = Number(dpRaw);
        const productData = {
            name: body.name,
            description: body.description,
            price: body.price ? Number(body.price) : undefined,
            category: body.category,
            stock: body.stock ? Number(body.stock) : undefined,
            sizes: body.sizes ? (Array.isArray(body.sizes) ? body.sizes : String(body.sizes).split(',').map(s => s.trim()).filter(Boolean)) : undefined,
            colors: body.colors ? (Array.isArray(body.colors) ? body.colors : String(body.colors).split(',').map(c => c.trim()).filter(Boolean)) : undefined,
            featured: typeof body.featured !== 'undefined' ? (body.featured === 'on' || body.featured === 'true' || body.featured === true) : undefined,
            updatedAt: new Date()
        };
        if (imagePaths.length) {
            productData.images = imagePaths;
        }
        if (Number.isFinite(dpNum)) {
            productData.discountPercent = Math.max(0, Math.min(100, dpNum));
        }

        Object.keys(productData).forEach(k => productData[k] === undefined && delete productData[k]);

        let product;
        if (isMongoConnected) {
            product = await Product.findByIdAndUpdate(req.params.id, productData, { new: true });
        } else {
            product = await fileDb.updateProduct(req.params.id, productData);
        }

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, data: product, message: 'Product updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating product', error: error.message });
    }
});

// Public order creation (customer-facing)
app.post('/api/orders', async (req, res) => {
    try {
        const { productId, quantity, customerName, customerPhone, customerEmail, notes } = req.body || {};
        if (!productId || !quantity || !customerName || !customerPhone) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const qty = Number(quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid quantity' });
        }
        // Load settings (file-based)
        let settings;
        try {
            settings = await fileDb.getSettings();
        } catch {
            settings = { orders: { prefix: 'ORD-', minAmount: 0, deliveryFee: 0 } };
        }
        const prefix = (settings.orders && settings.orders.prefix) || 'ORD-';
        const minAmount = Number((settings.orders && settings.orders.minAmount) || 0);
        const deliveryFee = Number((settings.orders && settings.orders.deliveryFee) || 0);
        let product;
        if (isMongoConnected) {
            product = await Product.findById(productId);
        } else {
            product = await fileDb.getProductById(productId);
        }
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        const price = Number(product.price) || 0;
        const dp = Number(product.discountPercent) || 0;
        const effectivePrice = price * (1 - Math.min(Math.max(dp, 0), 100) / 100);
        const baseAmount = effectivePrice * qty;
        const totalAmount = baseAmount + (Number.isFinite(deliveryFee) ? deliveryFee : 0);
        if (Number.isFinite(minAmount) && baseAmount < minAmount) {
            return res.status(400).json({ success: false, message: `الحد الأدنى للطلب هو ${minAmount} ر.س` });
        }
        const shortCode = Math.floor(Date.now() % 1e8).toString(36).toUpperCase();
        const orderCode = `${prefix}${shortCode}`;
        let order;
        if (isMongoConnected) {
            order = new Order({
                productId: product._id,
                orderCode,
                productName: product.name,
                productPrice: product.price,
                quantity: qty,
                customerName,
                customerPhone,
                customerEmail,
                status: 'pending',
                totalAmount
            });
            await order.save();
        } else {
            order = await fileDb.createOrder({
                productId: product._id || product.id,
                orderCode,
                productName: product.name,
                productPrice: product.price,
                quantity: qty,
                customerName,
                customerPhone,
                customerEmail,
                status: 'pending',
                totalAmount
            });
        }
        res.json({ success: true, message: 'Order created', data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating order', error: error.message });
    }
});

// Admin settings routes
app.get('/api/admin/settings', authenticateToken, async (req, res) => {
    try {
        const settings = await fileDb.getSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching settings', error: error.message });
    }
});

app.put('/api/admin/settings', authenticateToken, async (req, res) => {
    try {
        const updated = await fileDb.updateSettings(req.body || {});
        res.json({ success: true, data: updated, message: 'Settings updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating settings', error: error.message });
    }
});

// Change admin password
app.post('/api/admin/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Invalid password data' });
        }
        let admin;
        if (isMongoConnected) {
            admin = await Admin.findById(req.user.id);
        } else {
            admin = await fileDb.getAdminByUsername(req.user.username);
        }
        if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
        const ok = await bcrypt.compare(currentPassword, admin.password);
        if (!ok) return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
        const hashed = await bcrypt.hash(newPassword, 10);
        if (isMongoConnected) {
            await Admin.findByIdAndUpdate(admin._id, { password: hashed });
        } else {
            await fileDb.updateAdmin(admin._id || admin.username, { password: hashed });
        }
        res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error changing password', error: error.message });
    }
});

// Storage usage (MongoDB or file-based)
app.get('/api/admin/storage', authenticateToken, async (req, res) => {
    try {
        let usedBytes = 0;
        let mode = 'file';
        let details = {};
        if (isMongoConnected && mongoose.connection && mongoose.connection.db) {
            const stats = await mongoose.connection.db.stats();
            // MongoDB stats fields are in bytes
            usedBytes = (stats.storageSize || 0);
            mode = 'mongo';
            details = {
                db: mongoose.connection.name,
                collections: stats.collections,
                dataSize: stats.dataSize || 0,
                storageSize: stats.storageSize || 0,
                indexSize: stats.indexSize || 0
            };
        } else {
            // Sum uploads and data directories
            const root = path.join(__dirname, '..');
            const dirs = [path.join(root, 'uploads'), path.join(__dirname, 'data')];
            const getDirSize = (dirPath) => {
                let total = 0;
                if (!fs.existsSync(dirPath)) return 0;
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                for (const e of entries) {
                    const p = path.join(dirPath, e.name);
                    if (e.isDirectory()) total += getDirSize(p);
                    else {
                        try { total += fs.statSync(p).size; } catch { }
                    }
                }
                return total;
            };
            usedBytes = dirs.reduce((sum, d) => sum + getDirSize(d), 0);
            details = { directories: dirs };
        }
        let settings;
        try { settings = await fileDb.getSettings(); } catch { settings = {}; }
        const quotaMB = settings.storage && settings.storage.quotaMB;
        res.json({ success: true, data: {
            mode,
            usedBytes,
            usedMB: +(usedBytes / (1024 * 1024)).toFixed(2),
            quotaMB: quotaMB != null ? Number(quotaMB) : null,
            details
        }});
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching storage stats', error: error.message });
    }
});

app.delete('/api/admin/products/:id', authenticateToken, async (req, res) => {
    try {
        let success;
        if (isMongoConnected) {
            const product = await Product.findByIdAndDelete(req.params.id);
            success = !!product;
        } else {
            success = await fileDb.deleteProduct(req.params.id);
        }
        
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting product',
            error: error.message
        });
    }
});

// Orders Routes
app.get('/api/admin/orders', authenticateToken, async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;
        let orders;
        
        if (isMongoConnected) {
            const filter = {};
            if (status) filter.status = status;
            
            orders = await Order.find(filter)
                .populate('productId', 'name price')
                .limit(parseInt(limit))
                .sort({ orderDate: -1 });
        } else {
            orders = await fileDb.getOrders(status, parseInt(limit));
        }
        
        res.json({
            success: true,
            data: orders,
            count: orders.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
    }
});

app.post('/api/admin/orders', authenticateToken, async (req, res) => {
    try {
        const orderData = req.body;
        let order;
        
        if (isMongoConnected) {
            order = new Order(orderData);
            await order.save();
        } else {
            order = await fileDb.createOrder(orderData);
        }
        
        res.json({
            success: true,
            data: order,
            message: 'Order created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: error.message
        });
    }
});

app.put('/api/admin/orders/:id', authenticateToken, async (req, res) => {
    try {
        let order;
        
        if (isMongoConnected) {
            order = await Order.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true }
            ).populate('productId', 'name price');
        } else {
            order = await fileDb.updateOrder(req.params.id, req.body);
        }
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        res.json({
            success: true,
            data: order,
            message: 'Order updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating order',
            error: error.message
        });
    }
});

// Delete order
app.delete('/api/admin/orders/:id', authenticateToken, async (req, res) => {
    try {
        let success;
        if (isMongoConnected) {
            const result = await Order.findByIdAndDelete(req.params.id);
            success = !!result;
        } else {
            success = await fileDb.deleteOrder(req.params.id);
        }
        if (!success) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting order', error: error.message });
    }
});

// Dashboard Stats
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
    try {
        let stats;
        
        if (isMongoConnected) {
            const totalProducts = await Product.countDocuments();
            const totalOrders = await Order.countDocuments();
            const lowStockProducts = await Product.countDocuments({ stock: { $lt: 15 } });
            
            // Calculate monthly revenue
            const monthlyRevenue = await Order.aggregate([
                {
                    $match: {
                        orderDate: {
                            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' }
                    }
                }
            ]);
            
            const revenue = monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0;
            
            stats = {
                totalProducts,
                totalOrders,
                lowStock: lowStockProducts,
                monthlyRevenue: revenue
            };
        } else {
            stats = await fileDb.getDashboardStats();
        }
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data',
            error: error.message
        });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/products.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'products.html'));
});

app.get('/admin/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin', 'login.html'));
});

app.get('/admin/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin', 'dashboard.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Initialize default admin user
async function initializeDefaultAdmin() {
    try {
        let existingAdmin;
        
        if (isMongoConnected) {
            existingAdmin = await Admin.findOne({ username: 'admin' });
        } else {
            existingAdmin = await fileDb.getAdminByUsername('admin');
        }
        
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            if (isMongoConnected) {
                const defaultAdmin = new Admin({
                    username: 'admin',
                    password: hashedPassword,
                    email: 'admin@mk-local.com',
                    role: 'super_admin'
                });
                await defaultAdmin.save();
            } else {
                await fileDb.createAdmin({
                    username: 'admin',
                    password: hashedPassword,
                    email: 'admin@mk-local.com',
                    role: 'super_admin'
                });
            }
            
            console.log('✅ Default admin user created (admin/admin123)');
        }
    } catch (error) {
        console.error('❌ Error creating default admin:', error);
    }
}

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    await initializeDefaultAdmin();
});

module.exports = { app, Product, Admin, Order, fileDb };
