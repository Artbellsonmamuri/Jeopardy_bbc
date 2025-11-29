class BibleJeopardy {
  constructor() {
    this.questions = [];
    this.currentGameQuestions = new Set(); // track recently used questions (no repeat for multiple games)
    this.score = 0;
    this.streak = 0;
    this.gamesPlayed = 0;
    this.currentQuestion = null;
    this.currentCell = null;

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
    const saved = localStorage.getItem('bibleJeopardyChristmas');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.currentGameQuestions = new Set(state.usedQuestions || []);
        this.gamesPlayed = state.gamesPlayed || 0;
      } catch (e) {
        console.warn('Could not parse saved state, clearing it.');
        localStorage.removeItem('bibleJeopardyChristmas');
      }
    }
  }

  saveGameState() {
    localStorage.setItem('bibleJeopardyChristmas', JSON.stringify({
      usedQuestions: Array.from(this.currentGameQuestions),
      gamesPlayed: this.gamesPlayed
    }));
  }

  bindEvents() {
    // Board cells
    document.querySelectorAll('.clue-cell').forEach(cell => {
      cell.addEventListener('click', async () => {
        if (cell.classList.contains('used')) return;
        const category = parseInt(cell.dataset.category, 10);
        const difficulty = parseInt(cell.dataset.difficulty, 10);
        await this.selectQuestion(category, difficulty, cell);
      });
    });

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

    const idx = Math.floor(Math.random() * available.length);
    return available[idx];
  }

  async selectQuestion(category, difficulty, cellElement) {
    const q = await this.getRandomQuestion(category, difficulty);
    if (!q) {
      alert('No more questions available for this slot. Try another square.');
      cellElement.classList.add('used');
      return;
    }

    this.currentQuestion = q;
    this.currentCell = cellElement;
    this.currentGameQuestions.add(q.id);
    this.saveGameState();

    this.showQuestionScreen();
    this.updateQuestionDisplay();
  }

  showGameScreen() {
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('questionScreen').classList.remove('active');
    document.getElementById('resultsScreen').classList.remove('active');
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

    document.getElementById('questionCategory').textContent =
      this.getCategoryName(this.currentQuestion.category);

    document.getElementById('questionPrize').textContent =
      this.getPrizeName(this.currentQuestion.difficulty);

    document.getElementById('questionText').textContent =
      this.currentQuestion.clue;

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

    const isCorrect =
      user &&
      (user === correct ||
        correct.includes(user) ||
        user.includes(correct));

    if (isCorrect) {
      const points = this.getPrizeValue(this.currentQuestion.difficulty);
      this.score += points;
      this.streak++;

      answerDiv.innerHTML =
        `✅ Correct!<br><strong>${this.currentQuestion.answer}</strong><br>+${points} points`;
      answerDiv.className = 'correct-answer correct';
    } else {
      this.streak = 0;
      answerDiv.innerHTML =
        `❌ Incorrect<br><strong>Correct: ${this.currentQuestion.answer}</strong>`;
      answerDiv.className = 'correct-answer incorrect';
    }

    if (this.currentCell) {
      this.currentCell.classList.add('used');
    }

    this.updateUI();

    setTimeout(() => {
      // Check if all 25 squares are used
      const remaining = Array.from(document.querySelectorAll('.clue-cell'))
        .filter(c => !c.classList.contains('used')).length;
      if (remaining === 0) {
        this.showResultsScreen();
      } else {
        this.showGameScreen();
      }
    }, 2200);
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
    // adjust if you want different scoring
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
    const total = this.questions.length;
    // if almost all used or after 10 games, reset the "do not repeat" pool
    if (this.currentGameQuestions.size >= total * 0.8 || this.gamesPlayed >= 10) {
      this.currentGameQuestions.clear();
      this.gamesPlayed = 0;
      this.saveGameState();
    }
  }

  startNewGame() {
    this.score = 0;
    this.streak = 0;
    this.gamesPlayed++;
    this.checkNewGameReset();

    // reset board cells
    document.querySelectorAll('.clue-cell').forEach(c => c.classList.remove('used'));

    this.showGameScreen();
    this.updateUI();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.jeopardyApp = new BibleJeopardy();
});
