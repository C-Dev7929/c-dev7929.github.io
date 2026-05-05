export const AI = {
    // Trích xuất keyword đơn giản từ văn bản
    extractKeywords(text) {
        const stopWords = ['là', 'của', 'và', 'trong', 'được', 'cho', 'với', 'những', 'của', 'này'];
        return text.split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.includes(word.toLowerCase()))
            .slice(0, 5);
    },

    // Tạo giải thích thông minh giả lập
    generateExplanation(question) {
        if (question.explanation) return question.explanation;

        const keywords = this.extractKeywords(question.question);
        const templates = [
            `Phân tích câu hỏi về "${question.topic}": Bạn cần chú trọng vào các khái niệm như ${keywords.join(', ')}. Đáp án đúng là "${question.correct}" vì nó thỏa mãn các điều kiện kỹ thuật được nêu.`,
            `Ghi nhớ nhanh: Khi gặp câu hỏi liên quan đến ${keywords[0] || 'chủ đề này'}, hãy luôn nhớ rằng ${question.correct} là lựa chọn tối ưu nhất.`,
            `Giải thích logic: Dựa trên kiến thức về ${question.topic}, chúng ta thấy rằng ${question.correct} là đáp án phản ánh đúng bản chất của vấn đề.`
        ];
        
        return templates[Math.floor(Math.random() * templates.length)];
    },

    // Phân tích hiệu suất học tập
    analyzePerformance(stats) {
        const topics = stats.topicStats;
        let weakTopics = [];
        let strongTopics = [];

        for (const [topic, data] of Object.entries(topics)) {
            const rate = (data.correct / data.total) * 100;
            if (rate < 60) weakTopics.push(topic);
            else if (rate >= 90) strongTopics.push(topic);
        }

        if (weakTopics.length > 0) {
            return `AI khuyên bạn nên tập trung ôn tập phần: **${weakTopics.join(', ')}**. Bạn đang gặp khó khăn ở các câu hỏi mức độ ${stats.weakLevel || 'VD/VDC'}.`;
        }
        
        if (strongTopics.length > 0) {
            return `Tuyệt vời! Bạn đang làm rất tốt ở phần: **${strongTopics.join(', ')}**. Hãy thử thách bản thân với các câu hỏi VDC nhé!`;
        }

        return "Hãy tiếp tục hoàn thành bài quiz để AI có thêm dữ liệu phân tích sâu hơn cho bạn.";
    }
};
