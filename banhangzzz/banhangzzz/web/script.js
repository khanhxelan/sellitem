/**
 * script.js - Core Logic for Du ký Urban Oasis
 * Vanilla JavaScript implementation for an E-commerce application.
 */

// --- DATA ---
const PRODUCTS = [];

const NEWS = [];

const STAFF_INITIAL = [
    { id: 101, name: 'Nguyễn Văn A', phone: '0987654321', shift: '08:00 - 17:00', position: 'Quản lý', salary: 15000000 },
    { id: 102, name: 'Trần Thị B', phone: '0123456789', shift: '13:00 - 22:00', position: 'Pha chế', salary: 8000000 },
];

// --- APP STATE ---
let state = {
    currentPage: 'home',
    currentUser: JSON.parse(localStorage.getItem('currentUser')) || null,
    cart: JSON.parse(localStorage.getItem('cart')) || [],
    products: (JSON.parse(localStorage.getItem('products')) || PRODUCTS).map(p => {
        let t = p.type;
        if (t === 'Normal') t = 'Đồ ăn';
        if (t === 'Drink') t = 'Đồ uống';
        return { 
            ...p, 
            type: t, 
            featured: p.featured === undefined ? false : p.featured 
        };
    }),
    news: JSON.parse(localStorage.getItem('news')) || NEWS,
    staff: (JSON.parse(localStorage.getItem('staff')) || STAFF_INITIAL).map(s => {
        // Migration for old shift formats
        if (s.shift === 'Sáng') s.shift = '07:30 - 12:00';
        else if (s.shift === 'Chiều') s.shift = '12:00 - 17:30';
        else if (s.shift === 'Tối') s.shift = '17:30 - 22:30';
        else if (s.shift === 'Linh hoạt') s.shift = '08:00 - 17:00';
        return s;
    }),
    users: JSON.parse(localStorage.getItem('users')) || [{ username: 'admin', password: '123', role: 'admin' }],
    orders: (JSON.parse(localStorage.getItem('orders')) || []).map(o => ({ 
        ...o, 
        status: o.status === 'Processing' ? 'Đang giao hàng' : (o.status === 'Completed' ? 'Đã giao hàng' : o.status) 
    })),
    searchQuery: '',
    filterType: 'All',
    feedbacks: JSON.parse(localStorage.getItem('feedbacks')) || []
};

// Initial setup for localStorage if empty
if (!localStorage.getItem('products')) localStorage.setItem('products', JSON.stringify(state.products));
if (!localStorage.getItem('news')) localStorage.setItem('news', JSON.stringify(state.news));
if (!localStorage.getItem('users')) localStorage.setItem('users', JSON.stringify(state.users));

// --- SELECTORS ---
const appContainer = document.getElementById('app-container');
const logo = document.getElementById('logo');
const navLinksContainer = document.getElementById('nav-links');
const searchInput = document.getElementById('search-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const usernameDisplay = document.getElementById('username-display');
const floatingCartBtn = document.getElementById('floating-cart-btn');
const cartCountDisplay = document.getElementById('cart-count-display');
const modalContainer = document.getElementById('modal-container');
const modalBody = document.getElementById('modal-body');
const closeModal = document.getElementById('close-modal');

// --- UTILS ---
const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const saveState = () => {
    try {
        localStorage.setItem('cart', JSON.stringify(state.cart));
        localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
        localStorage.setItem('products', JSON.stringify(state.products));
        localStorage.setItem('news', JSON.stringify(state.news));
        localStorage.setItem('staff', JSON.stringify(state.staff));
        localStorage.setItem('feedbacks', JSON.stringify(state.feedbacks));
        localStorage.setItem('users', JSON.stringify(state.users));
        localStorage.setItem('orders', JSON.stringify(state.orders));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            // Auto-prune orders if full
            if (state.orders.length > 10) {
                state.orders = state.orders.slice(-10); // Keep only last 10 orders to recover
                saveState();
                alert('Bộ nhớ đã đầy! Hệ thống đã tự động dọn dẹp các đơn hàng rất cũ để giải phóng không gian.');
            } else {
                alert('Bộ nhớ trình duyệt đã đầy! Một số dữ liệu có thể không được lưu. Vui lòng xóa bớt nội dung không cần thiết.');
            }
            console.error('Storage quota exceeded', e);
        }
    }
};

const updateUI = () => {
    // Update Nav
    if (state.currentUser) {
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        usernameDisplay.textContent = state.currentUser.username;
        // Initials for avatar
        const initials = state.currentUser.username.substring(0, 2).toUpperCase();
        document.getElementById('avatar-initials').textContent = initials;
        document.getElementById('user-role').textContent = state.currentUser.role === 'admin' ? 'Quản trị viên' : 'Thành viên';
    } else {
        loginBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
    }

    // Update Nav Links
    const links = [
        { id: 'home', text: 'Cửa hàng', icon: 'storefront' },
        { id: 'products', text: 'Sản phẩm', icon: 'grid_view' },
        { id: 'news', text: 'Tin tức', icon: 'feed' },
        { id: 'cart', text: 'Giỏ hàng', icon: 'shopping_cart' },
        { id: 'contact', text: 'Liên hệ', icon: 'contact_support' }
    ];

    if (state.currentUser && state.currentUser.role === 'admin') {
        links.splice(4, 0, { id: 'admin', text: 'Quản trị', icon: 'dashboard' });
    }
    
    if (state.currentUser) {
        links.splice(4, 0, { id: 'orders', text: 'Đơn hàng', icon: 'receipt_long' });
    }

    navLinksContainer.innerHTML = links.map(link => `
        <a class="nav-item flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all ${state.currentPage === link.id ? 'bg-white/10 text-white border-l-4 border-accent' : 'text-gray-400 hover:bg-white/5 hover:text-white'}" data-page="${link.id}" href="#">
            <span class="material-symbols-outlined text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500 text-lg">${link.icon}</span>
            ${link.text}
        </a>
    `).join('');

    // Re-attach listeners after innerHTML change
    navLinksContainer.querySelectorAll('.nav-item').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigate(page);
        };
    });

    // Update Cart Count
    const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountDisplayHeader = document.getElementById('cart-count-display-header');
    if (cartCountDisplayHeader) cartCountDisplayHeader.textContent = count;
    if (cartCountDisplay) cartCountDisplay.textContent = count;
};

const showModal = (content) => {
    modalBody.innerHTML = content;
    modalContainer.classList.remove('invisible', 'opacity-0');
};

const hideModal = () => {
    modalContainer.classList.add('invisible', 'opacity-0');
};

// --- MOBILE SIDEBAR LOGIC ---
const toggleSidebar = (show) => {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !sidebarOverlay) return;

    if (show) {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
        setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10);
    } else {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('opacity-0');
        setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
    }
};

// --- NAVIGATION ---
const navigate = (page) => {
    toggleSidebar(false);
    state.currentPage = page;
    updateUI();
    renderPage();
    window.scrollTo(0, 0);
};

// --- CART LOGIC ---
const addToCart = (productId) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = state.cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        state.cart.push({ id: productId, quantity: 1 });
    }
    saveState();
    updateUI();
};

const removeFromCart = (productId) => {
    state.cart = state.cart.filter(item => item.id !== productId);
    saveState();
    updateUI();
    renderPage();
};

const updateCartQuantity = (productId, delta) => {
    const item = state.cart.find(i => i.id === productId);
    if (!item) return;

    if (item.quantity + delta > 0) {
        item.quantity += delta;
    } else {
        removeFromCart(productId);
    }
    saveState();
    updateUI();
    renderPage();
};

// --- RENDER FUNCTIONS ---
const renderPage = () => {
    switch (state.currentPage) {
        case 'home': renderHome(); break;
        case 'products': renderProducts(); break;
        case 'news': renderNews(); break;
        case 'cart': renderCart(); break;
        case 'admin': renderAdmin(); break;
        case 'checkout': renderCheckout(); break;
        case 'contact': renderContact(); break;
        case 'orders': renderOrders(); break;
        default: renderHome();
    }
};

const renderHome = () => {
    appContainer.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-bold text-text-main">Sản phẩm nổi bật</h2>
            <button onclick="navigate('products')" class="text-xs font-bold text-accent hover:underline flex items-center">
                Tất cả sản phẩm <span class="material-symbols-outlined text-sm ml-1">arrow_forward</span>
            </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${state.products.filter(p => p.featured).slice(0, 8).map(product => `
                <div class="group bg-white rounded-xl border border-border-color overflow-hidden hover:shadow-lg transition-all flex flex-col">
                    <div class="relative h-48 bg-bg-main flex items-center justify-center overflow-hidden">
                        <img src="${product.image}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="${product.name}">
                        <div class="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors"></div>
                        <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="addToCart(${product.id})" class="bg-white text-accent p-2 rounded-lg shadow-md hover:scale-110 active:scale-95 transition-all">
                                <span class="material-symbols-outlined text-sm">add_shopping_cart</span>
                            </button>
                        </div>
                    </div>
                    <div class="p-4 flex flex-col flex-grow">
                        <span class="inline-block px-2 py-0.5 rounded bg-accent/10 text-accent text-[9px] font-bold uppercase tracking-widest mb-2 w-max">${product.type}</span>
                        <h3 class="font-bold text-sm text-text-main mb-1 truncate">${product.name}</h3>
                        <div class="mt-auto pt-2 flex justify-between items-center">
                            <span class="text-sm font-extrabold text-accent">${formatPrice(product.price)}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
};

const renderProducts = () => {
    const filtered = state.products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(state.searchQuery.toLowerCase());
        const matchesFilter = state.filterType === 'All' || p.type === state.filterType;
        return matchesSearch && matchesFilter;
    });

    appContainer.innerHTML = `
        <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div>
                <h1 class="text-2xl font-bold text-text-main mb-4">Danh sách sản phẩm</h1>
                <div class="flex space-x-2">
                    ${['All', 'Đồ ăn', 'Đồ uống'].map(type => `
                        <button onclick="state.filterType='${type}'; renderProducts();" 
                            class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${state.filterType === type ? 'bg-accent text-white shadow-md' : 'bg-white text-text-muted border border-border-color hover:bg-bg-main'}">
                            ${type === 'All' ? 'Tất cả' : type}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="text-xs font-bold text-text-muted uppercase tracking-widest">
                Lọc theo: ${state.filterType === 'All' ? 'Tất cả' : state.filterType} (${filtered.length})
            </div>
        </header>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            ${filtered.length > 0 ? filtered.map(product => `
                <div class="group bg-white rounded-xl border border-border-color overflow-hidden hover:shadow-lg transition-all flex flex-col">
                    <div class="relative h-48 bg-bg-main flex items-center justify-center overflow-hidden">
                        <img src="${product.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="${product.name}">
                    </div>
                    <div class="p-4 flex flex-col flex-grow">
                        <span class="inline-block px-2 py-0.5 rounded bg-accent/10 text-accent text-[8px] font-bold uppercase tracking-widest mb-1.5 w-max">${product.type}</span>
                        <h3 class="font-bold text-sm text-text-main mb-1 line-clamp-1">${product.name}</h3>
                        <div class="mt-auto pt-3 flex justify-between items-center">
                            <span class="text-sm font-extrabold text-accent">${formatPrice(product.price)}</span>
                            <button onclick="addToCart(${product.id})" class="bg-accent text-white p-2 rounded-lg hover:bg-accent-hover transition-all active:scale-95 shadow-sm">
                                <span class="material-symbols-outlined text-sm">add</span>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('') : '<div class="col-span-full text-center py-20 text-text-muted text-sm font-medium">Không tìm thấy sản phẩm nào.</div>'}
        </div>
    `;
};

const renderNews = () => {
    appContainer.innerHTML = `
        <h1 class="text-2xl font-bold text-text-main mb-8">Tin tức mới nhất</h1>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            ${state.news.length > 0 ? `
                <article onclick="showNewsDetail(${state.news[0].id})" class="group cursor-pointer bg-white rounded-xl border border-border-color overflow-hidden">
                    <div class="overflow-hidden aspect-video">
                        <img src="${state.news[0].image || 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=1200&auto=format&fit=crop'}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="${state.news[0].title}">
                    </div>
                    <div class="p-6">
                        <span class="text-[9px] font-bold text-accent uppercase tracking-widest mb-2 inline-block">${state.news[0].category}</span>
                        <h2 class="text-xl font-bold text-text-main group-hover:text-accent mb-3 transition-colors">${state.news[0].title}</h2>
                        <p class="text-xs text-text-muted leading-relaxed line-clamp-2">${state.news[0].content}</p>
                    </div>
                </article>
                <div class="flex flex-col space-y-6">
                    ${state.news.slice(1).map(n => `
                        <article onclick="showNewsDetail(${n.id})" class="flex flex-col sm:flex-row gap-4 group cursor-pointer bg-white p-4 rounded-xl border border-border-color hover:shadow-md transition-all">
                            <div class="w-full sm:w-32 h-40 sm:h-32 shrink-0 overflow-hidden rounded-lg">
                                <img src="${n.image || 'https://images.unsplash.com/photo-1506617564039-2f3b650ad755?q=80&w=600&auto=format&fit=crop'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="${n.title}">
                            </div>
                            <div>
                                <span class="text-[8px] font-bold text-accent uppercase tracking-widest mb-1 shadow-sm inline-block">${n.category}</span>
                                <h3 class="text-sm font-bold text-text-main group-hover:text-accent leading-tight transition-colors line-clamp-2">${n.title}</h3>
                                <p class="text-xs text-text-muted mt-2 line-clamp-2">${n.content}</p>
                            </div>
                        </article>
                    `).join('')}
                </div>
            ` : `
                <div class="col-span-full text-center py-20 bg-white rounded-xl border-2 border-dashed border-border-color">
                    <span class="material-symbols-outlined text-4xl text-text-muted/20 mb-3">newspaper</span>
                    <p class="text-text-muted text-sm font-bold">Hiện chưa có tin tức nào mới.</p>
                </div>
            `}
        </div>
    `;
};

// Add News Detail Modal
window.showNewsDetail = (id) => {
    const news = state.news.find(n => n.id === id);
    if (!news) return;
    
    showModal(`
        <div class="max-w-2xl mx-auto py-2">
            <span class="text-[10px] font-bold text-accent uppercase tracking-widest mb-2 inline-block">${news.category}</span>
            <h1 class="text-2xl font-bold text-text-main mb-6">${news.title}</h1>
            <div class="aspect-video overflow-hidden rounded-xl mb-6 shadow-lg border border-border-color">
                <img src="${news.image || 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=1200&auto=format&fit=crop'}" class="w-full h-full object-cover">
            </div>
            <div class="prose prose-sm max-w-none">
                <p class="text-sm text-text-main leading-relaxed whitespace-pre-wrap">${news.content}</p>
            </div>
            <div class="mt-8 pt-6 border-t border-border-color flex justify-end">
                <button onclick="hideModal()" class="bg-accent text-white px-6 py-2 rounded-lg font-bold text-xs shadow-md hover:bg-accent-hover transition-all uppercase tracking-widest">Đóng</button>
            </div>
        </div>
    `);
};

const renderCart = () => {
    const cartItems = state.cart.map(item => {
        const product = state.products.find(p => p.id === item.id) || { name: 'Sản phẩm đã xóa', price: 0, image: '' };
        return { ...product, ...item };
    });
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    appContainer.innerHTML = `
        <h1 class="text-2xl font-bold text-text-main mb-8">Giỏ hàng (${state.cart.length})</h1>
        
        <div class="flex flex-col xl:flex-row gap-8">
            <div class="flex-grow space-y-4">
                ${state.cart.length > 0 ? cartItems.map(item => `
                    <div class="flex flex-col sm:flex-row items-center gap-6 p-4 bg-white rounded-xl border border-border-color shadow-sm h-auto sm:h-32">
                        <img src="${item.image}" class="w-24 h-24 object-cover rounded-lg shrink-0" alt="${item.name}">
                        <div class="flex-grow min-w-0 text-center sm:text-left">
                            <h3 class="font-bold text-sm text-text-main mb-1 truncate">${item.name}</h3>
                            <p class="text-xs text-accent font-bold">${formatPrice(item.price)}</p>
                        </div>
                        <div class="flex items-center space-x-3 bg-bg-main rounded-lg px-3 py-1.5 shrink-0">
                            <button onclick="updateCartQuantity(${item.id}, -1)" class="material-symbols-outlined text-text-muted hover:text-accent text-sm transition-all">remove</button>
                            <span class="font-bold w-6 text-center text-xs">${item.quantity}</span>
                            <button onclick="updateCartQuantity(${item.id}, 1)" class="material-symbols-outlined text-text-muted hover:text-accent text-sm transition-all">add</button>
                        </div>
                        <div class="text-right min-w-[6rem] shrink-0">
                            <p class="text-sm font-bold text-text-main">${formatPrice(item.price * item.quantity)}</p>
                        </div>
                        <button onclick="removeFromCart(${item.id})" class="text-text-muted hover:text-red-500 transition-colors p-2 shrink-0">
                            <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                    </div>
                `).join('') : `
                    <div class="text-center py-20 bg-white rounded-xl border-2 border-dashed border-border-color">
                        <span class="material-symbols-outlined text-4xl text-text-muted/30 mb-4">shopping_basket</span>
                        <p class="text-text-muted font-bold text-sm mb-4">Giỏ hàng của bạn đang trống</p>
                        <button onclick="navigate('products')" class="bg-accent text-white px-6 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-accent-hover transition-all">Quay lại mua sắm</button>
                    </div>
                `}
            </div>

            ${state.cart.length > 0 ? `
                <div class="w-full xl:w-[320px] shrink-0">
                    <div class="bg-white rounded-xl p-6 border border-border-color shadow-sm sticky top-8">
                        <h2 class="text-sm font-bold uppercase tracking-widest text-text-muted mb-6">Tóm tắt đơn hàng</h2>
                        <div class="space-y-3 mb-6 pb-6 border-b border-border-color">
                            <div class="flex justify-between text-xs font-medium text-text-main">
                                <span>Tạm tính</span>
                                <span>${formatPrice(total)}</span>
                            </div>
                            <div class="flex justify-between text-xs font-medium text-text-main">
                                <span>Giao hàng</span>
                                <span class="text-success-main uppercase tracking-tighter">Miễn phí</span>
                            </div>
                        </div>
                        <div class="flex justify-between items-end mb-8">
                            <span class="text-[10px] font-bold text-text-muted uppercase tracking-widest">Tổng cộng</span>
                            <span class="text-2xl font-extrabold text-accent">${formatPrice(total)}</span>
                        </div>
                        <button onclick="navigate('checkout')" class="w-full bg-accent text-white py-4 rounded-xl font-bold text-xs shadow-lg hover:bg-accent-hover active:scale-95 transition-all uppercase tracking-widest">Thanh toán</button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
};

const renderCheckout = () => {
    if (state.cart.length === 0) {
        navigate('cart');
        return;
    }

    const cartItems = state.cart.map(item => {
        const product = state.products.find(p => p.id === item.id) || { name: 'N/A', price: 0 };
        return { ...product, ...item };
    });
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    appContainer.innerHTML = `
        <div class="max-w-xl mx-auto py-8">
            <h1 class="text-2xl font-bold text-text-main mb-8 text-center">Xác nhận đơn hàng</h1>
            
            <div class="bg-white rounded-xl border border-border-color shadow-sm p-8">
                <form id="checkout-form" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Họ và tên</label>
                            <input type="text" id="order-name" required value="${state.currentUser ? state.currentUser.username : ''}" class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Số điện thoại</label>
                            <input type="tel" id="order-phone" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
                        </div>
                    </div>
                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Địa chỉ giao hàng</label>
                        <textarea id="order-address" required rows="3" class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent transition-all resize-none"></textarea>
                    </div>

                    <div class="bg-bg-main rounded-xl p-6 border border-border-color">
                        <div class="flex justify-between items-center pb-4 border-b border-border-color mb-4">
                            <span class="text-xs font-bold text-text-main">${state.cart.length} món đã chọn</span>
                            <span class="text-[10px] font-bold text-accent cursor-pointer hover:underline" onclick="navigate('cart')">Thay đổi</span>
                        </div>
                        <div class="flex justify-between items-end">
                            <span class="text-[10px] font-bold text-text-muted uppercase tracking-widest">Thành tiền</span>
                            <span class="text-2xl font-extrabold text-accent">${formatPrice(total)}</span>
                        </div>
                    </div>

                    <div class="flex gap-4">
                        <button type="button" onclick="navigate('cart')" class="flex-1 bg-white text-text-main border border-border-color py-3 rounded-xl font-bold text-xs hover:bg-bg-main transition-all uppercase tracking-widest">Quay lại</button>
                        <button type="submit" class="flex-[2] bg-accent text-white py-3 rounded-xl font-bold text-xs shadow-lg hover:bg-accent-hover active:scale-95 transition-all uppercase tracking-widest">Đặt hàng</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('checkout-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const order = {
            id: Date.now(),
            user: state.currentUser ? state.currentUser.username : 'Guest',
            name: document.getElementById('order-name').value,
            phone: document.getElementById('order-phone').value,
            address: document.getElementById('order-address').value,
            // Only store essential data for orders to save space (no images)
            items: cartItems.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
            total: total,
            date: new Date().toLocaleString(),
            status: 'Đang giao hàng'
        };

        state.orders.push(order);

        state.cart = [];
        saveState();
        updateUI();

        showModal(`
            <div class="text-center py-8">
                <div class="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="material-symbols-outlined text-4xl">check_circle</span>
                </div>
                <h2 class="text-xl font-bold text-text-main mb-2">Đặt hàng thành công!</h2>
                <p class="text-[11px] text-text-muted mb-8 tracking-tight">Mã đơn hàng: #${order.id}<br>Cảm ơn bạn đã tin tưởng Du ký.</p>
                <button onclick="hideModal(); navigate('home');" class="bg-accent text-white px-8 py-2.5 rounded-lg font-bold text-xs shadow-md hover:bg-accent-hover transition-all uppercase tracking-widest">Tiếp tục mua sắm</button>
            </div>
        `);
    });
};

const renderOrders = () => {
    if (!state.currentUser) {
        navigate('home');
        return;
    }

    const userOrders = state.orders.filter(o => o.user === state.currentUser.username);

    appContainer.innerHTML = `
        <h1 class="text-2xl font-bold text-text-main mb-8 text-center sm:text-left">Lịch sử đơn hàng</h1>
        
        <div class="max-w-4xl mx-auto sm:mx-0 space-y-6">
            ${userOrders.length > 0 ? userOrders.map(order => `
                <div class="bg-white rounded-xl border border-border-color shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div class="bg-bg-main p-4 border-b border-border-color flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                            <p class="text-[9px] font-bold text-text-muted uppercase tracking-widest">Mã đơn hàng: #${order.id}</p>
                            <p class="text-xs font-bold text-text-main">${order.date}</p>
                        </div>
                        <div class="text-right">
                            <span class="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                order.status === 'Đã giao hàng' ? 'bg-success/10 text-success' : 
                                order.status === 'Cancelled' ? 'bg-red-100 text-red-500' : 
                                'bg-warning-main/10 text-warning-main'
                            }">${order.status}</span>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="space-y-4 mb-6">
                            ${order.items.map(item => {
                                const product = state.products.find(p => p.id === item.id);
                                const imageUrl = product ? product.image : 'https://picsum.photos/seed/placeholder/100/100';
                                return `
                                <div class="flex justify-between items-center gap-4">
                                    <div class="flex items-center gap-4 min-w-0">
                                        <div class="w-12 h-12 bg-bg-main rounded-lg flex items-center justify-center overflow-hidden border border-border-color shrink-0">
                                            <img src="${imageUrl}" alt="${item.name}" class="w-full h-full object-cover">
                                        </div>
                                        <div class="min-w-0">
                                            <p class="text-sm font-bold text-text-main truncate">${item.name}</p>
                                            <p class="text-[10px] text-text-muted">SL: ${item.quantity} x ${formatPrice(item.price)}</p>
                                        </div>
                                    </div>
                                    <p class="text-sm font-bold text-text-main shrink-0">${formatPrice(item.price * item.quantity)}</p>
                                </div>
                            `;}).join('')}
                        </div>
                        <div class="pt-6 border-t border-border-color flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                            <div class="max-w-xs">
                                <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Địa chỉ giao hàng</p>
                                <p class="text-xs text-text-main italic">${order.address}</p>
                                <p class="text-[10px] text-text-muted mt-2">SĐT: ${order.phone}</p>
                            </div>
                            <div class="text-right w-full sm:w-auto">
                                <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Tổng thanh toán</p>
                                <p class="text-2xl font-black text-accent">${formatPrice(order.total)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `).reverse().join('') : `
                <div class="text-center py-20 bg-white rounded-xl border-2 border-dashed border-border-color">
                    <span class="material-symbols-outlined text-4xl text-text-muted/30 mb-4">history</span>
                    <p class="text-text-muted font-bold text-sm mb-4">Bạn chưa có đơn hàng nào</p>
                    <button onclick="navigate('products')" class="bg-accent text-white px-6 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-accent-hover transition-all">Mua sắm ngay</button>
                </div>
            `}
        </div>
    `;
};

const renderContact = () => {
    appContainer.innerHTML = `
        <div class="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 class="text-3xl font-extrabold text-text-main mb-2 tracking-tight">📞 Trang Liên hệ – Du ký</h1>
            <p class="text-text-muted text-sm mb-12 uppercase tracking-widest font-bold">Liên hệ với Du ký</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div class="space-y-8">
                    <div>
                        <h2 class="text-xl font-bold text-text-main mb-4">Chào mừng bạn đến với cửa hàng tiện lợi Du ký!</h2>
                        <p class="text-sm text-text-muted leading-relaxed">
                            Chúng tôi luôn sẵn sàng lắng nghe ý kiến, góp ý và hỗ trợ bạn trong quá trình mua sắm.
                        </p>
                    </div>

                    <div class="space-y-4">
                        <div class="flex items-start gap-4 p-4 bg-white rounded-xl border border-border-color shadow-sm">
                            <span class="material-symbols-outlined text-accent">location_on</span>
                            <div>
                                <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">📍 Địa chỉ</p>
                                <p class="text-xs font-bold text-text-main">123 Nguyễn Văn A, Quận 1, TP.HCM</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-4 p-4 bg-white rounded-xl border border-border-color shadow-sm">
                            <span class="material-symbols-outlined text-accent">call</span>
                            <div>
                                <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">📞 Điện thoại</p>
                                <p class="text-xs font-bold text-text-main">0123 456 789</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-4 p-4 bg-white rounded-xl border border-border-color shadow-sm">
                            <span class="material-symbols-outlined text-accent">mail</span>
                            <div>
                                <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">📧 Email</p>
                                <p class="text-xs font-bold text-text-main">dukyshop@gmail.com</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-4 p-4 bg-white rounded-xl border border-border-color shadow-sm">
                            <span class="material-symbols-outlined text-accent">schedule</span>
                            <div>
                                <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">🕒 Giờ mở cửa</p>
                                <p class="text-xs font-bold text-text-main">7:00 – 22:00 (Thứ 2 – Chủ nhật)</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="pt-4">
                        <p class="text-accent font-bold italic text-sm">💚 Du ký – Tiện lợi mỗi ngày, đồng hành cùng bạn!</p>
                    </div>
                </div>

                <div class="bg-white p-8 rounded-2xl border border-border-color shadow-xl">
                    <h2 class="text-lg font-bold text-text-main mb-2">Gửi phản hồi cho chúng tôi</h2>
                    <p class="text-xs text-text-muted mb-6">Nếu bạn có bất kỳ câu hỏi, góp ý hoặc cần hỗ trợ, vui lòng để lại thông tin và nội dung bên dưới.</p>
                    
                    <form id="contact-form" class="space-y-4">
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Họ và tên</label>
                            <input type="text" id="fb-name" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-accent transition-all ring-offset-2">
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Email</label>
                            <input type="email" id="fb-email" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-accent transition-all ring-offset-2">
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Nội dung</label>
                            <textarea id="fb-content" rows="4" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-accent transition-all ring-offset-2 resize-none"></textarea>
                        </div>
                        <button type="submit" class="w-full bg-accent text-white py-3 rounded-xl font-bold text-xs shadow-lg hover:bg-accent-hover active:scale-95 transition-all uppercase tracking-widest">Gửi lời nhắn</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('contact-form').onsubmit = (e) => {
        e.preventDefault();
        const feedback = {
            id: Date.now(),
            name: document.getElementById('fb-name').value,
            email: document.getElementById('fb-email').value,
            content: document.getElementById('fb-content').value,
            date: new Date().toLocaleString('vi-VN')
        };
        state.feedbacks.push(feedback);
        saveState();
        alert('Cảm ơn bạn! Phản hồi của bạn đã được gửi tới hệ thống quản trị Du ký.');
        e.target.reset();
    };
};

const renderAdmin = () => {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
        navigate('home');
        return;
    }

    const totalRevenue = state.orders.reduce((sum, o) => sum + o.total, 0);

    appContainer.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
            <h1 class="text-2xl font-bold text-text-main">Hệ thống quản trị</h1>
            <div class="w-full sm:w-auto flex space-x-1 bg-white p-1 rounded-lg border border-border-color shadow-sm overflow-x-auto no-scrollbar">
                <button id="admin-tab-stats" class="whitespace-nowrap px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-all bg-accent text-white shadow-md">Thống kê</button>
                <button id="admin-tab-products" class="whitespace-nowrap px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold text-text-muted hover:bg-bg-main transition-colors">Sản phẩm</button>
                <button id="admin-tab-news" class="whitespace-nowrap px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold text-text-muted hover:bg-bg-main transition-colors">Tin tức</button>
                <button id="admin-tab-staff" class="whitespace-nowrap px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold text-text-muted hover:bg-bg-main transition-colors">Nhân viên</button>
                <button id="admin-tab-feedback" class="whitespace-nowrap px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold text-text-muted hover:bg-bg-main transition-colors">Phản hồi</button>
                <button id="admin-tab-users" class="whitespace-nowrap px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold text-text-muted hover:bg-bg-main transition-colors">Người dùng</button>
                <button id="admin-tab-orders" class="whitespace-nowrap px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold text-text-muted hover:bg-bg-main transition-colors">Đơn hàng</button>
            </div>
        </div>

        <div id="admin-content" class="animate-in fade-in duration-500">
            <!-- Stats Default -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-xl border border-border-color shadow-sm">
                    <p class="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Tổng sản phẩm</p>
                    <p class="text-3xl font-extrabold text-text-main">${state.products.length}</p>
                </div>
                <div class="bg-white p-6 rounded-xl border border-border-color shadow-sm">
                    <p class="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Tin tức</p>
                    <p class="text-3xl font-extrabold text-text-main">${state.news.length}</p>
                </div>
                <div class="bg-white p-6 rounded-xl border border-border-color shadow-sm">
                    <p class="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Đơn hàng</p>
                    <p class="text-3xl font-extrabold text-text-main">${state.orders.length}</p>
                </div>
                <div class="bg-accent p-6 rounded-xl border border-accent shadow-lg">
                    <p class="text-[9px] font-bold text-white/70 uppercase tracking-widest mb-1">Doanh thu</p>
                    <p class="text-2xl font-extrabold text-white">${formatPrice(totalRevenue)}</p>
                </div>
            </div>
        </div>
    `;

    // Admin Tabs Logic
    const statsTab = document.getElementById('admin-tab-stats');
    const productsTab = document.getElementById('admin-tab-products');
    const newsTab = document.getElementById('admin-tab-news');
    const staffTab = document.getElementById('admin-tab-staff');
    const feedbackTab = document.getElementById('admin-tab-feedback');
    const usersTab = document.getElementById('admin-tab-users');
    const ordersTab = document.getElementById('admin-tab-orders');
    const adminContent = document.getElementById('admin-content');

    const setActiveTab = (btn) => {
        [statsTab, productsTab, newsTab, staffTab, feedbackTab, usersTab, ordersTab].forEach(b => {
            if (b) {
                b.classList.remove('bg-accent', 'text-white', 'shadow-md');
                b.classList.add('text-text-muted', 'hover:bg-bg-main');
            }
        });
        btn.classList.add('bg-accent', 'text-white', 'shadow-md');
        btn.classList.remove('text-text-muted', 'hover:bg-bg-main');
    };

    statsTab.onclick = () => { navigate('admin'); };
    
    productsTab.onclick = () => {
        setActiveTab(productsTab);
        adminContent.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-sm font-bold text-text-main uppercase tracking-widest">Danh sách sản phẩm</h2>
                <button id="add-product-btn" class="bg-accent text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md hover:bg-accent-hover transition-all">+ Thêm mới</button>
            </div>
            <div class="bg-white rounded-xl border border-border-color overflow-hidden shadow-sm">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-bg-main border-b border-border-color text-text-muted uppercase text-[9px] font-bold tracking-widest">
                        <tr>
                            <th class="px-6 py-4">ID</th>
                            <th class="px-6 py-4">Sản phẩm</th>
                            <th class="px-6 py-4">Loại</th>
                            <th class="px-6 py-4">Giá</th>
                            <th class="px-6 py-4">Nổi bật</th>
                            <th class="px-6 py-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border-color">
                        ${state.products.map(p => `
                            <tr class="hover:bg-bg-main/50 transition-colors">
                                <td class="px-6 py-4 text-[10px] font-mono text-text-muted">#${p.id}</td>
                                <td class="px-6 py-4 font-bold text-xs text-text-main">${p.name}</td>
                                <td class="px-6 py-4 text-[10px]"><span class="px-2 py-0.5 rounded bg-bg-main border border-border-color text-text-muted uppercase font-bold tracking-tighter">${p.type}</span></td>
                                <td class="px-6 py-4 text-xs font-bold text-text-main">${formatPrice(p.price)}</td>
                                <td class="px-6 py-4">
                                    <span class="material-symbols-outlined text-sm ${p.featured ? 'text-accent' : 'text-text-muted/30'}">
                                        ${p.featured ? 'stars' : 'star'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-right space-x-1">
                                    <button onclick="editProduct(${p.id})" class="text-accent hover:bg-accent/10 p-1.5 rounded-lg transition-colors"><span class="material-symbols-outlined text-sm">edit_note</span></button>
                                    <button onclick="deleteProduct(${p.id})" class="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><span class="material-symbols-outlined text-sm">delete_sweep</span></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('add-product-btn').onclick = () => editProduct(null);
    };

    newsTab.onclick = () => {
        setActiveTab(newsTab);
        adminContent.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-sm font-bold text-text-main uppercase tracking-widest">Quản lý tin tức</h2>
                <button id="add-news-btn" class="bg-accent text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md hover:bg-accent-hover transition-all">+ Thêm mới</button>
            </div>
            <div class="bg-white rounded-xl border border-border-color overflow-hidden shadow-sm">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-bg-main border-b border-border-color text-text-muted uppercase text-[9px] font-bold tracking-widest">
                        <tr>
                            <th class="px-6 py-4">ID</th>
                            <th class="px-6 py-4">Tin tức</th>
                            <th class="px-6 py-4">Danh mục</th>
                            <th class="px-6 py-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border-color">
                        ${state.news.map(n => `
                            <tr class="hover:bg-bg-main/50 transition-colors">
                                <td class="px-6 py-4 text-[10px] font-mono text-text-muted">#${n.id}</td>
                                <td class="px-6 py-4 font-bold text-xs text-text-main">${n.title}</td>
                                <td class="px-6 py-4 text-[10px]"><span class="px-2 py-0.5 rounded bg-bg-main border border-border-color text-text-muted uppercase font-bold tracking-tighter">${n.category}</span></td>
                                <td class="px-6 py-4 text-right space-x-1">
                                    <button onclick="editNews(${n.id})" class="text-accent hover:bg-accent/10 p-1.5 rounded-lg transition-colors"><span class="material-symbols-outlined text-sm">edit_note</span></button>
                                    <button onclick="deleteNews(${n.id})" class="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><span class="material-symbols-outlined text-sm">delete_sweep</span></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('add-news-btn').onclick = () => editNews(null);
    };

    staffTab.onclick = () => {
        setActiveTab(staffTab);
        adminContent.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-sm font-bold text-text-main uppercase tracking-widest">Quản lý nhân viên</h2>
                <button id="add-staff-btn" class="bg-accent text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md hover:bg-accent-hover transition-all">+ Thêm nhân viên</button>
            </div>
            <div class="bg-white rounded-xl border border-border-color overflow-hidden shadow-sm overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[600px]">
                    <thead class="bg-bg-main border-b border-border-color text-text-muted uppercase text-[9px] font-bold tracking-widest">
                        <tr>
                            <th class="px-6 py-4">Mã NV</th>
                            <th class="px-6 py-4">Họ tên</th>
                            <th class="px-6 py-4">Số ĐT</th>
                            <th class="px-6 py-4">Thời gian</th>
                            <th class="px-6 py-4">Chức vụ</th>
                            <th class="px-6 py-4">Lương</th>
                            <th class="px-6 py-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border-color">
                        ${state.staff.map(s => `
                            <tr class="hover:bg-bg-main/50 transition-colors">
                                <td class="px-6 py-4 text-[10px] font-mono text-text-muted">#${s.id}</td>
                                <td class="px-6 py-4 font-bold text-xs text-text-main">${s.name}</td>
                                <td class="px-6 py-4 text-xs text-text-muted">${s.phone}</td>
                                <td class="px-6 py-4 text-xs text-text-muted">${s.shift}</td>
                                <td class="px-6 py-4 text-[9px] font-bold">
                                    <span class="px-2 py-0.5 rounded bg-bg-main border border-border-color text-text-muted uppercase tracking-tighter">${s.position}</span>
                                </td>
                                <td class="px-6 py-4 text-xs font-bold text-accent">${formatPrice(s.salary)}</td>
                                <td class="px-6 py-4 text-right space-x-1">
                                    <button onclick="editStaff(${s.id})" class="text-accent hover:bg-accent/10 p-1.5 rounded-lg transition-colors"><span class="material-symbols-outlined text-sm">edit</span></button>
                                    <button onclick="deleteStaff(${s.id})" class="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><span class="material-symbols-outlined text-sm">person_remove</span></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('add-staff-btn').onclick = () => editStaff(null);
    };

    feedbackTab.onclick = () => {
        setActiveTab(feedbackTab);
        adminContent.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-sm font-bold text-text-main uppercase tracking-widest">Thư phản hồi khách hàng</h2>
            </div>
            <div class="space-y-6">
                ${state.feedbacks.length > 0 ? state.feedbacks.map(f => `
                    <div class="bg-white p-6 rounded-2xl border border-border-color shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <p class="text-sm font-bold text-text-main">${f.name}</p>
                                <p class="text-[10px] text-text-muted">${f.email} • ${f.date}</p>
                            </div>
                            <button onclick="deleteFeedback(${f.id})" class="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors">
                                <span class="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                        <p class="text-xs text-text-muted leading-relaxed italic bg-bg-main/50 p-4 rounded-xl border border-border-color/50">
                            "${f.content}"
                        </p>
                    </div>
                `).reverse().join('') : `
                    <div class="text-center py-20 bg-white rounded-xl border-2 border-dashed border-border-color">
                        <span class="material-symbols-outlined text-4xl text-text-muted/20 mb-3">mail_outline</span>
                        <p class="text-text-muted text-xs font-bold">Chưa có phản hồi nào mới</p>
                    </div>
                `}
            </div>
        `;
    };

    usersTab.onclick = () => {
        setActiveTab(usersTab);
        adminContent.innerHTML = `
            <h2 class="text-sm font-bold text-text-main uppercase tracking-widest mb-6">Người dùng hệ thống</h2>
            <div class="bg-white rounded-xl border border-border-color overflow-hidden shadow-sm">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-bg-main border-b border-border-color text-text-muted uppercase text-[9px] font-bold tracking-widest">
                        <tr>
                            <th class="px-6 py-4">Username</th>
                            <th class="px-6 py-4">Vai trò</th>
                            <th class="px-6 py-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border-color">
                        ${state.users.map(u => `
                            <tr class="hover:bg-bg-main/50 transition-colors">
                                <td class="px-6 py-4 flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-bg-main border border-border-color flex items-center justify-center font-bold text-[10px] text-text-muted">${u.username.substring(0, 2).toUpperCase()}</div>
                                    <span class="font-bold text-xs text-text-main">${u.username}</span>
                                </td>
                                <td class="px-6 py-4 text-[9px] font-bold"><span class="px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-accent/10 text-accent' : 'bg-bg-main text-text-muted'} uppercase tracking-widest">${u.role}</span></td>
                                <td class="px-6 py-4 text-right">
                                    ${u.role !== 'admin' ? `<button onclick="deleteUser('${u.username}')" class="text-text-muted hover:text-red-500 p-1.5 rounded-lg transition-colors"><span class="material-symbols-outlined text-sm">person_remove</span></button>` : '<span class="text-text-muted text-[10px]">Hệ thống</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    };

    ordersTab.onclick = () => {
        setActiveTab(ordersTab);
        adminContent.innerHTML = `
            <h2 class="text-sm font-bold text-text-main uppercase tracking-widest mb-6">Lịch sử đơn hàng</h2>
            <div class="bg-white rounded-xl border border-border-color overflow-hidden shadow-sm">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-bg-main border-b border-border-color text-text-muted uppercase text-[9px] font-bold tracking-widest">
                        <tr>
                            <th class="px-6 py-4">Mã đơn</th>
                            <th class="px-6 py-4">Khách hàng</th>
                            <th class="px-6 py-4">Ngày đặt</th>
                            <th class="px-6 py-4">Tổng tiền</th>
                            <th class="px-6 py-4">Trạng thái</th>
                            <th class="px-6 py-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border-color">
                        ${state.orders.map(o => `
                            <tr class="hover:bg-bg-main/50 transition-colors">
                                <td class="px-6 py-4 text-[10px] font-mono text-text-muted">#${o.id}</td>
                                <td class="px-6 py-4">
                                    <div class="font-bold text-xs text-text-main">${o.name}</div>
                                    <div class="text-[9px] text-text-muted uppercase tracking-widest">${o.phone}</div>
                                </td>
                                <td class="px-6 py-4 text-[10px] text-text-muted">${o.date}</td>
                                <td class="px-6 py-4 text-xs font-bold text-accent">${formatPrice(o.total)}</td>
                                <td class="px-6 py-4 text-[9px] font-bold">
                                    <span class="px-2 py-0.5 rounded ${o.status === 'Đang giao hàng' ? 'bg-warning-main/10 text-warning-main' : 'bg-success/10 text-success'} tracking-wide">${o.status}</span>
                                </td>
                                <td class="px-6 py-4 text-right">
                                    ${o.status === 'Đang giao hàng' ? `
                                        <button onclick="updateOrderStatus(${o.id}, 'Đã giao hàng')" class="text-[10px] font-bold text-black bg-white border border-black px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 active:scale-95 transition-all">
  Xác nhận đã giao
</button>
                                    ` : '<span class="text-[10px] text-text-muted font-medium italic">Đã giao hàng</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    };
};

window.updateOrderStatus = (orderId, newStatus) => {
    const orderIndex = state.orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        state.orders[orderIndex].status = newStatus;
        saveState();
        // Re-click the orders tab to refresh the list
        document.getElementById('admin-tab-orders').click();
        
        // Use a lightweight notification instead of alert for better UX
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-8 right-8 bg-success text-white px-6 py-3 rounded-xl font-bold text-xs shadow-2xl animate-in slide-in-from-right-full z-[100] uppercase tracking-widest';
        notification.textContent = `Đơn hàng #${orderId} đã được chuyển sang: ${newStatus}`;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('animate-out', 'fade-out', 'slide-out-to-right-full');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
};

window.deleteProduct = (id) => {
    showModal(`
        <div class="text-center py-6">
            <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="material-symbols-outlined text-4xl">warning</span>
            </div>
            <h2 class="text-lg font-bold text-text-main mb-2">Xác nhận xóa sản phẩm?</h2>
            <p class="text-xs text-text-muted mb-8">Hành động này không thể hoàn tác.</p>
            <div class="flex gap-3">
                <button onclick="hideModal()" class="flex-1 bg-bg-main text-text-main py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest border border-border-color">Hủy</button>
                <button id="confirm-delete-btn" class="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-bold text-xs shadow-md hover:bg-red-600 transition-all uppercase tracking-widest">Xóa ngay</button>
            </div>
        </div>
    `);
    document.getElementById('confirm-delete-btn').onclick = () => {
        state.products = state.products.filter(p => p.id !== id);
        saveState();
        hideModal();
        const tab = document.getElementById('admin-tab-products');
        if (tab) tab.click();
    };
};

window.deleteUser = (username) => {
    showModal(`
        <div class="text-center py-6">
            <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="material-symbols-outlined text-4xl">person_remove</span>
            </div>
            <h2 class="text-lg font-bold text-text-main mb-2">Xóa người dùng?</h2>
            <p class="text-xs text-text-muted mb-8">Người dùng <b>${username}</b> sẽ bị xóa khỏi hệ thống.</p>
            <div class="flex gap-3">
                <button onclick="hideModal()" class="flex-1 bg-bg-main text-text-main py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest border border-border-color">Hủy</button>
                <button id="confirm-delete-user" class="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-bold text-xs shadow-md hover:bg-red-600 transition-all uppercase tracking-widest">Xóa</button>
            </div>
        </div>
    `);
    document.getElementById('confirm-delete-user').onclick = () => {
        state.users = state.users.filter(u => u.username !== username);
        saveState();
        hideModal();
        const tab = document.getElementById('admin-tab-users');
        if (tab) tab.click();
    };
};

window.editProduct = (id) => {
    const product = id ? state.products.find(p => p.id === id) : { id: Date.now(), name: '', price: 0, type: 'Đồ ăn', image: '', featured: false };
    
    showModal(`
        <h2 class="text-lg font-bold text-text-main mb-6">${id ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</h2>
        <form id="product-form" class="space-y-4">
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Mã sản phẩm (ID)</label>
                <input type="number" id="p-id" value="${product.id}" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
            </div>
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Tên sản phẩm</label>
                <input type="text" id="p-name" value="${product.name}" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Giá bán</label>
                    <input type="number" id="p-price" value="${product.price}" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
                </div>
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Phân loại</label>
                    <select id="p-type" class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
                        <option value="Đồ ăn" ${product.type === 'Đồ ăn' ? 'selected' : ''}>Đồ ăn</option>
                        <option value="Đồ uống" ${product.type === 'Đồ uống' ? 'selected' : ''}>Đồ uống</option>
                    </select>
                </div>
            </div>
            <div class="flex items-center gap-3 bg-bg-main/50 p-3 rounded-lg border border-border-color">
                <input type="checkbox" id="p-featured" ${product.featured ? 'checked' : ''} class="w-4 h-4 accent-accent rounded cursor-pointer">
                <label for="p-featured" class="text-xs font-bold text-text-main cursor-pointer select-none">Đánh dấu là Sản phẩm nổi bật (Hiện thị tại trang chủ)</label>
            </div>
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Thêm hình ảnh</label>
                <div class="flex gap-2">
                    <input type="text" id="p-image" value="${product.image}" class="flex-grow bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all placeholder:text-text-muted/50" placeholder="URL hình ảnh...">
                    <label class="bg-white border border-border-color p-2 rounded-lg cursor-pointer hover:bg-bg-main transition-colors">
                        <span class="material-symbols-outlined text-sm">upload_file</span>
                        <input type="file" class="hidden" accept="image/*" onchange="const reader = new FileReader(); reader.onload=(ev)=>document.getElementById('p-image').value=ev.target.result; reader.readAsDataURL(this.files[0])">
                    </label>
                </div>
            </div>
            <div class="flex gap-3 pt-4">
                <button type="button" onclick="hideModal()" class="flex-1 bg-white text-text-main border border-border-color py-2.5 rounded-lg font-bold text-xs hover:bg-bg-main transition-all uppercase tracking-widest">Hủy</button>
                <button type="submit" class="flex-[2] bg-accent text-white py-2.5 rounded-lg font-bold text-xs shadow-md hover:bg-accent-hover transition-all uppercase tracking-widest">Lưu thông tin</button>
            </div>
        </form>
    `);

    document.getElementById('product-form').onsubmit = (e) => {
        e.preventDefault();
        const newId = parseInt(document.getElementById('p-id').value);
        
        // Check for duplicate ID if ID is changed or new
        if ((!id || newId !== id) && state.products.some(p => p.id === newId)) {
            alert('Mã sản phẩm (ID) đã tồn tại. Vui lòng chọn mã khác!');
            return;
        }

        const updated = {
            id: newId,
            name: document.getElementById('p-name').value,
            price: parseInt(document.getElementById('p-price').value),
            type: document.getElementById('p-type').value,
            image: document.getElementById('p-image').value,
            featured: document.getElementById('p-featured').checked
        };

        if (id) {
            const index = state.products.findIndex(p => p.id === id);
            state.products[index] = updated;
        } else {
            state.products.push(updated);
        }

        saveState();
        hideModal();
        document.getElementById('admin-tab-products').click();
    };
};

window.editNews = (id) => {
    const news = id ? state.news.find(n => n.id === id) : { id: Date.now(), title: '', category: 'Cộng đồng', content: '', image: '' };
    
    showModal(`
        <h2 class="text-lg font-bold text-text-main mb-6">${id ? 'Cập nhật tin tức' : 'Đăng tin mới'}</h2>
        <form id="news-form" class="space-y-4">
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Mã tin tức (ID)</label>
                <input type="number" id="n-id" value="${news.id}" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
            </div>
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Tiêu đề</label>
                <input type="text" id="n-title" value="${news.title}" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
            </div>
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Danh mục</label>
                <select id="n-category" class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
                    <option value="Xu hướng" ${news.category === 'Xu hướng' ? 'selected' : ''}>Xu hướng</option>
                    <option value="Sản phẩm mới" ${news.category === 'Sản phẩm mới' ? 'selected' : ''}>Sản phẩm mới</option>
                    <option value="Cộng đồng" ${news.category === 'Cộng đồng' ? 'selected' : ''}>Cộng đồng</option>
                </select>
            </div>
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Thêm hình ảnh</label>
                <div class="flex gap-2">
                    <input type="text" id="n-image" value="${news.image}" class="flex-grow bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all placeholder:text-text-muted/50" placeholder="URL hình ảnh...">
                    <label class="bg-white border border-border-color p-2 rounded-lg cursor-pointer hover:bg-bg-main transition-colors">
                        <span class="material-symbols-outlined text-sm">upload_file</span>
                        <input type="file" class="hidden" accept="image/*" onchange="const reader = new FileReader(); reader.onload=(ev)=>document.getElementById('n-image').value=ev.target.result; reader.readAsDataURL(this.files[0])">
                    </label>
                </div>
            </div>
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Nội dung</label>
                <textarea id="n-content" rows="4" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all resize-none">${news.content}</textarea>
            </div>
            <div class="flex gap-3 pt-4">
                <button type="button" onclick="hideModal()" class="flex-1 bg-white text-text-main border border-border-color py-2.5 rounded-lg font-bold text-xs hover:bg-bg-main transition-all uppercase tracking-widest">Hủy</button>
                <button type="submit" class="flex-[2] bg-accent text-white py-2.5 rounded-lg font-bold text-xs shadow-md hover:bg-accent-hover transition-all uppercase tracking-widest">Đăng tin</button>
            </div>
        </form>
    `);

    document.getElementById('news-form').onsubmit = (e) => {
        e.preventDefault();
        const newId = parseInt(document.getElementById('n-id').value);

        // Check for duplicate ID if ID is changed or new
        if ((!id || newId !== id) && state.news.some(n => n.id === newId)) {
            alert('Mã tin tức (ID) đã tồn tại. Vui lòng chọn mã khác!');
            return;
        }

        const updated = {
            id: newId,
            title: document.getElementById('n-title').value,
            category: document.getElementById('n-category').value,
            image: document.getElementById('n-image').value,
            content: document.getElementById('n-content').value
        };

        if (id) {
            const index = state.news.findIndex(n => n.id === id);
            state.news[index] = updated;
        } else {
            state.news.push(updated);
        }

        saveState();
        hideModal();
        document.getElementById('admin-tab-news').click();
    };
};

window.deleteNews = (id) => {
    state.news = state.news.filter(n => n.id !== id);
    saveState();
    document.getElementById('admin-tab-news').click();
};

window.editStaff = (id) => {
    const staff = id ? state.staff.find(s => s.id === id) : { id: Date.now(), name: '', phone: '', shift: '08:00 - 17:00', position: 'Nhân viên', salary: 0 };
    
    const [startTime, endTime] = staff.shift.split(' - ');

    showModal(`
        <h2 class="text-lg font-bold text-text-main mb-6">${id ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}</h2>
        <form id="staff-form" class="space-y-4">
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Mã nhân viên (ID)</label>
                <input type="number" id="s-id" value="${staff.id}" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
            </div>
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Họ và tên</label>
                <input type="text" id="s-name" value="${staff.name}" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Số điện thoại</label>
                    <input type="tel" id="s-phone" value="${staff.phone}" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
                </div>
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Thời gian làm việc</label>
                    <div class="flex items-center gap-2">
                        <input type="time" id="s-shift-start" value="${startTime || '08:00'}" required class="w-full bg-bg-main border border-border-color rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-accent transition-all">
                        <span class="text-text-muted">→</span>
                        <input type="time" id="s-shift-end" value="${endTime || '17:00'}" required class="w-full bg-bg-main border border-border-color rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-accent transition-all">
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Chức vụ</label>
                    <input type="text" id="s-position" value="${staff.position}" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
                </div>
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Mức lương</label>
                    <input type="number" id="s-salary" value="${staff.salary}" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
                </div>
            </div>
            <div class="flex gap-3 pt-4">
                <button type="button" onclick="hideModal()" class="flex-1 bg-white text-text-main border border-border-color py-2.5 rounded-lg font-bold text-xs hover:bg-bg-main transition-all uppercase tracking-widest">Hủy</button>
                <button type="submit" class="flex-[2] bg-accent text-white py-2.5 rounded-lg font-bold text-xs shadow-md hover:bg-accent-hover transition-all uppercase tracking-widest">Lưu thông tin</button>
            </div>
        </form>
    `);

    document.getElementById('staff-form').onsubmit = (e) => {
        e.preventDefault();
        const newId = parseInt(document.getElementById('s-id').value);
        
        // Uniqueness check
        if ((!id || newId !== id) && state.staff.some(s => s.id === newId)) {
            alert('Mã nhân viên (ID) đã tồn tại!');
            return;
        }

        const start = document.getElementById('s-shift-start').value;
        const end = document.getElementById('s-shift-end').value;

        const updated = {
            id: newId,
            name: document.getElementById('s-name').value,
            phone: document.getElementById('s-phone').value,
            shift: `${start} - ${end}`,
            position: document.getElementById('s-position').value,
            salary: parseInt(document.getElementById('s-salary').value)
        };

        if (id) {
            const index = state.staff.findIndex(s => s.id === id);
            state.staff[index] = updated;
        } else {
            state.staff.push(updated);
        }

        saveState();
        hideModal();
        document.getElementById('admin-tab-staff').click();
    };
};

window.deleteStaff = (id) => {
    showModal(`
        <div class="text-center py-6">
            <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="material-symbols-outlined text-4xl">person_off</span>
            </div>
            <h2 class="text-lg font-bold text-text-main mb-2">Xóa nhân viên?</h2>
            <p class="text-xs text-text-muted mb-8">Dữ liệu về nhân viên mã <b>#${id}</b> sẽ bị gỡ bỏ.</p>
            <div class="flex gap-3">
                <button onclick="hideModal()" class="flex-1 bg-bg-main text-text-main py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest border border-border-color">Hủy</button>
                <button id="confirm-delete-staff" class="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-bold text-xs shadow-md hover:bg-red-600 transition-all uppercase tracking-widest">Xác nhận</button>
            </div>
        </div>
    `);
    document.getElementById('confirm-delete-staff').onclick = () => {
        state.staff = state.staff.filter(s => s.id !== id);
        saveState();
        hideModal();
        document.getElementById('admin-tab-staff').click();
    };
};

window.deleteFeedback = (id) => {
    state.feedbacks = state.feedbacks.filter(f => f.id !== id);
    saveState();
    const tab = document.getElementById('admin-tab-feedback');
    if (tab) tab.click();
};

window.deleteNews = (id) => {
    showModal(`
        <div class="text-center py-6">
            <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="material-symbols-outlined text-4xl">delete_forever</span>
            </div>
            <h2 class="text-lg font-bold text-text-main mb-2">Xóa tin tức?</h2>
            <p class="text-xs text-text-muted mb-8">Toàn bộ nội dung bài viết sẽ biến mất.</p>
            <div class="flex gap-3">
                <button onclick="hideModal()" class="flex-1 bg-bg-main text-text-main py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest border border-border-color">Hủy</button>
                <button id="confirm-delete-news" class="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-bold text-xs shadow-md hover:bg-red-600 transition-all uppercase tracking-widest">Xóa bài</button>
            </div>
        </div>
    `);
    document.getElementById('confirm-delete-news').onclick = () => {
        state.news = state.news.filter(n => n.id !== id);
        saveState();
        hideModal();
        const tab = document.getElementById('admin-tab-news');
        if (tab) tab.click();
    };
};

// --- AUTH LOGIC ---
const updateAuthModal = (view = 'login') => {
    if (view === 'login') {
        showModal(`
            <div class="text-center mb-8">
                <h2 class="text-xl font-bold text-text-main">Chào mừng trở lại</h2>
                <p class="text-[10px] text-text-muted uppercase tracking-widest mt-1">Đăng nhập vào hệ thống quản lý</p>
            </div>
            <form id="login-form" class="space-y-5">
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Tên đăng nhập</label>
                    <input type="text" id="login-user" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
                </div>
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Mật khẩu</label>
                    <input type="password" id="login-pass" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
                </div>
                <button type="submit" class="w-full bg-accent text-white py-3 rounded-xl font-bold text-xs shadow-lg hover:bg-accent-hover active:scale-95 transition-all mt-4 uppercase tracking-widest">Đăng nhập</button>
                <p class="text-center text-xs text-text-muted">Chưa có tài khoản? <span class="text-accent font-bold cursor-pointer hover:underline" onclick="updateAuthModal('register')">Đăng ký ngay</span></p>
            </form>
        `);
        document.getElementById('login-form').onsubmit = (e) => {
            e.preventDefault();
            const user = state.users.find(u => u.username === document.getElementById('login-user').value && u.password === document.getElementById('login-pass').value);
            if (user) {
                state.currentUser = user;
                saveState();
                updateUI();
                hideModal();
                if (user.role === 'admin') navigate('admin'); else navigate('home');
            } else {
                alert('Tên đăng nhập hoặc mật khẩu không đúng!');
            }
        };
    } else {
        showModal(`
            <div class="text-center mb-8">
                <h2 class="text-xl font-bold text-text-main">Tạo tài khoản mới</h2>
                <p class="text-[10px] text-text-muted uppercase tracking-widest mt-1">Đăng ký để trải nghiệm đầy đủ tính năng</p>
            </div>
            <form id="register-form" class="space-y-5">
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Tên đăng nhập</label>
                    <input type="text" id="reg-user" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
                </div>
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Mật khẩu</label>
                    <input type="password" id="reg-pass" required class="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent transition-all">
                </div>
                <button type="submit" class="w-full bg-accent text-white py-3 rounded-xl font-bold text-xs shadow-lg mt-4 active:scale-95 transition-all uppercase tracking-widest">Hoàn tất đăng ký</button>
                <p class="text-center text-xs text-text-muted">Đã có tài khoản? <span class="text-accent font-bold cursor-pointer hover:underline" onclick="updateAuthModal('login')">Đăng nhập</span></p>
            </form>
        `);
        document.getElementById('register-form').onsubmit = (e) => {
            e.preventDefault();
            const user = document.getElementById('reg-user').value;
            if (state.users.some(u => u.username === user)) {
                alert('Tên đăng nhập đã được sử dụng!');
                return;
            }
            state.users.push({ username: user, password: document.getElementById('reg-pass').value, role: 'user' });
            saveState();
            alert('Đăng ký thành công!');
            updateAuthModal('login');
        };
    }
};

// --- EVENTS ---
const sidebarOverlay = document.getElementById('sidebar-overlay');
const menuToggle = document.getElementById('menu-toggle');
const closeSidebar = document.getElementById('close-sidebar');

if (menuToggle) menuToggle.onclick = () => toggleSidebar(true);
if (closeSidebar) closeSidebar.onclick = () => toggleSidebar(false);
if (sidebarOverlay) sidebarOverlay.onclick = () => toggleSidebar(false);

logo.onclick = () => navigate('home');

searchInput.oninput = (e) => {
    state.searchQuery = e.target.value;
    if (state.currentPage !== 'products') {
        navigate('products');
    } else {
        renderProducts();
    }
};

loginBtn.onclick = () => updateAuthModal('login');

logoutBtn.onclick = () => {
    state.currentUser = null;
    saveState();
    updateUI();
    navigate('home');
};

floatingCartBtn.onclick = () => navigate('cart');

closeModal.onclick = hideModal;

window.onclick = (e) => {
    if (e.target === modalContainer) hideModal();
};

// Expose functions to window for onclick handlers in strings
window.navigate = navigate;
window.addToCart = addToCart;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.hideModal = hideModal;
window.updateAuthModal = updateAuthModal;

// --- INIT ---
updateUI();
renderPage();
