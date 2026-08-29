// engine.js — game loop, state machine, entity management
// States: menu → playing (build → wave → between-waves) → win → lose

const G = {
  canvas: null,
  ctx: null,
  W: 960,
  H: 540,
  cell: 32,
  state: 'menu', // menu | playing | win | lose
  stage: 1,
  gold: 0,
  lives: 20,
  wave: 0,
  waveTotal: 0,
  waveActive: false,
  spawning: false,
  spawnQueue: [],   // {delay, type, hp, speed}
  zombies: [],
  towers: [],
  bullets: [],
  particles: [],
  startTime: 0,
  lastTs: 0,
  waveStartedAt: 0,
  // callbacks wired by UI
  onUpdate: null,   // (hud) => {}
  onWin: null,
  onLose: null,
};

const TYPE_SPEED = { normal: 0.6, fast: 1.0, tank: 0.4, armored: 0.5 };

function initGame(canvas) {
  G.canvas = canvas;
  G.ctx = canvas.getContext('2d');
  canvas.width = G.W;
  canvas.height = G.H;
}

function startStage(stageId) {
  const cfg = STAGE_CONFIG[stageId];
  const path = STAGE_PATHS[stageId];
  G.stage = stageId;
  G.gold = cfg.startGold;
  G.lives = cfg.lives;
  G.wave = 0;
  G.waveTotal = STAGE_WAVES[stageId].length;
  G.waveActive = false;
  G.spawning = false;
  G.spawnQueue = [];
  G.zombies = [];
  G.towers = [];
  G.bullets = [];
  G.particles = [];
  G.state = 'playing';
  G.lastTs = performance.now();
  if (G.onUpdate) G.onUpdate();
}

// ---- wave management ----

function startWave() {
  if (G.waveActive || G.spawning) return;
  G.wave++;
  const waveData = STAGE_WAVES[G.stage][G.wave - 1];
  if (!waveData) return;
  G.waveActive = true;
  G.spawning = true;
  G.spawnQueue = [];
  for (let i = 0; i < waveData.zombieCount; i++) {
    G.spawnQueue.push({
      delay: i * waveData.spawnInterval,
      type: waveData.zombieType,
      hp: waveData.hp,
      gold: waveData.goldReward,
    });
  }
  if (G.onUpdate) G.onUpdate();
}

function spawnZombie(spec) {
  const path = STAGE_PATHS[G.stage];
  if (!path || path.length === 0) return;
  const start = path[0];
  let type = spec.type;
  if (type === 'mix') {
    const types = ['normal', 'fast', 'tank', 'armored'];
    type = types[Math.floor(Math.random() * types.length)];
  }
  const tcfg = getZombieTypeConfig(type);
  const hpMult = tcfg ? tcfg.hpMult : 1;
  const speed = tcfg ? tcfg.speed : TYPE_SPEED.normal;
  G.zombies.push({
    x: start[0],
    y: start[1],
    hp: Math.round(spec.hp * hpMult),
    maxHp: Math.round(spec.hp * hpMult),
    speed: speed,
    type: type,
    gold: spec.gold,
    pathIdx: 1,       // next waypoint index
    distAlong: 0,
    frame: 0,
    frameTimer: 0,
    alive: true,
  });
}

// ---- update ----

function update(dt) {
  if (G.state !== 'playing') return;

  // spawning
  if (G.spawning && G.spawnQueue.length > 0) {
    const first = G.spawnQueue[0];
    const elapsed = performance.now() - G.waveStartedAt;
    if (elapsed >= first.delay) {
      spawnZombie(first);
      G.spawnQueue.shift();
    }
  } else if (G.spawning && G.spawnQueue.length === 0) {
    G.spawning = false;
  }

  // zombies move
  const path = STAGE_PATHS[G.stage];
  const toRemove = [];
  for (let i = 0; i < G.zombies.length; i++) {
    const z = G.zombies[i];
    if (!z.alive) { toRemove.push(i); continue; }
    const target = path[z.pathIdx];
    if (!target) {
      // reached end
      G.lives--;
      z.alive = false;
      toRemove.push(i);
      if (G.onUpdate) G.onUpdate();
      if (G.lives <= 0) loseStage();
      continue;
    }
    const dx = target[0] - z.x;
    const dy = target[1] - z.y;
    const dist = Math.hypot(dx, dy);
    const move = z.speed * 60 * dt;
    if (dist <= move) {
      z.x = target[0];
      z.y = target[1];
      z.pathIdx++;
    } else {
      z.x += (dx / dist) * move;
      z.y += (dy / dist) * move;
    }
    // anim
    z.frameTimer += dt;
    if (z.frameTimer > 0.4) { z.frameTimer = 0; z.frame = 1 - z.frame; }
  }
  for (let i = toRemove.length - 1; i >= 0; i--) {
    G.zombies.splice(toRemove[i], 1);
  }

  // bullets
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.life -= dt;
    if (b.life <= 0) { G.bullets.splice(i, 1); continue; }
    // find target
    if (!b.target || !b.target.alive) {
      b.target = findTarget(b.x, b.y, b.range);
      if (!b.target) { G.bullets.splice(i, 1); continue; }
    }
    const t = b.target;
    const dx = t.x - b.x, dy = t.y - b.y;
    const dist = Math.hypot(dx, dy);
    const move = b.speed * dt;
    if (dist <= move || dist < 4) {
      // hit
      t.hp -= b.damage;
      spawnHitParticles(t.x, t.y);
      if (t.hp <= 0) {
        t.alive = false;
        G.gold += t.gold;
        if (G.onUpdate) G.onUpdate();
      }
      G.bullets.splice(i, 1);
    } else {
      b.x += (dx / dist) * move;
      b.y += (dy / dist) * move;
    }
  }

  // particles
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) G.particles.splice(i, 1);
  }

  // wave completion
  if (G.waveActive && !G.spawning && G.zombies.length === 0) {
    G.waveActive = false;
    if (G.wave >= G.waveTotal) {
      winStage();
    } else if (G.onUpdate) {
      G.onUpdate(); // wave done, show "next wave" button
    }
  }
}

// ---- combat helpers (phase 3 uses towers; placeholder now) ----

function findTarget(x, y, range) {
  let best = null, bestDist = Infinity;
  for (const z of G.zombies) {
    if (!z.alive) continue;
    const d = Math.hypot(z.x - x, z.y - y);
    if (d < range && d < bestDist) { bestDist = d; best = z; }
  }
  return best;
}

function spawnHitParticles(x, y) {
  for (let i = 0; i < 4; i++) {
    G.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60,
      life: 0.3 + Math.random() * 0.2,
      color: PAL.blood[Math.floor(Math.random() * PAL.blood.length)],
    });
  }
}

// ---- win / lose ----

function winStage() {
  G.state = 'win';
  const cfg = STAGE_CONFIG[G.stage];
  const stars = Math.max(1, Math.min(3, G.lives >= 15 ? 3 : G.lives >= 10 ? 2 : 1));
  if (G.onWin) G.onWin({ gold: cfg.reward + stars * 10, stars, stage: G.stage });
}

function loseStage() {
  G.state = 'lose';
  if (G.onLose) G.onLose({ stage: G.stage });
}

// ---- render ----

function render() {
  const ctx = G.ctx;
  ctx.clearRect(0, 0, G.W, G.H);
  drawBackground(ctx);
  drawPath(ctx);
  drawTowerSlots(ctx);
  drawZombies(ctx);
  drawBullets(ctx);
  drawParticles(ctx);
}

function drawBackground(ctx) {
  // dark ground with subtle vignette
  ctx.fillStyle = '#0f120c';
  ctx.fillRect(0, 0, G.W, G.H);
  const seed = G.stage * 37;
  for (let gy = 0; gy < G.H; gy += 32) {
    for (let gx = 0; gx < G.W; gx += 32) {
      drawGround(ctx, gx, gy, 32, seed + gx + gy);
    }
  }
}

function drawPath(ctx) {
  const path = STAGE_PATHS[G.stage];
  for (let i = 0; i < path.length - 1; i++) {
    drawRoad(ctx, path[i], path[i + 1], G.cell);
  }
}

function drawTowerSlots(ctx) {
  const grid = getTowerGrid(G.stage);
  for (const s of grid) {
    // subtle grass-cover marker
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(s.x - 14, s.y - 14, 28, 28);
  }
}

function drawZombies(ctx) {
  for (const z of G.zombies) {
    drawZombie(ctx, z.x, z.y, G.cell, { frame: z.frame, hp: z.hp / z.maxHp });
  }
}

function drawBullets(ctx) {
  for (const b of G.bullets) {
    ctx.fillStyle = '#ffd033';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx) {
  for (const p of G.particles) {
    ctx.globalAlpha = Math.min(1, p.life * 3);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;
}

// ---- main loop ----

function gameLoop(ts) {
  const dt = Math.min(0.05, (ts - G.lastTs) / 1000);
  G.lastTs = ts;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function startLoop() {
  G.lastTs = performance.now();
  requestAnimationFrame(gameLoop);
}
