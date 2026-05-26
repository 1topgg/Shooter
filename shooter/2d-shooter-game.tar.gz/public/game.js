const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const healthEl = document.getElementById('health');
const scoreEl = document.getElementById('score');
const leaderboardEl = document.getElementById('leaderboardContent');
const statusEl = document.getElementById('connectionStatus');

// Game state
let ws;
let myPlayerId = null;
let myPlayer = null;
let players = new Map();
let bullets = [];
let keys = {};
let mouseX = 0;
let mouseY = 0;
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Mobile controls
let joystick = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    radius: 60
};

let fireButton = {
    active: false,
    x: 0,
    y: 0,
    radius: 50
};

// Responsive canvas
function resizeCanvas() {
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 40;
    const aspectRatio = 1200 / 800;
    
    if (maxWidth / maxHeight > aspectRatio) {
        canvas.style.height = maxHeight + 'px';
        canvas.style.width = (maxHeight * aspectRatio) + 'px';
    } else {
        canvas.style.width = maxWidth + 'px';
        canvas.style.height = (maxWidth / aspectRatio) + 'px';
    }
}

if (isMobile) {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    document.getElementById('controls').style.display = 'none';
}

// WebSocket connection
function connect() {
    statusEl.classList.add('show');
    statusEl.innerHTML = '<span class="dot-loader">Підключення до сервера</span>';
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => {
        console.log('Connected to server');
        statusEl.classList.remove('show');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };
    
    ws.onclose = () => {
        statusEl.classList.add('show');
        statusEl.innerHTML = '❌ Втрачено зв\'язок. Перезавантажте сторінку';
        console.log('Disconnected from server');
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        statusEl.classList.add('show');
        statusEl.innerHTML = '❌ Помилка підключення';
    };
}

function handleMessage(data) {
    switch(data.type) {
        case 'init':
            myPlayerId = data.playerId;
            myPlayer = data.player;
            players.set(myPlayerId, myPlayer);
            break;
            
        case 'gameState':
            data.players.forEach(player => {
                players.set(player.id, player);
            });
            bullets = data.bullets;
            updateUI();
            updateLeaderboard();
            break;
            
        case 'playerJoined':
            players.set(data.player.id, data.player);
            break;
            
        case 'playerLeft':
            players.delete(data.playerId);
            break;
            
        case 'bulletHit':
            if (data.playerId === myPlayerId) {
                myPlayer.health = data.health;
                updateUI();
            }
            break;
            
        case 'playerDied':
            // Visual feedback could be added here
            break;
    }
}

function updateUI() {
    if (myPlayer) {
        healthEl.textContent = `Health: ${myPlayer.health}`;
        healthEl.className = myPlayer.health < 30 ? 'low' : '';
        scoreEl.textContent = `K: ${myPlayer.kills} / D: ${myPlayer.deaths}`;
    }
}

function updateLeaderboard() {
    const sortedPlayers = Array.from(players.values())
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 5);
    
    leaderboardEl.innerHTML = sortedPlayers.map((player, index) => {
        const isMe = player.id === myPlayerId;
        return `<div class="player-score" style="color: ${isMe ? '#00ff00' : 'white'}">
            ${index + 1}. ${player.name}: ${player.kills}
        </div>`;
    }).join('');
}

// Input handling - Desktop
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    if (isMobile) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
});

canvas.addEventListener('mousedown', (e) => {
    if (isMobile) return;
    if (e.button === 0) { // Left click
        shoot();
    }
});

// Input handling - Mobile
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    for (let touch of e.touches) {
        const touchX = (touch.clientX - rect.left) * scaleX;
        const touchY = (touch.clientY - rect.top) * scaleY;
        
        // Left side - joystick
        if (touchX < canvas.width / 2) {
            joystick.active = true;
            joystick.startX = touchX;
            joystick.startY = touchY;
            joystick.currentX = touchX;
            joystick.currentY = touchY;
        }
        // Right side - fire button
        else {
            fireButton.active = true;
            fireButton.x = touchX;
            fireButton.y = touchY;
            shoot();
        }
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    for (let touch of e.touches) {
        const touchX = (touch.clientX - rect.left) * scaleX;
        const touchY = (touch.clientY - rect.top) * scaleY;
        
        if (joystick.active && touchX < canvas.width / 2) {
            joystick.currentX = touchX;
            joystick.currentY = touchY;
        }
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (e.touches.length === 0) {
        joystick.active = false;
        fireButton.active = false;
    }
});

function shoot() {
    if (ws && ws.readyState === WebSocket.OPEN && myPlayer) {
        ws.send(JSON.stringify({
            type: 'shoot'
        }));
    }
}

// Game loop
function gameLoop() {
    if (!myPlayer) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Movement
    let moveX = 0;
    let moveY = 0;
    
    if (isMobile && joystick.active) {
        // Mobile joystick
        const dx = joystick.currentX - joystick.startX;
        const dy = joystick.currentY - joystick.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 10) {
            moveX = (dx / distance) * 5;
            moveY = (dy / distance) * 5;
        }
    } else {
        // Desktop keyboard
        if (keys['w'] || keys['ц']) moveY -= 5;
        if (keys['s'] || keys['і']) moveY += 5;
        if (keys['a'] || keys['ф']) moveX -= 5;
        if (keys['d'] || keys['в']) moveX += 5;
    }
    
    if (moveX !== 0 || moveY !== 0) {
        myPlayer.x += moveX;
        myPlayer.y += moveY;
        
        // Calculate angle based on movement or mouse
        if (isMobile && joystick.active) {
            myPlayer.angle = Math.atan2(
                joystick.currentY - joystick.startY,
                joystick.currentX - joystick.startX
            );
        } else {
            myPlayer.angle = Math.atan2(mouseY - myPlayer.y, mouseX - myPlayer.x);
        }
        
        // Send update to server
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'move',
                x: myPlayer.x,
                y: myPlayer.y,
                angle: myPlayer.angle
            }));
        }
    } else if (!isMobile) {
        // Update angle even when not moving (desktop)
        myPlayer.angle = Math.atan2(mouseY - myPlayer.y, mouseX - myPlayer.x);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'move',
                x: myPlayer.x,
                y: myPlayer.y,
                angle: myPlayer.angle
            }));
        }
    }
    
    render();
    requestAnimationFrame(gameLoop);
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw players
    players.forEach(player => {
        const isMe = player.id === myPlayerId;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(player.x + 2, player.y + 2, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Player body
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Player outline
        ctx.strokeStyle = isMe ? '#00ff00' : '#ffffff';
        ctx.lineWidth = isMe ? 3 : 2;
        ctx.stroke();
        
        // Gun
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(
            player.x + Math.cos(player.angle) * 25,
            player.y + Math.sin(player.angle) * 25
        );
        ctx.stroke();
        
        // Health bar
        const barWidth = 40;
        const barHeight = 5;
        const barX = player.x - barWidth / 2;
        const barY = player.y - 30;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        const healthPercent = player.health / 100;
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffaa00' : '#ff0000';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Name
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player.name, player.x, player.y + 35);
    });
    
    // Draw bullets
    bullets.forEach(bullet => {
        ctx.fillStyle = '#ffff00';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffff00';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });
    
    // Draw mobile controls
    if (isMobile) {
        // Joystick
        if (joystick.active) {
            // Joystick base
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.arc(joystick.startX, joystick.startY, joystick.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Joystick stick
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(joystick.currentX, joystick.currentY, joystick.radius / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Fire button
        const fireX = canvas.width - 80;
        const fireY = canvas.height - 80;
        
        ctx.fillStyle = fireButton.active ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(fireX, fireY, fireButton.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔫', fireX, fireY);
    }
}

// Start
connect();
gameLoop();
