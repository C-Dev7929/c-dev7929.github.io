# 💎 SmartQuiz AI (Pro Edition)

Phiên bản nâng cao với các tính năng chuyên nghiệp, tối ưu hóa cho việc học tập và chia sẻ quy mô lớn.

## 🔥 Tính năng "Vip" mới cập nhật

### 1. 🚀 Nén Link Chia sẻ (LZ-String)
- **Vấn đề cũ:** Link chia sẻ quá dài bị lỗi khi gửi qua tin nhắn/mạng xã hội.
- **Giải pháp Vip:** Tích hợp thuật toán nén `LZ-String`, giúp thu gọn kích thước link chia sẻ lên đến 70%, đảm bảo hoạt động ổn định mọi nơi.

### 2. 🎊 Hiệu ứng Hoàn thành (Confetti)
- Khi hoàn thành 100% bộ đề, bạn sẽ nhận được màn hình chúc mừng với hiệu ứng pháo hoa rực rỡ và bảng tổng hợp điểm số chi tiết.

### 3. 🔄 Tự động Reset Thông minh
- Hệ thống sẽ tự động nhận diện khi bạn nhập một bộ đề mới để reset tiến độ, đảm bảo trải nghiệm học tập luôn mới mẻ.

### 4. ☁️ Sẵn sàng cho Cloud Hosting
Ứng dụng được thiết kế theo cấu trúc Static Web, cực kỳ dễ dàng để "treo" lên các dịch vụ cloud miễn phí:
- **Vercel / Netlify:** Chỉ cần kéo thả thư mục dự án lên giao diện của họ.
- **GitHub Pages:** Đẩy code lên repo và bật tính năng Pages trong phần Settings.

---

## ☁️ Hướng dẫn Hosting (Treo Web)

### Cách 1: Sử dụng Vercel (Khuyên dùng - Nhanh nhất)
1. Truy cập [Vercel.com](https://vercel.com).
2. Tải lên thư mục dự án này.
3. Vercel sẽ cấp cho bạn một tên miền miễn phí dạng `ten-du-an.vercel.app`.

### Cách 2: Sử dụng GitHub Pages
1. Tạo một Repository mới trên GitHub.
2. Đẩy toàn bộ các tệp (`index.html`, `script.js`, `style.css`,...) lên.
3. Vào **Settings** -> **Pages** -> Chọn nhánh `main` và nhấn **Save**.

---
*Phát triển bởi SmartQuiz AI Team - Tối ưu cho Cloud & Chia sẻ*

---

## 🛠 Định dạng Dữ liệu JSON Chuẩn

Để AI hoặc hệ thống hiểu và hiển thị đúng công thức, hãy sử dụng cấu trúc sau:

```json
{
  "title": "Tên bộ đề",
  "subject": "Môn học",
  "FolerImgUrl": "https://example.com/images/", 
  "questions": [
    {
      "id": "q1",
      "topic": "Đạo hàm",
      "level": "TH",
      "question": "Tính đạo hàm của hàm số $f(x) = x^2 + \\sin(x)$?",
      "options": [
          "$2x + \\cos(x)$", 
          "$2x - \\cos(x)$", 
          "$x^2 + \\cos(x)$", 
          "$2x + \\sin(x)$"
      ],
      "correct": "$2x + \\cos(x)$",
      "explanation": "Sử dụng quy tắc đạo hàm cơ bản: $(x^2)' = 2x$ và $(\\sin x)' = \\cos x$.",
      "image": "image1.png"
    }
  ]
}
```

---

## 💻 Công nghệ Sử dụng
- **Vanilla JavaScript (ES6+):** Không framework, đảm bảo tốc độ tối đa.
- **CSS Grid & Variables:** Giao diện linh hoạt, dễ tùy chỉnh.
- **KaTeX:** Thư viện render toán học nhanh nhất hiện nay.
- **Lucide Icons:** Hệ thống icon hiện đại, sắc nét.

---
*Phát triển bởi SmartQuiz AI Team - 2024*
