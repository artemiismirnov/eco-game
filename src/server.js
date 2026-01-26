const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Хранение состояния комнат
const rooms = {};
const players = {};

io.on('connection', (socket) => {
  console.log(`🔌 Новое подключение: ${socket.id}`);

  // Отправляем подтверждение подключения
  socket.emit('connection_confirmed', { 
    message: 'Подключение к серверу установлено',
    timestamp: new Date().toISOString()
  });

  socket.on('join-room', (data) => {
    const { roomId, playerName, isNewRoom } = data;
    
    console.log(`🎮 Попытка входа в комнату: ${roomId}, игрок: ${playerName}`);
    
    if (!roomId || !playerName) {
      socket.emit('room-error', { message: 'Не указаны номер комнаты или имя игрока' });
      return;
    }
    
    // Проверяем, существует ли комната
    if (!rooms[roomId]) {
      if (isNewRoom) {
        // Создаем новую комнату
        rooms[roomId] = {
          players: {},
          turnOrder: [],
          currentTurn: null,
          chatHistory: []
        };
        console.log(`✅ Создана новая комната: ${roomId}`);
      } else {
        socket.emit('room-error', { message: 'Комнаты с таким номером не существует' });
        return;
      }
    }
    
    // Проверяем, не полна ли комната
    const room = rooms[roomId];
    if (Object.keys(room.players).length >= 6) {
      socket.emit('room-error', { message: 'Комната заполнена (максимум 6 игроков)' });
      return;
    }
    
    // Добавляем игрока в комнату
    const playerId = socket.id;
    const playerColor = getRandomColor(playerId);
    
    const playerData = {
      id: playerId,
      name: playerName,
      position: 1, // Стартовая позиция
      city: 'tver', // Стартовый город
      coins: 100,
      cleaningPoints: 0,
      level: 1,
      completedTasks: 0,
      color: playerColor,
      connected: true,
      roomId: roomId,
      joinedAt: new Date().toISOString()
    };
    
    room.players[playerId] = playerData;
    players[playerId] = playerData;
    
    // Добавляем игрока в очередь ходов, если его еще нет там
    if (!room.turnOrder.includes(playerId)) {
      room.turnOrder.push(playerId);
    }
    
    // Если нет текущего хода, устанавливаем первого игрока
    if (!room.currentTurn && room.turnOrder.length > 0) {
      room.currentTurn = room.turnOrder[0];
    }
    
    // Присоединяем сокет к комнате
    socket.join(roomId);
    socket.roomId = roomId;
    
    // Отправляем успешное присоединение
    socket.emit('join-success', {
      playerId: playerId,
      roomId: roomId,
      player: playerData,
      isNewRoom: isNewRoom,
      currentTurn: room.currentTurn,
      turnOrder: room.turnOrder,
      isMyTurn: room.currentTurn === playerId,
      reconnected: false
    });
    
    // Уведомляем других игроков в комнате
    socket.to(roomId).emit('player_joined', {
      playerId: playerId,
      player: playerData
    });
    
    // Отправляем обновленное состояние комнаты всем игрокам
    io.to(roomId).emit('room_state', {
      players: room.players,
      currentTurn: room.currentTurn,
      turnOrder: room.turnOrder
    });
    
    console.log(`✅ Игрок ${playerName} присоединился к комнате ${roomId}`);
    
    // Отправляем историю чата новому игроку
    if (room.chatHistory && room.chatHistory.length > 0) {
      socket.emit('chat_history', room.chatHistory.slice(-50)); // Последние 50 сообщений
    }
  });
  
  socket.on('chat_message', (data) => {
    const { message } = data;
    const roomId = socket.roomId;
    
    if (!roomId || !rooms[roomId]) return;
    
    const playerId = socket.id;
    const player = rooms[roomId].players[playerId];
    
    if (!player) return;
    
    const chatMessage = {
      playerId: playerId,
      playerName: player.name,
      message: message,
      timestamp: new Date().toISOString()
    };
    
    // Сохраняем сообщение в истории чата комнаты
    rooms[roomId].chatHistory.push(chatMessage);
    
    // Ограничиваем историю чата (последние 100 сообщений)
    if (rooms[roomId].chatHistory.length > 100) {
      rooms[roomId].chatHistory = rooms[roomId].chatHistory.slice(-100);
    }
    
    // Отправляем сообщение всем в комнате
    io.to(roomId).emit('new_chat_message', {
      playerName: player.name,
      message: message,
      timestamp: chatMessage.timestamp
    });
    
    console.log(`💬 Чат ${roomId}: ${player.name}: ${message}`);
  });
  
  socket.on('player_position_update', (data) => {
    const { position, city } = data;
    const playerId = socket.id;
    const player = players[playerId];
    
    if (!player) return;
    
    // Обновляем позицию игрока
    player.position = position;
    player.city = city || player.city;
    
    // Отправляем обновление позиции всем в комнате
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      socket.to(roomId).emit('player_position_update', {
        playerId: playerId,
        playerName: player.name,
        position: position,
        city: city,
        color: player.color
      });
    }
  });
  
  socket.on('request_all_positions', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    
    const positions = {};
    const room = rooms[roomId];
    
    for (const playerId in room.players) {
      const player = room.players[playerId];
      positions[playerId] = {
        name: player.name,
        position: player.position,
        city: player.city,
        color: player.color
      };
    }
    
    socket.emit('all_players_positions', { players: positions });
  });
  
  socket.on('update_progress', (data) => {
    const { cityKey, progress, playerId } = data;
    const roomId = socket.roomId;
    
    if (!roomId || !rooms[roomId] || !rooms[roomId].players[playerId]) return;
    
    // Здесь можно сохранять прогресс в базе данных
    // Пока просто пересылаем всем игрокам в комнате
    io.to(roomId).emit('progress_updated', {
      playerId: playerId,
      cityKey: cityKey,
      progress: progress
    });
  });
  
  socket.on('player_dice_roll', (data) => {
    const { diceValue, newPosition, task, playerId } = data;
    const roomId = socket.roomId;
    
    if (!roomId || !rooms[roomId]) return;
    
    // Обновляем позицию игрока
    if (rooms[roomId].players[playerId]) {
      rooms[roomId].players[playerId].position = newPosition;
    }
    
    // Отправляем результат броска всем в комнате
    socket.to(roomId).emit('player_dice_roll', {
      playerId: playerId,
      diceValue: diceValue,
      newPosition: newPosition,
      task: task
    });
  });
  
  socket.on('get_room_state', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    
    socket.emit('room_state', {
      players: rooms[roomId].players,
      currentTurn: rooms[roomId].currentTurn,
      turnOrder: rooms[roomId].turnOrder
    });
  });
  
  socket.on('end_turn', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    
    const room = rooms[roomId];
    const currentIndex = room.turnOrder.indexOf(room.currentTurn);
    
    // Определяем следующего игрока в очереди
    let nextIndex = (currentIndex + 1) % room.turnOrder.length;
    room.currentTurn = room.turnOrder[nextIndex];
    
    // Отправляем обновление очереди ходов всем игрокам
    io.to(roomId).emit('turn_update', {
      currentTurn: room.currentTurn,
      turnOrder: room.turnOrder
    });
    
    console.log(`🔄 Смена хода в комнате ${roomId}: ${room.currentTurn}`);
  });
  
  socket.on('player_reconnected', () => {
    const playerId = socket.id;
    const player = players[playerId];
    
    if (!player) return;
    
    player.connected = true;
    
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      rooms[roomId].players[playerId].connected = true;
      
      // Уведомляем других игроков о восстановлении соединения
      socket.to(roomId).emit('player_reconnected', {
        playerId: playerId,
        playerName: player.name
      });
      
      // Отправляем обновленное состояние комнаты
      io.to(roomId).emit('room_state', {
        players: rooms[roomId].players,
        currentTurn: rooms[roomId].currentTurn,
        turnOrder: rooms[roomId].turnOrder
      });
      
      console.log(`🔄 Игрок ${player.name} восстановил соединение`);
    }
  });
  
  socket.on('disconnect', () => {
    const playerId = socket.id;
    const player = players[playerId];
    
    if (!player) return;
    
    const roomId = socket.roomId;
    
    if (roomId && rooms[roomId]) {
      // Помечаем игрока как отключенного
      rooms[roomId].players[playerId].connected = false;
      players[playerId].connected = false;
      
      // Уведомляем других игроков об отключении
      socket.to(roomId).emit('player_left', {
        playerId: playerId,
        playerName: player.name
      });
      
      // Отправляем обновленное состояние комнаты
      io.to(roomId).emit('room_state', {
        players: rooms[roomId].players,
        currentTurn: rooms[roomId].currentTurn,
        turnOrder: rooms[roomId].turnOrder
      });
      
      console.log(`👋 Игрок ${player.name} отключился от комнаты ${roomId}`);
      
      // Если отключился игрок, чей сейчас ход, передаем ход следующему
      if (rooms[roomId].currentTurn === playerId) {
        const room = rooms[roomId];
        const currentIndex = room.turnOrder.indexOf(playerId);
        let nextIndex = (currentIndex + 1) % room.turnOrder.length;
        room.currentTurn = room.turnOrder[nextIndex];
        
        io.to(roomId).emit('turn_update', {
          currentTurn: room.currentTurn,
          turnOrder: room.turnOrder
        });
      }
    }
    
    console.log(`❌ Отключение: ${socket.id}`);
  });
});

function getRandomColor(playerId) {
  const colors = [
    '#4ecdc4', '#ff6b6b', '#1dd1a1', '#54a0ff', '#ff9ff3',
    '#feca57', '#ff9f43', '#00d2d3', '#5f27cd', '#ff9e1f'
  ];
  
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Доступен по адресу: http://localhost:${PORT}`);
});
