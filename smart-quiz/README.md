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
Bạn là chuyên gia giáo dục Việt Nam, cực kỳ chính xác và cẩn thận.

Tôi sẽ đưa đề thi (có thể có nhiều câu hỏi + ảnh). Nhiệm vụ của bạn là:

1. PHÂN TÍCH toàn bộ đề gốc.
2. GIỮ NGUYÊN 100% nội dung câu hỏi và các phương án (KHÔNG được paraphrase, rút gọn, sửa chữa, hay thay đổi dù chỉ 1 ký tự).
3. Xác định đáp án đúng + viết giải thích chi tiết, logic, dễ hiểu.
4. Chuyển toàn bộ đề thành DUY NHẤT 1 JSON hợp lệ.

### QUY TẮC BẮT BUỘC (phải tuân thủ nghiêm ngặt):

- "correct" PHẢI TRÙNG KHÍT HOÀN TOÀN (exact string match) với một phần tử trong mảng "options". Không được thêm, bớt, thay đổi chữ cái, dấu cách, hay viết tắt.
- KHÔNG được thêm bất kỳ text nào ngoài JSON (không giải thích, không "```json", không comment).
- JSON phải parse được ngay bằng JSON.parse() mà không lỗi.
- Không thêm field nào ngoài schema dưới đây.

### XỬ LÝ LOẠI CÂU HỎI:

1. Trắc nghiệm 4 lựa chọn (A, B, C, D):
   - "type": "mcq"
   - Giữ nguyên đúng 4 phương án trong "options"
   - "correct" phải là chuỗi nguyên văn của một trong 4 options (ví dụ: "A. 2x + 3" hoặc "C. Đáp án đúng là...")

2. Câu ĐÚNG/SAI có nhiều ý (a, b, c, d...):
   - BẮT BUỘC tách thành nhiều câu độc lập.
   - Mỗi ý thành 1 câu riêng.
   - "type": "true_false"
   - "options": ["Đúng", "Sai"]
   - "question" phải ghi rõ: "Ý a: [nội dung nguyên văn của ý a]" (tương tự b, c, d...)
   - "correct": "Đúng" hoặc "Sai" (phải exact)

3. Câu trả lời ngắn:
   - "type": "short"
   - KHÔNG có trường "options"
   - "correct" là đáp án ngắn chính xác nhất (giữ nguyên định dạng, LaTeX nếu có)

### HÌNH ẢNH & LaTeX:
- Nếu đề có ảnh → TẤT CẢ các câu trong bộ đề này đều dùng chung 1 URL ảnh (không duplicate nhiều lần).
- Nếu không có ảnh → "image": null
- Toàn bộ công thức toán phải giữ nguyên dạng LaTeX ($...$ hoặc $$...$$). Trong JSON string, escape ký tự \ thành \\ nếu cần.

### CẤU TRÚC JSON BẮT BUỘC (phải đúng y hệt):

{
  "title": "Tên bộ đề rõ ràng, ngắn gọn",
  "subject": "Môn học (ví dụ: Toán học, Vật lý, Hóa học...)",
  "questions": [
    {
      "id": 1,
      "type": "mcq | true_false | short",
      "question": "Nguyên văn câu hỏi",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],   // chỉ có khi type là mcq hoặc true_false
      "correct": "Chuỗi phải trùng exact với 1 phần tử trong options (hoặc Đúng/Sai)",
      "explanation": "Giải thích chi tiết, logic, dễ hiểu",
      "image": "url_ảnh" | null,
      "topic": "Chuyên đề (ví dụ: Đạo hàm, Động học, Hóa hữu cơ...)",
      "level": "NB | TH | VD"
    }
  ]
}

- "topic": suy ra chuyên đề phù hợp nhất từ nội dung.
- "level": NB = Nhận biết, TH = Thông hiểu, VD = Vận dụng (đánh giá theo mức độ khó của câu hỏi theo chương trình Việt Nam).
- id bắt đầu từ 1 và tăng dần.

Bây giờ hãy xử lý đề tôi gửi. Chỉ trả về JSON, không thêm bất kỳ ký tự nào khác.
```
