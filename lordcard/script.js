const ROOM_NAMES = {
    1: 'Nhà kho', 2: 'Phòng họp', 3: 'Phòng Giám đốc', 4: 'Phòng trò chuyện',
    5: 'Phòng Giám sát', 6: 'Văn phòng', 7: 'Phòng Tài Vụ', 8: 'Phòng Nhân sự'
};

let appState = {
    config: {
        user_id: '',
        secret_key: '',
        coin_type: 'BUILD',
        base_bet: 0.1,
        trap_multiplier: 10,
        selected_logic: 'hybrid_vth',
        auto_bot: false
    },
    balance: { BUILD: 0, USDT: 0, WORLD: 0 },
    telemetry: {
        issue_id: 0,
        count_down: 10,
        phase: 'WAITING',
        recommended_room: 1,
        latest_killed_room: 0,
        latest_issue_id: 0,
        current_placed_bet: 0.0,
        rooms_data: [],
        scores: {},
        top100_stats: {}
    },
    stats: {
        total: 0, wins: 0, losses: 0, streak: 0, max_streak: 0,
        lose_streak: 0, pnl: 0, current_bet: 0.1, history: []
    },
    selectedRoom: 1,
    lastLoggedIssue: 0,
    configInputsPopulated: false
};

// DOM Elements
const elements = {
    balanceBuild: document.getElementById('balance-build'),
    balanceUsdt: document.getElementById('balance-usdt'),
    totalPnl: document.getElementById('total-pnl'),
    pnlContainer: document.getElementById('pnl-container'),
    vthConnBadge: document.getElementById('vth-conn-badge'),
    timerCount: document.getElementById('timer-count'),
    timerCircle: document.getElementById('timer-circle'),
    gamePhase: document.getElementById('game-phase'),
    displayIssueId: document.getElementById('display-issue-id'),
    displayPlacedBet: document.getElementById('display-placed-bet'),
    displayRoomBet: document.getElementById('display-room-bet'),
    displayRoomUsers: document.getElementById('display-room-users'),
    latestIssueTitle: document.getElementById('latest-issue-title'),
    latestKilledRoomTitle: document.getElementById('latest-killed-room-title'),
    autoBotSwitch: document.getElementById('auto-bot-switch'),
    btnBetNow: document.getElementById('btn-bet-now'),
    roomsGrid: document.getElementById('rooms-grid'),
    recommendedRoomName: document.getElementById('recommended-room-name'),
    statTotal: document.getElementById('stat-total'),
    statWin: document.getElementById('stat-win'),
    statLoss: document.getElementById('stat-loss'),
    statWinrate: document.getElementById('stat-winrate'),
    statStreak: document.getElementById('stat-streak'),
    statMaxWinStreak: document.getElementById('stat-max-win-streak'),
    statLossStreak: document.getElementById('stat-loss-streak'),
    historyTableBody: document.getElementById('history-table-body'),
    recent100Container: document.getElementById('recent-100-container'),
    systemLogTerminal: document.getElementById('system-log-terminal'),

    // Config tab elements
    cfgStatusBanner: document.getElementById('cfg-status-banner'),
    cfgStatusTitle: document.getElementById('cfg-status-title'),
    cfgStatusDesc: document.getElementById('cfg-status-desc'),
    cfgUserId: document.getElementById('cfg-user-id'),
    cfgSecretKey: document.getElementById('cfg-secret-key'),
    cfgCoinType: document.getElementById('cfg-coin-type'),
    cfgBaseBet: document.getElementById('cfg-base-bet'),
    cfgTrap: document.getElementById('cfg-trap'),
    cfgStrategy: document.getElementById('cfg-strategy')
};

let pollIntervalId = null;

document.addEventListener('DOMContentLoaded', () => {
    initRoomsGrid();
    setupEventListeners();
    loadConfigFromLocalStorage();
    fetchAppState();

    // Smart 3.5s polling loop (72% reduction in network requests)
    startSmartPolling();

    // Client-side smooth timer tick (runs locally every 1s, ZERO network requests)
    setInterval(tickLocalTimer, 1000);

    // Pause polling when tab is hidden to eliminate background requests
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopSmartPolling();
        } else {
            fetchAppState();
            startSmartPolling();
        }
    });
});

function startSmartPolling() {
    if (!pollIntervalId) {
        pollIntervalId = setInterval(fetchAppState, 3500); // 3.5s Smart Sync
    }
}

function stopSmartPolling() {
    if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
    }
}

function tickLocalTimer() {
    if (!appState.telemetry) return;
    if (appState.telemetry.count_down > 0) {
        appState.telemetry.count_down -= 1;
    }
    updateTimerDisplayOnly();
}

function updateTimerDisplayOnly() {
    if (!elements.timerCount || !elements.gamePhase) return;
    const cd = appState.telemetry.count_down || 0;
    elements.timerCount.innerText = cd;

    if (appState.telemetry.phase === 'PAUSE_10S') {
        elements.gamePhase.innerText = `⏳ CHỜ 10S CHUYỂN KỲ MỚI (${cd}s)...`;
        const offset = 264 - (cd / 10) * 264;
        if (elements.timerCircle) elements.timerCircle.style.strokeDashoffset = Math.max(0, Math.min(264, offset));
    } else if (appState.telemetry.phase === 'WAITING_RESULT') {
        elements.gamePhase.innerText = `⏳ ĐANG CHỜ KẾT QUẢ SÁT THỦ (${cd}s)...`;
        if (elements.timerCircle) elements.timerCircle.style.strokeDashoffset = 0;
    } else if (appState.telemetry.phase === 'COUNTDOWN') {
        elements.gamePhase.innerText = cd <= 3 ? "🚨 SÁT THỦ XUẤT HIỆN!" : "ĐANG NHẬN CƯỢC";
        const offset = 264 - (cd / 10) * 264;
        if (elements.timerCircle) elements.timerCircle.style.strokeDashoffset = Math.max(0, Math.min(264, offset));
    }
}

function loadConfigFromLocalStorage() {
    try {
        const saved = localStorage.getItem('vth_config');
        if (saved) {
            const parsed = JSON.parse(saved);
            appState.config = { ...appState.config, ...parsed };
            addSystemLog(`Đã tải cấu hình từ localStorage (User ID: ${appState.config.user_id})`, 'info');

            // Sync credentials to Python backend in-memory
            fetch('/api/save_config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appState.config)
            });
        }
    } catch (e) {
        console.error("LocalStorage load error:", e);
    }
}

function saveConfigToLocalStorage(configData) {
    try {
        localStorage.setItem('vth_config', JSON.stringify(configData));
    } catch (e) {
        console.error("LocalStorage save error:", e);
    }
}

function initRoomsGrid() {
    elements.roomsGrid.innerHTML = '';
    for (let rid = 1; rid <= 8; rid++) {
        const card = document.createElement('div');
        card.className = `room-card ${rid === appState.selectedRoom ? 'selected-user' : ''}`;
        card.id = `room-card-${rid}`;
        card.onclick = () => selectRoomManual(rid);

        card.innerHTML = `
            <div class="room-card-header">
                <span class="room-number">PHÒNG 0${rid}</span>
                <span class="ai-score-badge" id="ai-score-${rid}">50.0%</span>
            </div>
            <div class="room-name-row">
                <div class="room-name">${ROOM_NAMES[rid]}</div>
                <span class="current-room-badge" id="current-badge-${rid}" style="display: ${rid === appState.selectedRoom ? 'inline-block' : 'none'};">🎯 ĐANG Ở PHÒNG NÀY</span>
            </div>
            <div class="room-metrics">
                <div class="metric-line">
                    <span>Số tiền cược:</span>
                    <strong id="room-bet-${rid}">0 ${appState.config.coin_type}</strong>
                </div>
                <div class="metric-line">
                    <span>Số người chơi:</span>
                    <strong id="room-users-${rid}">0 người</strong>
                </div>
                <div class="metric-line">
                    <span>Diệt (100 kỳ):</span>
                    <strong id="room-kills-${rid}">0 lần</strong>
                </div>
            </div>
            <div class="score-bar-bg">
                <div class="score-bar-fill" id="score-fill-${rid}" style="width: 50%;"></div>
            </div>
        `;
        elements.roomsGrid.appendChild(card);
    }
}

function setupEventListeners() {
    elements.autoBotSwitch.addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        appState.config.auto_bot = isChecked;
        saveConfigToLocalStorage(appState.config);
        addSystemLog(`Chuyển trạng thái Auto Bot: ${isChecked ? 'BẬT (TỰ ĐỘNG CHƠI)' : 'TẮT'}`, 'warn');
        await fetch('/api/toggle_bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auto_bot: isChecked })
        });
    });

    elements.btnBetNow.addEventListener('click', async () => {
        if (!appState.config.auto_bot) {
            placeManualBet();
        }
    });
}

function selectRoomManual(rid) {
    if (appState.config.auto_bot) return;
    setTargetRoom(rid);
}

function setTargetRoom(rid) {
    if (!rid || rid < 1 || rid > 8) return;
    appState.selectedRoom = rid;
    updateRoomHighlights();
    updateBetButtonText();
}

function updateRoomHighlights() {
    for (let rid = 1; rid <= 8; rid++) {
        const cardEl = document.getElementById(`room-card-${rid}`);
        const badgeEl = document.getElementById(`current-badge-${rid}`);

        if (cardEl) {
            if (rid === appState.selectedRoom) {
                cardEl.classList.add('selected-user');
                if (badgeEl) badgeEl.style.display = 'inline-block';
            } else {
                cardEl.classList.remove('selected-user');
                if (badgeEl) badgeEl.style.display = 'none';
            }
        }
    }
}

function updateBetButtonText() {
    if (elements.btnBetNow) {
        if (appState.config.auto_bot) {
            elements.btnBetNow.disabled = true;
            elements.btnBetNow.innerText = `🤖 AUTO BOT DÙNG THUẬT TOÁN (PHÒNG ${appState.selectedRoom})`;
            elements.btnBetNow.style.opacity = "0.6";
        } else {
            elements.btnBetNow.disabled = false;
            elements.btnBetNow.style.opacity = "1";
            elements.btnBetNow.innerText = `🚀 ĐẶT ${appState.stats.current_bet || 0.1} ${appState.config.coin_type} VÀO PHÒNG ${appState.selectedRoom}`;
        }
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const activeContent = document.getElementById(tabId);
    if (activeContent) activeContent.classList.add('active');
    event.target.classList.add('active');

    if (tabId === 'analytics-tab') {
        renderRecent100Stats();
    }
}

function addSystemLog(msg, level = 'info') {
    if (!elements.systemLogTerminal) return;
    const timeStr = new Date().toLocaleTimeString('vi-VN');
    const line = document.createElement('div');
    line.className = `log-line ${level}`;
    line.innerHTML = `<span class="log-time">[${timeStr}]</span> ${msg}`;
    elements.systemLogTerminal.appendChild(line);
    elements.systemLogTerminal.scrollTop = elements.systemLogTerminal.scrollHeight;
}

let lastRenderedLogCount = -1;

function renderServerLogs(logs) {
    if (!logs || !elements.systemLogTerminal) return;
    if (logs.length === lastRenderedLogCount) return;

    elements.systemLogTerminal.innerHTML = '';
    logs.forEach(item => {
        const line = document.createElement('div');
        line.className = `log-line ${item.level || 'info'}`;
        line.innerHTML = `<span class="log-time">[${item.time}]</span> ${item.msg}`;
        elements.systemLogTerminal.appendChild(line);
    });
    elements.systemLogTerminal.scrollTop = elements.systemLogTerminal.scrollHeight;
    lastRenderedLogCount = logs.length;
}

async function fetchAppState() {
    try {
        const res = await fetch('/api/state');
        const data = await res.json();

        appState.config = { ...appState.config, ...data.config };
        appState.balance = data.balance || appState.balance;
        appState.telemetry = data.telemetry || appState.telemetry;
        appState.stats = data.stats || appState.stats;

        renderServerLogs(data.system_logs || []);
        updateUI();
    } catch (err) {
        console.error("State Sync error:", err);
    }
}

function updateUI() {
    // Balances
    elements.balanceBuild.innerText = (appState.balance.BUILD || 0).toFixed(2);
    elements.balanceUsdt.innerText = (appState.balance.USDT || 0).toFixed(2);

    if (elements.autoBotSwitch) elements.autoBotSwitch.checked = appState.config.auto_bot;

    // POPULATE CONFIG TAB INPUTS & STATUS BANNER
    const hasConfig = appState.config.user_id && appState.config.secret_key;
    if (elements.cfgStatusBanner) {
        if (hasConfig) {
            elements.cfgStatusBanner.className = "status-banner configured";
            elements.cfgStatusBanner.querySelector('.status-icon').innerText = "🟢";
            elements.cfgStatusTitle.innerText = "TRẠNG THÁI: ĐÃ CẤU HÌNH TÀI KHOẢN (LƯU LOCALSTORAGE)";
            elements.cfgStatusDesc.innerText = `User ID: ${appState.config.user_id} | Loại tiền: ${appState.config.coin_type} | Số dư: ${(appState.balance[appState.config.coin_type] || 0).toFixed(2)} ${appState.config.coin_type}`;
        } else {
            elements.cfgStatusBanner.className = "status-banner unconfigured";
            elements.cfgStatusBanner.querySelector('.status-icon').innerText = "🔴";
            elements.cfgStatusTitle.innerText = "TRẠNG THÁI: CHƯA CẤU HÌNH TÀI KHOẢN";
            elements.cfgStatusDesc.innerText = "Vui lòng nhập User ID và Secret Key bên dưới rồi nhấn Lưu để lưu vào localStorage.";
        }
    }

    // Populate inputs if not focused
    if (!appState.configInputsPopulated || (document.activeElement !== elements.cfgUserId && document.activeElement !== elements.cfgSecretKey)) {
        if (elements.cfgUserId && appState.config.user_id) elements.cfgUserId.value = appState.config.user_id;
        if (elements.cfgSecretKey && appState.config.secret_key) elements.cfgSecretKey.value = appState.config.secret_key;
        if (elements.cfgCoinType && appState.config.coin_type) elements.cfgCoinType.value = appState.config.coin_type;
        if (elements.cfgBaseBet && appState.config.base_bet) elements.cfgBaseBet.value = appState.config.base_bet;
        if (elements.cfgTrap && appState.config.trap_multiplier) elements.cfgTrap.value = appState.config.trap_multiplier;
        if (elements.cfgStrategy && appState.config.selected_logic) elements.cfgStrategy.value = appState.config.selected_logic;
        appState.configInputsPopulated = true;
    }

    // Countdown Timer SVG & Phase
    const cd = appState.telemetry.count_down || 0;
    elements.timerCount.innerText = cd;

    if (appState.telemetry.phase === 'RESULT') {
        elements.gamePhase.innerText = "🚨 KẾT THÚC VÁN - ĐANG TÍNH THẮNG THUA!";
        elements.gamePhase.style.color = "var(--accent-crimson)";
        elements.timerCircle.style.strokeDashoffset = 264;
    } else if (appState.telemetry.phase === 'PAUSE_10S') {
        elements.gamePhase.innerText = `⏳ CHỜ 10S CHUYỂN KỲ MỚI (${cd}s)...`;
        elements.gamePhase.style.color = "var(--accent-gold)";
        const offset = 264 - (cd / 10) * 264;
        elements.timerCircle.style.strokeDashoffset = Math.max(0, Math.min(264, offset));
    } else if (appState.telemetry.phase === 'WAITING_RESULT') {
        elements.gamePhase.innerText = `⏳ ĐANG CHỜ KẾT QUẢ SÁT THỦ (${cd}s)...`;
        elements.gamePhase.style.color = "var(--accent-gold)";
        elements.timerCircle.style.strokeDashoffset = 0;
    } else {
        elements.gamePhase.innerText = cd <= 3 ? "🚨 SÁT THỦ XUẤT HIỆN!" : "ĐANG NHẬN CƯỢC";
        elements.gamePhase.style.color = cd <= 3 ? "var(--accent-crimson)" : "var(--accent-emerald)";
        const offset = 264 - (cd / 10) * 264;
        elements.timerCircle.style.strokeDashoffset = Math.max(0, Math.min(264, offset));
    }

    // AI Recommendation & Auto Bot target sync
    const recRoom = appState.telemetry.recommended_room || 1;
    elements.recommendedRoomName.innerText = `PHÒNG ${recRoom} - ${ROOM_NAMES[recRoom]}`;
    if (appState.config.auto_bot) {
        setTargetRoom(recRoom);
    }

    // Left Control Panel Info
    elements.displayIssueId.innerText = `#${appState.telemetry.issue_id || 0}`;
    const placedBet = appState.telemetry.current_placed_bet || appState.stats.current_bet || 0.1;
    elements.displayPlacedBet.innerText = `${placedBet.toFixed(1)} ${appState.config.coin_type}`;

    const roomsData = appState.telemetry.rooms_data || [];
    const selRoomInfo = roomsData.find(r => r.room_id === appState.selectedRoom) || {};
    elements.displayRoomBet.innerText = `${selRoomInfo.total_bet_amount || 0} ${appState.config.coin_type}`;
    elements.displayRoomUsers.innerText = `${selRoomInfo.user_cnt || 0} người`;

    // Latest Finished Round Bar
    if (appState.telemetry.latest_issue_id > 0) {
        elements.latestIssueTitle.innerText = `#${appState.telemetry.latest_issue_id}`;
        const kRoom = appState.telemetry.latest_killed_room;
        elements.latestKilledRoomTitle.innerText = kRoom > 0 ? `PHÒNG ${kRoom} (${ROOM_NAMES[kRoom]})` : '--';
    }

    // Update 8 Room Cards Live Data
    const top100Map = appState.telemetry.top100_stats || {};
    for (let rid = 1; rid <= 8; rid++) {
        const rData = roomsData.find(r => r.room_id === rid) || {};
        const score = (appState.telemetry.scores || {})[rid] || 50.0;
        const killCount = top100Map[rid] || top100Map[String(rid)] || 0;

        const betEl = document.getElementById(`room-bet-${rid}`);
        const userEl = document.getElementById(`room-users-${rid}`);
        const killsEl = document.getElementById(`room-kills-${rid}`);
        const scoreEl = document.getElementById(`ai-score-${rid}`);
        const fillEl = document.getElementById(`score-fill-${rid}`);
        const cardEl = document.getElementById(`room-card-${rid}`);

        if (betEl) betEl.innerText = `${rData.total_bet_amount || 0} ${appState.config.coin_type}`;
        if (userEl) userEl.innerText = `${rData.user_cnt || 0} người`;
        if (killsEl) killsEl.innerText = `${killCount} lần`;
        if (scoreEl) scoreEl.innerText = `${score.toFixed(1)}%`;
        if (fillEl) fillEl.style.width = `${Math.min(100, Math.max(5, score))}%`;

        if (cardEl) {
            if (rid === appState.telemetry.latest_killed_room && (appState.telemetry.phase === 'RESULT' || appState.telemetry.phase === 'PAUSE_10S')) {
                cardEl.classList.add('killed');
            } else {
                cardEl.classList.remove('killed');
            }
        }
    }

    // Right Analytics Panel Stats
    elements.statTotal.innerText = appState.stats.total || 0;
    elements.statWin.innerText = appState.stats.wins || 0;
    elements.statLoss.innerText = appState.stats.losses || 0;
    const rate = appState.stats.total > 0 ? ((appState.stats.wins / appState.stats.total) * 100).toFixed(1) : "0.0";
    elements.statWinrate.innerText = `${rate}%`;

    elements.statStreak.innerText = appState.stats.streak || 0;
    elements.statMaxWinStreak.innerText = appState.stats.max_streak || 0;
    elements.statLossStreak.innerText = appState.stats.lose_streak || 0;

    const pnl = appState.stats.pnl || 0.0;
    elements.totalPnl.innerText = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`;
    elements.pnlContainer.className = `stat-pill pnl-pill ${pnl >= 0 ? 'positive' : 'negative'}`;

    renderHistoryTable();
    updateBetButtonText();
}

function renderHistoryTable() {
    const history = appState.stats.history || [];
    if (history.length === 0) return;

    elements.historyTableBody.innerHTML = '';
    history.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${item.issue_id}</td>
            <td>P.${item.killed_room} (${ROOM_NAMES[item.killed_room]})</td>
            <td style="color: ${item.kq ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}; font-weight: 700;">
                ${item.kq ? 'THẮNG' : 'THUA'}
            </td>
            <td style="color: ${item.pnl >= 0 ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}; font-weight: 700;">
                ${item.pnl >= 0 ? '+' : ''}${item.pnl.toFixed(2)}
            </td>
        `;
        elements.historyTableBody.appendChild(row);
    });
}

function renderRecent100Stats() {
    const top100Map = appState.telemetry.top100_stats || {};
    elements.recent100Container.innerHTML = '';
    for (let rid = 1; rid <= 8; rid++) {
        const count = top100Map[rid] || top100Map[String(rid)] || 0;
        const box = document.createElement('div');
        box.className = 'room-stat-box';
        box.innerHTML = `
            <div class="room-name">${ROOM_NAMES[rid]} (PHÒNG 0${rid})</div>
            <div class="stat-killed-count">${count} LẦN</div>
            <div style="font-size: 11px; color: var(--text-muted);">Sát thủ xuất hiện trong 100 kỳ qua</div>
        `;
        elements.recent100Container.appendChild(box);
    }
}

async function saveConfiguration(event) {
    event.preventDefault();
    const configData = {
        user_id: document.getElementById('cfg-user-id').value.trim(),
        secret_key: document.getElementById('cfg-secret-key').value.trim(),
        coin_type: document.getElementById('cfg-coin-type').value,
        base_bet: parseFloat(document.getElementById('cfg-base-bet').value) || 0.1,
        trap_multiplier: parseFloat(document.getElementById('cfg-trap').value) || 10,
        selected_logic: document.getElementById('cfg-strategy').value
    };

    saveConfigToLocalStorage(configData);

    const statusMsg = document.getElementById('config-status-msg');
    statusMsg.innerText = "⏳ Đang kết nối API VTH và lưu cấu hình vào localStorage...";
    statusMsg.className = "status-msg";

    try {
        const res = await fetch('/api/save_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData)
        });
        const result = await res.json();
        if (result.status === 'ok') {
            statusMsg.innerText = "✅ Đã lưu cấu hình vào localStorage thành công! (Không ghi file đĩa)";
            statusMsg.className = "status-msg success";
            appState.configInputsPopulated = false;
            fetchAppState();
        } else {
            statusMsg.innerText = `❌ Lỗi: ${result.error || 'Khởi tạo không thành công'}`;
            statusMsg.className = "status-msg error";
        }
    } catch (err) {
        statusMsg.innerText = `❌ Lỗi kết nối server local: ${err}`;
        statusMsg.className = "status-msg error";
    }
}

async function placeManualBet() {
    try {
        const res = await fetch('/api/bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room_id: appState.selectedRoom,
                amount: appState.stats.current_bet || appState.config.base_bet
            })
        });
        const result = await res.json();
        if (result.status === 'ok') {
            alert(`✅ ${result.msg}`);
        } else {
            alert(`❌ Đặt cược không thành công: ${result.error || 'Vui lòng kiểm tra lại cấu hình'}`);
        }
    } catch (err) {
        alert(`❌ Lỗi mạng: ${err}`);
    }
}
