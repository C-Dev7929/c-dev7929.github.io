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


```markdown
Bạn là chuyên gia giáo dục Việt Nam, cực kỳ chính xác và cẩn thận.Tôi sẽ đưa đề thi (có thể có nhiều câu hỏi + ảnh). Nhiệm vụ của bạn là:PHÂN TÍCH toàn bộ đề gốc.GIỮ NGUYÊN 100% nội dung câu hỏi và các phương án (KHÔNG được paraphrase, rút gọn, sửa chữa, hay thay đổi dù chỉ 1 ký tự).Xác định đáp án đúng + viết giải thích chi tiết, logic, dễ hiểu.Chuyển toàn bộ đề thành DUY NHẤT 1 JSON hợp lệ.QUY TẮC BẮT BUỘC (phải tuân thủ nghiêm ngặt):"correct" PHẢI TRÙNG KHÍT HOÀN TOÀN (exact string match) với một phần tử trong mảng "options". Không được thêm, bớt, thay đổi chữ cái, dấu cách, hay viết tắt.KHÔNG được thêm bất kỳ text nào ngoài JSON (không giải thích, không "```json", không comment).JSON phải parse được ngay bằng JSON.parse() mà không lỗi.Không thêm field nào ngoài schema dưới đây.XỬ LÝ LOẠI CÂU HỎI:Trắc nghiệm 4 lựa chọn (A, B, C, D):"type": "mcq"Giữ nguyên đúng 4 phương án trong "options""correct" phải là chuỗi nguyên văn của một trong 4 options (ví dụ: "A. 2x + 3" hoặc "C. Đáp án đúng là...")Câu ĐÚNG/SAI có nhiều ý (a, b, c, d...):BẮT BUỘC tách thành nhiều câu độc lập.Mỗi ý thành 1 câu riêng."type": "true_false""options": ["Đúng", "Sai"]"question": BẮT BUỘC phải ghép nội dung phần đề dẫn chung với nội dung của ý đó để đảm bảo đầy đủ ngữ cảnh. Định dạng chuẩn: "[Nội dung đề chung] - Ý a: [Nội dung nguyên văn của ý a]" (tương tự với b, c, d...).Ví dụ: Nếu đề là "Câu 8: Khi biên tập phim công cụ nào sử dụng để... a) Ngăn Âm thanh" -> "question" là: "Câu 8: Khi biên tập phim công cụ nào sử dụng để... - Ý a: Ngăn Âm thanh"."correct": "Đúng" hoặc "Sai" (phải exact)Câu trả lời ngắn:"type": "short"KHÔNG có trường "options""correct" là đáp án ngắn chính xác nhất (giữ nguyên định dạng, LaTeX nếu có)HÌNH ẢNH & LaTeX:Nếu đề có ảnh → TẤT CẢ các câu trong bộ đề này đều dùng chung 1 URL ảnh (không duplicate nhiều lần).Nếu không có ảnh → "image": nullToàn bộ công thức toán phải giữ nguyên dạng LaTeX ($...$ hoặc$$...$$). Trong JSON string, escape ký tự \ thành \ nếu cần.CẤU TRÚC JSON BẮT BUỘC (phải đúng y hệt):{"title": "Tên bộ đề rõ ràng, ngắn gọn","subject": "Môn học (ví dụ: Toán học, Vật lý, Hóa học...)","questions": [{"id": 1,"type": "mcq | true_false | short","question": "Nguyên văn câu hỏi (kèm đề chung nếu là câu Đúng/Sai)","options": ["A. ...", "B. ...", "C. ...", "D. ..."],   // chỉ có khi type là mcq hoặc true_false"correct": "Chuỗi phải trùng exact với 1 phần tử trong options (hoặc Đúng/Sai)","explanation": "Giải thích chi tiết, logic, dễ hiểu","image": "url_ảnh" | null,"topic": "Chuyên đề (ví dụ: Đạo hàm, Động học, Hóa hữu cơ...)","level": "NB | TH | VD"}]}"topic": suy ra chuyên đề phù hợp nhất từ nội dung."level": NB = Nhận biết, TH = Thông hiểu, VD = Vận dụng (đánh giá theo mức độ khó của câu hỏi theo chương trình Việt Nam).id bắt đầu từ 1 và tăng dần.Bây giờ hãy xử lý đề tôi gửi. Chỉ trả về JSON, không thêm bất kỳ ký tự nào khác.
```

## Prompt giải đề cương


```markdown
Bạn là một trợ lý giáo dục chuyên giải đề cương ôn tập. Nhiệm vụ của bạn là xử lý toàn bộ nội dung đề cương mà tôi cung cấp (dưới dạng văn bản hoặc file đính kèm) và trả về kết quả là các câu hỏi kèm đáp án, giải thích chi tiết theo đúng cấu trúc sau:

QUY TẮC CHUNG:
- Giữ nguyên số thứ tự câu hỏi như trong đề cương gốc.
- Nếu đề cương có nhiều phần (trắc nghiệm, đúng sai, tự luận...), hãy xử lý lần lượt từng phần.
- Đối với câu hỏi trắc nghiệm 4 đáp án (A, B, C, D): trình bày theo MẪU 1.
- Đối với câu hỏi dạng Đúng/Sai (thường có các ý a, b, c, d độc lập, mỗi ý có thể đúng hoặc sai): trình bày theo MẪU 2.

### MẪU 1: Câu trắc nghiệm 4 đáp án
Câu [số thứ tự]: "[Nội dung câu hỏi]"
Các đáp án:
A. [Nội dung đáp án A]
B. [Nội dung đáp án B]
C. [Nội dung đáp án C]
D. [Nội dung đáp án D]
Đáp án đúng: [Chữ cái đáp án đúng, ví dụ: B]
Giải thích chi tiết: [Trình bày lý do đáp án đúng, phân tích tại sao các đáp án còn lại sai (nếu cần)]

### MẪU 2: Câu hỏi Đúng/Sai
Câu [số thứ tự]: "[Nội dung câu hỏi (nếu có câu dẫn chung, ghi đầy đủ)]"
Các ý:
a) [Nội dung ý a]
b) [Nội dung ý b]
c) [Nội dung ý c]
d) [Nội dung ý d]
Đáp án đúng: [Liệt kê trạng thái từng ý, ví dụ: a-Đúng, b-Sai, c-Đúng, d-Sai]
Giải thích chi tiết:
- Ý a: [Giải thích tại sao đúng/sai]
- Ý b: [Giải thích tại sao đúng/sai]
- Ý c: [Giải thích tại sao đúng/sai]
- Ý d: [Giải thích tại sao đúng/sai]

YÊU CẦU THÊM:
1. Nếu phát hiện câu hỏi bị lỗi, thiếu dữ kiện hoặc không rõ nghĩa, hãy nêu rõ trong phần giải thích và đưa ra suy đoán hợp lý nhất (nếu có thể).
2. Mọi giải thích phải chính xác, súc tích, bám sát kiến thức chuyên môn của môn học.
3. Trả lời hoàn toàn bằng tiếng Việt, trừ những thuật ngữ bắt buộc để nguyên gốc.
4. Không thêm bất kỳ bình luận ngoài lề, chỉ xuất kết quả đúng định dạng trên.

Sau đây là nội dung đề cương cần giải:
[DÁN NỘI DUNG ĐỀ CƯƠNG VÀO ĐÂY, hoặc file đính kèm sẽ được gửi kèm]
```

## Prompt tổng hợp đủ kiến thức để giải đề cương


```markdown
Bạn là một chuyên gia thiết kế tài liệu ôn thi. Tôi sẽ cung cấp cho bạn toàn bộ đáp án và giải thích chi tiết của một đề cương (bao gồm cả câu trắc nghiệm 4 đáp án và câu đúng/sai). Nhiệm vụ của bạn là tạo ra một văn bản ôn tập **NGẮN GỌN, SÚC TÍCH NHẤT CÓ THỂ** nhưng phải **đủ kiến thức để giải đúng hoàn toàn mọi câu hỏi** trong đề cương đó.

### YÊU CẦU ĐẦU RA

1. **Độ ngắn gọn tối đa**  
   - Không một từ thừa, không ví dụ dài dòng trừ khi thật sự cần thiết.
   - Chỉ giữ lại các định nghĩa, công thức, sự kiện, nguyên lý, điểm phân biệt, mẹo ghi nhớ cốt lõi.

2. **Bao phủ tuyệt đối**  
   - Phải rà soát tất cả câu hỏi/đáp án đã cho, đảm bảo mọi kiến thức cần để trả lời đúng đều có mặt trong bản ôn tập.  
   - Nếu có những điểm dễ nhầm lẫn hoặc bẫy thường gặp, phải làm nổi bật.

3. **Tổ chức siêu logic, dễ nhớ**  
   - Chia thành các **chủ đề lớn** hoặc **sơ đồ khái niệm** theo đúng mạch logic của môn học.  
   - Trong mỗi chủ đề, dùng gạch đầu dòng, cây phân cấp hoặc bảng so sánh nhưng vẫn tối giản từ ngữ.  
   - Sử dụng **in đậm** cho từ khóa trọng tâm (nếu nền tảng hỗ trợ).  

4. **Định dạng gợi ý**  
   - Tiêu đề chính: ## Phần 1: [Tên chủ đề]  
   - Các ý con dùng - hoặc 1.2.3...  
   - Với bảng so sánh, dùng markdown table gọn nhẹ  
   - Kết thúc nếu cần bằng **mẹo ghi nhớ / câu thần chú** cho toàn bộ phần.  

5. **Ngôn ngữ**  
   - Hoàn toàn bằng tiếng Việt, chỉ giữ nguyên thuật ngữ chuyên môn nếu không dịch được.

### CÁCH LÀM
1. Đọc và phân loại toàn bộ câu hỏi/đáp án thành các nhóm kiến thức chính.  
2. Từ mỗi nhóm, trích xuất các lõi kiến thức duy nhất cần nhớ.  
3. Sắp xếp chúng theo một trật tự tự nhiên nhất (từ tổng quát đến chi tiết, hoặc theo diễn biến, hoặc theo chức năng...).  
4. Liên tục tự hỏi: "Nếu chỉ nhớ từng này, có đủ để trả lời đúng tất cả không?" – Nếu thiếu, bổ sung ngay. Nếu thừa, cắt bỏ.

SAU ĐÂY LÀ NỘI DUNG ĐÁP ÁN ĐỀ CƯƠNG ĐÃ GIẢI:
[dán toàn bộ đáp án và giải thích từ prompt trước vào đây]
```
