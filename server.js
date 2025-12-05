const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Раздаем статические файлы
app.use(express.static(path.join(__dirname)));

// Хранилище комнат
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('✅ Новый пользователь подключился:', socket.id);

    socket.on('join-room', (data) => {
        const { roomId, playerId, playerName, isNewRoom } = data;
        
        console.log(`🎮 Игрок ${playerName} присоединяется к комнате ${roomId}`);
        
        // Если комната не существует и это создание новой
        if (!rooms.has(roomId) && isNewRoom) {
            rooms.set(roomId, {
                players: new Map(),
                cityProgress: {
                    tver: 0, kineshma: 0, naberezhnye_chelny: 0,
                    kazan: 0, volgograd: 0, astrakhan: 0
                },
                messages: []
            });
        }
        
        // Если комната существует или была создана
        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            
            // Добавляем игрока в комнату
            room.players.set(playerId, {
                id: playerId,
                name: playerName,
                position: 0,
                city: "tver",
                coins: 100,
                cleaningPoints: 0,
                buildings: [],
                level: 1,
                completedTasks: 0,
                color: getRandomColor()
            });
            
            // Присоединяем сокет к комнате
            socket.join(roomId);
            
            // Отправляем успешное присоединение
            socket.emit('join-success', room.players.get(playerId));
            
            // Обновляем всех игроков в комнате
            io.to(roomId).emit('room-update', {
                players: Array.from(room.players.values()),
                cityProgress: room.cityProgress,
                messages: room.messages
            });
            
            console.log(`✅ Игрок ${playerName} присоединился к комнате ${roomId}`);
        } else {
            socket.emit('room-error', 'Комната не существует!');
        }
    });
    
    socket.on('player-update', (playerData) => {
        // Находим комнату игрока
        for (let [roomId, room] of rooms) {
            if (room.players.has(playerData.id)) {
                // Обновляем данные игрока
                room.players.set(playerData.id, playerData);
                
                // Рассылаем обновление всем в комнате
                io.to(roomId).emit('room-update', {
                    players: Array.from(room.players.values()),
                    cityProgress: room.cityProgress,
                    messages: room.messages
                });
                break;
            }
        }
    });
    
    socket.on('chat-message', (data) => {
        const { playerId, message } = data;
        
        // Находим комнату и игрока
        for (let [roomId, room] of rooms) {
            if (room.players.has(playerId)) {
                const player = room.players.get(playerId);
                const chatMessage = {
                    sender: player.name,
                    message: message,
                    type: 'chat',
                    timestamp: new Date().toISOString()
                };
                
                // Сохраняем сообщение
                room.messages.push(chatMessage);
                if (room.messages.length > 50) room.messages.shift();
                
                // Рассылаем сообщение
                io.to(roomId).emit('chat-update', room.messages);
                break;
            }
        }
    });
    
    socket.on('system-message', (message) => {
        // Находим комнату сокета
        const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
        if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId);
            const systemMessage = {
                sender: 'Система',
                message: message,
                type: 'system',
                timestamp: new Date().toISOString()
            };
            
            room.messages.push(systemMessage);
            if (room.messages.length > 50) room.messages.shift();
            
            io.to(roomId).emit('chat-update', room.messages);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Пользователь отключился:', socket.id);
    });
});

function getRandomColor() {
    const colors = [
        '#4ecdc4', '#ff6b6b', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#e74c3c', '#3498db', '#e67e22', '#34495e'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📁 Откройте http://localhost:${PORT} в браузере`);
});
