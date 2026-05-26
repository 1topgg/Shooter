const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const players = new Map();
const bullets = new Map();
let bulletIdCounter = 0;

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 800;
const BULLET_SPEED = 10;
const BULLET_LIFETIME = 2000; // 2 seconds
const MAX_MESSAGES_PER_SECOND = 120;

// Broadcast to all connected clients
function broadcast(message) {
    wss.clients.forEach(client => {
        safeSend(client, message);
    });
}

function safeSend(ws, message) {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
        ws.send(JSON.stringify(message));
    } catch (error) {
        console.error('WebSocket send error:', error);
    }
}

function isValidNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(value);
}

// Generate random spawn position
function getRandomSpawn() {
    return {
        x: Math.random() * (GAME_WIDTH - 100) + 50,
        y: Math.random() * (GAME_HEIGHT - 100) + 50
    };
}

// Check bullet collisions
function checkBulletCollisions() {
    bullets.forEach((bullet, bulletId) => {
        players.forEach((player, playerId) => {
            if (bullet.playerId === playerId) return; // Can't hit yourself
            
            const dx = player.x - bullet.x;
            const dy = player.y - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 20) { // Hit radius
                // Player hit!
                player.health -= 25;
                bullets.delete(bulletId);
                
                if (player.health <= 0) {
                    // Player died
                    player.deaths++;
                    player.health = 100;
                    const spawn = getRandomSpawn();
                    player.x = spawn.x;
                    player.y = spawn.y;
                    
                    // Give kill to shooter
                    const shooter = players.get(bullet.playerId);
                    if (shooter) {
                        shooter.kills++;
                    }
                    
                    broadcast({
                        type: 'playerDied',
                        playerId: playerId,
                        killerId: bullet.playerId
                    });
                }
                
                broadcast({
                    type: 'bulletHit',
                    bulletId: bulletId,
                    playerId: playerId,
                    health: player.health
                });
            }
        });
    });
}

// Game loop
setInterval(() => {
    // Update bullets
    const now = Date.now();
    bullets.forEach((bullet, id) => {
        bullet.x += Math.cos(bullet.angle) * BULLET_SPEED;
        bullet.y += Math.sin(bullet.angle) * BULLET_SPEED;
        
        // Remove bullets that are out of bounds or too old
        if (bullet.x < 0 || bullet.x > GAME_WIDTH || 
            bullet.y < 0 || bullet.y > GAME_HEIGHT ||
            now - bullet.createdAt > BULLET_LIFETIME) {
            bullets.delete(id);
        }
    });
    
    checkBulletCollisions();
    
    // Broadcast game state
    broadcast({
        type: 'gameState',
        players: Array.from(players.values()),
        bullets: Array.from(bullets.values())
    });
}, 1000 / 30); // 30 FPS

wss.on('connection', (ws, req) => {
    try {
        const playerId = Math.random().toString(36).substring(2, 11);
        const spawn = getRandomSpawn();
        const remoteAddress = req?.socket?.remoteAddress || 'unknown';

        const player = {
            id: playerId,
            x: spawn.x,
            y: spawn.y,
            angle: 0,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            name: `Player${Math.floor(Math.random() * 1000)}`,
            health: 100,
            kills: 0,
            deaths: 0,
            lastProcessedInput: 0
        };

        ws.rateLimit = { count: 0, windowStart: Date.now() };
        players.set(playerId, player);
        console.log(`🔌 Player connected: ${playerId} (${remoteAddress})`);

        // Send player their ID
        safeSend(ws, {
            type: 'init',
            playerId: playerId,
            player: player
        });

        // Notify others
        broadcast({
            type: 'playerJoined',
            player: player
        });

        ws.on('message', (message, isBinary) => {
            if (isBinary) return;
            try {
                const now = Date.now();
                if (now - ws.rateLimit.windowStart >= 1000) {
                    ws.rateLimit.count = 0;
                    ws.rateLimit.windowStart = now;
                }
                ws.rateLimit.count += 1;
                if (ws.rateLimit.count > MAX_MESSAGES_PER_SECOND) {
                    console.warn(`⚠️ Rate limit exceeded by player ${playerId}`);
                    return;
                }

                const rawMessage = typeof message === 'string' ? message : message.toString();
                if (rawMessage.length > 10000) return;
                const data = JSON.parse(rawMessage);

                switch(data.type) {
                    case 'move':
                        if (players.has(playerId) &&
                            isValidNumber(data.x) &&
                            isValidNumber(data.y) &&
                            isValidNumber(data.angle)) {
                            const currentPlayer = players.get(playerId);
                            currentPlayer.x = Math.max(15, Math.min(GAME_WIDTH - 15, data.x));
                            currentPlayer.y = Math.max(15, Math.min(GAME_HEIGHT - 15, data.y));
                            currentPlayer.angle = data.angle;
                            if (Number.isInteger(data.seq) && data.seq >= 0) {
                                currentPlayer.lastProcessedInput = data.seq;
                            }
                        }
                        break;

                    case 'shoot':
                        if (players.has(playerId)) {
                            const currentPlayer = players.get(playerId);
                            if (isValidNumber(data.angle)) {
                                currentPlayer.angle = data.angle;
                            }
                            const bulletId = `bullet_${bulletIdCounter++}`;

                            bullets.set(bulletId, {
                                id: bulletId,
                                x: currentPlayer.x + Math.cos(currentPlayer.angle) * 25,
                                y: currentPlayer.y + Math.sin(currentPlayer.angle) * 25,
                                angle: currentPlayer.angle,
                                playerId: playerId,
                                createdAt: Date.now()
                            });

                            broadcast({
                                type: 'bulletFired',
                                playerId: playerId
                            });
                        }
                        break;
                }
            } catch (e) {
                console.error(`Error handling message from ${playerId}:`, e);
            }
        });

        ws.on('error', (error) => {
            console.error(`❌ WebSocket error for player ${playerId}:`, error);
        });

        ws.on('close', () => {
            players.delete(playerId);
            console.log(`🔌 Player disconnected: ${playerId}`);
            broadcast({
                type: 'playerLeft',
                playerId: playerId
            });
        });
    } catch (error) {
        console.error('Fatal WebSocket connection setup error:', error);
        try {
            ws.close();
        } catch (closeError) {
            console.error('Error closing WebSocket after setup failure:', closeError);
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 2D Shooter server running on port ${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} to play`);
});
