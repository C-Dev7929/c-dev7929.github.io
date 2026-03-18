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

1. Mở trang web https://c-dev7929.github.io/smart-quiz/
2. Tải lên file json hoặc nhập link file:
3. Bắt đầu làm bài.

## Cách nạp dữ liệu (Load JSON)

Bạn có thể chỉnh sửa file và tải nó trong ứng dụng để thử nghiệm.

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
Hãy đóng vai chuyên gia giáo dục. Tôi sẽ cung cấp đề bài (có thể gồm nhiều câu và có ảnh). Nhiệm vụ của bạn là:

PHÂN TÍCH đề gốc
GIỮ NGUYÊN nội dung câu hỏi và phương án (KHÔNG tự ý thay đổi)
TÌM đáp án đúng + giải thích chi tiết
CHUYỂN thành DUY NHẤT một JSON hợp lệ

YÊU CẦU QUAN TRỌNG:

KHÔNG được thay đổi nội dung

Giữ nguyên 100% câu hỏi và các phương án như đề gốc

Không rewrite, không rút gọn

Xử lý loại câu hỏi

Nếu là trắc nghiệm A B C D:
"type": "mcq"
Phải giữ đúng 4 phương án
"correct" phải trùng EXACT với 1 trong options

Nếu là câu ĐÚNG / SAI nhiều ý (a, b, c, d):
BẮT BUỘC tách thành nhiều câu riêng
Mỗi ý là một câu độc lập
"type": "true_false"
"options": ["Đúng", "Sai"]
"question" phải ghi rõ nội dung + ý (a/b/c/d)

Nếu là câu trả lời ngắn:
"type": "short"
KHÔNG có field "options"

Xử lý hình ảnh

Nếu đề có ảnh:
TẤT CẢ các câu liên quan phải dùng CHUNG 1 URL ảnh

Nếu không có:
"image": null

LaTeX

Viết trong dấu $...$

Escape dấu \ thành \

Cấu trúc JSON bắt buộc

{
"title": "Tên bộ đề",
"subject": "Môn học",
"questions": [
{
"id": 1,
"type": "mcq | true_false | short",
"question": "Nguyên văn đề bài",
"options": ["A", "B", "C", "D"],
"correct": "Đáp án đúng",
"explanation": "Giải thích rõ ràng, logic",
"image": null,
"topic": "Tên chuyên đề",
"level": "NB | TH | VD"
}
]
}

Quy tắc bắt buộc

KHÔNG thêm bất kỳ text nào ngoài JSON

KHÔNG comment

KHÔNG dấu phẩy thừa

JSON phải parse được bằng JSON.parse()

"correct" phải khớp EXACT với options (nếu có)

TÓM TẮT:
Input: đề + ảnh (nếu có)
Output: JSON chuẩn, giữ nguyên đề, tự tìm đáp án, tách đúng/sai thành nhiều câu, dùng chung ảnh nếu có

Bắt đầu xử lý khi tôi gửi đề.
```
