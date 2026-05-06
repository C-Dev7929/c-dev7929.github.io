import { Storage } from './storage.js';
import { AI } from './ai-module.js';
import { UIRenderer } from './ui-render.js';

class QuizApp {
    constructor() {
        this.quizData = null;
        this.state = {
            currentIndex: 0,
            answers: {}, // { questionId: selectedOption }
            startTime: Date.now(),
            viewMode: 'card' // 'card' or 'list'
        };
        this.userStats = Storage.getUserStats();
        
        this.initEventListeners();
        this.loadInitialState();
        lucide.createIcons();
    }

    initEventListeners() {
        document.getElementById('btn-load-sample').onclick = () => this.loadQuiz('sample.json');
        document.getElementById('file-input').onchange = (e) => this.handleFileUpload(e);
        document.getElementById('btn-prev').onclick = () => this.navigate(-1);
        document.getElementById('btn-next').onclick = () => this.navigate(1);
        document.getElementById('btn-theme').onclick = () => this.toggleTheme();
        document.getElementById('btn-reset').onclick = () => this.resetQuiz();
        document.getElementById('btn-stats').onclick = () => this.showStats();
        document.getElementById('btn-share').onclick = () => this.shareQuiz();
        document.getElementById('btn-import').onclick = () => document.getElementById('file-input').click();
        document.getElementById('btn-history').onclick = () => this.showHistory();
        
        // Finish screen buttons
        document.getElementById('btn-restart').onclick = () => this.resetQuiz();
        document.getElementById('btn-home').onclick = () => window.location.href = window.location.pathname;

        // View Switcher
        document.getElementById('view-card').onclick = () => this.switchView('card');
        document.getElementById('view-list').onclick = () => this.switchView('list');

        // URL Import listeners
        const btnShowUrl = document.getElementById('btn-show-url-modal');
        if (btnShowUrl) btnShowUrl.onclick = () => this.showModal('modal-import-url');
        
        const btnConfirmUrl = document.getElementById('btn-confirm-url');
        if (btnConfirmUrl) {
            btnConfirmUrl.onclick = () => {
                const url = document.getElementById('url-input').value;
                if (url) {
                    this.loadQuiz(url);
                    this.hideModals();
                }
            };
        }

        // Close modals on background click
        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                this.hideModals();
            }
        };

        // Close buttons for modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.onclick = () => this.hideModals();
        });
    }

    switchView(mode) {
        this.state.viewMode = mode;
        document.getElementById('view-card').classList.toggle('active', mode === 'card');
        document.getElementById('view-list').classList.toggle('active', mode === 'list');
        
        const cardArea = document.getElementById('question-card');
        const listArea = document.getElementById('quiz-list-view');
        
        if (mode === 'card') {
            cardArea.classList.remove('hidden');
            listArea.classList.add('hidden');
        } else {
            cardArea.classList.add('hidden');
            listArea.classList.remove('hidden');
        }
        
        if (this.quizId) Storage.saveQuizState(this.quizId, this.state);
        this.render();
    }

    shareQuiz() {
        if (!this.quizData) return;
        const jsonStr = JSON.stringify(this.quizData);
        // Using LZ-String for much better compression
        const compressed = LZString.compressToEncodedURIComponent(jsonStr);
        const url = `${window.location.origin}${window.location.pathname}?cdata=${compressed}`;
        
        navigator.clipboard.writeText(url).then(() => {
            alert('Đã sao chép link chia sẻ (đã nén) vào bộ nhớ tạm!');
        });
    }

    async loadQuiz(source, isLocalFile = false, resetState = false) {
        try {
            let data;
            if (typeof source === 'string') {
                const response = await fetch(source);
                if (!response.ok) throw new Error('Không thể tải file từ nguồn này.');
                data = await response.json();
                data.sourceUrl = source;
            } else {
                data = source;
            }
            
            this.setupQuiz(data, resetState);
            
            // Save to history
            Storage.saveQuizToHistory({
                id: this.quizId,
                title: data.title,
                subject: data.subject,
                date: new Date().toLocaleDateString('vi-VN'),
                sourceUrl: data.sourceUrl || null,
                rawData: isLocalFile ? data : null
            });
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    }

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                // Reset progress on explicit new file upload
                this.loadQuiz(data, true, true);
            } catch (err) {
                alert('Lỗi định dạng JSON không hợp lệ!');
            }
        };
        reader.readAsText(file);
    }

    setupQuiz(data, forceReset = false) {
        if (!data || !data.questions || !Array.isArray(data.questions)) {
            alert('Dữ liệu không hợp lệ!');
            return;
        }

        this.quizData = data;
        const title = data.title || 'untitled';
        this.quizId = btoa(unescape(encodeURIComponent(title))).substring(0, 10);
        
        if (forceReset) {
            Storage.clearState(this.quizId);
            this.state = { currentIndex: 0, answers: {}, startTime: Date.now(), viewMode: this.state.viewMode || 'card' };
        } else {
            const saved = Storage.getQuizState(this.quizId);
            this.state = saved || { currentIndex: 0, answers: {}, startTime: Date.now(), viewMode: 'card' };
        }

        document.getElementById('quiz-title').textContent = data.title;
        document.getElementById('quiz-subject').textContent = data.subject;
        document.getElementById('empty-state').classList.add('hidden');
        document.getElementById('finish-screen').classList.add('hidden');
        
        // Restore view visibility
        const mode = this.state.viewMode;
        document.getElementById('question-card').classList.toggle('hidden', mode !== 'card');
        document.getElementById('quiz-list-view').classList.toggle('hidden', mode === 'card');

        this.render();
    }

    handleAnswer(option, index = null) {
        const targetIndex = index !== null ? index : this.state.currentIndex;
        const currentQ = this.quizData.questions[targetIndex];
        
        if (this.state.answers[currentQ.id]) return;
        
        this.state.answers[currentQ.id] = option;
        const isCorrect = option === currentQ.correct;
        this.updateUserStats(currentQ, isCorrect);
        
        currentQ.displayExplanation = AI.generateExplanation(currentQ);
        Storage.saveQuizState(this.quizId, this.state);
        this.render();

        // Check for completion
        if (Object.keys(this.state.answers).length === this.quizData.questions.length) {
            this.finishQuiz();
        }
    }

    finishQuiz() {
        setTimeout(() => {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#22c55e', '#f59e0b']
            });

            const correctCount = Object.values(this.state.answers).filter((ans, idx) => {
                return ans === this.quizData.questions[idx].correct;
            }).length;

            document.getElementById('f-correct').textContent = correctCount;
            document.getElementById('f-score').textContent = Math.round((correctCount / this.quizData.questions.length) * 100) + '%';
            
            document.getElementById('question-card').classList.add('hidden');
            document.getElementById('quiz-list-view').classList.add('hidden');
            document.getElementById('finish-screen').classList.remove('hidden');
        }, 800);
    }

    updateUserStats(question, isCorrect) {
        this.userStats.totalAnswers++;
        if (isCorrect) {
            this.userStats.correctAnswers++;
            this.userStats.xp += 10;
        } else {
            this.userStats.xp += 2;
        }

        if (!this.userStats.topicStats[question.topic]) {
            this.userStats.topicStats[question.topic] = { total: 0, correct: 0 };
        }
        this.userStats.topicStats[question.topic].total++;
        if (isCorrect) this.userStats.topicStats[question.topic].correct++;

        Storage.saveUserStats(this.userStats);
    }

    navigate(step) {
        const newIndex = this.state.currentIndex + step;
        if (newIndex >= 0 && newIndex < this.quizData.questions.length) {
            this.state.currentIndex = newIndex;
            this.render();
        }
    }

    resetQuiz() {
        if (confirm('Bạn có chắc muốn làm lại từ đầu?')) {
            Storage.clearState(this.quizId);
            this.state = { currentIndex: 0, answers: {}, startTime: Date.now(), viewMode: this.state.viewMode };
            document.getElementById('finish-screen').classList.add('hidden');
            this.render();
        }
    }

    toggleTheme() {
        const html = document.documentElement;
        const isDark = html.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        const icon = document.querySelector('#btn-theme i');
        if (icon) {
            icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
            lucide.createIcons();
        }
    }

    showStats() {
        this.showModal('modal-stats');
        const accuracy = Math.round((this.userStats.correctAnswers / this.userStats.totalAnswers) * 100) || 0;
        document.getElementById('stat-score').textContent = `${accuracy}%`;
        document.getElementById('stat-xp').textContent = this.userStats.xp;
        document.getElementById('ai-advice').innerHTML = AI.analyzePerformance(this.userStats);
        
        const list = document.getElementById('topic-stats-list');
        list.innerHTML = '';
        for (const [topic, data] of Object.entries(this.userStats.topicStats)) {
            const p = Math.round((data.correct / data.total) * 100);
            list.innerHTML += `<div class="topic-stat-row"><span>${topic}</span><div class="mini-bar"><div style="width: ${p}%"></div></div><span>${p}%</span></div>`;
        }
    }

    showHistory() {
        const history = Storage.getQuizHistory();
        UIRenderer.renderHistory(history, (item) => {
            if (item.sourceUrl) {
                this.loadQuiz(item.sourceUrl);
            } else if (item.rawData) {
                this.setupQuiz(item.rawData);
            }
            this.hideModals();
        });
        this.showModal('modal-history');
    }

    showModal(id) {
        document.getElementById(id).classList.remove('hidden');
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }

    render() {
        if (!this.quizData) return;
        
        if (this.state.viewMode === 'card') {
            const currentQ = this.quizData.questions[this.state.currentIndex];
            if (!currentQ) return;
            currentQ.folderUrl = (this.quizData.folderUrl || this.quizData.FolerImgUrl || this.quizData.FolderImgUrl || "");
            currentQ.displayExplanation = currentQ.displayExplanation || AI.generateExplanation(currentQ);
            UIRenderer.renderQuestion(currentQ, this.state.answers[currentQ.id], (opt) => this.handleAnswer(opt));
            document.getElementById('btn-prev').disabled = this.state.currentIndex === 0;
            document.getElementById('btn-next').disabled = this.state.currentIndex === this.quizData.questions.length - 1;
            document.getElementById('question-card').classList.remove('hidden');
        } else {
            this.quizData.questions.forEach(q => {
                q.folderUrl = (this.quizData.folderUrl || this.quizData.FolerImgUrl || this.quizData.FolderImgUrl || "");
                q.displayExplanation = q.displayExplanation || AI.generateExplanation(q);
            });
            UIRenderer.renderListView(this.quizData.questions, this.state, (idx, opt) => this.handleAnswer(opt, idx));
            document.getElementById('quiz-list-view').classList.remove('hidden');
        }
        
        UIRenderer.renderQuestionGrid(this.quizData.questions, this.state, (idx) => {
            this.state.currentIndex = idx;
            if (this.state.viewMode === 'card') this.render();
            else {
                const el = document.getElementById(`q-item-${idx}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        
        const answeredCount = Object.keys(this.state.answers).length;
        UIRenderer.updateProgress(answeredCount, this.quizData.questions.length);
    }

    loadInitialState() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark');
            const icon = document.querySelector('#btn-theme i');
            if (icon) icon.setAttribute('data-lucide', 'moon');
        }

        const params = new URLSearchParams(window.location.search);
        
        const cdata = params.get('cdata');
        if (cdata) {
            try {
                const jsonStr = LZString.decompressFromEncodedURIComponent(cdata);
                const data = JSON.parse(jsonStr);
                this.setupQuiz(data);
            } catch (e) { console.error('Lỗi giải nén:', e); }
        }

        const remoteUrl = params.get('url');
        if (remoteUrl) this.loadQuiz(remoteUrl);

        const sharedData = params.get('data');
        if (sharedData) {
            try {
                const jsonStr = decodeURIComponent(escape(atob(sharedData)));
                const data = JSON.parse(jsonStr);
                this.setupQuiz(data);
            } catch (e) {}
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});
