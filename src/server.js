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
    pingInterval: 25000,
    maxHttpBufferSize: 1e7 // ВАЖНО: Увеличено до 10 МБ для передачи Base64 аватарок
});

// КРИТИЧНО: Отдаем статические файлы (HTML, CSS, JS, картинки)
app.use(express.static(__dirname));

// Хранилище лобби (комнат)
const lobbies = new Map();

// === ГЛОБАЛЬНАЯ СТАТИСТИКА (ЗАДЕЛ НА БУДУЩЕЕ ДЛЯ РЕЙТИНГА) ===
// В будущих обновлениях здесь можно будет подключить базу данных (например, MongoDB, PostgreSQL или Redis),
// чтобы сохранять очки игроков глобально после каждой игры и передавать их на клиент для вкладки "Рейтинг Экологов".
// В текущей версии рейтинг на клиенте работает в демо-режиме (предустановленные данные).
// =========================================================

// Автоматическая очистка пустых лобби каждые 5 минут
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [lobbyId, lobby] of lobbies.entries()) {
        // Удаляем лобби, пустые более 30 минут
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

// Передача хода следующему активному игроку
function advanceTurn(lobby) {
    if (!lobby || lobby.turnOrder.length === 0) return null;

    let currentIndex = lobby.turnOrder.indexOf(lobby.currentTurn);
    let nextIndex = (currentIndex + 1) % lobby.turnOrder.length;
    
    // Пропускаем отключенных игроков
    let attempts = 0;
    while (!lobby.players[lobby.turnOrder[nextIndex]].connected && attempts < lobby.turnOrder.length) {
        nextIndex = (nextIndex + 1) % lobby.turnOrder.length;
        attempts++;
    }
    
    lobby.currentTurn = lobby.turnOrder[nextIndex];
    return lobby.currentTurn;
}

// Генерация случайного цвета (используется как резерв, пока игрок не выберет свой)
function getRandomColor(playerId) {
    const colors = ['#4ecdc4', '#ff6b6b', '#1dd1a1', '#54a0ff', '#ff9ff3', '#feca57', '#ff9f43', '#00d2d3', '#5f27cd', '#ff9e1f'];
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

    // Запрос списка публичных комнат
    socket.on('request_public_rooms', () => {
        const publicRooms = [];
        for (const [roomId, lobby] of lobbies.entries()) {
            if (!lobby.isPrivate) {
                const activePlayers = Object.values(lobby.players).filter(p => p.connected).length;
                publicRooms.push({
                    id: roomId,
                    mapId: lobby.mapId,
                    playersCount: activePlayers,
                    maxPlayers: lobby.maxPlayers
                });
            }
        }
        socket.emit('public_rooms_list', publicRooms);
    });

    // Присоединение к лобби
    socket.on('join-room', (data) => {
        // Прием дополнительных параметров пароля и приватности
        const { roomId, playerName, isNewRoom = false, mapId = 'volga', password = '', isPrivate = false } = data;
        
        if (!playerName || playerName.trim().length < 2) {
            return socket.emit('room-error', 'Имя должно содержать минимум 2 символа');
        }

        const cleanPlayerName = playerName.trim();
        
        // Создаем лобби, если его нет
        if (isNewRoom && !lobbies.has(roomId)) {
            lobbies.set(roomId, {
                mapId: mapId, // Сохраняем выбранную карту
                password: password, // Сохраняем пароль
                isPrivate: isPrivate, // Устанавливаем статус приватности
                players: {},
                turnOrder: [],
                currentTurn: null,
                cityProgress: {},
                playerProgress: {},
                messages: [],
                created: new Date().toISOString(),
                maxPlayers: 6
            });
            console.log(`🆕 Создано лобби: ${roomId} (Приватное: ${isPrivate})`);
        } else if (isNewRoom && lobbies.has(roomId)) {
            return socket.emit('room-error', 'Лобби с таким номером уже существует!');
        } else if (!isNewRoom && !lobbies.has(roomId)) {
            return socket.emit('room-error', 'Лобби не найдено');
        }

        const lobby = lobbies.get(roomId);

        // ПРОВЕРКА ПАРОЛЯ (если игрок подключается к уже созданной комнате, и у нее есть пароль)
        if (!isNewRoom && lobby.password && lobby.password !== password) {
            return socket.emit('room-error', 'Неверный пароль от комнаты!');
        }

        // === УМНАЯ ПРОВЕРКА ИГРОКА (ВОССТАНОВЛЕНИЕ СЕССИИ) ===
        const existingActivePlayer = Object.values(lobby.players).find(p => 
            p.name.toLowerCase() === cleanPlayerName.toLowerCase() && p.connected
        );
        const existingDisconnectedPlayer = Object.values(lobby.players).find(p => 
            p.name.toLowerCase() === cleanPlayerName.toLowerCase() && !p.connected
        );

        // Если игрок с таким именем прямо сейчас в игре
        if (existingActivePlayer) {
            socket.emit('room-error', 'Игрок с таким именем уже играет в этой комнате');
            return;
        }

        // Если игрок вылетел/вышел и пытается вернуться
        if (existingDisconnectedPlayer) {
            const playerId = existingDisconnectedPlayer.id;
            const player = lobby.players[playerId];
            player.connected = true; // Возвращаем в строй
            
            // Привязываем новый сокет к старому ID игрока
            socket.playerId = playerId;
            socket.lobbyId = roomId;
            socket.playerName = cleanPlayerName;
            socket.join(roomId);
            
            console.log(`🔄 ${cleanPlayerName} успешно вернулся в лобби ${roomId}`);
            
            // Отправляем личные данные игроку, включая mapId
            socket.emit('join-success', { 
                ...player,
                roomId: roomId,
                mapId: lobby.mapId,
                currentTurn: lobby.currentTurn,
                turnOrder: lobby.turnOrder,
                playerProgress: lobby.playerProgress[playerId]
            });

            // Отправляем актуальное состояние комнаты ВСЕМ
            io.to(roomId).emit('room_state', {
                mapId: lobby.mapId,
                players: lobby.players,
                cityProgress: lobby.cityProgress,
                roomId: roomId
            });

            // Уведомляем остальных, что игрок вернулся
            socket.to(roomId).emit('player_reconnected', {
                playerId: playerId,
                playerName: player.name
            });

            if (lobby.messages) {
                socket.emit('chat_history', lobby.messages.slice(-50));
            }
            return; // Прерываем выполнение, чтобы не создать нового игрока
        }
        // === КОНЕЦ УМНОЙ ПРОВЕРКИ ===
        
        // Лимит игроков
        const activePlayers = Object.values(lobby.players).filter(p => p.connected).length;
        if (activePlayers >= lobby.maxPlayers && !lobby.players[socket.id]) {
            return socket.emit('room-error', 'Лобби заполнено (максимум 6 игроков)');
        }

        const isFirstPlayer = Object.keys(lobby.players).length === 0;

        // Создаем или обновляем игрока
        const player = {
            id: socket.id,
            name: cleanPlayerName,
            position: 1,
            city: "tver",
            coins: 100,
            cleaningPoints: 0,
            buildings: [],
            level: 1,
            completedTasks: 0,
            color: getRandomColor(socket.id), // Резервный цвет
            hasSelectedColor: false, // Флаг: выбрал ли игрок цвет вручную
            connected: true
        };

        lobby.players[socket.id] = player;
        socket.lobbyId = roomId;
        socket.playerId = socket.id;

        if (!lobby.turnOrder.includes(socket.id)) {
            lobby.turnOrder.push(socket.id);
        }

        if (isFirstPlayer) {
            lobby.currentTurn = socket.id;
        }

        if (!lobby.playerProgress[socket.id]) {
            lobby.playerProgress[socket.id] = {};
        }

        socket.join(roomId);
        
        console.log(`✅ ${cleanPlayerName} присоединился к лобби ${roomId}`);
        
        // 1. Отправляем успех самому игроку
        socket.emit('join-success', { 
            ...player,
            roomId: roomId,
            mapId: lobby.mapId,
            currentTurn: lobby.currentTurn,
            turnOrder: lobby.turnOrder,
            playerProgress: lobby.playerProgress[socket.id]
        });

        // 2. Отправляем историю чата
        if (lobby.messages.length > 0) {
            socket.emit('chat_history', lobby.messages);
        }

        // 3. Уведомляем остальных
        socket.to(roomId).emit('player_joined', {
            playerId: socket.id,
            player: player
        });
    });

    // Выбор цвета фишки (или аватарки)
    socket.on('select_color', (data) => {
        if (!socket.lobbyId || !socket.playerId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby && lobby.players[socket.playerId]) {
            lobby.players[socket.playerId].color = data.color;
            lobby.players[socket.playerId].hasSelectedColor = true;
            
            // Рассылаем всем в комнате информацию об обновлении цвета/аватарки
            io.to(socket.lobbyId).emit('player_color_updated', {
                playerId: socket.playerId,
                color: data.color
            });
        }
    });

    // Запрос позиций всех игроков (для карты)
    socket.on('request_all_positions', () => {
        if (!socket.lobbyId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby) {
            socket.emit('all_players_positions', { players: lobby.players });
        }
    });

    // Обновление координаты фишки на карте
    socket.on('player_position_update', (data) => {
        if (!socket.lobbyId || !socket.playerId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby && lobby.players[socket.playerId]) {
            const player = lobby.players[socket.playerId];
            player.position = data.position;
            player.city = data.city;

            socket.to(socket.lobbyId).emit('player_position_update', {
                playerId: socket.playerId,
                playerName: player.name,
                position: data.position,
                city: data.city,
                color: player.color
            });
        }
    });

    // Передача хода
    socket.on('end_turn', () => {
        if (!socket.lobbyId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby) {
            const nextTurnId = advanceTurn(lobby);
            io.to(socket.lobbyId).emit('turn_update', {
                currentTurn: nextTurnId,
                turnOrder: lobby.turnOrder
            });
        }
    });

    // Синхронизация профиля игрока (монеты, лвл, аватарки)
    socket.on('player-update', (data) => {
        if (!socket.lobbyId || !socket.playerId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby && lobby.players[socket.playerId]) {
            Object.assign(lobby.players[socket.playerId], data);
            
            if (data.progress) {
                lobby.playerProgress[socket.playerId] = data.progress;
            }
        }
    });

    // Обновление прогресса города
    socket.on('update_progress', (data) => {
        if (!socket.lobbyId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby) {
            if (!lobby.playerProgress[data.playerId]) {
                lobby.playerProgress[data.playerId] = {};
            }
            lobby.playerProgress[data.playerId][data.cityKey] = data.progress;
            
            io.to(socket.lobbyId).emit('progress_updated', data);
        }
    });

    // Чат
    socket.on('chat_message', (data) => {
        if (!socket.lobbyId || !socket.playerId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby && lobby.players[socket.playerId]) {
            const msgObj = {
                playerName: lobby.players[socket.playerId].name,
                message: data.message
            };
            
            lobby.messages.push(msgObj);
            if (lobby.messages.length > 50) lobby.messages.shift();
            
            io.to(socket.lobbyId).emit('new_chat_message', msgObj);
        }
    });

    // Запрос полного стейта
    socket.on('get_room_state', () => {
        if (!socket.lobbyId) return;
        const lobby = lobbies.get(socket.lobbyId);
        if (lobby) {
            socket.emit('room_state', {
                mapId: lobby.mapId, // Отдаем mapId при запросе состояния
                players: lobby.players,
                cityProgress: lobby.cityProgress,
                playerProgress: lobby.playerProgress,
                currentTurn: lobby.currentTurn,
                turnOrder: lobby.turnOrder
            });
        }
    });

    // Выход из комнаты
    socket.on('leave-room', () => {
        handleDisconnect(socket);
        socket.leave(socket.lobbyId);
        socket.lobbyId = null;
    });

    // Отключение от сервера
    socket.on('disconnect', () => {
        handleDisconnect(socket);
    });
});

// Обработка отключения/выхода
function handleDisconnect(socket) {
    if (!socket.lobbyId || !socket.playerId) return;
    const lobby = lobbies.get(socket.lobbyId);
    
    if (lobby && lobby.players[socket.playerId]) {
        lobby.players[socket.playerId].connected = false;
        
        // Передаем ход, если отключился тот, чей сейчас ход
        if (lobby.currentTurn === socket.playerId) {
            advanceTurn(lobby);
            io.to(socket.lobbyId).emit('turn_update', {
                currentTurn: lobby.currentTurn,
                turnOrder: lobby.turnOrder
            });
        }

        // Сообщаем остальным
        socket.to(socket.lobbyId).emit('player_left', {
            playerId: socket.playerId,
            playerName: lobby.players[socket.playerId].name
        });
        
        console.log(`🚪 ${lobby.players[socket.playerId].name} покинул лобби ${socket.lobbyId}`);
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🎮 ЭКО-ИГРА ЗАПУЩЕНА И ГОТОВА К РАБОТЕ!');
    console.log(`📍 Порт: ${PORT}`);
    console.log('='.repeat(60));
});
