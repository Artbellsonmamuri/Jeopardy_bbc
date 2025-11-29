class BibleJeopardy {
    constructor() {
        this.questions = [];
        this.currentGameQuestions = new Set();
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
        this.checkNewGame();
    }

    async loadQuestions() {
        try {
            const response = await fetch('questions.json');
            this.questions = await response.json();
            console.log(`Loaded ${this.questions.length} questions`);
        } catch (error) {
            console.error('Failed to load questions:', error);
            alert('Please ensure questions.json is in the same folder');
        }
    }

    loadGameState() {
        const saved = localStorage.getItem('bibleJeopardy');
        if (saved) {
            const state = JSON.parse(saved);
            this.currentGameQuestions = new Set(state.usedQuestions || []);
            this.gamesPlayed = state.gamesPlayed || 0;
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
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedCategory = parseInt(e.target.dataset.category);
            });
        });

        // Difficulty buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedDifficulty = parseInt(e.target.dataset.difficulty);
            });
        });

        // Game actions
        document.getElementById('backBtn').addEventListener('click', () => this.showGameScreen());
        document.getElementById('submitBtn').addEventListener('click', () => this.checkAnswer());
        document.getElementById('answerInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkAnswer();
        });
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());

        // Auto-focus input
        document.getElementById('answerInput').addEventListener('focus', function() {
            this.select();
        });
    }

    async getRandomQuestion(category, difficulty) {
        const availableQuestions = this.questions.filter(q => 
            q.category === category && 
            q.difficulty === difficulty && 
            !this.currentGameQuestions.has(q.id)
        );

        if (availableQuestions.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        const question = availableQuestions[randomIndex];
        this.currentGameQuestions.add(question.id);
        return question;
    }

    async selectQuestion() {
        if (!this.selectedCategory || !this.selectedDifficulty) {
            alert('Please select a category and difficulty first!');
            return;
        }

        this.currentQuestion = await this.getRandomQuestion(this.selectedCategory, this.selectedDifficulty);
        
        if (!this.currentQuestion) {
            alert('No more questions available for this category/difficulty. Try another!');
            return;
        }

        this.showQuestionScreen();
        this.updateQuestionDisplay();
        this.saveGameState();
    }

    showGameScreen() {
        document.getElementById('gameScreen').classList.add('active');
        document.getElementById('questionScreen').classList.remove('active');
        document.getElementById('resultsScreen').classList.remove('active');
        document.querySelectorAll('.category-btn, .diff-btn').forEach(btn => btn.classList.remove('selected'));
        this.selectedCategory = null;
        this.selectedDifficulty = null;
    }

    showQuestionScreen() {
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('questionScreen').classList.add('active');
        document.getElementById('answerInput').focus();
    }

    updateQuestionDisplay() {
        document.getElementById('questionCategory').textContent = this.getCategoryName();
        document.getElementById('questionPrize').textContent = this.getPrizeName();
        document.getElementById('questionText').textContent = this.currentQuestion.clue;
        document.getElementById('correctAnswer').innerHTML = '';
        document.getElementById('answerInput').value = '';
    }

    checkAnswer() {
        const userAnswer = document.getElementById('answerInput').value.trim().toLowerCase();
        const correctAnswer = this.currentQuestion.answer.toLowerCase();

        const answerDiv = document.getElementById('correctAnswer');
        
        if (userAnswer === correctAnswer || 
            correctAnswer.includes(userAnswer) || 
            userAnswer.includes(correctAnswer)) {
            
            const points = this.getPrizeValue();
            this.score += points;
            this.streak++;
            
            answerDiv.innerHTML = `✅ Correct!<br><strong>${this.currentQuestion.answer}</strong><br>+${points} points!`;
            answerDiv.className = 'correct-answer correct';
            
            setTimeout(() => {
                this.updateUI();
                this.showGameScreen();
            }, 3000);
            
        } else {
            this.streak = 0;
            answerDiv.innerHTML = `❌ Incorrect<br><strong>Correct: ${this.currentQuestion.answer}</strong>`;
            answerDiv.className = 'correct-answer incorrect';
            
            setTimeout(() => {
                this.updateUI();
                this.showGameScreen();
            }, 3000);
        }
    }

    getCategoryName() {
        const names = ['Place', 'Person', 'Event', 'Number', 'Food'];
        return names[this.currentQuestion.category];
    }

    getPrizeName() {
        const prizes = ['Candy', 'Small Pack', 'Medium Pack', 'Big Pack', '₱50 Cash'];
        return prizes[this.currentQuestion.difficulty - 1];
    }

    getPrizeValue() {
        const values = [10, 25, 50, 100, 200];
        return values[this.currentQuestion.difficulty - 1];
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('streak').textContent = this.streak;
        document.getElementById('gamesPlayed').textContent = this.gamesPlayed;
        
        const available = this.questions.filter(q => !this.currentGameQuestions.has(q.id));
        document.getElementById('availableCount').textContent = available.length;
    }

    checkNewGame() {
        // Reset after 10 games or if all questions used
        const totalQuestions = this.questions.length;
        if (this.currentGameQuestions.size >= Math.min(150, totalQuestions * 0.8) || 
            this.gamesPlayed >= 10) {
            this.newGame();
        }
    }

    newGame() {
        this.score = 0;
        this.streak = 0;
        this.gamesPlayed++;
        this.currentGameQuestions.clear();
        localStorage.removeItem('bibleJeopardy');
        this.updateUI();
        this.showResultsScreen();
    }

    showResultsScreen() {
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('questionScreen').classList.remove('active');
        document.getElementById('resultsScreen').classList.add('active');
        document.getElementById('finalScore').textContent = this.score;
    }
}

// Add click handler for difficulty/category selection
document.addEventListener('DOMContentLoaded', function() {
    // Override default button behavior - select question on double-click or Enter
    document.querySelectorAll('.category-btn, .diff-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Visual feedback only
        });
        
        // Select question when both category and difficulty are selected
        btn.addEventListener('dblclick', function() {
            const game = window.jeopardyApp;
            if (game.selectedCategory && game.selectedDifficulty) {
                game.selectQuestion();
            }
        });
    });

    // Global Enter to select question from game screen
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && document.getElementById('gameScreen').classList.contains('active')) {
            window.jeopardyApp.selectQuestion();
        }
    });
});

// Initialize app
window.jeopardyApp = new BibleJeopardy();
