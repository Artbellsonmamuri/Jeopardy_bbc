class BibleJeopardy {
    constructor() {
        this.questions = [];
        this.currentGameQuestions = new Set(); // IDs used in last up-to-10 games
        this.score = 0;
        this.streak = 0;
        this.gamesPlayed = 0;
        this.currentQuestion = null;
        this.selectedCategory = null;
        this.selectedDifficulty = null;

        this.init();
    }

    async init() {
        await this.loadQuestions();
        this.loadGameState();
        this.bindEvents();
        this.updateUI();
        this.checkNewGameReset();
    }

    async loadQuestions() {
        try {
            console.log('Fetching questions.json...');
            const response = await fetch('questions.json');
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error('HTTP status ' + response.status);
            }
            this.questions = await response.json();
            console.log(`Loaded ${this.questions.length} questions from JSON`);
        } catch (error) {
            console.error('Failed to load questions:', error);
            alert('Failed to load questions. Please check that questions.json is in the same folder and is valid JSON.');
        }
    }

    loadGameState() {
        const saved = localStorage.getItem('bibleJeopardy');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.currentGameQuestions = new Set(state.usedQuestions || []);
                this.gamesPlayed = state.gamesPlayed || 0;
                console.log('Loaded game state from localStorage');
            } catch (e) {
                console.warn('Could not parse saved state, clearing it.');
                localStorage.removeItem('bibleJeopardy');
            }
        }
    }

    saveGameState() {
        localStorage.setItem('bibleJeopardy', JSON.stringify({
            usedQuestions: Array.from(this.currentGameQuestions),
            gamesPlayed: this.gamesPlayed
        }));
    }

    bindEvents() {
        // Category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.category-btn')
                    .forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedCategory = parseInt(e.target.dataset.category, 10);
            });
        });

        // Difficulty buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.diff-btn')
                    .forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedDifficulty = parseInt(e.target.dataset.difficulty, 10);
            });
        });

        // Navigation / actions
        document.getElementById('backBtn')
            .addEventListener('click', () => this.showGameScreen());

        document.getElementById('submitBtn')
            .addEventListener('click', () => this.checkAnswer());

        document.getElementById('answerInput')
            .addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.checkAnswer();
                }
            });

        document.getElementById('newGameBtn')
            .addEventListener('click', () => this.startNewGame());

        // Press Enter on game screen to pick a question
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' &&
                document.getElementById('gameScreen').classList.contains('active')) {
                this.selectQuestion();
            }
        });
    }

    async selectQuestion() {
        if (this.selectedCategory === null || this.selectedDifficulty === null) {
            alert('Please select a category and difficulty first.');
            return;
        }

        const q = await this.getRandomQuestion(this.selectedCategory, this.selectedDifficulty);
        if (!q) {
            alert('No more questions available for this category and difficulty. Please choose another combination.');
            return;
        }

        this.currentQuestion = q;
        this.currentGameQuestions.add(q.id);
        this.saveGameState();
        this.showQuestionScreen();
        this.updateQuestionDisplay();
    }

    async getRandomQuestion(category, difficulty) {
        const available = this.questions.filter(q =>
            q.category === category &&
            q.difficulty === difficulty &&
            !this.currentGameQuestions.has(q.id)
        );

        if (available.length === 0) {
            console.log('No available questions for cat', category, 'diff', difficulty);
            return null;
        }

        const randomIndex = Math.floor(Math.random() * available.length);
        return available[randomIndex];
    }

    showGameScreen() {
        document.getElementById('gameScreen').classList.add('active');
        document.getElementById('questionScreen').classList.remove('active');
        document.getElementById('resultsScreen').classList.remove('active');

        // Reset visual selection, but keep score
        document.querySelectorAll('.category-btn, .diff-btn')
            .forEach(btn => btn.classList.remove('selected'));
        this.selectedCategory = null;
        this.selectedDifficulty = null;
    }

    showQuestionScreen() {
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('questionScreen').classList.add('active');
        document.getElementById('resultsScreen').classList.remove('active');
        const input = document.getElementById('answerInput');
        input.value = '';
        input.focus();
    }

    showResultsScreen() {
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('questionScreen').classList.remove('active');
        document.getElementById('resultsScreen').classList.add('active');
        document.getElementById('finalScore').textContent = this.score.toString();
    }

    updateQuestionDisplay() {
        if (!this.currentQuestion) return;

        document.getElementById('questionCategory').textContent = this.getCategoryName(this.currentQuestion.category);
        document.getElementById('questionPrize').textContent = this.getPrizeName(this.currentQuestion.difficulty);
        document.getElementById('questionText').textContent = this.currentQuestion.clue;

        const answerDiv = document.getElementById('correctAnswer');
        answerDiv.textContent = '';
        answerDiv.className = 'correct-answer';
    }

    checkAnswer() {
        if (!this.currentQuestion) return;

        const input = document.getElementById('answerInput');
        const user = (input.value || '').trim().toLowerCase();
        const correct = this.currentQuestion.answer.trim().toLowerCase();

        const answerDiv = document.getElementById('correctAnswer');

        // Very simple matching: exact or contains either way
        if (user && (user === correct || correct.includes(user) || user.includes(correct))) {
            const points = this.getPrizeValue(this.currentQuestion.difficulty);
            this.score += points;
            this.streak++;

            answerDiv.innerHTML = `✅ Correct!<br><strong>${this.currentQuestion.answer}</strong><br>+${points} points`;
            answerDiv.className = 'correct-answer correct';
        } else {
            this.streak = 0;
            answerDiv.innerHTML = `❌ Incorrect<br><strong>Correct: ${this.currentQuestion.answer}</strong>`;
            answerDiv.className = 'correct-answer incorrect';
        }

        this.updateUI();

        setTimeout(() => {
            this.showGameScreen();
        }, 2500);
    }

    getCategoryName(cat) {
        const names = ['Place', 'Person', 'Event', 'Number', 'Food'];
        return names[cat] || 'Unknown';
    }

    getPrizeName(diff) {
        const prizes = ['Candy', 'Small Pack', 'Medium Pack', 'Big Pack', '₱50 Cash'];
        return prizes[diff - 1] || '';
    }

    getPrizeValue(diff) {
        // Adjust values as you like
        const values = [10, 25, 50, 100, 200];
        return values[diff - 1] || 0;
    }

    updateUI() {
        document.getElementById('score').textContent = this.score.toString();
        document.getElementById('streak').textContent = this.streak.toString();
        document.getElementById('gamesPlayed').textContent = this.gamesPlayed.toString();

        const available = this.questions.filter(q => !this.currentGameQuestions.has(q.id));
        document.getElementById('availableCount').textContent = available.length.toString();
    }

    checkNewGameReset() {
        const totalQuestions = this.questions.length;
        // If almost all questions used or 10 games played, reset pool
        if (this.currentGameQuestions.size >= totalQuestions || this.gamesPlayed >= 10) {
            console.log('Resetting question pool after many games.');
            this.currentGameQuestions.clear();
            this.gamesPlayed = 0;
            this.saveGameState();
            this.updateUI();
        }
    }

    startNewGame() {
        // Called from "New Game" button on results screen
        this.score = 0;
        this.streak = 0;
        this.gamesPlayed++;
        this.checkNewGameReset();
        this.showGameScreen();
        this.updateUI();
    }
}

// Initialize AFTER DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.jeopardyApp = new BibleJeopardy();
});
