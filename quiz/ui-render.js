export const UIRenderer = {
    renderQuestionGrid(questions, userState, onSelect) {
        const grid = document.getElementById('question-grid');
        grid.innerHTML = '';
        if (!questions || !Array.isArray(questions)) return;

        questions.forEach((q, index) => {
            const btn = document.createElement('div');
            btn.className = 'q-nav-item';
            btn.textContent = index + 1;
            
            if (userState.answers && q.id && userState.answers[q.id]) {
                const isCorrect = userState.answers[q.id] === q.correct;
                btn.classList.add(isCorrect ? 'correct' : 'incorrect');
            }
            
            if (userState.currentIndex === index) btn.classList.add('active');
            
            btn.onclick = () => onSelect(index);
            grid.appendChild(btn);
        });
    },

    renderQuestion(question, userAnswer, onAnswer) {
        document.getElementById('q-text').textContent = question.question;
        document.getElementById('q-topic').textContent = question.topic;
        document.getElementById('q-level').textContent = question.level;
        
        // Handle Image
        const imgContainer = document.getElementById('q-image-container');
        if (question.image) {
            let baseUrl = question.folderUrl || "";
            if (baseUrl && !baseUrl.endsWith('/')) baseUrl += '/';
            document.getElementById('q-image').src = baseUrl + question.image;
            imgContainer.classList.remove('hidden');
        } else {
            imgContainer.classList.add('hidden');
        }

        // Render Options
        const container = document.getElementById('options-container');
        container.innerHTML = '';
        if (question.options && Array.isArray(question.options)) {
            question.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.innerHTML = `<span class="opt-text">${opt}</span>`;
                
                if (userAnswer) {
                    btn.disabled = true;
                    if (opt === question.correct) btn.classList.add('correct');
                    else if (opt === userAnswer) btn.classList.add('incorrect');
                } else {
                    btn.onclick = () => onAnswer(opt);
                }
                container.appendChild(btn);
            });
        }

        // Feedback
        const feedback = document.getElementById('feedback-area');
        if (userAnswer) {
            feedback.classList.remove('hidden');
            const isCorrect = userAnswer === question.correct;
            document.getElementById('feedback-title').textContent = isCorrect ? 'Chính xác!' : 'Chưa đúng rồi...';
            document.getElementById('feedback-icon').setAttribute('data-lucide', isCorrect ? 'check-circle' : 'x-circle');
            document.getElementById('q-explanation').textContent = question.displayExplanation;
            lucide.createIcons();
        } else {
            feedback.classList.add('hidden');
        }
    },

    updateProgress(current, total) {
        const percent = (current / total) * 100;
        document.getElementById('progress-text').textContent = `${current}/${total}`;
        document.getElementById('progress-fill').style.width = `${percent}%`;
    },

    renderListView(questions, userState, onAnswer) {
        const container = document.getElementById('quiz-list-view');
        container.innerHTML = '';
        if (!questions || !Array.isArray(questions)) return;

        questions.forEach((q, index) => {
            const item = document.createElement('div');
            item.className = 'list-question-item';
            item.id = `q-item-${index}`;
            
            const userAnswer = userState.answers ? userState.answers[q.id] : null;
            
            // Build Question Content
            let html = `
                <div class="list-q-header">
                    <span>Câu ${index + 1}</span>
                    <div class="badges">
                        <span class="badge topic">${q.topic || ''}</span>
                        <span class="badge level">${q.level || ''}</span>
                    </div>
                </div>
                <div class="q-content">
                    <h2>${q.question || ''}</h2>
                    ${q.image ? `
                        <div class="q-image">
                            <img src="${(q.folderUrl || '') + q.image}" alt="Question Image">
                        </div>
                    ` : ''}
                </div>
                <div class="options-container">
            `;
            
            // Options
            if (q.options && Array.isArray(q.options)) {
                q.options.forEach(opt => {
                    let statusClass = '';
                    let disabledAttr = userAnswer ? 'disabled' : '';
                    
                    if (userAnswer) {
                        if (opt === q.correct) statusClass = 'correct';
                        else if (opt === userAnswer) statusClass = 'incorrect';
                    }
                    
                    html += `<button class="option-btn ${statusClass}" ${disabledAttr} data-opt="${opt}">${opt}</button>`;
                });
            }
            
            html += `</div>`;
            
            // Feedback
            if (userAnswer) {
                const isCorrect = userAnswer === q.correct;
                html += `
                    <div class="feedback-area">
                        <div class="feedback-status">
                            <i data-lucide="${isCorrect ? 'check-circle' : 'x-circle'}"></i>
                            <span>${isCorrect ? 'Chính xác!' : 'Chưa đúng rồi...'}</span>
                        </div>
                        <div class="ai-explanation">
                            <div class="ai-badge"><i data-lucide="sparkles"></i> AI Giải thích</div>
                            <p>${q.displayExplanation || ""}</p>
                        </div>
                    </div>
                `;
            }
            
            item.innerHTML = html;
            
            // Event listeners
            item.querySelectorAll('.option-btn').forEach(btn => {
                btn.onclick = () => onAnswer(index, btn.getAttribute('data-opt'));
            });
            
            container.appendChild(item);
        });
        
        lucide.createIcons();
        this.renderMath();
    },

    renderMath() {
        if (window.renderMathInElement) {
            renderMathInElement(document.body, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
            });
        }
    },

    renderHistory(history, onLoad) {
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        if (history.length === 0) {
            list.innerHTML = '<p class="empty-msg">Chưa có bộ đề nào trong lịch sử.</p>';
            return;
        }

        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="h-info">
                    <div class="h-title">${item.title}</div>
                    <div class="h-meta">${item.subject} • ${item.date}</div>
                </div>
                <button class="btn-load-h">Làm lại</button>
            `;
            div.querySelector('.btn-load-h').onclick = () => onLoad(item);
            list.appendChild(div);
        });
    }
};
