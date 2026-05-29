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
const xpBarFill = document.getElementById('xp-bar-fill');
const xpText = document.getElementById('xp-text');
const levelBadge = document.getElementById('level-badge');
const waveDisplay = document.getElementById('wave-display');
const coinsDisplay = document.getElementById('coins-display');
const weaponDisplay = document.getElementById('weapon-display');
const ammoDisplay = document.getElementById('ammo-display');
const armorDisplay = document.getElementById('armor-display');
const reloadIndicator = document.getElementById('reload-indicator');
const reloadText = document.getElementById('reload-text');
const reloadBarFill = document.getElementById('reload-bar-fill');
const powerupsDisplay = document.getElementById('powerups-display');
const waveAnnouncement = document.getElementById('wave-announcement');
const levelupPopup = document.getElementById('levelup-popup');
const skillsBtn = document.getElementById('skills-btn');
const skillsPanel = document.getElementById('skills-panel');
const killstreakDisplay = document.getElementById('killstreak-display');
const leaderboardMini = document.getElementById('leaderboard-mini');
const scoreboard = document.getElementById('scoreboard');
const scoreboardList = document.getElementById('scoreboard-list');
const shopPanel = document.getElementById('shop-panel');
const shopCloseBtn = document.getElementById('shop-close-btn');
const shopCoinsLine = document.getElementById('shop-coins-line');
const shopCategoriesEl = document.getElementById('shop-categories');
const shopItemsEl = document.getElementById('shop-items');
const openShopBtn = document.getElementById('open-shop-btn');
const pausePanel = document.getElementById('pause-panel');
const resumeBtn = document.getElementById('resume-btn');
const pauseShopBtn = document.getElementById('pause-shop-btn');
const pauseMainBtn = document.getElementById('pause-main-btn');
const respawnBtn = document.getElementById('respawn-btn');
const spectateBtn = document.getElementById('spectate-btn');
const deathMainBtn = document.getElementById('death-main-btn');
const modeSelectInput = document.getElementById('mode-select-input');
const difficultyInput = document.getElementById('difficulty-input');
const friendlyFireInput = document.getElementById('friendly-fire-input');
const botsInput = document.getElementById('bots-input');
const fragLimitInput = document.getElementById('frag-limit-input');
const roundTimeInput = document.getElementById('round-time-input');
const leftStick = document.getElementById('left-stick');
const leftStickKnob = document.getElementById('left-stick-knob');
const mobileFireBtn = document.getElementById('mobile-fire-btn');
const mobileReloadBtn = document.getElementById('mobile-reload-btn');
const mobileSwitchBtn = document.getElementById('mobile-switch-btn');
const mobilePauseBtn = document.getElementById('mobile-pause-btn');
const mobileDashBtn = document.getElementById('mobile-dash-btn');
const mobileShopBtn = document.getElementById('mobile-shop-btn');
const hudShopBtn = document.getElementById('hud-shop-btn');
const comboDisplay = document.getElementById('combo-display');

// ─── Constants ───────────────────────────────────────────────────────────────
const PLAYER_RADIUS = 18;
const BULLET_RADIUS = 4;
const PLAYER_SPEED = 280;
const SPRINT_SPEED = 420;
const SHOOT_COOLDOWN = 150;
const SEND_RATE = 50;
const DASH_COOLDOWN = 2000;
const DASH_DISTANCE = 130;

const ENEMY_COLORS = {
  zombie:  { body: '#4ade80', outline: '#16a34a' },
  runner:  { body: '#f97316', outline: '#c2410c' },
  tank:    { body: '#64748b', outline: '#475569' },
  shooter: { body: '#a78bfa', outline: '#7c3aed' },
  boss:    { body: '#ef4444', outline: '#991b1b' },
};
const ENEMY_RADIUS_CLIENT = { zombie: 20, runner: 16, tank: 27, shooter: 18, boss: 42 };
const DROP_COLORS = { hp: '#22c55e', ammo: '#38bdf8', coins: '#fbbf24', powerup: '#c084fc' };
const DROP_ICONS  = { hp: '+', ammo: 'A', coins: '$', powerup: '*' };

const POWERUP_LABELS = {
  doubleDamage:  'x2 Damage',
  rapidFire:     'Rapid Fire',
  invincibility: 'God Mode',
  speedBoost:    'Speed+',
  infiniteAmmo:  'Inf Ammo',
  multiShot:     'Multi-shot',
};
const WEAPON_NAMES     = { pistol: 'Pistol', shotgun: 'Shotgun', smg: 'SMG', sniper: 'Sniper' };
const WEAPON_COLORS    = { pistol: '#94a3b8', shotgun: '#f97316', smg: '#22d3ee', sniper: '#a78bfa' };
const WEAPON_AMMO_INF  = { pistol: false, shotgun: false, smg: false, sniper: false };
const WEAPON_COOLDOWNS = { pistol: 150, shotgun: 900, smg: 80, sniper: 1500 };
const WEAPON_ORDER = ['pistol', 'shotgun', 'smg', 'sniper'];
const SHOP_CATALOG = [
  { id: 'unlock_shotgun', category: 'weapons', name: 'Shotgun', cost: 150, desc: 'Unlock shotgun.' },
  { id: 'unlock_smg', category: 'weapons', name: 'SMG', cost: 250, desc: 'Unlock SMG.' },
  { id: 'unlock_sniper', category: 'weapons', name: 'Sniper', cost: 400, desc: 'Unlock sniper rifle.' },
  { id: 'ammo_pistol', category: 'ammo', name: 'Pistol ammo', cost: 50, desc: '+45 rounds.' },
  { id: 'ammo_shotgun', category: 'ammo', name: 'Shotgun ammo', cost: 120, desc: '+24 shells.' },
  { id: 'ammo_smg', category: 'ammo', name: 'SMG ammo', cost: 120, desc: '+60 bullets.' },
  { id: 'ammo_sniper', category: 'ammo', name: 'Sniper ammo', cost: 150, desc: '+8 rounds.' },
  { id: 'medkit', category: 'survival', name: 'Medkit', cost: 120, desc: '+45 HP instantly.' },
  { id: 'armor_small', category: 'survival', name: 'Armor plate', cost: 160, desc: '+25 armor.' },
  { id: 'perk_speed', category: 'perks', name: 'Speed perk', cost: 320, desc: '+8% movement speed.' },
  { id: 'perk_reload', category: 'perks', name: 'Reload perk', cost: 300, desc: '-10% reload time.' },
  { id: 'perk_crit', category: 'perks', name: 'Crit perk', cost: 380, desc: '+5% crit chance.' },
];
const SHOP_CATEGORIES = [
  { id: 'weapons', label: 'Weapons' },
  { id: 'ammo', label: 'Ammo' },
  { id: 'survival', label: 'Armor/Heal' },
  { id: 'perks', label: 'Perks' },
];

// ─── Save System ─────────────────────────────────────────────────────────────
const SAVE_KEY = 'shooter_save_v2';
const MAX_SAVE_XP    = 10000000;
const MAX_SAVE_COINS = 100000;
function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!raw || typeof raw !== 'object') return {};
    const safe = {};
    if (typeof raw.xp    === 'number' && isFinite(raw.xp))    safe.xp    = Math.max(0, Math.min(raw.xp,    MAX_SAVE_XP));
    if (typeof raw.coins === 'number' && isFinite(raw.coins))  safe.coins = Math.max(0, Math.min(raw.coins, MAX_SAVE_COINS));
    if (typeof raw.skillPoints === 'number' && isFinite(raw.skillPoints)) safe.skillPoints = Math.max(0, Math.floor(raw.skillPoints));
    if (raw.skills && typeof raw.skills === 'object') {
      safe.skills = {};
      for (const [k, v] of Object.entries(raw.skills)) {
        if (typeof v === 'number' && isFinite(v)) safe.skills[k] = Math.max(0, Math.min(10, Math.floor(v)));
      }
    }
    if (typeof raw.mode === 'string') safe.mode = raw.mode;
    if (typeof raw.difficulty === 'string') safe.difficulty = raw.difficulty;
    if (typeof raw.friendlyFire === 'boolean') safe.friendlyFire = raw.friendlyFire;
    if (typeof raw.bots === 'number' && isFinite(raw.bots)) safe.bots = Math.max(0, Math.min(20, Math.floor(raw.bots)));
    if (typeof raw.fragLimit === 'number' && isFinite(raw.fragLimit)) safe.fragLimit = Math.max(5, Math.min(100, Math.floor(raw.fragLimit)));
    if (typeof raw.roundTimeMin === 'number' && isFinite(raw.roundTimeMin)) safe.roundTimeMin = Math.max(2, Math.min(30, Math.floor(raw.roundTimeMin)));
    if (raw.shopOwned && typeof raw.shopOwned === 'object') safe.shopOwned = raw.shopOwned;
    return safe;
  } catch (_) { return {}; }
}
function writeSave(data) { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...loadSave(), ...data })); } catch (_) {} }
const save = loadSave();

// ─── Skill Tree ───────────────────────────────────────────────────────────────
const SKILL_DEFS = {
  damage:    { name: 'Damage +10%',     max: 5, branch: 'attack'   },
  reload:    { name: 'Reload -15%',     max: 5, branch: 'attack'   },
  maxHp:     { name: 'MaxHP +20',       max: 5, branch: 'defense'  },
  regen:     { name: 'Regen HP/s',      max: 3, branch: 'defense'  },
  armor:     { name: 'Armor -10%dmg',   max: 3, branch: 'defense'  },
  speed:     { name: 'Speed +10%',      max: 5, branch: 'mobility' },
  dash:      { name: 'Dash CD /2',      max: 1, branch: 'mobility' },
  dropRate:  { name: 'Drop +15%',       max: 3, branch: 'utility'  },
  autoPickup:{ name: 'Auto-Pickup',     max: 1, branch: 'utility'  },
  luckShot:  { name: 'Crit +10%',       max: 1, branch: 'utility'  },
};
const skills = Object.assign(
  Object.fromEntries(Object.keys(SKILL_DEFS).map(k => [k, 0])),
  save.skills || {}
);
let skillPoints = save.skillPoints || 0;

function getSkillBonus(key) { const d = SKILL_DEFS[key]; return d ? Math.min(skills[key] || 0, d.max) : 0; }
function playerSpeedMult() {
  let mult = 1 + getSkillBonus('speed') * 0.10;
  if (shopOwned.perk_speed) mult *= 1.08;
  return mult;
}
function playerMaxHp()     { return 100 + getSkillBonus('maxHp') * 20; }
function getDashCooldown() { return getSkillBonus('dash') > 0 ? 1000 : DASH_COOLDOWN; }
function getShootCooldown(wpn) {
  let reduction = getSkillBonus('reload') * 0.15;
  if (shopOwned.perk_reload) reduction += 0.1;
  const base = WEAPON_COOLDOWNS[wpn || currentWeapon] || SHOOT_COOLDOWN;
  return Math.max(50, base * (1 - reduction));
}

// ─── State ───────────────────────────────────────────────────────────────────
let ws = null, connected = false, joined = false, localId = null, localPlayerName = '';
let worldW = 2400, worldH = 2400;
const keys = {}, mouse = { x: 0, y: 0, down: false }, camera = { x: 0, y: 0 };
let players = new Map(), bullets = [], enemyBullets = [], enemies = [], drops = [];
let particles = [], killFeed = [], damageNumbers = [];
let localPlayer = null, pendingInputs = [], inputSeq = 0;
let lastSendTime = 0, lastShotTime = 0, lastDashTime = 0;
let running = false, lastFrame = 0, isDead = false;
let isPaused = false, isSpectating = false, isShopOpen = false, isScoreboardOpen = false;
let isLevelUpOpen = false;
let currentWeapon = 'pistol';
let previousWeapon = null;
let playerWeapons = {
  pistol:  { ammo: 120, maxAmmo: 150, ammoInClip: 20, magazineSize: 20, reloadMs: 800, unlocked: true },
  shotgun: { ammo: 0, maxAmmo: 48, ammoInClip: 0, magazineSize: 8, reloadMs: 1200, unlocked: false },
  smg:     { ammo: 0, maxAmmo: 180, ammoInClip: 0, magazineSize: 30, reloadMs: 1000, unlocked: false },
  sniper:  { ammo: 0, maxAmmo: 25, ammoInClip: 0, magazineSize: 5, reloadMs: 1800, unlocked: false },
};
let activePowerUps = [], waveNumber = 0, waveStateStr = 'prep', waveCountdown = 5, waveEnemiesLeft = 0;
let currentMode = 'survival';
let xp = save.xp || 0, level = Math.floor(Math.sqrt(xp / 100)), coins = save.coins || 0;
let pendingSkillPoints = skillPoints, regenTimer = 0, screenShake = 0;
let reloadEndAt = 0, reloadDuration = 0;
let reloadRequested = false;
let reloadRequestSentAt = 0;
let selectedShopCategory = 'weapons';
// Combo system
let comboCount = 0, comboTimer = 0, comboResetDelay = 4000;
let matchSettings = {
  mode: save.mode || 'survival',
  difficulty: save.difficulty || 'normal',
  friendlyFire: save.friendlyFire || false,
  bots: save.bots || 6,
  fragLimit: save.fragLimit || 25,
  roundTimeMin: save.roundTimeMin || 8
};
let shopOwned = Object.assign({}, save.shopOwned || {});
const isMobile = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const mobileStick = { active: false, id: null, startX: 0, startY: 0, x: 0, y: 0 };

// ─── Canvas Setup ────────────────────────────────────────────────────────────
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resize();
window.addEventListener('resize', resize);

// ─── WebSocket ───────────────────────────────────────────────────────────────
function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(proto + '//' + location.host);
  ws.onopen = () => {
    connected = true;
    updateStatus('connected', 'Connected! Enter name and play.');
    playBtn.disabled = false; playBtn.textContent = 'PLAY';
  };
  ws.onmessage = (e) => { try { handleMessage(JSON.parse(e.data)); } catch (_) {} };
  ws.onclose = () => {
    connected = false;
    if (joined) {
      joined = false; running = false;
      hud.style.display = 'none'; startScreen.style.display = 'flex'; deathScreen.style.display = 'none';
      updateStatus('error', 'Connection lost. Refresh.');
      playBtn.disabled = true; playBtn.textContent = 'Disconnected';
    } else { updateStatus('error', 'Could not connect. Refresh.'); playBtn.disabled = true; }
    setTimeout(() => { if (!connected) connectWS(); }, 2000);
  };
  ws.onerror = () => {};
}
function updateStatus(cls, text) { statusText.className = 'status ' + cls; statusText.textContent = text; }
function send(msg) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); }

// ─── Message Handling ────────────────────────────────────────────────────────
function handleMessage(msg) {
  switch (msg.type) {
    case 'welcome': worldW = msg.worldWidth; worldH = msg.worldHeight; break;

    case 'joined':
      localId = msg.playerId; worldW = msg.worldWidth; worldH = msg.worldHeight;
      localPlayer = {
        x: msg.player.x, y: msg.player.y, angle: 0, health: msg.player.health,
        kills: 0, deaths: 0, score: 0, armor: msg.player.armor || 0, killstreak: 0
      };
      if (msg.player.weapons) playerWeapons = msg.player.weapons;
      currentWeapon = msg.player.currentWeapon || 'pistol';
      if (msg.player.coins !== undefined) coins = msg.player.coins;
      if (msg.killFeed) killFeed = msg.killFeed.map(k => ({ ...k, fadeTime: Date.now() + 8000 }));
      waveNumber = msg.wave || 0; waveStateStr = msg.waveState || 'prep'; waveCountdown = msg.waveCountdown || 5;
      joined = true; isDead = false; running = true; lastFrame = performance.now();
      startScreen.style.display = 'none'; deathScreen.style.display = 'none'; hud.style.display = 'block';
      if (isMobile) document.getElementById('mobile-controls').style.display = 'block';
      requestAnimationFrame(loop);
      break;

    case 'state': applyState(msg); break;

    case 'hit':
      spawnParticles(msg.x, msg.y, '#ff6b6b', 8, 180);
      if (msg.damage) spawnDmgNum(msg.x, msg.y, '-' + msg.damage, '#f87171');
      screenShake = Math.max(screenShake, 5);
      if (msg.playerId === localId && navigator.vibrate && isMobile) navigator.vibrate(30);
      break;

    case 'kill':
      addKillFeed(msg.killerName, msg.victimName);
      if (msg.victimId === localId) onDeath(msg.killerName); break;

    case 'respawn':
      if (msg.playerId === localId && localPlayer) {
        localPlayer.x = msg.x; localPlayer.y = msg.y; localPlayer.health = msg.health || 100;
        localPlayer.armor = msg.armor || 0;
        isDead = false; isSpectating = false; deathScreen.style.display = 'none';
      }
      spawnParticles(msg.x, msg.y, '#4ade80', 16, 200); break;

    case 'playerLeft': players.delete(msg.playerId); break;

    case 'enemyHit':
      spawnParticles(msg.x, msg.y, '#fb923c', 6, 150);
      spawnDmgNum(msg.x, msg.y, msg.damage, '#fb923c'); break;

    case 'enemyDied':
      spawnParticles(msg.x, msg.y, '#facc15', 22, 260); screenShake = Math.max(screenShake, 3);
      // Combo: if this player killed the enemy
      if (msg.killerId === localId) {
        comboCount++;
        comboTimer = 0;
        if (comboCount >= 2) updateComboDisplay();
      }
      break;

    case 'waveStart':
      waveNumber = msg.wave; waveStateStr = 'active'; waveEnemiesLeft = msg.enemyCount || 0;
      showWaveAnnouncement(msg.wave, msg.isBossWave, msg.enemyCount); break;

    case 'waveComplete':
      waveStateStr = 'complete'; xp += msg.bonusXP || 0; coins += msg.bonusCoins || 0;
      checkLevelUp(); persistProgress();
      showWaveComplete(msg.wave, msg.bonusCoins, msg.bonusXP); break;

    case 'wavePrep': waveStateStr = 'prep'; waveCountdown = msg.timeLeft; break;

    case 'xpGain':
      xp += msg.amount; spawnDmgNum(msg.x, msg.y, '+' + msg.amount + 'XP', '#c084fc');
      checkLevelUp(); persistProgress(); break;

    case 'levelUp': level = msg.level; pendingSkillPoints = msg.skillPoints; showLevelUp(msg.level); break;

    case 'pickup':
      if (msg.dropType === 'hp' && localPlayer) {
        localPlayer.health = msg.health; spawnDmgNum(localPlayer.x, localPlayer.y - 20, '+' + msg.amount + 'HP', '#22c55e');
      } else if (msg.dropType === 'coins') {
        coins += msg.amount; if (localPlayer) spawnDmgNum(localPlayer.x, localPlayer.y - 20, '+' + msg.amount + '$', '#fbbf24');
        persistProgress();
      } else if (msg.dropType === 'ammo') {
        if (msg.weapons) playerWeapons = msg.weapons;
        if (localPlayer) spawnDmgNum(localPlayer.x, localPlayer.y - 20, '+AMMO', '#38bdf8');
      } else if (msg.dropType === 'powerup') {
        const dur = { doubleDamage: 10000, rapidFire: 8000, invincibility: 5000, speedBoost: 12000, infiniteAmmo: 7000, multiShot: 10000 };
        activePowerUps = activePowerUps.filter(p => p.type !== msg.powerupType);
        activePowerUps.push({ type: msg.powerupType, expiresAt: Date.now() + (dur[msg.powerupType] || 8000) });
        showNotification((POWERUP_LABELS[msg.powerupType] || msg.powerupType) + ' activated!');
      }
      break;

    case 'dropExpired': drops = drops.filter(d => d.id !== msg.dropId); break;

    case 'weaponUnlocked':
      if (msg.weapons) playerWeapons = msg.weapons;
      coins = msg.coins;
      if (msg.weapon) shopOwned['unlock_' + msg.weapon] = true;
      showNotification(WEAPON_NAMES[msg.weapon] + ' unlocked!');
      persistProgress();
      break;

    case 'reloadStart':
      if (msg.playerId === localId) {
        reloadDuration = msg.duration || 0;
        reloadEndAt = Date.now() + reloadDuration;
        reloadRequested = false;
      }
      break;

    case 'reloadComplete':
      if (msg.playerId === localId) {
        if (msg.weapons) playerWeapons = msg.weapons;
        reloadDuration = 0; reloadEndAt = 0;
        reloadRequested = false;
      }
      break;

    case 'shopResult':
      if (msg.ok) {
        if (msg.coins !== undefined) coins = msg.coins;
        if (msg.weapons) playerWeapons = msg.weapons;
        if (localPlayer && typeof msg.health === 'number') localPlayer.health = msg.health;
        if (localPlayer && typeof msg.armor === 'number') localPlayer.armor = msg.armor;
        if (msg.perks) shopOwned = { ...shopOwned, ...msg.perks };
        if (msg.itemId && (msg.itemId.startsWith('unlock_') || msg.itemId.startsWith('perk_'))) shopOwned[msg.itemId] = true;
        showNotification(msg.message || 'Purchased');
        persistProgress();
      } else {
        showNotification(msg.message || 'Purchase failed');
      }
      renderShop();
      break;

    case 'matchEnded':
      showNotification(msg.message || 'Match ended');
      break;

    case 'respawnRejected':
      showNotification(msg.message || 'Respawn unavailable');
      break;
  }
}

function applyState(msg) {
  if (!joined) return;
  const newPlayers = new Map();
  for (const sp of msg.players) newPlayers.set(sp.id, sp);
  players = newPlayers; bullets = msg.bullets || []; enemyBullets = msg.enemyBullets || [];
  enemies = msg.enemies || []; drops = msg.drops || [];
  if (msg.waveState) waveStateStr = msg.waveState;
  if (typeof msg.wave === 'number') waveNumber = msg.wave;
  if (typeof msg.waveCountdown === 'number') waveCountdown = msg.waveCountdown;
  if (typeof msg.waveEnemiesLeft === 'number') waveEnemiesLeft = msg.waveEnemiesLeft;
  if (typeof msg.mode === 'string') currentMode = msg.mode;
  const myData = players.get(localId);
  if (!myData || !localPlayer) return;
  if (myData.dead && !isDead) onDeath('');
  localPlayer.health = myData.health; localPlayer.kills = myData.kills;
  localPlayer.deaths = myData.deaths; localPlayer.score = myData.score;
  localPlayer.armor = myData.armor || 0;
  localPlayer.killstreak = myData.killstreak || 0;
  if (myData.weapons) playerWeapons = myData.weapons;
  if (myData.currentWeapon) currentWeapon = myData.currentWeapon;
  if (myData.activePowerUps) activePowerUps = myData.activePowerUps;
  const ack = myData.lastInput || 0;
  pendingInputs = pendingInputs.filter(i => i.seq > ack);
  localPlayer.x = myData.x; localPlayer.y = myData.y;
  for (const inp of pendingInputs) {
    localPlayer.x = clamp(localPlayer.x + inp.dx, PLAYER_RADIUS, worldW - PLAYER_RADIUS);
    localPlayer.y = clamp(localPlayer.y + inp.dy, PLAYER_RADIUS, worldH - PLAYER_RADIUS);
  }
  pcountEl.textContent = players.size;
}

// ─── Game Flow ────────────────────────────────────────────────────────────────
function startGame() {
  if (!connected) return;
  const name = nameInput.value.trim() || '';
  localPlayerName = name;
  send({
    type: 'join',
    name,
    savedXP: xp,
    savedCoins: coins,
    skills: { ...skills },
    settings: { ...matchSettings },
    perks: { ...shopOwned }
  });
  playBtn.disabled = true; playBtn.textContent = 'Connecting...';
}

function onDeath(killerName) {
  isDead = true;
  isPaused = false;
  isShopOpen = false;
  if (pausePanel) pausePanel.style.display = 'none';
  if (shopPanel) shopPanel.style.display = 'none';
  if (skillsPanel) skillsPanel.style.display = 'none';
  deathScreen.style.display = 'flex';
  deathInfo.textContent = killerName ? 'Killed by: ' + killerName : 'You died';
  if (localPlayer) spawnParticles(localPlayer.x, localPlayer.y, '#f97316', 30, 300);
  screenShake = 10;
  comboCount = 0; comboTimer = 0; if (comboDisplay) comboDisplay.style.display = 'none';
  clearAllKeys();
}

// ─── Input ────────────────────────────────────────────────────────────────────
// Fix: Clear all keys when focus is lost or state changes
function clearAllKeys() {
  Object.keys(keys).forEach(k => keys[k] = false);
  mouse.down = false;
}

window.addEventListener('blur', clearAllKeys);
window.addEventListener('visibilitychange', () => {
  if (document.hidden) clearAllKeys();
});

window.addEventListener('keydown', e => {
  // Prevent stuck keys from popups/modals
  if (isDead || isPaused || isShopOpen || isLevelUpOpen) {
    if (!['Escape', 'KeyB', 'Tab'].includes(e.code)) {
      clearAllKeys();
      return;
    }
  }
  
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Space' && localPlayer && !isDead) tryDash();
  if (e.code === 'KeyQ' && localPlayer && !isDead) switchToPreviousWeapon();
  if (e.code === 'KeyR' && localPlayer && !isDead) requestReload();
  if (e.code === 'Escape') {
    if (isShopOpen) toggleShop(false);
    else togglePause();
  }
  if (e.code === 'Tab') { e.preventDefault(); isScoreboardOpen = true; renderScoreboard(); }
  if (e.code === 'KeyB' && !isDead) toggleShop();
  if (localPlayer && !isDead && !isPaused) {
    if (e.code === 'Digit1') switchWeapon('pistol');
    if (e.code === 'Digit2') switchWeapon('shotgun');
    if (e.code === 'Digit3') switchWeapon('smg');
    if (e.code === 'Digit4') switchWeapon('sniper');
  }
  if (e.code === 'KeyK') toggleSkillsPanel();
  if (e.code === 'Escape' && skillsPanel) skillsPanel.style.display = 'none';
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Tab') { isScoreboardOpen = false; if (scoreboard) scoreboard.style.display = 'none'; }
});
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) mouse.down = true; });
canvas.addEventListener('mouseup',   e => { if (e.button === 0) mouse.down = false; });
canvas.addEventListener('mouseleave', () => { mouse.down = false; });
canvas.addEventListener('touchstart', e => {
  if (!isMobile) return;
  const touch = Array.from(e.touches).find(t => t.clientX > window.innerWidth * 0.45);
  if (touch) { mouse.x = touch.clientX; mouse.y = touch.clientY; }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  if (!isMobile) return;
  const touch = Array.from(e.touches).find(t => t.clientX > window.innerWidth * 0.45);
  if (touch) { mouse.x = touch.clientX; mouse.y = touch.clientY; }
}, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  if (isDead) return;
  e.preventDefault();
  cycleWeapon(e.deltaY > 0 ? 1 : -1);
}, { passive: false });
playBtn.addEventListener('click', startGame);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') startGame(); });
if (skillsBtn) skillsBtn.addEventListener('click', toggleSkillsPanel);
if (openShopBtn) openShopBtn.addEventListener('click', () => toggleShop(true));
if (shopCloseBtn) shopCloseBtn.addEventListener('click', () => toggleShop(false));
if (resumeBtn) resumeBtn.addEventListener('click', () => togglePause(false));
if (pauseShopBtn) pauseShopBtn.addEventListener('click', () => { togglePause(false); toggleShop(true); });
if (pauseMainBtn) pauseMainBtn.addEventListener('click', returnToMainMenu);
if (respawnBtn) respawnBtn.addEventListener('click', () => send({ type: 'respawnRequest' }));
if (spectateBtn) spectateBtn.addEventListener('click', () => { isSpectating = true; deathInfo.textContent = 'Spectating mode'; });
if (deathMainBtn) deathMainBtn.addEventListener('click', returnToMainMenu);
if (mobileFireBtn) {
  mobileFireBtn.addEventListener('touchstart', e => { e.preventDefault(); mouse.down = true; }, { passive: false });
  mobileFireBtn.addEventListener('touchend', e => { e.preventDefault(); mouse.down = false; }, { passive: false });
}
if (mobileReloadBtn) mobileReloadBtn.addEventListener('touchstart', e => { e.preventDefault(); requestReload(); }, { passive: false });
if (mobileSwitchBtn) mobileSwitchBtn.addEventListener('touchstart', e => { e.preventDefault(); cycleWeapon(1); }, { passive: false });
if (mobilePauseBtn) mobilePauseBtn.addEventListener('touchstart', e => { e.preventDefault(); togglePause(); }, { passive: false });
if (mobileDashBtn) mobileDashBtn.addEventListener('touchstart', e => { e.preventDefault(); if (localPlayer && !isDead) tryDash(); }, { passive: false });
if (mobileShopBtn) mobileShopBtn.addEventListener('touchstart', e => { e.preventDefault(); toggleShop(); }, { passive: false });
if (hudShopBtn) hudShopBtn.addEventListener('click', () => toggleShop());
if (leftStick) {
  leftStick.addEventListener('touchstart', onStickStart, { passive: false });
  leftStick.addEventListener('touchmove', onStickMove, { passive: false });
  leftStick.addEventListener('touchend', onStickEnd, { passive: false });
  leftStick.addEventListener('touchcancel', onStickEnd, { passive: false });
}
if (modeSelectInput) modeSelectInput.value = matchSettings.mode;
if (difficultyInput) difficultyInput.value = matchSettings.difficulty;
if (friendlyFireInput) friendlyFireInput.value = matchSettings.friendlyFire ? 'on' : 'off';
if (botsInput) botsInput.value = String(matchSettings.bots);
if (fragLimitInput) fragLimitInput.value = String(matchSettings.fragLimit);
if (roundTimeInput) roundTimeInput.value = String(matchSettings.roundTimeMin);
for (const control of [modeSelectInput, difficultyInput, friendlyFireInput, botsInput, fragLimitInput, roundTimeInput]) {
  if (!control) continue;
  control.addEventListener('change', syncMatchSettingsFromUI);
}
if (shopPanel) shopPanel.addEventListener('click', e => { if (e.target === shopPanel) toggleShop(false); });

function switchWeapon(name) {
  if (currentWeapon === name || !playerWeapons[name] || playerWeapons[name].unlocked === false) return;
  previousWeapon = currentWeapon;
  const wpn = playerWeapons[name];
  currentWeapon = name;
  reloadEndAt = 0;
  reloadRequested = false;
  send({ type: 'switchWeapon', weapon: name });
}

function switchToPreviousWeapon() {
  if (previousWeapon && previousWeapon !== currentWeapon) switchWeapon(previousWeapon);
}

function cycleWeapon(dir) {
  const available = WEAPON_ORDER.filter(w => playerWeapons[w] && playerWeapons[w].unlocked !== false);
  if (available.length < 2) return;
  const idx = available.indexOf(currentWeapon);
  const next = available[(idx + dir + available.length) % available.length];
  switchWeapon(next);
}

function requestReload() {
  if (!joined || !localPlayer || isDead) return;
  if (reloadRequested || reloadEndAt > Date.now()) return;
  reloadRequested = true;
  reloadRequestSentAt = Date.now();
  send({ type: 'reload' });
}

function togglePause(force) {
  if (!joined || isDead) return;
  isPaused = typeof force === 'boolean' ? force : !isPaused;
  if (pausePanel) pausePanel.style.display = isPaused ? 'flex' : 'none';
  // Clear keys when pausing to prevent stuck movement
  if (isPaused) clearAllKeys();
}

function toggleShop(force) {
  if (isDead) return;
  const open = typeof force === 'boolean' ? force : !isShopOpen;
  isShopOpen = open;
  if (shopPanel) shopPanel.style.display = open ? 'flex' : 'none';
  if (open) {
    renderShop();
    clearAllKeys(); // Clear keys when opening shop
  }
}

function syncMatchSettingsFromUI() {
  matchSettings = {
    mode: modeSelectInput ? modeSelectInput.value : 'survival',
    difficulty: difficultyInput ? difficultyInput.value : 'normal',
    friendlyFire: friendlyFireInput ? friendlyFireInput.value === 'on' : false,
    bots: botsInput ? Math.max(0, Math.min(20, Number(botsInput.value) || 0)) : 6,
    fragLimit: fragLimitInput ? Math.max(5, Math.min(100, Number(fragLimitInput.value) || 25)) : 25,
    roundTimeMin: roundTimeInput ? Math.max(2, Math.min(30, Number(roundTimeInput.value) || 8)) : 8
  };
  persistProgress();
}

function returnToMainMenu() {
  running = false;
  joined = false;
  isDead = false;
  isPaused = false;
  isShopOpen = false;
  if (pausePanel) pausePanel.style.display = 'none';
  if (shopPanel) shopPanel.style.display = 'none';
  if (hud) hud.style.display = 'none';
  if (deathScreen) deathScreen.style.display = 'none';
  if (startScreen) startScreen.style.display = 'flex';
  if (playBtn) { playBtn.disabled = !connected; playBtn.textContent = connected ? 'PLAY' : 'Connecting...'; }
  const mobileControls = document.getElementById('mobile-controls');
  if (mobileControls) mobileControls.style.display = 'none';
}

function renderShop() {
  if (!shopCategoriesEl || !shopItemsEl) return;
  shopCoinsLine.textContent = 'Coins: ' + coins;
  shopCategoriesEl.innerHTML = '';
  for (const cat of SHOP_CATEGORIES) {
    const b = document.createElement('button');
    b.className = 'shop-cat-btn' + (selectedShopCategory === cat.id ? ' active' : '');
    b.textContent = cat.label;
    b.addEventListener('click', () => { selectedShopCategory = cat.id; renderShop(); });
    shopCategoriesEl.appendChild(b);
  }
  const items = SHOP_CATALOG.filter(i => i.category === selectedShopCategory);
  shopItemsEl.innerHTML = '';
  for (const item of items) {
    const card = document.createElement('div');
    const owned = !!shopOwned[item.id] || (item.id.startsWith('unlock_') && playerWeapons[item.id.replace('unlock_', '')]?.unlocked);
    card.className = 'shop-item' + (owned ? ' owned' : '') + (coins < item.cost && !owned ? ' locked' : '');
    const title = document.createElement('h4'); title.textContent = item.name + ' • ' + item.cost + '$';
    const desc = document.createElement('p'); desc.textContent = item.desc;
    const btn = document.createElement('button');
    btn.textContent = owned ? 'Owned' : 'Buy';
    btn.disabled = owned || coins < item.cost;
    btn.title = desc.textContent;
    btn.addEventListener('click', () => send({ type: 'shopBuy', itemId: item.id }));
    card.appendChild(title); card.appendChild(desc); card.appendChild(btn);
    shopItemsEl.appendChild(card);
  }
}

function renderScoreboard() {
  if (!scoreboard || !scoreboardList) return;
  if (!isScoreboardOpen) return;
  scoreboard.style.display = 'flex';
  const rows = [...players.values()].sort((a, b) => (b.score || 0) - (a.score || 0));
  scoreboardList.innerHTML = rows.map(p =>
    '<div class="scoreboard-row"><span>' + esc(p.name || 'Player') + '</span><span>K ' + (p.kills || 0) + '</span><span>D ' + (p.deaths || 0) + '</span><span>' + (p.score || 0) + '</span></div>'
  ).join('');
}

function onStickStart(e) {
  if (mobileStick.active) return;
  const t = e.changedTouches[0];
  mobileStick.active = true; mobileStick.id = t.identifier;
  mobileStick.startX = t.clientX; mobileStick.startY = t.clientY;
  mobileStick.x = 0; mobileStick.y = 0;
  e.preventDefault();
}
function onStickMove(e) {
  if (!mobileStick.active) return;
  const t = Array.from(e.changedTouches).find(x => x.identifier === mobileStick.id);
  if (!t) return;
  const dx = t.clientX - mobileStick.startX;
  const dy = t.clientY - mobileStick.startY;
  const len = Math.hypot(dx, dy) || 1;
  const max = 40;
  mobileStick.x = (dx / len) * Math.min(max, len);
  mobileStick.y = (dy / len) * Math.min(max, len);
  if (leftStickKnob) {
    leftStickKnob.style.left = (40 + mobileStick.x * 0.7) + 'px';
    leftStickKnob.style.top = (40 + mobileStick.y * 0.7) + 'px';
  }
  e.preventDefault();
}
function onStickEnd(e) {
  const t = Array.from(e.changedTouches).find(x => x.identifier === mobileStick.id);
  if (!t) return;
  mobileStick.active = false; mobileStick.id = null;
  mobileStick.x = 0; mobileStick.y = 0;
  if (leftStickKnob) { leftStickKnob.style.left = '40px'; leftStickKnob.style.top = '40px'; }
  e.preventDefault();
}

// ─── Dash ─────────────────────────────────────────────────────────────────────
function tryDash() {
  const now = performance.now();
  if (now - lastDashTime < getDashCooldown()) return;
  lastDashTime = now;
  const dx = Math.cos(localPlayer.angle) * DASH_DISTANCE;
  const dy = Math.sin(localPlayer.angle) * DASH_DISTANCE;
  localPlayer.x = clamp(localPlayer.x + dx, PLAYER_RADIUS, worldW - PLAYER_RADIUS);
  localPlayer.y = clamp(localPlayer.y + dy, PLAYER_RADIUS, worldH - PLAYER_RADIUS);
  spawnParticles(localPlayer.x, localPlayer.y, '#60a5fa', 12, 150);
  pendingInputs.push({ seq: ++inputSeq, dx, dy });
  send({ type: 'move', x: localPlayer.x, y: localPlayer.y, angle: localPlayer.angle, seq: inputSeq });
}

// ─── Update ───────────────────────────────────────────────────────────────────
function update(dt) {
  if (!localPlayer || isDead || isPaused || isShopOpen || isSpectating || isLevelUpOpen) return;
  const now = performance.now();
  localPlayer.angle = Math.atan2(camera.y + mouse.y - localPlayer.y, camera.x + mouse.x - localPlayer.x);
  let mx = 0, my = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    my -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  my += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  mx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
  if (mobileStick.active) {
    mx += mobileStick.x / 40;
    my += mobileStick.y / 40;
  }
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    const hasSprint = keys['ShiftLeft'] || keys['ShiftRight'];
    const speed = (hasSprint ? SPRINT_SPEED : PLAYER_SPEED) * playerSpeedMult();
    const dx = (mx / len) * speed * dt, dy = (my / len) * speed * dt;
    localPlayer.x = clamp(localPlayer.x + dx, PLAYER_RADIUS, worldW - PLAYER_RADIUS);
    localPlayer.y = clamp(localPlayer.y + dy, PLAYER_RADIUS, worldH - PLAYER_RADIUS);
    pendingInputs.push({ seq: ++inputSeq, dx, dy });
    if (Math.random() < 0.06) spawnParticles(localPlayer.x, localPlayer.y, 'rgba(100,100,100,0.25)', 1, 18);
  }
  if (now - lastSendTime > SEND_RATE) {
    send({ type: 'move', x: localPlayer.x, y: localPlayer.y, angle: localPlayer.angle, seq: inputSeq });
    lastSendTime = now;
  }
  const shootCd = getShootCooldown(currentWeapon);
  const hasRapidFire = activePowerUps.some(p => p.type === 'rapidFire' && p.expiresAt > Date.now());
  if (mouse.down && reloadEndAt <= Date.now() && now - lastShotTime > (hasRapidFire ? shootCd / 2 : shootCd)) {
    send({ type: 'shoot', angle: localPlayer.angle });
    lastShotTime = now;
    spawnParticles(
      localPlayer.x + Math.cos(localPlayer.angle) * (PLAYER_RADIUS + 12),
      localPlayer.y + Math.sin(localPlayer.angle) * (PLAYER_RADIUS + 12),
      '#fde047', 5, 120
    );
  }
  const wpn = playerWeapons[currentWeapon];
  if (wpn && wpn.ammoInClip === 0 && wpn.ammo > 0 && !reloadRequested && reloadEndAt <= Date.now()) requestReload();
  if (reloadRequested && Date.now() - reloadRequestSentAt > 500) reloadRequested = false;
  if (getSkillBonus('regen') > 0) {
    regenTimer += dt;
    if (regenTimer >= 1) { regenTimer = 0; localPlayer.health = Math.min(playerMaxHp(), localPlayer.health + getSkillBonus('regen') * 0.5); }
  }
  const tcx = clamp(localPlayer.x - canvas.width / 2, 0, worldW - canvas.width);
  const tcy = clamp(localPlayer.y - canvas.height / 2, 0, worldH - canvas.height);
  camera.x += (tcx - camera.x) * Math.min(1, dt * 8);
  camera.y += (tcy - camera.y) * Math.min(1, dt * 8);
  if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 28);
  updateParticles(dt);
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    const dn = damageNumbers[i]; dn.life -= dt; dn.y -= 40 * dt;
    if (dn.life <= 0) damageNumbers.splice(i, 1);
  }
  activePowerUps = activePowerUps.filter(p => p.expiresAt > Date.now());
  // Combo timer decay
  if (comboCount > 0) {
    comboTimer += dt * 1000;
    if (comboTimer >= comboResetDelay) { comboCount = 0; comboTimer = 0; updateComboDisplay(); }
  }
  updateHUD();
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
  }
}
function spawnParticles(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2, vel = speed * (0.3 + Math.random() * 0.7);
    particles.push({ x, y, vx: Math.cos(angle) * vel, vy: Math.sin(angle) * vel, life: 0.2 + Math.random() * 0.4, size: 2 + Math.random() * 3, color });
  }
  if (particles.length > 600) particles.splice(0, particles.length - 600);
}
function spawnDmgNum(x, y, text, color) { damageNumbers.push({ x, y: y - 10, text: String(text), color, life: 0.9, size: 14 }); }

// ─── HUD ──────────────────────────────────────────────────────────────────────
function updateHUD() {
  if (!localPlayer) return;
  const maxHp = playerMaxHp(), hp = clamp(localPlayer.health, 0, maxHp), hpPct = (hp / maxHp) * 100;
  healthBar.style.width = hpPct + '%'; healthText.textContent = Math.round(hp);
  if (hpPct > 60) { healthBar.style.background = 'linear-gradient(90deg, #22c55e, #4ade80)'; healthText.style.color = '#4ade80'; }
  else if (hpPct > 30) { healthBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)'; healthText.style.color = '#fbbf24'; }
  else { healthBar.style.background = 'linear-gradient(90deg, #dc2626, #f87171)'; healthText.style.color = '#f87171'; }
  killsDisplay.textContent  = 'Kills: '  + (localPlayer.kills  || 0);
  deathsDisplay.textContent = 'Deaths: ' + (localPlayer.deaths || 0);
  scoreDisplay.textContent  = 'Score: '  + (localPlayer.score  || 0);
  if (killstreakDisplay) killstreakDisplay.textContent = 'Streak: ' + (localPlayer.killstreak || 0);
  const curLvl = Math.floor(Math.sqrt((xp || 0) / 100));
  const lvlXP  = curLvl * curLvl * 100, nextXP = (curLvl + 1) * (curLvl + 1) * 100;
  if (xpBarFill) xpBarFill.style.width = clamp(((xp - lvlXP) / (nextXP - lvlXP)) * 100, 0, 100) + '%';
  if (xpText)    xpText.textContent = 'XP ' + xp + ' / ' + nextXP;
  if (levelBadge) {
    levelBadge.textContent = 'Lv.' + curLvl;
    levelBadge.style.color = curLvl >= 10 ? '#facc15' : curLvl >= 5 ? '#a78bfa' : '#38bdf8';
  }
  if (waveDisplay) {
    if (currentMode !== 'survival') {
      waveDisplay.textContent = currentMode === 'tdm' ? 'Team Deathmatch' : 'Deathmatch';
      waveDisplay.style.color = '#38bdf8';
    } else if (waveStateStr === 'active') {
      waveDisplay.textContent = 'Wave ' + waveNumber + ' [' + waveEnemiesLeft + ']'; waveDisplay.style.color = '#f87171';
    } else {
      waveDisplay.textContent = 'Wave ' + (waveNumber + 1) + ' in ' + waveCountdown + 's'; waveDisplay.style.color = '#fbbf24';
    }
  }
  if (coinsDisplay) coinsDisplay.textContent = 'Coins: ' + coins;
  if (weaponDisplay) {
    const wpn = playerWeapons[currentWeapon];
    const ammoStr = (wpn && !WEAPON_AMMO_INF[currentWeapon]) ? ' [' + Math.max(0, wpn.ammoInClip || 0) + '/' + Math.max(0, wpn.ammo || 0) + ']' : ' [INF]';
    weaponDisplay.textContent = (WEAPON_NAMES[currentWeapon] || currentWeapon) + ammoStr;
    weaponDisplay.style.color = WEAPON_COLORS[currentWeapon] || '#fff';
    if (ammoDisplay) ammoDisplay.textContent = WEAPON_AMMO_INF[currentWeapon] ? 'Ammo: ∞' : 'Ammo: ' + Math.max(0, wpn.ammoInClip || 0) + ' / ' + Math.max(0, wpn.ammo || 0);
  }
  if (armorDisplay) armorDisplay.textContent = 'Armor: ' + Math.max(0, Math.round(localPlayer.armor || 0));
  if (reloadIndicator && reloadBarFill && reloadText) {
    if (reloadEndAt > Date.now()) {
      const rem = Math.max(0, reloadEndAt - Date.now());
      const progress = 100 - (rem / Math.max(1, reloadDuration)) * 100;
      reloadIndicator.style.display = 'block';
      reloadBarFill.style.width = clamp(progress, 0, 100) + '%';
      reloadText.textContent = 'Reloading... ' + (rem / 1000).toFixed(1) + 's';
    } else {
      reloadIndicator.style.display = 'none';
      reloadBarFill.style.width = '0%';
    }
  }
  if (powerupsDisplay) {
    activePowerUps = activePowerUps.filter(p => p.expiresAt > Date.now());
    powerupsDisplay.innerHTML = '';
    for (const p of activePowerUps) {
      const label = POWERUP_LABELS[p.type] || 'power-up';
      const secs = Math.ceil((p.expiresAt - Date.now()) / 1000);
      const span = document.createElement('span'); span.className = 'powerup-icon';
      span.textContent = label + ' ' + secs + 's'; powerupsDisplay.appendChild(span);
    }
  }
  if (skillsBtn) skillsBtn.textContent = pendingSkillPoints > 0 ? ('Skills (' + pendingSkillPoints + ')') : 'Skills [K]';
  if (leaderboardMini) {
    const top = [...players.values()].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3);
    leaderboardMini.innerHTML = '<div class="lb-title">Top-3</div>' +
      top.map((p, i) => '<div class="lb-entry">' + (i + 1) + '. ' + esc(p.name || 'Player') + ' • ' + (p.score || 0) + '</div>').join('');
  }
  renderScoreboard();
}

// ─── Announcements ────────────────────────────────────────────────────────────
function showWaveAnnouncement(wave, isBoss, count) {
  if (!waveAnnouncement) return;
  const title = waveAnnouncement.querySelector('.wave-title');
  const sub   = waveAnnouncement.querySelector('.wave-sub');
  if (title) title.textContent = isBoss ? ('WAVE ' + wave + ' - BOSS!') : ('WAVE ' + wave);
  if (sub)   sub.textContent   = isBoss ? 'Boss incoming!' : 'Enemies: ' + (count || '?');
  waveAnnouncement.style.display = 'block';
  setTimeout(() => { if (waveAnnouncement) waveAnnouncement.style.display = 'none'; }, 3500);
}
function showWaveComplete(wave, bonusCoins, bonusXP) {
  if (!waveAnnouncement) return;
  const title = waveAnnouncement.querySelector('.wave-title');
  const sub   = waveAnnouncement.querySelector('.wave-sub');
  if (title) title.textContent = 'WAVE ' + wave + ' COMPLETE!';
  if (sub)   sub.textContent   = '+' + bonusCoins + ' coins   +' + bonusXP + ' XP';
  waveAnnouncement.style.display = 'block';
  setTimeout(() => { if (waveAnnouncement) waveAnnouncement.style.display = 'none'; }, 4000);
}

// ─── Level Up ─────────────────────────────────────────────────────────────────
function checkLevelUp() { const n = Math.floor(Math.sqrt(xp / 100)); if (n > level) level = n; }
function showLevelUp(lvl) {
  if (!levelupPopup) return;
  isLevelUpOpen = true;
  clearAllKeys();
  pendingSkillPoints++;
  const title = levelupPopup.querySelector('.levelup-title');
  if (title) title.textContent = 'LEVEL UP! Lv.' + lvl;
  renderSkillOptions();
  levelupPopup.style.display = 'flex';
}
function renderSkillOptions() {
  const container = document.getElementById('skill-options');
  if (!container) return;
  container.innerHTML = '';
  const available = Object.entries(SKILL_DEFS).filter(([k, d]) => (skills[k] || 0) < d.max);
  const opts = available.sort(() => Math.random() - 0.5).slice(0, 3);
  if (opts.length === 0) {
    const p = document.createElement('p');
    p.style.cssText = 'color:#94a3b8;text-align:center;padding:12px';
    p.textContent = 'All skills maxed!';
    container.appendChild(p);
    setTimeout(() => { isLevelUpOpen = false; if (levelupPopup) levelupPopup.style.display = 'none'; }, 2000);
    return;
  }
  for (const [k, d] of opts) {
    const btn = document.createElement('button');
    btn.className = 'skill-choice-btn';
    const nameDiv = document.createElement('div'); nameDiv.className = 'skill-name'; nameDiv.textContent = d.name;
    const lvlDiv  = document.createElement('div'); lvlDiv.className  = 'skill-level'; lvlDiv.textContent = 'Level ' + ((skills[k] || 0) + 1) + '/' + d.max;
    btn.appendChild(nameDiv); btn.appendChild(lvlDiv);
    const skillKey = k;
    btn.addEventListener('click', () => pickSkill(skillKey));
    container.appendChild(btn);
  }
}
function pickSkill(key) {
  skills[key] = Math.min(SKILL_DEFS[key].max, (skills[key] || 0) + 1);
  pendingSkillPoints = Math.max(0, pendingSkillPoints - 1);
  persistProgress();
  isLevelUpOpen = false;
  if (levelupPopup) levelupPopup.style.display = 'none';
  showNotification(SKILL_DEFS[key].name + ' upgraded!');
}

// ─── Skills Panel ─────────────────────────────────────────────────────────────
function toggleSkillsPanel() {
  if (!skillsPanel) return;
  const visible = skillsPanel.style.display !== 'none';
  skillsPanel.style.display = visible ? 'none' : 'block';
  if (!visible) renderSkillsPanel();
}
function renderSkillsPanel() {
  const container = document.getElementById('skills-tree');
  if (!container) return;
  container.innerHTML = '';
  const branches = { attack: 'Attack', defense: 'Defense', mobility: 'Mobility', utility: 'Utility' };
  for (const [branch, label] of Object.entries(branches)) {
    const bs = Object.entries(SKILL_DEFS).filter(([, d]) => d.branch === branch);
    const branchDiv = document.createElement('div'); branchDiv.className = 'skill-branch';
    const heading = document.createElement('h3'); heading.textContent = label; branchDiv.appendChild(heading);
    for (const [k, d] of bs) {
      const cur = skills[k] || 0, maxed = cur >= d.max, canUp = !maxed && pendingSkillPoints > 0;
      const row = document.createElement('div'); row.className = 'skill-row';
      const nameSpan = document.createElement('span'); nameSpan.className = 'skill-label'; nameSpan.textContent = d.name;
      const ptsSpan  = document.createElement('span'); ptsSpan.className = 'skill-pts';  ptsSpan.textContent = cur + '/' + d.max;
      row.appendChild(nameSpan); row.appendChild(ptsSpan);
      if (canUp) {
        const btn = document.createElement('button'); btn.className = 'skill-up-btn'; btn.textContent = '+';
        const skillKey = k;
        btn.addEventListener('click', () => { pickSkill(skillKey); renderSkillsPanel(); });
        row.appendChild(btn);
      }
      branchDiv.appendChild(row);
    }
    container.appendChild(branchDiv);
  }
  const info = document.createElement('p'); info.className = 'skill-pts-info';
  const strong = document.createElement('strong'); strong.textContent = String(pendingSkillPoints);
  info.textContent = 'Points available: '; info.appendChild(strong);
  container.appendChild(info);
}
function showNotification(text) {
  const el = document.createElement('div'); el.className = 'game-notification'; el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3000);
}

// ─── Kill Feed ────────────────────────────────────────────────────────────────
function addKillFeed(killer, victim) {
  killFeed.push({ killer, victim, fadeTime: Date.now() + 6000 });
  if (killFeed.length > 5) killFeed.shift();
  // Combo tracking: increment combo when local player gets a kill
  if (killer === localPlayerName && victim !== localPlayerName) {
    comboCount++;
    comboTimer = 0;
    if (comboCount >= 2) updateComboDisplay();
  }
  renderKillFeed();
}

function updateComboDisplay() {
  if (!comboDisplay) return;
  if (comboCount < 2) {
    comboDisplay.style.display = 'none';
    return;
  }
  const colors = ['#fbbf24','#f97316','#ef4444','#c084fc','#a78bfa'];
  const color = colors[Math.min(comboCount - 2, colors.length - 1)];
  const labels = ['DOUBLE KILL!','TRIPLE KILL!','QUAD KILL!','PENTA KILL!','RAMPAGE!'];
  const label = labels[Math.min(comboCount - 2, labels.length - 1)] || 'KILLING SPREE!';
  comboDisplay.innerHTML = `<div class="combo-text" style="color:${color}">${label}</div><div class="combo-sub">x${comboCount} kills in a row!</div>`;
  comboDisplay.style.display = 'block';
  comboDisplay.style.animation = 'none';
  // Restart animation
  void comboDisplay.offsetWidth;
  comboDisplay.style.animation = '';
  screenShake = Math.max(screenShake, Math.min(comboCount * 2, 8));
  setTimeout(() => { if (comboCount < 2 && comboDisplay) comboDisplay.style.display = 'none'; }, 3000);
}
function renderKillFeed() {
  const now = Date.now();
  killFeed = killFeed.filter(k => k.fadeTime > now);
  killFeedEl.innerHTML = killFeed.map(k =>
    '<div class="kill-entry"><span style="color:#f87171">' + esc(k.killer) + '</span> x <span style="color:#94a3b8">' + esc(k.victim) + '</span></div>'
  ).join('');
}
function esc(str) { const d = document.createElement('div'); d.textContent = String(str); return d.innerHTML; }
function persistProgress() {
  writeSave({
    xp, coins, skills: { ...skills }, skillPoints: pendingSkillPoints,
    mode: matchSettings.mode,
    difficulty: matchSettings.difficulty,
    friendlyFire: matchSettings.friendlyFire,
    bots: matchSettings.bots,
    fragLimit: matchSettings.fragLimit,
    roundTimeMin: matchSettings.roundTimeMin,
    shopOwned: { ...shopOwned }
  });
}

// ─── Stars (background visual) ────────────────────────────────────────────────
const STARS = (() => {
  const arr = [];
  for (let i = 0; i < 350; i++) {
    arr.push({
      x: Math.random() * 2400, y: Math.random() * 2400,
      r: 0.5 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.7,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
  return arr;
})();
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sx = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
  const sy = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
  ctx.save();
  ctx.translate(-camera.x + sx, -camera.y + sy);
  drawWorld(); drawDrops(); drawEnemyBullets(); drawBullets(); drawParticles(); drawEnemies(); drawPlayers(); drawDamageNumbers();
  ctx.restore();
  drawMinimap();
}
function drawWorld() {
  // Rich dark gradient background
  const bgGradient = ctx.createRadialGradient(worldW / 2, worldH / 2, 0, worldW / 2, worldH / 2, worldW * 0.85);
  bgGradient.addColorStop(0, '#1a1a3e');
  bgGradient.addColorStop(0.4, '#0f0f2a');
  bgGradient.addColorStop(1, '#050510');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, worldW, worldH);

  // Nebula-like color splashes (static)
  const nebulaColors = [
    { x: 600, y: 500, r: 400, c: 'rgba(56,189,248,0.04)' },
    { x: 1800, y: 900, r: 500, c: 'rgba(124,58,237,0.05)' },
    { x: 1000, y: 1800, r: 450, c: 'rgba(239,68,68,0.04)' },
    { x: 2100, y: 2000, r: 380, c: 'rgba(34,197,94,0.04)' },
  ];
  for (const n of nebulaColors) {
    const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    ng.addColorStop(0, n.c);
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }

  // Twinkling stars
  const t = Date.now() * 0.001;
  for (const s of STARS) {
    const alpha = s.alpha * (0.6 + 0.4 * Math.sin(t * 1.5 + s.twinkle));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  
  // Subtle grid
  ctx.strokeStyle = 'rgba(56,189,248,0.06)'; 
  ctx.lineWidth = 1;
  const gsx = Math.floor(camera.x / 60) * 60, gsy = Math.floor(camera.y / 60) * 60;
  const gex = camera.x + canvas.width, gey = camera.y + canvas.height;
  for (let x = gsx; x <= gex; x += 60) { 
    ctx.beginPath(); 
    ctx.moveTo(x, Math.max(0, camera.y)); 
    ctx.lineTo(x, Math.min(worldH, gey)); 
    ctx.stroke(); 
  }
  for (let y = gsy; y <= gey; y += 60) { 
    ctx.beginPath(); 
    ctx.moveTo(Math.max(0, camera.x), y); 
    ctx.lineTo(Math.min(worldW, gex), y); 
    ctx.stroke(); 
  }
  
  // Glowing border
  ctx.strokeStyle = '#ef4444'; 
  ctx.lineWidth = 6; 
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 20;
  ctx.strokeRect(3, 3, worldW - 6, worldH - 6);
  ctx.shadowBlur = 0;
  
  // Gradient danger edges (all 4 sides)
  const edgeFade = 40;
  const grds = [
    { g: ctx.createLinearGradient(0,0,edgeFade,0), r: [0,0,edgeFade,worldH] },
    { g: ctx.createLinearGradient(worldW,0,worldW-edgeFade,0), r: [worldW-edgeFade,0,edgeFade,worldH] },
    { g: ctx.createLinearGradient(0,0,0,edgeFade), r: [0,0,worldW,edgeFade] },
    { g: ctx.createLinearGradient(0,worldH,0,worldH-edgeFade), r: [0,worldH-edgeFade,worldW,edgeFade] },
  ];
  for (const { g, r } of grds) {
    g.addColorStop(0, 'rgba(239,68,68,0.25)'); 
    g.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.fillStyle = g; 
    ctx.fillRect(...r);
  }
}
function drawDrops() {
  for (const d of drops) {
    const color = DROP_COLORS[d.type] || '#fff', icon = DROP_ICONS[d.type] || '?';
    const pulse = 0.8 + 0.2 * Math.sin(Date.now() * 0.005 + d.x * 0.1);
    const time = Date.now() * 0.001;
    const float = Math.sin(time * 2 + d.x * 0.1) * 3; // Floating animation
    
    // Enhanced glow
    ctx.shadowColor = color; 
    ctx.shadowBlur = 20 * pulse;
    ctx.beginPath(); 
    ctx.arc(d.x, d.y + float, 12, 0, Math.PI * 2);
    
    // Gradient fill
    const dropGrad = ctx.createRadialGradient(d.x, d.y + float, 0, d.x, d.y + float, 12);
    dropGrad.addColorStop(0, color);
    dropGrad.addColorStop(1, color + '60');
    ctx.fillStyle = dropGrad;
    ctx.fill(); 
    
    ctx.strokeStyle = color; 
    ctx.lineWidth = 2.5; 
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Icon
    ctx.fillStyle = '#fff'; 
    ctx.font = 'bold 14px Arial'; 
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(icon, d.x, d.y + float); 
    ctx.shadowBlur = 0;
    ctx.textBaseline = 'alphabetic';
    
    if (d.type === 'coins' && d.amount) { 
      ctx.fillStyle = '#fbbf24'; 
      ctx.font = 'bold 10px Arial'; 
      ctx.fillText(d.amount, d.x, d.y + float + 20); 
    }
  }
  ctx.shadowBlur = 0; ctx.textAlign = 'left';
}
function drawEnemyBullets() {
  for (const b of enemyBullets) { 
    // Enhanced bullet with trail
    ctx.shadowColor = '#f87171'; 
    ctx.shadowBlur = 15; 
    ctx.beginPath(); 
    ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); 
    
    const bulletGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 6);
    bulletGrad.addColorStop(0, '#fecaca');
    bulletGrad.addColorStop(0.5, '#f87171');
    bulletGrad.addColorStop(1, '#dc2626');
    ctx.fillStyle = bulletGrad;
    ctx.fill(); 
  }
  ctx.shadowBlur = 0;
}
function drawEnemies() {
  for (const e of enemies) {
    const col = ENEMY_COLORS[e.type] || { body: '#888', outline: '#555' };
    const r = ENEMY_RADIUS_CLIENT[e.type] || 20, isBoss = e.type === 'boss';
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(3, 5, r * 0.9, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    if (isBoss) { ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 22; }
    ctx.beginPath();
    if (e.type === 'tank') { ctx.rect(-r, -r, r * 2, r * 2); }
    else if (e.type === 'runner') { ctx.moveTo(0, -r); ctx.lineTo(r * 0.9, r * 0.8); ctx.lineTo(-r * 0.9, r * 0.8); ctx.closePath(); }
    else if (e.type === 'boss') {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2, sr = i % 2 === 0 ? r : r * 0.55;
        if (i === 0) ctx.moveTo(Math.cos(a) * sr, Math.sin(a) * sr);
        else ctx.lineTo(Math.cos(a) * sr, Math.sin(a) * sr);
      }
      ctx.closePath();
    } else { ctx.arc(0, 0, r, 0, Math.PI * 2); }
    ctx.fillStyle = col.body; ctx.fill(); ctx.strokeStyle = col.outline; ctx.lineWidth = isBoss ? 3 : 2; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.rotate(e.angle);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.55, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r * 0.67, 0, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const hpPct = e.hp / e.maxHp, barW = isBoss ? 80 : 40;
    ctx.fillStyle = '#111'; ctx.fillRect(e.x - barW / 2, e.y - r - 11, barW, 5);
    ctx.fillStyle = hpPct > 0.6 ? '#22c55e' : hpPct > 0.3 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(e.x - barW / 2, e.y - r - 11, barW * hpPct, 5);
    if (isBoss) {
      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 13px "Courier New"'; ctx.textAlign = 'center';
      ctx.fillText('BOSS ' + e.hp + '/' + e.maxHp, e.x, e.y - r - 19);
    } else {
      ctx.fillStyle = col.body; ctx.font = '10px "Courier New"'; ctx.textAlign = 'center';
      ctx.fillText(e.type, e.x, e.y + r + 13);
    }
  }
  ctx.textAlign = 'left';
}
function drawPlayers() {
  for (const [id, player] of players) {
    if (player.dead) continue;
    const px = (id === localId && localPlayer) ? localPlayer.x : player.x;
    const py = (id === localId && localPlayer) ? localPlayer.y : player.y;
    const pa = (id === localId && localPlayer) ? localPlayer.angle : player.angle;
    const isInvincible = player.activePowerUps && player.activePowerUps.some(p => p.type === 'invincibility');
    const isLocalPlayer = id === localId;
    
    // Enhanced shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; 
    ctx.beginPath(); 
    ctx.ellipse(px+3, py+6, PLAYER_RADIUS*0.95, PLAYER_RADIUS*0.55, 0, 0, Math.PI*2); 
    ctx.fill();
    
    // Invincibility glow
    if (isInvincible) { 
      ctx.shadowColor = '#60a5fa'; 
      ctx.shadowBlur = 25; 
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, PLAYER_RADIUS + 4, 0, Math.PI*2);
      ctx.stroke();
    }
    
    // Weapon (gun)
    ctx.save(); 
    ctx.translate(px, py); 
    ctx.rotate(pa);
    ctx.fillStyle = '#4b5563'; 
    ctx.fillRect(PLAYER_RADIUS-4, -4, 20, 8);
    ctx.fillStyle = '#6b7280'; 
    ctx.fillRect(PLAYER_RADIUS+12, -2, 6, 4);
    ctx.restore();
    
    // Player body with gradient
    ctx.beginPath(); 
    ctx.arc(px, py, PLAYER_RADIUS, 0, Math.PI*2);
    
    const playerGrad = ctx.createRadialGradient(px - 5, py - 5, 0, px, py, PLAYER_RADIUS);
    const playerColor = player.color || '#3b82f6';
    playerGrad.addColorStop(0, lightenColor(playerColor, 30));
    playerGrad.addColorStop(1, playerColor);
    ctx.fillStyle = playerGrad;
    ctx.fill();
    
    // Player outline
    ctx.strokeStyle = isLocalPlayer ? '#fbbf24' : 'rgba(255,255,255,0.4)'; 
    ctx.lineWidth = isLocalPlayer ? 3 : 2; 
    ctx.shadowColor = isLocalPlayer ? '#fbbf24' : 'transparent';
    ctx.shadowBlur = isLocalPlayer ? 12 : 0;
    ctx.stroke();
    
    // Highlight for local player
    if (isLocalPlayer) { 
      ctx.beginPath(); 
      ctx.arc(px, py, PLAYER_RADIUS-5, 0, Math.PI*2); 
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; 
      ctx.fill(); 
    }
    ctx.shadowBlur = 0;
    
    // Player name with better visibility
    ctx.fillStyle = '#000'; 
    ctx.font = 'bold 12px Arial'; 
    ctx.textAlign = 'center';
    ctx.fillText(player.name || 'Player', px + 1, py - PLAYER_RADIUS - 13);
    ctx.fillStyle = isLocalPlayer ? '#fbbf24' : '#e0f2fe'; 
    ctx.font = 'bold 12px Arial'; 
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText(player.name || 'Player', px, py - PLAYER_RADIUS - 14);
    ctx.shadowBlur = 0;
    
    // Health bar with border
    const maxHp = Math.max(100, player.maxHealth || 100);
    const hp = clamp((player.health || 0) / maxHp, 0, 1);
    ctx.fillStyle = '#1e293b'; 
    ctx.fillRect(px - 24, py - PLAYER_RADIUS - 9, 48, 7);
    
    const hpGrad = ctx.createLinearGradient(px - 22, 0, px + 22, 0);
    if (hp > 0.5) {
      hpGrad.addColorStop(0, '#22c55e');
      hpGrad.addColorStop(1, '#4ade80');
    } else if (hp > 0.25) {
      hpGrad.addColorStop(0, '#f59e0b');
      hpGrad.addColorStop(1, '#fbbf24');
    } else {
      hpGrad.addColorStop(0, '#dc2626');
      hpGrad.addColorStop(1, '#ef4444');
    }
    ctx.fillStyle = hpGrad;
    ctx.fillRect(px - 22, py - PLAYER_RADIUS - 8, 44 * hp, 5);
    
    // Armor bar
    const armor = Math.max(0, player.armor || 0);
    if (armor > 0) {
      const ap = clamp(armor / 100, 0, 1);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - 22, py - PLAYER_RADIUS - 2, 44, 5);
      const armorGrad = ctx.createLinearGradient(px - 22, 0, px + 22, 0);
      armorGrad.addColorStop(0, '#3b82f6');
      armorGrad.addColorStop(1, '#60a5fa');
      ctx.fillStyle = armorGrad;
      ctx.fillRect(px - 22, py - PLAYER_RADIUS - 2, 44 * ap, 4);
    }
    
    // Level badge
    if ((player.level || 0) > 0) {
      const lvl = player.level || 0;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px - 18, py + PLAYER_RADIUS + 8, 36, 14);
      ctx.fillStyle = lvl >= 10 ? '#fbbf24' : '#a78bfa'; 
      ctx.font = 'bold 10px Arial'; 
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 2;
      ctx.fillText('Lv.' + lvl, px, py + PLAYER_RADIUS + 18);
      ctx.shadowBlur = 0;
    }
  }
  ctx.textAlign = 'left';
}

// Helper function to lighten colors
function lightenColor(color, percent) {
  const num = parseInt(color.replace('#',''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
function drawBullets() {
  for (const b of bullets) { ctx.shadowColor = '#fde047'; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI*2); ctx.fillStyle = '#fde047'; ctx.fill(); }
  ctx.shadowBlur = 0;
}
function drawParticles() {
  for (const p of particles) { const alpha = clamp(p.life / 0.3, 0, 1); ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size*alpha, 0, Math.PI*2); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function drawDamageNumbers() {
  for (const dn of damageNumbers) {
    ctx.globalAlpha = clamp(dn.life / 0.5, 0, 1); ctx.fillStyle = dn.color;
    ctx.font = 'bold ' + dn.size + 'px "Courier New"'; ctx.textAlign = 'center'; ctx.fillText(dn.text, dn.x, dn.y);
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
}
function drawMinimap() {
  const mw = 160, mh = 160;
  minimapCtx.clearRect(0, 0, mw, mh); minimapCtx.fillStyle = 'rgba(10,13,20,0.85)'; minimapCtx.fillRect(0, 0, mw, mh);
  minimapCtx.strokeStyle = '#334155'; minimapCtx.strokeRect(0, 0, mw, mh);
  const scx = mw / worldW, scy = mh / worldH;
  for (const e of enemies) {
    minimapCtx.beginPath(); minimapCtx.arc(e.x*scx, e.y*scy, e.type==='boss'?4:2, 0, Math.PI*2);
    minimapCtx.fillStyle = (ENEMY_COLORS[e.type]||{}).body||'#888'; minimapCtx.fill();
  }
  for (const d of drops) {
    minimapCtx.beginPath(); minimapCtx.arc(d.x*scx, d.y*scy, 2, 0, Math.PI*2);
    minimapCtx.fillStyle = DROP_COLORS[d.type]||'#fff'; minimapCtx.fill();
  }
  for (const [id, player] of players) {
    if (player.dead) continue;
    minimapCtx.beginPath(); minimapCtx.arc(player.x*scx, player.y*scy, id===localId?4:2.5, 0, Math.PI*2);
    minimapCtx.fillStyle = id===localId?'#fff':(player.color||'#3b82f6'); minimapCtx.fill();
  }
  if (localPlayer) {
    minimapCtx.strokeStyle = 'rgba(255,255,255,0.3)'; minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(camera.x*scx, camera.y*scy, canvas.width*scx, canvas.height*scy);
  }
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt); render(); renderKillFeed();
  requestAnimationFrame(loop);
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

// ─── Init ─────────────────────────────────────────────────────────────────────
syncMatchSettingsFromUI();
renderShop();
connectWS();
