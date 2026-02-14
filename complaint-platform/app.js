// 数据存储键名（与其他两端保持一致）
const STORAGE_KEYS = {
    USERS: 'metro_escort_users',
    ORDERS: 'metro_escort_orders',
    PUNISHMENTS: 'metro_escort_punishments',
    ANNOUNCEMENTS: 'metro_escort_announcements',
    COMPLAINTS: 'metro_escort_complaints'
};

// 实时更新计时器
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

// 初始化数据（如果还没有数据）
function initData() {
    // 初始化投诉数据
    if (!localStorage.getItem(STORAGE_KEYS.COMPLAINTS)) {
        localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify([]));
    }
}

// 启动实时更新
function startRealtimeUpdate() {
    // 清除已有的计时器
    if (realtimeUpdateInterval) {
        clearInterval(realtimeUpdateInterval);
    }
    
    // 每3秒检查一次投诉状态更新（投诉平台不需要每秒更新）
    realtimeUpdateInterval = setInterval(() => {
        checkComplaintStatusUpdate();
    }, 3000);
}

// 停止实时更新
function stopRealtimeUpdate() {
    if (realtimeUpdateInterval) {
        clearInterval(realtimeUpdateInterval);
        realtimeUpdateInterval = null;
    }
}

// 检查投诉状态更新
function checkComplaintStatusUpdate() {
    // 获取最新的投诉数据
    const complaints = getStorageData(STORAGE_KEYS.COMPLAINTS);
    
    // 如果有正在显示的投诉列表，刷新它
    const complaintsList = document.getElementById('complaints-list');
    if (complaintsList && !complaintsList.classList.contains('hidden')) {
        loadComplaintsList();
    }
}

// 加载投诉列表（用于查看投诉状态）
function loadComplaintsList() {
    const complaints = getStorageData(STORAGE_KEYS.COMPLAINTS);
    const container = document.getElementById('complaints-list');
    
    if (!container) return;
    
    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">暂无投诉记录</div>
            </div>
        `;
        return;
    }
    
    // 按时间倒序排列
    const sortedComplaints = complaints.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    container.innerHTML = sortedComplaints.map(c => `
        <div class="complaint-card">
            <div class="complaint-header">
                <span class="complaint-id">${c.id}</span>
                <span class="complaint-status status-${c.status}">${getStatusText(c.status)}</span>
            </div>
            <div class="complaint-info">
                <div class="info-item">
                    <span class="info-label">对局时间</span>
                    <span class="info-value">${c.gameTime}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">投诉打手</span>
                    <span class="info-value">${c.dasherName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">投诉原因</span>
                    <span class="info-value">${c.reason.substring(0, 50)}${c.reason.length > 50 ? '...' : ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">需要董事长介入</span>
                    <span class="info-value">${c.needChairman ? '是' : '否'}</span>
                </div>
            </div>
            <div class="complaint-time">提交时间：${formatDate(c.createdAt)}</div>
        </div>
    `).join('');
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        'pending': '待处理',
        'processing': '处理中',
        'resolved': '已解决',
        'rejected': '已驳回'
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

// 表单提交处理
document.getElementById('complaint-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // 获取表单数据
    const gameTime = document.getElementById('game-time').value;
    const customerName = document.getElementById('customer-name').value.trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();
    const dasherName = document.getElementById('dasher-name').value.trim();
    const reason = document.getElementById('complaint-reason').value.trim();
    const needChairman = document.getElementById('need-chairman').checked;
    
    // 验证数据
    if (!gameTime || !customerName || !customerPhone || !dasherName || !reason) {
        alert('请填写所有必填项！');
        return;
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(customerPhone)) {
        alert('请输入正确的手机号！');
        return;
    }
    
    // 创建投诉对象
    const newComplaint = {
        id: 'COMP' + Date.now(),
        gameTime: formatGameTime(gameTime),
        customerName: customerName,
        customerPhone: customerPhone,
        dasherName: dasherName,
        reason: reason,
        needChairman: needChairman,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    // 保存到本地存储
    const complaints = getStorageData(STORAGE_KEYS.COMPLAINTS);
    complaints.push(newComplaint);
    setStorageData(STORAGE_KEYS.COMPLAINTS, complaints);
    
    // 显示成功消息
    showSuccessMessage();
});

// 格式化对局时间
function formatGameTime(datetimeLocal) {
    const date = new Date(datetimeLocal);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 显示成功消息
function showSuccessMessage() {
    document.getElementById('complaint-form').classList.add('hidden');
    document.querySelector('.header-section').classList.add('hidden');
    document.getElementById('success-message').classList.remove('hidden');
}

// 重置表单
function resetForm() {
    document.getElementById('complaint-form').reset();
    document.getElementById('complaint-form').classList.remove('hidden');
    document.querySelector('.header-section').classList.remove('hidden');
    document.getElementById('success-message').classList.add('hidden');
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    initData();
    
    // 设置对局时间输入框的最大值为当前时间
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('game-time').max = now.toISOString().slice(0, 16);
    
    // 启动实时更新
    startRealtimeUpdate();
});

// 页面卸载时停止实时更新
window.addEventListener('beforeunload', function() {
    stopRealtimeUpdate();
});
