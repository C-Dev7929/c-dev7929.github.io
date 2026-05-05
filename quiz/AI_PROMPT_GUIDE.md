# 🤖 AI Prompt for SmartQuiz Data Generation

Hãy sử dụng Prompt dưới đây để yêu cầu các AI (ChatGPT, Claude, Gemini) tạo ra dữ liệu bộ đề chuẩn xác cho ứng dụng SmartQuiz AI.

---

## 📝 The Prompt

**Nội dung Prompt:**

"Hãy đóng vai một chuyên gia soạn đề thi. Tạo cho tôi một file dữ liệu JSON cho bộ đề trắc nghiệm về chủ đề **[CHÈN CHỦ ĐỀ VÀO ĐÂY]**. File JSON phải tuân thủ nghiêm ngặt các quy tắc sau:

1. **Cấu trúc Root:** Bao gồm các trường: `title` (tiêu đề), `subject` (môn học), `FolerImgUrl` (để trống "" nếu không có), và `questions` (mảng danh sách câu hỏi).
2. **Cấu trúc Question:** Mỗi câu hỏi có:
   - `id`: Định danh duy nhất (ví dụ: "q1", "q2").
   - `topic`: Chủ đề nhỏ của câu hỏi.
   - `level`: Mức độ nhận thức (NB - Nhận biết, TH - Thông hiểu, VD - Vận dụng, VDC - Vận dụng cao).
   - `question`: Nội dung câu hỏi.
   - `options`: Mảng 4 lựa chọn.
   - `correct`: Lựa chọn chính xác nhất (phải khớp hoàn toàn với 1 phần tử trong mảng options).
   - `explanation`: Giải thích chi tiết tại sao chọn đáp án đó.
   - `image`: Để trống "" nếu không có ảnh minh họa.
3. **Quy tắc về Công thức (QUAN TRỌNG):**
   - Sử dụng cú pháp **LaTeX** đặt trong cặp dấu `$` cho các công thức nội dòng (ví dụ: `$E = mc^2$`).
   - Sử dụng cú pháp **LaTeX** đặt trong cặp dấu `$$` cho các công thức hiển thị riêng biệt.
   - **Lưu ý về ký tự đặc biệt:** Khi viết dấu gạch chéo ngược `\` trong chuỗi JSON, bạn PHẢI viết hai lần thành `\\` để không bị lỗi parse (ví dụ: `\\frac{a}{b}`).
4. **Quy tắc về Ký tự:**
   - Không sử dụng dấu ngoặc kép `"` bên trong nội dung văn bản, hãy dùng dấu ngoặc đơn `'` để tránh làm hỏng cấu trúc JSON.
   - Đảm bảo JSON hợp lệ 100%.

**Ví dụ về cách viết câu hỏi Toán học:**
{
  "id": "math1",
  "topic": "Tích phân",
  "level": "TH",
  "question": "Tính tích phân $I = \\int_{0}^{1} x^2 \\, dx$?",
  "options": ["$1/3$", "$1/2$", "$1$", "$0$"],
  "correct": "$1/3$",
  "explanation": "Ta có $\\int x^2 \\, dx = \\frac{x^3}{3}$. Thế cận từ 0 đến 1 ta được $\\frac{1^3}{3} - \\frac{0^3}{3} = 1/3$."
}"

---

## 💡 Mẹo để không viết lỗi
1. **Luôn yêu cầu AI kiểm tra lại JSON:** Sau khi AI tạo xong, hãy yêu cầu: "Hãy kiểm tra lại xem tất cả các dấu `\\` trong công thức LaTeX đã được double (viết thành `\\\\`) chưa."
2. **Ký hiệu hóa học:** Nhắc AI dùng `\\text{...}` hoặc cú pháp LaTeX chuẩn. Ví dụ: `$H_2SO_4$` sẽ viết trong JSON là `$H_2SO_4$`.

