// Admin Login JavaScript

// Mock admin credentials (will be replaced with real authentication later)
const mockAdmin = {
    username: 'admin',
    password: 'admin123'
};

// DOM Elements
const loginForm = document.getElementById('admin-login-form');
const submitBtn = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
const btnLoading = submitBtn ? submitBtn.querySelector('.btn-loading') : null;

// Initialize login page
document.addEventListener('DOMContentLoaded', function() {
    if (loginForm) {
        setupLoginForm();
        if (checkAdminAuth()) {
            window.location.href = 'dashboard.html';
            return;
        }
    }
});

// Setup login form
function setupLoginForm() {
    loginForm.addEventListener('submit', handleLogin);
    
    // Add input validation
    const inputs = loginForm.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            validateInput(this);
        });
        
        input.addEventListener('blur', function() {
            validateInput(this);
        });
    });
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const username = formData.get('username');
    const password = formData.get('password');
    const rememberMe = formData.get('remember-me') === 'on';
    
    // Validate form
    if (!validateLoginForm(username, password)) {
        return;
    }
    
    // Show loading state
    showLoadingState();
    
    try {
        const result = await performLogin(username, password);
        storeAdminAuth(result, rememberMe);
        showNotification('تم تسجيل الدخول بنجاح!', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);
    } catch (error) {
        // Show error message
        showNotification(error.message, 'error');
        hideLoadingState();
    }
}

// Validate login form
function validateLoginForm(username, password) {
    const errors = [];
    
    if (!username || username.trim().length < 3) {
        errors.push('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
    }
    
    if (!password || password.length < 6) {
        errors.push('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }
    
    if (errors.length > 0) {
        showNotification(errors.join('\n'), 'error');
        return false;
    }
    
    return true;
}

// Validate individual input
function validateInput(input) {
    const value = input.value.trim();
    const inputName = input.name;
    
    // Remove previous validation classes
    input.classList.remove('valid', 'invalid');
    
    if (inputName === 'username') {
        if (value.length >= 3) {
            input.classList.add('valid');
        } else {
            input.classList.add('invalid');
        }
    } else if (inputName === 'password') {
        if (value.length >= 6) {
            input.classList.add('valid');
        } else {
            input.classList.add('invalid');
        }
    }
}

// Real login API call
async function performLogin(username, password) {
    const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل تسجيل الدخول');
    }
    return data; // { success, token, user }
}

// Store admin authentication
function storeAdminAuth(loginResult, rememberMe) {
    const authData = {
        token: loginResult.token,
        user: loginResult.user,
        loginTime: new Date().toISOString()
    };
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('mkAdminAuth', JSON.stringify(authData));
}

// Check if admin is authenticated
function checkAdminAuth() {
    const authData = localStorage.getItem('mkAdminAuth') || sessionStorage.getItem('mkAdminAuth');
    
    if (authData) {
        try {
            const parsed = JSON.parse(authData);
            // Check if session is not expired (24 hours)
            const loginTime = new Date(parsed.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
            
            if (hoursDiff < 24 && parsed.token) {
                return parsed;
            } else {
                // Clear expired session
                localStorage.removeItem('mkAdminAuth');
                sessionStorage.removeItem('mkAdminAuth');
            }
        } catch (error) {
            console.error('Error parsing auth data:', error);
        }
    }
    
    return null;
}

// Show loading state
function showLoadingState() {
    if (submitBtn) {
        submitBtn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoading) btnLoading.style.display = 'flex';
    }
}

// Hide loading state
function hideLoadingState() {
    if (submitBtn) {
        submitBtn.disabled = false;
        if (btnText) btnText.style.display = 'block';
        if (btnLoading) btnLoading.style.display = 'none';
    }
}

// Show notification
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
        borderRadius: '8px',
        zIndex: '10000',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px',
        textAlign: 'right',
        lineHeight: '1.4'
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

// Show forgot password dialog
function showForgotPassword() {
    alert('سيتم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.\n\n(هذه ميزة تجريبية - سيتم تنفيذها لاحقاً)');
}

// Logout function
function adminLogout() {
    localStorage.removeItem('mkAdminAuth');
    sessionStorage.removeItem('mkAdminAuth');
    window.location.href = 'login.html';
}

// Export functions for use in other files
window.AdminAuth = {
    checkAdminAuth,
    getToken: function() {
        const authData = localStorage.getItem('mkAdminAuth') || sessionStorage.getItem('mkAdminAuth');
        if (!authData) return null;
        try {
            const parsed = JSON.parse(authData);
            return parsed.token || null;
        } catch { return null; }
    },
    adminLogout,
    showNotification
};
