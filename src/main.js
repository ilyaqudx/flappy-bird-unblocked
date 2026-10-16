import './style.css';
import { FlappyEngine, DIFFICULTY_MODES } from './flappy-engine.js';
import { audio } from './audio.js';

// DOM Elements
const canvas = document.getElementById('flappy-canvas');
const ctx = canvas.getContext('2d');

const btnRestartEl = document.getElementById('btn-restart');
const selectDiffEl = document.getElementById('select-diff');
const selectThemeEl = document.getElementById('select-theme');
const btnSoundEl = document.getElementById('btn-sound');
const soundIconEl = document.getElementById('sound-icon');
const btnHelpEl = document.getElementById('btn-help');
const modalHelpEl = document.getElementById('modal-help');
const modalGameOverEl = document.getElementById('modal-gameover');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const medalBoxEl = document.getElementById('medal-box');
const btnPlayAgainLoss = document.getElementById('btn-play-again-loss');
const canvasOverlayEl = document.getElementById('canvas-overlay');
const btnTapFlap = document.getElementById('btn-tap-flap');

// Initialize Game Engine
const game = new FlappyEngine();

// Sound Setup
function updateSoundIcon() {
  soundIconEl.textContent = audio.isMuted() ? '🔇' : '🔊';
}
updateSoundIcon();
btnSoundEl.addEventListener('click', () => {
  audio.toggleMute();
  updateSoundIcon();
});

// Canvas Scaling
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
  ctx.scale((rect.width * dpr) / game.V_WIDTH, (rect.height * dpr) / game.V_HEIGHT);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// User Input Handling
function handleFlap() {
  if (game.status === 'gameover') return;

  const jumped = game.jump();
  if (jumped) {
    audio.playFlap();
    canvasOverlayEl.hidden = true;
  }
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleFlap();
});

btnTapFlap.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleFlap();
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
    e.preventDefault();
    handleFlap();
  }
});

// Restart Actions
function restartGame() {
  game.reset();
  modalGameOverEl.hidden = true;
  canvasOverlayEl.hidden = false;
}
btnRestartEl.addEventListener('click', restartGame);
btnPlayAgainLoss.addEventListener('click', restartGame);

// Config Changes
selectDiffEl.addEventListener('change', (e) => {
  game.difficulty = e.target.value;
  restartGame();
});

selectThemeEl.addEventListener('change', (e) => {
  game.theme = e.target.value;
});

// Help Modal
btnHelpEl.addEventListener('click', () => { modalHelpEl.hidden = false; });
document.querySelectorAll('.modal-close').forEach(b => {
  b.addEventListener('click', () => { modalHelpEl.hidden = true; });
});
modalHelpEl.addEventListener('click', (e) => {
  if (e.target === modalHelpEl) modalHelpEl.hidden = true;
});

// Main Animation Loop
let lastTime = performance.now();

function gameLoop(now) {
  const dt = Math.min(2.0, (now - lastTime) / (1000 / 60)); // normalized to 60fps delta
  lastTime = now;

  const res = game.update(dt);

  if (res.event === 'score') {
    audio.playScore();
  } else if (res.event === 'hit_pipe' || res.event === 'hit_ground') {
    audio.playHit();
    setTimeout(() => audio.playDie(), 120);

    // Show Game Over Modal
    finalScoreEl.textContent = game.score;
    bestScoreEl.textContent = game.bestScore;
    const medal = game.getMedal();
    if (medal) {
      medalBoxEl.hidden = false;
      medalBoxEl.innerHTML = `Achievement Medal: <b>${medal.emoji} ${medal.name}</b>`;
    } else {
      medalBoxEl.hidden = true;
    }
    setTimeout(() => { modalGameOverEl.hidden = false; }, 450);
  }

  render();
  requestAnimationFrame(gameLoop);
}

// Canvas Drawing
function render() {
  const W = game.V_WIDTH;
  const H = game.V_HEIGHT;

  // 1. Sky Background
  if (game.theme === 'night') {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#0a0d1a');
    skyGrad.addColorStop(1, '#1b223c');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(30, 40, 2, 2);
    ctx.fillRect(85, 90, 2.5, 2.5);
    ctx.fillRect(140, 30, 2, 2);
    ctx.fillRect(210, 80, 2.5, 2.5);
    ctx.fillRect(280, 45, 2, 2);

    // Crescent Moon
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(260, 60, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0d1a';
    ctx.beginPath();
    ctx.arc(252, 54, 14, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Day Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#4fc3f7');
    skyGrad.addColorStop(0.7, '#b3e5fc');
    skyGrad.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Fluffy Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    game.clouds.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.h / 1.5, 0, Math.PI * 2);
      ctx.arc(c.x + c.w * 0.35, c.y - c.h * 0.25, c.h * 0.8, 0, Math.PI * 2);
      ctx.arc(c.x + c.w * 0.7, c.y, c.h / 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Skyline Silhouettes
  ctx.fillStyle = game.theme === 'night' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(148, 163, 184, 0.4)';
  ctx.fillRect(10, 320, 35, 90);
  ctx.fillRect(50, 300, 40, 110);
  ctx.fillRect(100, 335, 30, 75);
  ctx.fillRect(140, 290, 45, 120);
  ctx.fillRect(195, 315, 38, 95);
  ctx.fillRect(240, 280, 42, 130);
  ctx.fillRect(290, 325, 30, 85);

  // 2. Draw Pipes
  game.pipes.forEach(p => {
    // Top Pipe
    drawPipe(p.x, 0, p.width, p.topHeight, true);
    // Bottom Pipe
    drawPipe(p.x, p.bottomY, p.width, game.PLAY_HEIGHT - p.bottomY, false);
  });

  // 3. Draw Particles
  game.particles.forEach(pt => {
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });

  // 4. Draw Animated Bird
  drawBird(game.bird);

  // 5. Ground
  const gh = game.GROUND_HEIGHT;
  const gy = game.PLAY_HEIGHT;

  // Dirt base
  ctx.fillStyle = '#ded895';
  ctx.fillRect(0, gy, W, gh);

  // Grass top border
  ctx.fillStyle = '#73bf2e';
  ctx.fillRect(0, gy, W, 14);

  // Grass blade accents
  ctx.fillStyle = '#558b2f';
  for (let gx = -20 - game.groundScroll; gx < W + 20; gx += 16) {
    ctx.beginPath();
    ctx.moveTo(gx, gy + 14);
    ctx.lineTo(gx + 6, gy + 4);
    ctx.lineTo(gx + 12, gy + 14);
    ctx.fill();
  }

  // 6. In-Game Big Arcade Score (Floating centered)
  if (game.status === 'playing') {
    ctx.font = '900 38px var(--font-mono)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Black text border outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.strokeText(`${game.score}`, W / 2, 35);

    // White fill
    ctx.fillStyle = '#fff';
    ctx.fillText(`${game.score}`, W / 2, 35);
  }
}

function drawPipe(x, y, w, h, isTop) {
  const pipeColorLight = '#73bf2e';
  const pipeColorDark = '#558b2f';
  const pipeHighlight = '#a3e635';
  const pipeBorder = '#2e5a1c';

  // Body Gradient
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, pipeColorLight);
  grad.addColorStop(0.2, pipeHighlight);
  grad.addColorStop(0.7, pipeColorLight);
  grad.addColorStop(1, pipeColorDark);

  ctx.fillStyle = grad;
  ctx.strokeStyle = pipeBorder;
  ctx.lineWidth = 2.5;

  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  // Pipe Cap Rim (5px wider than body)
  const capH = 22;
  const capW = w + 8;
  const capX = x - 4;
  const capY = isTop ? y + h - capH : y;

  ctx.fillRect(capX, capY, capW, capH);
  ctx.strokeRect(capX, capY, capW, capH);
}

function drawBird(bird) {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  // Body (Yellow Circle)
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Belly highlight
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(-2, 3, bird.radius * 0.65, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(5, -4, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pupil
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(6.5, -4, 2, 0, Math.PI * 2);
  ctx.fill();

  // Beak (Orange Triangle)
  ctx.fillStyle = '#f97316';
  ctx.strokeStyle = '#c2410c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, -1);
  ctx.lineTo(16, 2);
  ctx.lineTo(8, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wing flap animation
  const flapOffset = Math.sin(performance.now() * 0.02) * 3;
  ctx.fillStyle = '#fde047';
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(-5, 1 + flapOffset, 6, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// Start Main Animation Loop
requestAnimationFrame(gameLoop);
