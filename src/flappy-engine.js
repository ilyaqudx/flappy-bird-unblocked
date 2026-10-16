// Flappy Bird Pure Physics & Game Engine

export const DIFFICULTY_MODES = {
  easy: {
    name: 'Easy',
    gravity: 0.24,
    jumpVelocity: -5.4,
    pipeGap: 125,
    speed: 1.8,
    movingPipes: false
  },
  normal: {
    name: 'Normal',
    gravity: 0.28,
    jumpVelocity: -5.8,
    pipeGap: 105,
    speed: 2.2,
    movingPipes: false
  },
  hard: {
    name: 'Hard (Moving)',
    gravity: 0.32,
    jumpVelocity: -6.2,
    pipeGap: 92,
    speed: 2.6,
    movingPipes: true
  }
};

export class FlappyEngine {
  constructor() {
    this.V_WIDTH = 320;
    this.V_HEIGHT = 480;
    this.GROUND_HEIGHT = 70;
    this.PLAY_HEIGHT = this.V_HEIGHT - this.GROUND_HEIGHT;

    this.difficulty = 'normal';
    this.theme = 'day'; // 'day' | 'night'
    this.status = 'ready'; // 'ready' | 'playing' | 'gameover'
    
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('flappy_best_score') || '0', 10);

    this.bird = {
      x: 75,
      y: 200,
      vy: 0,
      radius: 12,
      rotation: 0,
      wingTimer: 0
    };

    this.pipes = [];
    this.particles = [];
    this.clouds = [
      { x: 30, y: 70, w: 60, h: 24, speed: 0.3 },
      { x: 160, y: 110, w: 80, h: 28, speed: 0.25 },
      { x: 280, y: 50, w: 50, h: 20, speed: 0.35 }
    ];

    this.groundScroll = 0;
    this.pipeTimer = 0;
    this.time = 0;

    this.reset();
  }

  reset() {
    const config = DIFFICULTY_MODES[this.difficulty];
    this.status = 'ready';
    this.score = 0;
    this.bird.x = 75;
    this.bird.y = 200;
    this.bird.vy = 0;
    this.bird.rotation = 0;
    this.bird.wingTimer = 0;
    this.pipes = [];
    this.particles = [];
    this.pipeTimer = 0;
    this.groundScroll = 0;
  }

  jump() {
    if (this.status === 'gameover') return false;

    if (this.status === 'ready') {
      this.status = 'playing';
    }

    const config = DIFFICULTY_MODES[this.difficulty];
    this.bird.vy = config.jumpVelocity;

    // Spawn tiny feather particles
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: this.bird.x - 6,
        y: this.bird.y + 4,
        vx: (Math.random() - 0.5) * 1.5 - 1,
        vy: (Math.random() - 0.5) * 1.5 + 1,
        color: '#facc15',
        life: 1.0,
        decay: 0.04
      });
    }

    return true;
  }

  spawnPipe() {
    const config = DIFFICULTY_MODES[this.difficulty];
    const gap = config.pipeGap;
    const minTop = 40;
    const maxTop = this.PLAY_HEIGHT - gap - 40;
    const topHeight = Math.floor(minTop + Math.random() * (maxTop - minTop));

    this.pipes.push({
      x: this.V_WIDTH + 10,
      topHeight: topHeight,
      bottomY: topHeight + gap,
      gap: gap,
      width: 52,
      scored: false,
      baseTop: topHeight,
      oscSpeed: (Math.random() * 0.03 + 0.02) * (Math.random() > 0.5 ? 1 : -1),
      oscRange: config.movingPipes ? 35 : 0
    });
  }

  update(dt = 1) {
    this.time += dt;
    const config = DIFFICULTY_MODES[this.difficulty];

    // Scroll Clouds
    this.clouds.forEach(c => {
      c.x -= c.speed * dt;
      if (c.x + c.w < 0) {
        c.x = this.V_WIDTH + 20;
        c.y = 40 + Math.random() * 100;
      }
    });

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.status === 'ready') {
      // Gentle hovering wave
      this.bird.y = 200 + Math.sin(this.time * 0.08) * 6;
      this.bird.rotation = 0;
      this.groundScroll = (this.groundScroll + config.speed * dt) % 20;
      return { event: null };
    }

    if (this.status === 'playing') {
      // 1. Bird Physics
      this.bird.vy += config.gravity * dt;
      this.bird.y += this.bird.vy * dt;

      // Rotation based on vertical velocity (-25 deg to 75 deg)
      if (this.bird.vy < 0) {
        this.bird.rotation = -0.38; // Tilting up
      } else {
        this.bird.rotation = Math.min(1.2, this.bird.rotation + 0.05 * dt); // Tilting down
      }

      // Ground Collision
      if (this.bird.y + this.bird.radius >= this.PLAY_HEIGHT) {
        this.bird.y = this.PLAY_HEIGHT - this.bird.radius;
        this.status = 'gameover';
        this.saveBest();
        return { event: 'hit_ground' };
      }

      // Ceiling Collision
      if (this.bird.y - this.bird.radius <= 0) {
        this.bird.y = this.bird.radius;
        this.bird.vy = 0;
      }

      // 2. Pipes Spawning & Movement
      this.groundScroll = (this.groundScroll + config.speed * dt) % 20;
      this.pipeTimer += dt;
      if (this.pipeTimer >= 95 / (config.speed / 2.2)) {
        this.spawnPipe();
        this.pipeTimer = 0;
      }

      let scoredThisFrame = false;

      for (let i = this.pipes.length - 1; i >= 0; i--) {
        const pipe = this.pipes[i];
        pipe.x -= config.speed * dt;

        // Oscillate if Hard mode
        if (config.movingPipes && pipe.oscRange > 0) {
          const shift = Math.sin(this.time * pipe.oscSpeed) * pipe.oscRange;
          pipe.topHeight = Math.max(30, Math.min(this.PLAY_HEIGHT - pipe.gap - 30, pipe.baseTop + shift));
          pipe.bottomY = pipe.topHeight + pipe.gap;
        }

        // Score Check
        if (!pipe.scored && pipe.x + pipe.width < this.bird.x) {
          pipe.scored = true;
          this.score += 1;
          scoredThisFrame = true;

          // Sparkle burst
          for (let s = 0; s < 6; s++) {
            this.particles.push({
              x: this.bird.x + (Math.random() - 0.5) * 20,
              y: this.bird.y + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              color: '#38bdf8',
              life: 1.0,
              decay: 0.05
            });
          }
        }

        // Collision Check (Circle to Rect)
        const bx = this.bird.x;
        const by = this.bird.y;
        const br = this.bird.radius - 2; // slightly forgiving hitbox

        // Check Top Pipe
        if (this.circleIntersectsRect(bx, by, br, pipe.x, 0, pipe.width, pipe.topHeight)) {
          this.status = 'gameover';
          this.saveBest();
          return { event: 'hit_pipe' };
        }

        // Check Bottom Pipe
        if (this.circleIntersectsRect(bx, by, br, pipe.x, pipe.bottomY, pipe.width, this.PLAY_HEIGHT - pipe.bottomY)) {
          this.status = 'gameover';
          this.saveBest();
          return { event: 'hit_pipe' };
        }

        // Remove off-screen pipes
        if (pipe.x + pipe.width < -10) {
          this.pipes.splice(i, 1);
        }
      }

      if (scoredThisFrame) {
        this.saveBest();
        return { event: 'score' };
      }
    }

    if (this.status === 'gameover') {
      // Fall down to ground if in air
      if (this.bird.y + this.bird.radius < this.PLAY_HEIGHT) {
        this.bird.vy += config.gravity * 1.5 * dt;
        this.bird.y += this.bird.vy * dt;
        this.bird.rotation = 1.35;
      }
    }

    return { event: null };
  }

  circleIntersectsRect(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const distanceX = cx - closestX;
    const distanceY = cy - closestY;
    return (distanceX * distanceX + distanceY * distanceY) < (cr * cr);
  }

  saveBest() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('flappy_best_score', this.bestScore);
    }
  }

  getMedal() {
    if (this.score >= 50) return { name: 'Platinum', emoji: '💎', color: '#e0e7ff' };
    if (this.score >= 30) return { name: 'Gold', emoji: '🥇', color: '#fbbf24' };
    if (this.score >= 20) return { name: 'Silver', emoji: '🥈', color: '#cbd5e1' };
    if (this.score >= 10) return { name: 'Bronze', emoji: '🥉', color: '#d97706' };
    return null;
  }
}
