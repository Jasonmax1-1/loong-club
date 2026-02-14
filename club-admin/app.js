// 数据存储键名（与打手端保持一致）
const STORAGE_KEYS = {
    USERS: 'metro_escort_users',
    CURRENT_ADMIN: 'metro_escort_current_admin',
    ORDERS: 'metro_escort_orders',
    PUNISHMENTS: 'metro_escort_punishments',
    ANNOUNCEMENTS: 'metro_escort_announcements',
    COMPLAINTS: 'metro_escort_complaints'
};

// 管理员账号（预设）
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

// 实时更新定时器
let realtimeUpdateInterval = null;

// 获取存储数据
function getStorageData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

// 设置存储数据
function setStorageData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// 登录处理
document.getElementById('login-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        const admin = { username: username, role: 'admin' };
        localStorage.setItem(STORAGE_KEYS.CURRENT_ADMIN, JSON.stringify(admin));
        showMainPage();
        startRealtimeUpdate();
    } else {
        alert('账号或密码错误！');
    }
});

// 显示主页面
function showMainPage() {
    const currentAdmin = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_ADMIN));
    if (!currentAdmin) return;
    
    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('main-page').classList.remove('hidden');
    
    document.getElementById('admin-name').textContent = currentAdmin.username;
    
    loadDashboard();
}

// 退出登录
function logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_ADMIN);
    stopRealtimeUpdate();
    document.getElementById('main-page').classList.add('hidden');
    document.getElementById('auth-page').classList.remove('hidden');
    document.getElementById('login-form').reset();
}

// 开始实时更新
function startRealtimeUpdate() {
    // 每秒更新一次处罚倒计时
    realtimeUpdateInterval = setInterval(() => {
        updatePunishmentCountdowns();
    }, 1000);
}

// 停止实时更新
function stopRealtimeUpdate() {
    if (realtimeUpdateInterval) {
        clearInterval(realtimeUpdateInterval);
        realtimeUpdateInterval = null;
    }
}

// 更新处罚倒计时
function updatePunishmentCountdowns() {
    const countdownElements = document.querySelectorAll('[data-punishment-end]');
    countdownElements.forEach(el => {
        const endTime = parseInt(el.dataset.punishmentEnd);
        const now = Date.now();
        const remaining = endTime - now;
        
        if (remaining <= 0) {
            el.textContent = '已解除';
            el.style.color = '#22c55e';
        } else {
            const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            
            if (days > 0) {
                el.textContent = `剩余 ${days}天 ${hours}小时 ${minutes}分 ${seconds}秒`;
            } else {
                el.textContent = `剩余 ${hours}小时 ${minutes}分 ${seconds}秒`;
            }
        }
    });
}

// 切换页面
function showPage(page) {
    // 隐藏所有页面
    document.querySelectorAll('.content-page').forEach(p => p.classList.add('hidden'));
    document.getElementById(page + '-page').classList.remove('hidden');
    
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    
    // 加载对应数据
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'punishments':
            loadPunishments();
            break;
        case 'complaints':
            loadComplaints();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

// 加载数据概览
function loadDashboard() {
    const orders = getStorageData(STORAGE_KEYS.ORDERS);
    const users = getStorageData(STORAGE_KEYS.USERS);
    const complaints = getStorageData(STORAGE_KEYS.COMPLAINTS);
    const punishments = getStorageData(STORAGE_KEYS.PUNISHMENTS);
    
    document.getElementById('stat-orders').textContent = orders.length;
    document.getElementById('stat-pending').textContent = orders.filter(o => o.status === 'pending').length;
    document.getElementById('stat-ongoing').textContent = orders.filter(o => o.status === 'accepted').length;
    document.getElementById('stat-users').textContent = users.length;
    document.getElementById('stat-complaints').textContent = complaints.filter(c => c.status === 'pending').length;
    document.getElementById('stat-punishments').textContent = punishments.length;
}

// 加载订单列表
function loadOrders() {
    const orders = getStorageData(STORAGE_KEYS.ORDERS);
    const container = document.getElementById('orders-list');

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">暂无订单</div>
            </div>
        `;
        return;
    }

    // 按时间倒序排列
    const sortedOrders = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    container.innerHTML = sortedOrders.map(order => {
        // 构建操作按钮
        let actionButtons = '';
        
        // 如果有完成审核待处理，显示审核按钮
        if (order.completionStatus === 'pending') {
            actionButtons += `<button class="btn-small btn-handle" onclick="reviewOrderCompletion('${order.id}')">审核完成</button>`;
        }
        
        actionButtons += `
            <button class="btn-small btn-view" onclick="viewOrder('${order.id}')">查看</button>
            <button class="btn-small btn-delete" onclick="deleteOrder('${order.id}')">删除</button>
        `;
        
        // 显示完成审核状态
        let completionStatusHtml = '';
        if (order.completionStatus === 'pending') {
            const users = getStorageData(STORAGE_KEYS.USERS);
            const completedBy = users.find(u => u.id === order.completedBy);
            completionStatusHtml = `
                <div class="info-item">
                    <span class="info-label">完成审核</span>
                    <span class="info-value" style="color: #f59e0b; font-weight: 600;">⏳ 打手${completedBy ? completedBy.name : '未知'}已完成，待审核</span>
                </div>
            `;
        } else if (order.completionStatus === 'approved') {
            completionStatusHtml = `
                <div class="info-item">
                    <span class="info-label">完成审核</span>
                    <span class="info-value" style="color: #22c55e; font-weight: 600;">✅ 审核通过</span>
                </div>
            `;
        } else if (order.completionStatus === 'rejected') {
            completionStatusHtml = `
                <div class="info-item">
                    <span class="info-label">完成审核</span>
                    <span class="info-value" style="color: #ef4444; font-weight: 600;">❌ 审核不通过，已打回</span>
                </div>
            `;
        }
        
        return `
        <div class="data-card">
            <div class="data-header">
                <span class="data-id">${order.id}</span>
                <span class="data-status status-${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="data-info">
                <div class="info-item">
                    <span class="info-label">老板ID</span>
                    <span class="info-value">${order.gameId}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">服务器</span>
                    <span class="info-value">${order.server}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">地图</span>
                    <span class="info-value">${order.map}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">价格</span>
                    <span class="info-value" style="color: #3b82f6; font-weight: 600;">¥${order.price}</span>
                </div>
                ${completionStatusHtml}
            </div>
            <div class="data-actions">
                ${actionButtons}
            </div>
        </div>
    `}).join('');
}

// 加载处罚列表
function loadPunishments() {
    const punishments = getStorageData(STORAGE_KEYS.PUNISHMENTS);
    const users = getStorageData(STORAGE_KEYS.USERS);
    const container = document.getElementById('punishments-list');

    // 过滤掉已撤回的处罚
    const activePunishments = punishments.filter(p => p.status !== '已撤回');

    if (activePunishments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <div class="empty-state-text">暂无处罚记录</div>
            </div>
        `;
        return;
    }

    // 按时间倒序排列
    const sortedPunishments = activePunishments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    container.innerHTML = sortedPunishments.map(p => {
        const user = users.find(u => u.id === p.userId);
        
        // 计算结束时间
        let endTime = null;
        let isPermanent = false;
        if (p.rawType === '永久封禁') {
            isPermanent = true;
        } else if (p.days) {
            endTime = new Date(p.createdAt).getTime() + (p.days * 24 * 60 * 60 * 1000);
        }
        
        const now = Date.now();
        const isActive = isPermanent || (endTime && endTime > now);

        // 构建处罚详情显示
        let punishmentDetails = '';
        if (p.days && p.fine) {
            punishmentDetails = `禁单${p.days}天 + 罚款¥${p.fine}`;
        } else if (p.days) {
            punishmentDetails = `禁单${p.days}天`;
        } else if (p.fine) {
            punishmentDetails = `罚款¥${p.fine}`;
        } else {
            punishmentDetails = p.type;
        }

        // 构建倒计时显示
        let countdownHtml = '';
        if (isPermanent) {
            countdownHtml = `<span style="color: #dc2626; font-weight: 600;">永久封禁</span>`;
        } else if (endTime) {
            countdownHtml = `<span data-punishment-end="${endTime}" style="color: #f59e0b; font-weight: 600;">计算中...</span>`;
        } else {
            countdownHtml = `<span style="color: #22c55e;">已结束</span>`;
        }

        // 构建操作按钮
        let actionButtons = '';
        
        // 撤回处罚按钮（所有进行中的处罚都可以撤回）
        if (p.status === '进行中' || p.status === 'active') {
            actionButtons += `<button class="btn-small btn-delete" onclick="revokePunishment('${p.id}')">撤回处罚</button>`;
        }
        
        // 罚款审核按钮（等待审核状态）
        if (p.fineStatus === 'pending') {
            actionButtons += `<button class="btn-small btn-handle" onclick="reviewFine('${p.id}')">审核罚款</button>`;
        }

        return `
            <div class="data-card" style="border-left: 4px solid ${isActive ? '#ef4444' : '#22c55e'};">
                <div class="data-header">
                    <span class="data-title">${user ? user.name : '未知用户'}</span>
                    <span class="data-status status-${isActive ? 'unhandled' : 'handled'}">${p.type}</span>
                </div>
                <div class="data-info">
                    ${p.days || p.fine ? `
                        <div class="info-item">
                            <span class="info-label">处罚详情</span>
                            <span class="info-value" style="color: #ef4444; font-weight: 600;">${punishmentDetails}</span>
                        </div>
                    ` : ''}
                    ${p.fine ? `
                        <div class="info-item">
                            <span class="info-label">罚款状态</span>
                            <span class="info-value" style="color: ${getFineStatusColor(p.fineStatus)}; font-weight: 600;">${getFineStatusText(p.fineStatus)}</span>
                        </div>
                    ` : `
                        <div class="info-item">
                            <span class="info-label">状态</span>
                            <span class="info-value">${countdownHtml}</span>
                        </div>
                    `}
                    <div class="info-item">
                        <span class="info-label">处罚原因</span>
                        <span class="info-value">${p.reason}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">处罚时间</span>
                        <span class="info-value">${formatDate(p.createdAt)}</span>
                    </div>
                </div>
                ${actionButtons ? `<div class="data-actions">${actionButtons}</div>` : ''}
            </div>
        `;
    }).join('');
    
    // 立即更新一次倒计时
    updatePunishmentCountdowns();
}

// 获取罚款状态颜色
function getFineStatusColor(status) {
    const colorMap = {
        'pending': '#f59e0b',
        'paid': '#3b82f6',
        'approved': '#22c55e',
        'rejected': '#ef4444'
    };
    return colorMap[status] || '#6b7280';
}

// 获取罚款状态文本
function getFineStatusText(status) {
    const textMap = {
        'pending': '打手已缴纳，待审核',
        'paid': '已缴纳',
        'approved': '审核通过',
        'rejected': '审核不通过'
    };
    return textMap[status] || '未缴纳';
}

// 撤回处罚
function revokePunishment(punishmentId) {
    if (!confirm('确定要撤回这个处罚吗？此操作不可恢复。')) return;
    
    let punishments = getStorageData(STORAGE_KEYS.PUNISHMENTS);
    const punishmentIndex = punishments.findIndex(p => p.id === punishmentId);
    
    if (punishmentIndex === -1) {
        alert('处罚记录不存在！');
        return;
    }
    
    // 将处罚状态改为已撤回
    punishments[punishmentIndex].status = '已撤回';
    punishments[punishmentIndex].revokedAt = new Date().toISOString();
    
    setStorageData(STORAGE_KEYS.PUNISHMENTS, punishments);
    
    alert('处罚已撤回！');
    loadPunishments();
    loadDashboard();
}

// 当前审核的罚款ID
let currentFineReviewId = null;

// 审核罚款
function reviewFine(punishmentId) {
    currentFineReviewId = punishmentId;
    const punishments = getStorageData(STORAGE_KEYS.PUNISHMENTS);
    const punishment = punishments.find(p => p.id === punishmentId);
    
    if (!punishment) return;
    
    const users = getStorageData(STORAGE_KEYS.USERS);
    const user = users.find(u => u.id === punishment.userId);
    
    // 填充审核信息
    document.getElementById('fine-review-dasher').textContent = user ? user.name : '未知用户';
    document.getElementById('fine-review-amount').textContent = `¥${punishment.fine}`;
    document.getElementById('fine-review-reason').textContent = punishment.reason;
    
    // 重置表单
    document.getElementById('fine-review-form').reset();
    
    document.getElementById('fine-review-modal').classList.remove('hidden');
}

// 提交罚款审核
document.getElementById('fine-review-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!currentFineReviewId) return;
    
    const result = document.getElementById('fine-review-result').value;
    const remark = document.getElementById('fine-review-remark').value;
    
    let punishments = getStorageData(STORAGE_KEYS.PUNISHMENTS);
    const punishmentIndex = punishments.findIndex(p => p.id === currentFineReviewId);
    
    if (punishmentIndex === -1) return;
    
    if (result === 'approved') {
        // 审核通过 - 处罚结束
        punishments[punishmentIndex].fineStatus = 'approved';
        punishments[punishmentIndex].status = '已结束';
        punishments[punishmentIndex].fineReviewRemark = remark;
        punishments[punishmentIndex].fineReviewedAt = new Date().toISOString();
        
        alert('罚款审核通过！处罚已结束。');
    } else {
        // 审核不通过 - 重新进行处罚流程
        punishments[punishmentIndex].fineStatus = 'rejected';
        punishments[punishmentIndex].fineReviewRemark = remark;
        punishments[punishmentIndex].fineReviewedAt = new Date().toISOString();
        
        // 创建新的处罚记录（重新开始流程）
        const newPunishment = {
            id: 'PUN' + Date.now(),
            userId: punishments[punishmentIndex].userId,
            type: punishments[punishmentIndex].type,
            rawType: punishments[punishmentIndex].rawType,
            days: punishments[punishmentIndex].days,
            fine: punishments[punishmentIndex].fine,
            reason: punishments[punishmentIndex].reason + '（罚款审核不通过，重新处罚）',
            status: '进行中',
            fineStatus: null,
            createdAt: new Date().toISOString(),
            parentId: currentFineReviewId // 关联原处罚
        };
        
        punishments.push(newPunishment);
        
        alert('罚款审核不通过！已重新创建处罚流程，打手需要重新缴纳罚款。');
    }
    
    setStorageData(STORAGE_KEYS.PUNISHMENTS, punishments);
    
    closeModal('fine-review-modal');
    this.reset();
    currentFineReviewId = null;
    loadPunishments();
    loadDashboard();
});

// 加载投诉列表
function loadComplaints() {
    const complaints = getStorageData(STORAGE_KEYS.COMPLAINTS);
    const container = document.getElementById('complaints-list');
    
    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">暂无投诉记录</div>
            </div>
        `;
        return;
    }
    
    // 按时间倒序排列
    const sortedComplaints = complaints.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    container.innerHTML = sortedComplaints.map(c => `
        <div class="data-card">
            <div class="data-header">
                <span class="data-title">投诉：${c.dasherName}</span>
                <span class="data-status status-${c.status === 'pending' ? 'unhandled' : 'handled'}">
                    ${c.status === 'pending' ? '待处理' : '已处理'}
                </span>
            </div>
            <div class="data-info">
                <div class="info-item">
                    <span class="info-label">投诉人</span>
                    <span class="info-value">${c.customerName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">对局时间</span>
                    <span class="info-value">${c.gameTime}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">投诉理由</span>
                    <span class="info-value">${c.reason}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">董事长介入</span>
                    <span class="info-value">${c.needChairman ? '是' : '否'}</span>
                </div>
            </div>
            ${c.status === 'pending' ? `
                <div class="data-actions">
                    <button class="btn-small btn-handle" onclick="handleComplaint('${c.id}')">处理投诉</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// 加载公告列表
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
    const sortedAnnouncements = announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    container.innerHTML = sortedAnnouncements.map(a => `
        <div class="data-card">
            <div class="data-header">
                <span class="data-title">${a.title}</span>
                <span class="data-id">${formatDate(a.createdAt)}</span>
            </div>
            <div class="data-info">
                <div class="info-item" style="grid-column: 1 / -1;">
                    <span class="info-value">${a.content}</span>
                </div>
            </div>
            <div class="data-actions">
                <button class="btn-small btn-delete" onclick="deleteAnnouncement('${a.id}')">删除</button>
            </div>
        </div>
    `).join('');
}

// 加载打手列表
function loadUsers() {
    const users = getStorageData(STORAGE_KEYS.USERS);
    const container = document.getElementById('users-list');
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-text">暂无注册打手</div>
            </div>
        `;
        return;
    }
    
    // 按注册时间倒序排列
    const sortedUsers = users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    container.innerHTML = sortedUsers.map(u => `
        <div class="data-card">
            <div class="data-header">
                <span class="data-title">${u.name}</span>
                <span class="data-id">${u.phone}</span>
            </div>
            <div class="data-info">
                <div class="info-item">
                    <span class="info-label">注册时间</span>
                    <span class="info-value">${formatDate(u.createdAt)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 显示新建订单弹窗
function showCreateOrderModal() {
    document.getElementById('create-order-modal').classList.remove('hidden');
}

// 显示新增处罚弹窗
function showCreatePunishmentModal() {
    const users = getStorageData(STORAGE_KEYS.USERS);
    const select = document.getElementById('punishment-user');

    if (users.length === 0) {
        alert('暂无可处罚的打手！');
        return;
    }

    select.innerHTML = users.map(u => `
        <option value="${u.id}">${u.name} (${u.phone})</option>
    `).join('');

    // 重置表单
    document.getElementById('create-punishment-form').reset();
    document.getElementById('custom-days-group').classList.add('hidden');
    document.getElementById('fine-amount-group').classList.add('hidden');

    document.getElementById('create-punishment-modal').classList.remove('hidden');
}

// 处罚类型改变时显示/隐藏自定义字段
function onPunishmentTypeChange() {
    const type = document.getElementById('punishment-type').value;
    const daysGroup = document.getElementById('custom-days-group');
    const fineGroup = document.getElementById('fine-amount-group');
    const daysInput = document.getElementById('punishment-days');
    const fineInput = document.getElementById('punishment-fine');

    // 重置必填属性
    daysInput.removeAttribute('required');
    fineInput.removeAttribute('required');

    if (type === '禁单') {
        daysGroup.classList.remove('hidden');
        fineGroup.classList.add('hidden');
        daysInput.setAttribute('required', 'required');
        fineInput.value = '';
    } else if (type === '罚款') {
        daysGroup.classList.add('hidden');
        fineGroup.classList.remove('hidden');
        fineInput.setAttribute('required', 'required');
        daysInput.value = '';
    } else if (type === '禁单+罚款') {
        daysGroup.classList.remove('hidden');
        fineGroup.classList.remove('hidden');
        daysInput.setAttribute('required', 'required');
        fineInput.setAttribute('required', 'required');
    } else {
        daysGroup.classList.add('hidden');
        fineGroup.classList.add('hidden');
        daysInput.value = '';
        fineInput.value = '';
    }
}

// 显示发布公告弹窗
function showCreateAnnouncementModal() {
    document.getElementById('create-announcement-modal').classList.remove('hidden');
}

// 关闭弹窗
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// 新建订单
document.getElementById('create-order-form')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const newOrder = {
        id: 'ORD' + Date.now(),
        gameId: document.getElementById('order-game-id').value,
        server: document.getElementById('order-server').value,
        map: document.getElementById('order-map').value,
        price: parseFloat(document.getElementById('order-price').value),
        requirements: document.getElementById('order-requirements').value,
        status: 'pending',
        createdAt: new Date().toISOString(),
        acceptedBy: null
    };

    const orders = getStorageData(STORAGE_KEYS.ORDERS);
    orders.push(newOrder);
    setStorageData(STORAGE_KEYS.ORDERS, orders);

    alert('订单创建成功！');
    closeModal('create-order-modal');
    this.reset();
    loadOrders();
    loadDashboard();
});

// 新增处罚
document.getElementById('create-punishment-form')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const type = document.getElementById('punishment-type').value;
    const days = document.getElementById('punishment-days').value;
    const fine = document.getElementById('punishment-fine').value;
    const userId = document.getElementById('punishment-user').value;

    // 构建处罚类型显示文本
    let typeDisplay = type;
    if (type === '禁单' && days) {
        typeDisplay = `禁单${days}天`;
    } else if (type === '罚款' && fine) {
        typeDisplay = `罚款¥${fine}`;
    } else if (type === '禁单+罚款' && days && fine) {
        typeDisplay = `禁单${days}天+罚款¥${fine}`;
    }

    const newPunishment = {
        id: 'PUN' + Date.now(),
        userId: userId,
        type: typeDisplay,
        rawType: type,
        days: days ? parseInt(days) : null,
        fine: fine ? parseFloat(fine) : null,
        fineStatus: fine ? 'unpaid' : null, // 如果有罚款，初始状态为未缴纳
        reason: document.getElementById('punishment-reason').value,
        status: '进行中',
        createdAt: new Date().toISOString()
    };

    const punishments = getStorageData(STORAGE_KEYS.PUNISHMENTS);
    punishments.push(newPunishment);
    setStorageData(STORAGE_KEYS.PUNISHMENTS, punishments);

    // 如果是禁单处罚，自动取消该打手进行中的订单
    if ((type === '禁单' || type === '禁单+罚款' || type === '永久封禁') && days) {
        let orders = getStorageData(STORAGE_KEYS.ORDERS);
        let cancelledCount = 0;
        
        orders = orders.map(order => {
            if (order.acceptedBy === userId && order.status === 'accepted') {
                cancelledCount++;
                return {
                    ...order,
                    status: 'cancelled',
                    cancelledAt: new Date().toISOString(),
                    cancelReason: '因禁单处罚自动取消'
                };
            }
            return order;
        });
        
        setStorageData(STORAGE_KEYS.ORDERS, orders);
        
        if (cancelledCount > 0) {
            alert(`处罚添加成功！已自动取消该打手${cancelledCount}个进行中的订单。`);
        } else {
            alert('处罚添加成功！');
        }
    } else {
        alert('处罚添加成功！');
    }
    
    closeModal('create-punishment-modal');
    this.reset();
    document.getElementById('custom-days-group').classList.add('hidden');
    document.getElementById('fine-amount-group').classList.add('hidden');
    loadPunishments();
    loadDashboard();
    loadOrders();
});

// 发布公告
document.getElementById('create-announcement-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const newAnnouncement = {
        id: 'ANN' + Date.now(),
        title: document.getElementById('announcement-title').value,
        content: document.getElementById('announcement-content').value,
        createdAt: new Date().toISOString()
    };
    
    const announcements = getStorageData(STORAGE_KEYS.ANNOUNCEMENTS);
    announcements.push(newAnnouncement);
    setStorageData(STORAGE_KEYS.ANNOUNCEMENTS, announcements);
    
    alert('公告发布成功！');
    closeModal('create-announcement-modal');
    this.reset();
    loadAnnouncements();
});

// 当前处理的投诉ID
let currentComplaintId = null;

// 处理投诉
function handleComplaint(complaintId) {
    currentComplaintId = complaintId;
    const complaints = getStorageData(STORAGE_KEYS.COMPLAINTS);
    const complaint = complaints.find(c => c.id === complaintId);
    
    if (!complaint) return;
    
    const detailsHtml = `
        <div class="detail-row">
            <span class="detail-label">投诉人</span>
            <span class="detail-value">${complaint.customerName}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">投诉人电话</span>
            <span class="detail-value">${complaint.customerPhone}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">被投诉打手</span>
            <span class="detail-value">${complaint.dasherName}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">对局时间</span>
            <span class="detail-value">${complaint.gameTime}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">投诉理由</span>
            <span class="detail-value">${complaint.reason}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">董事长介入</span>
            <span class="detail-value">${complaint.needChairman ? '是' : '否'}</span>
        </div>
    `;
    
    document.getElementById('complaint-details').innerHTML = detailsHtml;
    document.getElementById('handle-complaint-modal').classList.remove('hidden');
}

// 提交投诉处理
document.getElementById('handle-complaint-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!currentComplaintId) return;
    
    const complaints = getStorageData(STORAGE_KEYS.COMPLAINTS);
    const complaintIndex = complaints.findIndex(c => c.id === currentComplaintId);
    
    if (complaintIndex === -1) return;
    
    complaints[complaintIndex].status = 'handled';
    complaints[complaintIndex].result = document.getElementById('complaint-result').value;
    complaints[complaintIndex].remark = document.getElementById('complaint-remark').value;
    complaints[complaintIndex].handledAt = new Date().toISOString();
    
    setStorageData(STORAGE_KEYS.COMPLAINTS, complaints);
    
    alert('投诉处理完成！');
    closeModal('handle-complaint-modal');
    this.reset();
    currentComplaintId = null;
    loadComplaints();
    loadDashboard();
});

// 删除订单
function deleteOrder(orderId) {
    if (!confirm('确定要删除这个订单吗？')) return;
    
    let orders = getStorageData(STORAGE_KEYS.ORDERS);
    orders = orders.filter(o => o.id !== orderId);
    setStorageData(STORAGE_KEYS.ORDERS, orders);
    
    loadOrders();
    loadDashboard();
}

// 当前审核的订单完成ID
let currentOrderCompletionId = null;

// 审核订单完成
function reviewOrderCompletion(orderId) {
    currentOrderCompletionId = orderId;
    const orders = getStorageData(STORAGE_KEYS.ORDERS);
    const order = orders.find(o => o.id === orderId);
    
    if (!order) return;
    
    const users = getStorageData(STORAGE_KEYS.USERS);
    const completedBy = users.find(u => u.id === order.completedBy);
    
    // 填充订单详情
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
            <span class="detail-label">价格</span>
            <span class="detail-value" style="color: #3b82f6; font-weight: 600;">¥${order.price}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">完成打手</span>
            <span class="detail-value">${completedBy ? completedBy.name : '未知'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">服务要求</span>
            <span class="detail-value">${order.requirements}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">提交完成时间</span>
            <span class="detail-value">${formatDate(order.completedAt)}</span>
        </div>
    `;
    
    document.getElementById('order-completion-details').innerHTML = detailsHtml;
    document.getElementById('order-completion-form').reset();
    document.getElementById('order-completion-modal').classList.remove('hidden');
}

// 提交订单完成审核
document.getElementById('order-completion-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!currentOrderCompletionId) return;
    
    const result = document.getElementById('order-completion-result').value;
    const remark = document.getElementById('order-completion-remark').value;
    
    let orders = getStorageData(STORAGE_KEYS.ORDERS);
    const orderIndex = orders.findIndex(o => o.id === currentOrderCompletionId);
    
    if (orderIndex === -1) return;
    
    if (result === 'approved') {
        // 审核通过 - 订单完成
        orders[orderIndex].completionStatus = 'approved';
        orders[orderIndex].status = 'completed';
        orders[orderIndex].completionReviewRemark = remark;
        orders[orderIndex].completionReviewedAt = new Date().toISOString();
        
        alert('审核通过！订单已完成。');
    } else {
        // 审核不通过 - 打回订单
        orders[orderIndex].completionStatus = 'rejected';
        orders[orderIndex].completionReviewRemark = remark;
        orders[orderIndex].completionReviewedAt = new Date().toISOString();
        // 清除完成时间，让打手可以重新提交
        orders[orderIndex].completedAt = null;
        
        alert('审核不通过！订单已打回，打手可以重新提交完成。');
    }
    
    setStorageData(STORAGE_KEYS.ORDERS, orders);
    
    closeModal('order-completion-modal');
    this.reset();
    currentOrderCompletionId = null;
    loadOrders();
    loadDashboard();
});

// 删除公告
function deleteAnnouncement(announcementId) {
    if (!confirm('确定要删除这个公告吗？')) return;
    
    let announcements = getStorageData(STORAGE_KEYS.ANNOUNCEMENTS);
    announcements = announcements.filter(a => a.id !== announcementId);
    setStorageData(STORAGE_KEYS.ANNOUNCEMENTS, announcements);
    
    loadAnnouncements();
}

// 查看订单详情
function viewOrder(orderId) {
    const orders = getStorageData(STORAGE_KEYS.ORDERS);
    const order = orders.find(o => o.id === orderId);

    if (!order) return;

    alert(`
订单详情：

订单编号：${order.id}
老板ID：${order.gameId}
服务器：${order.server}
地图：${order.map}
价格：¥${order.price}
服务要求：${order.requirements}
状态：${getStatusText(order.status)}
创建时间：${formatDate(order.createdAt)}
    `);
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
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已登录
    const currentAdmin = localStorage.getItem(STORAGE_KEYS.CURRENT_ADMIN);
    if (currentAdmin) {
        showMainPage();
        startRealtimeUpdate();
    }
});
