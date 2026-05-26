// ─── DOM Elements ────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const startScreen = document.getElementById('start-screen');
const deathScreen = document.getElementById('death-screen');
const deathInfo = document.getElementById('death-info');
const playBtn = document.getElementById('play-btn');
const nameInput = document.getElementById('name-input');
const statusText = document.getElementById('status-text');
const healthBar = document.getElementById('health-bar');
const healthText = document.getElementById('health-text');
const killsDisplay = document.getElementById('kills-display');
const deathsDisplay = document.getElementById('deaths-display');
const scoreDisplay = document.getElementById('score-display');
const killFeedEl = document.getElementById('kill-feed');
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');
const pcountEl = document.getElementById('pcount');

// ─── Constants ───────────────────────────────────────────────────────────────
const PLAYER_RADIUS = 18;
const BULLET_RADIUS = 5;
const PLAYER_SPEED = 280;
const SPRINT_SPEED = 420;
const SHOOT_COOLDOWN = 150;
const SEND_RATE = 50;
const DASH_COOLDOWN = 2000;
const DASH_DISTANCE = 120;

// ─── State ───────────────────────────────────────────────────────────────────
let ws = null;
let connected = false;
let joined = false;
let localId = null;
let worldW = 2000, worldH = 2000;

const keys = {};
const mouse = { x: 0, y: 0, down: false };
const camera = { x: 0, y: 0 };

let players = new Map();
let bullets = [];
let particles = [];
let killFeed = [];

let localPlayer = null;
let pendingInputs = [];
let inputSeq = 0;
let lastSendTime = 0;
let lastShotTime = 0;
let lastDashTime = 0;
let running = false;
let lastFrame = 0;
let isDead = false;

// ─── Canvas Setup ────────────────────────────────────────────────────────────
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ─── WebSocket ───────────────────────────────────────────────────────────────
function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}`);

  ws.onopen = () => {
    connected = true;
    updateStatus('connected', 'Підключено! Введи ім\'я та грай.');
    playBtn.disabled = false;
    playBtn.textContent = '▶ ГРАТИ';
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      handleMessage(msg);
    } catch (err) { /* ignore */ }
  };

  ws.onclose = () => {
    connected = false;
    if (joined) {
      // Lost connection during game
      joined = false;
      running = false;
      hud.style.display = 'none';
      startScreen.style.display = 'flex';
      deathScreen.style.display = 'none';
      updateStatus('error', 'Зʼєднання втрачено. Оновіть сторінку.');
      playBtn.disabled = true;
      playBtn.textContent = 'Відключено';
    } else {
      updateStatus('error', 'Не вдалося підключитися. Оновіть сторінку.');
      playBtn.disabled = true;
    }

    // Reconnect after 2s
    setTimeout(() => {
      if (!connected) connectWS();
    }, 2000);
  };

  ws.onerror = () => {};
}

function updateStatus(cls, text) {
  statusText.className = 'status ' + cls;
  statusText.textContent = text;
}

function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ─── Message Handling ────────────────────────────────────────────────────────
function handleMessage(msg) {
  switch (msg.type) {
    case 'welcome':
      worldW = msg.worldWidth;
      worldH = msg.worldHeight;
      break;

    case 'joined':
      localId = msg.playerId;
      worldW = msg.worldWidth;
      worldH = msg.worldHeight;
      localPlayer = {
        x: msg.player.x,
        y: msg.player.y,
        angle: 0,
        health: msg.player.health,
        kills: 0,
        deaths: 0,
        score: 0
      };
      if (msg.killFeed) {
        killFeed = msg.killFeed.map(k => ({ ...k, fadeTime: Date.now() + 8000 }));
      }
      joined = true;
      isDead = false;
      running = true;
      lastFrame = performance.now();

      // Show game, hide start screen
      startScreen.style.display = 'none';
      deathScreen.style.display = 'none';
      hud.style.display = 'block';

      requestAnimationFrame(loop);
      break;

    case 'state':
      applyState(msg.players, msg.bullets);
      break;

    case 'hit':
      spawnParticles(msg.x, msg.y, '#ff6b6b', 10, 200);
      break;

    case 'kill':
      addKillFeed(msg.killerName, msg.victimName);
      if (msg.victimId === localId) {
        onDeath(msg.killerName);
      }
      break;

    case 'respawn':
      if (msg.playerId === localId && localPlayer) {
        localPlayer.x = msg.x;
        localPlayer.y = msg.y;
        localPlayer.health = 100;
        isDead = false;
        deathScreen.style.display = 'none';
      }
      spawnParticles(msg.x, msg.y, '#4ade80', 16, 200);
      break;

    case 'playerLeft':
      players.delete(msg.playerId);
      break;
  }
}

function applyState(serverPlayers, serverBullets) {
  const newPlayers = new Map();
  for (const sp of serverPlayers) {
    newPlayers.set(sp.id, sp);
  }
  players = newPlayers;
  bullets = serverBullets;

  // Update local prediction
  const myServer = players.get(localId);
  if (!myServer || !localPlayer) return;

  if (myServer.dead && !isDead) {
    onDeath('');
  }

  localPlayer.health = myServer.health;
  localPlayer.kills = myServer.kills;
  localPlayer.deaths = myServer.deaths;
  localPlayer.score = myServer.score;

  // Server reconciliation
  const ack = myServer.lastInput || 0;
  pendingInputs = pendingInputs.filter(inp => inp.seq > ack);

  localPlayer.x = myServer.x;
  localPlayer.y = myServer.y;

  for (const inp of pendingInputs) {
    localPlayer.x = clamp(localPlayer.x + inp.dx, PLAYER_RADIUS, worldW - PLAYER_RADIUS);
    localPlayer.y = clamp(localPlayer.y + inp.dy, PLAYER_RADIUS, worldH - PLAYER_RADIUS);
  }

  // Update player count
  pcountEl.textContent = players.size;
}

// ─── Game Flow ───────────────────────────────────────────────────────────────
function startGame() {
  if (!connected) return;
  const name = nameInput.value.trim() || '';
  send({ type: 'join', name });
  playBtn.disabled = true;
  playBtn.textContent = 'Підключення...';
}

function onDeath(killerName) {
  isDead = true;
  deathScreen.style.display = 'flex';
  deathInfo.textContent = killerName ? `Вбив: ${killerName}` : 'Респавн через 1.5с...';
  spawnParticles(localPlayer.x, localPlayer.y, '#f97316', 30, 300);
}

// ─── Input ───────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
  // Dash on Space
  if (e.code === 'Space' && localPlayer && !isDead) {
    tryDash();
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) mouse.down = true; });
canvas.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
canvas.addEventListener('mouseleave', () => { mouse.down = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

playBtn.addEventListener('click', startGame);
nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') startGame();
});

// ─── Dash ────────────────────────────────────────────────────────────────────
function tryDash() {
  const now = performance.now();
  if (now - lastDashTime < DASH_COOLDOWN) return;
  lastDashTime = now;

  const angle = localPlayer.angle;
  const dashX = Math.cos(angle) * DASH_DISTANCE;
  const dashY = Math.sin(angle) * DASH_DISTANCE;

  localPlayer.x = clamp(localPlayer.x + dashX, PLAYER_RADIUS, worldW - PLAYER_RADIUS);
  localPlayer.y = clamp(localPlayer.y + dashY, PLAYER_RADIUS, worldH - PLAYER_RADIUS);

  spawnParticles(localPlayer.x, localPlayer.y, '#60a5fa', 12, 150);

  // Send updated position immediately
  const seq = ++inputSeq;
  pendingInputs.push({ seq, dx: dashX, dy: dashY });
  send({ type: 'move', x: localPlayer.x, y: localPlayer.y, angle: localPlayer.angle, seq });
}

// ─── Update ──────────────────────────────────────────────────────────────────
function update(dt) {
  if (!localPlayer || isDead) return;

  const now = performance.now();

  // Aim angle
  const aimX = camera.x + mouse.x;
  const aimY = camera.y + mouse.y;
  localPlayer.angle = Math.atan2(aimY - localPlayer.y, aimX - localPlayer.x);

  // Movement
  let mx = 0, my = 0;
  if (keys['KeyW'] || keys['ArrowUp']) my -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) my += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) mx += 1;

  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? SPRINT_SPEED : PLAYER_SPEED;
    const dx = (mx / len) * speed * dt;
    const dy = (my / len) * speed * dt;

    localPlayer.x = clamp(localPlayer.x + dx, PLAYER_RADIUS, worldW - PLAYER_RADIUS);
    localPlayer.y = clamp(localPlayer.y + dy, PLAYER_RADIUS, worldH - PLAYER_RADIUS);

    const seq = ++inputSeq;
    pendingInputs.push({ seq, dx, dy });
  }

  // Send position
  if (now - lastSendTime > SEND_RATE) {
    const seq = inputSeq;
    send({ type: 'move', x: localPlayer.x, y: localPlayer.y, angle: localPlayer.angle, seq });
    lastSendTime = now;
  }

  // Shooting
  if (mouse.down && now - lastShotTime > SHOOT_COOLDOWN) {
    send({ type: 'shoot', angle: localPlayer.angle });
    lastShotTime = now;
    // Muzzle flash
    const fx = localPlayer.x + Math.cos(localPlayer.angle) * (PLAYER_RADIUS + 12);
    const fy = localPlayer.y + Math.sin(localPlayer.angle) * (PLAYER_RADIUS + 12);
    spawnParticles(fx, fy, '#fde047', 6, 120);
  }

  // Camera follow
  const targetCx = clamp(localPlayer.x - canvas.width / 2, 0, worldW - canvas.width);
  const targetCy = clamp(localPlayer.y - canvas.height / 2, 0, worldH - canvas.height);
  camera.x += (targetCx - camera.x) * Math.min(1, dt * 8);
  camera.y += (targetCy - camera.y) * Math.min(1, dt * 8);

  // Particles
  updateParticles(dt);

  // HUD
  updateHUD();
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
  }
}

function spawnParticles(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const vel = speed * (0.3 + Math.random() * 0.7);
    particles.push({
      x, y,
      vx: Math.cos(angle) * vel,
      vy: Math.sin(angle) * vel,
      life: 0.2 + Math.random() * 0.3,
      size: 2 + Math.random() * 3,
      color
    });
  }
  // Cap particles
  if (particles.length > 500) particles.splice(0, particles.length - 500);
}

function updateHUD() {
  if (!localPlayer) return;
  const hp = Math.max(0, localPlayer.health);
  healthBar.style.width = hp + '%';
  healthText.textContent = hp;

  if (hp > 60) {
    healthBar.style.background = 'linear-gradient(90deg, #22c55e, #4ade80)';
    healthText.style.color = '#4ade80';
  } else if (hp > 30) {
    healthBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    healthText.style.color = '#fbbf24';
  } else {
    healthBar.style.background = 'linear-gradient(90deg, #dc2626, #f87171)';
    healthText.style.color = '#f87171';
  }

  killsDisplay.textContent = '☠ ' + localPlayer.kills;
  deathsDisplay.textContent = '💀 ' + localPlayer.deaths;
  scoreDisplay.textContent = '⭐ ' + localPlayer.score;
}

function addKillFeed(killer, victim) {
  killFeed.push({ killer, victim, fadeTime: Date.now() + 5000 });
  if (killFeed.length > 5) killFeed.shift();
  renderKillFeed();
}

function renderKillFeed() {
  const now = Date.now();
  killFeed = killFeed.filter(k => k.fadeTime > now);
  killFeedEl.innerHTML = killFeed.map(k =>
    `<div class="kill-entry"><span style="color:#f87171">${esc(k.killer)}</span> ☠ <span style="color:#94a3b8">${esc(k.victim)}</span></div>`
  ).join('');
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ─── Render ──────────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawWorld();
  drawBullets();
  drawParticles();
  drawPlayers();

  ctx.restore();
  drawMinimap();
}

function drawWorld() {
  // Background
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, worldW, worldH);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  const startX = Math.floor(camera.x / 50) * 50;
  const startY = Math.floor(camera.y / 50) * 50;
  const endX = camera.x + canvas.width;
  const endY = camera.y + canvas.height;

  for (let x = startX; x <= endX; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, Math.max(0, camera.y));
    ctx.lineTo(x, Math.min(worldH, endY));
    ctx.stroke();
  }
  for (let y = startY; y <= endY; y += 50) {
    ctx.beginPath();
    ctx.moveTo(Math.max(0, camera.x), y);
    ctx.lineTo(Math.min(worldW, endX), y);
    ctx.stroke();
  }

  // Border
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, worldW - 4, worldH - 4);

  // Danger zone glow at borders
  const grd = ctx.createLinearGradient(0, 0, 30, 0);
  grd.addColorStop(0, 'rgba(239,68,68,0.15)');
  grd.addColorStop(1, 'rgba(239,68,68,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 30, worldH);
}

function drawPlayers() {
  for (const [id, player] of players) {
    if (player.dead) continue;

    const px = (id === localId && localPlayer) ? localPlayer.x : player.x;
    const py = (id === localId && localPlayer) ? localPlayer.y : player.y;
    const pa = (id === localId && localPlayer) ? localPlayer.angle : player.angle;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px + 3, py + 5, PLAYER_RADIUS * 0.9, PLAYER_RADIUS * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(pa);

    // Gun
    ctx.fillStyle = '#374151';
    ctx.fillRect(PLAYER_RADIUS - 4, -3, 18, 6);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(PLAYER_RADIUS + 10, -2, 6, 4);

    ctx.restore();

    // Player circle
    ctx.beginPath();
    ctx.arc(px, py, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = player.color || '#3b82f6';
    ctx.fill();
    ctx.strokeStyle = id === localId ? '#fff' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = id === localId ? 2.5 : 1;
    ctx.stroke();

    // Inner glow for local player
    if (id === localId) {
      ctx.beginPath();
      ctx.arc(px, py, PLAYER_RADIUS - 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();
    }

    // Name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(player.name || 'Player', px, py - PLAYER_RADIUS - 14);

    // Health bar above player (not for local - that's in HUD)
    if (id !== localId) {
      const hp = player.health / 100;
      ctx.fillStyle = '#000';
      ctx.fillRect(px - 20, py - PLAYER_RADIUS - 8, 40, 5);
      ctx.fillStyle = hp > 0.5 ? '#22c55e' : hp > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(px - 20, py - PLAYER_RADIUS - 8, 40 * hp, 5);
    }
  }
}

function drawBullets() {
  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#fde047';
    ctx.fill();
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawParticles() {
  for (const p of particles) {
    const alpha = clamp(p.life / 0.3, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMinimap() {
  const mw = 160, mh = 160;
  minimapCtx.clearRect(0, 0, mw, mh);
  minimapCtx.fillStyle = 'rgba(10,13,20,0.8)';
  minimapCtx.fillRect(0, 0, mw, mh);

  // Border
  minimapCtx.strokeStyle = '#334155';
  minimapCtx.strokeRect(0, 0, mw, mh);

  const scaleX = mw / worldW;
  const scaleY = mh / worldH;

  // Draw all players as dots
  for (const [id, player] of players) {
    if (player.dead) continue;
    const mx = player.x * scaleX;
    const my = player.y * scaleY;

    minimapCtx.beginPath();
    minimapCtx.arc(mx, my, id === localId ? 4 : 2.5, 0, Math.PI * 2);
    minimapCtx.fillStyle = id === localId ? '#fff' : player.color;
    minimapCtx.fill();
  }

  // Camera viewport
  if (localPlayer) {
    minimapCtx.strokeStyle = 'rgba(255,255,255,0.3)';
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(
      camera.x * scaleX, camera.y * scaleY,
      canvas.width * scaleX, canvas.height * scaleY
    );
  }
}

// ─── Game Loop ───────────────────────────────────────────────────────────────
function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  update(dt);
  render();
  renderKillFeed();
  requestAnimationFrame(loop);
}

// ─── Utils ───────────────────────────────────────────────────────────────────
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ─── Init ────────────────────────────────────────────────────────────────────
connectWS();
