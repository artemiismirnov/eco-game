const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Улучшенные настройки CORS для публичного доступа
const io = socketIo(server, {
    cors: {
        origin: "*", // Разрешаем все источники для тестирования
        methods: ["GET", "POST"],
        credentials: false
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
});

app.use(express.static(path.join(__dirname, 'public')));

// Добавляем middleware для безопасности
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    next();
});

// Хранилище лобби
const lobbies = new Map();

// Автоматическая очистка пустых лобби каждые 5 минут
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [lobbyId, lobby] of lobbies.entries()) {
        // Удаляем лобби, пустые более 30 минут
        if (Object.keys(lobby.players).length === 0 && 
            now - new Date(lobby.created).getTime() > 30 * 60 * 1000) {
            lobbies.delete(lobbyId);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`🧹 Очищено ${cleaned} пустых лобби`);
    }
}, 5 * 60 * 1000);

io.on('connection', (socket) => {
    console.log('🔗 Новое подключение:', socket.id, 'from', socket.handshake.headers.origin || socket.handshake.address);

    // Отправляем подтверждение подключения
    socket.emit('connection_confirmed', { 
        message: 'Connected to server',
        socketId: socket.id,
        timestamp: new Date().toISOString()
    });

    // Получить список доступных лобби
    socket.on('get_lobbies', () => {
        const lobbyList = Array.from(lobbies.entries()).map(([id, lobby]) => ({
            id,
            playerCount: Object.keys(lobby.players).length,
            created: lobby.created,
            players: Object.values(lobby.players).map(p => p.name),
            cityProgress: lobby.cityProgress
        }));
        
        socket.emit('lobby_list', lobbyList);
    });

    // Создать или присоединиться к лобби
    socket.on('join-room', (data) => {
        const { roomId, playerName, isNewRoom = false } = data;
        
        console.log(`🎮 Запрос на присоединение: ${playerName} к комнате ${roomId}, новый: ${isNewRoom}`);
        
        // Проверяем имя игрока
        if (!playerName || playerName.trim().length < 2) {
            socket.emit('room-error', 'Имя должно содержать минимум 2 символа');
            return;
        }

        // Очищаем имя от лишних пробелов
        const cleanPlayerName = playerName.trim();
        
        let targetLobbyId = roomId;
        
        // Создаем новое лобби если нужно
        if (isNewRoom || !lobbies.has(roomId)) {
            targetLobbyId = generateLobbyId();
            lobbies.set(targetLobbyId, {
                players: {},
                cityProgress: { 
                    tver: 0, 
                    kineshma: 0, 
                    naberezhnye_chelny: 0, 
                    kazan: 0, 
                    volgograd: 0, 
                    astrakhan: 0 
                },
                created: new Date().toISOString(),
                maxPlayers: 6
            });
            console.log(`🆕 Создано лобби: ${targetLobbyId}`);
        }

        const lobby = lobbies.get(targetLobbyId);
        
        if (!lobby) {
            socket.emit('room-error', 'Лобби не найдено');
            return;
        }
        
        // Проверяем нет ли игрока с таким именем (игнорируем регистр)
        const existingPlayer = Object.values(lobby.players).find(p => 
            p.name.toLowerCase() === cleanPlayerName.toLowerCase() && p.connected
        );
        if (existingPlayer) {
            socket.emit('room-error', 'Игрок с таким именем уже есть в лобби');
            return;
        }

        // Проверяем лимит игроков
        const activePlayers = Object.values(lobby.players).filter(p => p.connected).length;
        if (activePlayers >= lobby.maxPlayers) {
            socket.emit('room-error', 'Лобби заполнено (максимум 6 игроков)');
            return;
        }

        const playerId = socket.id;
        const player = {
            id: playerId,
            name: cleanPlayerName,
            position: 1,
            city: "tver",
            coins: 100,
            cleaningPoints: 0,
            buildings: [],
            level: 1,
            completedTasks: 0,
            color: getPlayerColor(activePlayers),
            currentTask: null,
            currentDifficulty: "easy",
            connected: true,
            joinedAt: new Date().toISOString()
        };

        // Добавляем игрока
        lobby.players[playerId] = player;
        socket.playerId = playerId;
        socket.lobbyId = targetLobbyId;
        socket.playerName = cleanPlayerName;
        
        // Присоединяемся к комнате
        socket.join(targetLobbyId);
        
        console.log(`✅ ${cleanPlayerName} присоединился к лобби ${targetLobbyId}`);
        console.log(`👥 Лобби ${targetLobbyId}: ${activePlayers + 1}/${lobby.maxPlayers} игроков`);
        
        // Отправляем успешное присоединение
        socket.emit('join-success', { 
            ...player,
            roomId: targetLobbyId
        });

        // Отправляем состояние лобби всем игрокам в комнате
        io.to(targetLobbyId).emit('room_state', {
            players: lobby.players,
            cityProgress: lobby.cityProgress,
            roomId: targetLobbyId
        });

        // Уведомляем других игроков о новом игроке
        socket.to(targetLobbyId).emit('player_joined', {
            playerId,
            player
        });

        // Отправляем историю сообщений новому игроку
        if (lobby.messages) {
            socket.emit('chat_history', lobby.messages.slice(-50)); // Последние 50 сообщений
        }
    });

    // Чат
    socket.on('chat_message', (data) => {
        if (socket.lobbyId && socket.playerId) {
            const lobby = lobbies.get(socket.lobbyId);
            const player = lobby.players[socket.playerId];
            
            if (!player) return;
            
            // Ограничиваем длину сообщения
            const message = String(data.message || '').substring(0, 500);
            
            // Создаем объект сообщения
            const chatMessage = {
                playerId: socket.playerId,
                playerName: player.name,
                message: message,
                timestamp: new Date().toISOString(),
                color: player.color
            };
            
            // Сохраняем сообщение в истории лобби
            if (!lobby.messages) {
                lobby.messages = [];
            }
            lobby.messages.push(chatMessage);
            
            // Отправляем сообщение всем в комнате
            io.to(socket.lobbyId).emit('new_chat_message', chatMessage);
            
            console.log(`💬 ${player.name} в ${socket.lobbyId}: ${message.substring(0, 50)}...`);
        }
    });

    // Игровые события
    socket.on('dice_roll', (data) => {
        if (socket.lobbyId && socket.playerId) {
            const lobby = lobbies.get(socket.lobbyId);
            if (lobby && lobby.players[socket.playerId]) {
                lobby.players[socket.playerId].position = data.newPosition;
                lobby.players[socket.playerId].currentTask = data.task;
                
                // Отправляем обновленное состояние
                io.to(socket.lobbyId).emit('room_state', {
                    players: lobby.players,
                    cityProgress: lobby.cityProgress
                });
                
                // Отправляем событие броска кубика
                socket.to(socket.lobbyId).emit('player_dice_roll', {
                    ...data,
                    playerId: socket.playerId
                });
                
                console.log(`🎲 ${lobby.players[socket.playerId].name} бросил кубик: ${data.diceValue}`);
            }
        }
    });

    socket.on('update_progress', (data) => {
        if (socket.lobbyId) {
            const lobby = lobbies.get(socket.lobbyId);
            if (lobby) {
                lobby.cityProgress[data.cityKey] = data.progress;
                
                // Отправляем обновление всем игрокам
                io.to(socket.lobbyId).emit('progress_updated', data);
                
                // Отправляем полное состояние комнаты
                io.to(socket.lobbyId).emit('room_state', {
                    players: lobby.players,
                    cityProgress: lobby.cityProgress
                });
                
                console.log(`📈 Прогресс ${data.cityKey}: ${data.progress}%`);
            }
        }
    });

    socket.on('player-update', (data) => {
        if (socket.lobbyId && socket.playerId) {
            const lobby = lobbies.get(socket.lobbyId);
            if (lobby && lobby.players[socket.playerId]) {
                // Обновляем данные игрока
                Object.assign(lobby.players[socket.playerId], data);
                
                // Отправляем обновленное состояние всем
                io.to(socket.lobbyId).emit('room_state', {
                    players: lobby.players,
                    cityProgress: lobby.cityProgress
                });
            }
        }
    });

    // Отслеживание активности
    socket.on('disconnect', (reason) => {
        console.log('❌ Отключение:', socket.id, reason);
        
        if (socket.lobbyId && socket.playerId) {
            const lobby = lobbies.get(socket.lobbyId);
            if (lobby && lobby.players[socket.playerId]) {
                const playerName = lobby.players[socket.playerId].name;
                
                // Помечаем игрока как отключенного
                lobby.players[socket.playerId].connected = false;
                
                // Уведомляем других игроков
                socket.to(socket.lobbyId).emit('player_left', {
                    playerId: socket.playerId,
                    playerName: playerName
                });

                // Отправляем обновленное состояние
                io.to(socket.lobbyId).emit('room_state', {
                    players: lobby.players,
                    cityProgress: lobby.cityProgress
                });

                console.log(`🚪 ${playerName} покинул лобби ${socket.lobbyId}`);
                
                // Удаляем лобби если оно пустое
                const activePlayers = Object.values(lobby.players).filter(p => p.connected).length;
                if (activePlayers === 0) {
                    console.log(`🗑️ Лобби ${socket.lobbyId} пустое, готово к удалению`);
                }
            }
        }
    });

    // Пинг для проверки связи
    socket.on('ping', (cb) => {
        if (typeof cb === 'function') {
            cb({ 
                pong: Date.now(), 
                lobbyId: socket.lobbyId,
                playerId: socket.playerId,
                serverTime: new Date().toISOString()
            });
        }
    });

    // Запрос состояния комнаты
    socket.on('get_room_state', () => {
        if (socket.lobbyId) {
            const lobby = lobbies.get(socket.lobbyId);
            if (lobby) {
                socket.emit('room_state', {
                    players: lobby.players,
                    cityProgress: lobby.cityProgress,
                    roomId: socket.lobbyId
                });
            }
        }
    });
});

// Вспомогательные функции
function generateLobbyId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function getPlayerColor(index) {
    const colors = [
        '#4ecdc4', // Бирюзовый
        '#ff6b6b', // Красный
        '#2ecc71', // Зеленый
        '#f39c12', // Оранжевый
        '#9b59b6', // Фиолетовый
        '#3498db'  // Синий
    ];
    return colors[index % colors.length];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🎮 ЭКО-ИГРА ЗАПУЩЕНА!');
    console.log(`📍 Порт: ${PORT}`);
    console.log(`🌐 Доступна по адресу: http://localhost:${PORT}`);
    console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🕒 Время запуска: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));
});
