const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Улучшенные настройки CORS для публичного доступа
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: false
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

app.use(express.static(path.join(__dirname, 'public')));

// Добавляем middleware для безопасности
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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
    console.log('🔗 Новое подключение:', socket.id);

    // Получить список доступных лобби
    socket.on('get_lobbies', () => {
        const lobbyList = Array.from(lobbies.entries()).map(([id, lobby]) => ({
            id,
            playerCount: Object.keys(lobby.players).length,
            created: lobby.created,
            players: Object.values(lobby.players).map(p => p.name)
        }));
        
        socket.emit('lobby_list', lobbyList);
    });

    // Создать или присоединиться к лобби
    socket.on('join-room', (data) => {
        const { roomId, playerName, isNewRoom = false } = data;
        
        // Проверяем имя игрока
        if (!playerName || playerName.trim().length < 2) {
            socket.emit('room-error', 'Имя должно содержать минимум 2 символа');
            return;
        }

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
        
        // Проверяем нет ли игрока с таким именем
        const existingPlayer = Object.values(lobby.players).find(p => p.name === playerName);
        if (existingPlayer) {
            socket.emit('room-error', 'Игрок с таким именем уже есть в лобби');
            return;
        }

        // Проверяем лимит игроков
        if (Object.keys(lobby.players).length >= lobby.maxPlayers) {
            socket.emit('room-error', 'Лобби заполнено');
            return;
        }

        const playerId = socket.id;
        const player = {
            id: playerId,
            name: playerName,
            position: 0,
            city: "tver",
            coins: 100,
            cleaningPoints: 0,
            buildings: [],
            level: 1,
            completedTasks: 0,
            color: getPlayerColor(Object.keys(lobby.players).length),
            currentTask: null,
            currentDifficulty: "easy",
            connected: true
        };

        // Добавляем игрока
        lobby.players[playerId] = player;
        socket.playerId = playerId;
        socket.lobbyId = targetLobbyId;
        
        socket.join(targetLobbyId);
        
        // Отправляем успешное присоединение
        socket.emit('join-success', player);

        // Отправляем состояние лобби всем игрокам в комнате
        io.to(targetLobbyId).emit('room_state', {
            players: lobby.players,
            cityProgress: lobby.cityProgress
        });

        // Уведомляем других игроков
        socket.to(targetLobbyId).emit('player_joined', {
            playerId,
            player
        });

        console.log(`🎮 ${playerName} присоединился к лобби ${targetLobbyId}`);
        console.log(`👥 Лобби ${targetLobbyId}: ${Object.keys(lobby.players).length}/6 игроков`);
    });

    // Чат
    socket.on('chat_message', (data) => {
        if (socket.lobbyId && socket.playerId) {
            const lobby = lobbies.get(socket.lobbyId);
            const player = lobby.players[socket.playerId];
            
            io.to(socket.lobbyId).emit('new_chat_message', {
                playerId: socket.playerId,
                playerName: player.name,
                message: data.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // Игровые события
    socket.on('dice_roll', (data) => {
        if (socket.lobbyId && socket.playerId) {
            const lobby = lobbies.get(socket.lobbyId);
            if (lobby && lobby.players[socket.playerId]) {
                lobby.players[socket.playerId].position = data.newPosition;
                lobby.players[socket.playerId].currentTask = data.task;
                
                socket.to(socket.lobbyId).emit('player_dice_roll', data);
            }
        }
    });

    socket.on('update_progress', (data) => {
        if (socket.lobbyId) {
            const lobby = lobbies.get(socket.lobbyId);
            if (lobby) {
                lobby.cityProgress[data.cityKey] = data.progress;
                io.to(socket.lobbyId).emit('progress_updated', data);
            }
        }
    });

    socket.on('player-update', (data) => {
        if (socket.lobbyId && socket.playerId) {
            const lobby = lobbies.get(socket.lobbyId);
            if (lobby && lobby.players[socket.playerId]) {
                // Обновляем данные игрока
                Object.assign(lobby.players[socket.playerId], data);
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

                console.log(`🚪 ${playerName} покинул лобби ${socket.lobbyId}`);
            }
        }
    });

    // Пинг для проверки связи
    socket.on('ping', (cb) => {
        if (typeof cb === 'function') {
            cb({ pong: Date.now(), lobbyId: socket.lobbyId });
        }
    });
});

// Вспомогательные функции
function generateLobbyId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getPlayerColor(index) {
    const colors = ['#4ecdc4', '#ff6b6b', '#2ecc71', '#f39c12', '#9b59b6', '#3498db'];
    return colors[index % colors.length];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🎮 ЭКО-ИГРА ЗАПУЩЕНА!');
    console.log(`📍 Порт: ${PORT}`);
    console.log(`🌐 Доступна по адресу: http://localhost:${PORT}`);
    console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(60));
});