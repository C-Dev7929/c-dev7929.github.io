# 🛡️ VTH - Pure Client-Side Static Web App (GitHub Pages Ready)

Giao diện Web tĩnh 100% (Client-Side HTML/CSS/JS), lưu cấu hình bằng **`localStorage`**, trực tiếp chạy trên **GitHub Pages** không cần server backend!

---

## 🌟 Tính năng nổi bật cho GitHub Pages

- 🔒 **Lưu Cấu Hình An Toàn Vào `localStorage`**: Thông tin `user_id`, `secret_key`, mức cược, hệ số Martingale chỉ lưu duy nhất trên trình duyệt của bạn.
- ⚡ **Kết Nối Trực Tiếp API & WebSocket**: Tự động kết nối WebSocket `wss://api.escapemaster.net/escape_master/ws` và REST APIs trực tiếp từ trình duyệt.
- 🤖 **Thuật Toán AI & Auto Bot Chạy Trực Tiếp Trên Trình Duyệt**: Đầy đủ 4 chiến thuật dự đoán phòng an toàn và tự động cược liên tục qua các ván.
- 📋 **Nhật Ký Hệ Thống Live**: Console log trực tiếp trên trang web hiển thị lịch sử cược, số dư, kết quả Thắng/Thua.

---

## 🚀 Hướng Dẫn Upload & Bật GitHub Pages (3 Bước)

### Bước 1: Upload mã nguồn lên GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit VTH Static Web App"
git branch -M main
git remote add origin https://github.com/TÊN_USERNAME/vth-web-dashboard.git
git push -u origin main
```

### Bước 2: Bật GitHub Pages trên GitHub
1. Vào Repository của bạn trên GitHub (`https://github.com/USERNAME/vth-web-dashboard`).
2. Vào **Settings** -> Thẻ **Pages** ở cột bên trái.
3. Tại phần **Build and deployment** -> Chọn **Branch: main** / **folder: / (root)** -> Bấm **Save**.

### Bước 3: Sử dụng Web Dashboard trên GitHub Pages
* Sau 1-2 phút, đường link web của bạn sẽ hoạt động tại:
  `https://USERNAME.github.io/vth-web-dashboard/`
* Mở trang web -> Vào tab **⚙️ CẤU HÌNH TÀI KHOẢN** -> Nhập **User ID** & **User Secret Key** -> Bấm **LƯU CẤU HÌNH & KẾT NỐI VTH** (Dữ liệu tự động lưu vào `localStorage`).
