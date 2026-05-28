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
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 2400;
const PLAYER_RADIUS = 18;
const BULLET_SPEED = 16;
const BULLET_LIFETIME = 1800;
const TICK_RATE = 30;
const TICK_DELTA = 1 / TICK_RATE;
const MAX_MESSAGES_PER_SECOND = 60;
const MAX_MESSAGE_LENGTH = 2048;
const MAX_HEALTH = 100;
const RESPAWN_DELAY = 3000;
const WAVE_PREP_TIME = 10000;
const WAVE_BONUS_COINS = 30;
const ENEMY_BULLET_SPEED = 9;
const ENEMY_BULLET_LIFETIME = 2500;

// Weapon definitions (server-authoritative)
const WEAPONS = {
  pistol:  { damage: 20, bulletCount: 1, spread: 0,    baseCooldown: 150,  infiniteAmmo: true,  maxAmmo: Infinity },
  shotgun: { damage: 14, bulletCount: 6, spread: 0.35, baseCooldown: 900,  infiniteAmmo: false, maxAmmo: 48 },
  smg:     { damage: 8,  bulletCount: 1, spread: 0.08, baseCooldown: 80,   infiniteAmmo: false, maxAmmo: 120 },
  sniper:  { damage: 90, bulletCount: 1, spread: 0,    baseCooldown: 1500, infiniteAmmo: false, maxAmmo: 15 },
};

// Enemy type radii
const ENEMY_RADIUS = { zombie: 20, runner: 16, tank: 27, shooter: 18, boss: 42 };

// Enemy base stats
const ENEMY_STATS = {
  zombie:  { hp: 50,   damage: 8,  speed: 70,  xp: 10,  coins: 5,  attackRange: 25,  attackCooldown: 1200, color: '#4ade80' },
  runner:  { hp: 25,   damage: 6,  speed: 190, xp: 15,  coins: 8,  attackRange: 20,  attackCooldown: 700,  color: '#f97316' },
  tank:    { hp: 200,  damage: 22, speed: 45,  xp: 50,  coins: 25, attackRange: 32,  attackCooldown: 2200, color: '#64748b' },
  shooter: { hp: 45,   damage: 13, speed: 90,  xp: 20,  coins: 12, attackRange: 380, attackCooldown: 1800, color: '#a78bfa' },
  boss:    { hp: 1200, damage: 28, speed: 65,  xp: 200, coins: 200, attackRange: 420, attackCooldown: 700,  color: '#ef4444' },
};

// Drop tables per enemy type
const DROP_CHANCES = {
  zombie:  [
    { type: 'hp',    chance: 0.25, amount: 20 },
    { type: 'coins', chance: 0.90, amount: 5  },
  ],
  runner:  [
    { type: 'ammo',  chance: 0.40, amount: 15 },
    { type: 'coins', chance: 0.80, amount: 8  },
  ],
  tank:    [
    { type: 'hp',      chance: 0.70, amount: 45 },
    { type: 'coins',   chance: 1.00, amount: 25 },
    { type: 'powerup', chance: 0.55, powerupType: 'doubleDamage', amount: 0 },
  ],
  shooter: [
    { type: 'ammo',  chance: 0.60, amount: 20 },
    { type: 'coins', chance: 0.70, amount: 12 },
  ],
  boss:    [
    { type: 'hp',      chance: 1.00, amount: 100 },
    { type: 'coins',   chance: 1.00, amount: 200 },
    { type: 'powerup', chance: 1.00, powerupType: 'rapidFire', amount: 0 },
    { type: 'powerup', chance: 0.60, powerupType: 'invincibility', amount: 0 },
  ],
};

// Power-up durations (ms)
const POWERUP_DURATION = {
  doubleDamage:  10000,
  rapidFire:     8000,
  invincibility: 5000,
  speedBoost:    12000,
  infiniteAmmo:  7000,
  multiShot:     10000,
};

// ─── Game State ──────────────────────────────────────────────────────────────
const players = new Map();
const bullets = new Map();
const enemyBullets = new Map();
const enemies = new Map();
const drops = new Map();
const connections = new Map();
let bulletIdCounter = 0;
let enemyIdCounter = 0;
let dropIdCounter = 0;
const killFeed = [];
const MAX_KILL_FEED = 5;

const waveState = {
  wave: 0,
  state: 'prep',        // 'prep' | 'active' | 'complete'
  prepEndTime: Date.now() + 5000,
  enemiesSpawned: 0,
  totalEnemiesThisWave: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function createId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getRandomSpawn(margin = 150) {
  return {
    x: margin + Math.random() * (WORLD_WIDTH  - margin * 2),
    y: margin + Math.random() * (WORLD_HEIGHT - margin * 2),
  };
}

function getEnemySpawn() {
  const side = Math.floor(Math.random() * 4);
  const m = 40;
  switch (side) {
    case 0: return { x: m + Math.random() * (WORLD_WIDTH  - m * 2), y: m };
    case 1: return { x: WORLD_WIDTH  - m, y: m + Math.random() * (WORLD_HEIGHT - m * 2) };
    case 2: return { x: m + Math.random() * (WORLD_WIDTH  - m * 2), y: WORLD_HEIGHT - m };
    default:return { x: m,               y: m + Math.random() * (WORLD_HEIGHT - m * 2) };
  }
}

function broadcast(message, excludeWs = null) {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client === excludeWs) return;
    if (client.readyState !== WebSocket.OPEN) return;
    try { client.send(data); } catch (_) {}
  });
}

function safeSend(ws, message) {
  if (ws.readyState !== WebSocket.OPEN) return;
  try { ws.send(JSON.stringify(message)); } catch (_) {}
}

function sendToPlayer(playerId, message) {
  for (const [ws, conn] of connections) {
    if (conn.playerId === playerId) { safeSend(ws, message); return; }
  }
}

function getClosestPlayer(x, y) {
  let closest = null, minDist = Infinity;
  for (const [, p] of players) {
    if (p.dead) continue;
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < minDist) { minDist = d; closest = p; }
  }
  return closest;
}

function getActivePlayers() {
  const list = [];
  for (const [, p] of players) if (!p.dead) list.push(p);
  return list;
}

function updatePlayerLevel(player) {
  const newLevel = Math.floor(Math.sqrt((player.xp || 0) / 100));
  if (newLevel > (player.level || 0)) {
    player.level = newLevel;
    player.skillPoints = (player.skillPoints || 0) + 1;
    sendToPlayer(player.id, {
      type: 'levelUp',
      level: player.level,
      xp: player.xp,
      skillPoints: player.skillPoints,
    });
  }
}

function rollDrops(enemyType) {
  const table = DROP_CHANCES[enemyType] || [];
  return table.filter(e => Math.random() < e.chance);
}

function spawnDrop(type, amount, powerupType, x, y) {
  const id = `d${++dropIdCounter}`;
  drops.set(id, {
    id, type, amount: amount || 0,
    powerupType: powerupType || null,
    x: x + (Math.random() - 0.5) * 30,
    y: y + (Math.random() - 0.5) * 30,
    createdAt: Date.now(),
  });
}

function killEnemy(enemy, killerId, now) {
  const stats = ENEMY_STATS[enemy.type];
  const killer = killerId ? players.get(killerId) : null;

  if (killer) {
    killer.score  = (killer.score  || 0) + stats.xp;
    killer.xp     = (killer.xp    || 0) + stats.xp;
    killer.kills  = (killer.kills || 0) + 1;
    updatePlayerLevel(killer);
    sendToPlayer(killerId, { type: 'xpGain', amount: stats.xp, x: enemy.x, y: enemy.y });
  }

  // Spawn drops
  const loot = rollDrops(enemy.type);
  for (const d of loot) {
    spawnDrop(d.type, d.amount, d.powerupType, enemy.x, enemy.y);
  }

  broadcast({ type: 'enemyDied', enemyId: enemy.id, x: enemy.x, y: enemy.y, killerId });

  enemies.delete(enemy.id);
  waveState.enemiesSpawned = Math.max(0, waveState.enemiesSpawned - 1);
}

function applyDamageToPlayer(player, playerId, damage, killerId, now) {
  // Check invincibility
  const checkTime = Date.now();
  if (player.activePowerUps) {
    player.activePowerUps = player.activePowerUps.filter(p => p.expiresAt > checkTime);
    if (player.activePowerUps.some(p => p.type === 'invincibility')) return;
  }

  player.health = Math.max(0, player.health - damage);

  if (player.health <= 0 && !player.dead) {
    player.dead = true;
    player.deaths = (player.deaths || 0) + 1;
    player.deathTime = now;

    const killerObj = killerId ? players.get(killerId) : null;
    const killerName = killerObj ? killerObj.name : 'Enemy';

    killFeed.push({ killer: killerName, victim: player.name, time: now });
    if (killFeed.length > MAX_KILL_FEED) killFeed.shift();

    broadcast({
      type: 'kill',
      killerId: killerId || null,
      victimId: playerId,
      killerName,
      victimName: player.name,
    });
  }

  broadcast({
    type: 'hit',
    bulletId: null,
    playerId,
    x: player.x,
    y: player.y,
    health: player.health,
  });
}

function pickupDrop(player, playerId, drop) {
  switch (drop.type) {
    case 'hp':
      player.health = Math.min(MAX_HEALTH + (player.level || 0) * 5, player.health + drop.amount);
      break;
    case 'ammo': {
      const cw = player.currentWeapon || 'pistol';
      const wpn = player.weapons[cw];
      if (wpn && wpn.maxAmmo !== Infinity) {
        wpn.ammo = Math.min(wpn.maxAmmo, (wpn.ammo || 0) + drop.amount);
      }
      break;
    }
    case 'coins':
      player.coins = (player.coins || 0) + drop.amount;
      break;
    case 'powerup': {
      if (!player.activePowerUps) player.activePowerUps = [];
      player.activePowerUps = player.activePowerUps.filter(p => p.type !== drop.powerupType);
      player.activePowerUps.push({
        type: drop.powerupType,
        expiresAt: Date.now() + (POWERUP_DURATION[drop.powerupType] || 8000),
      });
      break;
    }
  }
  sendToPlayer(playerId, {
    type: 'pickup',
    dropType: drop.type,
    amount: drop.amount,
    powerupType: drop.powerupType,
    health: player.health,
    coins: player.coins,
    weapons: player.weapons,
  });
}

// ─── Wave System ─────────────────────────────────────────────────────────────
function getWaveConfig(wave) {
  const isBoss = wave % 5 === 0;
  if (isBoss) {
    return [
      { type: 'boss',   count: 1 },
      { type: 'zombie', count: 6 },
      { type: 'runner', count: wave >= 10 ? 4 : 0 },
    ];
  }
  return [
    { type: 'zombie',  count: 4 + wave * 2 },
    { type: 'runner',  count: wave >= 3  ? Math.floor(wave * 0.8)  : 0 },
    { type: 'shooter', count: wave >= 4  ? Math.floor(wave * 0.5)  : 0 },
    { type: 'tank',    count: wave >= 6  ? Math.floor(wave / 4)    : 0 },
  ];
}

function spawnEnemy(type) {
  const stats = ENEMY_STATS[type];
  const scale = 1 + (waveState.wave - 1) * 0.08;
  const pos = getEnemySpawn();
  const id = `e${++enemyIdCounter}`;
  enemies.set(id, {
    id, type,
    x: pos.x, y: pos.y,
    angle: 0,
    hp:    Math.floor(stats.hp    * scale),
    maxHp: Math.floor(stats.hp    * scale),
    damage:Math.floor(stats.damage * scale),
    speed: stats.speed,
    attackRange:   stats.attackRange,
    attackCooldown:stats.attackCooldown,
    lastAttackTime: 0,
    zigzagDir: 1,
    lastZigzag: 0,
  });
  waveState.enemiesSpawned++;
  waveState.totalEnemiesThisWave++;
}

function startWave(wave) {
  waveState.wave = wave;
  waveState.state = 'active';
  waveState.enemiesSpawned = 0;
  waveState.totalEnemiesThisWave = 0;

  const config = getWaveConfig(wave);
  for (const { type, count } of config) {
    for (let i = 0; i < count; i++) spawnEnemy(type);
  }

  broadcast({
    type: 'waveStart',
    wave,
    enemyCount: waveState.totalEnemiesThisWave,
    isBossWave: wave % 5 === 0,
  });
  console.log(`🌊 Wave ${wave} — ${waveState.totalEnemiesThisWave} enemies`);
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  const active = getActivePlayers();

  // ── Wave management ─────────────────────────────────────────────────────────
  if (active.length > 0) {
    if (waveState.state === 'prep' && now >= waveState.prepEndTime) {
      startWave(waveState.wave + 1);

    } else if (waveState.state === 'active' && enemies.size === 0 && waveState.totalEnemiesThisWave > 0) {
      waveState.state = 'complete';

      const bonusCoins = WAVE_BONUS_COINS + waveState.wave * 5;
      const bonusXP = 25 + waveState.wave * 5;
      for (const [, p] of players) {
        if (!p.dead) {
          p.coins = (p.coins || 0) + bonusCoins;
          p.xp    = (p.xp    || 0) + bonusXP;
          updatePlayerLevel(p);
        }
      }

      broadcast({ type: 'waveComplete', wave: waveState.wave, bonusCoins, bonusXP });
      console.log(`✅ Wave ${waveState.wave} complete`);

      // Schedule next wave
      waveState.prepEndTime = now + WAVE_PREP_TIME;
      setTimeout(() => {
        if (waveState.state === 'complete') {
          waveState.state = 'prep';
          broadcast({
            type: 'wavePrep',
            nextWave: waveState.wave + 1,
            timeLeft: WAVE_PREP_TIME / 1000,
          });
        }
      }, 200);
    }
  } else if (active.length === 0 && waveState.state === 'active' && waveState.wave > 0) {
    // No active players — pause wave timer
    waveState.prepEndTime = now + 3000;
  }

  // ── Player bullets ──────────────────────────────────────────────────────────
  for (const [id, bullet] of bullets) {
    bullet.x += Math.cos(bullet.angle) * BULLET_SPEED;
    bullet.y += Math.sin(bullet.angle) * BULLET_SPEED;

    if (bullet.x < 0 || bullet.x > WORLD_WIDTH ||
        bullet.y < 0 || bullet.y > WORLD_HEIGHT ||
        now - bullet.createdAt > BULLET_LIFETIME) {
      bullets.delete(id);
      continue;
    }

    // vs other players
    let hit = false;
    for (const [pid, player] of players) {
      if (pid === bullet.ownerId || player.dead) continue;
      const dx = player.x - bullet.x, dy = player.y - bullet.y;
      if (dx * dx + dy * dy < (PLAYER_RADIUS + 5) ** 2) {
        applyDamageToPlayer(player, pid, bullet.damage, bullet.ownerId, now);
        bullets.delete(id);
        hit = true;
        break;
      }
    }
    if (hit) continue;

    // vs enemies
    for (const [eid, enemy] of enemies) {
      const r = ENEMY_RADIUS[enemy.type] || 20;
      const dx = enemy.x - bullet.x, dy = enemy.y - bullet.y;
      if (dx * dx + dy * dy < (r + 5) ** 2) {
        enemy.hp -= bullet.damage;
        broadcast({
          type: 'enemyHit',
          enemyId: eid,
          x: bullet.x, y: bullet.y,
          hp: Math.max(0, enemy.hp),
          maxHp: enemy.maxHp,
          damage: bullet.damage,
        });
        bullets.delete(id);
        if (enemy.hp <= 0) killEnemy(enemy, bullet.ownerId, now);
        break;
      }
    }
  }

  // ── Enemy bullets ───────────────────────────────────────────────────────────
  for (const [id, bullet] of enemyBullets) {
    bullet.x += Math.cos(bullet.angle) * ENEMY_BULLET_SPEED;
    bullet.y += Math.sin(bullet.angle) * ENEMY_BULLET_SPEED;

    if (bullet.x < 0 || bullet.x > WORLD_WIDTH ||
        bullet.y < 0 || bullet.y > WORLD_HEIGHT ||
        now - bullet.createdAt > ENEMY_BULLET_LIFETIME) {
      enemyBullets.delete(id);
      continue;
    }

    for (const [pid, player] of players) {
      if (player.dead) continue;
      const dx = player.x - bullet.x, dy = player.y - bullet.y;
      if (dx * dx + dy * dy < (PLAYER_RADIUS + 4) ** 2) {
        applyDamageToPlayer(player, pid, bullet.damage, null, now);
        enemyBullets.delete(id);
        break;
      }
    }
  }

  // ── Enemy AI ────────────────────────────────────────────────────────────────
  for (const [, enemy] of enemies) {
    const target = getClosestPlayer(enemy.x, enemy.y);
    if (!target) continue;

    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    enemy.angle = Math.atan2(dy, dx);

    const r = ENEMY_RADIUS[enemy.type] || 20;
    const contactDist = r + PLAYER_RADIUS + 2;

    if (enemy.type === 'shooter' || enemy.type === 'boss') {
      const preferDist = enemy.type === 'boss' ? 320 : 300;

      if (dist > preferDist + 40) {
        enemy.x += (dx / dist) * enemy.speed * TICK_DELTA;
        enemy.y += (dy / dist) * enemy.speed * TICK_DELTA;
      } else if (dist < preferDist - 40) {
        enemy.x -= (dx / dist) * enemy.speed * TICK_DELTA * 0.7;
        enemy.y -= (dy / dist) * enemy.speed * TICK_DELTA * 0.7;
      }

      if (now - enemy.lastAttackTime > enemy.attackCooldown && dist < enemy.attackRange) {
        enemy.lastAttackTime = now;
        if (enemy.type === 'boss') {
          // Boss fires a spread of 5 bullets
          for (let i = -2; i <= 2; i++) {
            const a = enemy.angle + i * 0.18;
            const bid = `eb${++bulletIdCounter}`;
            enemyBullets.set(bid, {
              x: enemy.x + Math.cos(a) * (r + 10),
              y: enemy.y + Math.sin(a) * (r + 10),
              angle: a,
              damage: enemy.damage,
              createdAt: now,
            });
          }
        } else {
          const bid = `eb${++bulletIdCounter}`;
          enemyBullets.set(bid, {
            x: enemy.x + Math.cos(enemy.angle) * (r + 10),
            y: enemy.y + Math.sin(enemy.angle) * (r + 10),
            angle: enemy.angle,
            damage: enemy.damage,
            createdAt: now,
          });
        }
      }
    } else if (enemy.type === 'runner') {
      if (now - enemy.lastZigzag > 350) {
        enemy.zigzagDir *= -1;
        enemy.lastZigzag = now;
      }
      const perp = enemy.angle + Math.PI / 2;
      if (dist > contactDist) {
        const zf = 0.45;
        enemy.x += (dx / dist + Math.cos(perp) * zf * enemy.zigzagDir) * enemy.speed * TICK_DELTA;
        enemy.y += (dy / dist + Math.sin(perp) * zf * enemy.zigzagDir) * enemy.speed * TICK_DELTA;
      }
      // Melee attack
      if (dist < contactDist + 12 && now - enemy.lastAttackTime > enemy.attackCooldown) {
        enemy.lastAttackTime = now;
        applyDamageToPlayer(target, target.id, enemy.damage, null, now);
      }
    } else {
      // Zombie / Tank
      if (dist > contactDist) {
        enemy.x += (dx / dist) * enemy.speed * TICK_DELTA;
        enemy.y += (dy / dist) * enemy.speed * TICK_DELTA;
      }
      if (dist < contactDist + 15 && now - enemy.lastAttackTime > enemy.attackCooldown) {
        enemy.lastAttackTime = now;
        applyDamageToPlayer(target, target.id, enemy.damage, null, now);
      }
    }

    // Clamp to world bounds
    enemy.x = Math.max(r, Math.min(WORLD_WIDTH  - r, enemy.x));
    enemy.y = Math.max(r, Math.min(WORLD_HEIGHT - r, enemy.y));
  }

  // ── Drops ───────────────────────────────────────────────────────────────────
  for (const [did, drop] of drops) {
    if (now - drop.createdAt > 30000) {
      drops.delete(did);
      broadcast({ type: 'dropExpired', dropId: did });
      continue;
    }
    for (const [pid, player] of players) {
      if (player.dead) continue;
      const dx = player.x - drop.x, dy = player.y - drop.y;
      if (dx * dx + dy * dy < 28 * 28) {
        pickupDrop(player, pid, drop);
        drops.delete(did);
        broadcast({ type: 'dropExpired', dropId: did });
        break;
      }
    }
  }

  // ── Respawn players ─────────────────────────────────────────────────────────
  for (const [pid, player] of players) {
    if (player.dead && now - player.deathTime > RESPAWN_DELAY) {
      const sp = getRandomSpawn();
      player.x = sp.x; player.y = sp.y;
      player.health = MAX_HEALTH;
      player.dead = false; player.deathTime = 0;
      broadcast({ type: 'respawn', playerId: pid, x: player.x, y: player.y });
    }
  }

  // ── Clean expired power-ups ─────────────────────────────────────────────────
  for (const [, player] of players) {
    if (player.activePowerUps && player.activePowerUps.length > 0) {
      player.activePowerUps = player.activePowerUps.filter(p => p.expiresAt > now);
    }
  }

  // ── Broadcast state ─────────────────────────────────────────────────────────
  const playersArr = [];
  for (const [, p] of players) {
    playersArr.push({
      id: p.id, x: p.x, y: p.y, angle: p.angle,
      health: p.health, kills: p.kills, deaths: p.deaths, score: p.score,
      name: p.name, color: p.color, dead: p.dead, lastInput: p.lastInput,
      xp: p.xp || 0, level: p.level || 0, coins: p.coins || 0,
      currentWeapon: p.currentWeapon,
      weapons: p.weapons,
      activePowerUps: p.activePowerUps || [],
    });
  }

  const bulletsArr = [];
  for (const [id, b] of bullets) {
    bulletsArr.push({ id, x: b.x, y: b.y, angle: b.angle, ownerId: b.ownerId });
  }

  const enemyBulletsArr = [];
  for (const [id, b] of enemyBullets) {
    enemyBulletsArr.push({ id, x: b.x, y: b.y, angle: b.angle });
  }

  const enemiesArr = [];
  for (const [, e] of enemies) {
    enemiesArr.push({ id: e.id, type: e.type, x: e.x, y: e.y, angle: e.angle, hp: e.hp, maxHp: e.maxHp });
  }

  const dropsArr = [];
  for (const [, d] of drops) {
    dropsArr.push({ id: d.id, type: d.type, amount: d.amount, powerupType: d.powerupType, x: d.x, y: d.y });
  }

  broadcast({
    type: 'state',
    players: playersArr,
    bullets: bulletsArr,
    enemyBullets: enemyBulletsArr,
    enemies: enemiesArr,
    drops: dropsArr,
    wave: waveState.wave,
    waveState: waveState.state,
    waveEnemiesLeft: enemies.size,
    waveCountdown: (waveState.state === 'prep')
      ? Math.max(0, Math.ceil((waveState.prepEndTime - now) / 1000))
      : 0,
  });
}, 1000 / TICK_RATE);

// ─── WebSocket Handling ───────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  const connId = createId();
  const connData = { id: connId, playerId: null, joined: false, rateCount: 0, rateStart: Date.now() };
  connections.set(ws, connData);

  console.log(`🔌 Connection opened: ${connId}`);

  safeSend(ws, {
    type: 'welcome',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    playerCount: players.size,
  });

  ws.on('message', (raw) => {
    try {
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

          // Restore XP/level from client save
          const savedXP    = (typeof msg.savedXP    === 'number' && msg.savedXP    >= 0) ? msg.savedXP    : 0;
          const savedCoins = (typeof msg.savedCoins === 'number' && msg.savedCoins >= 0) ? msg.savedCoins : 0;

          const player = {
            id: playerId,
            x: spawn.x, y: spawn.y,
            angle: 0,
            health: MAX_HEALTH,
            kills: 0, deaths: 0, score: 0,
            name, color: `hsl(${Math.random() * 360}, 70%, 55%)`,
            dead: false, deathTime: 0, lastInput: 0,
            xp: savedXP,
            level: Math.floor(Math.sqrt(savedXP / 100)),
            skillPoints: 0,
            coins: savedCoins,
            currentWeapon: 'pistol',
            weapons: {
              pistol:  { ammo: Infinity, maxAmmo: Infinity },
              shotgun: { ammo: 0, maxAmmo: 48 },
              smg:     { ammo: 0, maxAmmo: 120 },
              sniper:  { ammo: 0, maxAmmo: 15 },
            },
            activePowerUps: [],
            lastShot: 0,
            // Client-sent skill bonuses (validated server-side)
            damageMult: 1.0,
            speedMult:  1.0,
          };

          // Apply client skills
          if (msg.skills && typeof msg.skills === 'object') {
            const s = msg.skills;
            player.damageMult = 1 + Math.min(5, Math.max(0, s.damage || 0)) * 0.10;
            player.speedMult  = 1 + Math.min(5, Math.max(0, s.speed  || 0)) * 0.10;
            player.health = MAX_HEALTH + Math.min(5, Math.max(0, s.maxHp || 0)) * 20;
          }

          players.set(playerId, player);
          connData.playerId = playerId;
          connData.joined = true;

          safeSend(ws, {
            type: 'joined',
            playerId,
            player,
            worldWidth: WORLD_WIDTH,
            worldHeight: WORLD_HEIGHT,
            killFeed,
            wave: waveState.wave,
            waveState: waveState.state,
            waveCountdown: Math.max(0, Math.ceil((waveState.prepEndTime - now) / 1000)),
          });

          broadcast({ type: 'playerJoined', player }, ws);
          console.log(`🎮 Player joined: ${name} (${playerId})`);
          break;
        }

        case 'move': {
          if (!connData.joined) return;
          const player = players.get(connData.playerId);
          if (!player || player.dead) return;

          if (typeof msg.x === 'number' && typeof msg.y === 'number' &&
              isFinite(msg.x) && isFinite(msg.y)) {
            player.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_WIDTH  - PLAYER_RADIUS, msg.x));
            player.y = Math.max(PLAYER_RADIUS, Math.min(WORLD_HEIGHT - PLAYER_RADIUS, msg.y));
          }
          if (typeof msg.angle === 'number' && isFinite(msg.angle)) player.angle = msg.angle;
          if (typeof msg.seq   === 'number') player.lastInput = msg.seq;
          break;
        }

        case 'shoot': {
          if (!connData.joined) return;
          const player = players.get(connData.playerId);
          if (!player || player.dead) return;

          if (typeof msg.angle === 'number' && isFinite(msg.angle)) player.angle = msg.angle;

          const wname = player.currentWeapon || 'pistol';
          const wdef  = WEAPONS[wname] || WEAPONS.pistol;
          const pwpn  = player.weapons[wname];

          // Check ammo
          const shootTime = Date.now();
          const hasInfiniteAmmo = player.activePowerUps &&
            player.activePowerUps.some(p => p.type === 'infiniteAmmo');
          if (!wdef.infiniteAmmo && !hasInfiniteAmmo && pwpn && pwpn.ammo <= 0) {
            player.currentWeapon = 'pistol';
            break;
          }

          let dmg = Math.round(wdef.damage * (player.damageMult || 1));
          if (player.activePowerUps && player.activePowerUps.some(p => p.type === 'doubleDamage')) dmg *= 2;

          const bulletCount = (player.activePowerUps && player.activePowerUps.some(p => p.type === 'multiShot'))
            ? wdef.bulletCount + 2
            : wdef.bulletCount;

          // Consume ammo
          if (!wdef.infiniteAmmo && !hasInfiniteAmmo && pwpn) pwpn.ammo = Math.max(0, pwpn.ammo - 1);

          for (let i = 0; i < bulletCount; i++) {
            const spread = (Math.random() - 0.5) * wdef.spread;
            const angle  = player.angle + spread;
            const bid = `b${++bulletIdCounter}`;
            bullets.set(bid, {
              x: player.x + Math.cos(player.angle) * (PLAYER_RADIUS + 8),
              y: player.y + Math.sin(player.angle) * (PLAYER_RADIUS + 8),
              angle,
              ownerId: connData.playerId,
              damage: dmg,
              createdAt: shootTime,
            });
          }
          break;
        }

        case 'switchWeapon': {
          if (!connData.joined) return;
          const player = players.get(connData.playerId);
          if (!player || player.dead) return;
          const wn = msg.weapon;
          if (WEAPONS[wn] && player.weapons[wn]) {
            const wpn = player.weapons[wn];
            if (wn === 'pistol' || wpn.ammo > 0) {
              player.currentWeapon = wn;
            }
          }
          break;
        }

        case 'unlockWeapon': {
          if (!connData.joined) return;
          const player = players.get(connData.playerId);
          if (!player) return;
          const wn = msg.weapon;
          const UNLOCK_COST = { shotgun: 400, smg: 600, sniper: 900 };
          if (!Object.prototype.hasOwnProperty.call(UNLOCK_COST, wn)) break;
          const cost = UNLOCK_COST[wn];
          if (cost && player.coins >= cost && player.weapons[wn] && player.weapons[wn].ammo === 0) {
            player.coins -= cost;
            player.weapons[wn].ammo = Math.floor(WEAPONS[wn].maxAmmo / 2);
            sendToPlayer(player.id, {
              type: 'weaponUnlocked',
              weapon: wn,
              coins: player.coins,
              weapons: player.weapons,
            });
          }
          break;
        }
      }
    } catch (_) {}
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
