/**
 * VTH - Pure Client-Side Static Web App for GitHub Pages
 * Uses localStorage for secure credential storage & direct browser API/WebSocket telemetry.
 */

const ROOM_NAMES = {
    1: 'Nhà kho', 2: 'Phòng họp', 3: 'Phòng Giám đốc', 4: 'Phòng trò chuyện',
    5: 'Phòng Giám sát', 6: 'Văn phòng', 7: 'Phòng Tài Vụ', 8: 'Phòng Nhân sự'
};

// Global App State (stored in localStorage)
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
        recommended_room: 0,
        latest_killed_room: 0,
        latest_issue_id: 0,
        current_placed_bet: 0.0,
        rooms_data: [],
        scores: { 1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50, 7: 50, 8: 50 },
        top100_stats: {}
    },
    stats: {
        total: 0, wins: 0, losses: 0, streak: 0, max_streak: 0,
        lose_streak: 0, pnl: 0, current_bet: 0.1, history: []
    },
    selectedRoom: 1,
    lastLoggedIssue: 0,
    lastBettedIssue: 0,
    placedRoomId: 0,
    ws: null,
    waitElapsed: 0
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

document.addEventListener('DOMContentLoaded', () => {
    loadConfigFromLocalStorage();
    initRoomsGrid();
    setupEventListeners();
    populateConfigInputs();
    updateUI();

    if (appState.config.user_id && appState.config.secret_key) {
        initGameEngine();
    }
});

// LOAD & SAVE LOCALSTORAGE
function loadConfigFromLocalStorage() {
    try {
        const saved = localStorage.getItem('vth_config');
        if (saved) {
            const parsed = JSON.parse(saved);
            appState.config = { ...appState.config, ...parsed };
            appState.stats.current_bet = appState.config.base_bet || 0.1;
            addSystemLog(`Đã tải cấu hình từ localStorage (User ID: ${appState.config.user_id})`, 'info');
        }
    } catch (e) {
        console.error("LocalStorage load error:", e);
    }
}

function saveConfigToLocalStorage() {
    try {
        localStorage.setItem('vth_config', JSON.stringify(appState.config));
    } catch (e) {
        console.error("LocalStorage save error:", e);
    }
}

function populateConfigInputs() {
    if (elements.cfgUserId) elements.cfgUserId.value = appState.config.user_id || '';
    if (elements.cfgSecretKey) elements.cfgSecretKey.value = appState.config.secret_key || '';
    if (elements.cfgCoinType) elements.cfgCoinType.value = appState.config.coin_type || 'BUILD';
    if (elements.cfgBaseBet) elements.cfgBaseBet.value = appState.config.base_bet || 0.1;
    if (elements.cfgTrap) elements.cfgTrap.value = appState.config.trap_multiplier || 10;
    if (elements.cfgStrategy) elements.cfgStrategy.value = appState.config.selected_logic || 'hybrid_vth';
}

function initRoomsGrid() {
    if (!elements.roomsGrid) return;
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
    if (elements.autoBotSwitch) {
        elements.autoBotSwitch.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            appState.config.auto_bot = isChecked;
            saveConfigToLocalStorage();
            addSystemLog(`Chuyển trạng thái Auto Bot: ${isChecked ? 'BẬT (TỰ ĐỘNG CHƠI)' : 'TẮT'}`, 'warn');
            updateUI();
        });
    }

    if (elements.btnBetNow) {
        elements.btnBetNow.addEventListener('click', () => {
            if (!appState.config.auto_bot) {
                placeBet(appState.selectedRoom, appState.stats.current_bet || appState.config.base_bet);
            }
        });
    }
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

function clearSystemLogs() {
    if (elements.systemLogTerminal) {
        elements.systemLogTerminal.innerHTML = '<div class="log-line info"><span class="log-time">[SYSTEM]</span> Đã xóa nhật ký hệ thống.</div>';
    }
}

// REST & WEBSOCKET ENGINE (PURE STATIC)
function getApiHeaders() {
    return {
        'accept': '*/*',
        'accept-language': 'vi,en;q=0.9',
        'content-type': 'application/json',
        'user-id': String(appState.config.user_id),
        'user-login': 'login_v2',
        'user-secret-key': String(appState.config.secret_key),
        'xb-language': 'vi-VN'
    };
}

async function fetchBalance() {
    if (!appState.config.user_id || !appState.config.secret_key) return;
    try {
        const res = await fetch("https://wallet.3games.io/api/wallet/user_asset", {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ user_id: parseInt(appState.config.user_id), source: 'home' })
        });
        const data = await res.json();
        if (data.code === 0 && data.data && data.data.user_asset) {
            appState.balance = {
                USDT: parseFloat(data.data.user_asset.USDT || 0),
                WORLD: parseFloat(data.data.user_asset.WORLD || 0),
                BUILD: parseFloat(data.data.user_asset.BUILD || 0)
            };
            updateUI();
        }
    } catch (e) {
        console.error("Fetch balance error:", e);
    }
}

async function fetchRecent100() {
    if (!appState.config.user_id || !appState.config.secret_key) return;
    try {
        const url = `https://api.escapemaster.net/escape_game/recent_100_issues?asset=${appState.config.coin_type}`;
        const res = await fetch(url, { headers: getApiHeaders() });
        const data = await res.json();
        if (data.code === 0 && data.data && data.data.room_id_2_killed_times) {
            const parsed = {};
            for (let k in data.data.room_id_2_killed_times) {
                parsed[parseInt(k)] = parseInt(data.data.room_id_2_killed_times[k]);
            }
            appState.telemetry.top100_stats = parsed;
            computeAIScores();
            updateUI();
        }
    } catch (e) {
        console.error("Fetch recent 100 error:", e);
    }
}

async function fetchRecent10() {
    if (!appState.config.user_id || !appState.config.secret_key) return [];
    try {
        const url = `https://api.escapemaster.net/escape_game/recent_10_issues?asset=${appState.config.coin_type}`;
        const res = await fetch(url, { headers: getApiHeaders() });
        const data = await res.json();
        if (data.code === 0 && data.data && data.data.length > 0) {
            const latest = data.data[0];
            appState.telemetry.latest_issue_id = latest.issue_id || 0;
            appState.telemetry.latest_killed_room = latest.killed_room_id || 0;
            return data.data;
        }
    } catch (e) {
        console.error("Fetch recent 10 error:", e);
    }
    return [];
}

// AI SAFETY PREDICTOR
function computeAIScores() {
    const rooms = appState.telemetry.rooms_data || [];
    const top100 = appState.telemetry.top100_stats || {};
    const strategy = appState.config.selected_logic || 'hybrid_vth';

    let bets = rooms.map(r => r.total_bet_amount || 0);
    let users = rooms.map(r => r.user_cnt || 0);
    let maxBet = bets.length > 0 ? Math.max(...bets, 1.0) : 1.0;
    let maxUser = users.length > 0 ? Math.max(...users, 1) : 1;

    let scores = {};
    for (let rid = 1; rid <= 8; rid++) {
        const rData = rooms.find(r => r.room_id === rid) || {};
        const bet = rData.total_bet_amount || 0;
        const user = rData.user_cnt || 0;
        const killedCount = top100[rid] || top100[String(rid)] || 12;

        let score = 50.0;
        if (strategy === "lowest_bet") {
            score = (1.0 - (bet / maxBet)) * 100.0;
        } else if (strategy === "lowest_users") {
            score = (1.0 - (user / maxUser)) * 100.0;
        } else if (strategy === "target_cold_room") {
            score = 100 - killedCount;
        } else {
            // hybrid_vth
            let betFactor = (1.0 - (bet / maxBet));
            let userFactor = (1.0 - (user / maxUser));
            let coldFactor = (100 - killedCount) / 100.0;
            let recentPenalty = rid === appState.telemetry.latest_killed_room ? 0.3 : 0.0;
            score = (betFactor * 0.35 + userFactor * 0.25 + coldFactor * 0.40 - recentPenalty) * 100.0;
        }

        scores[rid] = Math.round(Math.max(5.0, Math.min(99.0, score)) * 10) / 10;
    }

    let bestRoom = 1;
    let maxScore = -1;
    for (let rid in scores) {
        if (scores[rid] > maxScore) {
            maxScore = scores[rid];
            bestRoom = parseInt(rid);
        }
    }

    appState.telemetry.scores = scores;
    appState.telemetry.recommended_room = bestRoom;
}

// BETTING ACTION
async function placeBet(roomId, amount) {
    if (!appState.config.user_id || !appState.config.secret_key) {
        alert("⚠️ Vui lòng cấu hình User ID và Secret Key trước khi cược.");
        return;
    }

    addSystemLog(`Đang gửi lệnh đặt cược ${amount} ${appState.config.coin_type} vào Phòng ${roomId}...`, 'bet');

    try {
        // Enter Room
        await fetch("https://api.escapemaster.net/escape_game/enter_room", {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
                asset_type: appState.config.coin_type,
                user_id: parseInt(appState.config.user_id),
                room_id: parseInt(roomId)
            })
        });

        // Place Bet
        const res = await fetch("https://api.escapemaster.net/escape_game/bet", {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
                asset_type: appState.config.coin_type,
                user_id: String(appState.config.user_id),
                room_id: parseInt(roomId),
                bet_amount: parseFloat(amount)
            })
        });
        const data = await res.json();

        if (data.code === 0) {
            appState.placedRoomId = parseInt(roomId);
            appState.telemetry.current_placed_bet = parseFloat(amount);
            addSystemLog(`✅ Đặt cược thành công: ${amount} ${appState.config.coin_type} vào Phòng ${roomId}`, 'win');
            updateUI();
        } else {
            addSystemLog(`❌ Đặt cược thất bại: ${data.msg || 'Lỗi server'}`, 'loss');
        }
    } catch (err) {
        addSystemLog(`❌ Lỗi mạng khi đặt cược: ${err}`, 'loss');
    }
}

// MAIN ENGINE CONTINUOUS LOOP
function initGameEngine() {
    fetchBalance();
    fetchRecent100();
    startWebSocket();

    let lastProcessedIssue = 0;

    // 1-second continuous loop (vthv9 logic)
    setInterval(async () => {
        if (!appState.config.user_id || !appState.config.secret_key) return;

        // Ticker
        if (appState.telemetry.phase === 'COUNTDOWN') {
            if (appState.telemetry.count_down > 0) {
                appState.telemetry.count_down--;
            } else {
                appState.telemetry.phase = 'WAITING_RESULT';
                appState.waitElapsed = 0;
            }
        } else if (appState.telemetry.phase === 'WAITING_RESULT') {
            appState.waitElapsed++;
            appState.telemetry.count_down = appState.waitElapsed;
        }

        // Poll recent 10 issues
        const recent10 = await fetchRecent10();
        if (recent10 && recent10.length > 0) {
            const finishedIssue = recent10[0].issue_id || 0;
            const killedRoom = recent10[0].killed_room_id || 0;
            const upcomingIssue = finishedIssue + 1;

            // Process round result
            if (finishedIssue > 0 && lastProcessedIssue !== finishedIssue) {
                lastProcessedIssue = finishedIssue;
                appState.telemetry.latest_issue_id = finishedIssue;
                appState.telemetry.latest_killed_room = killedRoom;
                appState.telemetry.phase = 'RESULT';

                if (appState.lastBettedIssue === finishedIssue) {
                    const isWin = (appState.placedRoomId !== killedRoom);
                    const betAmt = appState.stats.current_bet;

                    appState.stats.total++;
                    if (isWin) {
                        const pnlRound = betAmt * 0.12;
                        appState.stats.wins++;
                        appState.stats.streak++;
                        appState.stats.max_streak = Math.max(appState.stats.max_streak, appState.stats.streak);
                        appState.stats.lose_streak = 0;
                        appState.stats.pnl += pnlRound;
                        appState.stats.current_bet = appState.config.base_bet;
                        addSystemLog(`🎉 Kỳ #${finishedIssue} kết thúc: Sát thủ vào Phòng ${killedRoom}. Bạn THẮNG (+${pnlRound.toFixed(2)} ${appState.config.coin_type})!`, 'win');
                    } else {
                        const pnlRound = -betAmt;
                        appState.stats.losses++;
                        appState.stats.lose_streak++;
                        appState.stats.streak = 0;
                        appState.stats.pnl += pnlRound;
                        appState.stats.current_bet *= appState.config.trap_multiplier;
                        addSystemLog(`💥 Kỳ #${finishedIssue} kết thúc: Sát thủ vào Phòng ${killedRoom}. Bạn THUA (${pnlRound.toFixed(2)} ${appState.config.coin_type})!`, 'loss');
                    }

                    appState.stats.history.unshift({
                        issue_id: finishedIssue,
                        killed_room: killedRoom,
                        kq: isWin,
                        bet_amount: betAmt,
                        pnl: isWin ? betAmt * 0.12 : -betAmt,
                        timestamp: new Date().toLocaleTimeString('vi-VN')
                    });
                }
                fetchBalance();
                fetchRecent100();
            }

            // Advance upcoming issue
            if (appState.telemetry.issue_id < upcomingIssue) {
                appState.telemetry.issue_id = upcomingIssue;
                appState.telemetry.count_down = 10;
                appState.telemetry.phase = 'COUNTDOWN';
                appState.telemetry.current_placed_bet = 0.0;
            }

            // Auto Bot Trigger
            if (appState.config.auto_bot && upcomingIssue > 0 && appState.lastBettedIssue !== upcomingIssue) {
                computeAIScores();
                const recRoom = appState.telemetry.recommended_room || 1;
                appState.lastBettedIssue = upcomingIssue;
                addSystemLog(`🤖 Auto Bot cược Kỳ #${upcomingIssue} vào Phòng ${recRoom} (${ROOM_NAMES[recRoom]}) với ${appState.stats.current_bet} ${appState.config.coin_type}`, 'bet');
                placeBet(recRoom, appState.stats.current_bet);
            }
        }

        updateUI();
    }, 1000);
}

function startWebSocket() {
    try {
        const wsUrl = "wss://api.escapemaster.net/escape_master/ws";
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            ws.send(JSON.stringify({
                "msg_type": "handle_enter_game",
                "asset_type": appState.config.coin_type,
                "user_id": parseInt(appState.config.user_id),
                "user_secret_key": appState.config.secret_key
            }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.msg_type === "notify_count_down") {
                    appState.telemetry.count_down = data.count_down || 0;
                    appState.telemetry.phase = 'COUNTDOWN';
                } else if (data.msg_type === "notify_issue_stat") {
                    appState.telemetry.rooms_data = data.rooms || [];
                    appState.telemetry.issue_id = data.issue_id || appState.telemetry.issue_id;
                    computeAIScores();
                } else if (data.msg_type === "notify_result") {
                    appState.telemetry.latest_issue_id = data.issue_id || 0;
                    appState.telemetry.latest_killed_room = data.killed_room || 0;
                    appState.telemetry.phase = 'RESULT';
                }
                updateUI();
            } catch (e) {
                console.error("WS Parse error:", e);
            }
        };

        ws.onclose = () => {
            setTimeout(startWebSocket, 3000); // Reconnect after 3s
        };
    } catch (e) {
        console.error("WebSocket init error:", e);
    }
}

function updateUI() {
    if (elements.balanceBuild) elements.balanceBuild.innerText = (appState.balance.BUILD || 0).toFixed(2);
    if (elements.balanceUsdt) elements.balanceUsdt.innerText = (appState.balance.USDT || 0).toFixed(2);
    if (elements.autoBotSwitch) elements.autoBotSwitch.checked = appState.config.auto_bot;

    const hasConfig = appState.config.user_id && appState.config.secret_key;
    if (elements.cfgStatusBanner) {
        if (hasConfig) {
            elements.cfgStatusBanner.className = "status-banner configured";
            elements.cfgStatusBanner.querySelector('.status-icon').innerText = "🟢";
            elements.cfgStatusTitle.innerText = "TRẠNG THÁI: ĐÃ CẤU HÌNH TÀI KHOẢN & LƯU LOCALSTORAGE";
            elements.cfgStatusDesc.innerText = `User ID: ${appState.config.user_id} | Loại tiền: ${appState.config.coin_type} | Số dư: ${(appState.balance[appState.config.coin_type] || 0).toFixed(2)} ${appState.config.coin_type}`;
        } else {
            elements.cfgStatusBanner.className = "status-banner unconfigured";
            elements.cfgStatusBanner.querySelector('.status-icon').innerText = "🔴";
            elements.cfgStatusTitle.innerText = "TRẠNG THÁI: CHƯA CẤU HÌNH TÀI KHOẢN";
            elements.cfgStatusDesc.innerText = "Vui lòng nhập User ID và Secret Key bên dưới rồi nhấn Lưu để lưu vào localStorage.";
        }
    }

    const cd = appState.telemetry.count_down || 0;
    if (elements.timerCount) elements.timerCount.innerText = cd;

    if (elements.gamePhase) {
        if (appState.telemetry.phase === 'RESULT') {
            elements.gamePhase.innerText = "🚨 KẾT THÚC VÁN ĐẤU!";
            elements.gamePhase.style.color = "var(--accent-crimson)";
            if (elements.timerCircle) elements.timerCircle.style.strokeDashoffset = 264;
        } else if (appState.telemetry.phase === 'WAITING_RESULT') {
            elements.gamePhase.innerText = `⏳ CHỜ SÁT THỦ LỘ DIỆN (${cd}s)...`;
            elements.gamePhase.style.color = "var(--accent-gold)";
            if (elements.timerCircle) elements.timerCircle.style.strokeDashoffset = 0;
        } else {
            elements.gamePhase.innerText = cd <= 3 ? "🚨 SÁT THỦ XUẤT HIỆN!" : "ĐANG NHẬN CƯỢC";
            elements.gamePhase.style.color = cd <= 3 ? "var(--accent-crimson)" : "var(--accent-emerald)";
            const offset = 264 - (cd / 10) * 264;
            if (elements.timerCircle) elements.timerCircle.style.strokeDashoffset = Math.max(0, Math.min(264, offset));
        }
    }

    const recRoom = appState.telemetry.recommended_room || 0;
    if (elements.recommendedRoomName) {
        if (recRoom > 0) {
            elements.recommendedRoomName.innerText = `PHÒNG ${recRoom} - ${ROOM_NAMES[recRoom]}`;
            if (appState.config.auto_bot) {
                setTargetRoom(recRoom);
            }
        } else {
            elements.recommendedRoomName.innerText = `Đang phân tích...`;
        }
    }

    if (elements.displayIssueId) elements.displayIssueId.innerText = `#${appState.telemetry.issue_id || 0}`;
    const placedBet = appState.telemetry.current_placed_bet || appState.stats.current_bet || 0.1;
    if (elements.displayPlacedBet) elements.displayPlacedBet.innerText = `${placedBet.toFixed(1)} ${appState.config.coin_type}`;

    const roomsData = appState.telemetry.rooms_data || [];
    const selRoomInfo = roomsData.find(r => r.room_id === appState.selectedRoom) || {};
    if (elements.displayRoomBet) elements.displayRoomBet.innerText = `${selRoomInfo.total_bet_amount || 0} ${appState.config.coin_type}`;
    if (elements.displayRoomUsers) elements.displayRoomUsers.innerText = `${selRoomInfo.user_cnt || 0} người`;

    if (appState.telemetry.latest_issue_id > 0) {
        if (elements.latestIssueTitle) elements.latestIssueTitle.innerText = `#${appState.telemetry.latest_issue_id}`;
        const kRoom = appState.telemetry.latest_killed_room;
        if (elements.latestKilledRoomTitle) elements.latestKilledRoomTitle.innerText = kRoom > 0 ? `PHÒNG ${kRoom} (${ROOM_NAMES[kRoom]})` : '--';
    }

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
            if (rid === appState.telemetry.latest_killed_room && appState.telemetry.phase === 'RESULT') {
                cardEl.classList.add('killed');
            } else {
                cardEl.classList.remove('killed');
            }
        }
    }

    if (elements.statTotal) elements.statTotal.innerText = appState.stats.total || 0;
    if (elements.statWin) elements.statWin.innerText = appState.stats.wins || 0;
    if (elements.statLoss) elements.statLoss.innerText = appState.stats.losses || 0;
    const rate = appState.stats.total > 0 ? ((appState.stats.wins / appState.stats.total) * 100).toFixed(1) : "0.0";
    if (elements.statWinrate) elements.statWinrate.innerText = `${rate}%`;

    if (elements.statStreak) elements.statStreak.innerText = appState.stats.streak || 0;
    if (elements.statMaxWinStreak) elements.statMaxWinStreak.innerText = appState.stats.max_streak || 0;
    if (elements.statLossStreak) elements.statLossStreak.innerText = appState.stats.lose_streak || 0;

    const pnl = appState.stats.pnl || 0.0;
    if (elements.totalPnl) elements.totalPnl.innerText = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`;
    if (elements.pnlContainer) elements.pnlContainer.className = `stat-pill pnl-pill ${pnl >= 0 ? 'positive' : 'negative'}`;

    renderHistoryTable();
    updateBetButtonText();
}

function renderHistoryTable() {
    const history = appState.stats.history || [];
    if (history.length === 0 || !elements.historyTableBody) return;

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
    if (!elements.recent100Container) return;
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

function saveConfiguration(event) {
    event.preventDefault();
    appState.config = {
        user_id: document.getElementById('cfg-user-id').value.trim(),
        secret_key: document.getElementById('cfg-secret-key').value.trim(),
        coin_type: document.getElementById('cfg-coin-type').value,
        base_bet: parseFloat(document.getElementById('cfg-base-bet').value) || 0.1,
        trap_multiplier: parseFloat(document.getElementById('cfg-trap').value) || 10,
        selected_logic: document.getElementById('cfg-strategy').value,
        auto_bot: appState.config.auto_bot || false
    };

    appState.stats.current_bet = appState.config.base_bet;
    saveConfigToLocalStorage();

    const statusMsg = document.getElementById('config-status-msg');
    statusMsg.innerText = "✅ Đã lưu cấu hình vào localStorage thành công! Đang kết nối API VTH...";
    statusMsg.className = "status-msg success";
    addSystemLog(`✅ Đã lưu cấu hình vào localStorage (User ID: ${appState.config.user_id})`, 'win');

    initGameEngine();
    updateUI();
}
