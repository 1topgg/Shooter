// ═══════════════════════════════════════════════════════
//  SHOOTER MVP  –  complete rewrite
// ═══════════════════════════════════════════════════════

const canvas  = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');

// ── DOM refs ──────────────────────────────────────────
const healthBar       = document.getElementById('health-bar');
const ammoCurrent     = document.getElementById('ammo-current');
const ammoReserve     = document.getElementById('ammo-reserve');
const reloadIndicator = document.getElementById('reload-indicator');
const scoreEl         = document.getElementById('score');
const waveEl          = document.getElementById('wave');
const overlay         = document.getElementById('overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const finalScoreText  = document.getElementById('final-score-text');
const startBtn        = document.getElementById('start-btn');
const restartBtn      = document.getElementById('restart-btn');

// ── Constants ──────────────────────────────────────────
const TILE        = 40;
const PLAYER_R    = 14;
const BULLET_R    = 5;
const ENEMY_R     = 16;
const PICKUP_R    = 12;

const PLAYER_SPEED        = 220;
const PLAYER_SPRINT_MUL   = 1.6;
const PLAYER_MAX_HP       = 100;

const MAG_SIZE            = 10;
const RESERVE_MAX         = 60;
const RELOAD_TIME         = 1.8;   // seconds
const FIRE_COOLDOWN       = 0.18;  // seconds between shots

const BULLET_SPEED        = 620;
const BULLET_LIFETIME     = 1.2;   // seconds

const ENEMY_BASE_SPEED    = 90;
const ENEMY_BASE_HP       = 30;
const ENEMY_DAMAGE        = 12;
const ENEMY_ATTACK_RATE   = 0.9;   // seconds between hits
const ENEMY_ATTACK_RANGE  = PLAYER_R + ENEMY_R + 4;

const PICKUP_SPAWN_CHANCE = 0.35;  // chance per enemy death

// ── State ──────────────────────────────────────────────
let W, H, worldW, worldH;
let camera = { x: 0, y: 0 };

let player, bullets, enemies, obstacles, pickups, particles;
let score, wave, waveEnemiesLeft, waveSpawned;
let gameRunning = false;
let lastTime = 0;

// Input
const keys   = {};
let   mouse  = { x: 0, y: 0, down: false };

// ── Init ───────────────────────────────────────────────
function resize() {
  canvas.width  = W = window.innerWidth;
  canvas.height = H = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ── Start / Restart ────────────────────────────────────
function startGame() {
  worldW = 2400;
  worldH = 1800;

  player = {
    x: worldW / 2,
    y: worldH / 2,
    angle: 0,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    ammo: MAG_SIZE,
    reserve: RESERVE_MAX,
    reloading: false,
    reloadTimer: 0,
    fireCooldown: 0,
    speed: PLAYER_SPEED,
    trail: [],
  };

  bullets   = [];
  enemies   = [];
  particles = [];
  pickups   = [];

  score           = 0;
  wave            = 1;
  waveEnemiesLeft = 0;
  waveSpawned     = 0;

  buildObstacles();
  spawnWave();
  updateHUD();

  overlay.classList.remove('active');
  gameoverOverlay.classList.add('hidden');

  gameRunning = true;
  lastTime    = performance.now();
  requestAnimationFrame(loop);
}

// ── Obstacle layout ────────────────────────────────────
function buildObstacles() {
  obstacles = [];

  // Border walls (invisible but collision-real)
  const T = TILE;

  // Scatter rectangular crates and walls across the world
  const defs = [
    // [cx, cy, w, h]  — in tiles
    [15, 10,  5, 2],
    [25, 10,  2, 5],
    [35, 14,  4, 2],
    [10, 20,  2, 6],
    [20, 22,  6, 2],
    [30, 20,  3, 4],
    [40, 22,  5, 2],
    [50, 10,  2, 5],
    [48, 20,  4, 2],
    [12, 32,  5, 2],
    [22, 30,  2, 4],
    [32, 34,  6, 2],
    [44, 32,  2, 5],
    [52, 30,  3, 2],
    [10, 40,  4, 2],
    [20, 42,  2, 4],
    [30, 40,  5, 2],
    [42, 42,  2, 5],
    [52, 40,  4, 2],
    [15, 28,  2, 4],
    [38, 28,  3, 2],
    [28, 16,  2, 3],
  ];

  for (const [cx, cy, tw, th] of defs) {
    obstacles.push({
      x: cx * T,
      y: cy * T,
      w: tw * T,
      h: th * T,
    });
  }
}

// ── Wave spawning ──────────────────────────────────────
function spawnWave() {
  const count  = 4 + wave * 2;
  const hp     = ENEMY_BASE_HP + (wave - 1) * 15;
  const speed  = ENEMY_BASE_SPEED + (wave - 1) * 8;

  waveEnemiesLeft = count;
  waveSpawned     = 0;

  // Spawn over time — we'll do instant here but stagger via spawnEnemy
  for (let i = 0; i < count; i++) {
    spawnEnemy(hp, speed);
  }
  waveEl.textContent = wave;
}

function spawnEnemy(hp, speed) {
  let x, y, tries = 0;
  do {
    // Spawn on world edges or far from player
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { x = Math.random() * worldW; y = 30; }
    else if (side === 1) { x = worldW - 30; y = Math.random() * worldH; }
    else if (side === 2) { x = Math.random() * worldW; y = worldH - 30; }
    else { x = 30; y = Math.random() * worldH; }
    tries++;
  } while (tries < 20 && dist(x, y, player.x, player.y) < 350);

  enemies.push({
    x, y,
    hp,
    maxHp: hp,
    speed,
    angle: 0,
    attackTimer: Math.random() * ENEMY_ATTACK_RATE,
    hitFlash: 0,
    // wave-based type
    type: wave >= 3 && Math.random() < 0.25 ? 'heavy' : 'normal',
  });
}

// ── Main loop ──────────────────────────────────────────
function loop(ts) {
  if (!gameRunning) return;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

// ── Update ─────────────────────────────────────────────
function update(dt) {
  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updateParticles(dt);
  updatePickups(dt);
  checkWave();
  updateHUD();
}

function updatePlayer(dt) {
  const p = player;

  // Aim angle toward mouse (world coords)
  const wx = camera.x + mouse.x;
  const wy = camera.y + mouse.y;
  p.angle = Math.atan2(wy - p.y, wx - p.x);

  // Movement
  const sprint = keys['ShiftLeft'] || keys['ShiftRight'];
  const spd    = p.speed * (sprint ? PLAYER_SPRINT_MUL : 1) * dt;
  let   dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx = (dx / len) * spd;
    dy = (dy / len) * spd;
  }

  moveEntity(p, dx, dy, PLAYER_R);

  // Clamp to world
  p.x = clamp(p.x, PLAYER_R, worldW - PLAYER_R);
  p.y = clamp(p.y, PLAYER_R, worldH - PLAYER_R);

  // Sprint trail
  if (sprint && (dx !== 0 || dy !== 0)) {
    p.trail.push({ x: p.x, y: p.y, life: 0.25 });
  }
  p.trail = p.trail.filter(t => {
    t.life -= dt;
    return t.life > 0;
  });

  // Reload timer
  if (p.reloading) {
    p.reloadTimer -= dt;
    if (p.reloadTimer <= 0) {
      const need   = MAG_SIZE - p.ammo;
      const actual = Math.min(need, p.reserve);
      p.ammo   += actual;
      p.reserve -= actual;
      p.reloading = false;
    }
  }

  // Fire cooldown
  if (p.fireCooldown > 0) p.fireCooldown -= dt;

  // Shooting
  if (mouse.down && !p.reloading && p.fireCooldown <= 0) {
    if (p.ammo > 0) {
      fireBullet();
      p.ammo--;
      p.fireCooldown = FIRE_COOLDOWN;
    } else if (p.reserve > 0) {
      startReload();
    }
  }

  // Reload key
  if (keys['KeyR'] && !p.reloading && p.ammo < MAG_SIZE && p.reserve > 0) {
    startReload();
  }

  // Pickup key
  if (keys['KeyE']) {
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pk = pickups[i];
      if (dist(p.x, p.y, pk.x, pk.y) < PLAYER_R + PICKUP_R + 10) {
        applyPickup(pk);
        pickups.splice(i, 1);
        break;
      }
    }
  }

  // Camera
  camera.x = clamp(p.x - W / 2, 0, worldW - W);
  camera.y = clamp(p.y - H / 2, 0, worldH - H);
}

function startReload() {
  player.reloading   = true;
  player.reloadTimer = RELOAD_TIME;
}

function fireBullet() {
  const p     = player;
  const spread = 0.04;
  const angle  = p.angle + (Math.random() - 0.5) * spread;
  bullets.push({
    x:    p.x + Math.cos(angle) * (PLAYER_R + BULLET_R + 2),
    y:    p.y + Math.sin(angle) * (PLAYER_R + BULLET_R + 2),
    vx:   Math.cos(angle) * BULLET_SPEED,
    vy:   Math.sin(angle) * BULLET_SPEED,
    life: BULLET_LIFETIME,
  });
  // Muzzle flash particles
  spawnParticles(
    p.x + Math.cos(angle) * (PLAYER_R + 10),
    p.y + Math.sin(angle) * (PLAYER_R + 10),
    '#ffe066', 5, 60
  );
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    if (b.life <= 0) { bullets.splice(i, 1); continue; }

    const nx = b.x + b.vx * dt;
    const ny = b.y + b.vy * dt;

    // Hit obstacle
    if (bulletHitsObstacle(b.x, b.y, nx, ny)) {
      spawnParticles(b.x, b.y, '#aaaaaa', 4, 80);
      bullets.splice(i, 1);
      continue;
    }

    // World bounds
    if (nx < 0 || nx > worldW || ny < 0 || ny > worldH) {
      bullets.splice(i, 1);
      continue;
    }

    b.x = nx; b.y = ny;

    // Hit enemy
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (dist(b.x, b.y, e.x, e.y) < BULLET_R + ENEMY_R) {
        const dmg = e.type === 'heavy' ? 8 : 15;  // bullets deal less to heavy
        e.hp -= dmg;
        e.hitFlash = 0.12;
        spawnParticles(b.x, b.y, '#ff4444', 6, 100);
        bullets.splice(i, 1);
        hit = true;

        if (e.hp <= 0) {
          score += e.type === 'heavy' ? 30 : 10;
          waveEnemiesLeft--;
          spawnParticles(e.x, e.y, '#ff6633', 14, 140);
          if (Math.random() < PICKUP_SPAWN_CHANCE) spawnPickup(e.x, e.y);
          enemies.splice(j, 1);
        }
        break;
      }
    }
    if (hit) continue;
  }
}

function updateEnemies(dt) {
  for (const e of enemies) {
    if (e.hitFlash > 0) e.hitFlash -= dt;

    // Navigate toward player, avoid obstacles simply (slide)
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d  = Math.hypot(dx, dy) || 1;
    const spd = e.speed * dt;
    const nx  = (dx / d) * spd;
    const ny  = (dy / d) * spd;

    e.angle = Math.atan2(dy, dx);
    moveEntity(e, nx, ny, ENEMY_R);

    e.x = clamp(e.x, ENEMY_R, worldW - ENEMY_R);
    e.y = clamp(e.y, ENEMY_R, worldH - ENEMY_R);

    // Attack player
    if (dist(e.x, e.y, player.x, player.y) < ENEMY_ATTACK_RANGE) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = ENEMY_ATTACK_RATE;
        const dmg = e.type === 'heavy' ? 25 : ENEMY_DAMAGE;
        player.hp = Math.max(0, player.hp - dmg);
        spawnParticles(player.x, player.y, '#ff0000', 8, 80);
        if (player.hp <= 0) endGame();
      }
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x    += p.vx * dt;
    p.y    += p.vy * dt;
    p.life -= dt;
    p.vx   *= 0.88;
    p.vy   *= 0.88;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updatePickups(dt) {
  for (const pk of pickups) {
    pk.pulse = ((pk.pulse || 0) + dt * 3) % (Math.PI * 2);
  }
}

function checkWave() {
  if (waveEnemiesLeft <= 0 && enemies.length === 0) {
    wave++;
    waveEnemiesLeft = -1; // guard
    setTimeout(() => spawnWave(), 2000);
    waveEnemiesLeft = 999; // block re-trigger until spawnWave resets
  }
}

// ── Pickups ────────────────────────────────────────────
function spawnPickup(x, y) {
  const types = ['hp', 'ammo'];
  pickups.push({
    x, y,
    type: types[Math.floor(Math.random() * types.length)],
    pulse: 0,
  });
}

function applyPickup(pk) {
  if (pk.type === 'hp') {
    player.hp = Math.min(player.maxHp, player.hp + 35);
    spawnParticles(pk.x, pk.y, '#44ff88', 10, 120);
  } else {
    const add = 10;
    player.reserve = Math.min(RESERVE_MAX, player.reserve + add);
    spawnParticles(pk.x, pk.y, '#4488ff', 10, 120);
  }
}

// ── Physics helpers ────────────────────────────────────
function moveEntity(ent, dx, dy, r) {
  // Try X
  const nx = ent.x + dx;
  if (!collidesObstacle(nx, ent.y, r)) ent.x = nx;

  // Try Y
  const ny = ent.y + dy;
  if (!collidesObstacle(ent.x, ny, r)) ent.y = ny;
}

function collidesObstacle(x, y, r) {
  for (const o of obstacles) {
    if (circleRect(x, y, r, o.x, o.y, o.w, o.h)) return true;
  }
  return false;
}

function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const nearX = clamp(cx, rx, rx + rw);
  const nearY = clamp(cy, ry, ry + rh);
  return dist(cx, cy, nearX, nearY) < cr;
}

function bulletHitsObstacle(ox, oy, nx, ny) {
  // Step along bullet path
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    const t  = i / steps;
    const px = ox + (nx - ox) * t;
    const py = oy + (ny - oy) * t;
    if (collidesObstacle(px, py, BULLET_R)) return true;
  }
  return false;
}

// ── Particles ──────────────────────────────────────────
function spawnParticles(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = speed * (0.4 + Math.random() * 0.6);
    particles.push({
      x, y,
      vx:   Math.cos(angle) * spd,
      vy:   Math.sin(angle) * spd,
      color,
      size: 2 + Math.random() * 3,
      life: 0.3 + Math.random() * 0.4,
    });
  }
}

// ── Render ─────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawBackground();
  drawObstacles();
  drawPickups();
  drawParticles();
  drawBullets();
  drawPlayer();
  drawEnemies();

  ctx.restore();
}

function drawBackground() {
  // Dark tiled floor
  const ts = TILE;
  ctx.fillStyle = '#0d0d14';
  ctx.fillRect(0, 0, worldW, worldH);

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth   = 1;
  for (let x = 0; x <= worldW; x += ts) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, worldH);
    ctx.stroke();
  }
  for (let y = 0; y <= worldH; y += ts) {
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(worldW, y);
    ctx.stroke();
  }

  // World border
  ctx.strokeStyle = '#ff444466';
  ctx.lineWidth   = 6;
  ctx.strokeRect(3, 3, worldW - 6, worldH - 6);
}

function drawObstacles() {
  for (const o of obstacles) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(o.x + 5, o.y + 5, o.w, o.h);

    // Body gradient
    const grad = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y + o.h);
    grad.addColorStop(0, '#2a2d3e');
    grad.addColorStop(1, '#1a1c28');
    ctx.fillStyle = grad;
    ctx.fillRect(o.x, o.y, o.w, o.h);

    // Edge highlight
    ctx.strokeStyle = '#3a3d52';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(o.x, o.y, o.w, o.h);

    // Top highlight stripe
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(o.x, o.y, o.w, 4);
  }
}

function drawPlayer() {
  const p = player;

  // Sprint trail
  for (const t of p.trail) {
    const alpha = t.life / 0.25;
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle   = '#00bfff';
    ctx.beginPath();
    ctx.arc(t.x, t.y, PLAYER_R * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Shadow
  ctx.fillStyle   = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x + 4, p.y + 6, PLAYER_R, PLAYER_R * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);

  // Outer glow
  ctx.shadowColor = '#00bfff';
  ctx.shadowBlur  = 12;

  // Body circle
  const bodyGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, PLAYER_R);
  bodyGrad.addColorStop(0, '#4fc3f7');
  bodyGrad.addColorStop(1, '#0277bd');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Gun barrel
  ctx.fillStyle = '#263238';
  ctx.fillRect(PLAYER_R - 4, -3, 18, 6);
  ctx.fillStyle = '#455a64';
  ctx.fillRect(PLAYER_R - 2, -2, 14, 4);

  // Eye (direction indicator)
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(6, -4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d47a1';
  ctx.beginPath();
  ctx.arc(7, -4, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEnemies() {
  for (const e of enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);

    // Shadow
    ctx.fillStyle   = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(4, 6, ENEMY_R, ENEMY_R * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const isHeavy   = e.type === 'heavy';
    const baseColor = isHeavy ? '#b71c1c' : '#c62828';
    const glowColor = isHeavy ? '#ff1744' : '#ff5252';
    const r         = isHeavy ? ENEMY_R + 5 : ENEMY_R;

    if (e.hitFlash > 0) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur  = 20;
    } else {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur  = 10;
    }

    // Body
    const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, r);
    grad.addColorStop(0, e.hitFlash > 0 ? '#ffffff' : glowColor);
    grad.addColorStop(1, baseColor);
    ctx.fillStyle = grad;

    if (isHeavy) {
      // Hexagon for heavy
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        i === 0
          ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
          : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Eyes
    ctx.rotate(e.angle);
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.45,  r * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // HP bar above enemy
    const barW = r * 2 + 4;
    const barX = e.x - barW / 2;
    const barY = e.y - r - 14;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(barX, barY, barW, 5);
    ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#4caf50' : e.hp / e.maxHp > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), 5);
  }
}

function drawBullets() {
  for (const b of bullets) {
    const alpha = clamp(b.life / 0.3, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = '#fff8e1';
    ctx.beginPath();
    ctx.arc(b.x, b.y, BULLET_R, 0, Math.PI * 2);
    ctx.fill();

    // Tracer line
    const tx = b.x - Math.cos(Math.atan2(b.vy, b.vx)) * 14;
    const ty = b.y - Math.sin(Math.atan2(b.vy, b.vx)) * 14;
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / 0.5, 0, 1);
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur  = 0;
  }
  ctx.globalAlpha = 1;
}

function drawPickups() {
  for (const pk of pickups) {
    const bob = Math.sin(pk.pulse) * 3;
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);

    const color = pk.type === 'hp' ? '#44ff88' : '#4488ff';
    ctx.shadowColor = color;
    ctx.shadowBlur  = 16;

    // Ring
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(0, 0, PICKUP_R, 0, Math.PI * 2);
    ctx.stroke();

    // Icon
    ctx.fillStyle = color;
    ctx.font      = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pk.type === 'hp' ? '+' : '⬡', 0, 0);

    ctx.restore();
  }
}

// ── HUD ────────────────────────────────────────────────
function updateHUD() {
  const p   = player;
  const pct = p.hp / p.maxHp;
  healthBar.style.width = (pct * 100).toFixed(1) + '%';
  healthBar.style.background =
    pct > 0.6 ? 'linear-gradient(90deg,#e53935,#ff6b6b)'
    : pct > 0.3 ? 'linear-gradient(90deg,#ff8f00,#ffcc02)'
    : 'linear-gradient(90deg,#7b0000,#e53935)';

  ammoCurrent.textContent  = p.ammo;
  ammoReserve.textContent  = p.reserve;
  scoreEl.textContent      = score;

  if (p.reloading) {
    reloadIndicator.classList.remove('hidden');
  } else {
    reloadIndicator.classList.add('hidden');
  }
}

// ── Game over ──────────────────────────────────────────
function endGame() {
  gameRunning = false;
  finalScoreText.textContent = `Очки: ${score}  |  Хвиля: ${wave}`;
  gameoverOverlay.classList.remove('hidden');
}

// ── Input ──────────────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  e.preventDefault();
});
window.addEventListener('keyup',  e => { keys[e.code] = false; });

canvas.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
canvas.addEventListener('mousedown', e => { if (e.button === 0) mouse.down = true; });
canvas.addEventListener('mouseup',   e => { if (e.button === 0) mouse.down = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ── Buttons ────────────────────────────────────────────
startBtn.addEventListener('click',   startGame);
restartBtn.addEventListener('click', startGame);

// ── Utils ──────────────────────────────────────────────
function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
