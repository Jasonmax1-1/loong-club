// 数据存储键名
const STORAGE_KEYS = {
    USERS: 'metro_escort_users',
    CURRENT_USER: 'metro_escort_current_user',
    ORDERS: 'metro_escort_orders',
    PUNISHMENTS: 'metro_escort_punishments',
    ANNOUNCEMENTS: 'metro_escort_announcements',
    COMPLAINTS: 'metro_escort_complaints'
};

// 实时更新计时器
let realtimeUpdateInterval = null;

// 初始化数据
function initData() {
    // 初始化订单（空数组，不创建测试订单）
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    }
    
    // 初始化示例公告
    if (!localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS)) {
        const sampleAnnouncements = [
            {
                id: 'ANN' + Date.now(),
                title: '平台上线通知',
                content: '欢迎使用LOONG俱乐部打手接单平台！请各位打手遵守平台规则，提供优质服务。',
                createdAt: new Date().toISOString()
            },
            {
                id: 'ANN' + (Date.now() + 1),
                title: '服务规范更新',
                content: '请各位打手注意：接单后请及时联系老板，服务过程中保持良好的沟通，服务完成后请及时确认订单。',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(sampleAnnouncements));
    }
    
    // 初始化示例处罚
    if (!localStorage.getItem(STORAGE_KEYS.PUNISHMENTS)) {
        localStorage.setItem(STORAGE_KEYS.PUNISHMENTS, JSON.stringify([]));
    }
    
    // 初始化投诉
    if (!localStorage.getItem(STORAGE_KEYS.COMPLAINTS)) {
        localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify([]));
    }
}

// 获取存储数据
function getStorageData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

// 设置存储数据
function setStorageData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// 切换登录/注册标签
function switchTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabs[0].classList.add('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabs[1].classList.add('active');
    }
}

// 登录处理
document.getElementById('login-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const phone = document.getElementById('login-phone').value;
    const password = document.getElementById('login-password').value;
    
    const users = getStorageData(STORAGE_KEYS.USERS);
    const user = users.find(u => u.phone === phone && u.password === password);
    
    if (user) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        showMainPage();
    } else {
        alert('手机号或密码错误！');
    }
});

// 注册处理
document.getElementById('register-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    const inviteCode = document.getElementById('reg-invite').value;
    
    if (password !== confirm) {
        alert('两次输入的密码不一致！');
        return;
    }
    
    // 验证邀请码（示例：INVITE2024）
    if (inviteCode !== 'INVITE2024') {
        alert('邀请码无效！');
        return;
    }
    
    const users = getStorageData(STORAGE_KEYS.USERS);
    
    if (users.find(u => u.phone === phone)) {
        alert('该手机号已注册！');
        return;
    }
    
    const newUser = {
        id: 'USER' + Date.now(),
        phone: phone,
        password: password,
        name: '打手' + phone.slice(-4),
        role: 'das-hou',
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    setStorageData(STORAGE_KEYS.USERS, users);
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
    alert('注册成功！');
    showMainPage();
});

// 检查用户处罚状态
function checkUserPunishmentStatus() {
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    if (!currentUser) return { canOperate: true, message: '' };
    
    const punishments = getStorageData(STORAGE_KEYS.PUNISHMENTS);
    const myPunishments = punishments.filter(p => p.userId === currentUser.id && p.status === '进行中');
    
    const now = Date.now();
    
    for (const p of myPunishments) {
        // 永久封禁
        if (p.rawType === '永久封禁') {
            return { canOperate: false, message: '您已被永久封禁，无法进行任何操作' };
        }
        
        // 检查封禁是否到期
        if (p.rawType === '封禁' && p.days) {
            const endTime = new Date(p.createdAt).getTime() + (p.days * 24 * 60 * 60 * 1000);
            if (now < endTime) {
                const remaining = endTime - now;
                const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
                const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                return { canOperate: false, message: `您已被封禁，剩余时间：${days}天${hours}小时，无法进行任何操作` };
            }
        }
        
        // 检查禁单是否到期
        if (p.rawType === '禁单' && p.days) {
            const endTime = new Date(p.createdAt).getTime() + (p.days * 24 * 60 * 60 * 1000);
            if (now < endTime) {
                const remaining = endTime - now;
                const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
                const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                return { canOperate: false, message: `您已被禁单，剩余时间：${days}天${hours}小时，无法进行任何操作` };
            }
        }
    }
    
    return { canOperate: true, message: '' };
}

// 显示主页面
function showMainPage() {
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    if (!currentUser) return;
    
    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('main-page').classList.remove('hidden');
    
    document.getElementById('user-name').textContent = currentUser.name;
    
    // 检查处罚状态并显示警告
    const punishmentStatus = checkUserPunishmentStatus();
    if (!punishmentStatus.canOperate) {
        showPunishmentWarning(punishmentStatus.message);
    }
    
    loadOrders();
    loadMyOrders();
    loadPunishments();
    loadAnnouncements();
    
    // 启动实时更新
    startRealtimeUpdate();
}

// 显示处罚警告
function showPunishmentWarning(message) {
    // 移除已有的警告
    const existingWarning = document.getElementById('punishment-warning');
    if (existingWarning) {
        existingWarning.remove();
    }
    
    const warning = document.createElement('div');
    warning.id = 'punishment-warning';
    warning.style.cssText = `
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        margin: 10px 20px;
        font-weight: 600;
        text-align: center;
        animation: pulse 2s infinite;
    `;
    warning.textContent = '⚠️ ' + message;
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertBefore(warning, mainContent.firstChild);
    }
}

// 启动实时更新
function startRealtimeUpdate() {
    // 清除已有的计时器
    if (realtimeUpdateInterval) {
        clearInterval(realtimeUpdateInterval);
    }
    
    // 每秒更新一次
    realtimeUpdateInterval = setInterval(() => {
        updatePunishmentCountdowns();
        
        // 刷新订单列表以更新按钮状态
        const ordersPage = document.getElementById('orders-page');
        if (ordersPage && !ordersPage.classList.contains('hidden')) {
            loadOrders();
        }
    }, 1000);
}

// 停止实时更新
function stopRealtimeUpdate() {
    if (realtimeUpdateInterval) {
        clearInterval(realtimeUpdateInterval);
        realtimeUpdateInterval = null;
    }
}

// 更新处罚倒计时显示
function updatePunishmentCountdowns() {
    const countdownElements = document.querySelectorAll('[data-punishment-end]');
    const now = Date.now();
    
    countdownElements.forEach(el => {
        const endTime = parseInt(el.dataset.punishmentEnd);
        const isPermanent = el.dataset.punishmentPermanent === 'true';
        
        if (isPermanent) {
            el.textContent = '剩余时间：永久';
            return;
        }
        
        const remaining = endTime - now;
        
        if (remaining <= 0) {
            el.textContent = '已结束';
            el.style.color = '#22c55e';
        } else {
            const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
            const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
            
            if (days > 0) {
                el.textContent = `剩余时间：${days}天${hours}小时${minutes}分${seconds}秒`;
            } else if (hours > 0) {
                el.textContent = `剩余时间：${hours}小时${minutes}分${seconds}秒`;
            } else if (minutes > 0) {
                el.textContent = `剩余时间：${minutes}分${seconds}秒`;
            } else {
                el.textContent = `剩余时间：${seconds}秒`;
            }
        }
    });
}

// 退出登录
function logout() {
    stopRealtimeUpdate();
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    document.getElementById('main-page').classList.add('hidden');
    document.getElementById('auth-page').classList.remove('hidden');
    document.getElementById('login-form').reset();
    
    // 移除处罚警告
    const warning = document.getElementById('punishment-warning');
    if (warning) {
        warning.remove();
    }
}

// 切换页面
function showPage(page) {
    // 隐藏所有页面
    document.querySelectorAll('.content-page').forEach(p => p.classList.add('hidden'));
    document.getElementById(page + '-page').classList.remove('hidden');
    
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    
    // 刷新数据
    if (page === 'orders') loadOrders();
    if (page === 'my-orders') loadMyOrders();
    if (page === 'rejected-orders') loadRejectedOrders();
    if (page === 'punishments') loadPunishments();
    if (page === 'announcements') loadAnnouncements();
}

// 加载订单列表
function loadOrders() {
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    const orders = getStorageData(STORAGE_KEYS.ORDERS);
    // 过滤掉待接单且已被当前用户拒单的订单
    const pendingOrders = orders.filter(o => {
        if (o.status !== 'pending') return false;
        // 检查当前用户是否已拒单
        if (o.rejectedBy && Array.isArray(o.rejectedBy)) {
            return !o.rejectedBy.some(r => r.userId === currentUser.id);
        }
        return true;
    });
    
    const container = document.getElementById('orders-list');
    
    // 检查用户是否可以接单
    const punishmentStatus = checkUserPunishmentStatus();
    
    if (pendingOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">暂无待接订单</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pendingOrders.map(order => {
        const acceptButton = punishmentStatus.canOperate 
            ? `<button class="btn-small btn-accept" onclick="acceptOrder('${order.id}')">立即接单</button>`
            : `<button class="btn-small btn-accept" disabled style="opacity: 0.5; cursor: not-allowed; background: #6b7280;">无法接单</button>`;
        
        // 拒单按钮（只有在可以接单时才显示）
        const rejectButton = punishmentStatus.canOperate
            ? `<button class="btn-small btn-delete" onclick="rejectOrder('${order.id}')">拒单</button>`
            : '';
        
        return `
        <div class="order-card">
            <div class="order-header">
                <span class="order-id">${order.id}</span>
                <span class="order-status status-pending">待接单</span>
            </div>
            <div class="order-info">
                <div class="info-item">
                    <span class="info-label">服务器</span>
                    <span class="info-value">${order.server}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">地图</span>
                    <span class="info-value">${order.map}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">发布时间</span>
                    <span class="info-value">${formatDate(order.createdAt)}</span>
                </div>
            </div>
            <div class="order-price">¥${order.price}</div>
            <div class="order-actions">
                <button class="btn-small btn-view" onclick="viewOrder('${order.id}')">查看详情</button>
                ${acceptButton}
                ${rejectButton}
            </div>
        </div>
    `}).join('');
}

// 拒单
function rejectOrder(orderId) {
    if (!confirm('确定要拒绝这个订单吗？')) return;
    
    let orders = getStorageData(STORAGE_KEYS.ORDERS);
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
        alert('订单不存在！');
        return;
    }
    
    // 记录拒单信息
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    if (!orders[orderIndex].rejectedBy) {
        orders[orderIndex].rejectedBy = [];
    }
    orders[orderIndex].rejectedBy.push({
        userId: currentUser.id,
        rejectedAt: new Date().toISOString()
    });
    
    setStorageData(STORAGE_KEYS.ORDERS, orders);
    
    alert('已拒单！该订单将不再显示在您的接单列表中。');
    loadOrders();
}

// 加载我的订单
function loadMyOrders() {
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    const orders = getStorageData(STORAGE_KEYS.ORDERS);
    const myOrders = orders.filter(o => o.acceptedBy === currentUser.id && o.status !== 'cancelled');
    
    const container = document.getElementById('my-orders-list');
    
    if (myOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <div class="empty-state-text">暂无已接订单</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = myOrders.map(order => {
        // 只有进行中的订单可以取消和完成
        const cancelButton = order.status === 'accepted' 
            ? `<button class="btn-small btn-delete" onclick="cancelOrder('${order.id}')">取消订单</button>`
            : '';
        
        // 完成订单按钮 - 只有进行中的订单显示
        const completeButton = order.status === 'accepted'
            ? `<button class="btn-small btn-accept" onclick="completeOrder('${order.id}')" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">完成订单</button>`
            : '';
        
        // 显示订单完成审核状态
        let completionStatusHtml = '';
        if (order.completionStatus === 'pending') {
            completionStatusHtml = `<div style="color: #f59e0b; font-weight: 600; margin-top: 8px; font-size: 14px;">⏳ 已完成，等待管理员审核</div>`;
        } else if (order.completionStatus === 'rejected') {
            completionStatusHtml = `<div style="color: #ef4444; font-weight: 600; margin-top: 8px; font-size: 14px;">❌ 审核不通过，请重新完成</div>`;
        }
        
        return `
        <div class="order-card">
            <div class="order-header">
                <span class="order-id">${order.id}</span>
                <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="order-info">
                <div class="info-item">
                    <span class="info-label">服务器</span>
                    <span class="info-value">${order.server}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">地图</span>
                    <span class="info-value">${order.map}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">老板ID</span>
                    <span class="info-value">${order.gameId}</span>
                </div>
            </div>
            <div class="order-price">¥${order.price}</div>
            ${completionStatusHtml}
            <div class="order-actions">
                <button class="btn-small btn-view" onclick="viewOrder('${order.id}')">查看详情</button>
                ${completeButton}
                ${cancelButton}
            </div>
        </div>
    `}).join('');
}

// 完成订单（提交审核）
function completeOrder(orderId) {
    if (!confirm('确定要完成这个订单吗？提交后需要管理员审核。')) return;
    
    let orders = getStorageData(STORAGE_KEYS.ORDERS);
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
        alert('订单不存在！');
        return;
    }
    
    // 更新订单完成状态为待审核
    orders[orderIndex].completionStatus = 'pending';
    orders[orderIndex].completedAt = new Date().toISOString();
    orders[orderIndex].completedBy = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER)).id;
    
    setStorageData(STORAGE_KEYS.ORDERS, orders);
    
    alert('订单完成已提交，等待管理员审核！');
    loadMyOrders();
}

// 取消订单
function cancelOrder(orderId) {
    if (!confirm('确定要取消这个订单吗？取消后订单将退回待接单状态。')) return;
    
    let orders = getStorageData(STORAGE_KEYS.ORDERS);
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
        alert('订单不存在！');
        return;
    }
    
    // 将订单状态改回待接单
    orders[orderIndex].status = 'pending';
    orders[orderIndex].acceptedBy = null;
    orders[orderIndex].acceptedAt = null;
    orders[orderIndex].cancelledAt = new Date().toISOString();
    orders[orderIndex].cancelledBy = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER)).id;
    
    setStorageData(STORAGE_KEYS.ORDERS, orders);
    
    alert('订单已取消！');
    loadMyOrders();
    loadOrders();
}

// 加载拒单订单
function loadRejectedOrders() {
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    const orders = getStorageData(STORAGE_KEYS.ORDERS);
    
    // 获取当前用户拒单的订单
    const rejectedOrders = orders.filter(o => {
        if (!o.rejectedBy || !Array.isArray(o.rejectedBy)) return false;
        return o.rejectedBy.some(r => r.userId === currentUser.id);
    });
    
    const container = document.getElementById('rejected-orders-list');
    
    if (rejectedOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚫</div>
                <div class="empty-state-text">暂无拒单订单</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = rejectedOrders.map(order => {
        // 判断订单状态
        let statusHtml = '';
        let actionButton = '';
        
        if (order.status === 'pending') {
            // 订单仍在待接单状态，可以恢复
            statusHtml = `<span class="order-status" style="color: #22c55e; font-weight: 600;">🟢 可恢复</span>`;
            actionButton = `<button class="btn-small btn-accept" onclick="restoreOrder('${order.id}')">恢复订单</button>`;
        } else if (order.status === 'accepted') {
            // 订单已被其他打手抢走
            statusHtml = `<span class="order-status" style="color: #ef4444; font-weight: 600;">🔴 已被其他打手抢走</span>`;
            actionButton = '';
        } else if (order.status === 'completed') {
            statusHtml = `<span class="order-status" style="color: #6b7280; font-weight: 600;">✅ 已完成</span>`;
            actionButton = '';
        } else if (order.status === 'cancelled') {
            statusHtml = `<span class="order-status" style="color: #6b7280; font-weight: 600;">❌ 已取消</span>`;
            actionButton = '';
        }
        
        return `
        <div class="order-card">
            <div class="order-header">
                <span class="order-id">${order.id}</span>
                ${statusHtml}
            </div>
            <div class="order-info">
                <div class="info-item">
                    <span class="info-label">服务器</span>
                    <span class="info-value">${order.server}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">地图</span>
                    <span class="info-value">${order.map}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">发布时间</span>
                    <span class="info-value">${formatDate(order.createdAt)}</span>
                </div>
            </div>
            <div class="order-price">¥${order.price}</div>
            <div class="order-actions">
                <button class="btn-small btn-view" onclick="viewOrder('${order.id}')">查看详情</button>
                ${actionButton}
            </div>
        </div>
    `}).join('');
}

// 恢复订单（从拒单列表中移除）
function restoreOrder(orderId) {
    if (!confirm('确定要恢复这个订单吗？恢复后订单将重新出现在接单大厅。')) return;
    
    let orders = getStorageData(STORAGE_KEYS.ORDERS);
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
        alert('订单不存在！');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    
    // 从拒单列表中移除当前用户
    if (orders[orderIndex].rejectedBy && Array.isArray(orders[orderIndex].rejectedBy)) {
        orders[orderIndex].rejectedBy = orders[orderIndex].rejectedBy.filter(
            r => r.userId !== currentUser.id
        );
    }
    
    setStorageData(STORAGE_KEYS.ORDERS, orders);
    
    alert('订单已恢复！您可以在接单大厅中看到该订单。');
    loadRejectedOrders();
}

// 加载处罚记录
function loadPunishments() {
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    const punishments = getStorageData(STORAGE_KEYS.PUNISHMENTS);
    // 过滤掉已撤回的处罚
    const myPunishments = punishments.filter(p => p.userId === currentUser.id && p.status !== '已撤回');

    const container = document.getElementById('punishments-list');

    if (myPunishments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <div class="empty-state-text">暂无处罚记录，继续保持！</div>
            </div>
        `;
        return;
    }

    container.innerHTML = myPunishments.map(p => {
        // 构建处罚详情显示
        let punishmentDetails = '';
        if (p.days && p.fine) {
            punishmentDetails = `禁单${p.days}天 + 罚款¥${p.fine}`;
        } else if (p.days) {
            punishmentDetails = `禁单${p.days}天`;
        } else if (p.fine) {
            punishmentDetails = `罚款¥${p.fine}`;
        }

        // 计算倒计时
        let countdownHtml = '';
        const now = Date.now();
        let endTime = null;
        let isPermanent = false;
        
        if (p.rawType === '永久封禁') {
            isPermanent = true;
        } else if (p.days && p.status === '进行中') {
            endTime = new Date(p.createdAt).getTime() + (p.days * 24 * 60 * 60 * 1000);
        }
        
        if (isPermanent) {
            countdownHtml = `
                <div class="punishment-countdown" style="color: #ef4444; font-weight: 700; margin-top: 8px; font-size: 14px; background: rgba(239, 68, 68, 0.1); padding: 8px; border-radius: 6px;" data-punishment-end="0" data-punishment-permanent="true">
                    ⏰ 剩余时间：永久
                </div>
            `;
        } else if (endTime && p.status === '进行中') {
            const remaining = endTime - now;
            if (remaining > 0) {
                const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
                const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
                const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
                
                let timeText = '';
                if (days > 0) {
                    timeText = `${days}天${hours}小时${minutes}分${seconds}秒`;
                } else if (hours > 0) {
                    timeText = `${hours}小时${minutes}分${seconds}秒`;
                } else if (minutes > 0) {
                    timeText = `${minutes}分${seconds}秒`;
                } else {
                    timeText = `${seconds}秒`;
                }
                
                countdownHtml = `
                    <div class="punishment-countdown" style="color: #ef4444; font-weight: 700; margin-top: 8px; font-size: 14px; background: rgba(239, 68, 68, 0.1); padding: 8px; border-radius: 6px;" data-punishment-end="${endTime}" data-punishment-permanent="false">
                        ⏰ 剩余时间：${timeText}
                    </div>
                `;
            } else {
                countdownHtml = `
                    <div class="punishment-countdown" style="color: #22c55e; font-weight: 700; margin-top: 8px; font-size: 14px; background: rgba(34, 197, 94, 0.1); padding: 8px; border-radius: 6px;">
                        ✅ 已结束
                    </div>
                `;
            }
        }

        // 构建罚款状态显示
        let fineStatusHtml = '';
        let payFineButton = '';
        
        if (p.fine) {
            // 罚款状态
            let fineStatusText = '';
            let fineStatusColor = '';
            
            switch(p.fineStatus) {
                case 'unpaid':
                case null:
                case undefined:
                    fineStatusText = '未缴纳';
                    fineStatusColor = '#ef4444';
                    // 显示缴纳按钮
                    if (p.status === '进行中') {
                        payFineButton = `
                            <button class="btn-pay-fine" onclick="submitFinePayment('${p.id}')" style="
                                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                                color: white;
                                border: none;
                                padding: 10px 16px;
                                border-radius: 8px;
                                font-weight: 600;
                                cursor: pointer;
                                margin-top: 12px;
                                width: 100%;
                                font-size: 14px;
                            ">
                                💰 已缴纳罚款，提交审核
                            </button>
                        `;
                    }
                    break;
                case 'pending':
                    fineStatusText = '已缴纳，等待审核';
                    fineStatusColor = '#f59e0b';
                    break;
                case 'approved':
                    fineStatusText = '审核通过';
                    fineStatusColor = '#22c55e';
                    break;
                case 'rejected':
                    fineStatusText = '审核不通过，需重新缴纳';
                    fineStatusColor = '#ef4444';
                    // 审核不通过，重新显示缴纳按钮
                    if (p.status === '进行中') {
                        payFineButton = `
                            <button class="btn-pay-fine" onclick="submitFinePayment('${p.id}')" style="
                                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                                color: white;
                                border: none;
                                padding: 10px 16px;
                                border-radius: 8px;
                                font-weight: 600;
                                cursor: pointer;
                                margin-top: 12px;
                                width: 100%;
                                font-size: 14px;
                            ">
                                💰 重新提交罚款审核
                            </button>
                        `;
                    }
                    break;
                default:
                    fineStatusText = '未知状态';
                    fineStatusColor = '#6b7280';
            }
            
            fineStatusHtml = `
                <div class="fine-status" style="color: ${fineStatusColor}; font-weight: 600; margin-top: 8px; font-size: 14px;">
                    💳 罚款状态：${fineStatusText}
                </div>
            `;
        }

        return `
            <div class="punishment-card">
                <div class="punishment-header">
                    <span class="punishment-type">${p.type}</span>
                    <span class="punishment-date">${formatDate(p.createdAt)}</span>
                </div>
                ${punishmentDetails ? `
                    <div class="punishment-details" style="color: #ef4444; font-weight: 600; margin-bottom: 8px; font-size: 14px;">
                        📋 ${punishmentDetails}
                    </div>
                ` : ''}
                <div class="punishment-reason">${p.reason}</div>
                <div class="punishment-status">状态：${p.status}</div>
                ${countdownHtml}
                ${fineStatusHtml}
                ${payFineButton}
            </div>
        `;
    }).join('');
}

// 提交罚款缴纳审核
function submitFinePayment(punishmentId) {
    if (!confirm('确定已缴纳罚款并提交审核吗？')) return;
    
    let punishments = getStorageData(STORAGE_KEYS.PUNISHMENTS);
    const punishmentIndex = punishments.findIndex(p => p.id === punishmentId);
    
    if (punishmentIndex === -1) {
        alert('处罚记录不存在！');
        return;
    }
    
    // 更新罚款状态为待审核
    punishments[punishmentIndex].fineStatus = 'pending';
    punishments[punishmentIndex].finePaidAt = new Date().toISOString();
    
    setStorageData(STORAGE_KEYS.PUNISHMENTS, punishments);
    
    alert('罚款缴纳已提交审核，请等待管理员审核！');
    loadPunishments();
}

// 加载公告
function loadAnnouncements() {
    const announcements = getStorageData(STORAGE_KEYS.ANNOUNCEMENTS);
    const container = document.getElementById('announcements-list');
    
    if (announcements.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📢</div>
                <div class="empty-state-text">暂无公告</div>
            </div>
        `;
        return;
    }
    
    // 按时间倒序排列
    const sortedAnnouncements = announcements.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    container.innerHTML = sortedAnnouncements.map(a => `
        <div class="announcement-card">
            <div class="announcement-header">
                <span class="announcement-title">${a.title}</span>
                <span class="announcement-date">${formatDate(a.createdAt)}</span>
            </div>
            <div class="announcement-content">${a.content}</div>
        </div>
    `).join('');
}

// 查看订单详情
function viewOrder(orderId) {
    const orders = getStorageData(STORAGE_KEYS.ORDERS);
    const order = orders.find(o => o.id === orderId);
    
    if (!order) return;
    
    const detailsHtml = `
        <div class="detail-row">
            <span class="detail-label">订单编号</span>
            <span class="detail-value">${order.id}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">老板ID</span>
            <span class="detail-value">${order.gameId}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">服务器</span>
            <span class="detail-value">${order.server}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">地图</span>
            <span class="detail-value">${order.map}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">服务要求</span>
            <span class="detail-value">${order.requirements}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">订单金额</span>
            <span class="detail-value" style="color: #00d4ff; font-size: 18px;">¥${order.price}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">发布时间</span>
            <span class="detail-value">${formatDate(order.createdAt)}</span>
        </div>
    `;
    
    document.getElementById('order-details').innerHTML = detailsHtml;
    document.getElementById('order-modal').classList.remove('hidden');
}

// 接单
function acceptOrder(orderId) {
    // 先检查处罚状态
    const punishmentStatus = checkUserPunishmentStatus();
    if (!punishmentStatus.canOperate) {
        alert(punishmentStatus.message);
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    const orders = getStorageData(STORAGE_KEYS.ORDERS);
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) return;
    
    if (confirm('确定要接这个订单吗？')) {
        orders[orderIndex].status = 'accepted';
        orders[orderIndex].acceptedBy = currentUser.id;
        orders[orderIndex].acceptedAt = new Date().toISOString();
        
        setStorageData(STORAGE_KEYS.ORDERS, orders);
        
        alert('接单成功！请及时联系老板。');
        loadOrders();
        loadMyOrders();
    }
}

// 关闭弹窗
function closeModal() {
    document.getElementById('order-modal').classList.add('hidden');
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        'pending': '待接单',
        'accepted': '进行中',
        'completed': '已完成'
    };
    return statusMap[status] || status;
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    initData();
    
    // 检查是否已登录
    const currentUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (currentUser) {
        showMainPage();
    }
});
