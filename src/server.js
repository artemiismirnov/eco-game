const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Данные игры
const gameRooms = {};
const chatHistory = {};
const playerPositions = {};

// Инициализация комнаты
function initializeRoom(roomId) {
  if (!gameRooms[roomId]) {
    gameRooms[roomId] = {
      players: {},
      cityProgress: {},
      playerProgress: {},
      turnOrder: [],
      currentTurn: null,
      turnIndex: 0
    };
    
    chatHistory[roomId] = [];
    playerPositions[roomId] = {};
    
    console.log(`✅ Комната ${roomId} создана`);
  }
}

// Получить случайный цвет для игрока
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

// Управление очередью ходов
function updateTurnOrder(roomId) {
  const room = gameRooms[roomId];
  if (!room) return;
  
  // Создаем порядок ходов на основе времени присоединения
  room.turnOrder = Object.keys(room.players);
  
  // Если нет текущего хода, устанавливаем первого игрока
  if (!room.currentTurn && room.turnOrder.length > 0) {
    room.currentTurn = room.turnOrder[0];
    room.turnIndex = 0;
  }
  
  return room.turnOrder;
}

// Передать ход следующему игроку
function nextTurn(roomId) {
  const room = gameRooms[roomId];
  if (!room || room.turnOrder.length === 0) return null;
  
  room.turnIndex = (room.turnIndex + 1) % room.turnOrder.length;
  room.currentTurn = room.turnOrder[room.turnIndex];
  
  return room.currentTurn;
}

// Обработчики Socket.IO
io.on('connection', (socket) => {
  console.log(`✅ Новое подключение: ${socket.id}`);
  
  socket.emit('connection_confirmed', {
    message: 'Подключено к игровому серверу',
    timestamp: Date.now()
  });
  
  // Присоединение к комнате
  socket.on('join-room', (data) => {
    const { roomId, playerName, isNewRoom } = data;
    
    console.log(`🎮 Игрок ${playerName} пытается присоединиться к комнате ${roomId} (новый: ${isNewRoom})`);
    
    if (!roomId || !playerName) {
      socket.emit('room-error', { message: 'Не указан номер комнаты или имя игрока' });
      return;
    }
    
    if (playerName.length < 2 || playerName.length > 20) {
      socket.emit('room-error', { message: 'Имя игрока должно быть от 2 до 20 символов' });
      return;
    }
    
    // Если комната новая, инициализируем ее
    if (isNewRoom) {
      initializeRoom(roomId);
    }
    
    // Проверяем существование комнаты
    if (!gameRooms[roomId]) {
      socket.emit('room-error', { message: 'Комнаты с таким номером не существует' });
      return;
    }
    
    const room = gameRooms[roomId];
    
    // Проверяем количество игроков
    if (Object.keys(room.players).length >= 6) {
      socket.emit('room-error', { message: 'Комната заполнена (максимум 6 игроков)' });
      return;
    }
    
    // Проверяем уникальность имени в комнате
    const existingPlayer = Object.values(room.players).find(p => p.name === playerName);
    if (existingPlayer) {
      socket.emit('room-error', { message: 'Игрок с таким именем уже есть в комнате' });
      return;
    }
    
    // Подключаемся к комнате
    socket.join(roomId);
    
    // Создаем данные игрока
    const playerData = {
      id: socket.id,
      name: playerName,
      position: 1, // Стартовая позиция
      city: 'tver', // Стартовый город
      coins: 100,
      cleaningPoints: 0,
      level: 1,
      completedTasks: 0,
      color: getRandomColor(socket.id),
      connected: true,
      currentTask: null,
      hasUnfinishedTask: false
    };
    
    // Добавляем игрока в комнату
    room.players[socket.id] = playerData;
    
    // Инициализируем прогресс для игрока
    if (!room.playerProgress[socket.id]) {
      room.playerProgress[socket.id] = {
        tver: 0,
        kineshma: 0,
        naberezhnye_chelny: 0,
        kazan: 0,
        volgograd: 0,
        astrakhan: 0
      };
    }
    
    // Сохраняем позицию игрока
    playerPositions[roomId][socket.id] = {
      position: playerData.position,
      city: playerData.city,
      name: playerName,
      color: playerData.color
    };
    
    // Обновляем очередь ходов
    updateTurnOrder(roomId);
    
    // Отправляем успешное присоединение
    socket.emit('join-success', {
      ...playerData,
      roomId,
      reconnected: false,
      currentTurn: room.currentTurn,
      turnOrder: room.turnOrder,
      isMyTurn: socket.id === room.currentTurn,
      playerProgress: room.playerProgress[socket.id]
    });
    
    // Отправляем историю чата
    if (chatHistory[roomId] && chatHistory[roomId].length > 0) {
      socket.emit('chat_history', chatHistory[roomId]);
    }
    
    // Уведомляем других игроков
    socket.to(roomId).emit('player_joined', {
      playerId: socket.id,
      player: playerData
    });
    
    // Отправляем обновленное состояние комнаты всем
    io.to(roomId).emit('room_state', {
      players: room.players,
      cityProgress: room.cityProgress,
      playerProgress: room.playerProgress,
      currentTurn: room.currentTurn,
      turnOrder: room.turnOrder
    });
    
    // Отправляем позиции всех игроков в комнате
    io.to(roomId).emit('all_players_positions', {
      players: playerPositions[roomId]
    });
    
    console.log(`✅ Игрок ${playerName} присоединился к комнате ${roomId}. Всего игроков: ${Object.keys(room.players).length}`);
  });
  
  // Сообщения в чат
  socket.on('chat_message', (data) => {
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    
    if (!roomId || !gameRooms[roomId]) return;
    
    const player = gameRooms[roomId].players[socket.id];
    if (!player) return;
    
    const messageData = {
      playerId: socket.id,
      playerName: player.name,
      message: data.message,
      timestamp: Date.now()
    };
    
    // Сохраняем в историю
    if (!chatHistory[roomId]) {
      chatHistory[roomId] = [];
    }
    chatHistory[roomId].push(messageData);
    
    // Ограничиваем историю последними 100 сообщениями
    if (chatHistory[roomId].length > 100) {
      chatHistory[roomId] = chatHistory[roomId].slice(-100);
    }
    
    // Отправляем всем в комнате
    io.to(roomId).emit('new_chat_message', messageData);
    
    console.log(`💬 Чат [${roomId}]: ${player.name}: ${data.message}`);
  });
  
  // Обновление прогресса игрока
  socket.on('update_progress', (data) => {
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    
    if (!roomId || !gameRooms[roomId]) return;
    
    const { cityKey, progress, playerId } = data;
    
    if (!gameRooms[roomId].playerProgress[playerId]) {
      gameRooms[roomId].playerProgress[playerId] = {};
    }
    
    gameRooms[roomId].playerProgress[playerId][cityKey] = progress;
    
    // Уведомляем всех в комнате
    io.to(roomId).emit('progress_updated', {
      playerId,
      cityKey,
      progress
    });
    
    // Отправляем обновленное состояние комнаты
    io.to(roomId).emit('room_state', {
      players: gameRooms[roomId].players,
      cityProgress: gameRooms[roomId].cityProgress,
      playerProgress: gameRooms[roomId].playerProgress,
      currentTurn: gameRooms[roomId].currentTurn,
      turnOrder: gameRooms[roomId].turnOrder
    });
    
    console.log(`📊 Прогресс обновлен [${roomId}]: ${playerId} -> ${cityKey}: ${progress}%`);
  });
  
  // Бросок кубика
  socket.on('player_dice_roll', (data) => {
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    
    if (!roomId || !gameRooms[roomId]) return;
    
    // Отправляем всем игрокам в комнате
    socket.to(roomId).emit('player_dice_roll', data);
    
    console.log(`🎲 Бросок кубика [${roomId}]: ${data.playerName} бросил ${data.diceValue}`);
  });
  
  // Обновление позиции игрока
  socket.on('player_position_update', (data) => {
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    
    if (!roomId || !gameRooms[roomId]) return;
    
    const player = gameRooms[roomId].players[socket.id];
    if (!player) return;
    
    // Обновляем позицию в общем хранилище
    if (!playerPositions[roomId][socket.id]) {
      playerPositions[roomId][socket.id] = {};
    }
    
    playerPositions[roomId][socket.id].position = data.position;
    playerPositions[roomId][socket.id].city = data.city;
    playerPositions[roomId][socket.id].name = player.name;
    playerPositions[roomId][socket.id].color = player.color;
    
    // Отправляем обновление всем в комнате
    io.to(roomId).emit('player_position_update', {
      playerId: socket.id,
      playerName: player.name,
      position: data.position,
      city: data.city,
      color: player.color
    });
    
    console.log(`📍 Обновление позиции [${roomId}]: ${player.name} -> позиция ${data.position}, город ${data.city}`);
  });
  
  // Запрос всех позиций игроков
  socket.on('request_all_positions', () => {
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    
    if (!roomId || !playerPositions[roomId]) return;
    
    socket.emit('all_players_positions', {
      players: playerPositions[roomId]
    });
    
    console.log(`🔄 Отправка позиций всех игроков для комнаты ${roomId}`);
  });
  
  // Обновление состояния игрока
  socket.on('player-update', (playerData) => {
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    
    if (!roomId || !gameRooms[roomId]) return;
    
    // Обновляем данные игрока
    if (gameRooms[roomId].players[playerData.id]) {
      gameRooms[roomId].players[playerData.id] = {
        ...gameRooms[roomId].players[playerData.id],
        ...playerData
      };
    }
    
    console.log(`🔄 Обновление состояния игрока ${playerData.name}`);
  });
  
  // Запрос состояния комнаты
  socket.on('get_room_state', () => {
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    
    if (!roomId || !gameRooms[roomId]) return;
    
    socket.emit('room_state', {
      players: gameRooms[roomId].players,
      cityProgress: gameRooms[roomId].cityProgress,
      playerProgress: gameRooms[roomId].playerProgress,
      currentTurn: gameRooms[roomId].currentTurn,
      turnOrder: gameRooms[roomId].turnOrder
    });
    
    console.log(`🔄 Отправка состояния комнаты ${roomId} игроку ${socket.id}`);
  });
  
  // Восстановление соединения игрока
  socket.on('player_reconnected', () => {
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    
    if (!roomId || !gameRooms[roomId]) return;
    
    const player = gameRooms[roomId].players[socket.id];
    if (player) {
      player.connected = true;
      
      // Уведомляем всех в комнате
      socket.to(roomId).emit('player_reconnected', {
        playerId: socket.id,
        playerName: player.name
      });
      
      // Отправляем обновленное состояние комнаты
      io.to(roomId).emit('room_state', {
        players: gameRooms[roomId].players,
        cityProgress: gameRooms[roomId].cityProgress,
        playerProgress: gameRooms[roomId].playerProgress,
        currentTurn: gameRooms[roomId].currentTurn,
        turnOrder: gameRooms[roomId].turnOrder
      });
      
      console.log(`🔌 Игрок ${player.name} восстановил соединение в комнате ${roomId}`);
    }
  });
  
  // Завершение хода
  socket.on('end_turn', () => {
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    
    if (!roomId || !gameRooms[roomId]) return;
    
    // Передаем ход следующему игроку
    const nextPlayerId = nextTurn(roomId);
    
    if (nextPlayerId) {
      // Уведомляем всех в комнате
      io.to(roomId).emit('turn_update', {
        currentTurn: nextPlayerId,
        turnOrder: gameRooms[roomId].turnOrder
      });
      
      console.log(`🔄 Передача хода в комнате ${roomId}: теперь ходит ${nextPlayerId}`);
    }
  });
  
  // Отключение игрока
  socket.on('disconnect', () => {
    console.log(`❌ Отключение: ${socket.id}`);
    
    // Находим комнату игрока
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    
    if (roomId && gameRooms[roomId]) {
      const player = gameRooms[roomId].players[socket.id];
      
      if (player) {
        // Помечаем игрока как отключенного
        player.connected = false;
        
        // Уведомляем всех в комнате
        socket.to(roomId).emit('player_left', {
          playerId: socket.id,
          playerName: player.name
        });
        
        // Отправляем обновленное состояние комнаты
        io.to(roomId).emit('room_state', {
          players: gameRooms[roomId].players,
          cityProgress: gameRooms[roomId].cityProgress,
          playerProgress: gameRooms[roomId].playerProgress,
          currentTurn: gameRooms[roomId].currentTurn,
          turnOrder: gameRooms[roomId].turnOrder
        });
        
        console.log(`🚪 Игрок ${player.name} отключился от комнаты ${roomId}`);
      }
    }
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Доступен по адресу: http://localhost:${PORT}`);
});

// Обработка завершения работы
process.on('SIGINT', () => {
  console.log('🛑 Остановка сервера...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});
