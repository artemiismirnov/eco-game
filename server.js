const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// ВАЖНО: Указываем правильный путь для статических файлов
// Используем __dirname для текущей директории
app.use(express.static(__dirname));

// Маршрут для главной страницы - ВАЖНО: используем path.join
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    console.log('Путь к index.html:', indexPath);
    res.sendFile(indexPath);
});

// Альтернативный маршрут для index.html
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API для проверки статуса сервера
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'ok', 
        rooms: Object.keys(rooms).length,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Health check для Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Хранилище комнат
const rooms = {};
const chatHistory = {};

// Socket.IO обработчики
io.on('connection', (socket) => {
    console.log('✅ Новое подключение:', socket.id);
    
    socket.emit('connection_confirmed', { 
        message: 'Connected to server', 
        id: socket.id,
        timestamp: new Date().toISOString()
    });
    
    socket.on('join-room', (data) => {
        const { roomId, playerName, isNewRoom } = data;
        
        if (!roomId || !playerName) {
            socket.emit('room-error', 'Неверные данные');
            return;
        }
        
        // Проверка существования комнаты
        if (!rooms[roomId] && !isNewRoom) {
            socket.emit('room-error', 'Комната не существует');
            return;
        }
        
        // Создание комнаты если нужно
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
        
        // Проверка количества игроков
        if (Object.keys(rooms[roomId].players).length >= 6) {
            socket.emit('room-error', 'Комната заполнена (максимум 6 игроков)');
            return;
        }
        
        // Создание игрока
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
        
        // Отправка данных игроку
        socket.emit('join-success', {
            ...rooms[roomId].players[socket.id],
            roomId: roomId
        });
        
        // Отправка истории чата
        if (chatHistory[roomId]) {
            socket.emit('chat_history', chatHistory[roomId]);
        }
        
        // Уведомление других игроков
        socket.to(roomId).emit('player_joined', {
            playerId: socket.id,
            player: rooms[roomId].players[socket.id]
        });
        
        // Отправка обновленного состояния комнаты всем
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
                
                // Сохраняем в историю (ограничим до 100 сообщений)
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
                
                // Обновляем позицию игрока
                player.position = data.newPosition;
                player.currentTask = data.task;
                
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
                
                // Отправляем обновление другим игрокам
                socket.to(roomId).emit('player_dice_roll', {
                    playerId: socket.id,
                    diceValue: data.diceValue,
                    newPosition: data.newPosition,
                    task: data.task
                });
                
                // Обновляем состояние комнаты
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
                
                // Помечаем как отключенного
                rooms[roomId].players[socket.id].connected = false;
                rooms[roomId].players[socket.id].lastSeen = new Date().toISOString();
                
                // Уведомляем других игроков
                socket.to(roomId).emit('player_left', {
                    playerId: socket.id,
                    playerName
                });
                
                // Отправляем обновленное состояние
                io.to(roomId).emit('room_state', rooms[roomId]);
                
                // Удаляем через 5 минут неактивности
                setTimeout(() => {
                    if (rooms[roomId] && rooms[roomId].players[socket.id] && !rooms[roomId].players[socket.id].connected) {
                        delete rooms[roomId].players[socket.id];
                        console.log(`🗑️ Удален неактивный игрок ${playerName} из комнаты ${roomId}`);
                        
                        // Если комната пуста, удаляем ее
                        if (Object.keys(rooms[roomId].players).length === 0) {
                            delete rooms[roomId];
                            delete chatHistory[roomId];
                            console.log(`🗑️ Удалена пустая комната ${roomId}`);
                        } else {
                            io.to(roomId).emit('room_state', rooms[roomId]);
                        }
                    }
                }, 5 * 60 * 1000); // 5 минут
                
                break;
            }
        }
    });
});

// ВАЖНО: Используем порт из переменных окружения для Render
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Локальный адрес: http://localhost:${PORT}`);
    console.log(`📊 API статуса: http://localhost:${PORT}/api/status`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log('========================================');
    
    // Логирование окружения для отладки
    console.log('Информация о окружении:');
    console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('- Текущая директория:', __dirname);
    console.log('- Файлы в директории:');
    
    // Проверяем наличие index.html
    const fs = require('fs');
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        console.log('- ✅ index.html найден по пути:', indexPath);
    } else {
        console.log('- ❌ index.html НЕ найден! Ищем файлы...');
        try {
            const files = fs.readdirSync(__dirname);
            console.log('- Доступные файлы:', files);
        } catch (err) {
            console.log('- Ошибка чтения директории:', err.message);
        }
    }
});

// Обработка ошибок сервера
server.on('error', (error) => {
    console.error('❌ Ошибка сервера:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Порт ${PORT} занят. Попробуйте другой порт.`);
    }
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
