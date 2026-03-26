// ==================== ИНИЦИАЛИЗАЦИЯ ====================
console.log('🎮 Игра "Юный эколог" загружается...');

// Автоматическое определение URL сервера
const serverUrl = window.location.origin;

console.log('🌐 Подключаемся к серверу:', serverUrl);

// Подключение к Socket.IO серверу
const socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000
});

let isConnected = false;
let currentRoomId = null;
let hasCurrentTask = false;
let lightThemeEnabled = false; 

// ==================== ВАРИАНТЫ ЦВЕТОВ ИГРОКА ====================
const PLAYER_COLORS = [
    { id: 'green', hex: '#2ecc71', name: 'Зеленый' },
    { id: 'red', hex: '#e74c3c', name: 'Красный' },
    { id: 'yellow', hex: '#f1c40f', name: 'Желтый' },
    { id: 'blue', hex: '#3498db', name: 'Синий' },
    { id: 'purple', hex: '#9b59b6', name: 'Фиолетовый' },
    { id: 'orange', hex: '#e67e22', name: 'Оранжевый' }
];

// ==================== ЭЛЕМЕНТЫ DOM ====================
const elements = {
    authSection: document.getElementById('authSection'),
    gameContent: document.getElementById('gameContent'),
    loginTab: document.getElementById('loginTab'),
    registerTab: document.getElementById('registerTab'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    mapContainer: document.getElementById('mapContainer'),
    mapImage: document.getElementById('mapImage'),
    mapOverlay: document.getElementById('mapOverlay'),
    citiesGrid: document.getElementById('citiesGrid'),
    rollDiceBtn: document.getElementById('rollDiceBtn'),
    buildBtn: document.getElementById('buildBtn'),
    moveBtn: document.getElementById('moveBtn'),
    completeTaskBtn: document.getElementById('completeTaskBtn'),
    checkTaskBtn: document.getElementById('checkTaskBtn'),
    retryTaskBtn: document.getElementById('retryTaskBtn'),
    diceValue: document.getElementById('diceValue'),
    taskDescription: document.getElementById('taskDescription'),
    currentTask: document.getElementById('currentTask'),
    interactiveTask: document.getElementById('interactiveTask'),
    taskArea: document.getElementById('taskArea'),
    taskResult: document.getElementById('taskResult'),
    noTaskMessage: document.getElementById('noTaskMessage'),
    playerName: document.getElementById('playerName'),
    currentCity: document.getElementById('currentCity'),
    currentPosition: document.getElementById('currentPosition'),
    coinsCount: document.getElementById('coinsCount'),
    cleaningPoints: document.getElementById('cleaningPoints'),
    playerLevel: document.getElementById('playerLevel'),
    levelProgressFill: document.getElementById('levelProgressFill'),
    roomNumber: document.getElementById('roomNumber'),
    onlinePlayers: document.getElementById('onlinePlayers'),
    playersContainer: document.getElementById('playersContainer'),
    inviteBtn: document.getElementById('inviteBtn'),
    leaveRoomBtn: document.getElementById('leaveRoomBtn'),
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    sendMessageBtn: document.getElementById('sendMessageBtn'),
    emojiPickerBtn: document.getElementById('emojiPickerBtn'),
    emojiPicker: document.getElementById('emojiPicker'),
    easyBtn: document.getElementById('easyBtn'),
    mediumBtn: document.getElementById('mediumBtn'),
    hardBtn: document.getElementById('hardBtn'),
    difficultyBtns: document.querySelectorAll('.difficulty-btn'),
    logEntries: document.getElementById('logEntries'),
    buildingsSection: document.getElementById('buildingsSection'),
    buildingsContainer: document.getElementById('buildingsContainer'),
    notification: document.getElementById('notification'),
    cityModal: document.getElementById('cityModal'),
    cityModalTitle: document.getElementById('cityModalTitle'),
    cityModalSubtitle: document.getElementById('cityModalSubtitle'),
    cityModalHistory: document.getElementById('cityModalHistory'),
    cityModalProblem: document.getElementById('cityModalProblem'),
    cityModalTask: document.getElementById('cityModalTask'),
    cityModalCloseBtn: document.getElementById('cityModalCloseBtn'),
    cityModalMoveBtn: document.getElementById('cityModalMoveBtn'),
    cityModalProgressFill: document.getElementById('cityModalProgressFill'),
    cityModalProgressText: document.getElementById('cityModalProgressText'),
    gameInfo: document.getElementById('gameInfo'),
    cityProgressContainer: document.getElementById('cityProgressContainer'),
    choiceModal: document.getElementById('choiceModal'),
    stayBtn: document.getElementById('stayBtn'),
    moveForwardBtn: document.getElementById('moveForwardBtn'),
    connectionStatusDot: document.getElementById('connectionStatusDot'),
    connectionStatusText: document.getElementById('connectionStatusText'),
    connectionStatusCompact: document.getElementById('connectionStatusCompact'),
    resourcesPlaceholder: document.getElementById('resourcesPlaceholder'),
    topCoinsCount: document.getElementById('topCoinsCount'),
    topPlayerLevel: document.getElementById('topPlayerLevel'),
    turnIndicator: document.getElementById('turnIndicator'),
    turnMessage: document.getElementById('turnMessage'),
    inviteModal: document.getElementById('inviteModal'),
    inviteRoomNumber: document.getElementById('inviteRoomNumber'),
    copyInviteBtn: document.getElementById('copyInviteBtn'),
    closeInviteBtn: document.getElementById('closeInviteBtn'),
    recentEmojisSection: document.getElementById('recentEmojisSection'),
    recentEmojisContainer: document.getElementById('recentEmojisContainer'),
    colorModal: document.getElementById('colorModal'),
    colorGrid: document.getElementById('colorGrid')
};

// ==================== КНОПКИ БЫСТРЫХ ДЕЙСТВИЙ ====================
const quickActionsBtn = document.getElementById('quickActionsBtn');
const quickActions = document.getElementById('quickActions');
const quickDiceBtn = document.getElementById('quickDiceBtn');
const quickBuildBtn = document.getElementById('quickBuildBtn');
const quickChatBtn = document.getElementById('quickChatBtn');
const quickTasksBtn = document.getElementById('quickTasksBtn');
const quickInviteBtn = document.getElementById('quickInviteBtn');
const quickThemeBtn = document.getElementById('quickThemeBtn');

// ==================== НЕДАВНИЕ СМАЙЛИКИ ====================
let recentEmojis = JSON.parse(localStorage.getItem('recentEmojis') || '[]');

function addRecentEmoji(emoji) {
    if (!recentEmojis.includes(emoji)) {
        recentEmojis.unshift(emoji);
        if (recentEmojis.length > 10) recentEmojis = recentEmojis.slice(0, 10);
        localStorage.setItem('recentEmojis', JSON.stringify(recentEmojis));
        updateRecentEmojisDisplay();
    }
}

function updateRecentEmojisDisplay() {
    if (!elements.recentEmojisContainer) return;
    elements.recentEmojisContainer.innerHTML = '';
    if (recentEmojis.length === 0) {
        elements.recentEmojisSection.style.display = 'none';
        return;
    }
    elements.recentEmojisSection.style.display = 'block';
    recentEmojis.forEach(emoji => {
        const emojiItem = document.createElement('div');
        emojiItem.className = 'recent-emoji-item';
        emojiItem.textContent = emoji;
        emojiItem.title = emoji;
        emojiItem.addEventListener('click', () => {
            elements.chatInput.value += emoji;
            elements.chatInput.focus();
            addRecentEmoji(emoji);
        });
        elements.recentEmojisContainer.appendChild(emojiItem);
    });
}

// ==================== ВЫБОР ЦВЕТА ФИШКИ ====================
function showColorModal() {
    renderColorOptions();
    elements.colorModal.classList.add('active');
}

function renderColorOptions() {
    elements.colorGrid.innerHTML = '';
    const takenColors = Object.values(gameState.players)
        .filter(p => p.id !== socket.id && p.hasSelectedColor && p.connected)
        .map(p => p.color.toLowerCase());
        
    PLAYER_COLORS.forEach(colorObj => {
        const btn = document.createElement('div');
        btn.className = 'color-btn';
        btn.style.backgroundColor = colorObj.hex;
        btn.title = colorObj.name;
        
        if (takenColors.includes(colorObj.hex.toLowerCase())) {
            btn.classList.add('disabled');
        } else {
            btn.addEventListener('click', () => {
                selectPlayerColor(colorObj.hex);
            });
        }
        elements.colorGrid.appendChild(btn);
    });
}

function selectPlayerColor(hexColor) {
    socket.emit('select_color', { color: hexColor });
    elements.colorModal.classList.remove('active');
    showNotification('Цвет фишки успешно выбран!', 'success');
    
    if (gameState.currentPlayer) {
        gameState.currentPlayer.color = hexColor;
        gameState.players[socket.id].color = hexColor;
        gameState.players[socket.id].hasSelectedColor = true;
        updatePlayerMarkers();
        updatePlayersList();
    }
}

// ==================== СВЕТЛАЯ ТЕМА ====================
function toggleLightTheme() {
    lightThemeEnabled = !lightThemeEnabled;
    if (lightThemeEnabled) {
        document.body.classList.add('light-theme');
        quickThemeBtn.innerHTML = '🌙<div class="tooltip">Включить темную тему</div>';
        showNotification('🌞 Светлая тема включена!', 'info');
        localStorage.setItem('lightTheme', 'enabled');
    } else {
        document.body.classList.remove('light-theme');
        quickThemeBtn.innerHTML = '🌞<div class="tooltip">Включить светлую тему</div>';
        showNotification('🌙 Темная тема включена', 'info');
        localStorage.setItem('lightTheme', 'disabled');
    }
}

// ==================== ВЫБОР СМАЙЛИКОВ ====================
function initEmojiPicker() {
    const emojiCategories = {
        "Эмоции": ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"],
        "Природа": ["🌍", "🌎", "🌏", "🌱", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🌸", "🌹", "🌺", "🌻", "🌼", "💐", "🌷", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "🌪️", "🌫️", "🌊", "💧", "☔", "🔥", "⭐", "🌟", "🌠", "🌈"],
        "Экология": ["🌱", "🌿", "🌳", "🌲", "🌍", "🌎", "🌏", "♻️", "💧", "☀️", "💨", "🔥", "🌀", "🌊", "🦋", "🐝", "🐞", "🌺", "🍃", "🪴", "🏞️", "🗑️", "🚯", "🚮", "🚰", "🚱", "🧴", "🧽", "🛁", "🚿", "🛀", "🧼", "🪣", "🧹", "🧺", "🧻", "🚽", "🧼", "🫧"]
    };
    
    let emojiPickerVisible = false;
    elements.emojiPicker.innerHTML = '';
    
    const recentSection = document.createElement('div');
    recentSection.className = 'recent-emojis-section';
    recentSection.id = 'emojiPickerRecentSection';
    
    const recentTitle = document.createElement('div');
    recentTitle.className = 'recent-emojis-title';
    recentTitle.textContent = 'Недавние смайлики:';
    recentSection.appendChild(recentTitle);
    
    const recentContainer = document.createElement('div');
    recentContainer.className = 'recent-emojis-container';
    recentContainer.id = 'emojiPickerRecentContainer';
    recentSection.appendChild(recentContainer);
    
    elements.emojiPicker.appendChild(recentSection);
    
    function updateEmojiPickerRecent() {
        recentContainer.innerHTML = '';
        if (recentEmojis.length === 0) {
            recentSection.style.display = 'none';
            return;
        }
        recentSection.style.display = 'block';
        recentEmojis.forEach(emoji => {
            const emojiItem = document.createElement('div');
            emojiItem.className = 'emoji-item';
            emojiItem.textContent = emoji;
            emojiItem.title = emoji;
            emojiItem.addEventListener('click', () => {
                elements.chatInput.value += emoji;
                elements.chatInput.focus();
                addRecentEmoji(emoji);
            });
            recentContainer.appendChild(emojiItem);
        });
    }
    
    for (const category in emojiCategories) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'emoji-category';
        
        const title = document.createElement('div');
        title.className = 'emoji-category-title';
        title.textContent = category;
        categoryDiv.appendChild(title);
        
        const emojiList = document.createElement('div');
        emojiList.className = 'emoji-list';
        
        emojiCategories[category].forEach(emoji => {
            const emojiItem = document.createElement('div');
            emojiItem.className = 'emoji-item';
            emojiItem.textContent = emoji;
            emojiItem.title = emoji;
            emojiItem.addEventListener('click', () => {
                elements.chatInput.value += emoji;
                elements.chatInput.focus();
                addRecentEmoji(emoji);
                updateEmojiPickerRecent();
            });
            emojiList.appendChild(emojiItem);
        });
        
        categoryDiv.appendChild(emojiList);
        elements.emojiPicker.appendChild(categoryDiv);
    }
    
    updateEmojiPickerRecent();
    
    elements.emojiPickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPickerVisible = !emojiPickerVisible;
        if (emojiPickerVisible) {
            elements.emojiPicker.classList.add('show');
            updateEmojiPickerRecent();
        } else {
            elements.emojiPicker.classList.remove('show');
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!elements.emojiPicker.contains(e.target) && !elements.emojiPickerBtn.contains(e.target)) {
            elements.emojiPicker.classList.remove('show');
            emojiPickerVisible = false;
        }
    });
}

// ==================== ИГРОВЫЕ ДАННЫЕ ====================
const gameData = {
    cities: {
        tver: { name: "Тверь", position: 1, description: "Стартовый город", history: "Один из древнейших городов России.", problem: "Загрязнение воздуха.", task: "Посадите деревья." },
        kineshma: { name: "Кинешма", position: 2, description: "Город на Волге", history: "Старинный город на Волге.", problem: "Загрязнение воды.", task: "Очистите берега." },
        naberezhnye_chelny: { name: "Набережные Челны", position: 3, description: "Автомобилестроители", history: "Молодой город.", problem: "Выбросы.", task: "Экологичные технологии." },
        kazan: { name: "Казань", position: 4, description: "Столица Татарстана", history: "Тысячелетний город.", problem: "Пробки, отходы.", task: "Развитие велоинфраструктуры." },
        volgograd: { name: "Волгоград", position: 5, description: "Город-герой", history: "Город-герой на Волге.", problem: "Промышленное загрязнение.", task: "Модернизация предприятий." },
        astrakhan: { name: "Астрахань", position: 6, description: "Конечная точка маршрута", history: "Древний город в дельте.", problem: "Опустынивание.", task: "Сохранение экосистемы." }
    },
    buildings: [
        { name: "Станция переработки", cost: 50, points: 100, description: "Перерабатывает мусор" },
        { name: "Солнечная электростанция", cost: 100, points: 200, description: "Производит чистую энергию" },
        { name: "Эко-парк", cost: 150, points: 300, description: "Зеленая зона для отдыха" },
        { name: "Ветряная мельница", cost: 200, points: 400, description: "Энергия из ветра" },
        { name: "Очистные сооружения", cost: 250, points: 500, description: "Очищает воду" }
    ],
    difficultyRequirements: { easy: { level: 1 }, medium: { level: 5 }, hard: { level: 10 } }
};

let mapData = { cells: [], imageLoaded: false };

let gameState = {
    currentPlayer: null, currentPlayerId: null, players: {}, roomId: null, cityProgress: {},
    currentTask: null, currentDifficulty: "easy", gameOver: false, usedTasks: { easy: [], medium: [], hard: [] },
    nextCity: null, askedForChoice: {}, taskInProgress: false, dragItems: [], dropZones: [],
    sortItems: [], sortBins: [], selectedPuzzlePieces: [], cleanupItems: [], cleanupCount: 0,
    reconnected: false, playerProgress: {}, currentTurn: null, turnOrder: [], isMyTurn: false,
    isAtNewCity: false, hasUnfinishedTask: false, matchGameState: { cards: [], flippedCards: [], matchedPairs: 0, canFlip: true },
    quizSelectedAnswer: null, visitedCities: {}
};

// ==================== СОБЫТИЯ SOCKET.IO ====================
function updateConnectionStatus(status, text) {
    if (elements.connectionStatusDot) {
        elements.connectionStatusDot.className = 'connection-dot';
        if (status === 'connected') {
            elements.connectionStatusDot.classList.add('connected');
            elements.connectionStatusText.textContent = 'Подключено';
        } else if (status === 'connecting') {
            elements.connectionStatusDot.classList.add('connecting');
            elements.connectionStatusText.textContent = 'Подключение...';
        } else {
            elements.connectionStatusDot.classList.add('error');
            elements.connectionStatusText.textContent = 'Ошибка';
        }
    }
}

socket.on('connect', () => {
    isConnected = true;
    updateConnectionStatus('connected', '✅ Подключено к серверу');
    if (gameState.currentPlayerId && gameState.reconnected) socket.emit('player_reconnected');
    setTimeout(requestAllPlayersPositions, 2000);
});

socket.on('disconnect', () => {
    isConnected = false;
    updateConnectionStatus('error', '❌ Не подключено к серверу');
    gameState.reconnected = true;
});

socket.on('join-success', (playerData) => {
    gameState.roomId = playerData.roomId || currentRoomId;
    gameState.reconnected = playerData.reconnected || false;
    gameState.currentTurn = playerData.currentTurn;
    gameState.turnOrder = playerData.turnOrder || [];
    gameState.isMyTurn = playerData.isMyTurn || false;
    gameState.hasUnfinishedTask = playerData.hasUnfinishedTask || false;
    
    if (playerData.playerProgress) gameState.playerProgress[playerData.playerId] = playerData.playerProgress;
    
    initializeGame(playerData);
    setTimeout(requestAllPlayersPositions, 1500);
    updateTurnIndicator();
    
    if (gameState.hasUnfinishedTask && gameState.currentTask) {
        elements.currentTask.style.display = 'block';
        elements.taskDescription.textContent = gameState.currentTask.description;
        elements.noTaskMessage.style.display = 'none';
        elements.completeTaskBtn.disabled = false;
        hasCurrentTask = true;
        elements.rollDiceBtn.disabled = true;
    }

    if (!playerData.hasSelectedColor && !gameState.reconnected) {
        setTimeout(showColorModal, 500);
    }
});

socket.on('room-error', (message) => {
    showNotification(typeof message === 'object' ? message.message : message, 'error');
    resetGameState();
    elements.authSection.style.display = 'block';
    elements.gameContent.style.display = 'none';
    elements.resourcesPlaceholder.style.display = 'none';
});

socket.on('room_state', (roomData) => {
    updateRoomState(roomData);
    if (roomData.currentTurn) {
        gameState.currentTurn = roomData.currentTurn;
        gameState.turnOrder = roomData.turnOrder || [];
        gameState.isMyTurn = (socket.id === roomData.currentTurn);
        updateTurnIndicator();
    }
});

socket.on('player_joined', (data) => {
    gameState.players[data.playerId] = data.player;
    updatePlayersList();
    updatePlayerMarkers();
    addLogEntry(`🎉 Игрок "${data.player.name}" присоединился!`);
    setTimeout(requestAllPlayersPositions, 1000);
});

socket.on('player_reconnected', (data) => {
    if (gameState.players[data.playerId]) gameState.players[data.playerId].connected = true;
    updatePlayersList();
    updatePlayerMarkers();
    addLogEntry(`🔌 Игрок "${data.playerName}" вернулся.`);
});

socket.on('player_left', (data) => {
    if (gameState.players[data.playerId]) gameState.players[data.playerId].connected = false;
    updatePlayersList();
    updatePlayerMarkers();
    addLogEntry(`👋 Игрок "${data.playerName}" вышел.`);
});

socket.on('player_color_updated', (data) => {
    if (gameState.players[data.playerId]) {
        gameState.players[data.playerId].color = data.color;
        gameState.players[data.playerId].hasSelectedColor = true;
        if (data.playerId === socket.id && gameState.currentPlayer) gameState.currentPlayer.color = data.color;
        updatePlayerMarkers();
        updatePlayersList();
    }
    if (elements.colorModal.classList.contains('active')) renderColorOptions();
});

socket.on('new_chat_message', (data) => {
    if (data.playerName && data.message) addChatMessage(data.playerName, data.message, false);
});

socket.on('chat_history', (messages) => {
    elements.chatMessages.innerHTML = '';
    messages.forEach(msg => {
        if (msg.playerName && msg.playerName !== 'Система') addChatMessage(msg.playerName, msg.message, false);
    });
});

socket.on('player_dice_roll', (data) => {
    if (gameState.players[data.playerId] && data.playerId !== gameState.currentPlayerId) {
        gameState.players[data.playerId].position = data.newPosition;
        updateOtherPlayerMarker(data.playerId, gameState.players[data.playerId].name, data.newPosition, '', gameState.players[data.playerId].color);
        addLogEntry(`🎲 "${gameState.players[data.playerId].name}" бросил кубик: ${data.diceValue}`);
    }
});

socket.on('progress_updated', (data) => {
    if (!gameState.playerProgress[data.playerId]) gameState.playerProgress[data.playerId] = {};
    gameState.playerProgress[data.playerId][data.cityKey] = data.progress;
    if (data.playerId === gameState.currentPlayerId) {
        createCurrentCityProgress();
        createCitiesGrid();
    }
});

socket.on('turn_update', (data) => {
    gameState.currentTurn = data.currentTurn;
    gameState.turnOrder = data.turnOrder || [];
    gameState.isMyTurn = (socket.id === data.currentTurn);
    updateTurnIndicator();
    if (gameState.isMyTurn) {
        showNotification('🎉 Ваш ход! Бросайте кубик.', 'success');
        elements.rollDiceBtn.disabled = false;
    } else {
        elements.rollDiceBtn.disabled = true;
    }
});

socket.on('player_position_update', (data) => {
    if (data.playerId !== socket.id) {
        updateOtherPlayerMarker(data.playerId, data.playerName, data.position, data.city, data.color);
    }
});

socket.on('all_players_positions', (data) => {
    for (const playerId in data.players) {
        const p = data.players[playerId];
        updateOtherPlayerMarker(playerId, p.name, p.position, p.city, p.color);
    }
});

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function sendPlayerPositionToServer(position, city) {
    if (socket.connected && gameState.currentPlayer) socket.emit('player_position_update', { position, city });
}

function requestAllPlayersPositions() {
    if (socket.connected) socket.emit('request_all_positions');
}

function updateOtherPlayerMarker(playerId, playerName, position, city, color) {
    let marker = document.getElementById(`marker-${playerId}`);
    if (!marker) {
        marker = document.createElement('div');
        marker.className = 'player-marker';
        marker.id = `marker-${playerId}`;
        marker.innerHTML = '<i class="fas fa-user" style="font-size: 10px; color: white;"></i>';
        const tooltip = document.createElement('div');
        tooltip.className = 'player-tooltip';
        tooltip.style.cssText = 'position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; opacity: 0; transition: opacity 0.3s; pointer-events: none;';
        marker.appendChild(tooltip);
        marker.addEventListener('mouseenter', () => tooltip.style.opacity = '1');
        marker.addEventListener('mouseleave', () => tooltip.style.opacity = '0');
        elements.mapOverlay.appendChild(marker);
    }
    
    marker.style.background = color || '#8e44ad';
    
    const cell = mapData.cells.find(c => c.number === position);
    if (cell) {
        marker.style.left = `${cell.x + cell.width/2}px`;
        marker.style.top = `${cell.y + cell.height/2}px`;
        const t = marker.querySelector('.player-tooltip');
        if (t) t.textContent = `${playerName} (поз. ${position})`;
    }
    updatePlayerInList(playerId, position, playerName);
}

function updatePlayerInList(playerId, position, playerName) {
    let found = false;
    document.querySelectorAll('.player-item').forEach(item => {
        if (item.dataset.playerId === playerId) {
            found = true;
            const pos = item.querySelector('.player-position-badge');
            if (pos) pos.textContent = `поз. ${position}`;
        }
    });
    if (!found) updatePlayersList();
}

function showNotification(message, type = 'info') {
    elements.notification.textContent = message;
    elements.notification.className = `notification show ${type}`;
    setTimeout(() => elements.notification.classList.remove('show'), 3000);
}

function joinGame(username, roomId, isNewRoom) {
    if (!isConnected) return showNotification('Нет подключения к серверу.', 'error');
    currentRoomId = roomId;
    socket.emit('join-room', { roomId, playerName: username, isNewRoom });
}

function initializeGame(playerData) {
    gameState.currentPlayer = playerData;
    gameState.currentPlayerId = socket.id;
    if (!gameState.playerProgress[socket.id]) {
        gameState.playerProgress[socket.id] = {};
        for (const cityKey in gameData.cities) gameState.playerProgress[socket.id][cityKey] = 0;
    }
    
    elements.authSection.style.display = 'none';
    elements.gameContent.style.display = 'block';
    elements.resourcesPlaceholder.style.display = 'flex';
    elements.roomNumber.textContent = currentRoomId || gameState.roomId;
    
    updatePlayerUI();
    loadMap();
    createCitiesGrid();
    createBuildingsList();
    updateDifficultyButtons();
    updateLevelProgress();
    initializeQuickActions();
    initEmojiPicker();
    updateRecentEmojisDisplay();
    
    if (localStorage.getItem('lightTheme') === 'enabled') toggleLightTheme();
    
    updateRollDiceButtonState();
    socket.emit('get_room_state');
}

function resetGameState() {
    hasCurrentTask = false;
    elements.interactiveTask.style.display = 'none';
    elements.currentTask.style.display = 'none';
    elements.noTaskMessage.style.display = 'block';
    elements.completeTaskBtn.disabled = true;
    elements.rollDiceBtn.disabled = true;
    elements.buildBtn.disabled = true;
    elements.moveBtn.disabled = true;
}

function updateRoomState(roomData) {
    gameState.players = roomData.players || {};
    if (roomData.playerProgress) gameState.playerProgress = roomData.playerProgress;
    updatePlayersList();
    updatePlayerMarkers();
    elements.onlinePlayers.textContent = Object.values(gameState.players).filter(p => p.connected).length;
    createCurrentCityProgress();
    if (gameState.players[socket.id]) {
        gameState.currentPlayer = gameState.players[socket.id];
        updatePlayerUI();
        createCitiesGrid();
    }
}

function addChatMessage(sender, message) {
    const el = document.createElement('div');
    el.className = 'chat-message';
    el.innerHTML = `<span class="chat-sender">${sender}:</span> <span class="chat-text">${message}</span>`;
    elements.chatMessages.appendChild(el);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function savePlayerState() {
    if (!isConnected || !gameState.currentPlayer) return;
    socket.emit('player-update', {
        id: socket.id,
        name: gameState.currentPlayer.name,
        position: gameState.currentPlayer.position,
        city: gameState.currentPlayer.city,
        coins: gameState.currentPlayer.coins,
        cleaningPoints: gameState.currentPlayer.cleaningPoints,
        level: gameState.currentPlayer.level,
        completedTasks: gameState.currentPlayer.completedTasks,
        color: gameState.currentPlayer.color,
        hasSelectedColor: gameState.currentPlayer.hasSelectedColor,
        progress: gameState.playerProgress[socket.id]
    });
}

function sendChatMessage(message) {
    if (isConnected && gameState.currentPlayer) {
        socket.emit('chat_message', { message });
        elements.chatInput.value = '';
    }
}

// ==================== КАРТА ====================
function loadMap() {
    if (window.mapData && window.mapData.imageUrl) {
        elements.mapImage.src = window.mapData.imageUrl;
        elements.mapImage.onload = () => { mapData.imageLoaded = true; loadSavedMap(); };
        elements.mapImage.onerror = () => loadSavedMap();
    } else {
        loadSavedMap();
    }
}

function loadSavedMap() {
    fetch('eco-game-map-2025-12-27.json')
        .then(res => res.json())
        .then(data => {
            mapData.cells = data.cells;
            createMapCells();
        }).catch(() => createDefaultMap());
}

function createDefaultMap() {
    const w = elements.mapContainer.offsetWidth, h = elements.mapContainer.offsetHeight;
    const pos = [
        { city: 'tver', x: w*0.1, y: h*0.3, number: 1, type: 'start' },
        { city: 'kineshma', x: w*0.3, y: h*0.4, number: 2, type: 'city' },
        { city: 'naberezhnye_chelny', x: w*0.5, y: h*0.3, number: 3, type: 'city' },
        { city: 'kazan', x: w*0.7, y: h*0.4, number: 4, type: 'city' },
        { city: 'volgograd', x: w*0.6, y: h*0.6, number: 5, type: 'city' },
        { city: 'astrakhan', x: w*0.8, y: h*0.7, number: 6, type: 'finish' }
    ];
    mapData.cells = pos.map((p, i) => ({ id: i+1, ...p, width: 40, height: 40 }));
    createMapCells();
}

function createMapCells() {
    elements.mapOverlay.innerHTML = '';
    mapData.cells.forEach(c => {
        const el = document.createElement('div');
        el.className = `map-cell hidden ${c.type}`;
        el.style.left = `${c.x}px`; el.style.top = `${c.y}px`;
        el.style.width = `${c.width}px`; el.style.height = `${c.height}px`;
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (c.type === 'city') showCityModal(c.city);
        });
        elements.mapOverlay.appendChild(el);
    });
    updatePlayerMarkers();
}

// ==================== UI ОБНОВЛЕНИЯ ====================
function updatePlayersList() {
    elements.playersContainer.innerHTML = '';
    let arr = Object.entries(gameState.players);
    if (gameState.turnOrder.length > 0) {
        arr.sort((a,b) => gameState.turnOrder.indexOf(a[0]) - gameState.turnOrder.indexOf(b[0]));
    }
    arr.forEach(([id, p]) => {
        const item = document.createElement('div');
        item.className = `player-item ${id === socket.id ? 'current' : ''} ${id === gameState.currentTurn ? 'turn' : ''}`;
        if (!p.connected) item.style.opacity = '0.6';
        const colorBadge = `<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${p.color || '#fff'}; margin-right:5px; border:1px solid rgba(255,255,255,0.5);"></span>`;
        item.innerHTML = `
            <span>${p.connected ? '🟢' : '🔴'} ${colorBadge}${p.name}
                ${id === socket.id ? '<span style="color:#8e44ad;">(Вы)</span>' : ''}
                <span class="player-position-badge">поз. ${p.position || 0}</span>
            </span>
            <span><strong>${p.cleaningPoints}</strong> баллов</span>`;
        elements.playersContainer.appendChild(item);
    });
}

function updatePlayerUI() {
    if (!gameState.currentPlayer) return;
    const p = gameState.currentPlayer;
    elements.playerName.textContent = p.name;
    elements.currentCity.textContent = gameData.cities[p.city]?.name || 'Тверь';
    elements.currentPosition.textContent = p.position;
    elements.coinsCount.textContent = p.coins;
    elements.cleaningPoints.textContent = p.cleaningPoints;
    elements.playerLevel.textContent = p.level;
    elements.topCoinsCount.textContent = p.coins;
    elements.topPlayerLevel.textContent = p.level + ' ур.';
    updateLevelProgress();
}

function updateLevelProgress() {
    const p = (gameState.currentPlayer?.completedTasks || 0) % 3 * 33.33;
    elements.levelProgressFill.style.width = `${p}%`;
}

function updateTurnIndicator() {
    if (!gameState.currentTurn) {
        elements.turnIndicator.style.display = 'none'; return;
    }
    elements.turnIndicator.style.display = 'block';
    if (gameState.isMyTurn) {
        elements.turnIndicator.className = 'turn-indicator your-turn';
        elements.turnMessage.textContent = '🎉 Ваш ход! Бросайте кубик.';
    } else {
        elements.turnIndicator.className = 'turn-indicator other-turn';
        const p = gameState.players[gameState.currentTurn];
        elements.turnMessage.textContent = p ? `⏳ Ходит ${p.name}.` : 'Ожидание...';
    }
}

function updateRollDiceButtonState() {
    elements.rollDiceBtn.disabled = (gameState.gameOver || gameState.taskInProgress || !gameState.isMyTurn || hasCurrentTask);
    elements.rollDiceBtn.style.opacity = elements.rollDiceBtn.disabled ? '0.7' : '1';
}

function createCurrentCityProgress() {
    if (!gameState.currentPlayer?.city) return;
    const city = gameState.currentPlayer.city;
    const prog = gameState.playerProgress[socket.id]?.[city] || 0;
    elements.cityProgressContainer.innerHTML = `
        <div class="city-progress">
            <div class="city-progress-header"><span>${gameData.cities[city].name}</span><span>${prog}%</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width:${prog}%;"></div></div>
        </div>`;
    elements.moveBtn.disabled = !(prog >= 100 && canMoveToNextCity());
    elements.moveBtn.textContent = elements.moveBtn.disabled ? "Завершите очищение" : "🚗 Следующий город";
}

function canMoveToNextCity() {
    const keys = Object.keys(gameData.cities);
    const idx = keys.indexOf(gameState.currentPlayer?.city);
    if (idx === -1 || idx >= keys.length - 1) return false;
    const cell = mapData.cells.find(c => c.number === gameState.currentPlayer.position);
    return cell && cell.city === keys[idx + 1];
}

function createCitiesGrid() {
    elements.citiesGrid.innerHTML = '';
    const cur = gameState.currentPlayer?.city;
    for (const key in gameData.cities) {
        const prog = gameState.playerProgress[socket.id]?.[key] || 0;
        const isCur = key === cur;
        const el = document.createElement('div');
        el.className = `city-card ${isCur ? 'active' : ''} ${prog >= 100 ? 'completed' : ''}`;
        el.innerHTML = `
            <div class="city-name">${gameData.cities[key].name}</div>
            <div class="city-progress-mini"><div class="city-progress-fill" style="width:${prog}%;"></div></div>
            ${canAccessCity(key) && !isCur ? `<button class="city-action-btn">🚗 Перейти</button>` : ''}`;
        
        el.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') showCityModal(key);
            else { e.stopPropagation(); moveToExistingCity(key); }
        });
        elements.citiesGrid.appendChild(el);
    }
}

function canAccessCity(key) {
    const keys = Object.keys(gameData.cities);
    const target = keys.indexOf(key), cur = keys.indexOf(gameState.currentPlayer?.city);
    if (target < cur) return true;
    if (target === cur + 1) return (gameState.playerProgress[socket.id]?.[keys[cur]] || 0) >= 100;
    return false;
}

function createBuildingsList() {
    elements.buildingsContainer.innerHTML = '';
    gameData.buildings.forEach((b, i) => {
        const el = document.createElement('div');
        el.className = 'building-item';
        el.innerHTML = `
            <div><b>${b.name} (${b.cost} 🪙)</b><br><small>${b.description}</small></div>
            <button class="game-btn buy-btn" data-idx="${i}">Купить</button>`;
        elements.buildingsContainer.appendChild(el);
    });
    
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const b = gameData.buildings[this.dataset.idx];
            if (gameState.currentPlayer.coins >= b.cost) {
                gameState.currentPlayer.coins -= b.cost;
                gameState.currentPlayer.cleaningPoints += b.points;
                updateCityProgress(gameState.currentPlayer.city, Math.min(100, (gameState.playerProgress[socket.id]?.[gameState.currentPlayer.city] || 0) + 15));
                updatePlayerUI();
                savePlayerState();
                showNotification(`Построено: ${b.name}`, 'success');
            } else showNotification('Недостаточно монет!', 'warning');
        });
    });
}

function updateCityProgress(city, prog) {
    if (!gameState.playerProgress[socket.id]) gameState.playerProgress[socket.id] = {};
    gameState.playerProgress[socket.id][city] = prog;
    createCurrentCityProgress();
    socket.emit('update_progress', { cityKey: city, progress: prog, playerId: socket.id });
    createCitiesGrid();
    checkGameCompletion();
}

function checkGameCompletion() {
    const allDone = Object.values(gameState.playerProgress[socket.id] || {}).filter(p => p >= 100).length === Object.keys(gameData.cities).length;
    const isFinish = mapData.cells.find(c => c.number === gameState.currentPlayer.position)?.type === 'finish';
    if (allDone && isFinish) {
        gameState.gameOver = true;
        showNotification('🎊 Игра пройдена!', 'success');
        elements.rollDiceBtn.disabled = elements.buildBtn.disabled = true;
    }
}

function checkForCityTransition(oldPos, newPos) {
    const oldC = mapData.cells.find(c => c.number === oldPos)?.city;
    const newC = mapData.cells.find(c => c.number === newPos)?.city;
    if (newC && oldC !== newC && !gameState.visitedCities[newC]) {
        showNotification(`🏙️ Добро пожаловать в ${gameData.cities[newC].name}`, 'info');
        gameState.visitedCities[newC] = true;
        setTimeout(() => showCityModal(newC), 1000);
    }
}

function moveToExistingCity(key) {
    if (!canAccessCity(key)) return;
    const cell = mapData.cells.find(c => c.city === key);
    if (!cell) return;
    
    gameState.currentPlayer.position = cell.number;
    gameState.currentPlayer.city = key;
    updatePlayerUI();
    updateOtherPlayerMarker(socket.id, gameState.currentPlayer.name, cell.number, key, gameState.currentPlayer.color);
    sendPlayerPositionToServer(cell.number, key);
    savePlayerState();
    createCitiesGrid();
    createCurrentCityProgress();
    showNotification(`Вы переместились в ${gameData.cities[key].name}`, 'success');
}

function showCityModal(key) {
    const city = gameData.cities[key];
    elements.cityModalTitle.textContent = city.name;
    elements.cityModalSubtitle.textContent = city.description;
    elements.cityModalHistory.textContent = city.history;
    elements.cityModalProblem.textContent = city.problem;
    elements.cityModalTask.textContent = city.task;
    elements.cityModalProgressFill.style.width = `${gameState.playerProgress[socket.id]?.[key] || 0}%`;
    elements.cityModal.classList.add('active');
}
function closeCityModal() { elements.cityModal.classList.remove('active'); }
function showInviteModal() { elements.inviteRoomNumber.textContent = currentRoomId; elements.inviteModal.classList.add('active'); }
function closeInviteModal() { elements.inviteModal.classList.remove('active'); }
function copyInvitation() {
    navigator.clipboard.writeText(`Номер комнаты: ${currentRoomId}\nhttps://eco-game-dfb0.onrender.com`);
    showNotification('Скопировано!', 'success');
}

function addLogEntry(msg) {
    const el = document.createElement('div');
    el.className = 'log-entry'; el.innerHTML = `<i class="fas fa-info-circle"></i> ${msg}`;
    elements.logEntries.appendChild(el);
    elements.logEntries.scrollTop = elements.logEntries.scrollHeight;
}

// ==================== ЗАДАНИЯ ====================
const gameDataTasks = {
    tasks: {
        easy: [
            { description: "Посадите 3 дерева 🌲", type: "drag_click", goal: 3, items: ["🌲", "🌳", "🌲", "🌲", "🌳"], correctItems: ["🌲", "🌲", "🌲"] },
            { description: "Сортируйте мусор 🗑️", type: "sort_click", items: [{name: "Бумага", type: "paper", emoji: "📄"}, {name: "Пластик", type: "plastic", emoji: "🥤"}] },
            { description: "Что разлагается дольше? ❓", type: "quiz", options: [{text: "Бумага", correct: false}, {text: "Пластик", correct: true}] },
            { description: "Соберите мусор 🧹", type: "clean", goal: 4, items: ["🗑️", "🗑️", "🗑️", "🗑️", "🌿"] },
            { description: "Пазл 🌍", type: "puzzle_image", pieces: 4, imageType: "ecology" },
            { description: "Найди пару 🎯", type: "match_game", pairs: 4, symbols: ["🌍", "♻️", "🌳", "💧"] }
        ],
        medium: [
            { description: "Очистите реку 🌊", type: "clean", goal: 5, items: ["🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🌿"] },
            { description: "Пищевая цепь 🐟", type: "sequence_click", items: ["🌿", "🐛", "🐦", "🦊"], correctOrder: ["🌿", "🐛", "🐦", "🦊"] }
        ],
        hard: [
            { description: "Сложный пазл 🧩", type: "puzzle_image", pieces: 9, imageType: "nature" }
        ]
    }
};

function getRandomTask(diff) {
    const t = gameDataTasks.tasks[diff];
    return t[Math.floor(Math.random() * t.length)];
}

function shuffleArray(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

function createInteractiveTask(task) {
    elements.taskArea.innerHTML = '';
    elements.checkTaskBtn.style.display = 'none';
    elements.retryTaskBtn.style.display = 'none';
    elements.taskResult.textContent = '';
    gameState.taskInProgress = true; hasCurrentTask = true;
    
    if (task.type === "quiz") createQuizTask(task);
    else if (task.type === "drag_click") createDragClickTask(task);
    else if (task.type === "sort_click") createSortClickTask(task);
    else if (task.type === "clean") createCleanupTask(task);
    else if (task.type === "puzzle_image") createPuzzleImageTask(task);
    else if (task.type === "sequence_click") createSequenceClickTask(task);
    else if (task.type === "match_game") createMatchGameTask(task);
    
    elements.completeTaskBtn.style.display = 'none';
    elements.checkTaskBtn.style.display = 'block';
    updateRollDiceButtonState();
}

function completeInteractiveTask() {
    let coins = gameState.currentDifficulty === 'hard' ? 60 : (gameState.currentDifficulty === 'medium' ? 40 : 20);
    gameState.currentPlayer.coins += coins;
    gameState.currentPlayer.completedTasks++;
    
    if (gameState.currentPlayer.completedTasks % 3 === 0) {
        gameState.currentPlayer.level++;
        showNotification('Уровень повышен!', 'success');
    }
    
    updateCityProgress(gameState.currentPlayer.city, Math.min(100, (gameState.playerProgress[socket.id]?.[gameState.currentPlayer.city]||0) + 10));
    updatePlayerUI();
    
    elements.interactiveTask.style.display = 'none';
    elements.currentTask.style.display = 'none';
    elements.noTaskMessage.style.display = 'block';
    elements.completeTaskBtn.style.display = 'block';
    gameState.taskInProgress = false; hasCurrentTask = false;
    
    if (gameState.isMyTurn) { socket.emit('end_turn'); updateTurnIndicator(); }
    savePlayerState();
    showNotification(`Задание выполнено! +${coins} 🪙`, 'success');
}

// РЕАЛИЗАЦИИ ЗАДАНИЙ
function createQuizTask(t) {
    elements.taskArea.innerHTML = `<b>${t.description}</b><div class="quiz-options">${t.options.map((o,i) => `<div class="quiz-option" data-c="${o.correct}">${o.text}</div>`).join('')}</div>`;
    let sel = null;
    document.querySelectorAll('.quiz-option').forEach(o => o.onclick = function() {
        if(sel) sel.classList.remove('selected');
        sel = this; this.classList.add('selected'); elements.checkTaskBtn.disabled = false;
    });
    elements.checkTaskBtn.onclick = () => {
        if(!sel) return;
        const correct = sel.dataset.c === 'true';
        sel.classList.add(correct ? 'correct' : 'incorrect');
        if(correct) setTimeout(completeInteractiveTask, 1000);
        else { elements.retryTaskBtn.style.display = 'block'; elements.checkTaskBtn.style.display = 'none'; }
    };
    elements.retryTaskBtn.onclick = () => createInteractiveTask(t);
}

function createDragClickTask(t) {
    elements.taskArea.innerHTML = `<b>${t.description}</b><br><div class="task-container">${t.items.map(i => `<div class="draggable-item" data-c="${t.correctItems.includes(i)}">${i}</div>`).join('')}</div>
    <div class="task-container">${Array(t.goal).fill('<div class="drop-zone"></div>').join('')}</div>`;
    let sel = null, correct = 0, placed = 0;
    document.querySelectorAll('.draggable-item').forEach(i => i.onclick = function() { sel=this; });
    document.querySelectorAll('.drop-zone').forEach(z => z.onclick = function() {
        if(sel && !this.innerHTML) {
            this.innerHTML = sel.innerHTML; sel.style.display='none'; placed++;
            if(sel.dataset.c==='true') correct++;
            sel = null;
            if(placed === t.goal) elements.checkTaskBtn.disabled = false;
        }
    });
    elements.checkTaskBtn.onclick = () => {
        if(correct >= t.goal) completeInteractiveTask();
        else { elements.retryTaskBtn.style.display = 'block'; }
    };
    elements.retryTaskBtn.onclick = () => createInteractiveTask(t);
}

function createSortClickTask(t) {
    elements.taskArea.innerHTML = `<b>${t.description}</b><div class="sorting-area">${t.items.map(i => `<div class="sort-bin" data-t="${i.type}">${i.emoji}</div>`).join('')}
    <br>${t.items.map(i => `<div class="sort-item" data-t="${i.type}">${i.emoji}</div>`).join('')}</div>`;
    let sel = null, sorted = 0;
    document.querySelectorAll('.sort-item').forEach(i => i.onclick = function() { sel=this; });
    document.querySelectorAll('.sort-bin').forEach(b => b.onclick = function() {
        if(sel) {
            if(sel.dataset.t === this.dataset.t) { sel.style.display='none'; sorted++; if(sorted===t.items.length) elements.checkTaskBtn.disabled=false; }
            else showNotification('Неверный контейнер', 'warning');
            sel=null;
        }
    });
    elements.checkTaskBtn.onclick = () => { if(sorted>=t.items.length) completeInteractiveTask(); };
}

function createCleanupTask(t) {
    elements.taskArea.innerHTML = `<b>${t.description}</b><div class="river-container">${t.items.map(i => `<div class="cleanup-item" data-t="${i==='🗑️'}" style="left:${Math.random()*80}%;top:${Math.random()*70}%;">${i}</div>`).join('')}</div>`;
    let count = 0;
    document.querySelectorAll('.cleanup-item').forEach(i => i.onclick = function() {
        if(this.dataset.t === 'true') { this.style.display='none'; count++; if(count>=t.goal) elements.checkTaskBtn.disabled=false; }
    });
    elements.checkTaskBtn.onclick = () => { if(count>=t.goal) completeInteractiveTask(); };
}

function createPuzzleImageTask(t) {
    const pieces = ["🌍", "♻️", "🌳", "💧", "🌱", "🌞", "🌀", "🌊", "🦋"].slice(0, t.pieces);
    elements.taskArea.innerHTML = `<b>${t.description}</b><br><div class="task-container" id="p1">${pieces.map(p=>`<div class="puzzle-target-slot" data-e="${p}"></div>`).join('')}</div>
    <div class="task-container" id="p2">${shuffleArray([...pieces]).map(p=>`<div class="puzzle-piece">${p}</div>`).join('')}</div>`;
    let sel = null, done = 0;
    document.querySelectorAll('.puzzle-piece').forEach(p => p.onclick = function() { sel=this; });
    document.querySelectorAll('.puzzle-target-slot').forEach(s => s.onclick = function() {
        if(sel && sel.innerHTML === this.dataset.e && !this.innerHTML) {
            this.innerHTML = sel.innerHTML; sel.style.display='none'; done++; sel=null;
            if(done>=t.pieces) elements.checkTaskBtn.disabled=false;
        }
    });
    elements.checkTaskBtn.onclick = () => { if(done>=t.pieces) completeInteractiveTask(); };
}

function createSequenceClickTask(t) {
    elements.taskArea.innerHTML = `<b>${t.description}</b><br><div class="task-container">${t.correctOrder.map(p=>`<div class="sequence-slot" data-e="${p}"></div>`).join('')}</div>
    <div class="task-container">${shuffleArray([...t.correctOrder]).map(p=>`<div class="sequence-piece">${p}</div>`).join('')}</div>`;
    let sel = null, done = 0;
    document.querySelectorAll('.sequence-piece').forEach(p => p.onclick = function() { sel=this; });
    document.querySelectorAll('.sequence-slot').forEach(s => s.onclick = function() {
        if(sel && sel.innerHTML === this.dataset.e && !this.innerHTML) {
            this.innerHTML = sel.innerHTML; sel.style.display='none'; done++; sel=null;
            if(done>=t.correctOrder.length) elements.checkTaskBtn.disabled=false;
        }
    });
    elements.checkTaskBtn.onclick = () => { if(done>=t.correctOrder.length) completeInteractiveTask(); };
}

function createMatchGameTask(t) {
    let cards = [];
    t.symbols.forEach((s,i) => { cards.push({s, id:i}); cards.push({s, id:i}); });
    elements.taskArea.innerHTML = `<b>${t.description}</b><div class="match-grid">${shuffleArray(cards).map(c=>`<div class="match-card" data-s="${c.s}"><div class="card-back">?</div><div class="card-content">${c.s}</div></div>`).join('')}</div>`;
    let flipped = [], matched = 0;
    document.querySelectorAll('.match-card').forEach(c => c.onclick = function() {
        if(flipped.length<2 && !this.classList.contains('flipped')) {
            this.classList.add('flipped'); flipped.push(this);
            if(flipped.length===2) {
                if(flipped[0].dataset.s === flipped[1].dataset.s) {
                    flipped.forEach(f=>f.classList.add('matched')); matched++; flipped=[];
                    if(matched >= t.pairs) elements.checkTaskBtn.disabled=false;
                } else {
                    setTimeout(() => { flipped.forEach(f=>f.classList.remove('flipped')); flipped=[]; }, 1000);
                }
            }
        }
    });
    elements.checkTaskBtn.onclick = () => { if(matched>=t.pairs) completeInteractiveTask(); };
}

function initializeQuickActions() {
    let vis = false;
    quickActionsBtn.onclick = () => { vis=!vis; quickActions.classList.toggle('show', vis); quickActionsBtn.classList.toggle('active', vis); };
    quickDiceBtn.onclick = () => elements.rollDiceBtn.click();
    quickBuildBtn.onclick = () => document.getElementById('buildingsContainer').scrollIntoView();
    quickChatBtn.onclick = () => elements.chatInput.focus();
    quickTasksBtn.onclick = () => document.querySelector('.task-card').scrollIntoView();
    quickInviteBtn.onclick = () => showInviteModal();
    quickThemeBtn.onclick = () => toggleLightTheme();
}

// ==================== DOM СОБЫТИЯ ====================
elements.loginTab.onclick = () => { elements.loginTab.classList.add('active'); elements.registerTab.classList.remove('active'); elements.loginForm.style.display='block'; elements.registerForm.style.display='none'; };
elements.registerTab.onclick = () => { elements.registerTab.classList.add('active'); elements.loginTab.classList.remove('active'); elements.registerForm.style.display='block'; elements.loginForm.style.display='none'; };

elements.loginForm.onsubmit = (e) => { e.preventDefault(); joinGame(document.getElementById('loginUsername').value, document.getElementById('loginRoom').value, false); };
elements.registerForm.onsubmit = (e) => { e.preventDefault(); joinGame(document.getElementById('registerUsername').value, document.getElementById('registerRoom').value, true); };

elements.rollDiceBtn.onclick = () => {
    if(elements.rollDiceBtn.disabled) return;
    elements.diceValue.classList.add('rolling'); elements.rollDiceBtn.disabled = true;
    setTimeout(() => {
        elements.diceValue.classList.remove('rolling');
        const val = Math.floor(Math.random()*6)+1;
        elements.diceValue.querySelector('.dice-value').textContent = val;
        
        const oldPos = gameState.currentPlayer.position;
        gameState.currentPlayer.position = Math.min(oldPos + val, mapData.cells.length);
        const cell = mapData.cells.find(c => c.number === gameState.currentPlayer.position);
        if(cell && cell.city) gameState.currentPlayer.city = cell.city;
        
        updatePlayerUI();
        updateOtherPlayerMarker(socket.id, gameState.currentPlayer.name, gameState.currentPlayer.position, gameState.currentPlayer.city, gameState.currentPlayer.color);
        sendPlayerPositionToServer(gameState.currentPlayer.position, gameState.currentPlayer.city);
        
        checkForCityTransition(oldPos, gameState.currentPlayer.position);
        
        gameState.currentTask = getRandomTask(gameState.currentDifficulty);
        elements.currentTask.style.display = 'block';
        elements.taskDescription.textContent = gameState.currentTask.description;
        elements.completeTaskBtn.disabled = false; hasCurrentTask = true;
        
        socket.emit('end_turn'); gameState.isMyTurn = false; updateTurnIndicator();
    }, 1200);
};

elements.completeTaskBtn.onclick = () => { elements.interactiveTask.style.display = 'block'; createInteractiveTask(gameState.currentTask); };
elements.sendMessageBtn.onclick = () => sendChatMessage(elements.chatInput.value);
elements.chatInput.onkeypress = (e) => { if(e.key === 'Enter') elements.sendMessageBtn.click(); };
elements.inviteBtn.onclick = showInviteModal;
elements.copyInviteBtn.onclick = copyInvitation;
elements.closeInviteBtn.onclick = closeInviteModal;
elements.leaveRoomBtn.onclick = () => {
    if(confirm('Покинуть комнату?')) { socket.emit('leave-room'); resetGameState(); elements.authSection.style.display='block'; elements.gameContent.style.display='none'; elements.resourcesPlaceholder.style.display='none'; }
};
elements.cityModalCloseBtn.onclick = closeCityModal;
elements.difficultyBtns.forEach(b => b.onclick = function() {
    if(!this.classList.contains('locked')) {
        elements.difficultyBtns.forEach(btn=>btn.classList.remove('active')); this.classList.add('active');
        gameState.currentDifficulty = this.id.replace('Btn', '');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if(!isConnected) showNotification('Нет связи с сервером', 'error'); }, 5000);
    updateRecentEmojisDisplay();
});
