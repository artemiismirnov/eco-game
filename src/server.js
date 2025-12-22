const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Настройки Socket.IO для мобильных устройств
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: false
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    cookie: false
});

// CORS настройки
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Отображаем текущую директорию для отладки
console.log('='.repeat(60));
console.log('🚀 Запуск сервера...');
console.log(`📁 Текущая директория: ${__dirname}`);
console.log(`📂 Корневая директория: ${process.cwd()}`);

// Обслуживаем статические файлы из текущей директории (src)
app.use(express.static(__dirname));

// Главная страница
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    console.log(`📤 Отправляю index.html: ${indexPath}`);
    res.sendFile(indexPath);
});

// Альтернативный маршрут для index.html
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API для проверки статуса
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        server: 'Юный эколог',
        websocket: 'enabled',
        environment: process.env.NODE_ENV || 'development',
        directory: __dirname
    });
});

// Health check для Render (обязательно!)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Тестовый маршрут
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Сервер работает!',
        client: req.headers['user-agent'],
        ip: req.ip,
        time: new Date().toISOString()
    });
});

// Хранилище данных игры
const rooms = {};
const chatHistory = {};
const playerSessions = {}; // Храним сессии игроков по sessionId
const roomTimeouts = {}; // Таймауты для удаления комнат

// ==================== SOCKET.IO ОБРАБОТЧИКИ ====================

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
        message: 'Подключено к игровому серверу "Юный эколог"',
        id: socket.id,
        timestamp: new Date().toISOString(),
        isMobileOptimized: true
    });
    
    // ========== ОБРАБОТЧИКИ ИГРЫ ==========
    
    // Присоединение к комнате с поддержкой восстановления сессии
    socket.on('join-room', (data) => {
        try {
            const { roomId, playerName, isNewRoom, sessionId } = data;
            
            // Валидация
            if (!roomId || !playerName) {
                socket.emit('room-error', { message: 'Неверные данные' });
                return;
            }
            
            if (playerName.length < 2) {
                socket.emit('room-error', { message: 'Имя должно содержать минимум 2 символа' });
                return;
            }
            
            if (playerName.length > 20) {
                socket.emit('room-error', { message: 'Имя слишком длинное (максимум 20 символов)' });
                return;
            }
            
            if (roomId.length < 1) {
                socket.emit('room-error', { message: 'Введите номер комнаты' });
                return;
            }
            
            // Проверка существования комнаты
            if (!rooms[roomId] && !isNewRoom) {
                socket.emit('room-error', { message: 'Комнаты с таким номером не существует' });
                return;
            }
            
            // Проверяем существующую сессию
            const sessionKey = sessionId ? `${roomId}_${playerName}_${sessionId}` : null;
            let existingPlayerId = null;
            
            if (sessionKey && playerSessions[sessionKey]) {
                existingPlayerId = playerSessions[sessionKey];
                console.log(`🔍 Найдена существующая сессия для ${playerName}: ${existingPlayerId}`);
            }
            
            // Проверка количества игроков в комнате
            if (rooms[roomId]) {
                const connectedPlayers = Object.values(rooms[roomId].players).filter(p => p.connected);
                if (connectedPlayers.length >= 6) {
                    socket.emit('room-error', { message: 'Комната заполнена (максимум 6 игроков)' });
                    return;
                }
                
                // Также ищем по имени и IP для обратной совместимости
                if (!existingPlayerId) {
                    for (const playerId in rooms[roomId].players) {
                        const player = rooms[roomId].players[playerId];
                        if (player.name === playerName && player.ip === clientIp) {
                            existingPlayerId = playerId;
                            break;
                        }
                    }
                }
            }
            
            // Отменяем таймаут удаления комнаты, если он есть
            if (roomTimeouts[roomId]) {
                clearTimeout(roomTimeouts[roomId]);
                delete roomTimeouts[roomId];
                console.log(`⏱️ Отменен таймаут удаления комнаты ${roomId}`);
            }
            
            // Создание новой комнаты
            if (!rooms[roomId]) {
                rooms[roomId] = {
                    players: {},
                    playerProgress: {},
                    turnOrder: [],
                    currentTurn: null,
                    createdAt: new Date().toISOString(),
                    lastActivity: new Date().toISOString(),
                    name: roomId
                };
                chatHistory[roomId] = [];
                console.log(`✅ Создана новая комната: ${roomId}`);
            }
            
            // Если нашли существующего игрока, восстанавливаем его
            if (existingPlayerId && rooms[roomId].players[existingPlayerId]) {
                console.log(`♻️ Восстанавливаем существующего игрока: ${playerName} (${existingPlayerId})`);
                
                const existingPlayer = rooms[roomId].players[existingPlayerId];
                
                // Обновляем socket.id для существующего игрока
                delete rooms[roomId].players[existingPlayerId];
                
                // Обновляем данные игрока
                existingPlayer.id = socket.id;
                existingPlayer.socketId = socket.id;
                existingPlayer.connected = true;
                existingPlayer.lastActive = new Date().toISOString();
                existingPlayer.reconnected = true;
                existingPlayer.sessionId = sessionId;
                
                // Сохраняем сессию
                if (sessionKey) {
                    playerSessions[sessionKey] = socket.id;
                }
                
                rooms[roomId].players[socket.id] = existingPlayer;
                
                // Обновляем очередь ходов, если игрок был в ней
                const turnIndex = rooms[roomId].turnOrder.indexOf(existingPlayerId);
                if (turnIndex !== -1) {
                    rooms[roomId].turnOrder[turnIndex] = socket.id;
                    if (rooms[roomId].currentTurn === existingPlayerId) {
                        rooms[roomId].currentTurn = socket.id;
                    }
                }
                
                // Присоединение к комнате
                socket.join(roomId);
                
                // Отправка данных игроку
                socket.emit('join-success', {
                    ...existingPlayer,
                    roomId: roomId,
                    serverTime: new Date().toISOString(),
                    reconnected: true,
                    currentTurn: rooms[roomId].currentTurn,
                    turnOrder: rooms[roomId].turnOrder,
                    isMyTurn: (socket.id === rooms[roomId].currentTurn),
                    progress: rooms[roomId].playerProgress[socket.id] || {}
                });
                
                // Отправка истории чата (только сообщения игроков)
                if (chatHistory[roomId]) {
                    const playerMessages = chatHistory[roomId].filter(msg => 
                        !msg.playerName.includes('Система') && 
                        !msg.message.includes('присоединился') &&
                        !msg.message.includes('покинул') &&
                        !msg.message.includes('бросил кубик') &&
                        !msg.message.includes('выполнил задание') &&
                        !msg.message.includes('построил') &&
                        !msg.message.includes('переместился')
                    );
                    if (playerMessages.length > 0) {
                        socket.emit('chat_history', playerMessages.slice(-20));
                    }
                }
                
                // Уведомление других игроков о возвращении
                socket.to(roomId).emit('player_reconnected', {
                    playerId: socket.id,
                    player: existingPlayer,
                    timestamp: new Date().toISOString()
                });
                
                // Отправляем обновленное состояние комнаты всем
                io.to(roomId).emit('room_state', {
                    players: rooms[roomId].players,
                    currentTurn: rooms[roomId].currentTurn,
                    turnOrder: rooms[roomId].turnOrder,
                    serverTime: new Date().toISOString()
                });
                
                // Отправляем очередь ходов
                io.to(roomId).emit('turn_update', {
                    currentTurn: rooms[roomId].currentTurn,
                    turnOrder: rooms[roomId].turnOrder
                });
                
                // Рассылаем позиции всех игроков
                const playersPositions = {};
                for (const playerId in rooms[roomId].players) {
                    const player = rooms[roomId].players[playerId];
                    if (player.connected) {
                        playersPositions[playerId] = {
                            name: player.name,
                            position: player.position,
                            city: player.city,
                            color: player.color,
                            coins: player.coins,
                            level: player.level
                        };
                    }
                }
                
                socket.emit('all_players_positions', {
                    players: playersPositions,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`👥 Игрок "${playerName}" восстановлен в комнате ${roomId}`);
                return;
            }
            
            // Создание нового игрока
            const playerColors = ['#4ecdc4', '#ff6b6b', '#ffe66d', '#1a535c', '#95e1d3', '#f08a5d'];
            const usedColors = Object.values(rooms[roomId].players).map(p => p.color);
            const availableColors = playerColors.filter(color => !usedColors.includes(color));
            const playerColor = availableColors.length > 0 ? availableColors[0] : playerColors[0];
            
            // Инициализация прогресса для нового игрока
            if (!rooms[roomId].playerProgress) {
                rooms[roomId].playerProgress = {};
            }
            rooms[roomId].playerProgress[socket.id] = {
                tver: 0,
                kineshma: 0,
                naberezhnye_chelny: 0,
                kazan: 0,
                volgograd: 0,
                astrakhan: 0
            };
            
            // Создание объекта нового игрока
            const newPlayer = {
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
                ip: clientIp,
                sessionId: sessionId,
                reconnected: false
            };
            
            rooms[roomId].players[socket.id] = newPlayer;
            
            // Сохраняем сессию
            if (sessionId) {
                const sessionKey = `${roomId}_${playerName}_${sessionId}`;
                playerSessions[sessionKey] = socket.id;
            }
            
            // Добавляем игрока в очередь ходов
            rooms[roomId].turnOrder.push(socket.id);
            
            // Если это первый игрок, он начинает
            if (rooms[roomId].turnOrder.length === 1) {
                rooms[roomId].currentTurn = socket.id;
            }
            
            // Присоединение к комнате
            socket.join(roomId);
            
            // Отправка данных игроку
            socket.emit('join-success', {
                ...newPlayer,
                roomId: roomId,
                serverTime: new Date().toISOString(),
                reconnected: false,
                currentTurn: rooms[roomId].currentTurn,
                turnOrder: rooms[roomId].turnOrder,
                isMyTurn: (socket.id === rooms[roomId].currentTurn),
                progress: rooms[roomId].playerProgress[socket.id]
            });
            
            // Отправка истории чата (только сообщения игроков)
            if (chatHistory[roomId]) {
                const playerMessages = chatHistory[roomId].filter(msg => 
                    !msg.playerName.includes('Система') && 
                    !msg.message.includes('присоединился') &&
                    !msg.message.includes('покинул') &&
                    !msg.message.includes('бросил кубик') &&
                    !msg.message.includes('выполнил задание') &&
                    !msg.message.includes('построил') &&
                    !msg.message.includes('переместился')
                );
                if (playerMessages.length > 0) {
                    socket.emit('chat_history', playerMessages.slice(-20));
                }
            }
            
            // Уведомление других игроков
            socket.to(roomId).emit('player_joined', {
                playerId: socket.id,
                player: newPlayer,
                timestamp: new Date().toISOString()
            });
            
            // Отправка обновленного состояния комнаты всем
            io.to(roomId).emit('room_state', {
                players: rooms[roomId].players,
                currentTurn: rooms[roomId].currentTurn,
                turnOrder: rooms[roomId].turnOrder,
                serverTime: new Date().toISOString()
            });
            
            // Отправляем очередь ходов всем
            io.to(roomId).emit('turn_update', {
                currentTurn: rooms[roomId].currentTurn,
                turnOrder: rooms[roomId].turnOrder
            });
            
            // Рассылаем позиции всех игроков новому игроку
            const playersPositions = {};
            for (const playerId in rooms[roomId].players) {
                const player = rooms[roomId].players[playerId];
                if (player.connected) {
                    playersPositions[playerId] = {
                        name: player.name,
                        position: player.position,
                        city: player.city,
                        color: player.color,
                        coins: player.coins,
                        level: player.level
                    };
                }
            }
            
            socket.emit('all_players_positions', {
                players: playersPositions,
                timestamp: new Date().toISOString()
            });
            
            console.log(`👥 Игрок "${playerName}" присоединился к комнате ${roomId}`);
            
        } catch (error) {
            console.error('Ошибка в join-room:', error);
            socket.emit('room-error', { message: 'Внутренняя ошибка сервера' });
        }
    });
    
    // Получение состояния комнаты
    socket.on('get_room_state', () => {
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                socket.emit('room_state', {
                    players: rooms[roomId].players,
                    currentTurn: rooms[roomId].currentTurn,
                    turnOrder: rooms[roomId].turnOrder,
                    serverTime: new Date().toISOString()
                });
                break;
            }
        }
    });
    
    // Сообщения в чате - только игроки, системные сообщения не сохраняем в историю чата
    socket.on('chat_message', (data) => {
        try {
            const { message } = data;
            
            if (!message || message.trim().length === 0) {
                return;
            }
            
            // Ограничение длины сообщения
            const trimmedMessage = message.substring(0, 200).trim();
            
            for (const roomId in rooms) {
                if (rooms[roomId].players[socket.id]) {
                    const player = rooms[roomId].players[socket.id];
                    
                    const chatMessage = {
                        playerName: player.name,
                        message: trimmedMessage,
                        timestamp: new Date().toISOString(),
                        playerId: socket.id,
                        playerColor: player.color
                    };
                    
                    // Сохраняем в историю ТОЛЬКО сообщения игроков
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
            console.error('Ошибка обработки сообщения:', error);
        }
    });
    
    // Бросок кубика с проверкой очереди ходов
    socket.on('dice_roll', (data) => {
        try {
            const { diceValue, newPosition, task } = data;
            
            for (const roomId in rooms) {
                if (rooms[roomId].players[socket.id]) {
                    const player = rooms[roomId].players[socket.id];
                    
                    // Проверяем, чей сейчас ход
                    if (rooms[roomId].currentTurn !== socket.id) {
                        socket.emit('room-error', { message: 'Сейчас не ваш ход! Дождитесь своей очереди.' });
                        return;
                    }
                    
                    // Обновляем позицию игрока
                    player.position = newPosition;
                    if (task) {
                        player.currentTask = task;
                    }
                    player.lastActive = new Date().toISOString();
                    
                    // Определяем город на основе позиции
                    const cityCells = {
                        tver: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
                        kineshma: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
                        naberezhnye_chelny: [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43],
                        kazan: [47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58],
                        volgograd: [66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
                        astrakhan: [81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94]
                    };
                    
                    for (const [city, cells] of Object.entries(cityCells)) {
                        if (cells.includes(player.position)) {
                            player.city = city;
                            break;
                        }
                    }
                    
                    // Обновляем активность комнаты
                    rooms[roomId].lastActivity = new Date().toISOString();
                    
                    // Передаем ход следующему игроку
                    const currentIndex = rooms[roomId].turnOrder.indexOf(socket.id);
                    let nextIndex = (currentIndex + 1) % rooms[roomId].turnOrder.length;
                    
                    // Пропускаем отключенных игроков
                    let attempts = 0;
                    while (attempts < rooms[roomId].turnOrder.length) {
                        const nextPlayerId = rooms[roomId].turnOrder[nextIndex];
                        const nextPlayer = rooms[roomId].players[nextPlayerId];
                        
                        if (nextPlayer && nextPlayer.connected) {
                            rooms[roomId].currentTurn = nextPlayerId;
                            break;
                        }
                        
                        nextIndex = (nextIndex + 1) % rooms[roomId].turnOrder.length;
                        attempts++;
                    }
                    
                    // Отправляем обновление другим игрокам
                    socket.to(roomId).emit('player_dice_roll', {
                        playerId: socket.id,
                        playerName: player.name,
                        diceValue: diceValue,
                        newPosition: newPosition,
                        task: task,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Отправляем обновление позиции ВСЕМ игрокам
                    io.to(roomId).emit('player_position_update', {
                        playerId: socket.id,
                        playerName: player.name,
                        position: newPosition,
                        city: player.city,
                        color: player.color,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Отправляем обновленную очередь ходов
                    io.to(roomId).emit('turn_update', {
                        currentTurn: rooms[roomId].currentTurn,
                        turnOrder: rooms[roomId].turnOrder
                    });
                    
                    // Отправляем обновленное состояние комнаты
                    io.to(roomId).emit('room_state', {
                        players: rooms[roomId].players,
                        currentTurn: rooms[roomId].currentTurn,
                        turnOrder: rooms[roomId].turnOrder,
                        serverTime: new Date().toISOString()
                    });
                    
                    console.log(`🎲 Игрок ${player.name} бросил кубик: ${diceValue}, новая позиция: ${newPosition}, следующий ход: ${rooms[roomId].players[rooms[roomId].currentTurn]?.name}`);
                    break;
                }
            }
        } catch (error) {
            console.error('Ошибка при броске кубика:', error);
        }
    });
    
    // Обновление позиции игрока
    socket.on('player_position_update', (data) => {
        try {
            const { position, city, playerId } = data;
            const targetPlayerId = playerId || socket.id;
            
            for (const roomId in rooms) {
                if (rooms[roomId].players[targetPlayerId]) {
                    const player = rooms[roomId].players[targetPlayerId];
                    
                    // Обновляем позицию игрока
                    player.position = position;
                    if (city) {
                        player.city = city;
                    }
                    player.lastActive = new Date().toISOString();
                    
                    // Обновляем активность комнаты
                    rooms[roomId].lastActivity = new Date().toISOString();
                    
                    console.log(`📍 Игрок ${player.name} обновил позицию: ${position}, город: ${city}`);
                    
                    // Отправляем обновление позиции ВСЕМ другим игрокам в комнате
                    socket.to(roomId).emit('player_position_update', {
                        playerId: targetPlayerId,
                        playerName: player.name,
                        position: position,
                        city: city,
                        color: player.color,
                        timestamp: new Date().toISOString()
                    });
                    
                    break;
                }
            }
        } catch (error) {
            console.error('Ошибка при обновлении позиции:', error);
        }
    });
    
    // Запрос позиций всех игроков
    socket.on('request_all_positions', () => {
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                const playersPositions = {};
                
                // Собираем позиции всех подключенных игроков
                for (const playerId in rooms[roomId].players) {
                    const player = rooms[roomId].players[playerId];
                    if (player.connected) {
                        playersPositions[playerId] = {
                            name: player.name,
                            position: player.position,
                            city: player.city,
                            color: player.color,
                            coins: player.coins,
                            level: player.level,
                            isCurrent: playerId === socket.id
                        };
                    }
                }
                
                // Отправляем позиции всех игроков
                socket.emit('all_players_positions', {
                    players: playersPositions,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`🔄 Отправлены позиции всех игроков для ${socket.id}`);
                break;
            }
        }
    });
    
    // Обновление прогресса города
    socket.on('update_progress', (data) => {
        try {
            const { cityKey, progress, playerId } = data;
            const targetPlayerId = playerId || socket.id;
            
            for (const roomId in rooms) {
                if (rooms[roomId].players[targetPlayerId]) {
                    // Обновляем прогресс для конкретного игрока
                    if (!rooms[roomId].playerProgress) {
                        rooms[roomId].playerProgress = {};
                    }
                    if (!rooms[roomId].playerProgress[targetPlayerId]) {
                        rooms[roomId].playerProgress[targetPlayerId] = {};
                    }
                    
                    rooms[roomId].playerProgress[targetPlayerId][cityKey] = Math.min(100, Math.max(0, progress));
                    rooms[roomId].lastActivity = new Date().toISOString();
                    
                    // Обновляем прогресс у самого игрока
                    rooms[roomId].players[targetPlayerId].progress = rooms[roomId].playerProgress[targetPlayerId];
                    
                    // Отправляем обновление прогресса ВСЕМ игрокам
                    io.to(roomId).emit('progress_updated', {
                        playerId: targetPlayerId,
                        cityKey,
                        progress: rooms[roomId].playerProgress[targetPlayerId][cityKey],
                        timestamp: new Date().toISOString()
                    });
                    
                    console.log(`📊 Игрок ${rooms[roomId].players[targetPlayerId].name} обновил прогресс города ${cityKey}: ${progress}%`);
                    
                    // Проверяем, не завершена ли игра
                    checkGameCompletion(roomId, targetPlayerId);
                    break;
                }
            }
        } catch (error) {
            console.error('Ошибка при обновлении прогресса:', error);
        }
    });
    
    // Проверка завершения игры
    function checkGameCompletion(roomId, playerId) {
        const room = rooms[roomId];
        const player = room.players[playerId];
        
        if (!player || player.position < 94) return;
        
        // Проверяем, все ли города очищены на 100%
        const playerProgress = room.playerProgress[playerId];
        if (!playerProgress) return;
        
        let allCitiesCleaned = true;
        for (const cityKey in playerProgress) {
            if (playerProgress[cityKey] < 100) {
                allCitiesCleaned = false;
                break;
            }
        }
        
        if (allCitiesCleaned) {
            // Игра завершена!
            io.to(roomId).emit('game_completed', {
                winnerId: playerId,
                winnerName: player.name,
                timestamp: new Date().toISOString()
            });
            
            console.log(`🏆 Игрок ${player.name} выиграл игру в комнате ${roomId}!`);
        }
    }
    
    // Обновление данных игрока
    socket.on('player-update', (playerData) => {
        try {
            for (const roomId in rooms) {
                if (rooms[roomId].players[socket.id]) {
                    const oldPlayer = rooms[roomId].players[socket.id];
                    
                    rooms[roomId].players[socket.id] = {
                        ...oldPlayer,
                        ...playerData,
                        lastActive: new Date().toISOString()
                    };
                    
                    // Сохраняем прогресс, если он есть в данных
                    if (playerData.progress && rooms[roomId].playerProgress) {
                        rooms[roomId].playerProgress[socket.id] = playerData.progress;
                    }
                    
                    rooms[roomId].lastActivity = new Date().toISOString();
                    
                    io.to(roomId).emit('room_state', {
                        players: rooms[roomId].players,
                        currentTurn: rooms[roomId].currentTurn,
                        turnOrder: rooms[roomId].turnOrder,
                        serverTime: new Date().toISOString()
                    });
                    break;
                }
            }
        } catch (error) {
            console.error('Ошибка при обновлении игрока:', error);
        }
    });
    
    // Запрос на перемещение между городами (для уже пройденных)
    socket.on('move_to_city', (data) => {
        try {
            const { cityKey, playerId } = data;
            const targetPlayerId = playerId || socket.id;
            
            for (const roomId in rooms) {
                if (rooms[roomId].players[targetPlayerId]) {
                    const player = rooms[roomId].players[targetPlayerId];
                    const cityCells = {
                        tver: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
                        kineshma: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
                        naberezhnye_chelny: [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43],
                        kazan: [47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58],
                        volgograd: [66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
                        astrakhan: [81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94]
                    };
                    
                    if (cityCells[cityKey]) {
                        // Перемещаем игрока в начало города
                        player.position = cityCells[cityKey][0];
                        player.city = cityKey;
                        player.lastActive = new Date().toISOString();
                        
                        // Отправляем обновление всем
                        io.to(roomId).emit('player_position_update', {
                            playerId: targetPlayerId,
                            playerName: player.name,
                            position: player.position,
                            city: player.city,
                            color: player.color,
                            timestamp: new Date().toISOString()
                        });
                        
                        io.to(roomId).emit('room_state', {
                            players: rooms[roomId].players,
                            currentTurn: rooms[roomId].currentTurn,
                            turnOrder: rooms[roomId].turnOrder,
                            serverTime: new Date().toISOString()
                        });
                        
                        console.log(`🚗 Игрок ${player.name} переместился в город ${cityKey}`);
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('Ошибка при перемещении между городами:', error);
        }
    });
    
    // Пинг для проверки соединения
    socket.on('ping', (data) => {
        socket.emit('pong', {
            ...data,
            serverTime: new Date().toISOString(),
            latency: Date.now() - (data.clientTime || Date.now())
        });
    });
    
    // Игрок восстановил соединение
    socket.on('player_reconnected', () => {
        console.log(`🔄 Игрок ${socket.id} подтвердил восстановление соединения`);
        
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                const player = rooms[roomId].players[socket.id];
                player.connected = true;
                player.lastActive = new Date().toISOString();
                player.reconnected = true;
                
                // Уведомляем других игроков
                socket.to(roomId).emit('player_reconnected', {
                    playerId: socket.id,
                    playerName: player.name,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`✅ Игрок "${player.name}" полностью восстановил соединение`);
                
                // Отправляем обновленное состояние комнаты
                io.to(roomId).emit('room_state', {
                    players: rooms[roomId].players,
                    currentTurn: rooms[roomId].currentTurn,
                    turnOrder: rooms[roomId].turnOrder,
                    serverTime: new Date().toISOString()
                });
                
                // Отправляем позиции всех игроков
                const playersPositions = {};
                for (const playerId in rooms[roomId].players) {
                    const p = rooms[roomId].players[playerId];
                    if (p.connected) {
                        playersPositions[playerId] = {
                            name: p.name,
                            position: p.position,
                            city: p.city,
                            color: p.color,
                            coins: p.coins,
                            level: p.level
                        };
                    }
                }
                
                socket.emit('all_players_positions', {
                    players: playersPositions,
                    timestamp: new Date().toISOString()
                });
                
                break;
            }
        }
    });
    
    // Игрок покинул комнату намеренно
    socket.on('player-left', () => {
        console.log(`🚪 Игрок ${socket.id} намеренно покинул комнату`);
        
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                const player = rooms[roomId].players[socket.id];
                
                // Удаляем игрока из комнаты
                delete rooms[roomId].players[socket.id];
                
                // Удаляем прогресс игрока
                if (rooms[roomId].playerProgress && rooms[roomId].playerProgress[socket.id]) {
                    delete rooms[roomId].playerProgress[socket.id];
                }
                
                // Удаляем сессию игрока
                for (const sessionKey in playerSessions) {
                    if (playerSessions[sessionKey] === socket.id) {
                        delete playerSessions[sessionKey];
                        break;
                    }
                }
                
                // Удаляем игрока из очереди ходов
                const turnIndex = rooms[roomId].turnOrder.indexOf(socket.id);
                if (turnIndex !== -1) {
                    rooms[roomId].turnOrder.splice(turnIndex, 1);
                    
                    // Если удалили текущего игрока, передаем ход следующему
                    if (rooms[roomId].currentTurn === socket.id && rooms[roomId].turnOrder.length > 0) {
                        // Находим следующего подключенного игрока
                        let nextIndex = 0;
                        while (nextIndex < rooms[roomId].turnOrder.length) {
                            const nextPlayerId = rooms[roomId].turnOrder[nextIndex];
                            const nextPlayer = rooms[roomId].players[nextPlayerId];
                            if (nextPlayer && nextPlayer.connected) {
                                rooms[roomId].currentTurn = nextPlayerId;
                                break;
                            }
                            nextIndex++;
                        }
                    }
                    
                    // Если очередь опустела, сбрасываем текущего игрока
                    if (rooms[roomId].turnOrder.length === 0) {
                        rooms[roomId].currentTurn = null;
                    }
                }
                
                // Уведомляем других игроков
                socket.to(roomId).emit('player_left', {
                    playerId: socket.id,
                    playerName: player.name,
                    reason: 'покинул комнату',
                    timestamp: new Date().toISOString()
                });
                
                console.log(`👋 Игрок "${player.name}" покинул комнату ${roomId}`);
                
                // Очищаем историю чата для этого игрока
                if (chatHistory[roomId]) {
                    chatHistory[roomId] = chatHistory[roomId].filter(msg => 
                        msg.playerId !== socket.id
                    );
                    console.log(`🧹 Очищены сообщения игрока ${player.name} из истории чата`);
                }
                
                // Если комната пуста, планируем удаление через 30 минут
                if (Object.keys(rooms[roomId].players).length === 0) {
                    console.log(`⏱️ Комната ${roomId} пуста, планируем удаление через 30 минут`);
                    
                    if (roomTimeouts[roomId]) {
                        clearTimeout(roomTimeouts[roomId]);
                    }
                    
                    roomTimeouts[roomId] = setTimeout(() => {
                        if (rooms[roomId] && Object.keys(rooms[roomId].players).length === 0) {
                            delete rooms[roomId];
                            delete chatHistory[roomId];
                            delete roomTimeouts[roomId];
                            console.log(`🗑️ Удалена пустая комната ${roomId} после таймаута`);
                        }
                    }, 30 * 60 * 1000);
                } else {
                    // Отправляем обновленное состояние
                    io.to(roomId).emit('room_state', {
                        players: rooms[roomId].players,
                        currentTurn: rooms[roomId].currentTurn,
                        turnOrder: rooms[roomId].turnOrder,
                        serverTime: new Date().toISOString()
                    });
                    
                    // Отправляем обновление очереди ходов
                    io.to(roomId).emit('turn_update', {
                        currentTurn: rooms[roomId].currentTurn,
                        turnOrder: rooms[roomId].turnOrder
                    });
                }
                
                break;
            }
        }
    });
    
    // Отключение игрока
    socket.on('disconnect', (reason) => {
        console.log(`❌ Отключение: ${socket.id}, причина: ${reason}`);
        
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                const player = rooms[roomId].players[socket.id];
                
                // Помечаем как отключенного, но не удаляем сразу
                rooms[roomId].players[socket.id].connected = false;
                rooms[roomId].players[socket.id].disconnectedAt = new Date().toISOString();
                rooms[roomId].lastActivity = new Date().toISOString();
                
                // Если это текущий игрок в очереди, передаем ход следующему
                if (rooms[roomId].currentTurn === socket.id) {
                    const currentIndex = rooms[roomId].turnOrder.indexOf(socket.id);
                    let nextIndex = (currentIndex + 1) % rooms[roomId].turnOrder.length;
                    
                    // Пропускаем отключенных игроков
                    let attempts = 0;
                    while (attempts < rooms[roomId].turnOrder.length) {
                        const nextPlayerId = rooms[roomId].turnOrder[nextIndex];
                        const nextPlayer = rooms[roomId].players[nextPlayerId];
                        
                        if (nextPlayer && nextPlayer.connected) {
                            rooms[roomId].currentTurn = nextPlayerId;
                            break;
                        }
                        
                        nextIndex = (nextIndex + 1) % rooms[roomId].turnOrder.length;
                        attempts++;
                    }
                    
                    // Отправляем обновление очереди всем
                    io.to(roomId).emit('turn_update', {
                        currentTurn: rooms[roomId].currentTurn,
                        turnOrder: rooms[roomId].turnOrder
                    });
                }
                
                // Уведомляем других игроков
                socket.to(roomId).emit('player_left', {
                    playerId: socket.id,
                    playerName: player.name,
                    reason: reason,
                    timestamp: new Date().toISOString()
                });
                
                // Отправляем обновленное состояние
                io.to(roomId).emit('room_state', {
                    players: rooms[roomId].players,
                    currentTurn: rooms[roomId].currentTurn,
                    turnOrder: rooms[roomId].turnOrder,
                    serverTime: new Date().toISOString()
                });
                
                console.log(`👋 Игрок "${player.name}" отключился (${reason})`);
                
                // Удаляем через 5 минут неактивности (если не переподключится)
                setTimeout(() => {
                    if (rooms[roomId] && 
                        rooms[roomId].players[socket.id] && 
                        !rooms[roomId].players[socket.id].connected) {
                        
                        // Удаляем прогресс игрока
                        if (rooms[roomId].playerProgress && rooms[roomId].playerProgress[socket.id]) {
                            delete rooms[roomId].playerProgress[socket.id];
                        }
                        
                        // Удаляем сессию игрока
                        for (const sessionKey in playerSessions) {
                            if (playerSessions[sessionKey] === socket.id) {
                                delete playerSessions[sessionKey];
                                break;
                            }
                        }
                        
                        // Удаляем игрока из очереди ходов
                        const turnIndex = rooms[roomId].turnOrder.indexOf(socket.id);
                        if (turnIndex !== -1) {
                            rooms[roomId].turnOrder.splice(turnIndex, 1);
                            
                            // Если удалили текущего игрока, передаем ход следующему
                            if (rooms[roomId].currentTurn === socket.id && rooms[roomId].turnOrder.length > 0) {
                                // Находим следующего подключенного игрока
                                let nextIndex = 0;
                                while (nextIndex < rooms[roomId].turnOrder.length) {
                                    const nextPlayerId = rooms[roomId].turnOrder[nextIndex];
                                    const nextPlayer = rooms[roomId].players[nextPlayerId];
                                    if (nextPlayer && nextPlayer.connected) {
                                        rooms[roomId].currentTurn = nextPlayerId;
                                        break;
                                    }
                                    nextIndex++;
                                }
                                
                                // Если нет подключенных игроков
                                if (nextIndex >= rooms[roomId].turnOrder.length) {
                                    rooms[roomId].currentTurn = null;
                                }
                            }
                        }
                        
                        delete rooms[roomId].players[socket.id];
                        console.log(`🗑️ Удален неактивный игрок "${player.name}" из комнаты ${roomId}`);
                        
                        // Если комната пуста, планируем удаление через 30 минут
                        if (Object.keys(rooms[roomId].players).length === 0) {
                            console.log(`⏱️ Комната ${roomId} пуста, планируем удаление через 30 минут`);
                            
                            if (roomTimeouts[roomId]) {
                                clearTimeout(roomTimeouts[roomId]);
                            }
                            
                            roomTimeouts[roomId] = setTimeout(() => {
                                if (rooms[roomId] && Object.keys(rooms[roomId].players).length === 0) {
                                    delete rooms[roomId];
                                    delete chatHistory[roomId];
                                    delete roomTimeouts[roomId];
                                    console.log(`🗑️ Удалена пустая комната ${roomId} после таймаута`);
                                }
                            }, 30 * 60 * 1000);
                        } else {
                            // Отправляем обновленное состояние
                            io.to(roomId).emit('room_state', {
                                players: rooms[roomId].players,
                                currentTurn: rooms[roomId].currentTurn,
                                turnOrder: rooms[roomId].turnOrder,
                                serverTime: new Date().toISOString()
                            });
                            
                            // Отправляем обновление очереди ходов
                            io.to(roomId).emit('turn_update', {
                                currentTurn: rooms[roomId].currentTurn,
                                turnOrder: rooms[roomId].turnOrder
                            });
                        }
                    }
                }, 5 * 60 * 1000);
                
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
        if (room.lastActivity) {
            const lastActivity = new Date(room.lastActivity);
            const hoursDiff = (now - lastActivity) / (1000 * 60 * 60);
            
            // Удаляем комнаты без активности более 48 часов
            if (hoursDiff > 48) {
                delete rooms[roomId];
                delete chatHistory[roomId];
                if (roomTimeouts[roomId]) {
                    clearTimeout(roomTimeouts[roomId]);
                    delete roomTimeouts[roomId];
                }
                cleanedCount++;
                console.log(`🧹 Очищена неактивная комната ${roomId} (более 48 часов)`);
            }
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`🧹 Очищено ${cleanedCount} неактивных комнат`);
    }
}, 60 * 60 * 1000);

// ==================== ЗАПУСК СЕРВЕРА ====================

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log(`🚀 Сервер "Юный эколог" успешно запущен!`);
    console.log(`📍 Порт: ${PORT}`);
    console.log(`📁 Директория: ${__dirname}`);
    console.log(`🌐 Локальный URL: http://localhost:${PORT}`);
    console.log(`📊 API статуса: http://localhost:${PORT}/api/status`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 WebSocket: ws://localhost:${PORT}`);
    console.log('='.repeat(60));
    
    // Информация о Render окружении
    if (process.env.RENDER) {
        console.log(`🌍 Сервер развернут на Render.com`);
        if (process.env.RENDER_EXTERNAL_URL) {
            console.log(`🔗 Внешний URL: ${process.env.RENDER_EXTERNAL_URL}`);
            console.log(`⚡ WebSocket URL: wss://${process.env.RENDER_EXTERNAL_URL.replace('https://', '')}`);
        }
    }
    
    // Системная информация
    console.log(`🖥️  Платформа: ${process.platform}`);
    console.log(`📦 Версия Node: ${process.version}`);
    console.log(`💾 Память: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log('='.repeat(60));
});

// Обработка ошибок сервера
server.on('error', (error) => {
    console.error('❌ Критическая ошибка сервера:', error);
    
    if (error.code === 'EADDRINUSE') {
        console.error(`   Порт ${PORT} уже используется.`);
        console.error('   Попробуйте изменить переменную окружения PORT');
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
