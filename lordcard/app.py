# -*- coding: utf-8 -*-
"""
VTH - Escape Master Web Control & Analytics Server
Integrated 100% 1-to-1 with vthv10.py's exact APIs, 12 strategy logics, WebSocket execution loop, and stats.
"""

import http.server
import socketserver
import json
import os
import time
import random
import statistics
import threading
import requests
import websocket
from collections import Counter, deque
from urllib.parse import parse_qs, urlparse

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(DIRECTORY, 'static') if os.path.exists(os.path.join(DIRECTORY, 'static')) else DIRECTORY
CONFIG_FILE = os.path.join(DIRECTORY, 'config.json')

ROOM_NAMES = {
    1: 'Nhà kho', 2: 'Phòng họp', 3: 'Phòng Giám đốc', 4: 'Phòng trò chuyện',
    5: 'Phòng Giám sát', 6: 'Văn phòng', 7: 'Phòng Tài Vụ', 8: 'Phòng Nhân sự'
}

# --- THUẬT TOÁN CHỌN PHÒNG NGUYÊN BẢN TỪ VTHV10.PY ---

def chon_phongv7(data_top10, data_top100):
    try:
        dem = [0] * 8
        if data_top10 and len(data_top10) > 1 and data_top10[1]:
            for i in range(len(dem)):
                for j in data_top10[1]:
                    if i + 1 == j:
                        dem[i] += 1
        min1 = dem[0]
        x1 = 0
        for i in range(1, len(dem)):
            if min1 >= dem[i]:
                min1 = dem[i]
                x1 = i
        x1 += 1

        x2 = 1
        if data_top100 and '1' in data_top100:
            min2 = data_top100.get('1', 12)
            for i in range(2, 9):
                val = data_top100.get(str(i), 12)
                if min2 >= val:
                    min2 = val
                    x2 = i
        result = random.choice([x1, x2])
        return result
    except Exception:
        return random.randint(1, 8)

def chon_phong_logic10(data, data_10, data_100, history):
    scores = {i: 0 for i in range(1, 9)}
    rooms = data.get('rooms', [])
    if rooms:
        sorted_by_bet = sorted(rooms, key=lambda x: x.get('total_bet_amount', 0))
        for i, room in enumerate(sorted_by_bet):
            scores[room['room_id']] += (8 - i)

    if data_100:
        sorted_by_kills = sorted(data_100.items(), key=lambda item: item[1])
        for i, (room_id, kills) in enumerate(sorted_by_kills):
            scores[int(room_id)] += (8 - i)

    recent_kills = data_10[1] if (data_10 and len(data_10) > 1) else []
    for room_id in range(1, 9):
        if room_id in recent_kills:
            safety_streak = recent_kills.index(room_id)
            scores[room_id] += safety_streak
        else:
            scores[room_id] += 10

    if history:
        last_killed = history[0].get('killed_room', 1)
        scores[last_killed] -= 15

    best_room = max(scores, key=scores.get) if scores else random.randint(1, 8)
    return best_room

def chon_phong_logic11(data, data_10, data_100, history):
    scores = {i: 0 for i in range(1, 9)}
    rooms = data.get('rooms', [])
    if rooms:
        sorted_by_bet = sorted(rooms, key=lambda x: x.get('total_bet_amount', 0))
        for i, room in enumerate(sorted_by_bet):
            scores[room['room_id']] += (8 - i) * 1.0

    if data_100:
        sorted_by_kills = sorted(data_100.items(), key=lambda item: item[1])
        for i, (room_id, kills) in enumerate(sorted_by_kills):
            scores[int(room_id)] += (8 - i) * 1.2

    recent_kills = data_10[1] if (data_10 and len(data_10) > 1) else []
    for room_id in range(1, 9):
        if room_id in recent_kills:
            safety_streak = recent_kills.index(room_id)
            scores[room_id] += safety_streak
        else:
            scores[room_id] += 10

    if rooms:
        avg_bet_rooms = []
        for room in rooms:
            cnt = room.get('user_cnt', 0)
            avg_bet = (room.get('total_bet_amount', 0) / cnt) if cnt > 0 else 0
            avg_bet_rooms.append({'room_id': room['room_id'], 'avg_bet': avg_bet})
        sorted_by_avg = sorted(avg_bet_rooms, key=lambda x: x['avg_bet'], reverse=True)
        for i, room_info in enumerate(sorted_by_avg):
            scores[room_info['room_id']] -= (8 - i)

    if history:
        last_killed = history[0].get('killed_room', 1)
        bonus_points = 5
        if 1 <= last_killed <= 4:
            for r_id in range(5, 9): scores[r_id] += bonus_points
        else:
            for r_id in range(1, 5): scores[r_id] += bonus_points
        scores[last_killed] -= 20

    best_room = max(scores, key=scores.get) if scores else random.randint(1, 8)
    return best_room

def chon_phong_vthv10(int_logic, data, data_10, data_100, auto_join, history):
    try:
        int_logic = int(int_logic)
        rooms_list = data.get('rooms', [])

        if int_logic == 1:
            return random.randint(1, 8)
        elif int_logic == 2:
            return int(auto_join) if auto_join else random.randint(1, 8)
        elif int_logic == 8:
            if not history:
                return 1
            else:
                last_room = history[0].get('room_id', 1)
                return 1 if last_room == 8 else (last_room + 1)
        elif int_logic == 3:
            if rooms_list:
                sorted_rooms = sorted(rooms_list, key=lambda x: x.get('total_bet_amount', 0))
                return sorted_rooms[-1]['room_id']
            return random.randint(1, 8)
        elif int_logic == 4:
            if rooms_list:
                sorted_rooms = sorted(rooms_list, key=lambda x: x.get('total_bet_amount', 0))
                return sorted_rooms[0]['room_id']
            return random.randint(1, 8)
        elif int_logic == 5:
            if rooms_list:
                sorted_rooms = sorted(rooms_list, key=lambda x: x.get('total_bet_amount', 0))
                return random.choice([sorted_rooms[0]['room_id'], sorted_rooms[-1]['room_id']])
            return random.randint(1, 8)
        elif int_logic == 6:
            if rooms_list and len(rooms_list) >= 4:
                sorted_rooms = sorted(rooms_list, key=lambda x: x.get('total_bet_amount', 0))
                return random.choice([sorted_rooms[0]['room_id'], sorted_rooms[1]['room_id'], sorted_rooms[-2]['room_id'], sorted_rooms[-1]['room_id']])
            return random.randint(1, 8)
        elif int_logic == 7:
            return chon_phongv7(data_10, data_100)
        elif int_logic == 9:
            if history:
                last_killed = history[0].get('killed_room', 1)
                return random.randint(5, 8) if last_killed in [1, 2, 3, 4] else random.randint(1, 4)
            return random.randint(1, 8)
        elif int_logic == 10:
            return chon_phong_logic10(data, data_10, data_100, history)
        elif int_logic == 11:
            return chon_phong_logic11(data, data_10, data_100, history)
        elif int_logic == 12:
            if rooms_list and len(rooms_list) >= 3:
                sorted_rooms = sorted(rooms_list, key=lambda x: x.get('total_bet_amount', 0))
                return random.choice([sorted_rooms[1]['room_id'], sorted_rooms[2]['room_id']])
            return random.randint(1, 8)
        else:
            return chon_phong_logic11(data, data_10, data_100, history)
    except Exception:
        return random.randint(1, 8)


class VTHEngine:
    def __init__(self):
        self.lock = threading.RLock()
        self.user_id = ""
        self.secret_key = ""
        self.coin_type = "BUILD"
        self.base_bet = 0.1
        self.trap_multiplier = 10.0
        self.selected_logic_id = 11  # Default logic 11: Siêu Phân Tích & Né Sát Thủ
        self.auto_join_room = 1
        self.auto_bot = False

        self.balance = {"BUILD": 0.0, "USDT": 0.0, "WORLD": 0.0}
        self.session = requests.Session()
        self.history_vth10 = []
        self.system_logs = deque(maxlen=100)

        self.telemetry = {
            'issue_id': 0,
            'count_down': 10,
            'phase': 'WAITING',
            'recommended_room': 1,
            'latest_killed_room': 0,
            'latest_issue_id': 0,
            'current_placed_bet': 0.0,
            'rooms_data': [],
            'scores': {i: 50.0 for i in range(1, 9)},
            'top100_stats': {i: 0 for i in range(1, 9)}
        }

        self.stats = {
            'total': 0,
            'wins': 0,
            'losses': 0,
            'streak': 0,
            'max_streak': 0,
            'lose_streak': 0,
            'pnl': 0.0,
            'current_bet': 0.1,
            'lose_streak_counts': {2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0},
            'history': []
        }

        self.load_config()

    def log_sys(self, msg, level='info'):
        t_str = time.strftime('%H:%M:%S')
        log_entry = {'time': t_str, 'msg': msg, 'level': level}
        with self.lock:
            self.system_logs.append(log_entry)
        print(f"[{t_str}] [{level.upper()}] {msg}")

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.user_id = data.get('user_id', '')
                    self.secret_key = data.get('secret_key', '')
                    self.coin_type = data.get('coin_type', 'BUILD')
                    self.base_bet = float(data.get('base_bet', 0.1))
                    self.trap_multiplier = float(data.get('trap_multiplier', 10.0))
                    try:
                        self.selected_logic_id = int(data.get('selected_logic', 11))
                    except ValueError:
                        self.selected_logic_id = 11
                    self.auto_join_room = int(data.get('auto_join', 1))
                    self.stats['current_bet'] = self.base_bet
            except Exception as e:
                print(f"Error loading config: {e}")

    def save_config(self, data):
        with self.lock:
            self.user_id = str(data.get('user_id', '')).strip()
            self.secret_key = str(data.get('secret_key', '')).strip()
            self.coin_type = data.get('coin_type', 'BUILD')
            self.base_bet = float(data.get('base_bet', 0.1))
            self.trap_multiplier = float(data.get('trap_multiplier', 10.0))
            try:
                self.selected_logic_id = int(data.get('selected_logic', 11))
            except ValueError:
                self.selected_logic_id = 11
            self.auto_join_room = int(data.get('auto_join', 1))
            self.stats['current_bet'] = self.base_bet
            self.log_sys(f"🔑 In-Memory Config Updated: User ID={self.user_id} | Logic v10={self.selected_logic_id}", "info")

    def get_headers(self):
        return {
            'accept': '*/*', 'accept-language': 'vi,en;q=0.9', 'cache-control': 'no-cache',
            'country-code': 'vn', 'origin': 'https://xworld.info', 'pragma': 'no-cache',
            'priority': 'u=1, i', 'referer': 'https://xworld.info/',
            'sec-ch-ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
            'sec-ch-ua-mobile': '?1', 'sec-ch-ua-platform': '"Android"',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
            'user-id': str(self.user_id), 'user-login': 'login_v2', 'user-secret-key': str(self.secret_key), 'xb-language': 'vi-VN',
        }

    def fetch_balance(self):
        if not self.user_id or not self.secret_key:
            return {"error": "Chưa cấu hình User ID hoặc Secret Key"}
        try:
            url = "https://wallet.3games.io/api/wallet/user_asset"
            payload = {"user_id": int(self.user_id), "source": "home"}
            res = self.session.post(url, headers=self.get_headers(), json=payload, timeout=5).json()
            if res.get('code') == 0 and 'data' in res:
                assets = res['data'].get('user_asset', {})
                self.balance = {
                    'USDT': float(assets.get('USDT', 0.0)),
                    'WORLD': float(assets.get('WORLD', 0.0)),
                    'BUILD': float(assets.get('BUILD', 0.0))
                }
                self.log_sys(f"[REQ REST] 💰 Wallet User Asset -> BUILD: {self.balance['BUILD']}, USDT: {self.balance['USDT']}", "info")
                return {"status": "ok", "balance": self.balance}
            self.log_sys(f"[REQ REST ERR] ❌ wallet user_asset: {res.get('msg')}", "loss")
            return {"error": res.get('msg', 'Unknown error')}
        except Exception as e:
            self.log_sys(f"[REQ REST EXCEPTION] user_asset: {e}", "loss")
            return {"error": str(e)}

    def top10_vth(self):
        """EXACT top10_vth from vthv10.py (lines 142-155)"""
        params = {'asset': self.coin_type}
        try:
            res = self.session.get('https://api.escapemaster.net/escape_game/recent_10_issues', params=params, headers=self.get_headers(), timeout=5).json()
            if res.get('code') == 0 and 'data' in res and len(res['data']) > 0:
                ki = [i['issue_id'] for i in res['data']]
                phong = [i['killed_room_id'] for i in res['data']]
                if not hasattr(self, 'last_logged_top10') or self.last_logged_top10 != ki[0]:
                    self.last_logged_top10 = ki[0]
                    self.log_sys(f"[REQ REST] 🌐 top10_vth -> Finished: #{ki[0]}, Killed: Room {phong[0]} ({ROOM_NAMES.get(phong[0], '')})", "info")
                return ki, phong
        except Exception as e:
            self.log_sys(f"[REQ REST EXCEPTION] top10_vth: {e}", "loss")
        return None

    def top100_vth(self):
        """EXACT top100_vth from vthv10.py (lines 135-141)"""
        now = time.time()
        if hasattr(self, 'last_top100_time') and now - self.last_top100_time < 30 and hasattr(self, 'cached_top100'):
            return self.cached_top100

        params = {'asset': self.coin_type}
        try:
            res = self.session.get('https://api.escapemaster.net/escape_game/recent_100_issues', params=params, headers=self.get_headers(), timeout=5).json()
            if res.get('code') == 0 and 'data' in res:
                times = res['data'].get('room_id_2_killed_times', {})
                parsed = {str(k): int(v) for k, v in times.items()}
                with self.lock:
                    self.telemetry['top100_stats'] = {int(k): int(v) for k, v in times.items()}
                self.last_top100_time = now
                self.cached_top100 = parsed
                self.log_sys(f"[REQ REST] 🌐 top100_vth -> Refreshed 100-round cold room stats", "info")
                return parsed
        except Exception as e:
            self.log_sys(f"[REQ REST EXCEPTION] top100_vth: {e}", "loss")
        return getattr(self, 'cached_top100', None)

    def enter_room_api(self, room_id):
        """EXACT enter_room from vthv10.py (lines 121-134)"""
        try:
            res = self.session.post('https://api.escapemaster.net/escape_game/enter_room', headers=self.get_headers(), json={
                'asset_type': self.coin_type, 'user_id': int(self.user_id), 'room_id': int(room_id)
            }, timeout=5).json()
            return res.get('code') == 0
        except Exception:
            return False

    def bet_vth_api(self, room_id, bet_amount):
        """EXACT bet_vth from vthv10.py (lines 98-119)"""
        if not self.user_id or not self.secret_key:
            return False
        try:
            self.log_sys(f"[REQ REST] 🚀 Sending POST /escape_game/bet -> Amount: {bet_amount} {self.coin_type}, Room: {room_id}", "info")
            res = self.session.post('https://api.escapemaster.net/escape_game/bet', headers=self.get_headers(), json={
                'asset_type': self.coin_type, 'user_id': str(self.user_id),
                'room_id': int(room_id), 'bet_amount': float(bet_amount)
            }, timeout=5).json()

            if res.get('code') == 0:
                with self.lock:
                    self.telemetry['current_placed_bet'] = float(bet_amount)
                msg = f"Đã đặt {bet_amount} {self.coin_type} vào phòng số {room_id}"
                self.log_sys(f"[REQ REST RES] ✅ Bet API Success: {msg}", "win")
                return True
            else:
                self.log_sys(f"[REQ REST RES] ❌ Bet API Failed: {res.get('msg')}", "loss")
                return False
        except Exception as e:
            self.log_sys(f"[REQ REST EXCEPTION] bet_vth_api: {e}", "loss")
            return False

    def play_vthv10_round(self):
        """
        EXACT 1-to-1 implementation of play() function from vthv10.py (lines 286-358).
        Includes 5s post-connect delay check, single-bet guard, and non-blocking REST threads to prevent WS timeouts.
        """
        headers_ws = [
            "Origin: https://escapemaster.net",
            "Accept-Language: vi,en-US;q=0.9,en;q=0.8",
            "Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits"
        ]
        payLoad_ws = {
            "msg_type": "handle_enter_game",
            "asset_type": self.coin_type,
            "user_id": int(self.user_id),
            "user_secret_key": self.secret_key,
        }

        url = "wss://api.escapemaster.net/escape_master/ws"
        ws = websocket.WebSocket()
        ws.settimeout(15)

        try:
            ws.connect(url, header=headers_ws)
            ws.send(json.dumps(payLoad_ws))
            ws_connect_time = time.time()
            self.log_sys(f"[WS PLAY] 🔌 Connected WS for User ID {self.user_id}", "win")
        except Exception as e:
            self.log_sys(f"[WS CONN ERR] play_vthv10_round: {e}", "loss")
            return "ERROR"

        data_10 = self.top10_vth()
        data_100 = self.top100_vth()

        bet_amount_target = self.base_bet
        if len(self.history_vth10) > 0 and self.history_vth10[0].get('result') == False:
            bet_amount_target = self.history_vth10[0]['bet_amount'] * self.trap_multiplier

        self.stats['current_bet'] = bet_amount_target

        has_betted_this_round = False
        bot_chon = None

        while True:
            try:
                msg = ws.recv()
                if not msg: break
                data = json.loads(msg)
                msg_type = data.get('msg_type')

                with self.lock:
                    if msg_type == "notify_count_down":
                        cd = data.get('count_down', 0)
                        if self.telemetry['phase'] == 'COUNTDOWN':
                            self.telemetry['count_down'] = cd
                        if cd in (10, 5, 3, 1):
                            self.log_sys(f"[WS IN] 📩 notify_count_down -> {cd}s remaining", "info")

                    elif msg_type == 'notify_issue_stat':
                        rooms = data.get('rooms', [])
                        data['rooms'] = sorted(rooms, key=lambda x: x.get('room_id', 0))
                        self.telemetry['rooms_data'] = data['rooms']
                        self.telemetry['issue_id'] = data.get('issue_id', 0)
                        self.telemetry['phase'] = 'COUNTDOWN'

                        # Lightweight room choice calculation
                        bot_chon = chon_phong_vthv10(self.selected_logic_id, data, data_10, data_100, self.auto_join_room, self.history_vth10)
                        self.telemetry['recommended_room'] = bot_chon

                        # SINGLE BET GUARD & 5-SECOND POST-WS CONNECT DELAY CHECK
                        if self.auto_bot and not has_betted_this_round and (time.time() - ws_connect_time >= 5):
                            has_betted_this_round = True
                            user_data = data.get('user_data', {})
                            current_bet = user_data.get('bet_amount', 0)

                            target_bet = bet_amount_target
                            target_room = bot_chon

                            # Run REST HTTP requests in separate background thread to keep WS recv loop fast & prevent timeouts
                            def async_place_bet(r_id, b_amt, c_bet):
                                if c_bet >= b_amt:
                                    self.log_sys(f"ℹ️ Đã có cược ({c_bet} {self.coin_type}) trong kỳ này rồi, không cược thêm nữa.", "info")
                                    return
                                diff_bet = round(b_amt - c_bet, 2) if c_bet > 0 else b_amt
                                self.enter_room_api(r_id)
                                self.log_sys(f"🤖 [v10 Bot] Logic #{self.selected_logic_id} -> Room P.{r_id} ({ROOM_NAMES.get(r_id,'')}) | Bet: {diff_bet} {self.coin_type}", "warn")
                                self.bet_vth_api(r_id, diff_bet)

                            threading.Thread(target=async_place_bet, args=(target_room, target_bet, current_bet), daemon=True).start()

                    elif msg_type == 'notify_result':
                        issue_id = data.get('issue_id', 0)
                        killed_room = data.get('killed_room', 0)
                        is_killed = data.get('is_killed', False)

                        with self.lock:
                            self.telemetry['latest_issue_id'] = issue_id
                            self.telemetry['latest_killed_room'] = killed_room
                            self.telemetry['phase'] = 'RESULT'

                        if 'award_amount' in data and 'bet_amount' in data:
                            if data['bet_amount'] == 0 and not self.auto_bot:
                                self.log_sys(f"ℹ️ Kỳ #{issue_id} kết thúc: Sát thủ vào Room {killed_room} ({ROOM_NAMES.get(killed_room,'')}). Ván này tạm nghỉ.", "info")
                                return "NO_PLAY"

                            award = float(data.get('award_amount', 0.0))
                            placed = float(data.get('bet_amount', 0.0))
                            earn = award - placed
                            is_win = not is_killed

                            res_dict = {
                                'issue_id': issue_id,
                                'bet_amount': placed,
                                'result': is_win,
                                'earn': earn,
                                'room_id': int(data.get('room_id', bot_chon if bot_chon else 1)),
                                'killed_room': killed_room
                            }
                            self.log_sys(f"🎯 [v10 Result] Kỳ #{issue_id} kết thúc! Sát thủ vào Room {killed_room} ({ROOM_NAMES.get(killed_room,'')}). Kết quả: {'THẮNG 🎉' if is_win else 'THUA 💥'} | PnL: {earn:+.2f} {self.coin_type}", "win" if is_win else "loss")

                            # 10s pause before returning
                            for pause_sec in range(10, 0, -1):
                                with self.lock:
                                    self.telemetry['phase'] = 'PAUSE_10S'
                                    self.telemetry['count_down'] = pause_sec
                                time.sleep(1)

                            return res_dict
                        else:
                            self.log_sys(f"ℹ️ Kỳ #{issue_id} kết thúc: Sát thủ vào Room {killed_room}", "info")
                            return "NO_PLAY"

            except websocket.WebSocketTimeoutException:
                self.log_sys(f"[WS TIMEOUT] WebSocket recv timeout in round", "warn")
                break
            except Exception as e:
                self.log_sys(f"[WS LOOP ERR] {e}", "loss")
                break

        try: ws.close()
        except Exception: pass
        return None

    def main_vthv10_loop(self):
        """
        EXACT 1-to-1 main() loop from vthv10.py (lines 510-634).
        """
        while True:
            try:
                if not self.user_id or not self.secret_key:
                    time.sleep(2)
                    continue

                res = self.play_vthv10_round()

                if res and res != 'NO_PLAY' and res != 'ERROR':
                    with self.lock:
                        self.history_vth10.insert(0, res)

                        if res['result'] == True:
                            self.stats['wins'] += 1
                            self.stats['streak'] += 1
                            self.stats['max_streak'] = max(self.stats['max_streak'], self.stats['streak'])
                            self.stats['pnl'] += res['earn']

                            if self.stats['lose_streak'] > 1:
                                l_streak = self.stats['lose_streak']
                                if l_streak in self.stats['lose_streak_counts']:
                                    self.stats['lose_streak_counts'][l_streak] += 1
                                else:
                                    self.stats['lose_streak_counts'][l_streak] = 1
                            self.stats['lose_streak'] = 0
                        else:
                            self.stats['losses'] += 1
                            self.stats['streak'] = 0
                            self.stats['lose_streak'] += 1
                            self.stats['pnl'] += res['earn']

                        self.stats['total'] += 1
                        self.stats['history'].insert(0, {
                            'issue_id': res['issue_id'],
                            'killed_room': res['killed_room'],
                            'kq': res['result'],
                            'bet_amount': res['bet_amount'],
                            'pnl': round(res['earn'], 4),
                            'timestamp': time.strftime('%H:%M:%S')
                        })

                    self.fetch_balance()
                    time.sleep(5)
                elif res == 'NO_PLAY':
                    with self.lock:
                        self.stats['total'] += 1
                    time.sleep(2)
                else:
                    time.sleep(3)

            except Exception as e:
                self.log_sys(f"Main Loop Exception: {e}", "loss")
                time.sleep(3)

vth_engine = VTHEngine()
threading.Thread(target=vth_engine.main_vthv10_loop, daemon=True).start()

class VTHWebHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/state':
            self._send_json({
                'config': {
                    'user_id': vth_engine.user_id,
                    'secret_key': vth_engine.secret_key,
                    'coin_type': vth_engine.coin_type,
                    'base_bet': vth_engine.base_bet,
                    'trap_multiplier': vth_engine.trap_multiplier,
                    'selected_logic': vth_engine.selected_logic_id,
                    'auto_join': vth_engine.auto_join_room,
                    'auto_bot': vth_engine.auto_bot
                },
                'balance': vth_engine.balance,
                'telemetry': vth_engine.telemetry,
                'stats': vth_engine.stats,
                'system_logs': list(vth_engine.system_logs)
            })
        else:
            if parsed.path == '/':
                self.path = '/index.html'
            return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
        try: data = json.loads(body)
        except Exception: data = {}

        if parsed.path == '/api/save_config':
            vth_engine.save_config(data)
            bal = vth_engine.fetch_balance()
            vth_engine.top100_vth()
            self._send_json({'status': 'ok', 'balance': bal})

        elif parsed.path == '/api/toggle_bot':
            vth_engine.auto_bot = bool(data.get('auto_bot', False))
            vth_engine.log_sys(f"🤖 Toggle Auto Bot -> {'ENABLED' if vth_engine.auto_bot else 'DISABLED'}", "warn")
            self._send_json({'status': 'ok', 'auto_bot': vth_engine.auto_bot})

        elif parsed.path == '/api/bet':
            room_id = data.get('room_id', 1)
            amount = data.get('amount', vth_engine.base_bet)
            res_ok = vth_engine.bet_vth_api(room_id, amount)
            if res_ok:
                self._send_json({'status': 'ok', 'msg': f'Đã đặt {amount} {vth_engine.coin_type} vào phòng số {room_id}'})
            else:
                self._send_json({'error': 'Lỗi khi đặt cược'})
        else:
            self.send_error(404)

    def _send_json(self, data):
        content = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

if __name__ == '__main__':
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    port = PORT
    httpd = None
    for p in range(8000, 8020):
        try:
            httpd = socketserver.ThreadingTCPServer(("", p), VTHWebHandler)
            port = p
            print(f"🚀 VTH Control Dashboard running at http://localhost:{port}")
            httpd.serve_forever()
            break
        except OSError:
            continue
