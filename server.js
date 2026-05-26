const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// ─── Constants ───────────────────────────────────────────────────────────────
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const PLAYER_RADIUS = 18;
const BULLET_SPEED = 14;
const BULLET_LIFETIME = 1800;
const TICK_RATE = 30;
const MAX_MESSAGES_PER_SECOND = 60;
const MAX_MESSAGE_LENGTH = 2048;
const DAMAGE = 20;
const MAX_HEALTH = 100;
const RESPAWN_DELAY = 1500;

// ─── Game State ──────────────────────────────────────────────────────────────
const players = new Map();
const bullets = new Map();
const connections = new Map(); // ws -> { playerId, joined }
let bulletIdCounter = 0;
const killFeed = []; // last N kills
const MAX_KILL_FEED = 5;

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getRandomSpawn() {
  const margin = 100;
  return {
    x: margin + Math.random() * (WORLD_WIDTH - margin * 2),
    y: margin + Math.random() * (WORLD_HEIGHT - margin * 2)
  };
}

function broadcast(message, excludeWs = null) {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client === excludeWs) return;
    if (client.readyState !== WebSocket.OPEN) return;
    try { client.send(data); } catch (e) { /* ignore */ }
  });
}

function safeSend(ws, message) {
  if (ws.readyState !== WebSocket.OPEN) return;
  try { ws.send(JSON.stringify(message)); } catch (e) { /* ignore */ }
}

// ─── Game Loop ───────────────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();

  // Update bullets
  for (const [id, bullet] of bullets) {
    bullet.x += Math.cos(bullet.angle) * BULLET_SPEED;
    bullet.y += Math.sin(bullet.angle) * BULLET_SPEED;

    if (bullet.x < 0 || bullet.x > WORLD_WIDTH ||
        bullet.y < 0 || bullet.y > WORLD_HEIGHT ||
        now - bullet.createdAt > BULLET_LIFETIME) {
      bullets.delete(id);
      continue;
    }

    // Check collisions
    for (const [playerId, player] of players) {
      if (playerId === bullet.ownerId) continue;
      if (player.dead) continue;

      const dx = player.x - bullet.x;
      const dy = player.y - bullet.y;
      if (dx * dx + dy * dy < (PLAYER_RADIUS + 4) * (PLAYER_RADIUS + 4)) {
        // Hit!
        player.health -= DAMAGE;
        bullets.delete(id);

        if (player.health <= 0) {
          player.dead = true;
          player.deaths++;
          player.deathTime = now;

          const killer = players.get(bullet.ownerId);
          if (killer) {
            killer.kills++;
            killer.score += 100;
          }

          killFeed.push({
            killer: killer ? killer.name : '???',
            killerColor: killer ? killer.color : '#fff',
            victim: player.name,
            victimColor: player.color,
            time: now
          });
          if (killFeed.length > MAX_KILL_FEED) killFeed.shift();

          broadcast({
            type: 'kill',
            killerId: bullet.ownerId,
            victimId: playerId,
            killerName: killer ? killer.name : '???',
            victimName: player.name
          });
        }

        broadcast({
          type: 'hit',
          bulletId: id,
          playerId: playerId,
          x: bullet.x,
          y: bullet.y,
          health: Math.max(0, player.health)
        });
        break;
      }
    }
  }

  // Respawn dead players
  for (const [playerId, player] of players) {
    if (player.dead && now - player.deathTime > RESPAWN_DELAY) {
      const spawn = getRandomSpawn();
      player.x = spawn.x;
      player.y = spawn.y;
      player.health = MAX_HEALTH;
      player.dead = false;
      player.deathTime = 0;

      broadcast({
        type: 'respawn',
        playerId: playerId,
        x: player.x,
        y: player.y
      });
    }
  }

  // Broadcast game state
  const playersArr = [];
  for (const [id, p] of players) {
    playersArr.push({
      id: p.id,
      x: p.x,
      y: p.y,
      angle: p.angle,
      health: p.health,
      kills: p.kills,
      deaths: p.deaths,
      score: p.score,
      name: p.name,
      color: p.color,
      dead: p.dead,
      lastInput: p.lastInput
    });
  }

  const bulletsArr = [];
  for (const [id, b] of bullets) {
    bulletsArr.push({ id, x: b.x, y: b.y, angle: b.angle, ownerId: b.ownerId });
  }

  broadcast({
    type: 'state',
    players: playersArr,
    bullets: bulletsArr
  });
}, 1000 / TICK_RATE);

// ─── WebSocket Handling ──────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  const connId = createId();
  const connData = { id: connId, playerId: null, joined: false, rateCount: 0, rateStart: Date.now() };
  connections.set(ws, connData);

  console.log(`🔌 Connection opened: ${connId}`);

  // Send world info immediately
  safeSend(ws, {
    type: 'welcome',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    playerCount: players.size
  });

  ws.on('message', (raw) => {
    try {
      const connData = connections.get(ws);
      if (!connData) return;

      // Rate limiting
      const now = Date.now();
      if (now - connData.rateStart >= 1000) {
        connData.rateCount = 0;
        connData.rateStart = now;
      }
      if (++connData.rateCount > MAX_MESSAGES_PER_SECOND) return;

      const str = typeof raw === 'string' ? raw : raw.toString();
      if (str.length > MAX_MESSAGE_LENGTH) return;

      const msg = JSON.parse(str);

      switch (msg.type) {
        case 'join': {
          if (connData.joined) return;

          const playerId = createId();
          const spawn = getRandomSpawn();
          const name = (typeof msg.name === 'string' && msg.name.trim().length > 0)
            ? msg.name.trim().slice(0, 16)
            : `Гравець${Math.floor(Math.random() * 999)}`;

          const player = {
            id: playerId,
            x: spawn.x,
            y: spawn.y,
            angle: 0,
            health: MAX_HEALTH,
            kills: 0,
            deaths: 0,
            score: 0,
            name: name,
            color: `hsl(${Math.random() * 360}, 70%, 55%)`,
            dead: false,
            deathTime: 0,
            lastInput: 0
          };

          players.set(playerId, player);
          connData.playerId = playerId;
          connData.joined = true;

          safeSend(ws, {
            type: 'joined',
            playerId: playerId,
            player: player,
            worldWidth: WORLD_WIDTH,
            worldHeight: WORLD_HEIGHT,
            killFeed: killFeed
          });

          broadcast({
            type: 'playerJoined',
            player: player
          }, ws);

          console.log(`🎮 Player joined: ${name} (${playerId})`);
          break;
        }

        case 'move': {
          if (!connData.joined) return;
          const player = players.get(connData.playerId);
          if (!player || player.dead) return;

          if (typeof msg.x === 'number' && typeof msg.y === 'number' &&
              isFinite(msg.x) && isFinite(msg.y)) {
            player.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_WIDTH - PLAYER_RADIUS, msg.x));
            player.y = Math.max(PLAYER_RADIUS, Math.min(WORLD_HEIGHT - PLAYER_RADIUS, msg.y));
          }
          if (typeof msg.angle === 'number' && isFinite(msg.angle)) {
            player.angle = msg.angle;
          }
          if (typeof msg.seq === 'number') {
            player.lastInput = msg.seq;
          }
          break;
        }

        case 'shoot': {
          if (!connData.joined) return;
          const player = players.get(connData.playerId);
          if (!player || player.dead) return;

          if (typeof msg.angle === 'number' && isFinite(msg.angle)) {
            player.angle = msg.angle;
          }

          const bulletId = `b${++bulletIdCounter}`;
          bullets.set(bulletId, {
            x: player.x + Math.cos(player.angle) * (PLAYER_RADIUS + 8),
            y: player.y + Math.sin(player.angle) * (PLAYER_RADIUS + 8),
            angle: player.angle,
            ownerId: connData.playerId,
            createdAt: Date.now()
          });
          break;
        }
      }
    } catch (e) {
      // Ignore malformed messages
    }
  });

  ws.on('close', () => {
    const connData = connections.get(ws);
    if (connData && connData.playerId) {
      players.delete(connData.playerId);
      broadcast({ type: 'playerLeft', playerId: connData.playerId });
      console.log(`🔌 Player left: ${connData.playerId}`);
    }
    connections.delete(ws);
  });

  ws.on('error', () => {});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 Shooter server running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT}`);
});
