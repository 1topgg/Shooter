const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Підключення до WebSocket сервера
const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
const ws = new WebSocket(protocol + window.location.host);

let myId = null;
let me = null;
let gameState = { players: [], bullets: [] };
let keys = {};
let mouse = { x: 0, y: 0, down: false };

// Слухаємо сервер
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'init') {
        myId = data.playerId;
        me = data.player;
    } else if (data.type === 'gameState') {
        gameState = data;
        me = data.players.find(p => p.id === myId);
        updateHUD();
    }
};

// Обробка клавіатури та миші
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', e => { if (e.button === 0) mouse.down = true; });
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });

// Відправка даних на сервер (30 разів на секунду)
setInterval(() => {
    if (!me || ws.readyState !== WebSocket.OPEN) return;

    let dx = 0, dy = 0;
    if (keys['KeyW']) dy -= 1;
    if (keys['KeyS']) dy += 1;
    if (keys['KeyA']) dx -= 1;
    if (keys['KeyD']) dx += 1;

    // Локальний розрахунок руху (швидкість 6)
    if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        me.x += (dx / len) * 6;
        me.y += (dy / len) * 6;
    }

    // Розрахунок кута повороту
    const angle = Math.atan2(mouse.y - (canvas.height / 2), mouse.x - (canvas.width / 2));

    // Відправляємо рух
    ws.send(JSON.stringify({ type: 'move', x: me.x, y: me.y, angle: angle }));

    // Відправляємо постріл
    if (mouse.down) {
        ws.send(JSON.stringify({ type: 'shoot' }));
        mouse.down = false; // Щоб стріляти, треба клікати
    }
}, 1000 / 30);

// Відмальовка
function render() {
    // Фон
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!me) {
        requestAnimationFrame(render);
        return;
    }

    ctx.save();
    // Камера стежить за гравцем
    ctx.translate(canvas.width / 2 - me.x, canvas.height / 2 - me.y);

    // Межі ігрової карти (1200x800 з server.js)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, 1200, 800);

    // Малюємо всіх гравців
    gameState.players.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        
        // Тіло
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        
        // Зброя
        ctx.fillStyle = '#555';
        ctx.fillRect(10, -3, 16, 6);
        ctx.restore();

        // Імена над гравцями
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '12px Courier New';
        ctx.fillText(p.name, p.x, p.y - 25);
    });

    // Малюємо кулі
    gameState.bullets.forEach(b => {
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
    requestAnimationFrame(render);
}
render();

// Оновлення інтерфейсу
function updateHUD() {
    if (!me) return;
    document.getElementById('hp').innerText = `HP: ${me.health}`;
    document.getElementById('stats').innerText = `Вбивств: ${me.kills} | Смертей: ${me.deaths}`;
}
