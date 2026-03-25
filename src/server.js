const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Настройки CORS для публичного доступа на Render
app.use(cors());

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: false
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
});

// КРИТИЧНО: Отдаем статические файлы (HTML, CSS, JS, картинки)
app.use(express.static(__dirname));

// Хранилище лобби (комнат)
const lobbies = new Map();

// Автоматическая очистка пустых лобби каждые 5 минут
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [lobbyId, lobby] of lobbies.entries()) {
        const activePlayers = Object.values(lobby.players).filter(p => p.connected).length;
        if (activePlayers === 0 && now - new Date(lobby.created).getTime() > 30 * 60 * 1000) {
            lobbies.delete(lobbyId);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`🧹 Очищено ${cleaned} пустых лобби`);
    }
}, 5 * 60 * 1000);

function advanceTurn(lobby) {
    if (!lobby || lobby.turnOrder.length === 0) return null;

    let currentIndex = lobby.turnOrder.indexOf(lobby.currentTurn);
    let nextIndex = (currentIndex + 1) % lobby.turnOrder.length;
    
    let attempts = 0;
    while (!lobby.players[lobby.turnOrder[nextIndex]].connected && attempts < lobby.turnOrder.length) {
        nextIndex = (nextIndex + 1) % lobby.turnOrder.length;
        attempts++;
    }
    
    lobby.currentTurn = lobby.turnOrder[nextIndex];
    return lobby.currentTurn;
}

function getRandomColor(playerId) {
    const colors = ['#2ecc71', '#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#e67e22', '#4ecdc4', '#ff6b6b', '#1dd1a1', '#54a0ff'];
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
        hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

io.on('connection', (socket) => {
    console.log(`🔗 Новое подключение: ${socket.id}`);

    socket.emit('connection_confirmed', { 
        message: 'Connected to server',
        socketId: socket.id
    });

    // === ПРИСОЕДИНЕНИЕ К ЛОББИ ===
    socket.on('join-room', (data) => {
        const { roomId, playerName, isNewRoom = false } = data;
        
        if (!playerName || playerName.trim().length < 2) {
            return socket.emit('room-error', 'Имя должно содержать минимум 2 символа');
        }

        const cleanPlayerName = playerName.trim();
        
        if (isNewRoom && !lobbies.has(roomId)) {
            lobbies.set(roomId, {
                players: {}, turnOrder: [], currentTurn: null, cityProgress: {}, playerProgress: {}, messages: [], created: new Date().toISOString(), maxPlayers: 6
            });
            console.log(`🆕 Создано лобби: ${roomId}`);
        } else if (isNewRoom && lobbies.has(roomId)) {
            return socket.emit('room-error', 'Лобби с таким номером уже существует!');
        } else if (!isNewRoom && !lobbies.has(roomId)) {
            return socket.emit('room-error', 'Лобби не найдено');
        }

        const lobby = lobbies.get(roomId);

        // Восстановление сессии
        const existingDisconnectedPlayer = Object.values(lobby.players).find(p => 
            p.name.toLowerCase() === cleanPlayerName.toLowerCase() && !p.connected
        );
        const existingActivePlayer = Object.values(lobby.players).find(p => 
            p.name.toLowerCase() === cleanPlayerName.toLowerCase() && p.connected
        );

        if (existingActivePlayer) {
            return socket.emit('room-error', 'Игрок с таким именем уже играет в этой комнате');
        }

        if (existingDisconnectedPlayer) {
            const playerId = existingDisconnectedPlayer.id;
            const player = lobby.players[playerId];
            player.connected = true; 
            
            socket.playerId = playerId;
            socket.lobbyId = roomId;
            socket.playerName = cleanPlayerName;
            socket.join(roomId);
            
            console.log(`🔄 ${cleanPlayerName} успешно вернулся в лобби ${roomId}`);
            
            socket.emit('join-success', { 
                ...player, 
                roomId: roomId, 
                currentTurn: lobby.currentTurn, 
                turnOrder: lobby.turnOrder, 
                playerProgress: lobby.playerProgress[playerId],
                isReconnect: true // Флаг переподключения (не показывать окно цвета)
            });
            
            io.to(roomId).emit('room_state', { players: lobby.players, cityProgress: lobby.cityProgress, roomId: roomId });
            socket.to(roomId).emit('player_reconnected', { playerId: playerId, playerName: player.name });

            if (lobby.messages) {
                socket.emit('chat_history', lobby.messages.slice(-50));
            }
            return; 
        }
        
        // Лимит игроков
        const activePlayers = Object.values(lobby.players).filter(p => p.connected).length;
        if (activePlayers >= lobby.maxPlayers) {
            return socket.emit('room-error', 'Лобби заполнено (максимум 6 игроков)');
        }

        const isFirstPlayer = Object.keys(lobby.players).length === 0;

        // Определяем свободные цвета, чтобы случайно не выдать занятый
        const takenColors = Object.values(lobby.players).map(p => p.color);
        let assignedColor = getRandomColor(socket.id);
        const mainColors = ['#2ecc71', '#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#e67e22'];
        const freeColors = mainColors.filter(c => !takenColors.includes(c));
        
        if (freeColors.length > 0 && takenColors.includes(assignedColor)) {
            assignedColor = freeColors[0];
        }

        const player = {
            id: socket.id, name: cleanPlayerName, position: 1, city: "tver", coins: 100, cleaningPoints: 0, buildings: [], level: 1, completedTasks: 0, 
            color: assignedColor, 
            connected: true
        };

        lobby.players[socket.id] = player;
        socket.lobbyId = roomId;
        socket.playerId = socket.id;

        if (!lobby.turnOrder.includes(socket.id)) lobby.turnOrder.push(socket.id);
        if (isFirstPlayer) lobby.currentTurn = socket.id;
        if (!lobby.playerProgress[socket.id]) lobby.playerProgress[socket.id] = {};

        socket.join(roomId);
        console.log(`✅ ${cleanPlayerName} присоединился к лобби ${roomId}`);
        
        // Отправляем успешный вход с флагом isReconnect = false и списком занятых цветов
        socket.emit('join-success', { 
            ...player, 
            roomId: roomId, 
            currentTurn: lobby.currentTurn, 
            turnOrder: lobby.turnOrder, 
            playerProgress: lobby.playerProgress[socket.id],
            isReconnect: false,
            takenColors: takenColors
        });
        
        if (lobby.messages.length > 0) socket.emit('chat_history', lobby.messages);
        socket.to(roomId).emit('player_joined', { playerId: socket.id, player: player });
    });

    // === ИЗМЕНЕНИЕ ЦВЕТА ФИШКИ ===
    socket.on('change_color', (data) => {
        if (!socket.lobbyId || !socket.playerId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby && lobby.players[socket.playerId]) {
            lobby.players[socket.playerId].color = data.color;
            // Уведомляем всех в комнате о смене цвета
            io.to(socket.lobbyId).emit('player_color_updated', {
                playerId: socket.playerId,
                color: data.color
            });
        }
    });

    socket.on('request_all_positions', () => {
        if (!socket.lobbyId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby) socket.emit('all_players_positions', { players: lobby.players });
    });

    socket.on('player_position_update', (data) => {
        if (!socket.lobbyId || !socket.playerId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby && lobby.players[socket.playerId]) {
            const player = lobby.players[socket.playerId];
            player.position = data.position;
            player.city = data.city;
            socket.to(socket.lobbyId).emit('player_position_update', { playerId: socket.playerId, playerName: player.name, position: data.position, city: data.city, color: player.color });
        }
    });

    socket.on('end_turn', () => {
        if (!socket.lobbyId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby) {
            const nextTurnId = advanceTurn(lobby);
            io.to(socket.lobbyId).emit('turn_update', { currentTurn: nextTurnId, turnOrder: lobby.turnOrder });
        }
    });

    socket.on('player-update', (data) => {
        if (!socket.lobbyId || !socket.playerId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby && lobby.players[socket.playerId]) {
            Object.assign(lobby.players[socket.playerId], data);
            if (data.progress) lobby.playerProgress[socket.playerId] = data.progress;
        }
    });

    socket.on('update_progress', (data) => {
        if (!socket.lobbyId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby) {
            if (!lobby.playerProgress[data.playerId]) lobby.playerProgress[data.playerId] = {};
            lobby.playerProgress[data.playerId][data.cityKey] = data.progress;
            io.to(socket.lobbyId).emit('progress_updated', data);
        }
    });

    socket.on('chat_message', (data) => {
        if (!socket.lobbyId || !socket.playerId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby && lobby.players[socket.playerId]) {
            const msgObj = { playerName: lobby.players[socket.playerId].name, message: data.message };
            lobby.messages.push(msgObj);
            if (lobby.messages.length > 50) lobby.messages.shift();
            io.to(socket.lobbyId).emit('new_chat_message', msgObj);
        }
    });

    socket.on('get_room_state', () => {
        if (!socket.lobbyId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby) socket.emit('room_state', { players: lobby.players, cityProgress: lobby.cityProgress, playerProgress: lobby.playerProgress, currentTurn: lobby.currentTurn, turnOrder: lobby.turnOrder });
    });

    socket.on('leave-room', () => {
        handleDisconnect(socket);
        socket.leave(socket.lobbyId);
        socket.lobbyId = null;
    });

    socket.on('disconnect', () => handleDisconnect(socket));
});

function handleDisconnect(socket) {
    if (!socket.lobbyId || !socket.playerId) return;
    const lobby = lobbies.get(socket.lobbyId);
    
    if (lobby && lobby.players[socket.playerId]) {
        lobby.players[socket.playerId].connected = false;
        
        if (lobby.currentTurn === socket.playerId) {
            advanceTurn(lobby);
            io.to(socket.lobbyId).emit('turn_update', { currentTurn: lobby.currentTurn, turnOrder: lobby.turnOrder });
        }

        socket.to(socket.lobbyId).emit('player_left', { playerId: socket.playerId, playerName: lobby.players[socket.playerId].name });
        console.log(`🚪 ${lobby.players[socket.playerId].name} покинул лобби ${socket.lobbyId}`);
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🎮 ЭКО-ИГРА ЗАПУЩЕНА!');
    console.log(`📍 Порт: ${PORT}`);
    console.log('='.repeat(60));
});
