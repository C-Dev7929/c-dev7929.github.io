# Smart Quiz Web App

Ứng dụng web luyện trắc nghiệm tối ưu, đa lĩnh vực được xây dựng bằng React và Vite. Có thể sử dụng tự học offline và cá nhân hóa.

## Tính Năng Chính
- **Đa Môn Học**: Render được cả công thức Toán học ($\int x dx$), Hóa học, Vật lý bằng `katex`.
- **Hỗ trợ Hình Ảnh**: Tự động hiển thị ảnh nếu bộ câu hỏi có thuộc tính `image`.
- **Nạp Đề Linh Hoạt**:
  - Drag & Drop / Kéo thả file JSON.
  - Paste URL (Ví dụ: GitHub Raw URL) với Fetch API.
  - Sử dụng file Local (chạy mượt mà offline).
- **Chế Độ Học Smart Review**: Ghi lại các câu sai và tự động lặp lại cho đến khi làm đúng **tất cả**.
- **Chế Độ Normal / Exam**: Làm theo tiến độ bình thường hoặc thi thử ẩn đáp án.
- **Tính Năng Bổ Trợ**:
  - Giao diện Dark / Light Mode (lưu bằng localStorage).
  - Bookmark những câu khó.
  - Tự động Shuffle câu hỏi và các phương án.
  - Lọc (Filter) theo độ khó, chủ đề.
- **UI/UX Premium**: Thiết kế Glassmorphism, phong cách Minimalism với feedback ngay tức thì, mượt mà trên Mobile & Desktop.

## Cài đặt & Khởi chạy

Yêu cầu đã cài đặt **Node.js**.

1. Mở cửa sổ Terminal (PowerShell / Command Prompt) và `cd` vào thư mục của Project.
2. Cài đặt các thư viện:
```bash
npm install
```
3. Chạy Server cục bộ (Development):
```bash
npm run dev
```
4. Build Project thành file tĩnh (để tải lên GitHub Pages, Vercel,...):
```bash
npm run build
```

## Cách nạp dữ liệu (Load JSON)

Bạn có thể chỉnh sửa file `public/data/sample.json` và tải nó trong ứng dụng để thử nghiệm.

**File JSON có cấu trúc sau:**

```json
{
  "title": "Tên Bộ Đề",
  "subject": "Tên Môn",
  "questions": [
    {
      "id": 1,
      "type": "mcq", // mcq | true_false | short
      "question": "Nội dung câu hỏi (VD: Tính $x^2 + 1$)",
      "options": ["A", "B", "C", "D"],
      "correct": "Đúng y hệt phương án A, B, C hoặc D",
      "explanation": "Giải thích chi tiết",
      "image": "https://url_anh.png", // [KHÔNG BẮT BUỘC] để hiển thị ảnh gợi ý
      "topic": "Đạo hàm", // [KHÔNG BẮT BUỘC] để lọc Option
      "level": "VD" // [KHÔNG BẮT BUỘC] để lọc Option
    }
  ]
}
```

Với dạng `short` (Điền khuyết), thuộc tính `"options"` có thể bỏ đi, chỉ cần truyền vào `"correct": "Câu trả lời đúng"`.

## Prompt Tối Ưu Cho AI (Mẫu tạo JSON)
*(Mở app lên tôi đã đính kèm Prompt cho anh luôn ở phần trả lời phía dưới, hoặc copy phần dưới đây)*

```markdown
Hãy đóng vai chuyên gia giáo dục. Tạo cho tôi một bộ đề trắc nghiệm và trả về **DUY NHẤT một JSON hợp lệ** (không có bất kỳ text nào ngoài JSON).

Yêu cầu cấu trúc JSON:

{
"title": "Tên bộ đề",
"subject": "Môn học",
"questions": [
{
"id": 1,
"type": "mcq",
"question": "Nội dung câu hỏi (có thể chứa LaTeX)",
"options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
"correct": "Đáp án đúng (phải trùng EXACT với 1 trong options)",
"explanation": "Giải thích chi tiết từng bước",
"image": null,
"topic": "Tên chuyên đề",
"level": "NB"
}
]
}

Quy tắc bắt buộc:

1. Tạo đúng 10 câu hỏi thuộc chủ đề: [TÊN CHUYÊN ĐỀ].
2. Các loại câu hỏi hợp lệ:

   * "mcq": phải có đủ 4 options
   * "true_false": options = ["Đúng", "Sai"]
   * "short": KHÔNG có field "options"
3. TẤT CẢ công thức toán, vật lý, hóa học phải viết bằng LaTeX trong dấu $...$.
4. QUAN TRỌNG: Trong JSON, mọi ký tự "" trong LaTeX phải được escape thành "\\".
   Ví dụ:

   * $\sin(x)$
   * $\frac{1}{\sqrt{x}}$
5. Field "image":

   * Nếu là câu hỏi đồ thị/hình học/thí nghiệm → phải có URL ảnh public (Wikipedia hoặc nguồn mở)
   * Nếu không cần → đặt null
6. "correct" phải khớp 100% với nội dung đáp án đúng.
7. Không được để dấu phẩy thừa trong JSON.
8. Không được thêm comment (//) trong JSON.
9. Output phải parse được bằng JSON.parse().

Chỉ trả về JSON hợp lệ, không giải thích, không markdown, không text ngoài JSON.
```
