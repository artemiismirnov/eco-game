const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Настройки Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// CORS
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Определяем текущую рабочую директорию
const currentDir = process.cwd();
console.log('='.repeat(60));
console.log('🚀 Запуск сервера...');
console.log(`📁 Текущая директория: ${currentDir}`);

// Логируем все файлы в текущей директории
console.log('📄 Файлы в текущей директории:');
try {
    const files = fs.readdirSync(currentDir);
    files.forEach(file => {
        try {
            const filePath = path.join(currentDir, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                console.log(`   📁 ${file}/`);
            } else {
                console.log(`   📄 ${file} (${stats.size} bytes)`);
            }
        } catch {
            console.log(`   ❓ ${file}`);
        }
    });
} catch (err) {
    console.error('❌ Ошибка чтения директории:', err.message);
}

// Ищем index.html в корневой директории
const indexPath = path.join(currentDir, 'index.html');
console.log(`🔍 Проверяем index.html: ${indexPath}`);

if (fs.existsSync(indexPath)) {
    console.log('✅ index.html найден!');
} else {
    console.error('❌ index.html НЕ НАЙДЕН в текущей директории!');
    
    // Попробуем найти в других возможных местах
    console.log('🔍 Ищем index.html в других местах:');
    
    const possiblePaths = [
        '/opt/render/project/index.html',      // Стандартный путь Render (без src)
        path.join(__dirname, 'index.html'),    // Директория модуля
        path.join(process.cwd(), 'public', 'index.html'),
        path.join(process.cwd(), 'dist', 'index.html'),
        path.join(process.cwd(), 'build', 'index.html')
    ];
    
    for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
            console.log(`   ✅ Найден: ${possiblePath}`);
            break;
        } else {
            console.log(`   ❌ Не найден: ${possiblePath}`);
        }
    }
}

// Настройка статических файлов - ВАЖНО: используем текущую директорию
console.log(`📂 Обслуживание статических файлов из: ${currentDir}`);
app.use(express.static(currentDir));

// Главный маршрут
app.get('/', (req, res) => {
    const indexPath = path.join(currentDir, 'index.html');
    
    if (fs.existsSync(indexPath)) {
        console.log(`📤 Отправляю index.html: ${indexPath}`);
        res.sendFile(indexPath);
    } else {
        // Пробуем альтернативные пути
        const altPaths = [
            '/opt/render/project/index.html',
            path.join(__dirname, 'index.html')
        ];
        
        for (const altPath of altPaths) {
            if (fs.existsSync(altPath)) {
                console.log(`📤 Отправляю index.html из альтернативного пути: ${altPath}`);
                return res.sendFile(altPath);
            }
        }
        
        // Если нигде не нашли, показываем ошибку
        res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ошибка - Игра не найдена</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #0f2b35, #1a535c);
                        color: white;
                        padding: 30px;
                        line-height: 1.6;
                    }
                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 15px;
                        padding: 30px;
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    h1 { color: #ff6b6b; }
                    .success { color: #4ecdc4; }
                    .error { color: #ff6b6b; }
                    .info { color: #3498db; }
                    .file-list {
                        background: rgba(0, 0, 0, 0.3);
                        border-radius: 10px;
                        padding: 20px;
                        margin: 20px 0;
                    }
                    .file-item {
                        padding: 8px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    code {
                        background: rgba(0, 0, 0, 0.5);
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-family: 'Courier New', monospace;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🎮 Юный эколог - Ошибка загрузки</h1>
                    <p class="error">❌ Файл index.html не найден</p>
                    
                    <h2>📁 Диагностика:</h2>
                    <p><strong>Текущая директория:</strong> ${currentDir}</p>
                    <p><strong>Искомый путь:</strong> ${indexPath}</p>
                    
                    <h2>📄 Файлы в проекте:</h2>
                    <div class="file-list">
                        ${(() => {
                            try {
                                const files = fs.readdirSync(currentDir);
                                if (files.length === 0) {
                                    return '<p class="error">Папка пуста!</p>';
                                }
                                return files.map(file => {
                                    const filePath = path.join(currentDir, file);
                                    try {
                                        const stats = fs.statSync(filePath);
                                        const icon = stats.isDirectory() ? '📁' : '📄';
                                        const size = stats.isFile() ? `(${stats.size} bytes)` : '';
                                        return `<div class="file-item">${icon} ${file} ${size}</div>`;
                                    } catch {
                                        return `<div class="file-item">❓ ${file}</div>`;
                                    }
                                }).join('');
                            } catch (err) {
                                return `<p class="error">Ошибка: ${err.message}</p>`;
                            }
                        })()}
                    </div>
                    
                    <h2>🛠️ Решение проблемы:</h2>
                    <ol>
                        <li>Убедитесь, что файл <code>index.html</code> загружен в репозиторий GitHub</li>
                        <li>Проверьте, что структура проекта простая (файлы в корне, без папки src)</li>
                        <li>На Render.com в настройках Web Service убедитесь, что <strong>Root Directory</strong> установлен в <code>.</code> (точка)</li>
                    </ol>
                    
                    <h2>✅ Правильная структура проекта:</h2>
                    <pre>
/ (корень проекта)
├── index.html
├── server.js
├── package.json
├── .gitignore
└── (другие файлы если есть)
                    </pre>
                </div>
            </body>
            </html>
        `);
    }
});

// Явный маршрут для index.html
app.get('/index.html', (req, res) => {
    const indexPath = path.join(currentDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html не найден');
    }
});

// API статуса
app.get('/api/status', (req, res) => {
    const indexPath = path.join(currentDir, 'index.html');
    const indexExists = fs.existsSync(indexPath);
    
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        websocket: 'enabled',
        indexHtml: {
            exists: indexExists,
            path: indexPath,
            directory: currentDir
        },
        environment: process.env.NODE_ENV || 'development',
        render: !!process.env.RENDER,
        port: process.env.PORT || 3000
    });
});

// Health check для Render
app.get('/health', (req, res) => {
    const indexPath = path.join(currentDir, 'index.html');
    const indexExists = fs.existsSync(indexPath);
    
    if (indexExists) {
        res.status(200).json({
            status: 'healthy',
            uptime: process.uptime(),
            indexHtml: 'found',
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(500).json({
            status: 'unhealthy',
            error: 'index.html not found',
            path: indexPath,
            timestamp: new Date().toISOString()
        });
    }
});

// Тестовый эндпоинт для проверки
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Сервер работает!',
        currentDir: currentDir,
        files: fs.readdirSync(currentDir),
        timestamp: new Date().toISOString()
    });
});

// Хранилище данных игры
const rooms = {};
const chatHistory = {};

// Socket.IO обработчики
io.on('connection', (socket) => {
    console.log('✅ Новое подключение:', socket.id);
    
    socket.emit('connection_confirmed', {
        message: 'Подключено к серверу',
        id: socket.id,
        timestamp: new Date().toISOString()
    });
    
    socket.on('join-room', (data) => {
        const { roomId, playerName, isNewRoom } = data;
        
        if (!roomId || !playerName) {
            socket.emit('room-error', 'Неверные данные');
            return;
        }
        
        if (!rooms[roomId] && !isNewRoom) {
            socket.emit('room-error', 'Комната не существует');
            return;
        }
        
        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: {},
                cityProgress: {
                    tver: 0,
                    kineshma: 0,
                    naberezhnye_chelny: 0,
                    kazan: 0,
                    volgograd: 0,
                    astrakhan: 0
                },
                createdAt: new Date().toISOString()
            };
            chatHistory[roomId] = [];
            console.log(`✅ Создана новая комната: ${roomId}`);
        }
        
        if (Object.keys(rooms[roomId].players).length >= 6) {
            socket.emit('room-error', 'Комната заполнена (максимум 6 игроков)');
            return;
        }
        
        const playerColors = ['#4ecdc4', '#ff6b6b', '#ffe66d', '#1a535c', '#95e1d3', '#f08a5d'];
        const usedColors = Object.values(rooms[roomId].players).map(p => p.color);
        const availableColors = playerColors.filter(color => !usedColors.includes(color));
        const playerColor = availableColors.length > 0 ? availableColors[0] : playerColors[0];
        
        rooms[roomId].players[socket.id] = {
            id: socket.id,
            name: playerName,
            position: 1,
            city: 'tver',
            coins: 100,
            cleaningPoints: 0,
            level: 1,
            completedTasks: 0,
            buildings: [],
            color: playerColor,
            connected: true,
            joinedAt: new Date().toISOString()
        };
        
        socket.join(roomId);
        
        socket.emit('join-success', {
            ...rooms[roomId].players[socket.id],
            roomId: roomId
        });
        
        if (chatHistory[roomId]) {
            socket.emit('chat_history', chatHistory[roomId]);
        }
        
        socket.to(roomId).emit('player_joined', {
            playerId: socket.id,
            player: rooms[roomId].players[socket.id]
        });
        
        io.to(roomId).emit('room_state', rooms[roomId]);
        
        console.log(`👥 Игрок ${playerName} присоединился к комнате ${roomId}`);
    });
    
    socket.on('get_room_state', () => {
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                socket.emit('room_state', rooms[roomId]);
                break;
            }
        }
    });
    
    socket.on('chat_message', (data) => {
        const { message } = data;
        
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                const playerName = rooms[roomId].players[socket.id].name;
                
                const chatMessage = {
                    playerName,
                    message,
                    timestamp: new Date().toISOString()
                };
                
                if (!chatHistory[roomId]) chatHistory[roomId] = [];
                chatHistory[roomId].push(chatMessage);
                if (chatHistory[roomId].length > 100) {
                    chatHistory[roomId].shift();
                }
                
                io.to(roomId).emit('new_chat_message', {
                    playerName,
                    message
                });
                break;
            }
        }
    });
    
    socket.on('dice_roll', (data) => {
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                const player = rooms[roomId].players[socket.id];
                
                player.position = data.newPosition;
                player.currentTask = data.task;
                
                const cityCells = {
                    tver: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
                    kineshma: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
                    naberezhnye_chelny: [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43],
                    kazan: [47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58],
                    volgograd: [66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
                    astrakhan: [81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93]
                };
                
                for (const [city, cells] of Object.entries(cityCells)) {
                    if (cells.includes(player.position)) {
                        player.city = city;
                        break;
                    }
                }
                
                socket.to(roomId).emit('player_dice_roll', {
                    playerId: socket.id,
                    diceValue: data.diceValue,
                    newPosition: data.newPosition,
                    task: data.task
                });
                
                io.to(roomId).emit('room_state', rooms[roomId]);
                break;
            }
        }
    });
    
    socket.on('update_progress', (data) => {
        const { cityKey, progress } = data;
        
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                if (rooms[roomId].cityProgress[cityKey] !== undefined) {
                    rooms[roomId].cityProgress[cityKey] = progress;
                    
                    io.to(roomId).emit('progress_updated', {
                        cityKey,
                        progress
                    });
                    
                    io.to(roomId).emit('room_state', rooms[roomId]);
                }
                break;
            }
        }
    });
    
    socket.on('player-update', (playerData) => {
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                rooms[roomId].players[socket.id] = {
                    ...rooms[roomId].players[socket.id],
                    ...playerData
                };
                
                io.to(roomId).emit('room_state', rooms[roomId]);
                break;
            }
        }
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Отключение:', socket.id);
        
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                const playerName = rooms[roomId].players[socket.id].name;
                
                rooms[roomId].players[socket.id].connected = false;
                
                socket.to(roomId).emit('player_left', {
                    playerId: socket.id,
                    playerName
                });
                
                io.to(roomId).emit('room_state', rooms[roomId]);
                
                setTimeout(() => {
                    if (rooms[roomId] && rooms[roomId].players[socket.id] && !rooms[roomId].players[socket.id].connected) {
                        delete rooms[roomId].players[socket.id];
                        console.log(`🗑️ Удален неактивный игрок ${playerName} из комнаты ${roomId}`);
                        
                        if (Object.keys(rooms[roomId].players).length === 0) {
                            delete rooms[roomId];
                            delete chatHistory[roomId];
                            console.log(`🗑️ Удалена пустая комната ${roomId}`);
                        } else {
                            io.to(roomId).emit('room_state', rooms[roomId]);
                        }
                    }
                }, 5 * 60 * 1000);
                
                break;
            }
        }
    });
});

// Порт из переменных окружения
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log(`🚀 Сервер успешно запущен!`);
    console.log(`📍 Порт: ${PORT}`);
    console.log(`🌐 Локальный URL: http://localhost:${PORT}`);
    console.log(`📊 API статуса: http://localhost:${PORT}/api/status`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 Тест: http://localhost:${PORT}/api/test`);
    console.log(`🔗 WebSocket: ws://localhost:${PORT}`);
    console.log(`📁 Статические файлы из: ${currentDir}`);
    
    const indexPath = path.join(currentDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        console.log(`✅ index.html найден: ${indexPath}`);
    } else {
        console.log(`❌ index.html НЕ найден! Проверьте загрузку файлов.`);
    }
    
    if (process.env.RENDER) {
        console.log(`🌍 Сервер развернут на Render.com`);
        if (process.env.RENDER_EXTERNAL_URL) {
            console.log(`🔗 Внешний URL: ${process.env.RENDER_EXTERNAL_URL}`);
            console.log(`⚡ WebSocket URL: wss://${process.env.RENDER_EXTERNAL_URL.replace('https://', '')}`);
        }
    }
    console.log('='.repeat(60));
});

// Обработка ошибок
server.on('error', (error) => {
    console.error('❌ Ошибка сервера:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Получен SIGTERM. Завершаем работу...');
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('👋 Получен SIGINT. Завершаем работу...');
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});