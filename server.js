const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Ключевые настройки Socket.IO для мобильных устройств
const io = new Server(server, {
    cors: {
        origin: "*", // Разрешаем все домены
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'], // Поддержка всех транспортов
    allowEIO3: true, // Совместимость с старыми клиентами
    pingTimeout: 60000, // Увеличиваем таймаут для мобильных
    pingInterval: 25000,
    cookie: false
});

// Настройка CORS для всех запросов
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Получаем корневую директорию
const projectRoot = process.cwd();

// Логируем структуру проекта при запуске
console.log('📁 Структура проекта:');
console.log('- Текущая директория:', projectRoot);

try {
    const files = fs.readdirSync(projectRoot);
    console.log('- Файлы в корне:', files);
    
    // Проверяем наличие ключевых файлов
    const requiredFiles = ['index.html', 'server.js', 'package.json'];
    requiredFiles.forEach(file => {
        const filePath = path.join(projectRoot, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${file} найден: ${filePath}`);
        } else {
            console.log(`❌ ${file} НЕ найден!`);
        }
    });
} catch (err) {
    console.error('Ошибка чтения директории:', err.message);
}

// Обслуживание статических файлов
app.use(express.static(projectRoot));

// Обработка preflight запросов
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
});

// Главная страница
app.get('/', (req, res) => {
    const indexPath = path.join(projectRoot, 'index.html');
    if (fs.existsSync(indexPath)) {
        console.log(`📄 Отправляем index.html: ${indexPath}`);
        res.sendFile(indexPath);
    } else {
        console.error(`❌ index.html не найден по пути: ${indexPath}`);
        res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head><title>Ошибка 404</title></head>
            <body style="font-family: Arial; padding: 20px;">
                <h1>Ошибка 404: index.html не найден</h1>
                <p>Путь: ${indexPath}</p>
                <p>Текущая директория: ${projectRoot}</p>
            </body>
            </html>
        `);
    }
});

// API статуса
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        websocket: 'enabled',
        cors: 'enabled',
        uptime: process.uptime()
    });
});

// Health check для Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Тестовый эндпоинт для проверки связи
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Сервер работает нормально',
        clientIp: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
    });
});

// Хранилище данных игры
const rooms = {};
const chatHistory = {};

// Socket.IO обработчики
io.on('connection', (socket) => {
    const clientIp = socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'] || 'unknown';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
    
    console.log(`✅ Новое подключение: ${socket.id}`);
    console.log(`   📍 IP: ${clientIp}`);
    console.log(`   📱 Устройство: ${isMobile ? 'Мобильное' : 'Десктоп'}`);
    console.log(`   🌐 User-Agent: ${userAgent.substring(0, 50)}...`);
    
    // Отправляем подтверждение подключения
    socket.emit('connection_confirmed', {
        message: 'Подключено к игровому серверу',
        id: socket.id,
        serverTime: new Date().toISOString(),
        isMobileOptimized: true
    });
    
    socket.on('join-room', (data) => {
        try {
            const { roomId, playerName, isNewRoom } = data;
            
            if (!roomId || !playerName) {
                socket.emit('room-error', { message: 'Неверные данные' });
                return;
            }
            
            // Ограничение длины имени
            if (playerName.length > 20) {
                socket.emit('room-error', { message: 'Имя слишком длинное (макс. 20 символов)' });
                return;
            }
            
            // Проверяем существование комнаты
            if (!rooms[roomId] && !isNewRoom) {
                socket.emit('room-error', { message: 'Комната не существует' });
                return;
            }
            
            // Создаем новую комнату если нужно
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
                    createdAt: new Date().toISOString(),
                    lastActivity: new Date().toISOString()
                };
                chatHistory[roomId] = [];
                console.log(`✅ Создана новая комната: ${roomId}`);
            }
            
            // Проверка количества игроков
            if (Object.keys(rooms[roomId].players).length >= 6) {
                socket.emit('room-error', { message: 'Комната заполнена (максимум 6 игроков)' });
                return;
            }
            
            // Цвета для игроков
            const playerColors = ['#4ecdc4', '#ff6b6b', '#ffe66d', '#1a535c', '#95e1d3', '#f08a5d'];
            const usedColors = Object.values(rooms[roomId].players).map(p => p.color);
            const availableColors = playerColors.filter(color => !usedColors.includes(color));
            const playerColor = availableColors.length > 0 ? availableColors[0] : playerColors[0];
            
            // Создаем игрока
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
                joinedAt: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                isMobile: isMobile,
                ip: clientIp
            };
            
            // Вступаем в комнату
            socket.join(roomId);
            
            // Отправляем данные игроку
            socket.emit('join-success', {
                ...rooms[roomId].players[socket.id],
                roomId: roomId,
                serverTime: new Date().toISOString()
            });
            
            // Отправляем историю чата
            if (chatHistory[roomId] && chatHistory[roomId].length > 0) {
                socket.emit('chat_history', {
                    messages: chatHistory[roomId].slice(-50) // Последние 50 сообщений
                });
            }
            
            // Уведомляем других игроков
            socket.to(roomId).emit('player_joined', {
                playerId: socket.id,
                player: rooms[roomId].players[socket.id],
                timestamp: new Date().toISOString()
            });
            
            // Отправляем обновленное состояние комнаты всем
            io.to(roomId).emit('room_state', {
                ...rooms[roomId],
                serverTime: new Date().toISOString()
            });
            
            console.log(`👥 Игрок "${playerName}" присоединился к комнате ${roomId}`);
            
        } catch (error) {
            console.error('Ошибка при join-room:', error);
            socket.emit('room-error', { message: 'Внутренняя ошибка сервера' });
        }
    });
    
    socket.on('get_room_state', () => {
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                socket.emit('room_state', {
                    ...rooms[roomId],
                    serverTime: new Date().toISOString()
                });
                break;
            }
        }
    });
    
    socket.on('chat_message', (data) => {
        try {
            const { message } = data;
            
            if (!message || message.trim().length === 0) {
                return;
            }
            
            // Ограничиваем длину сообщения
            const trimmedMessage = message.substring(0, 200).trim();
            
            for (const roomId in rooms) {
                if (rooms[roomId].players[socket.id]) {
                    const player = rooms[roomId].players[socket.id];
                    const playerName = player.name;
                    
                    const chatMessage = {
                        playerName,
                        message: trimmedMessage,
                        timestamp: new Date().toISOString(),
                        playerId: socket.id,
                        isMobile: player.isMobile
                    };
                    
                    // Сохраняем в историю
                    if (!chatHistory[roomId]) chatHistory[roomId] = [];
                    chatHistory[roomId].push(chatMessage);
                    
                    // Ограничиваем историю 100 сообщениями
                    if (chatHistory[roomId].length > 100) {
                        chatHistory[roomId] = chatHistory[roomId].slice(-100);
                    }
                    
                    // Отправляем всем в комнате
                    io.to(roomId).emit('new_chat_message', chatMessage);
                    break;
                }
            }
        } catch (error) {
            console.error('Ошибка при обработке сообщения:', error);
        }
    });
    
    socket.on('dice_roll', (data) => {
        try {
            const { diceValue, newPosition, task } = data;
            
            for (const roomId in rooms) {
                if (rooms[roomId].players[socket.id]) {
                    const player = rooms[roomId].players[socket.id];
                    
                    // Обновляем позицию игрока
                    player.position = newPosition;
                    player.currentTask = task;
                    player.lastActive = new Date().toISOString();
                    
                    // Определяем город на основе позиции
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
                    
                    // Обновляем активность комнаты
                    rooms[roomId].lastActivity = new Date().toISOString();
                    
                    // Отправляем обновление другим игрокам
                    socket.to(roomId).emit('player_dice_roll', {
                        playerId: socket.id,
                        diceValue: diceValue,
                        newPosition: newPosition,
                        task: task,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Отправляем обновленное состояние комнаты
                    io.to(roomId).emit('room_state', {
                        ...rooms[roomId],
                        serverTime: new Date().toISOString()
                    });
                    
                    console.log(`🎲 Игрок ${player.name} бросил кубик: ${diceValue}`);
                    break;
                }
            }
        } catch (error) {
            console.error('Ошибка при броске кубика:', error);
        }
    });
    
    socket.on('update_progress', (data) => {
        try {
            const { cityKey, progress } = data;
            
            for (const roomId in rooms) {
                if (rooms[roomId].players[socket.id]) {
                    if (rooms[roomId].cityProgress[cityKey] !== undefined) {
                        rooms[roomId].cityProgress[cityKey] = Math.min(100, Math.max(0, progress));
                        rooms[roomId].lastActivity = new Date().toISOString();
                        
                        io.to(roomId).emit('progress_updated', {
                            cityKey,
                            progress: rooms[roomId].cityProgress[cityKey],
                            timestamp: new Date().toISOString()
                        });
                        
                        io.to(roomId).emit('room_state', {
                            ...rooms[roomId],
                            serverTime: new Date().toISOString()
                        });
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('Ошибка при обновлении прогресса:', error);
        }
    });
    
    socket.on('player-update', (playerData) => {
        try {
            for (const roomId in rooms) {
                if (rooms[roomId].players[socket.id]) {
                    rooms[roomId].players[socket.id] = {
                        ...rooms[roomId].players[socket.id],
                        ...playerData,
                        lastActive: new Date().toISOString()
                    };
                    
                    rooms[roomId].lastActivity = new Date().toISOString();
                    
                    io.to(roomId).emit('room_state', {
                        ...rooms[roomId],
                        serverTime: new Date().toISOString()
                    });
                    break;
                }
            }
        } catch (error) {
            console.error('Ошибка при обновлении игрока:', error);
        }
    });
    
    socket.on('ping', (data) => {
        socket.emit('pong', {
            ...data,
            serverTime: new Date().toISOString(),
            latency: Date.now() - (data.clientTime || Date.now())
        });
    });
    
    socket.on('disconnect', (reason) => {
        console.log(`❌ Отключение: ${socket.id}, причина: ${reason}`);
        
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                const player = rooms[roomId].players[socket.id];
                const playerName = player.name;
                
                // Помечаем как отключенного
                rooms[roomId].players[socket.id].connected = false;
                rooms[roomId].players[socket.id].disconnectedAt = new Date().toISOString();
                rooms[roomId].lastActivity = new Date().toISOString();
                
                // Уведомляем других игроков
                socket.to(roomId).emit('player_left', {
                    playerId: socket.id,
                    playerName: playerName,
                    reason: reason,
                    timestamp: new Date().toISOString()
                });
                
                // Отправляем обновленное состояние
                io.to(roomId).emit('room_state', {
                    ...rooms[roomId],
                    serverTime: new Date().toISOString()
                });
                
                console.log(`👋 Игрок "${playerName}" покинул комнату ${roomId}`);
                
                // Удаляем через 10 минут неактивности
                setTimeout(() => {
                    if (rooms[roomId] && 
                        rooms[roomId].players[socket.id] && 
                        !rooms[roomId].players[socket.id].connected) {
                        
                        delete rooms[roomId].players[socket.id];
                        console.log(`🗑️ Удален неактивный игрок "${playerName}" из комнаты ${roomId}`);
                        
                        // Если комната пуста, удаляем ее
                        if (Object.keys(rooms[roomId].players).length === 0) {
                            delete rooms[roomId];
                            delete chatHistory[roomId];
                            console.log(`🗑️ Удалена пустая комната ${roomId}`);
                        } else {
                            io.to(roomId).emit('room_state', {
                                ...rooms[roomId],
                                serverTime: new Date().toISOString()
                            });
                        }
                    }
                }, 10 * 60 * 1000); // 10 минут
                
                break;
            }
        }
    });
    
    socket.on('error', (error) => {
        console.error(`❌ Ошибка сокета ${socket.id}:`, error);
    });
});

// Очистка неактивных комнат каждый час
setInterval(() => {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const roomId in rooms) {
        const room = rooms[roomId];
        const lastActivity = new Date(room.lastActivity);
        const hoursDiff = (now - lastActivity) / (1000 * 60 * 60);
        
        // Удаляем комнаты без активности более 24 часов
        if (hoursDiff > 24) {
            delete rooms[roomId];
            delete chatHistory[roomId];
            cleanedCount++;
            console.log(`🧹 Очищена неактивная комната ${roomId}`);
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`🧹 Очищено ${cleanedCount} неактивных комнат`);
    }
}, 60 * 60 * 1000); // Каждый час

// Порт из переменных окружения (Render сам устанавливает PORT)
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log(`🚀 Сервер успешно запущен!`);
    console.log(`📍 Порт: ${PORT}`);
    console.log(`🌐 Локальный URL: http://localhost:${PORT}`);
    console.log(`📊 API статуса: http://localhost:${PORT}/api/status`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 WebSocket: ws://localhost:${PORT}`);
    console.log('='.repeat(50));
    
    // Информация о Render окружении
    if (process.env.RENDER) {
        console.log(`🌍 Сервер развернут на Render.com`);
        if (process.env.RENDER_EXTERNAL_URL) {
            console.log(`🔗 Внешний URL: ${process.env.RENDER_EXTERNAL_URL}`);
            console.log(`⚡ WebSocket URL: wss://${process.env.RENDER_EXTERNAL_URL.replace('https://', '')}`);
        }
    }
    
    // Информация о системе
    console.log(`🖥️  Платформа: ${process.platform}`);
    console.log(`📦 Версия Node: ${process.version}`);
    console.log(`💾 Память: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
});

// Обработка ошибок сервера
server.on('error', (error) => {
    console.error('❌ Критическая ошибка сервера:', error);
    
    if (error.code === 'EADDRINUSE') {
        console.error(`   Порт ${PORT} уже используется.`);
        console.error('   Попробуйте:');
        console.error('   1. Изменить переменную окружения PORT');
        console.error('   2. Подождать 60 секунд и перезапустить');
    }
    
    process.exit(1);
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

// Экспортируем для тестирования
module.exports = { app, server, io };
