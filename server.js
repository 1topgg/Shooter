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

// Broadcast to all connected clients
function broadcast(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
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

wss.on('connection', (ws) => {
    const playerId = Math.random().toString(36).substr(2, 9);
    const spawn = getRandomSpawn();
    
    const player = {
        id: playerId,
        x: spawn.x,
        y: spawn.y,
        angle: 0,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        name: `Player${Math.floor(Math.random() * 1000)}`,
        health: 100,
        kills: 0,
        deaths: 0
    };
    
    players.set(playerId, player);
    
    // Send player their ID
    ws.send(JSON.stringify({
        type: 'init',
        playerId: playerId,
        player: player
    }));
    
    // Notify others
    broadcast({
        type: 'playerJoined',
        player: player
    });
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch(data.type) {
                case 'move':
                    if (players.has(playerId)) {
                        const player = players.get(playerId);
                        player.x = Math.max(15, Math.min(GAME_WIDTH - 15, data.x));
                        player.y = Math.max(15, Math.min(GAME_HEIGHT - 15, data.y));
                        player.angle = data.angle;
                    }
                    break;
                    
                case 'shoot':
                    if (players.has(playerId)) {
                        const player = players.get(playerId);
                        const bulletId = `bullet_${bulletIdCounter++}`;
                        
                        bullets.set(bulletId, {
                            id: bulletId,
                            x: player.x + Math.cos(player.angle) * 25,
                            y: player.y + Math.sin(player.angle) * 25,
                            angle: player.angle,
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
            console.error('Error parsing message:', e);
        }
    });
    
    ws.on('close', () => {
        players.delete(playerId);
        broadcast({
            type: 'playerLeft',
            playerId: playerId
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 2D Shooter server running on port ${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} to play`);
});
