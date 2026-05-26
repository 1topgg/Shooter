const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const healthBar = document.getElementById('health-bar');
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const connectionStatus = document.getElementById('connection-status');
const fullscreenBtn = document.getElementById('fullscreen-btn');

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 800;
const PLAYER_RADIUS = 15;
const BULLET_RADIUS = 4;
const PLAYER_SPEED = 260;
const SEND_INTERVAL_MS = 50;
const SHOOT_COOLDOWN_MS = 120;
const PARTICLE_MAX = 600;
const GRID_SIZE = 96;
const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 10000;

const keys = {};
const mouse = { x: 0, y: 0, down: false };
const camera = { x: 0, y: 0 };

let ws = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let shouldReconnect = true;
let isConnected = false;
const MAX_RECONNECT_ATTEMPTS = 20;

let localPlayerId = null;
let players = new Map();
let bullets = [];
let renderPlayers = new Map();

let localPredicted = null;
let pendingInputs = [];
let inputSequence = 0;
let lastMoveSentAt = 0;
let lastShotAt = 0;
let particleIdCounter = 0;

let particles = [];
let running = false;
let lastFrameTime = performance.now();

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function updateConnectionStatus(state, detail = '') {
  if (!connectionStatus) return;
  connectionStatus.classList.remove('connected', 'connecting', 'disconnected');
  connectionStatus.classList.add(state);
  if (state === 'connected') connectionStatus.textContent = 'Підключено';
  if (state === 'connecting') connectionStatus.textContent = detail || 'Підключення...';
  if (state === 'disconnected') connectionStatus.textContent = detail || 'Відключено';
}

function makeWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}

function connectWebSocket() {
  clearTimeout(reconnectTimer);
  updateConnectionStatus('connecting');

  ws = new WebSocket(makeWsUrl());

  ws.addEventListener('open', () => {
    isConnected = true;
    reconnectAttempts = 0;
    updateConnectionStatus('connected');
  });

  ws.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleServerMessage(msg);
    } catch (error) {
      console.error('Invalid server message:', error);
    }
  });

  ws.addEventListener('close', () => {
    isConnected = false;
    updateConnectionStatus('disconnected', 'Зʼєднання втрачено');
    if (!shouldReconnect) return;

    reconnectAttempts = Math.min(MAX_RECONNECT_ATTEMPTS, reconnectAttempts + 1);
    const delay = Math.min(
      RECONNECT_MAX_DELAY_MS,
      RECONNECT_BASE_DELAY_MS * (2 ** (reconnectAttempts - 1))
    );
    updateConnectionStatus('connecting', `Перепідключення через ${Math.ceil(delay / 1000)}с...`);
    reconnectTimer = setTimeout(connectWebSocket, delay);
  });

  ws.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

function handleServerMessage(msg) {
  if (msg.type === 'init') {
    localPlayerId = msg.playerId;
    localPredicted = msg.player ? {
      x: msg.player.x,
      y: msg.player.y,
      angle: msg.player.angle,
      health: msg.player.health,
      kills: msg.player.kills,
      deaths: msg.player.deaths
    } : null;
    pendingInputs = [];
    inputSequence = 0;
    return;
  }

  if (msg.type === 'playerLeft') {
    players.delete(msg.playerId);
    renderPlayers.delete(msg.playerId);
    return;
  }

  if (msg.type === 'bulletHit') {
    const p = players.get(msg.playerId);
    if (p) {
      p.health = msg.health;
      spawnParticles(p.x, p.y, '#ff7070', 12, 140);
    }
    return;
  }

  if (msg.type === 'playerDied') {
    const p = players.get(msg.playerId);
    if (p) {
      spawnParticles(p.x, p.y, '#ff9d4d', 24, 180);
    }
    return;
  }

  if (msg.type === 'gameState') {
    applyGameState(msg.players || [], msg.bullets || []);
  }
}

function applyGameState(serverPlayers, serverBullets) {
  const nextPlayers = new Map();
  for (const serverPlayer of serverPlayers) {
    nextPlayers.set(serverPlayer.id, serverPlayer);

    const existingRender = renderPlayers.get(serverPlayer.id);
    if (!existingRender) {
      renderPlayers.set(serverPlayer.id, {
        x: serverPlayer.x,
        y: serverPlayer.y,
        angle: serverPlayer.angle,
        color: serverPlayer.color,
        name: serverPlayer.name
      });
    }
  }

  for (const id of renderPlayers.keys()) {
    if (!nextPlayers.has(id)) {
      renderPlayers.delete(id);
    }
  }

  players = nextPlayers;
  bullets = serverBullets;

  const localServer = localPlayerId ? players.get(localPlayerId) : null;
  if (!localServer) return;

  if (!localPredicted) {
    localPredicted = {
      x: localServer.x,
      y: localServer.y,
      angle: localServer.angle,
      health: localServer.health,
      kills: localServer.kills,
      deaths: localServer.deaths
    };
  }

  const ackSeq = Number.isInteger(localServer.lastProcessedInput)
    ? localServer.lastProcessedInput
    : -1;

  pendingInputs = pendingInputs.filter((input) => input.seq > ackSeq);

  localPredicted.x = localServer.x;
  localPredicted.y = localServer.y;
  localPredicted.angle = localServer.angle;

  for (const input of pendingInputs) {
    localPredicted.x = clamp(localPredicted.x + input.dx, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    localPredicted.y = clamp(localPredicted.y + input.dy, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
    localPredicted.angle = input.angle;
  }

  localPredicted.health = localServer.health;
  localPredicted.kills = localServer.kills;
  localPredicted.deaths = localServer.deaths;
}

function sendMessage(payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function startGame() {
  overlay.classList.remove('active');
  running = true;
  lastFrameTime = performance.now();
  requestAnimationFrame(loop);
}

function getMovementVector(dt) {
  let x = 0;
  let y = 0;
  if (keys.KeyW || keys.ArrowUp) y -= 1;
  if (keys.KeyS || keys.ArrowDown) y += 1;
  if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1;

  if (x === 0 && y === 0) return { dx: 0, dy: 0 };

  const len = Math.hypot(x, y);
  const speed = PLAYER_SPEED * dt;
  return {
    dx: (x / len) * speed,
    dy: (y / len) * speed
  };
}

function update(dt) {
  const localServer = localPlayerId ? players.get(localPlayerId) : null;
  if (!localPredicted && localServer) {
    localPredicted = {
      x: localServer.x,
      y: localServer.y,
      angle: localServer.angle,
      health: localServer.health,
      kills: localServer.kills,
      deaths: localServer.deaths
    };
  }

  const now = performance.now();
  if (localPredicted) {
    const aimX = camera.x + mouse.x;
    const aimY = camera.y + mouse.y;
    localPredicted.angle = Math.atan2(aimY - localPredicted.y, aimX - localPredicted.x);

    const move = getMovementVector(dt);
    const hasMove = Math.abs(move.dx) > 0 || Math.abs(move.dy) > 0;

    if (hasMove) {
      localPredicted.x = clamp(localPredicted.x + move.dx, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
      localPredicted.y = clamp(localPredicted.y + move.dy, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
    }

    if (hasMove || now - lastMoveSentAt >= SEND_INTERVAL_MS) {
      const seq = ++inputSequence;
      pendingInputs.push({ seq, dx: move.dx, dy: move.dy, angle: localPredicted.angle });
      sendMessage({
        type: 'move',
        x: localPredicted.x,
        y: localPredicted.y,
        angle: localPredicted.angle,
        seq
      });
      lastMoveSentAt = now;
    }

    if (mouse.down && now - lastShotAt >= SHOOT_COOLDOWN_MS) {
      sendMessage({ type: 'shoot', angle: localPredicted.angle });
      spawnParticles(
        localPredicted.x + Math.cos(localPredicted.angle) * (PLAYER_RADIUS + 10),
        localPredicted.y + Math.sin(localPredicted.angle) * (PLAYER_RADIUS + 10),
        '#ffe58f',
        8,
        100
      );
      lastShotAt = now;
    }

    const targetCamX = clamp(localPredicted.x - canvas.width / 2, 0, WORLD_WIDTH - canvas.width);
    const targetCamY = clamp(localPredicted.y - canvas.height / 2, 0, WORLD_HEIGHT - canvas.height);
    camera.x += (targetCamX - camera.x) * Math.min(1, dt * 8);
    camera.y += (targetCamY - camera.y) * Math.min(1, dt * 8);
  }

  for (const [id, renderPlayer] of renderPlayers.entries()) {
    if (id === localPlayerId && localPredicted) {
      renderPlayer.x = localPredicted.x;
      renderPlayer.y = localPredicted.y;
      renderPlayer.angle = localPredicted.angle;
      continue;
    }

    const serverPlayer = players.get(id);
    if (!serverPlayer) continue;

    renderPlayer.x += (serverPlayer.x - renderPlayer.x) * Math.min(1, dt * 10);
    renderPlayer.y += (serverPlayer.y - renderPlayer.y) * Math.min(1, dt * 10);
    renderPlayer.angle += (serverPlayer.angle - renderPlayer.angle) * Math.min(1, dt * 12);
    renderPlayer.color = serverPlayer.color;
    renderPlayer.name = serverPlayer.name;
  }

  updateParticles(dt);
  updateHud();
}

function updateParticles(dt) {
  let writeIndex = 0;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.88;
    p.vy *= 0.88;
    particles[writeIndex++] = p;
  }
  particles.length = writeIndex;
}

function spawnParticles(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    if (particles.length >= PARTICLE_MAX) {
      particles.shift();
    }
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.4 + Math.random() * 0.6);
    particles.push({
      id: ++particleIdCounter,
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 0.22 + Math.random() * 0.25,
      size: 1.6 + Math.random() * 2,
      color
    });
  }
}

function buildSpatialGrid(items) {
  const grid = new Map();
  for (const item of items) {
    const cellX = Math.floor(item.x / GRID_SIZE);
    const cellY = Math.floor(item.y / GRID_SIZE);
    const key = `${cellX}:${cellY}`;
    const cell = grid.get(key);
    if (cell) {
      cell.push(item);
    } else {
      grid.set(key, [item]);
    }
  }
  return grid;
}

function drawBackground() {
  ctx.fillStyle = '#0b0d14';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD_WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_WIDTH, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#ff5f5f';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, WORLD_WIDTH - 4, WORLD_HEIGHT - 4);
}

function drawPlayers() {
  for (const [id, player] of renderPlayers.entries()) {
    const healthSource = players.get(id);
    const hp = healthSource ? healthSource.health : 100;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle || 0);

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(4, 6, PLAYER_RADIUS, PLAYER_RADIUS * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = player.color || '#48b6ff';
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(PLAYER_RADIUS - 2, -3, 16, 6);

    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(player.name || 'Player', player.x, player.y - 24);

    const hpPct = clamp(hp / 100, 0, 1);
    ctx.fillStyle = '#101018';
    ctx.fillRect(player.x - 20, player.y - 18, 40, 5);
    ctx.fillStyle = hpPct > 0.5 ? '#40d66a' : hpPct > 0.25 ? '#f7b730' : '#ff5656';
    ctx.fillRect(player.x - 20, player.y - 18, 40 * hpPct, 5);
  }
}

function drawBullets() {
  const bulletGrid = buildSpatialGrid(bullets);
  const cameraCellX = Math.floor((camera.x + canvas.width / 2) / GRID_SIZE);
  const cameraCellY = Math.floor((camera.y + canvas.height / 2) / GRID_SIZE);

  for (let y = cameraCellY - 8; y <= cameraCellY + 8; y++) {
    for (let x = cameraCellX - 12; x <= cameraCellX + 12; x++) {
      const cell = bulletGrid.get(`${x}:${y}`);
      if (!cell) continue;
      for (const bullet of cell) {
        ctx.fillStyle = '#ffe588';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, BULLET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = clamp(particle.life / 0.35, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawBackground();
  drawBullets();
  drawParticles();
  drawPlayers();

  ctx.restore();
}

function updateHud() {
  const localServer = localPlayerId ? players.get(localPlayerId) : null;
  const hp = localPredicted?.health ?? localServer?.health ?? 100;
  const kills = localPredicted?.kills ?? localServer?.kills ?? 0;
  const deaths = localPredicted?.deaths ?? localServer?.deaths ?? 0;

  healthBar.style.width = `${clamp(hp, 0, 100)}%`;
  scoreEl.textContent = kills;
  waveEl.textContent = `${kills}/${deaths}`;
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if ([
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Space'
  ].includes(event.code)) {
    event.preventDefault();
  }
});
window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

canvas.addEventListener('mousemove', (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});
canvas.addEventListener('mousedown', (event) => {
  if (event.button === 0) mouse.down = true;
});
canvas.addEventListener('mouseup', (event) => {
  if (event.button === 0) mouse.down = false;
});
canvas.addEventListener('mouseleave', () => {
  mouse.down = false;
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

if (startBtn) startBtn.addEventListener('click', startGame);
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  });
}

window.addEventListener('beforeunload', () => {
  shouldReconnect = false;
  clearTimeout(reconnectTimer);
  if (ws && ws.readyState === WebSocket.OPEN) ws.close();
});

resize();
updateConnectionStatus('connecting');
connectWebSocket();
