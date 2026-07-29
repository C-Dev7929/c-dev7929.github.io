# -*- coding: utf-8 -*-
"""
VTH - Escape Master Web Control & Analytics Server
Integrated live telemetry, 100-round cold room analytics, and multi-layer AI predictor.
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
from collections import Counter, defaultdict
from urllib.parse import parse_qs, urlparse

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(DIRECTORY, 'static') if os.path.exists(os.path.join(DIRECTORY, 'static')) else DIRECTORY
CONFIG_FILE = os.path.join(DIRECTORY, 'config.json')

ROOM_NAMES = {
    1: 'Nhà kho', 2: 'Phòng họp', 3: 'Phòng Giám đốc', 4: 'Phòng trò chuyện',
    5: 'Phòng Giám sát', 6: 'Văn phòng', 7: 'Phòng Tài Vụ', 8: 'Phòng Nhân sự'
}

class VTHEngine:
    def __init__(self):
        self.lock = threading.Lock()
        self.user_id = ""
        self.secret_key = ""
        self.coin_type = "BUILD"
        self.base_bet = 0.1
        self.trap_multiplier = 10.0
        self.selected_logic_name = "hybrid_vth"
        self.auto_bot = False

        self.balance = {"BUILD": 0.0, "USDT": 0.0, "WORLD": 0.0}
        self.last_betted_issue = 0

        self.telemetry = {
            'issue_id': 0,
            'count_down': 10,
            'phase': 'WAITING',
            'recommended_room': 0,
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
            'history': []
        }

        self.ws_thread = None
        self.ws_running = False
        self.load_config()

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
                    self.selected_logic_name = data.get('selected_logic', 'hybrid_vth')
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
            self.selected_logic_name = data.get('selected_logic', 'hybrid_vth')
            self.stats['current_bet'] = self.base_bet

            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump({
                    'user_id': self.user_id,
                    'secret_key': self.secret_key,
                    'coin_type': self.coin_type,
                    'base_bet': self.base_bet,
                    'trap_multiplier': self.trap_multiplier,
                    'selected_logic': self.selected_logic_name
                }, f, indent=4, ensure_ascii=False)

    def get_headers(self):
        return {
            'accept': '*/*',
            'accept-language': 'vi,en;q=0.9',
            'cache-control': 'no-cache',
            'country-code': 'vn',
            'origin': 'https://xworld.info',
            'referer': 'https://xworld.info/',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
            'user-id': str(self.user_id),
            'user-login': 'login_v2',
            'user-secret-key': str(self.secret_key),
            'xb-language': 'vi-VN'
        }

    def fetch_balance(self):
        if not self.user_id or not self.secret_key:
            return self.balance
        try:
            url = "https://wallet.3games.io/api/wallet/user_asset"
            res = requests.post(url, headers=self.get_headers(), json={'user_id': int(self.user_id), 'source': 'home'}, timeout=5).json()
            if res.get('code') == 0 and 'data' in res and 'user_asset' in res['data']:
                self.balance = {
                    'USDT': float(res['data']['user_asset'].get('USDT', 0.0)),
                    'WORLD': float(res['data']['user_asset'].get('WORLD', 0.0)),
                    'BUILD': float(res['data']['user_asset'].get('BUILD', 0.0))
                }
        except Exception as e:
            print(f"Error fetching balance: {e}")
        return self.balance

    def fetch_recent_100(self):
        """Fetch 100-round cold room stats"""
        try:
            url = "https://api.escapemaster.net/escape_game/recent_100_issues"
            res = requests.get(url, params={'asset': self.coin_type}, headers=self.get_headers(), timeout=5).json()
            if res.get('code') == 0 and 'data' in res:
                times = res['data'].get('room_id_2_killed_times', {})
                parsed = {int(k): int(v) for k, v in times.items()}
                self.telemetry['top100_stats'] = parsed
                return parsed
        except Exception as e:
            print(f"Error recent 100: {e}")
        return {}

    def fetch_recent_10(self):
        """Fetch 10 recent issues + latest finished issue"""
        try:
            url = "https://api.escapemaster.net/escape_game/recent_10_issues"
            res = requests.get(url, params={'asset': self.coin_type}, headers=self.get_headers(), timeout=5).json()
            if res.get('code') == 0 and 'data' in res and len(res['data']) > 0:
                latest = res['data'][0]
                self.telemetry['latest_issue_id'] = latest.get('issue_id', 0)
                self.telemetry['latest_killed_room'] = latest.get('killed_room_id', 0)
                return res['data']
        except Exception as e:
            print(f"Error recent 10: {e}")
        return []

    def compute_ai_scores(self, rooms_data, top100_map):
        """Advanced Multi-layer AI scoring algorithm"""
        scores = {}
        bets = [r.get('total_bet_amount', 0.0) for r in rooms_data] if rooms_data else [0]*8
        users = [r.get('user_cnt', 0) for r in rooms_data] if rooms_data else [0]*8
        max_bet = max(bets) if max(bets) > 0 else 1.0
        max_user = max(users) if max(users) > 0 else 1

        for rid in range(1, 9):
            room_info = next((r for r in rooms_data if r.get('room_id') == rid), {})
            bet = room_info.get('total_bet_amount', 0.0)
            user = room_info.get('user_cnt', 0)

            bet_factor = (1.0 - (bet / max_bet)) if max_bet > 0 else 0.5
            user_factor = (1.0 - (user / max_user)) if max_user > 0 else 0.5

            killed_count = top100_map.get(rid, 12)
            cold_factor = (100 - killed_count) / 100.0

            # Penalty for recently killed room
            recent_penalty = 0.3 if rid == self.telemetry['latest_killed_room'] else 0.0

            score = (bet_factor * 0.35 + user_factor * 0.25 + cold_factor * 0.40 - recent_penalty) * 100.0
            scores[rid] = round(max(5.0, min(99.0, score)), 1)

        best_room = max(scores, key=scores.get) if scores else 1
        return scores, best_room

    def place_bet_api(self, room_id, amount):
        if not self.user_id or not self.secret_key:
            return {"error": "Chưa cấu hình User ID hoặc Secret Key"}
        try:
            enter_url = "https://api.escapemaster.net/escape_game/enter_room"
            requests.post(enter_url, headers=self.get_headers(), json={
                "asset_type": self.coin_type, "user_id": int(self.user_id), "room_id": int(room_id)
            }, timeout=5)

            bet_url = "https://api.escapemaster.net/escape_game/bet"
            res = requests.post(bet_url, headers=self.get_headers(), json={
                "asset_type": self.coin_type, "user_id": str(self.user_id),
                "room_id": int(room_id), "bet_amount": float(amount)
            }, timeout=5).json()

            if res.get('code') == 0:
                self.selected_room_placed = int(room_id)
                self.telemetry['current_placed_bet'] = float(amount)
                print(f"✅ Bet Success: Room {room_id}, Bet: {amount} {self.coin_type}")
                return {"status": "ok", "msg": f"Đã đặt cược thành công {amount} {self.coin_type} vào phòng {room_id}"}
            else:
                return {"error": res.get('msg', 'Lỗi khi đặt cược')}
        except Exception as e:
            return {"error": str(e)}

    def start_websocket_listener(self):
        if self.ws_running: return
        self.ws_running = True
        self.ws_thread = threading.Thread(target=self._ws_loop, daemon=True)
        self.ws_thread.start()

    def _ws_loop(self):
        url = "wss://api.escapemaster.net/escape_master/ws"
        headers_ws = ["Origin: https://escapemaster.net", "Accept-Language: vi,en-US;q=0.9,en;q=0.8"]

        while self.ws_running:
            try:
                if not self.user_id or not self.secret_key:
                    time.sleep(2)
                    continue

                ws = websocket.WebSocket()
                ws.settimeout(15)
                ws.connect(url, header=headers_ws)
                ws.send(json.dumps({
                    "msg_type": "handle_enter_game",
                    "asset_type": self.coin_type,
                    "user_id": int(self.user_id),
                    "user_secret_key": self.secret_key
                }))

                # Auto fetch recent 100 stats
                threading.Thread(target=self.fetch_recent_100, daemon=True).start()
                threading.Thread(target=self.fetch_recent_10, daemon=True).start()

                while self.ws_running:
                    try:
                        msg = ws.recv()
                        if not msg: break
                        data = json.loads(msg)
                        msg_type = data.get('msg_type')

                        with self.lock:
                            if msg_type == "notify_count_down":
                                cd = data.get('count_down', 0)
                                self.telemetry['count_down'] = cd
                                self.telemetry['phase'] = 'COUNTDOWN'

                            elif msg_type == "notify_issue_stat":
                                rooms = data.get('rooms', [])
                                self.telemetry['rooms_data'] = rooms
                                current_issue = data.get('issue_id', self.telemetry['issue_id'])
                                self.telemetry['issue_id'] = current_issue

                                # Re-calculate AI Safety Scores
                                scores, rec_room = self.compute_ai_scores(rooms, self.telemetry['top100_stats'])
                                self.telemetry['scores'] = scores
                                self.telemetry['recommended_room'] = rec_room

                            elif msg_type == "notify_result":
                                issue_id = data.get('issue_id')
                                killed_room = data.get('killed_room')
                                self.telemetry['latest_killed_room'] = killed_room
                                self.telemetry['latest_issue_id'] = issue_id
                                self.telemetry['phase'] = 'RESULT'

                    except websocket.WebSocketTimeoutException:
                        threading.Thread(target=self.fetch_recent_10, daemon=True).start()
                        continue
                    except Exception as e:
                        print(f"WS Msg Error: {e}")
                        break
            except Exception as e:
                print(f"WS Connection Error: {e}")
                time.sleep(2)

    def _vthv9_polling_loop(self):
        """Bulletproof Continuous Engine modeled 1-to-1 from vthv9.py"""
        last_check_time = time.time()
        last_processed_issue = 0

        while True:
            try:
                time.sleep(1)
                now = time.time()

                with self.lock:
                    # Tick countdown locally based on phase
                    if self.telemetry['phase'] == 'COUNTDOWN':
                        if self.telemetry['count_down'] > 0:
                            self.telemetry['count_down'] -= 1
                        else:
                            self.telemetry['phase'] = 'WAITING_RESULT'
                            self.wait_elapsed = 0
                    elif self.telemetry['phase'] == 'WAITING_RESULT':
                        if not hasattr(self, 'wait_elapsed'): self.wait_elapsed = 0
                        self.wait_elapsed += 1
                        self.telemetry['count_down'] = self.wait_elapsed

                if not self.user_id or not self.secret_key:
                    continue

                # Fetch recent 10 issues every ~2s
                if now - last_check_time >= 2:
                    last_check_time = now
                    recent10 = self.fetch_recent_10()
                    if recent10 and len(recent10) > 0:
                        finished_issue = recent10[0].get('issue_id', 0)
                        killed_room = recent10[0].get('killed_room_id', 0)
                        upcoming_issue = finished_issue + 1

                        # Process finished issue result if new
                        if finished_issue > 0 and last_processed_issue != finished_issue:
                            last_processed_issue = finished_issue
                            with self.lock:
                                self.telemetry['latest_issue_id'] = finished_issue
                                self.telemetry['latest_killed_room'] = killed_room
                                self.telemetry['phase'] = 'RESULT'

                            # If we placed a bet on finished_issue
                            if hasattr(self, 'last_betted_issue') and self.last_betted_issue == finished_issue:
                                is_win = (getattr(self, 'selected_room_placed', 0) != killed_room)
                                bet_amt = self.stats['current_bet']

                                with self.lock:
                                    self.stats['total'] += 1
                                    if is_win:
                                        pnl_round = bet_amt * 0.12
                                        self.stats['wins'] += 1
                                        self.stats['streak'] += 1
                                        self.stats['max_streak'] = max(self.stats['max_streak'], self.stats['streak'])
                                        self.stats['lose_streak'] = 0
                                        self.stats['pnl'] += pnl_round
                                        self.stats['current_bet'] = self.base_bet
                                    else:
                                        pnl_round = -bet_amt
                                        self.stats['losses'] += 1
                                        self.stats['lose_streak'] += 1
                                        self.stats['streak'] = 0
                                        self.stats['pnl'] += pnl_round
                                        self.stats['current_bet'] *= self.trap_multiplier

                                    self.stats['history'].insert(0, {
                                        'issue_id': finished_issue,
                                        'killed_room': killed_room,
                                        'kq': is_win,
                                        'bet_amount': bet_amt,
                                        'award_amount': bet_amt * 1.12 if is_win else 0,
                                        'pnl': round(pnl_round, 4),
                                        'timestamp': time.strftime('%H:%M:%S')
                                    })

                        # Detect upcoming issue advance
                        with self.lock:
                            if self.telemetry['issue_id'] < upcoming_issue:
                                self.telemetry['issue_id'] = upcoming_issue
                                self.telemetry['count_down'] = 10
                                self.telemetry['phase'] = 'COUNTDOWN'
                                self.telemetry['current_placed_bet'] = 0.0

                        # Auto-bot trigger for upcoming issue
                        if self.auto_bot and upcoming_issue > 0 and self.last_betted_issue != upcoming_issue:
                            top100 = self.telemetry['top100_stats'] or self.fetch_recent_100()
                            scores, rec_room = self.compute_ai_scores(self.telemetry['rooms_data'], top100)
                            with self.lock:
                                self.telemetry['recommended_room'] = rec_room
                                self.telemetry['scores'] = scores

                            self.last_betted_issue = upcoming_issue
                            print(f"🤖 Auto Bot placing bet for issue #{upcoming_issue} on Room {rec_room} (Amount: {self.stats['current_bet']})")
                            threading.Thread(target=self.place_bet_api, args=(rec_room, self.stats['current_bet']), daemon=True).start()

            except Exception as e:
                print(f"Polling loop error: {e}")
                time.sleep(2)

vth_engine = VTHEngine()
vth_engine.start_websocket_listener()
threading.Thread(target=vth_engine._vthv9_polling_loop, daemon=True).start()

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
                    'selected_logic': vth_engine.selected_logic_name,
                    'auto_bot': vth_engine.auto_bot
                },
                'balance': vth_engine.balance,
                'telemetry': vth_engine.telemetry,
                'stats': vth_engine.stats
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
            vth_engine.fetch_recent_100()
            self._send_json({'status': 'ok', 'balance': bal})

        elif parsed.path == '/api/toggle_bot':
            vth_engine.auto_bot = bool(data.get('auto_bot', False))
            self._send_json({'status': 'ok', 'auto_bot': vth_engine.auto_bot})

        elif parsed.path == '/api/bet':
            room_id = data.get('room_id', 1)
            amount = data.get('amount', vth_engine.base_bet)
            res = vth_engine.place_bet_api(room_id, amount)
            self._send_json(res)
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
    socketserver.TCPServer.allow_reuse_address = True
    port = PORT
    httpd = None
    for p in range(8000, 8020):
        try:
            httpd = socketserver.TCPServer(("", p), VTHWebHandler)
            port = p
            print(f"🚀 VTH Control Dashboard running at http://localhost:{port}")
            httpd.serve_forever()
            break
        except OSError:
            continue
