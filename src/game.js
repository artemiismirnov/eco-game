// ==================== ИНИЦИАЛИЗАЦИЯ ====================
console.log('🎮 Игра "Юный эколог" загружается...');

const serverUrl = window.location.origin;
console.log('🌐 Подключаемся к серверу:', serverUrl);

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
let pendingJoinData = null; 
let selectedChipColor = null;
let checkRoomTimeout = null; // Таймер для защиты от зависаний

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
    colorOptions: document.getElementById('colorOptions'),
    confirmColorBtn: document.getElementById('confirmColorBtn'),
    cancelColorBtn: document.getElementById('cancelColorBtn')
};

// ==================== КНОПКИ БЫСТРЫХ ДЕЙСТВИЙ ====================
function initializeQuickActions() {
    let quickActionsVisible = false;
    elements.quickActionsBtn = document.getElementById('quickActionsBtn');
    elements.quickActions = document.getElementById('quickActions');
    
    if (!elements.quickActionsBtn) return;
    elements.quickActionsBtn.classList.add('show');
    
    elements.quickActionsBtn.addEventListener('click', function() {
        quickActionsVisible = !quickActionsVisible;
        if (quickActionsVisible) {
            elements.quickActions.classList.add('show');
            elements.quickActionsBtn.classList.add('active');
        } else {
            elements.quickActions.classList.remove('show');
            elements.quickActionsBtn.classList.remove('active');
        }
    });
    
    function scrollToElement(elementId) {
        const el = document.getElementById(elementId);
        if (el) { 
            el.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
            el.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)'; 
            setTimeout(() => el.style.boxShadow = '', 2000); 
        }
    }
    
    document.getElementById('quickDiceBtn').addEventListener('click', function() {
        quickActionsVisible = false; 
        elements.quickActions.classList.remove('show'); 
        elements.quickActionsBtn.classList.remove('active');
        scrollToElement('rollDiceBtn');
        setTimeout(() => {
            if (!elements.rollDiceBtn.disabled && !gameState.gameOver && !gameState.taskInProgress && !hasCurrentTask && gameState.isMyTurn) {
                elements.rollDiceBtn.click();
            } else if (!gameState.isMyTurn) {
                showNotification('Сейчас не ваш ход!', 'warning');
            } else {
                showNotification('Бросок недоступен', 'warning');
            }
        }, 500);
    });
    
    document.getElementById('quickBuildBtn').addEventListener('click', function() {
        quickActionsVisible = false; 
        elements.quickActions.classList.remove('show'); 
        elements.quickActionsBtn.classList.remove('active');
        scrollToElement('buildingsContainer');
    });
    
    document.getElementById('quickChatBtn').addEventListener('click', function() {
        quickActionsVisible = false; 
        elements.quickActions.classList.remove('show'); 
        elements.quickActionsBtn.classList.remove('active');
        scrollToElement('chatMessages'); 
        setTimeout(() => elements.chatInput.focus(), 300);
    });
    
    document.getElementById('quickTasksBtn').addEventListener('click', function() {
        quickActionsVisible = false; 
        elements.quickActions.classList.remove('show'); 
        elements.quickActionsBtn.classList.remove('active');
        scrollToElement('currentTask');
    });
    
    document.getElementById('quickInviteBtn').addEventListener('click', function() {
        quickActionsVisible = false; 
        elements.quickActions.classList.remove('show'); 
        elements.quickActionsBtn.classList.remove('active');
        showInviteModal();
    });
    
    document.getElementById('quickThemeBtn').addEventListener('click', function() {
        quickActionsVisible = false; 
        elements.quickActions.classList.remove('show'); 
        elements.quickActionsBtn.classList.remove('active');
        toggleLightTheme();
    });
    
    document.addEventListener('click', function(e) {
        if (quickActionsVisible && !elements.quickActionsBtn.contains(e.target) && !elements.quickActions.contains(e.target)) {
            elements.quickActions.classList.remove('show'); 
            elements.quickActionsBtn.classList.remove('active'); 
            quickActionsVisible = false;
        }
    });
}

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
        elements.recentEmojisSection.style.display = 'none'; return;
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

// ==================== СВЕТЛАЯ ТЕМА ====================
function toggleLightTheme() {
    lightThemeEnabled = !lightThemeEnabled;
    if (lightThemeEnabled) {
        document.body.classList.add('light-theme');
        document.getElementById('quickThemeBtn').innerHTML = '🌙<div class="tooltip">Включить темную тему</div>';
        showNotification('🌞 Светлая тема включена!', 'info');
        localStorage.setItem('lightTheme', 'enabled');
    } else {
        document.body.classList.remove('light-theme');
        document.getElementById('quickThemeBtn').innerHTML = '🌞<div class="tooltip">Включить светлую тему</div>';
        showNotification('🌙 Темная тема включена', 'info');
        localStorage.setItem('lightTheme', 'disabled');
    }
}

// ==================== ВЫБОР СМАЙЛИКОВ ====================
function initEmojiPicker() {
    const emojiCategories = {
        "Эмоции": ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"],
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
        tver: { name: "Тверь", position: 1, description: "Стартовый город", history: "Тверь — один из древнейших городов России, основанный в 1135 году. Расположена на берегах рек Волга, Тверца и Тьмака.", problem: "Основные экологические проблемы Твери — загрязнение воздуха промышленными предприятиями и транспортными выбросами.", task: "Ваша задача — помочь городу справиться с экологическими проблемами путем посадки деревьев и внедрения чистых технологий." },
        kineshma: { name: "Кинешма", position: 2, description: "Город на Волге", history: "Кинешма — старинный город на Волге, известный с 1504 года. Важный промышленный и культурный центр Ивановской области.", problem: "Главная экологическая проблема Кинешмы — загрязнение Волги промышленными стоками и бытовыми отходами.", task: "Помогите очистить берега Волги от мусора и организовать систему переработки отходов." },
        naberezhnye_chelny: { name: "Набережные Челны", position: 3, description: "Город автомобилестроителей", history: "Набережные Челны — молодой город, основанный в 1930 году. Крупный центр автомобильной промышленности России.", problem: "Основные экологические проблемы — загрязнение воздуха автомобильными выбросами и промышленными предприятиями.", task: "Помогите внедрить экологичные технологии на автозаводе и развить общественный транспорт." },
        kazan: { name: "Казань", position: 4, description: "Столица Татарстана", history: "Казань — тысячелетний город, столица Республики Татарстан. Крупный культурный, экономический и научный центр России.", problem: "Основные экологические проблемы Казани — высокий уровень загрязнения воздуха, транспортные пробки, утилизация отходов.", task: "Ваша задача — помочь внедрить экологичные технологии, развить велоинфраструктуру и систему переработки мусора." },
        volgograd: { name: "Волгоград", position: 5, description: "Город-герой", history: "Волгоград — город-герой с богатой историей, известный Сталинградской битвой. Крупный промышленный центр на Волге.", problem: "Волгоград страдает от сильного промышленного загрязнения, особенно в районах металлургических и химических заводов.", task: "Помогите снизить промышленное загрязнение путем модернизации предприятий и создания зеленых зон." },
        astrakhan: { name: "Астрахань", position: 6, description: "Конечная точка маршрута", history: "Астрахань — древний город в дельте Волги, основанный в 1558 году. Важный рыболовный и транспортный узел.", problem: "Ключевые экологические проблемы Астрахани — снижение биоразнообразия, загрязнение вод дельты Волги, опустынивание.", task: "Ваша финальная задача — помочь сохранить уникальную экосистему дельты Волги и восстановить природное равновесие." }
    },
    tasks: {
        easy: [
            { description: "Посадите 3 дерева в парке 🌲", type: "drag_click", goal: 3, items: ["🌲", "🌳", "🌲", "🌲", "🌳"], zones: 3, correctItems: ["🌲", "🌲", "🌲"] },
            { description: "Сортируйте мусор по контейнерам 🗑️", type: "sort_click", items: [{name: "Бумага", type: "paper", emoji: "📄"}, {name: "Пластик", type: "plastic", emoji: "🥤"}, {name: "Стекло", type: "glass", emoji: "🍶"}, {name: "Батарейки", type: "battery", emoji: "🔋"}] },
            { description: "Ответьте на вопрос об экологии ❓", type: "quiz", question: "Какой из этих материалов разлагается дольше всего?", options: [{text: "Бумага", correct: false}, {text: "Пластиковая бутылка", correct: true}, {text: "Банан", correct: false}, {text: "Хлопковая футболка", correct: false}] },
            { description: "Соберите мусор в парке 🧹", type: "clean", goal: 4, items: ["🗑️", "🗑️", "🗑️", "🗑️", "🌿", "🌿", "🌿"] }
        ],
        medium: [
            { description: "Очистите реку от 5 единиц мусора 🌊", type: "clean", goal: 5, items: ["🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🌿", "🌿", "🌿"] },
            { description: "Что такое устойчивое развитие? 🌱", type: "quiz", question: "Что такое устойчивое развитие?", options: [{text: "Развитие без ущерба для будущего", correct: true}, {text: "Быстрое экономическое развитие", correct: false}] },
            { description: "Соберите пазл из экологических символов 🧩", type: "puzzle_image", pieces: 6, imageType: "animals" },
            { description: "Создайте пищевую цепь 🐟", type: "sequence_click", items: ["🌿", "🐛", "🐦", "🦊"], correctOrder: ["🌿", "🐛", "🐦", "🦊"] }
        ],
        hard: [
            { description: "Решите экологическую головоломку 🧠", type: "sequence_click", items: ["🌱", "🌳", "🏭", "💨", "🌍", "🔥"], correctOrder: ["🌱", "🌳", "🏭", "💨", "🔥", "🌍"] },
            { description: "Очистите океан от мусора 🌊", type: "clean", goal: 8, items: ["🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🐠", "🐟", "🐡"] },
            { description: "Найдите все пары животных 🎯", type: "match_game", pairs: 8, symbols: ["🐻", "🦊", "🐰", "🦉", "🐸", "🐢", "🦋", "🐝", "🐞", "🦔"] }
        ]
    },
    buildings: [
        { name: "Станция переработки", cost: 50, points: 100, description: "Перерабатывает мусор и уменьшает загрязнение" },
        { name: "Солнечная электростанция", cost: 100, points: 200, description: "Производит чистую энергию из солнечного света" },
        { name: "Эко-парк", cost: 150, points: 300, description: "Создает зеленую зону для отдыха и очистки воздуха" }
    ],
    difficultyRequirements: { easy: { level: 1 }, medium: { level: 5 }, hard: { level: 10 } }
};

// ==================== ДАННЫЕ КАРТЫ ====================
let mapData = { cells: [], imageLoaded: false };

// ==================== СОСТОЯНИЕ ИГРЫ ====================
let gameState = {
    currentPlayer: null, currentPlayerId: null, players: {}, roomId: null, cityProgress: {}, currentTask: null, currentDifficulty: "easy", gameOver: false, usedTasks: { easy: [], medium: [], hard: [] }, nextCity: null, askedForChoice: {}, taskInProgress: false, dragItems: [], dropZones: [], sortItems: [], sortBins: [], selectedPuzzlePieces: [], cleanupItems: [], cleanupCount: 0, reconnected: false, playerProgress: {}, currentTurn: null, turnOrder: [], isMyTurn: false, isAtNewCity: false, hasUnfinishedTask: false, matchGameState: { cards: [], flippedCards: [], matchedPairs: 0, canFlip: true }, quizSelectedAnswer: null, visitedCities: {}
};

// ==================== ФУНКЦИИ ПОДКЛЮЧЕНИЯ ====================
function updateConnectionStatus(status, text) {
    if (elements.connectionStatusDot) {
        elements.connectionStatusDot.className = 'connection-dot ' + status;
        elements.connectionStatusText.textContent = text;
    }
}

// ==================== СЛУШАТЕЛИ СОБЫТИЙ SOCKET.IO ====================
socket.on('connect', () => {
    isConnected = true; 
    updateConnectionStatus('connected', '✅ Подключено');
    
    if (gameState.currentPlayerId && gameState.reconnected) {
        socket.emit('player_reconnected');
    }
    setTimeout(() => requestAllPlayersPositions(), 2000);
});

socket.on('disconnect', () => {
    isConnected = false; 
    updateConnectionStatus('error', '❌ Ошибка'); 
    gameState.reconnected = true;
});

socket.on('join-success', (playerData) => {
    gameState.roomId = playerData.roomId || currentRoomId;
    gameState.reconnected = playerData.reconnected || false;
    gameState.currentTurn = playerData.currentTurn;
    gameState.turnOrder = playerData.turnOrder || [];
    gameState.isMyTurn = playerData.isMyTurn || false;
    gameState.hasUnfinishedTask = playerData.hasUnfinishedTask || false;
    
    if (playerData.playerProgress) {
        gameState.playerProgress[playerData.playerId] = playerData.playerProgress;
    }
    
    initializeGame(playerData);
    
    setTimeout(() => requestAllPlayersPositions(), 1500);
    updateTurnIndicator();
    
    if (gameState.hasUnfinishedTask && gameState.currentTask) {
        elements.currentTask.style.display = 'block'; 
        elements.taskDescription.textContent = gameState.currentTask.description; 
        elements.noTaskMessage.style.display = 'none'; 
        elements.completeTaskBtn.disabled = false; 
        hasCurrentTask = true; 
        elements.rollDiceBtn.disabled = true;
    }
});

socket.on('room-error', (message) => {
    showNotification(message || 'Ошибка комнаты', 'error');
    elements.authSection.style.display = 'block'; 
    elements.gameContent.style.display = 'none'; 
    elements.resourcesPlaceholder.style.display = 'none'; 
    
    if(document.getElementById('quickActionsBtn')) {
        document.getElementById('quickActionsBtn').classList.remove('show');
    }
    resetGameState();
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
    addLogEntry(`🎉 Игрок "${data.player.name}" присоединился к игре!`);
});

socket.on('player_reconnected', (data) => {
    if (gameState.players[data.playerId]) {
        gameState.players[data.playerId].connected = true;
    }
    updatePlayersList(); 
    updatePlayerMarkers(); 
    addLogEntry(`🔌 Игрок "${data.playerName}" восстановил соединение`);
});

socket.on('player_left', (data) => {
    if (gameState.players[data.playerId]) {
        gameState.players[data.playerId].connected = false;
    }
    updatePlayersList(); 
    updatePlayerMarkers(); 
    addLogEntry(`👋 Игрок "${data.playerName}" покинул игру.`);
});

socket.on('new_chat_message', (data) => { 
    if (data.playerName && data.message) addChatMessage(data.playerName, data.message, false); 
});

socket.on('chat_history', (messages) => { 
    if (messages) { 
        elements.chatMessages.innerHTML = ''; 
        messages.forEach(msg => addChatMessage(msg.playerName, msg.message, false)); 
    } 
});

socket.on('player_dice_roll', (data) => {
    if (gameState.players[data.playerId] && data.playerId !== gameState.currentPlayerId) {
        gameState.players[data.playerId].position = data.newPosition; 
        gameState.players[data.playerId].currentTask = data.task;
        
        updateOtherPlayerMarker(data.playerId, gameState.players[data.playerId].name, data.newPosition, '', gameState.players[data.playerId].color);
        addLogEntry(`🎲 Игрок "${gameState.players[data.playerId].name}" бросил кубик: ${data.diceValue}`);
    }
});

socket.on('progress_updated', (data) => {
    if (!gameState.playerProgress[data.playerId]) {
        gameState.playerProgress[data.playerId] = {};
    }
    gameState.playerProgress[data.playerId][data.cityKey] = data.progress;
    
    if (data.playerId === gameState.currentPlayerId) { 
        createCurrentCityProgress(); 
        addLogEntry(`📊 Прогресс очищения: ${data.progress}%`); 
        createCitiesGrid(); 
    }
});

socket.on('turn_update', (data) => {
    gameState.currentTurn = data.currentTurn; 
    gameState.turnOrder = data.turnOrder || []; 
    gameState.isMyTurn = (socket.id === data.currentTurn);
    
    updateTurnIndicator();
    
    if (gameState.isMyTurn) { 
        showNotification('🎉 Сейчас ваш ход! Бросайте кубик.', 'success'); 
        elements.rollDiceBtn.disabled = false; 
        addLogEntry('🎲 Сейчас ваш ход!'); 
    } else { 
        elements.rollDiceBtn.disabled = true; 
    }
});

// ==================== СИНХРОНИЗАЦИЯ ДВИЖЕНИЯ ИГРОКОВ ====================
function sendPlayerPositionToServer(position, city) { 
    if (socket.connected && gameState.currentPlayer) {
        socket.emit('player_position_update', { position, city }); 
    }
}

function requestAllPlayersPositions() { 
    if (socket.connected) {
        socket.emit('request_all_positions'); 
    }
}

function savePlayerState() { 
    if (isConnected && gameState.currentPlayer) {
        socket.emit('player-update', { 
            id: gameState.currentPlayerId, 
            name: gameState.currentPlayer.name, 
            position: gameState.currentPlayer.position, 
            city: gameState.currentPlayer.city, 
            coins: gameState.currentPlayer.coins, 
            cleaningPoints: gameState.currentPlayer.cleaningPoints, 
            buildings: gameState.currentPlayer.buildings, 
            level: gameState.currentPlayer.level, 
            completedTasks: gameState.currentPlayer.completedTasks, 
            color: gameState.currentPlayer.color, 
            connected: true, 
            progress: gameState.playerProgress[gameState.currentPlayerId], 
            currentTask: gameState.currentTask, 
            hasUnfinishedTask: hasCurrentTask || gameState.taskInProgress 
        }); 
    }
}

// ==================== РЕНДЕР ИГРОКОВ ====================
function updateOtherPlayerMarker(playerId, playerName, position, city, color) {
    let marker = document.getElementById(`marker-${playerId}`);
    if (!marker) {
        marker = document.createElement('div'); 
        marker.className = 'player-marker'; 
        marker.id = `marker-${playerId}`; 
        marker.style.background = color || '#8e44ad'; 
        marker.innerHTML = '<i class="fas fa-user"></i>';
        
        const tooltip = document.createElement('div'); 
        tooltip.className = 'player-tooltip'; 
        tooltip.textContent = playerName; 
        marker.appendChild(tooltip);
        
        elements.mapOverlay.appendChild(marker);
    }
    
    const cell = mapData.cells.find(c => c.number === position);
    if (cell) { 
        marker.style.left = `${cell.x + cell.width/2}px`; 
        marker.style.top = `${cell.y + cell.height/2}px`; 
    }
    
    updatePlayerInList(playerId, position, playerName);
}

function updatePlayerInList(playerId, position, playerName) {
    const items = document.querySelectorAll('.player-item'); 
    let found = false;
    
    items.forEach(item => { 
        if (item.dataset.playerId === playerId) { 
            found = true; 
            const badge = item.querySelector('.player-position-badge'); 
            if (badge) badge.textContent = `поз. ${position}`; 
        } 
    });
    
    if (!found) updatePlayersList();
}

function updatePlayerMarkers() { 
    document.querySelectorAll('.player-marker').forEach(m => m.remove()); 
    requestAllPlayersPositions(); 
}

function updatePlayersList() {
    elements.playersContainer.innerHTML = ''; 
    let playersArray = Object.entries(gameState.players);
    
    if (gameState.turnOrder) {
        playersArray.sort((a, b) => gameState.turnOrder.indexOf(a[0]) - gameState.turnOrder.indexOf(b[0]));
    }
    
    playersArray.forEach(([playerId, player]) => {
        const item = document.createElement('div'); 
        item.className = 'player-item'; 
        item.dataset.playerId = playerId;
        
        if (playerId === gameState.currentPlayerId) item.classList.add('current');
        if (playerId === gameState.currentTurn) item.classList.add('turn');
        if (!player.connected) item.style.opacity = '0.6';
        
        item.innerHTML = `
            <span>${player.connected ? '🟢' : '🔴'} ${player.name} 
            <span class="player-position-badge" style="background:${player.color || '#8e44ad'}">поз. ${player.position || 0}</span>
            </span>
            <span><strong>${player.cleaningPoints}</strong> баллов</span>`;
        elements.playersContainer.appendChild(item);
    });
}

function updatePlayerUI() {
    if (gameState.currentPlayer) {
        elements.playerName.textContent = gameState.currentPlayer.name; 
        elements.currentPosition.textContent = gameState.currentPlayer.position; 
        elements.coinsCount.textContent = gameState.currentPlayer.coins; 
        elements.cleaningPoints.textContent = gameState.currentPlayer.cleaningPoints; 
        elements.playerLevel.textContent = gameState.currentPlayer.level; 
        elements.topCoinsCount.textContent = gameState.currentPlayer.coins; 
        elements.topPlayerLevel.textContent = gameState.currentPlayer.level + ' ур.'; 
        updateLevelProgress();
    }
}

function updateLevelProgress() { 
    if (gameState.currentPlayer) {
        elements.levelProgressFill.style.width = `${((gameState.currentPlayer.completedTasks || 0) % 3) * 33.33}%`; 
    }
}

function updateTurnIndicator() {
    if (gameState.currentTurn) {
        elements.turnIndicator.style.display = 'block';
        if (gameState.isMyTurn) { 
            elements.turnIndicator.className = 'turn-indicator your-turn'; 
            elements.turnMessage.textContent = '🎉 Сейчас ваш ход! Бросайте кубик.'; 
        }
        else { 
            elements.turnIndicator.className = 'turn-indicator other-turn'; 
            elements.turnMessage.textContent = `⏳ Ходит ${gameState.players[gameState.currentTurn]?.name || 'другой игрок'}. Ожидайте.`; 
        }
    } else {
        elements.turnIndicator.style.display = 'none';
    }
}

function updateRollDiceButtonState() { 
    elements.rollDiceBtn.disabled = (gameState.gameOver || gameState.taskInProgress || !gameState.isMyTurn || hasCurrentTask); 
    elements.rollDiceBtn.style.opacity = elements.rollDiceBtn.disabled ? '0.7' : '1'; 
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
        .then(r => r.json())
        .then(data => { 
            if (data.cells) { 
                mapData.cells = data.cells; 
                createMapCells(); 
            } else {
                createDefaultMap(); 
            }
        })
        .catch(() => createDefaultMap());
}

function createDefaultMap() {
    const w = elements.mapContainer.offsetWidth, h = elements.mapContainer.offsetHeight;
    mapData.cells = [ 
        { id: 1, number: 1, x: w*0.1, y: h*0.3, width: 40, height: 40, type: 'start', city: 'tver' }, 
        { id: 2, number: 2, x: w*0.3, y: h*0.4, width: 40, height: 40, type: 'city', city: 'kineshma' } 
    ]; 
    createMapCells();
}

function createMapCells() {
    elements.mapOverlay.innerHTML = '';
    mapData.cells.forEach(cell => {
        const div = document.createElement('div'); 
        div.className = `map-cell hidden ${cell.type}`; 
        div.style.left = `${cell.x}px`; 
        div.style.top = `${cell.y}px`; 
        div.style.width = `${cell.width}px`; 
        div.style.height = `${cell.height}px`;
        div.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            if (cell.type === 'city') showCityModal(cell.city); 
        }); 
        elements.mapOverlay.appendChild(div);
    });
    updatePlayerMarkers();
}

// ==================== ГОРОДА ====================
function createCurrentCityProgress() {
    elements.cityProgressContainer.innerHTML = '';
    if (gameState.currentPlayer && gameState.currentPlayer.city) {
        const cityKey = gameState.currentPlayer.city; 
        const progress = gameState.playerProgress[gameState.currentPlayerId]?.[cityKey] || 0;
        
        elements.cityProgressContainer.innerHTML = `
            <div class="city-progress-header">
                <span>${gameData.cities[cityKey].name}</span>
                <span>${progress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%;"></div>
            </div>
            <div style="font-size: 0.9rem; margin-top: 5px;">
                ${progress >= 100 ? '✅ Очищен!' : 'Достигните 100%'}
            </div>`;
            
        elements.moveBtn.disabled = progress < 100; 
        elements.moveBtn.textContent = progress >= 100 ? "🚗 Следующий город" : "Завершите очищение";
    }
}

function createCitiesGrid() {
    elements.citiesGrid.innerHTML = ''; 
    const currentCityKey = gameState.currentPlayer?.city || 'tver';
    
    for (const cityKey in gameData.cities) {
        const progress = gameState.playerProgress[gameState.currentPlayerId]?.[cityKey] || 0; 
        const isAccessible = canAccessCity(cityKey);
        const card = document.createElement('div'); 
        
        card.className = `city-card ${cityKey === currentCityKey ? 'active' : ''} ${progress >= 100 ? 'completed' : ''} ${isAccessible && cityKey !== currentCityKey ? 'accessible' : ''}`;
        
        card.innerHTML = `
            <div class="city-name">${gameData.cities[cityKey].name}</div>
            <div class="city-progress-mini">
                <div class="city-progress-fill" style="width: ${progress}%;"></div>
            </div>
            ${isAccessible && cityKey !== currentCityKey ? `<button class="city-action-btn">Перейти</button>` : ''}`;
            
        card.addEventListener('click', (e) => { 
            if (e.target.tagName !== 'BUTTON') {
                showCityModal(cityKey); 
            } else { 
                e.stopPropagation(); 
                moveToExistingCity(cityKey); 
            } 
        }); 
        
        elements.citiesGrid.appendChild(card);
    }
}

function canAccessCity(cityKey) {
    if (!gameState.currentPlayerId || !gameState.playerProgress[gameState.currentPlayerId]) return false;
    const keys = Object.keys(gameData.cities), target = keys.indexOf(cityKey), curr = keys.indexOf(gameState.currentPlayer?.city || 'tver');
    
    if (target < curr) return true; 
    if (target === curr + 1) return (gameState.playerProgress[gameState.currentPlayerId][keys[curr]] || 0) >= 100;
    if (target > curr + 1) { 
        for (let i = curr + 1; i < target; i++) {
            if ((gameState.playerProgress[gameState.currentPlayerId][keys[i]] || 0) < 100) return false; 
        }
        return true; 
    } 
    return false;
}

function canMoveToNextCity() { 
    return canAccessCity(Object.keys(gameData.cities)[Object.keys(gameData.cities).indexOf(gameState.currentPlayer?.city || 'tver') + 1]); 
}

function updateCityProgress(cityKey, progress) {
    if (!gameState.playerProgress[gameState.currentPlayerId]) {
        gameState.playerProgress[gameState.currentPlayerId] = {};
    }
    gameState.playerProgress[gameState.currentPlayerId][cityKey] = progress;
    
    createCurrentCityProgress(); 
    socket.emit('update_progress', { cityKey, progress, playerId: gameState.currentPlayerId }); 
    savePlayerState(); 
    createCitiesGrid();
    
    if (Object.values(gameState.playerProgress[gameState.currentPlayerId]).every(p => p >= 100)) { 
        gameState.gameOver = true; 
        showNotification(`🎊 Вы завершили игру!`, 'success'); 
        elements.rollDiceBtn.disabled = true; 
    }
}

function moveToExistingCity(cityKey) {
    if (!canAccessCity(cityKey)) return;
    const cell = mapData.cells.find(c => c.city === cityKey); 
    if (!cell) return;
    
    gameState.currentPlayer.position = cell.number; 
    gameState.currentPlayer.city = cityKey;
    
    updatePlayerUI(); 
    updateOtherPlayerMarker(gameState.currentPlayerId, gameState.currentPlayer.name, cell.number, cityKey, gameState.currentPlayer.color);
    sendPlayerPositionToServer(cell.number, cityKey); 
    savePlayerState(); 
    createCitiesGrid(); 
    createCurrentCityProgress(); 
    showNotification(`🚗 Переход в ${gameData.cities[cityKey].name}!`, 'success');
}

function showCityModal(cityKey) {
    const city = gameData.cities[cityKey]; 
    elements.cityModalTitle.textContent = city.name; 
    elements.cityModalProblem.textContent = city.problem;
    
    const progress = gameState.playerProgress[gameState.currentPlayerId]?.[cityKey] || 0; 
    elements.cityModalProgressFill.style.width = `${progress}%`;
    
    elements.cityModalMoveBtn.style.display = canAccessCity(cityKey) && cityKey !== gameState.currentPlayer?.city ? 'block' : 'none';
    elements.cityModalMoveBtn.onclick = () => { 
        closeCityModal(); 
        moveToExistingCity(cityKey); 
    }; 
    elements.cityModal.classList.add('active');
}

function closeCityModal() { 
    elements.cityModal.classList.remove('active'); 
}

// ==================== МАГАЗИН ====================
function createBuildingsList() {
    elements.buildingsContainer.innerHTML = '';
    
    gameData.buildings.forEach((b, i) => {
        const div = document.createElement('div'); 
        div.className = 'building-item'; 
        div.innerHTML = `
            <div>
                <strong>${b.name} (${b.cost} монет)</strong>
                <div style="font-size:0.8rem;color:var(--success)">+${b.points} баллов</div>
            </div>
            <button class="game-btn buy-btn" data-id="${i}">Купить</button>`; 
        elements.buildingsContainer.appendChild(div);
    });
    
    document.querySelectorAll('.buy-btn').forEach(btn => btn.addEventListener('click', function() {
        const b = gameData.buildings[this.dataset.id];
        if (gameState.currentPlayer.coins >= b.cost) {
            gameState.currentPlayer.coins -= b.cost; 
            gameState.currentPlayer.cleaningPoints += b.points;
            updateCityProgress(gameState.currentPlayer.city, Math.min(100, (gameState.playerProgress[gameState.currentPlayerId]?.[gameState.currentPlayer.city] || 0) + 15));
            updatePlayerUI(); 
            savePlayerState(); 
            showNotification(`✅ Построено "${b.name}"`, 'success');
        } else {
            showNotification(`❌ Недостаточно монет!`, 'warning');
        }
    }));
}

// ==================== ЗАДАНИЯ ====================
function getRandomTask(difficulty) { 
    const tasks = gameData.tasks[difficulty]; 
    return tasks[Math.floor(Math.random() * tasks.length)]; 
}

function createInteractiveTask(task) {
    elements.taskArea.innerHTML = `<p><strong>${task.description}</strong></p>`;
    
    if (task.type === "quiz") {
        elements.taskArea.innerHTML += `<div class="quiz-options">${task.options.map((o, i) => `<div class="quiz-option" data-correct="${o.correct}">${o.text}</div>`).join('')}</div>`;
        document.querySelectorAll('.quiz-option').forEach(opt => opt.addEventListener('click', function() { 
            document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected')); 
            this.classList.add('selected'); 
            elements.checkTaskBtn.disabled = false; 
        }));
    } else if (task.type === "drag_click" || task.type === "drag") {
        createDragClickTask(task); return;
    } else if (task.type === "sort_click" || task.type === "sort") {
        createSortClickTask(task); return;
    } else if (task.type === "clean") {
        createCleanupTask(task); return;
    } else if (task.type === "puzzle_image" || task.type === "puzzle_click") {
        task.imageType = "ecology"; createPuzzleImageTask(task); return;
    } else if (task.type === "sequence_click" || task.type === "sequence") {
        createSequenceClickTask(task); return;
    } else if (task.type === "match_game") {
        createMatchGameTask(task); return;
    } else { 
        elements.taskArea.innerHTML += `<p>Нажмите "Проверить" для авто-выполнения (Демо).</p>`; 
        elements.checkTaskBtn.disabled = false; 
    }
    
    elements.completeTaskBtn.style.display = 'none'; 
    elements.checkTaskBtn.style.display = 'block'; 
    elements.checkTaskBtn.disabled = task.type === "quiz";
}

function createDragClickTask(task) {
    elements.taskArea.innerHTML = `<p><strong>${task.description}</strong></p><div class="drag-container"><div class="task-container" id="dragItemsContainer">${task.items.map((item, index) => `<div class="draggable-item" data-index="${index}" data-emoji="${item}" data-correct="${task.correctItems ? task.correctItems.includes(item) : true}">${item}</div>`).join('')}</div><div class="task-container" id="dropZonesContainer">${Array.from({length: task.goal}).map((_, index) => `<div class="drop-zone" data-zone="${index}">Зона ${index + 1}</div>`).join('')}</div></div><p>Правильно: <span id="dragCount">0</span>/${task.goal}</p>`;
    
    const draggables = elements.taskArea.querySelectorAll('.draggable-item'); 
    const dropZones = elements.taskArea.querySelectorAll('.drop-zone'); 
    let selectedItem = null; let placedCount = 0; let correctPlacedCount = 0;
    
    draggables.forEach(item => { 
        item.addEventListener('click', function() { 
            if (selectedItem) selectedItem.classList.remove('selected'); 
            selectedItem = this; 
            this.classList.add('selected'); 
            dropZones.forEach(z => { if (!z.classList.contains('filled')) z.classList.add('hover'); }); 
        }); 
    });
    
    dropZones.forEach(zone => { 
        zone.addEventListener('click', function() { 
            if (selectedItem && !this.classList.contains('filled')) { 
                dropZones.forEach(z => z.classList.remove('hover')); 
                const isCorrect = selectedItem.dataset.correct === 'true'; 
                this.innerHTML = `<div style="font-size: 2.2rem;">${selectedItem.dataset.emoji}</div>`; 
                this.classList.add('filled'); 
                selectedItem.classList.remove('selected'); 
                selectedItem.classList.add('placed'); 
                selectedItem = null; 
                placedCount++; 
                if (isCorrect) correctPlacedCount++; 
                document.getElementById('dragCount').textContent = correctPlacedCount; 
                
                if (placedCount >= task.goal) { 
                    elements.checkTaskBtn.disabled = false; 
                    if (correctPlacedCount >= task.goal) elements.taskResult.textContent = '✅ Отлично!'; 
                    else elements.taskResult.textContent = `❌ Ошибка: ${correctPlacedCount}/${task.goal}`; 
                } 
            } 
        }); 
    });
    
    elements.checkTaskBtn.onclick = function() { 
        if (correctPlacedCount >= task.goal) completeInteractiveTask(); 
        else { elements.taskResult.textContent = `❌ Не все правильные!`; elements.retryTaskBtn.style.display = 'block'; } 
    };
    elements.retryTaskBtn.onclick = function() { createDragClickTask(task); };
    elements.completeTaskBtn.style.display = 'none'; elements.checkTaskBtn.style.display = 'block'; elements.checkTaskBtn.disabled = true;
}

function createSortClickTask(task) {
    const binTypes = { paper: { name: "Бумага", emoji: "📄" }, plastic: { name: "Пластик", emoji: "🥤" }, glass: { name: "Стекло", emoji: "🍶" }, battery: { name: "Батарейки", emoji: "🔋" } };
    
    elements.taskArea.innerHTML = `<p><strong>${task.description}</strong></p><div class="sorting-area"><div class="task-container" id="sortBinsContainer">${task.items.map(item => { const b = binTypes[item.type] || item; return `<div class="sort-bin" data-type="${item.type}"><div class="bin-icon">${b.emoji}</div><div class="bin-name">${b.name}</div><div class="sort-bin-content"></div></div>`; }).join('')}</div><div class="task-container" id="sortItemsContainer">${task.items.map((item, index) => `<div class="sort-item" data-index="${index}" data-type="${item.type}"><div style="font-size: 1.8rem;">${item.emoji}</div><div style="font-size: 0.8rem;">${item.name}</div></div>`).join('')}</div></div><p>Отсортировано: <span id="sortCount">0</span>/${task.items.length}</p>`;
    
    const sortItems = elements.taskArea.querySelectorAll('.sort-item'); 
    const sortBins = elements.taskArea.querySelectorAll('.sort-bin'); 
    let selectedItem = null; let sortedCount = 0;
    
    sortItems.forEach(item => { 
        item.addEventListener('click', function() { 
            if (selectedItem) selectedItem.classList.remove('selected'); 
            selectedItem = this; 
            this.classList.add('selected'); 
            sortBins.forEach(b => { if (b.dataset.type === this.dataset.type && !b.classList.contains('filled')) b.classList.add('hover'); }); 
        }); 
    });
    
    sortBins.forEach(bin => { 
        bin.addEventListener('click', function() { 
            if (selectedItem) { 
                sortBins.forEach(b => b.classList.remove('hover')); 
                if (selectedItem.dataset.type === this.dataset.type) { 
                    const bc = this.querySelector('.sort-bin-content'); 
                    bc.innerHTML = ''; 
                    const clone = selectedItem.cloneNode(true); 
                    clone.classList.add('placed'); 
                    bc.appendChild(clone); 
                    this.classList.add('filled'); 
                    selectedItem.classList.remove('selected'); 
                    selectedItem.classList.add('placed'); 
                    selectedItem = null; 
                    sortedCount++; 
                    document.getElementById('sortCount').textContent = sortedCount; 
                    if (sortedCount >= task.items.length) { elements.checkTaskBtn.disabled = false; elements.taskResult.textContent = '✅ Отлично!'; } 
                } else { 
                    showNotification('❌ Неправильный контейнер!', 'warning'); 
                    setTimeout(() => { if(selectedItem) selectedItem.classList.remove('selected'); selectedItem = null; }, 1000); 
                } 
            } 
        }); 
    });
    
    elements.checkTaskBtn.onclick = function() { 
        if (sortedCount >= task.items.length) completeInteractiveTask(); 
        else { elements.taskResult.textContent = `❌ Ошибка!`; elements.retryTaskBtn.style.display = 'block'; } 
    };
    elements.retryTaskBtn.onclick = function() { createSortClickTask(task); };
    elements.completeTaskBtn.style.display = 'none'; elements.checkTaskBtn.style.display = 'block'; elements.checkTaskBtn.disabled = true;
}

function createCleanupTask(task) {
    elements.taskArea.innerHTML = `<p><strong>${task.description}</strong></p><div class="river-container">${task.items.map((item, index) => { const left = Math.random() * 80 + 10; const top = Math.random() * 70 + 15; return `<div class="cleanup-item" data-index="${index}" data-trash="${item === '🗑️'}" style="left: ${left}%; top: ${top}%;">${item}</div>`; }).join('')}</div><div class="cleanup-counter">Очищено: <span id="cleanupCount">0</span>/${task.goal}</div>`;
    
    const cleanupItems = elements.taskArea.querySelectorAll('.cleanup-item'); 
    let cleanedCount = 0;
    
    cleanupItems.forEach(item => { 
        item.addEventListener('click', function() { 
            if (!this.classList.contains('cleaned') && this.dataset.trash === "true") { 
                this.classList.add('cleaned'); 
                cleanedCount++; 
                document.getElementById('cleanupCount').textContent = cleanedCount; 
                if (cleanedCount >= task.goal) { elements.checkTaskBtn.disabled = false; elements.taskResult.textContent = '✅ Отлично!'; } 
            } else if (this.dataset.trash === "false") { 
                showNotification('Это не урна!', 'warning'); 
            } 
        }); 
    });
    
    elements.checkTaskBtn.onclick = function() { 
        if (cleanedCount >= task.goal) completeInteractiveTask(); 
        else { elements.taskResult.textContent = `❌ Ошибка!`; elements.retryTaskBtn.style.display = 'block'; } 
    };
    elements.retryTaskBtn.onclick = function() { createCleanupTask(task); };
    elements.completeTaskBtn.style.display = 'none'; elements.checkTaskBtn.style.display = 'block'; elements.checkTaskBtn.disabled = true;
}

function createPuzzleImageTask(task) {
    let imagePieces = ["🌍", "♻️", "🌳", "💧", "🌱", "🌞", "🌀", "🌊", "🦋"]; 
    const pieces = imagePieces.slice(0, task.pieces); 
    const shuffledPieces = shuffleArray([...pieces]);
    
    elements.taskArea.innerHTML = `<p><strong>${task.description}</strong></p><div class="puzzle-area"><div class="task-container" id="puzzleTarget">${pieces.map((piece, index) => `<div class="puzzle-target-slot" data-index="${index}" data-expected="${piece}"></div>`).join('')}</div><div class="task-container" id="puzzlePieces">${shuffledPieces.map((piece, index) => `<div class="puzzle-piece" data-piece="${piece}">${piece}</div>`).join('')}</div></div><p>Собрано: <span id="puzzleCount">0</span>/${pieces.length}</p>`;
    
    const puzzlePieces = elements.taskArea.querySelectorAll('.puzzle-piece'); 
    const puzzleSlots = elements.taskArea.querySelectorAll('.puzzle-target-slot'); 
    let selectedPiece = null; let placedCount = 0;
    
    puzzlePieces.forEach(piece => { 
        piece.addEventListener('click', function() { 
            if (selectedPiece) selectedPiece.classList.remove('selected'); 
            selectedPiece = this; 
            this.classList.add('selected'); 
            puzzleSlots.forEach(slot => { if (!slot.classList.contains('filled')) slot.classList.add('hover'); }); 
        }); 
    });
    
    puzzleSlots.forEach(slot => { 
        slot.addEventListener('click', function() { 
            if (selectedPiece && this.classList.contains('hover')) { 
                if (selectedPiece.dataset.piece === this.dataset.expected) { 
                    puzzleSlots.forEach(s => s.classList.remove('hover')); 
                    this.innerHTML = `<div style="font-size: 2.2rem;">${selectedPiece.dataset.piece}</div>`; 
                    this.classList.add('filled'); 
                    selectedPiece.classList.remove('selected'); 
                    selectedPiece.classList.add('placed'); 
                    selectedPiece = null; 
                    placedCount++; 
                    document.getElementById('puzzleCount').textContent = placedCount; 
                    if (placedCount >= pieces.length) { elements.checkTaskBtn.disabled = false; elements.taskResult.textContent = '✅ Отлично!'; } 
                } else { 
                    elements.taskResult.textContent = '❌ Ошибка!'; 
                    selectedPiece.classList.remove('selected'); 
                    selectedPiece = null; 
                    puzzleSlots.forEach(s => s.classList.remove('hover')); 
                } 
            } 
        }); 
    });
    
    elements.checkTaskBtn.onclick = function() { 
        if (placedCount >= pieces.length) completeInteractiveTask(); 
        else { elements.taskResult.textContent = `❌ Ошибка!`; elements.retryTaskBtn.style.display = 'block'; } 
    };
    elements.retryTaskBtn.onclick = function() { createPuzzleImageTask(task); };
    elements.completeTaskBtn.style.display = 'none'; elements.checkTaskBtn.style.display = 'block'; elements.checkTaskBtn.disabled = true;
}

function createSequenceClickTask(task) {
    const items = task.sequence || task.items; 
    const correctOrder = task.correctOrder || items; 
    const shuffledItems = shuffleArray([...items]);
    
    elements.taskArea.innerHTML = `<p><strong>${task.description}</strong></p><div class="sequence-area"><div class="task-container" id="sequenceTarget">${correctOrder.map((_, index) => `<div class="sequence-slot" data-index="${index}" data-expected="${correctOrder[index]}"></div>`).join('')}</div><div class="task-container" id="sequencePieces">${shuffledItems.map((piece, index) => `<div class="sequence-piece" data-piece="${piece}">${piece}</div>`).join('')}</div></div><p>Размещено: <span id="sequenceCount">0</span>/${correctOrder.length}</p>`;
    
    const sequencePieces = elements.taskArea.querySelectorAll('.sequence-piece'); 
    const sequenceSlots = elements.taskArea.querySelectorAll('.sequence-slot'); 
    let selectedPiece = null; let placedCount = 0;
    
    sequencePieces.forEach(piece => { 
        piece.addEventListener('click', function() { 
            if (selectedPiece) selectedPiece.classList.remove('selected'); 
            selectedPiece = this; 
            this.classList.add('selected'); 
            sequenceSlots.forEach(slot => { if (!slot.classList.contains('filled')) slot.classList.add('hover'); }); 
        }); 
    });
    
    sequenceSlots.forEach(slot => { 
        slot.addEventListener('click', function() { 
            if (selectedPiece && this.classList.contains('hover')) { 
                if (selectedPiece.dataset.piece === this.dataset.expected) { 
                    sequenceSlots.forEach(s => s.classList.remove('hover')); 
                    this.innerHTML = `<div style="font-size: 2.2rem;">${selectedPiece.dataset.piece}</div>`; 
                    this.classList.add('filled'); 
                    selectedPiece.classList.remove('selected'); 
                    selectedPiece.classList.add('placed'); 
                    selectedPiece = null; 
                    placedCount++; 
                    document.getElementById('sequenceCount').textContent = placedCount; 
                    if (placedCount >= correctOrder.length) { elements.checkTaskBtn.disabled = false; elements.taskResult.textContent = '✅ Верная последовательность!'; } 
                } else { 
                    elements.taskResult.textContent = '❌ Неверно!'; 
                    selectedPiece.classList.remove('selected'); 
                    selectedPiece = null; 
                    sequenceSlots.forEach(s => s.classList.remove('hover')); 
                } 
            } 
        }); 
    });
    
    elements.checkTaskBtn.onclick = function() { 
        if (placedCount >= correctOrder.length) completeInteractiveTask(); 
        else { elements.taskResult.textContent = `❌ Ошибка!`; elements.retryTaskBtn.style.display = 'block'; } 
    };
    elements.retryTaskBtn.onclick = function() { createSequenceClickTask(task); };
    elements.completeTaskBtn.style.display = 'none'; elements.checkTaskBtn.style.display = 'block'; elements.checkTaskBtn.disabled = true;
}

function createMatchGameTask(task) {
    let cards = []; 
    for (let i = 0; i < task.pairs; i++) { 
        const symbol = task.symbols[i % task.symbols.length]; 
        cards.push({symbol: symbol, id: i}); 
        cards.push({symbol: symbol, id: i}); 
    } 
    cards = shuffleArray(cards);
    
    elements.taskArea.innerHTML = `<p><strong>${task.description}</strong></p><div class="match-grid">${cards.map((card, index) => `<div class="match-card" data-index="${index}" data-symbol="${card.symbol}" data-id="${card.id}"><div class="card-back">?</div><div class="card-content">${card.symbol}</div></div>`).join('')}</div><p style="text-align: center;">Найдено пар: <span id="matchCount">0</span>/${task.pairs}</p>`;
    
    const domCards = elements.taskArea.querySelectorAll('.match-card'); 
    gameState.matchGameState.matchedPairs = 0; 
    gameState.matchGameState.flippedCards = []; 
    gameState.matchGameState.canFlip = true;
    
    domCards.forEach(card => { 
        card.addEventListener('click', function() { 
            if (!gameState.matchGameState.canFlip || this.classList.contains('flipped') || this.classList.contains('matched') || gameState.matchGameState.flippedCards.length >= 2) return; 
            
            this.classList.add('flipped'); 
            gameState.matchGameState.flippedCards.push(this); 
            
            if (gameState.matchGameState.flippedCards.length === 2) { 
                gameState.matchGameState.canFlip = false; 
                const [card1, card2] = gameState.matchGameState.flippedCards; 
                
                if (card1.dataset.id === card2.dataset.id) { 
                    setTimeout(() => { 
                        card1.classList.add('matched'); 
                        card2.classList.add('matched'); 
                        gameState.matchGameState.flippedCards = []; 
                        gameState.matchGameState.canFlip = true; 
                        gameState.matchGameState.matchedPairs++; 
                        document.getElementById('matchCount').textContent = gameState.matchGameState.matchedPairs; 
                        if (gameState.matchGameState.matchedPairs >= task.pairs) { elements.checkTaskBtn.disabled = false; elements.taskResult.textContent = '✅ Все пары найдены!'; } 
                    }, 500); 
                } else { 
                    setTimeout(() => { 
                        card1.classList.remove('flipped'); 
                        card2.classList.remove('flipped'); 
                        gameState.matchGameState.flippedCards = []; 
                        gameState.matchGameState.canFlip = true; 
                    }, 1000); 
                } 
            } 
        }); 
    });
    
    elements.checkTaskBtn.onclick = function() { 
        if (gameState.matchGameState.matchedPairs >= task.pairs) completeInteractiveTask(); 
        else { elements.taskResult.textContent = `❌ Не все пары найдены!`; elements.retryTaskBtn.style.display = 'block'; } 
    };
    elements.retryTaskBtn.onclick = function() { createMatchGameTask(task); };
    elements.completeTaskBtn.style.display = 'none'; elements.checkTaskBtn.style.display = 'block'; elements.checkTaskBtn.disabled = true;
}

function completeInteractiveTask() {
    gameState.currentPlayer.coins += 20; 
    gameState.currentPlayer.completedTasks = (gameState.currentPlayer.completedTasks || 0) + 1;
    
    updateCityProgress(gameState.currentPlayer.city, Math.min(100, (gameState.playerProgress[gameState.currentPlayerId]?.[gameState.currentPlayer.city] || 0) + 10));
    
    elements.interactiveTask.style.display = 'none'; 
    elements.currentTask.style.display = 'none'; 
    elements.completeTaskBtn.style.display = 'block';
    hasCurrentTask = false; 
    updateRollDiceButtonState(); 
    
    socket.emit('end_turn'); 
    showNotification(`✅ Задание выполнено!`, 'success'); 
    savePlayerState();
}

function addLogEntry(text) { 
    const d = document.createElement('div'); 
    d.className = 'log-entry'; 
    d.innerHTML = text; 
    elements.logEntries.appendChild(d); 
    elements.logEntries.scrollTop = elements.logEntries.scrollHeight; 
}
function showInviteModal() { elements.inviteRoomNumber.textContent = currentRoomId || '0'; document.getElementById('inviteModal').classList.add('active'); }
function closeInviteModal() { document.getElementById('inviteModal').classList.remove('active'); }
function copyInvitation() { navigator.clipboard.writeText(`Присоединяйтесь к комнате: ${currentRoomId}`).then(() => showNotification('Скопировано!', 'success')); }
function updateDifficultyButtons() { elements.difficultyBtns.forEach(b => b.classList.remove('active')); document.getElementById(gameState.currentDifficulty + 'Btn')?.classList.add('active'); }

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

// Обработчики вкладок
elements.loginTab.addEventListener('click', () => { 
    elements.loginTab.classList.add('active'); 
    elements.registerTab.classList.remove('active'); 
    elements.loginForm.classList.add('active'); 
    elements.registerForm.classList.remove('active'); 
});
elements.registerTab.addEventListener('click', () => { 
    elements.registerTab.classList.add('active'); 
    elements.loginTab.classList.remove('active'); 
    elements.registerForm.classList.add('active'); 
    elements.loginForm.classList.remove('active'); 
});

// --- ЛОГИКА ВЫБОРА ЦВЕТА И ВХОДА ---
elements.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Попытка входа в существующую комнату...');
    const username = document.getElementById('loginUsername').value.trim();
    const roomId = document.getElementById('loginRoom').value.trim();
    if (username && roomId) {
        pendingJoinData = { username, roomId, isNewRoom: false };
        socket.emit('check_room', pendingJoinData);
        
        // Защита: Если сервер не ответит через 3 секунды, зайдем без цвета
        clearTimeout(checkRoomTimeout);
        checkRoomTimeout = setTimeout(() => {
            console.warn('Сервер не ответил на check_room, заходим напрямую');
            joinGame(username, roomId, false, null);
        }, 3000);
    }
});

elements.registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Попытка создания новой комнаты...');
    const username = document.getElementById('registerUsername').value.trim();
    const roomId = document.getElementById('registerRoom').value.trim();
    if (username && roomId) {
        pendingJoinData = { username, roomId, isNewRoom: true };
        socket.emit('check_room', pendingJoinData);
        
        // Защита: Если сервер не ответит через 3 секунды, зайдем без цвета
        clearTimeout(checkRoomTimeout);
        checkRoomTimeout = setTimeout(() => {
            console.warn('Сервер не ответил на check_room, заходим напрямую');
            joinGame(username, roomId, true, null);
        }, 3000);
    }
});

socket.on('check_room_response', (response) => {
    console.log('Получен ответ check_room_response', response);
    clearTimeout(checkRoomTimeout); // Отменяем защитный таймер

    if (!response.success) { 
        showNotification(response.message, 'error'); 
        return; 
    }

    if (response.isReconnect) { 
        joinGame(pendingJoinData.username, pendingJoinData.roomId, pendingJoinData.isNewRoom, null); 
        return; 
    }

    selectedChipColor = null;
    
    if(elements.colorOptions && elements.colorModal) {
        elements.confirmColorBtn.disabled = true;
        const swatches = elements.colorOptions.querySelectorAll('.color-swatch');
        swatches.forEach(swatch => {
            swatch.classList.remove('selected', 'disabled');
            if (response.takenColors && response.takenColors.includes(swatch.dataset.color)) {
                swatch.classList.add('disabled'); 
                swatch.title = 'Цвет уже занят';
            } else {
                swatch.title = 'Выбрать цвет';
            }
        });
        elements.colorModal.classList.add('active');
    } else {
        console.error("ОШИБКА: Не найдены HTML элементы colorOptions или colorModal!");
        joinGame(pendingJoinData.username, pendingJoinData.roomId, pendingJoinData.isNewRoom, null);
    }
});

if(elements.colorOptions) {
    elements.colorOptions.addEventListener('click', (e) => {
        const swatch = e.target.closest('.color-swatch');
        if (!swatch || swatch.classList.contains('disabled')) return;
        
        elements.colorOptions.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected'); 
        selectedChipColor = swatch.dataset.color; 
        elements.confirmColorBtn.disabled = false;
    });

    elements.confirmColorBtn.addEventListener('click', () => {
        if (selectedChipColor && pendingJoinData) {
            elements.colorModal.classList.remove('active');
            joinGame(pendingJoinData.username, pendingJoinData.roomId, pendingJoinData.isNewRoom, selectedChipColor);
        }
    });

    elements.cancelColorBtn.addEventListener('click', () => {
        elements.colorModal.classList.remove('active'); 
        pendingJoinData = null; 
        selectedChipColor = null;
    });
}
// --- КОНЕЦ ЛОГИКИ ВЫБОРА ЦВЕТА ---

// Игровые действия
elements.rollDiceBtn.addEventListener('click', () => {
    if (gameState.gameOver || gameState.taskInProgress || hasCurrentTask || !gameState.isMyTurn) return;
    elements.diceValue.classList.add('rolling'); 
    elements.rollDiceBtn.disabled = true;
    
    setTimeout(() => {
        const diceValue = Math.floor(Math.random() * 6) + 1;
        elements.diceValue.querySelector('.dice-value').textContent = diceValue; 
        elements.diceValue.classList.remove('rolling');
        
        const oldPos = gameState.currentPlayer.position; 
        const newPos = Math.min(oldPos + diceValue, mapData.cells.length);
        gameState.currentPlayer.position = newPos;
        
        const currentCell = mapData.cells.find(c => c.number === newPos);
        if (currentCell && currentCell.city) gameState.currentPlayer.city = currentCell.city;
        
        updatePlayerUI(); 
        updateOtherPlayerMarker(gameState.currentPlayerId, gameState.currentPlayer.name, newPos, gameState.currentPlayer.city, gameState.currentPlayer.color);
        sendPlayerPositionToServer(newPos, gameState.currentPlayer.city); 
        savePlayerState(); 
        addLogEntry(`🎲 Бросок: ${diceValue}. Позиция: ${newPos}`);
        
        gameState.currentTask = getRandomTask(gameState.currentDifficulty); 
        elements.currentTask.style.display = 'block'; 
        elements.taskDescription.textContent = gameState.currentTask.description; 
        elements.completeTaskBtn.disabled = false; 
        hasCurrentTask = true;
        
        updateRollDiceButtonState(); 
        socket.emit('end_turn'); 
        gameState.isMyTurn = false; 
        updateTurnIndicator();
    }, 1200);
});

elements.completeTaskBtn.addEventListener('click', () => { 
    if (gameState.currentTask) { 
        elements.interactiveTask.style.display = 'block'; 
        createInteractiveTask(gameState.currentTask); 
    } 
});

elements.checkTaskBtn.addEventListener('click', () => { 
    const isCorrect = document.querySelector('.quiz-option.selected')?.dataset.correct === 'true';
    if (isCorrect || !document.querySelector('.quiz-option')) {
        completeInteractiveTask();
    } else { 
        elements.taskResult.textContent = '❌ Ошибка!'; 
        elements.taskResult.style.color = 'red'; 
        elements.checkTaskBtn.style.display = 'none'; 
        elements.retryTaskBtn.style.display = 'block'; 
    }
});

elements.retryTaskBtn.addEventListener('click', () => { 
    elements.taskResult.textContent = ''; 
    elements.retryTaskBtn.style.display = 'none'; 
    createInteractiveTask(gameState.currentTask); 
});

elements.sendMessageBtn.addEventListener('click', () => { 
    const msg = elements.chatInput.value.trim(); 
    if (msg) { 
        socket.emit('chat_message', { message: msg }); 
        elements.chatInput.value = ''; 
    } 
});

elements.chatInput.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter') elements.sendMessageBtn.click(); 
});

elements.inviteBtn.addEventListener('click', showInviteModal);
elements.copyInviteBtn.addEventListener('click', copyInvitation);
elements.closeInviteBtn.addEventListener('click', closeInviteModal);

elements.leaveRoomBtn.addEventListener('click', () => { 
    if (confirm('Покинуть комнату?')) { 
        socket.emit('leave-room'); 
        resetGameState(); 
        elements.authSection.style.display = 'block'; 
        elements.gameContent.style.display = 'none'; 
    } 
});

elements.cityModalCloseBtn.addEventListener('click', closeCityModal);

elements.difficultyBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        if (!this.classList.contains('locked')) { 
            elements.difficultyBtns.forEach(b => b.classList.remove('active')); 
            this.classList.add('active'); 
            gameState.currentDifficulty = this.id.replace('Btn', ''); 
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Игра запущена!');
    setTimeout(() => { 
        if (!isConnected) { 
            updateConnectionStatus('error', '❌ Ошибка'); 
            showNotification('Проверьте интернет', 'error'); 
        } 
    }, 5000);
});
