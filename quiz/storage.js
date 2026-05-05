export const Storage = {
    saveQuizState(quizId, state) {
        const allStates = JSON.parse(localStorage.getItem('quiz_states') || '{}');
        allStates[quizId] = state;
        localStorage.setItem('quiz_states', JSON.stringify(allStates));
    },

    getQuizState(quizId) {
        const allStates = JSON.parse(localStorage.getItem('quiz_states') || '{}');
        return allStates[quizId] || null;
    },

    saveUserStats(stats) {
        localStorage.setItem('user_stats', JSON.stringify(stats));
    },

    getUserStats() {
        const defaultStats = {
            xp: 0,
            level: 1,
            streak: 0,
            lastDate: null,
            correctAnswers: 0,
            totalAnswers: 0,
            topicStats: {}
        };
        return JSON.parse(localStorage.getItem('user_stats') || JSON.stringify(defaultStats));
    },

    clearState(quizId) {
        const allStates = JSON.parse(localStorage.getItem('quiz_states') || '{}');
        delete allStates[quizId];
        localStorage.setItem('quiz_states', JSON.stringify(allStates));
    },

    saveQuizToHistory(quiz) {
        let history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
        const exists = history.find(h => h.id === quiz.id);
        if (!exists) {
            history.unshift(quiz);
            // Limit to 20 items
            if (history.length > 20) history.pop();
            localStorage.setItem('quiz_history', JSON.stringify(history));
        }
    },

    getQuizHistory() {
        return JSON.parse(localStorage.getItem('quiz_history') || '[]');
    }
};
