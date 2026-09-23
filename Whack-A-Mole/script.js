// ---- settings ----
const TOTAL_ROUNDS = 60;   // game ends after this many rounds
const MIN_DELAY = 500;     // shortest possible wait (ms) before a mole appears
const MAX_DELAY = 2000;    // longest possible wait (ms) before a mole appears
const MIN_SIZE = 40;       // smallest mole diameter (px)
const MAX_SIZE = 100;      // largest mole diameter (px)

// ---- game state ----
let score = 0;
let round = 0;
let currentMole = null;    // reference to the mole element currently on screen
let delayTimer = null;     // the setTimeout id for the "mole appears" delay
// state can be: 'idle' | 'waiting' | 'mole-visible' | 'return' | 'ended'
let state = 'idle';

const startBtn = document.getElementById('startBtn');
const scoreEl = document.getElementById('score');
const roundsEl = document.getElementById('rounds');
const messageEl = document.getElementById('message');

// picks a random whole number between min and max (inclusive)
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// resets score/round counters and kicks off round 1
function startGame() {
  score = 0;
  round = 0;
  scoreEl.textContent = 'Score: 0';
  roundsEl.textContent = 'Round: 0 / ' + TOTAL_ROUNDS;
  messageEl.textContent = '';
  startBtn.textContent = 'Start';
  startNextRound();
}

// begins one round: hides the start button and waits a random delay
// before showing the mole somewhere random on screen
function startNextRound() {
  round++;
  roundsEl.textContent = 'Round: ' + round + ' / ' + TOTAL_ROUNDS;
  state = 'waiting';
  startBtn.style.display = 'none';
  messageEl.textContent = '';

  const delay = randomBetween(MIN_DELAY, MAX_DELAY);
  delayTimer = setTimeout(showMole, delay);
}

// creates a mole element at a random position and random size,
// then adds it to the page
function showMole() {
  const size = randomBetween(MIN_SIZE, MAX_SIZE);

  // keep the mole fully inside the viewport
  const maxX = window.innerWidth - size;
  const maxY = window.innerHeight - size;
  const x = randomBetween(0, Math.max(0, maxX));
  const y = randomBetween(0, Math.max(0, maxY));

  const mole = document.createElement('div');
  mole.className = 'mole';
  mole.style.width = size + 'px';
  mole.style.height = size + 'px';
  mole.style.left = x + 'px';
  mole.style.top = y + 'px';
  mole.addEventListener('click', whackMole);

  document.body.appendChild(mole);
  currentMole = mole;
  state = 'mole-visible';
}

// called when the player clicks the mole: scores a point and removes it
function whackMole() {
  if (state !== 'mole-visible') return;

  score++;
  scoreEl.textContent = 'Score: ' + score;

  currentMole.remove();
  currentMole = null;

  if (round >= TOTAL_ROUNDS) {
    endGame();
  } else {
    // wait for the player to move the mouse back to the start button
    state = 'return';
    startBtn.style.display = 'inline-block';
    messageEl.textContent = 'Move your mouse back to Start for the next round';
  }
}

// triggered when the mouse re-enters the start button between rounds
function onStartHover() {
  if (state === 'return') {
    startNextRound();
  }
}

// stops the game immediately, clearing any pending mole and timer
function endGame() {
  state = 'ended';
  clearTimeout(delayTimer);
  if (currentMole) {
    currentMole.remove();
    currentMole = null;
  }
  startBtn.style.display = 'inline-block';
  startBtn.textContent = 'Play Again';
  messageEl.textContent = 'Game over! Final score: ' + score + ' / ' + round;
}

// clicking the start button either begins a new game (from idle/ended)
// or does nothing while a round is already in progress
startBtn.addEventListener('click', () => {
  if (state === 'idle' || state === 'ended') {
    startGame();
  }
});

// moving the mouse back onto the start button starts the next round
startBtn.addEventListener('mouseenter', onStartHover);

// pressing ESC ends the game early, from any state
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state !== 'idle' && state !== 'ended') {
    endGame();
  }
});