# ☠ Shooter

Мультиплеєрний 2D шутер в реальному часі на WebSocket.

## 🎮 Керування

| Клавіша | Дія |
|---------|-----|
| **WASD** | Рух |
| **Миша** | Прицілювання |
| **ЛКМ** | Стріляти |
| **Shift** | Спринт |
| **Space** | Деш (ривок) |
| **1-4 / Колесо / Q** | Перемикання зброї |
| **R** | Перезарядка |
| **B** | Магазин |
| **Esc** | Пауза |
| **Tab** | Scoreboard |

## 🚀 Запуск

```bash
npm install
npm start        # Production
npm run dev      # Development (auto-reload)
```

Відкрити http://localhost:3000

## 🌐 Деплой на Railway

1. Підключи GitHub репозиторій до Railway
2. Railway автоматично задеплоїть проєкт
3. Порт визначається через `PORT` env variable

## ✨ Фішки

- **Мультиплеєр** — WebSocket в реальному часі
- **Client-side prediction** — плавний рух без затримок
- **Server reconciliation** — синхронізація з сервером
- **Деш (ривок)** — Space для ухилення (кулдаун 2с)
- **Спринт** — Shift для швидкого бігу
- **Мінімапа** — бачиш всіх гравців
- **Kill Feed** — хто кого вбив
- **Mode Select** — Survival / Deathmatch / Team Deathmatch
- **Параметри матчу** — difficulty, friendly fire, bots, frag limit, round time
- **Магазин** — зброя, патрони, аптечки/броня, перки
- **Перезарядка** — магазин/резерв патронів з прогрес-баром
- **Ручний респаун** — Respawn / Spectate / Main Menu після смерті
- **Розширений HUD** — armor, ammo, reload, killstreak, top-3
- **Мобільний UI** — віртуальний стік + кнопки дій
- **Частинки** — ефекти при пострілах, влучаннях, смерті

## 📁 Структура

```
├── server.js          # Ігровий сервер
├── public/
│   ├── index.html     # Сторінка гри
│   ├── style.css      # Стилі
│   └── game.js        # Клієнтська логіка
├── package.json
└── Procfile           # Railway
```
