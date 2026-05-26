# 🎮 Shooter MVP (WebSocket Multiplayer)

2D шутер з реальним мультиплеєром через WebSocket, синхронізацією позицій/пострілів і серверною авторитетною логікою.

## 🚀 Швидкий старт (локально)

1. Встановіть залежності:
```bash
npm install
```

2. Запустіть сервер:
```bash
npm start
```

3. Відкрийте браузер:
```
http://localhost:3000
```

## 🌐 Деплой на хостинг

### Варіант 1: Render.com (Рекомендовано)

1. Створіть акаунт на https://render.com
2. Натисніть "New +" → "Web Service"
3. Підключіть ваш GitHub репозиторій або виберіть "Public Git repository"
4. Налаштування:
   - **Name**: your-shooter-game
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Натисніть "Create Web Service"
6. Render автоматично деплоїть вашу гру!
7. Ваша гра буде доступна за адресою: `https://your-shooter-game.onrender.com`

### Варіант 2: Railway.app

1. Зареєструйтесь на https://railway.app
2. Натисніть "New Project" → "Deploy from GitHub repo"
3. Виберіть ваш репозиторій
4. Railway автоматично визначить Node.js проект
5. Гра буде задеплоєна автоматично!
6. Отримаєте URL типу: `https://your-game.up.railway.app`

### Варіант 3: Glitch.com (Найпростіший)

1. Йдіть на https://glitch.com
2. Натисніть "New Project" → "Import from GitHub"
3. Вставте URL вашого репозиторія
4. Glitch автоматично запустить проект
5. Гра доступна одразу за адресою: `https://your-project-name.glitch.me`

### Варіант 4: Heroku

1. Встановіть Heroku CLI
2. Виконайте команди:
```bash
heroku login
heroku create your-game-name
git push heroku main
```

## 📱 Управління

### Desktop:
- **WASD** - рух
- **Миша** - приціл
- **ЛКМ** - стріляти
- **⛶ Fullscreen** - повноекранний режим

### Mobile:
- **Лівий джойстик** - рух і приціл
- **Права кнопка** - стріляти

## 🎯 Особливості

✅ Реальний мультиплеєр через WebSockets
✅ Статус зʼєднання та авто-перепідключення клієнта
✅ Responsive UI для десктопа/планшета/телефона
✅ Система здоров'я та респавну
✅ Статистика K/D
✅ Інтерполяція гравців + client prediction/reconciliation
✅ Smooth 60 FPS рендеринг (залежно від пристрою)
✅ Колізії куль
✅ Візуальні ефекти

## 🔧 Технології

- **Backend**: Node.js + Express + WebSockets (ws)
- **Frontend**: Vanilla JavaScript + Canvas API
- **Архітектура**: Client-Server мультиплеєр

## 🎮 Як грати з друзями

1. Задеплойте гру на один з хостингів вище
2. Поділіться URL з друзями
3. Всі гравці підключаються до одного сервера
4. Грайте разом в реальному часі!

## 🖼️ Скріншоти

Створіть теку `public/screenshots/` і додайте зображення, наприклад:

- `public/screenshots/lobby.png`
- `public/screenshots/gameplay.png`

Після цього додайте їх у README:

```md
![Lobby](public/screenshots/lobby.png)
![Gameplay](public/screenshots/gameplay.png)
```

## 📊 Порти

За замовчуванням гра використовує порт **3000**. 
На хостингах порт визначається автоматично через `process.env.PORT`.

## ⚙️ Налаштування

Ви можете редагувати параметри в `server.js`:
- `GAME_WIDTH`, `GAME_HEIGHT` - розмір ігрового поля
- `BULLET_SPEED` - швидкість куль
- `BULLET_LIFETIME` - час життя куль
- FPS геймлупу (рядок 86: `1000 / 30`)

## 🐛 Troubleshooting

**Не підключається до сервера?**
- Перевірте, чи запущений сервер
- Перевірте консоль браузера (F12)

**Лагає на мобільних?**
- Спробуйте зменшити FPS в server.js
- Зменшіть кількість гравців

**WebSocket помилка?**
- Переконайтесь, що хостинг підтримує WebSockets
- Render, Railway, Glitch підтримують WebSockets з коробки

## 🚀 Готово!

Ваш MVP 2D шутер готовий до використання. Просто задеплойте і грайте!
