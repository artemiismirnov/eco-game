// ==================== СОЕДИНЕНИЕ С СЕРВЕРОМ ====================
// Подключаемся к серверу без указания хоста (автоматически использует текущий домен)
const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

let isConnected = false;
let currentRoomId = null;
let hasCurrentTask = false;
let playerStorageKey = 'young_ecologist_player';

// ==================== ЭЛЕМЕНТЫ DOM ====================
const elements = {
    authSection: document.getElementById('authSection'),
    gameContent: document.getElementById('gameContent'),
    loginTab: document.getElementById('loginTab'),
    registerTab: document.getElementById('registerTab'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    mapGrid: document.getElementById('mapGrid'),
    citiesGrid: document.getElementById('citiesGrid'),
    rollDiceBtn: document.getElementById('rollDiceBtn'),
    buildBtn: document.getElementById('buildBtn'),
    moveBtn: document.getElementById('moveBtn'),
    completeTaskBtn: document.getElementById('completeTaskBtn'),
    checkTaskBtn: document.getElementById('checkTaskBtn'),
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
    quickCoins: document.getElementById('quickCoins'),
    quickLevel: document.getElementById('quickLevel'),
    quickPoints: document.getElementById('quickPoints'),
    coinsCount: document.getElementById('coinsCount'),
    cleaningPoints: document.getElementById('cleaningPoints'),
    playerLevel: document.getElementById('playerLevel'),
    roomNumber: document.getElementById('roomNumber'),
    onlinePlayers: document.getElementById('onlinePlayers'),
    playersContainer: document.getElementById('playersContainer'),
    inviteBtn: document.getElementById('inviteBtn'),
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    sendMessageBtn: document.getElementById('sendMessageBtn'),
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
    gameInfo: document.getElementById('gameInfo'),
    cityProgressContainer: document.getElementById('cityProgressContainer'),
    choiceModal: document.getElementById('choiceModal'),
    stayBtn: document.getElementById('stayBtn'),
    moveForwardBtn: document.getElementById('moveForwardBtn'),
    connectionStatusDot: document.getElementById('connectionStatusDot'),
    connectionStatusText: document.getElementById('connectionStatusText'),
    connectionStatusCompact: document.getElementById('connectionStatusCompact'),
    quickActionsBtn: document.getElementById('quickActionsBtn'),
    quickActions: document.getElementById('quickActions'),
    quickDiceBtn: document.getElementById('quickDiceBtn'),
    quickBuildBtn: document.getElementById('quickBuildBtn'),
    quickChatBtn: document.getElementById('quickChatBtn'),
    quickTasksBtn: document.getElementById('quickTasksBtn'),
    quickInviteBtn: document.getElementById('quickInviteBtn')
};

// ==================== ИГРОВЫЕ ДАННЫЕ ====================
const gameData = {
    cities: {
        tver: { 
            name: "Тверь", 
            cells: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 
            position: 0,
            description: "Стартовый город",
            history: "Тверь — один из древнейших городов России, основанный в 1135 году. Расположена на берегах рек Волга, Тверца и Тьмака.",
            problem: "Основные экологические проблемы Твери — загрязнение воздуха промышленными предприятиями и транспортными выбросами.",
            task: "Ваша задача — помочь городу справиться с экологическими проблемами путем посадки деревьев и внедрения чистых технологий."
        },
        kineshma: { 
            name: "Кинешма", 
            cells: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29], 
            position: 1,
            description: "Город на Волге",
            history: "Кинешма — старинный город на Волге, известный с 1504 года. Важный промышленный и культурный центр Ивановской области.",
            problem: "Главная экологическая проблема Кинешмы — загрязнение Волги промышленными стоками и бытовыми отходами.",
            task: "Помогите очистить берега Волги от мусора и организовать систему переработки отходов."
        },
        naberezhnye_chelny: { 
            name: "Набережные Челны", 
            cells: [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43], 
            position: 2,
            description: "Город автомобилестроителей",
            history: "Набережные Челны — молодой город, основанный в 1930 году. Крупный центр автомобильной промышленности России.",
            problem: "Основные экологические проблемы — загрязнение воздуха автомобильными выбросами и промышленными предприятиями.",
            task: "Помогите внедрить экологичные технологии на автозаводе и развить общественный транспорт."
        },
        kazan: { 
            name: "Казань", 
            cells: [47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58], 
            position: 3,
            description: "Столица Татарстана",
            history: "Казань — тысячелетний город, столица Республики Татарстан. Крупный культурный, экономический и научный центр России.",
            problem: "Основные экологические проблемы Казани — высокий уровень загрязнения воздуха, транспортные пробки, утилизация отходов.",
            task: "Ваша задача — помочь внедрить экологичные технологии, развить велоинфраструктуру и систему переработки мусора."
        },
        volgograd: { 
            name: "Волгоград", 
            cells: [66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77], 
            position: 4,
            description: "Город-герой",
            history: "Волгоград — город-герой с богатой историей, известный Сталинградской битвой. Крупный промышленный центр на Волге.",
            problem: "Волгоград страдает от сильного промышленного загрязнения, особенно в районах металлургических и химических заводов.",
            task: "Помогите снизить промышленное загрязнение путем модернизации предприятий и создания зеленых зон."
        },
        astrakhan: { 
            name: "Астрахань", 
            cells: [81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92], 
            position: 5,
            description: "Конечная точка маршрута",
            history: "Астрахань — древний город в дельте Волги, основанный в 1558 году. Важный рыболовный и транспортный узел.",
            problem: "Ключевые экологические проблемы Астрахани — снижение биоразнообразия, загрязнение вод дельты Волги, опустынивание.",
            task: "Ваша финальная задача — помочь сохранить уникальную экосистему дельты Волги и восстановить природное равновесие."
        }
    },
    tasks: {
        easy: [
            {
                description: "Посадите 3 дерева в парке 🌳",
                type: "drag",
                goal: 3,
                items: ["🌳", "🌳", "🌳", "🌳", "🌳"],
                zones: 3
            },
            {
                description: "Сортируйте мусор по контейнерам 🗑️",
                type: "sort",
                items: [
                    {name: "Бумага", type: "paper", emoji: "📄"},
                    {name: "Пластик", type: "plastic", emoji: "🥤"},
                    {name: "Стекло", type: "glass", emoji: "🍶"},
                    {name: "Батарейки", type: "battery", emoji: "🔋"}
                ]
            },
            {
                description: "Ответьте на вопрос об экологии ❓",
                type: "quiz",
                question: "Какой из этих материалов разлагается дольше всего?",
                options: [
                    {text: "Бумага (2-5 недель)", correct: false},
                    {text: "Пластиковая бутылка (450+ лет)", correct: true},
                    {text: "Банан (3-4 недели)", correct: false},
                    {text: "Хлопковая футболка (5-6 месяцев)", correct: false}
                ]
            },
            {
                description: "Соберите фруктовый сад 🍎",
                type: "memory",
                pairs: 6,
                items: ["🍎", "🍌", "🍒", "🍇", "🍊", "🍓"]
            },
            {
                description: "Найдите спрятанных животных 🐾",
                type: "find",
                items: 4,
                objects: ["🐰", "🐿️", "🦊", "🐦", "🌳", "🌿", "🪨"]
            },
            {
                description: "Соберите дождевую воду 💧",
                type: "tap",
                taps: 5,
                drops: 20
            },
            {
                description: "Рассортируйте отходы правильно ♻️",
                type: "drag_drop",
                items: ["📄", "🥤", "🍶", "🔋"],
                categories: ["Бумага", "Пластик", "Стекло", "Опасные"]
            },
            {
                description: "Найдите пары экологических символов 🌱",
                type: "memory_pairs",
                pairs: 4,
                items: ["♻️", "🌍", "💧", "🌞"]
            },
            {
                description: "Кликните на 5 мусорных предметов 🗑️",
                type: "click_cleanup",
                items: 5,
                objects: ["🗑️", "🥤", "📦", "🍌", "📰"]
            },
            {
                description: "Расставьте знаки в правильном порядке 🚸",
                type: "sequence",
                items: ["🚫", "♻️", "💡", "🌱"],
                correctOrder: ["🚫", "♻️", "💡", "🌱"]
            }
        ],
        medium: [
            {
                description: "Очистите реку от 5 единиц мусора 🌊",
                type: "clean",
                goal: 5,
                items: ["🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🌿", "🌿", "🌿"]
            },
            {
                description: "Что такое устойчивое развитие? 🌱",
                type: "quiz",
                question: "Что такое устойчивое развитие?",
                options: [
                    {text: "Развитие, удовлетворяющее потребности настоящего без ущерба для будущего", correct: true},
                    {text: "Быстрое экономическое развитие", correct: false},
                    {text: "Развитие только сельского хозяйства", correct: false},
                    {text: "Развитие промышленности без ограничений", correct: false}
                ]
            },
            {
                description: "Соберите пазл из экологических символов 🧩",
                type: "puzzle",
                pieces: 6,
                image: "🌍♻️🌳💧🌞🌱"
            },
            {
                description: "Составьте пищевую цепочку 🐛",
                type: "chain",
                items: ["🌱", "🐛", "🐦", "🦊"],
                correctOrder: ["🌱", "🐛", "🐦", "🦊"]
            },
            {
                description: "Рассортируйте отходы по категориям 📦",
                type: "categorize",
                categories: ["Перерабатываемые", "Опасные", "Органические"],
                items: ["📄 Бумага", "🔋 Батарейки", "🍎 Яблоко", "🥤 Бутылка"]
            },
            {
                description: "Найдите 3 отличия на картинках 🔍",
                type: "difference",
                differences: 3
            },
            {
                description: "Соберите экологические пазлы 🧩",
                type: "puzzle_medium",
                pieces: 8,
                image: "🌿🌳💧🌞♻️🌍🐦🐝"
            },
            {
                description: "Разместите животных в их среде обитания 🦉",
                type: "habitat",
                animals: ["🐻", "🐬", "🦅", "🐘"],
                habitats: ["🌲", "🌊", "☁️", "🌴"]
            },
            {
                description: "Найдите все батарейки на картинке 🔋",
                type: "find_items",
                items: 4,
                objects: ["🔋", "📱", "💻", "🔌", "🔦", "🎮"]
            },
            {
                description: "Сортируйте отходы в правильные контейнеры 🗃️",
                type: "sort_advanced",
                items: [
                    {name: "Газета", type: "paper", emoji: "📰"},
                    {name: "Консервная банка", type: "metal", emoji: "🥫"},
                    {name: "Батарейка", type: "battery", emoji: "🔋"},
                    {name: "Яблочная кожура", type: "organic", emoji: "🍎"}
                ]
            }
        ],
        hard: [
            {
                description: "Что такое углеродный след? 🌫️",
                type: "quiz",
                question: "Что такое углеродный след?",
                options: [
                    {text: "Количество парниковых газов, производимых деятельностью человека", correct: true},
                    {text: "След от угля на земле", correct: false},
                    {text: "Количество деревьев для поглощения CO2", correct: false},
                    {text: "Уровень загрязнения воздуха в городе", correct: false}
                ]
            },
            {
                description: "Решите экологическую головоломку 🧠",
                type: "puzzle_sequence",
                sequence: ["🌱", "🌳", "🏭", "💨", "🌍", "🔥"],
                correctOrder: ["🌱", "🌳", "🏭", "💨", "🔥", "🌍"]
            },
            {
                description: "Постройте экологичный город 🏙️",
                type: "build_city",
                buildings: 4,
                items: ["🌳 Парк", "☀️ Солнечная панель", "💨 Ветряк", "🚲 Велодорожка"]
            },
            {
                description: "Спасите животных от загрязнения 🐢",
                type: "rescue",
                animals: 3,
                obstacles: ["🗑️", "🛢️", "🌫️"]
            },
            {
                description: "Восстановите экосистему 🌿",
                type: "ecosystem",
                layers: 4,
                items: ["🪱 Почва", "🌱 Растения", "🐝 Насекомые", "🐦 Птицы"]
            },
            {
                description: "Решите кроссворд об экологии ✏️",
                type: "crossword",
                words: 5
            },
            {
                description: "Расставьте этапы переработки ♻️",
                type: "recycle_steps",
                steps: ["📦 Сбор", "🚛 Транспортировка", "🏭 Переработка", "🛒 Продукт"],
                correctOrder: ["📦 Сбор", "🚛 Транспортировка", "🏭 Переработка", "🛒 Продукт"]
            },
            {
                description: "Создайте энергосберегающий дом 🏠",
                type: "energy_house",
                items: ["☀️ Солнечные панели", "🧱 Теплоизоляция", "💡 LED-лампы", "🚿 Экономичный душ"]
            },
            {
                description: "Соберите экологическую мозаику 🎨",
                type: "mosaic",
                pieces: 9,
                image: "🌍🌿🌊🌞🦋🐝🌸🌳💧"
            },
            {
                description: "Распределите ресурсы по отраслям ⚖️",
                type: "resource_distribution",
                resources: ["💧 Вода", "⚡ Энергия", "🌾 Еда", "🏠 Жилье"],
                sectors: ["🏥 Здравоохранение", "🏫 Образование", "🏭 Промышленность", "🌾 Сельское хозяйство"]
            }
        ]
    },
    buildings: [
        {
            name: "Станция переработки ♻️",
            cost: 50,
            points: 100,
            description: "Перерабатывает мусор и уменьшает загрязнение"
        },
        {
            name: "Солнечная электростанция ☀️",
            cost: 100,
            points: 200,
            description: "Производит чистую энергию из солнечного света"
        },
        {
            name: "Эко-парк 🌳",
            cost: 150,
            points: 300,
            description: "Создает зеленую зону для отдыха и очистки воздуха"
        },
        {
            name: "Ветряная мельница 💨",
            cost: 200,
            points: 400,
            description: "Производит энергию из ветра"
        },
        {
            name: "Очистные сооружения 💧",
            cost: 250,
            points: 500,
            description: "Очищает воду от загрязнений"
        },
        {
            name: "Эко-ферма 🚜",
            cost: 300,
            points: 600,
            description: "Производит органические продукты"
        },
        {
            name: "Заповедник 🦌",
            cost: 350,
            points: 700,
            description: "Защищает дикую природу"
        },
        {
            name: "Эко-школа 🏫",
            cost: 400,
            points: 800,
            description: "Обучает экологической грамотности"
        }
    ],
    difficultyRequirements: {
        easy: { level: 1 },
        medium: { level: 5 },
        hard: { level: 10 }
    }
};

// ==================== СОСТОЯНИЕ ИГРЫ ====================
let gameState = {
    currentPlayer: null,
    currentPlayerId: null,
    players: {},
    roomId: null,
    cityProgress: {},
    currentTask: null,
    currentDifficulty: "easy",
    gameOver: false,
    usedTasks: { easy: [], medium: [], hard: [] },
    nextCity: null,
    askedForChoice: {},
    taskInProgress: false,
    dragItems: [],
    dropZones: [],
    sortItems: [],
    sortBins: [],
    selectedPuzzlePieces: [],
    spotDifferencesFound: 0,
    cleanupItems: [],
    playerReconnected: false,
    mobileScrollEnabled: false
};

// ==================== ФУНКЦИИ ПОДКЛЮЧЕНИЯ ====================
function updateConnectionStatus(status, text) {
    if (elements.connectionStatusDot) {
        elements.connectionStatusDot.className = 'connection-dot';
        if (status === 'connected') {
            elements.connectionStatusDot.classList.add('connected');
            elements.connectionStatusText.textContent = 'Подключено';
        } else if (status === 'connecting') {
            elements.connectionStatusDot.classList.add('connecting');
            elements.connectionStatusText.textContent = 'Подключение...';
        } else if (status === 'error') {
            elements.connectionStatusDot.classList.add('error');
            elements.connectionStatusText.textContent = 'Ошибка';
        }
    }
    console.log(`Connection: ${status} - ${text}`);
}

// ==================== СЛУШАТЕЛИ СОБЫТИЙ SOCKET.IO ====================
socket.on('connect', () => {
    console.log('✅ Подключено к серверу');
    isConnected = true;
    updateConnectionStatus('connected', '✅ Подключено к серверу');
    showNotification('Успешно подключено к игровому серверу', 'success');
    
    // Попытка восстановления игры
    restoreGame();
    
    // Запрашиваем позиции всех игроков при подключении
    setTimeout(() => {
        requestAllPlayersPositions();
    }, 2000);
});

socket.on('disconnect', () => {
    console.log('❌ Отключено от сервера');
    isConnected = false;
    updateConnectionStatus('error', '❌ Не подключено к серверу');
    showNotification('Потеряно соединение с сервером', 'error');
    
    // Сохраняем состояние для восстановления
    savePlayerStateToStorage();
});

socket.on('connect_error', (error) => {
    console.log('❌ Ошибка подключения:', error);
    isConnected = false;
    updateConnectionStatus('error', '❌ Ошибка подключения');
    showNotification('Ошибка подключения к серверу', 'error');
});

socket.on('connection_confirmed', (data) => {
    console.log('✅ Подтверждение подключения от сервера:', data);
});

socket.on('join-success', (playerData) => {
    console.log('✅ Успешно присоединились к комнате', playerData);
    gameState.roomId = playerData.roomId || currentRoomId;
    gameState.playerReconnected = false;
    initializeGame(playerData);
    
    // Сохраняем данные игрока в localStorage
    savePlayerDataToStorage(playerData);
    
    // Запрашиваем позиции всех игроков после присоединения к комнате
    setTimeout(() => {
        requestAllPlayersPositions();
    }, 1500);
});

socket.on('room-error', (message) => {
    showNotification(message === '[object Object]' ? 'Комнаты с таким номером не существует' : message, 'error');
    elements.authSection.style.display = 'block';
    elements.gameContent.style.display = 'none';
    elements.quickActionsBtn.style.display = 'none';
});

socket.on('room_state', (roomData) => {
    console.log('🔄 Получено обновление комнаты:', roomData);
    updateRoomState(roomData);
});

socket.on('player_joined', (data) => {
    console.log('👥 Новый игрок:', data.player.name);
    gameState.players[data.playerId] = data.player;
    updatePlayersList();
    updatePlayerMarkers();
    
    addLogEntry(`👋 Игрок "${data.player.name}" присоединился к игре!`);
    
    setTimeout(() => {
        requestAllPlayersPositions();
    }, 1000);
});

socket.on('player_left', (data) => {
    console.log('🚪 Игрок покинул:', data.playerName);
    if (gameState.players[data.playerId]) {
        gameState.players[data.playerId].connected = false;
    }
    updatePlayersList();
    updatePlayerMarkers();
    
    addLogEntry(`👋 Игрок "${data.playerName}" покинул игру.`);
});

socket.on('new_chat_message', (data) => {
    if (data.playerName && data.message) {
        addChatMessage(data.playerName, data.message);
    }
});

socket.on('chat_history', (messages) => {
    console.log('💬 Получена история чата:', messages.length, 'сообщений');
    elements.chatMessages.innerHTML = '';
    messages.forEach(msg => {
        if (msg.playerName && msg.playerName !== 'Система') {
            addChatMessage(msg.playerName, msg.message);
        }
    });
});

socket.on('player_dice_roll', (data) => {
    if (gameState.players[data.playerId] && data.playerId !== gameState.currentPlayerId) {
        gameState.players[data.playerId].position = data.newPosition;
        gameState.players[data.playerId].currentTask = data.task;
        updatePlayerMarkers();
        
        addLogEntry(`🎲 Игрок "${gameState.players[data.playerId].name}" бросил кубик: ${data.diceValue}`);
        
        if (data.playerId !== socket.id) {
            console.log(`🎲 Игрок ${gameState.players[data.playerId].name} бросил кубик, новая позиция: ${data.newPosition}`);
            updateOtherPlayerMarker(data.playerId, gameState.players[data.playerId].name, data.newPosition, '', '');
        }
    }
});

socket.on('progress_updated', (data) => {
    gameState.cityProgress[data.cityKey] = data.progress;
    createCurrentCityProgress();
    
    addLogEntry(`📊 Прогресс очищения города обновлен: ${data.progress}%`);
});

// ==================== ФУНКЦИИ ВОССТАНОВЛЕНИЯ ИГРЫ ====================
function savePlayerDataToStorage(playerData) {
    const playerInfo = {
        username: playerData.name,
        roomId: currentRoomId || gameState.roomId,
        playerId: socket.id,
        timestamp: Date.now(),
        ipAddress: getIPAddress(),
        deviceId: getDeviceId()
    };
    localStorage.setItem(playerStorageKey, JSON.stringify(playerInfo));
}

function savePlayerStateToStorage() {
    if (gameState.currentPlayer) {
        const gameStateToSave = {
            player: gameState.currentPlayer,
            roomId: currentRoomId || gameState.roomId,
            timestamp: Date.now()
        };
        localStorage.setItem(playerStorageKey + '_state', JSON.stringify(gameStateToSave));
    }
}

function getIPAddress() {
    // Возвращаем фиктивный IP для демонстрации
    return 'local-' + Math.random().toString(36).substr(2, 9);
}

function getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = 'device-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
}

function restoreGame() {
    const savedPlayer = localStorage.getItem(playerStorageKey);
    const savedState = localStorage.getItem(playerStorageKey + '_state');
    
    if (savedPlayer && savedState) {
        const playerInfo = JSON.parse(savedPlayer);
        const gameStateInfo = JSON.parse(savedState);
        
        // Проверяем, не прошло ли слишком много времени (30 минут)
        const timeDiff = Date.now() - playerInfo.timestamp;
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (timeDiff < thirtyMinutes) {
            // Автоматически подключаемся к комнате
            currentRoomId = playerInfo.roomId;
            gameState.playerReconnected = true;
            
            socket.emit('reconnect_player', {
                roomId: playerInfo.roomId,
                playerName: playerInfo.username,
                playerId: playerInfo.playerId,
                deviceId: playerInfo.deviceId
            });
            
            showNotification('🔄 Восстанавливаем подключение...', 'info');
            return true;
        }
    }
    return false;
}

// Обработчик восстановления игрока
socket.on('reconnect_success', (playerData) => {
    console.log('✅ Успешно восстановлен в комнате', playerData);
    gameState.currentPlayer = playerData;
    gameState.currentPlayerId = socket.id;
    gameState.playerReconnected = true;
    
    elements.authSection.style.display = 'none';
    elements.gameContent.style.display = 'block';
    updatePlayerUI();
    elements.roomNumber.textContent = currentRoomId || gameState.roomId;
    
    createMap();
    createCitiesGrid();
    createBuildingsList();
    updateDifficultyButtons();
    initializeQuickActions();
    
    addLogEntry(`🔄 Вы восстановили подключение к игре, ${playerData.name}!`);
    
    setTimeout(() => {
        showCityModal(gameState.currentPlayer.city);
    }, 1000);
    
    socket.emit('get_room_state');
    
    // Включаем кнопки
    elements.rollDiceBtn.disabled = false;
    elements.buildBtn.disabled = false;
    
    showNotification(`🔄 Добро пожаловать обратно, ${playerData.name}!`, 'success');
});

socket.on('reconnect_failed', (message) => {
    showNotification(message || 'Не удалось восстановить подключение', 'error');
    localStorage.removeItem(playerStorageKey);
    localStorage.removeItem(playerStorageKey + '_state');
});

// ==================== СИНХРОНИЗАЦИЯ ДВИЖЕНИЯ ИГРОКОВ ====================
function sendPlayerPositionToServer(position, city) {
    if (socket.connected && gameState.currentPlayer) {
        socket.emit('player_position_update', {
            position: position,
            city: city
        });
        console.log(`📤 Отправлена позиция на сервер: ${position}, город: ${city}`);
    }
}

function requestAllPlayersPositions() {
    if (socket.connected) {
        socket.emit('request_all_positions');
        console.log('🔄 Запрос позиций всех игроков...');
    }
}

function updateOtherPlayerMarker(playerId, playerName, position, city, color) {
    let marker = document.getElementById(`marker-${playerId}`);
    
    if (!marker) {
        marker = document.createElement('div');
        marker.className = 'player-marker';
        marker.id = `marker-${playerId}`;
        marker.setAttribute('data-player', playerName);
        marker.style.background = color || getRandomColor(playerId);
        marker.style.border = '2px solid white';
        marker.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.7)';
        marker.innerHTML = '<i class="fas fa-user" style="font-size: 10px; color: white;"></i>';
        
        const tooltip = document.createElement('div');
        tooltip.className = 'player-tooltip';
        tooltip.textContent = playerName;
        tooltip.style.cssText = 'position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; white-space: nowrap; opacity: 0; transition: opacity 0.3s; pointer-events: none;';
        marker.appendChild(tooltip);
        
        marker.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
        });
        marker.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });
        
        elements.mapGrid.appendChild(marker);
        console.log(`🆕 Создан маркер для игрока ${playerName}`);
    }
    
    const cellNumber = position || 1;
    const row = Math.floor((cellNumber - 1) / 10);
    const col = (cellNumber - 1) % 10;
    
    const leftPercent = (col * 10) + 5;
    const topPercent = (row * 10) + 5;
    
    if (row % 2 === 1) {
        marker.style.left = `${leftPercent + 2.5}%`;
    } else {
        marker.style.left = `${leftPercent}%`;
    }
    
    marker.style.top = `${topPercent}%`;
    
    const tooltip = marker.querySelector('.player-tooltip');
    if (tooltip) {
        tooltip.textContent = `${playerName} (поз. ${position})`;
    }
    
    updatePlayerInList(playerId, position, playerName);
}

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

function updatePlayerInList(playerId, position, playerName) {
    const playerItems = document.querySelectorAll('.player-item');
    let found = false;
    
    playerItems.forEach(item => {
        if (item.textContent.includes(playerName) || item.dataset.playerId === playerId) {
            found = true;
            const positionSpan = item.querySelector('.player-position');
            if (positionSpan) {
                positionSpan.textContent = `поз. ${position}`;
            } else {
                const posElement = document.createElement('span');
                posElement.className = 'player-position';
                posElement.textContent = `поз. ${position}`;
                posElement.style.color = 'var(--secondary)';
                posElement.style.marginLeft = '5px';
                item.appendChild(posElement);
            }
        }
    });
    
    if (!found) {
        updatePlayersList();
    }
}

// Обработчики событий для синхронизации
socket.on('player_position_update', (data) => {
    const { playerId, playerName, position, city, color } = data;
    
    if (playerId !== socket.id) {
        console.log(`📍 Получено обновление позиции игрока ${playerName}: ${position}, город: ${city}`);
        updateOtherPlayerMarker(playerId, playerName, position, city, color);
    }
});

socket.on('all_players_positions', (data) => {
    console.log('🔄 Получены позиции всех игроков:', data);
    
    const { players } = data;
    
    for (const playerId in players) {
        const player = players[playerId];
        
        updateOtherPlayerMarker(
            playerId,
            player.name,
            player.position,
            player.city,
            player.color
        );
    }
});

// ==================== ОСНОВНЫЕ ФУНКЦИИ ИГРЫ ====================
function showNotification(message, type = 'info') {
    elements.notification.textContent = message;
    elements.notification.className = 'notification';
    
    if (type === 'success') {
        elements.notification.style.background = 'var(--success)';
    } else if (type === 'warning') {
        elements.notification.style.background = 'var(--warning)';
    } else if (type === 'error') {
        elements.notification.style.background = 'var(--accent)';
    } else {
        elements.notification.style.background = 'var(--secondary)';
    }
    
    elements.notification.classList.add('show');
    
    setTimeout(() => {
        elements.notification.classList.remove('show');
    }, 3000);
}

function joinGame(username, roomId, isNewRoom) {
    if (!isConnected) {
        showNotification('Нет подключения к серверу. Попробуйте обновить страницу.', 'error');
        return;
    }
    
    currentRoomId = roomId;
    
    socket.emit('join-room', {
        roomId: roomId,
        playerName: username,
        isNewRoom: isNewRoom
    });
    
    showNotification('Подключаемся к комнате...', 'info');
}

function initializeGame(playerData) {
    gameState.currentPlayer = playerData;
    gameState.currentPlayerId = socket.id;
    
    elements.authSection.style.display = 'none';
    elements.gameContent.style.display = 'block';
    updatePlayerUI();
    elements.roomNumber.textContent = currentRoomId || gameState.roomId;
    
    createMap();
    createCitiesGrid();
    createBuildingsList();
    updateDifficultyButtons();
    
    // Инициализируем быстрые кнопки (только в игровом режиме)
    initializeQuickActions();
    elements.quickActionsBtn.style.display = 'flex';
    
    addLogEntry(`🎮 Добро пожаловать в игру, ${playerData.name}!`);
    
    setTimeout(() => {
        showCityModal(gameState.currentPlayer.city);
    }, 1000);
    
    socket.emit('get_room_state');
    
    // Включаем кнопки
    elements.rollDiceBtn.disabled = false;
    elements.buildBtn.disabled = false;
}

function updateRoomState(roomData) {
    gameState.players = roomData.players;
    gameState.cityProgress = roomData.cityProgress || {};
    
    updatePlayersList();
    updatePlayerMarkers();
    elements.onlinePlayers.textContent = Object.keys(roomData.players).filter(id => roomData.players[id].connected).length;
    
    createCurrentCityProgress();
    
    if (gameState.currentPlayerId && gameState.players[gameState.currentPlayerId]) {
        const serverPlayer = gameState.players[gameState.currentPlayerId];
        gameState.currentPlayer = serverPlayer;
        updatePlayerUI();
        
        // Если игрок восстановил подключение, активируем кнопки
        if (gameState.playerReconnected) {
            elements.rollDiceBtn.disabled = false;
            elements.buildBtn.disabled = false;
            gameState.playerReconnected = false;
        }
    }
}

function addChatMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = `<span class="chat-sender">${sender}:</span> <span class="chat-text">${message}</span>`;
    elements.chatMessages.appendChild(messageElement);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function savePlayerState() {
    if (!isConnected || !gameState.currentPlayer) return;
    
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
        color: gameState.currentPlayer.color || getRandomColor(gameState.currentPlayerId),
        connected: true
    });
}

function sendChatMessage(message) {
    if (isConnected && gameState.currentPlayer) {
        socket.emit('chat_message', {
            message: message
        });
    }
}

// ==================== ФУНКЦИИ ИНТЕРФЕЙСА ====================
function createMap() {
    elements.mapGrid.innerHTML = '';
    
    const riverCells = [14, 15, 16, 17, 30, 31, 44, 45, 46, 59, 60, 61, 62, 63, 64, 65, 78, 79, 80];
    const forestCells = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92];
    
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.className = 'map-cell hexagon';
            cell.style.position = 'relative';
            
            const cellNumber = row * 10 + col + 1;
            
            if (cellNumber > 94) {
                cell.classList.add('empty');
                cell.textContent = '';
                elements.mapGrid.appendChild(cell);
                continue;
            }
            
            const numberSpan = document.createElement('span');
            numberSpan.className = 'cell-number';
            numberSpan.textContent = cellNumber;
            numberSpan.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 12px; font-weight: bold; color: #333; z-index: 1;';
            
            if (cellNumber === 1) {
                cell.classList.add('start');
                cell.style.background = 'rgba(76, 175, 80, 0.8)';
                numberSpan.textContent = '1';
                numberSpan.style.color = 'white';
                numberSpan.style.fontSize = '12px';
                
                if (gameState.currentPlayer && !gameState.currentPlayer.position) {
                    gameState.currentPlayer.position = 1;
                    updatePlayerUI();
                }
            } else if (cellNumber === 94) {
                cell.classList.add('finish');
                cell.style.background = 'rgba(244, 67, 54, 0.8)';
                numberSpan.textContent = '94';
                numberSpan.style.color = 'white';
                numberSpan.style.fontSize = '12px';
            } else if (riverCells.includes(cellNumber)) {
                cell.classList.add('river');
                cell.style.background = 'rgba(33, 150, 243, 0.3)';
                numberSpan.style.color = '#2196F3';
            } else if (forestCells.includes(cellNumber)) {
                cell.classList.add('forest');
                cell.style.background = 'rgba(56, 142, 60, 0.3)';
                numberSpan.style.color = '#388E3C';
            } else {
                let isCity = false;
                for (const cityKey in gameData.cities) {
                    if (gameData.cities[cityKey].cells.includes(cellNumber)) {
                        cell.classList.add('city');
                        cell.style.background = 'rgba(255, 235, 59, 0.8)';
                        numberSpan.style.color = '#FF9800';
                        isCity = true;
                        break;
                    }
                }
                if (!isCity) {
                    cell.style.background = 'rgba(255, 255, 255, 0.7)';
                    numberSpan.style.color = '#666';
                }
            }
            
            cell.appendChild(numberSpan);
            elements.mapGrid.appendChild(cell);
        }
    }
    
    updatePlayerMarkers();
}

function updatePlayerMarkers() {
    document.querySelectorAll('.player-marker').forEach(marker => {
        marker.remove();
    });
    
    requestAllPlayersPositions();
}

function updatePlayersList() {
    elements.playersContainer.innerHTML = '';
    
    for (const playerId in gameState.players) {
        const player = gameState.players[playerId];
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.dataset.playerId = playerId;
        
        if (playerId === gameState.currentPlayerId) {
            playerItem.classList.add('current');
        }
        
        if (!player.connected) {
            playerItem.style.opacity = '0.6';
        }
        
        const statusIcon = player.connected ? '🟢' : '🔴';
        
        playerItem.innerHTML = `
            <span>${statusIcon} ${player.name} 
                ${playerId === gameState.currentPlayerId ? '<span style="color: var(--secondary);">(Вы)</span>' : ''}
            </span>
            <span>${player.cleaningPoints} баллов <span class="player-position">поз. ${player.position || 1}</span></span>
        `;
        
        elements.playersContainer.appendChild(playerItem);
    }
}

function updatePlayerUI() {
    if (gameState.currentPlayer) {
        elements.playerName.textContent = gameState.currentPlayer.name;
        elements.currentCity.textContent = gameData.cities[gameState.currentPlayer.city]?.name || 'Тверь';
        elements.currentPosition.textContent = gameState.currentPlayer.position;
        elements.coinsCount.textContent = gameState.currentPlayer.coins;
        elements.cleaningPoints.textContent = gameState.currentPlayer.cleaningPoints;
        elements.playerLevel.textContent = gameState.currentPlayer.level;
        elements.quickCoins.textContent = gameState.currentPlayer.coins;
        elements.quickLevel.textContent = gameState.currentPlayer.level;
        elements.quickPoints.textContent = gameState.currentPlayer.cleaningPoints;
    }
}

function createCurrentCityProgress() {
    elements.cityProgressContainer.innerHTML = '';
    
    if (gameState.currentPlayer && gameState.currentPlayer.city) {
        const cityKey = gameState.currentPlayer.city;
        const city = gameData.cities[cityKey];
        const progress = gameState.cityProgress[cityKey] || 0;
        
        const progressElement = document.createElement('div');
        progressElement.className = 'city-progress';
        progressElement.innerHTML = `
            <div class="city-progress-header">
                <span>${city.name}</span>
                <span>${progress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%;"></div>
            </div>
        `;
        
        elements.cityProgressContainer.appendChild(progressElement);
    }
}

function createCitiesGrid() {
    elements.citiesGrid.innerHTML = '';
    
    for (const cityKey in gameData.cities) {
        const city = gameData.cities[cityKey];
        const cityCard = document.createElement('div');
        cityCard.className = 'city-card';
        cityCard.dataset.city = cityKey;
        
        if (cityKey === (gameState.currentPlayer?.city || 'tver')) {
            cityCard.classList.add('active');
        }
        
        const progress = gameState.cityProgress[cityKey] || 0;
        
        cityCard.innerHTML = `
            <div class="city-name">${city.name}</div>
            <div class="city-position">Клетки: ${city.cells[0]}-${city.cells[city.cells.length-1]}</div>
            <div class="city-progress-mini">
                <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin-top: 5px;">
                    <div style="width: ${progress}%; height: 100%; background: var(--success); border-radius: 2px;"></div>
                </div>
            </div>
        `;
        
        cityCard.addEventListener('click', () => {
            showCityModal(cityKey);
        });
        
        elements.citiesGrid.appendChild(cityCard);
    }
}

function createBuildingsList() {
    elements.buildingsContainer.innerHTML = '';
    
    gameData.buildings.forEach((building, index) => {
        const buildingItem = document.createElement('div');
        buildingItem.className = 'building-item';
        buildingItem.innerHTML = `
            <div>
                <div style="font-weight: bold;">${building.name} (${building.cost} монет)</div>
                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.7);">${building.description}</div>
                <div style="font-size: 0.8rem; color: var(--success); margin-top: 5px;">+${building.points} баллов очищения</div>
            </div>
            <button class="game-btn buy-btn" data-building="${index}">Купить 🛒</button>
        `;
        
        elements.buildingsContainer.appendChild(buildingItem);
    });
    
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const buildingIndex = parseInt(this.dataset.building);
            const building = gameData.buildings[buildingIndex];
            
            if (gameState.currentPlayer.coins >= building.cost) {
                gameState.currentPlayer.coins -= building.cost;
                gameState.currentPlayer.cleaningPoints += building.points;
                if (!gameState.currentPlayer.buildings) gameState.currentPlayer.buildings = [];
                gameState.currentPlayer.buildings.push(building.name);
                
                updatePlayerUI();
                
                const currentCityProgress = gameState.cityProgress[gameState.currentPlayer.city] || 0;
                const newProgress = Math.min(100, currentCityProgress + 15);
                updateCityProgress(gameState.currentPlayer.city, newProgress);
                
                addLogEntry(`🏗️ Вы построили "${building.name}"! Получено ${building.points} баллов очищения.`);
                
                savePlayerState();
                
                // Показываем уведомление о покупке
                showNotification(`✅ Вы построили "${building.name}" за ${building.cost} монет! +${building.points} баллов`, 'success');
                
                if (gameState.currentPlayer.position >= 94 && gameState.currentPlayer.buildings.length >= 1) {
                    gameState.gameOver = true;
                    addLogEntry(`🎊 Поздравляем! Вы достигли Астрахани и построили объект! Игра завершена.`);
                    showNotification(`🎊 Поздравляем! Вы достигли Астрахани и построили объект! Игра завершена.`, 'success');
                }
                
                createBuildingsList();
            } else {
                showNotification(`❌ Недостаточно монет для постройки "${building.name}"! Нужно ещё ${building.cost - gameState.currentPlayer.coins} монет`, 'warning');
            }
        });
    });
}

function updateCityProgress(cityKey, progress) {
    gameState.cityProgress[cityKey] = progress;
    createCurrentCityProgress();
    
    socket.emit('update_progress', {
        cityKey: cityKey,
        progress: progress
    });
    
    savePlayerState();
    createCitiesGrid();
}

function showCityModal(cityKey) {
    const city = gameData.cities[cityKey];
    if (!city) return;
    
    elements.cityModalTitle.textContent = city.name;
    elements.cityModalSubtitle.textContent = city.description;
    elements.cityModalHistory.textContent = city.history;
    elements.cityModalProblem.textContent = city.problem;
    elements.cityModalTask.textContent = city.task;
    
    elements.cityModal.classList.add('active');
}

function closeCityModal() {
    elements.cityModal.classList.remove('active');
}

function showChoiceModal(nextCity) {
    gameState.nextCity = nextCity;
    elements.choiceModal.classList.add('active');
}

function closeChoiceModal() {
    elements.choiceModal.classList.remove('active');
}

function updateDifficultyButtons() {
    const playerLevel = gameState.currentPlayer?.level || 1;
    
    elements.easyBtn.classList.remove('locked');
    
    if (playerLevel >= 5) {
        elements.mediumBtn.classList.remove('locked');
    } else {
        elements.mediumBtn.classList.add('locked');
    }
    
    if (playerLevel >= 10) {
        elements.hardBtn.classList.remove('locked');
    } else {
        elements.hardBtn.classList.add('locked');
    }
}

function addLogEntry(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    elements.logEntries.appendChild(entry);
    elements.logEntries.scrollTop = elements.logEntries.scrollHeight;
}

// ==================== КНОПКА БЫСТРЫХ ДЕЙСТВИЙ ====================
function initializeQuickActions() {
    let quickActionsVisible = false;
    
    // Скрываем кнопку быстрых действий на главном экране
    elements.quickActionsBtn.style.display = 'none';
    
    // Показываем только когда игрок вошел в комнату
    if (elements.gameContent.style.display === 'block') {
        elements.quickActionsBtn.style.display = 'flex';
    }
    
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
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
            });
            element.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
            element.style.transition = 'box-shadow 0.5s';
            setTimeout(() => {
                element.style.boxShadow = '';
            }, 2000);
        }
    }
    
    elements.quickDiceBtn.addEventListener('click', function() {
        elements.quickActions.classList.remove('show');
        elements.quickActionsBtn.classList.remove('active');
        quickActionsVisible = false;
        
        scrollToElement('rollDiceBtn');
        
        setTimeout(() => {
            if (!elements.rollDiceBtn.disabled && !gameState.gameOver && !gameState.taskInProgress && !hasCurrentTask) {
                elements.rollDiceBtn.click();
            } else if (gameState.taskInProgress) {
                showNotification('Завершите текущее задание перед броском кубика!', 'warning');
            } else if (gameState.gameOver) {
                showNotification('Игра завершена!', 'warning');
            } else if (hasCurrentTask) {
                showNotification('Сначала выполните текущее задание!', 'warning');
            }
        }, 500);
    });
    
    elements.quickBuildBtn.addEventListener('click', function() {
        elements.quickActions.classList.remove('show');
        elements.quickActionsBtn.classList.remove('active');
        quickActionsVisible = false;
        
        if (elements.buildBtn.disabled) {
            showNotification('Сначала выполните задание, чтобы построить объект!', 'warning');
            return;
        }
        
        setTimeout(() => {
            // Прокручиваем к разделу строительства объектов
            elements.buildingsSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
            });
            
            // Подсвечиваем раздел
            elements.buildingsSection.style.boxShadow = '0 0 20px rgba(78, 205, 196, 0.8)';
            elements.buildingsSection.style.transition = 'box-shadow 0.5s';
            setTimeout(() => {
                elements.buildingsSection.style.boxShadow = '';
            }, 2000);
        }, 100);
    });
    
    elements.quickChatBtn.addEventListener('click', function() {
        elements.quickActions.classList.remove('show');
        elements.quickActionsBtn.classList.remove('active');
        quickActionsVisible = false;
        
        setTimeout(() => {
            const chatSection = document.querySelector('.chat-section');
            if (chatSection) {
                chatSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'center'
                });
                setTimeout(() => {
                    elements.chatInput.focus();
                }, 300);
            }
        }, 100);
    });
    
    elements.quickTasksBtn.addEventListener('click', function() {
        elements.quickActions.classList.remove('show');
        elements.quickActionsBtn.classList.remove('active');
        quickActionsVisible = false;
        
        setTimeout(() => {
            const taskCard = document.querySelector('.task-card');
            if (taskCard) {
                taskCard.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 100);
    });
    
    elements.quickInviteBtn.addEventListener('click', function() {
        elements.quickActions.classList.remove('show');
        elements.quickActionsBtn.classList.remove('active');
        quickActionsVisible = false;
        
        elements.inviteBtn.click();
    });
    
    document.addEventListener('click', function(event) {
        if (quickActionsVisible && 
            !elements.quickActionsBtn.contains(event.target) && 
            !elements.quickActions.contains(event.target)) {
            elements.quickActions.classList.remove('show');
            elements.quickActionsBtn.classList.remove('active');
            quickActionsVisible = false;
        }
    });
    
    function updateQuickButtons() {
        if (gameState.gameOver) {
            elements.quickDiceBtn.style.opacity = '0.5';
            elements.quickDiceBtn.style.cursor = 'not-allowed';
            elements.quickDiceBtn.title = 'Игра завершена';
            elements.quickBuildBtn.style.opacity = '0.5';
            elements.quickBuildBtn.style.cursor = 'not-allowed';
            elements.quickBuildBtn.title = 'Игра завершена';
        } else {
            elements.quickDiceBtn.style.opacity = '1';
            elements.quickDiceBtn.style.cursor = 'pointer';
            elements.quickDiceBtn.title = 'Бросить кубик';
            
            if (hasCurrentTask || gameState.taskInProgress) {
                elements.quickBuildBtn.style.opacity = '0.5';
                elements.quickBuildBtn.style.cursor = 'not-allowed';
                elements.quickBuildBtn.title = 'Сначала выполните задание';
            } else {
                elements.quickBuildBtn.style.opacity = '1';
                elements.quickBuildBtn.style.cursor = 'pointer';
                elements.quickBuildBtn.title = 'Построить объект';
            }
        }
        
        // Показываем кнопку только в игровом режиме
        if (elements.gameContent.style.display === 'block') {
            elements.quickActionsBtn.style.display = 'flex';
        } else {
            elements.quickActionsBtn.style.display = 'none';
        }
    }
    
    setInterval(updateQuickButtons, 1000);
    updateQuickButtons();
}

// ==================== ИНТЕРАКТИВНЫЕ ЗАДАНИЯ ====================
function getRandomTask(difficulty) {
    const availableTasks = gameData.tasks[difficulty];
    if (!availableTasks || availableTasks.length === 0) return null;
    
    // Если использовали все задания, сбрасываем список
    if (gameState.usedTasks[difficulty].length >= availableTasks.length) {
        gameState.usedTasks[difficulty] = [];
    }
    
    let randomTask;
    let attempts = 0;
    
    // Пытаемся найти задание, которое еще не использовалось
    do {
        randomTask = availableTasks[Math.floor(Math.random() * availableTasks.length)];
        attempts++;
        if (attempts > 50) break; // Защита от бесконечного цикла
    } while (gameState.usedTasks[difficulty].includes(randomTask.description) && attempts < 50);
    
    if (!gameState.usedTasks[difficulty].includes(randomTask.description)) {
        gameState.usedTasks[difficulty].push(randomTask.description);
    }
    
    return randomTask;
}

function createInteractiveTask(task) {
    elements.taskArea.innerHTML = '';
    elements.taskResult.textContent = '';
    gameState.taskInProgress = true;
    hasCurrentTask = true;
    
    // Очищаем состояние предыдущего задания
    gameState.dragItems = [];
    gameState.dropZones = [];
    gameState.sortItems = [];
    gameState.sortBins = [];
    gameState.selectedPuzzlePieces = [];
    gameState.spotDifferencesFound = 0;
    gameState.cleanupItems = [];
    
    // Выбираем тип задания
    if (task.type === "quiz") {
        createQuizTask(task);
    } else if (task.type === "drag") {
        createDragTask(task);
    } else if (task.type === "sort") {
        createSortTask(task);
    } else if (task.type === "clean") {
        createCleanupTask(task);
    } else if (task.type === "puzzle") {
        createPuzzleTask(task);
    } else if (task.type === "memory") {
        createMemoryTask(task);
    } else if (task.type === "find") {
        createFindTask(task);
    } else if (task.type === "tap") {
        createTapTask(task);
    } else if (task.type === "chain") {
        createChainTask(task);
    } else if (task.type === "categorize") {
        createCategorizeTask(task);
    } else if (task.type === "difference") {
        createDifferenceTask(task);
    } else if (task.type === "build_city") {
        createBuildCityTask(task);
    } else if (task.type === "rescue") {
        createRescueTask(task);
    } else if (task.type === "ecosystem") {
        createEcosystemTask(task);
    } else if (task.type === "crossword") {
        createCrosswordTask(task);
    } else if (task.type === "puzzle_sequence") {
        createPuzzleSequenceTask(task);
    } else if (task.type === "drag_drop") {
        createDragDropTask(task);
    } else if (task.type === "memory_pairs") {
        createMemoryPairsTask(task);
    } else if (task.type === "click_cleanup") {
        createClickCleanupTask(task);
    } else if (task.type === "sequence") {
        createSequenceTask(task);
    } else if (task.type === "puzzle_medium") {
        createPuzzleMediumTask(task);
    } else if (task.type === "habitat") {
        createHabitatTask(task);
    } else if (task.type === "find_items") {
        createFindItemsTask(task);
    } else if (task.type === "sort_advanced") {
        createSortAdvancedTask(task);
    } else if (task.type === "recycle_steps") {
        createRecycleStepsTask(task);
    } else if (task.type === "energy_house") {
        createEnergyHouseTask(task);
    } else if (task.type === "mosaic") {
        createMosaicTask(task);
    } else if (task.type === "resource_distribution") {
        createResourceDistributionTask(task);
    } else {
        createDefaultTask(task);
    }
    
    elements.checkTaskBtn.disabled = true;
    
    // Включаем прокрутку при перетаскивании на мобильных устройствах
    if ('ontouchstart' in window) {
        enableMobileDragScrolling();
    }
}

function enableMobileDragScrolling() {
    if (gameState.mobileScrollEnabled) return;
    
    let isDragging = false;
    let startY = 0;
    let scrollTop = 0;
    
    elements.taskArea.addEventListener('touchstart', function(e) {
        // Проверяем, не началось ли перетаскивание элемента
        if (e.target.classList.contains('draggable-item') || 
            e.target.classList.contains('sort-item') ||
            e.target.classList.contains('puzzle-piece')) {
            isDragging = false;
            return;
        }
        
        isDragging = true;
        startY = e.touches[0].pageY;
        scrollTop = this.scrollTop;
    }, { passive: true });
    
    elements.taskArea.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        
        const y = e.touches[0].pageY;
        const walk = (startY - y) * 2;
        this.scrollTop = scrollTop + walk;
    }, { passive: true });
    
    elements.taskArea.addEventListener('touchend', function() {
        isDragging = false;
    }, { passive: true });
    
    gameState.mobileScrollEnabled = true;
}

function createQuizTask(task) {
    elements.taskArea.innerHTML = `
        <div class="quiz-container">
            <p class="quiz-question"><strong>${task.question}</strong></p>
            <div class="quiz-options">
                ${task.options.map((option, index) => 
                    `<div class="quiz-option" data-index="${index}" data-correct="${option.correct}">
                        ${option.text}
                    </div>`
                ).join('')}
            </div>
        </div>
    `;
    
    // Оптимизация для мобильных устройств
    if ('ontouchstart' in window) {
        elements.taskArea.querySelectorAll('.quiz-option').forEach(option => {
            option.style.padding = '16px 12px';
            option.style.margin = '10px 0';
            option.style.fontSize = '1.1rem';
        });
    }
    
    document.querySelectorAll('.quiz-option').forEach(option => {
        option.addEventListener('click', function() {
            const isCorrect = this.dataset.correct === 'true';
            const allOptions = document.querySelectorAll('.quiz-option');
            
            allOptions.forEach(opt => {
                opt.style.pointerEvents = 'none';
                if (opt.dataset.correct === 'true') {
                    opt.classList.add('correct');
                } else if (opt === this && !isCorrect) {
                    opt.classList.add('incorrect');
                }
            });
            
            elements.taskResult.textContent = isCorrect ? 
                '✅ Правильно! Задание выполнено.' : 
                '❌ Неправильно. Попробуйте еще раз.';
            elements.taskResult.style.color = isCorrect ? '#2ecc71' : '#e74c3c';
            
            if (isCorrect) {
                elements.checkTaskBtn.disabled = false;
            }
        });
        
        // Добавляем обработчик для сенсорных устройств
        option.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.click();
        });
    });
}

function createDragTask(task) {
    elements.taskArea.innerHTML = `
        <div class="task-instructions">
            <p><strong>${task.description}</strong></p>
            <p>Перетащите ${task.goal} дерева в специальные зоны посадки:</p>
        </div>
        <div class="drag-container">
            <div class="drag-items">
                ${task.items.map((item, index) => 
                    `<div class="draggable-item" data-index="${index}" draggable="true">
                        ${item}
                    </div>`
                ).join('')}
            </div>
            <div class="drop-zones">
                ${Array.from({length: task.zones || task.goal}).map((_, index) => 
                    `<div class="drop-zone" data-zone="${index}">
                        <span>Зона посадки ${index + 1}</span>
                    </div>`
                ).join('')}
            </div>
        </div>
        <div class="task-progress">
            <p>Перетащено: <span id="dragCount">0</span>/${task.goal}</p>
        </div>
    `;
    
    // Оптимизация для мобильных устройств
    if ('ontouchstart' in window) {
        elements.taskArea.querySelectorAll('.draggable-item').forEach(item => {
            item.style.width = '60px';
            item.style.height = '60px';
            item.style.fontSize = '2rem';
        });
        
        elements.taskArea.querySelectorAll('.drop-zone').forEach(zone => {
            zone.style.width = '70px';
            zone.style.height = '70px';
            zone.style.fontSize = '0.8rem';
            zone.style.padding = '5px';
        });
    }
    
    initializeDragAndDrop(task.goal);
}

function initializeDragAndDrop(goal) {
    const draggables = elements.taskArea.querySelectorAll('.draggable-item');
    const dropZones = elements.taskArea.querySelectorAll('.drop-zone');
    let draggedItem = null;
    let placedCount = 0;
    
    draggables.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            setTimeout(() => {
                this.style.opacity = '0.4';
            }, 0);
            
            // Устанавливаем данные для перетаскивания
            e.dataTransfer.setData('text/plain', this.dataset.index);
        });
        
        item.addEventListener('dragend', function() {
            this.style.opacity = '1';
            draggedItem = null;
        });
        
        // Поддержка сенсорных устройств
        item.addEventListener('touchstart', function(e) {
            draggedItem = this;
            this.style.opacity = '0.4';
            this.style.transform = 'scale(1.1)';
            e.preventDefault();
        });
        
        item.addEventListener('touchmove', function(e) {
            if (!draggedItem) return;
            
            const touch = e.touches[0];
            this.style.position = 'fixed';
            this.style.left = (touch.clientX - 30) + 'px';
            this.style.top = (touch.clientY - 30) + 'px';
            this.style.zIndex = '1000';
        });
        
        item.addEventListener('touchend', function() {
            if (!draggedItem) return;
            
            this.style.opacity = '1';
            this.style.transform = 'scale(1)';
            this.style.position = 'static';
            this.style.left = '';
            this.style.top = '';
            this.style.zIndex = '';
            
            // Проверяем, над какой зоной отпустили
            const touch = event.changedTouches[0];
            const elementsAtPoint = document.elementsFromPoint(touch.clientX, touch.clientY);
            
            let droppedOnZone = null;
            for (const element of elementsAtPoint) {
                if (element.classList.contains('drop-zone')) {
                    droppedOnZone = element;
                    break;
                }
            }
            
            if (droppedOnZone && !droppedOnZone.querySelector('.draggable-item')) {
                this.style.position = 'static';
                this.style.margin = '0';
                droppedOnZone.appendChild(this);
                this.draggable = false;
                placedCount++;
                
                document.getElementById('dragCount').textContent = placedCount;
                
                if (placedCount >= goal) {
                    elements.checkTaskBtn.disabled = false;
                    elements.taskResult.textContent = '✅ Отлично! Все деревья посажены!';
                    elements.taskResult.style.color = '#2ecc71';
                }
            }
            
            draggedItem = null;
        });
    });
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('hover');
        });
        
        zone.addEventListener('dragleave', function() {
            this.classList.remove('hover');
        });
        
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('hover');
            
            if (draggedItem && !this.querySelector('.draggable-item')) {
                this.appendChild(draggedItem);
                draggedItem.style.position = 'static';
                draggedItem.style.margin = '0';
                draggedItem.draggable = false;
                placedCount++;
                
                document.getElementById('dragCount').textContent = placedCount;
                
                if (placedCount >= goal) {
                    elements.checkTaskBtn.disabled = false;
                    elements.taskResult.textContent = '✅ Отлично! Все деревья посажены!';
                    elements.taskResult.style.color = '#2ecc71';
                }
            }
        });
    });
}

// Добавлены новые функции для заданий (упрощенные версии для мобильных)
function createDragDropTask(task) {
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Перетащите предметы в правильные категории:</p>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0;">
            ${task.categories.map(category => 
                `<div style="flex: 1; min-width: 120px; border: 2px dashed #3498db; border-radius: 8px; padding: 10px; text-align: center;">
                    <strong>${category}</strong>
                    <div class="category-drop" style="min-height: 80px; margin-top: 10px;"></div>
                </div>`
            ).join('')}
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0;">
            ${task.items.map((item, index) => 
                `<div class="drag-item" draggable="true" style="padding: 15px; background: #3498db; border-radius: 8px; color: white; font-size: 1.5rem; cursor: grab;">${item}</div>`
            ).join('')}
        </div>
    `;
    
    // Простая инициализация для мобильных
    if ('ontouchstart' in window) {
        elements.taskArea.querySelectorAll('.drag-item').forEach(item => {
            item.style.padding = '20px';
            item.style.fontSize = '2rem';
        });
    }
    
    elements.checkTaskBtn.disabled = false;
}

function createMemoryPairsTask(task) {
    const items = [...task.items, ...task.items];
    const shuffled = items.sort(() => Math.random() - 0.5);
    
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Найдите все пары одинаковых символов:</p>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0;">
            ${shuffled.map((item, index) => 
                `<div class="memory-card" data-index="${index}" data-item="${item}" 
                     style="width: 60px; height: 60px; background: #3498db; border-radius: 8px; 
                            display: flex; align-items: center; justify-content: center; 
                            font-size: 1.5rem; cursor: pointer; user-select: none;">
                    <span class="card-back">?</span>
                    <span class="card-front" style="display: none;">${item}</span>
                </div>`
            ).join('')}
        </div>
    `;
    
    if ('ontouchstart' in window) {
        elements.taskArea.querySelectorAll('.memory-card').forEach(card => {
            card.style.width = '70px';
            card.style.height = '70px';
            card.style.fontSize = '2rem';
        });
    }
    
    elements.checkTaskBtn.disabled = false;
}

function createClickCleanupTask(task) {
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Кликните на все мусорные предметы:</p>
        <div style="position: relative; width: 100%; height: 200px; background: #e8f5e9; border-radius: 8px; margin: 15px 0;">
            ${Array.from({length: task.items}).map((_, i) => {
                const left = Math.random() * 80 + 10;
                const top = Math.random() * 70 + 10;
                const obj = task.objects[Math.floor(Math.random() * task.objects.length)];
                return `<div class="trash-item" style="position: absolute; left: ${left}%; top: ${top}%; 
                        font-size: 2rem; cursor: pointer; transform: rotate(${Math.random() * 30 - 15}deg);">${obj}</div>`;
            }).join('')}
        </div>
        <p>Найдено: <span id="clickCount">0</span>/${task.items}</p>
    `;
    
    elements.checkTaskBtn.disabled = false;
}

function createSequenceTask(task) {
    const shuffled = [...task.items].sort(() => Math.random() - 0.5);
    
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Расставьте знаки в правильном порядке:</p>
        <div class="sequence-container" style="display: flex; gap: 10px; margin: 15px 0; min-height: 100px;">
            ${task.correctOrder.map((_, i) => 
                `<div class="sequence-slot" data-index="${i}" 
                     style="width: 70px; height: 70px; border: 2px dashed #3498db; 
                            border-radius: 8px; display: flex; align-items: center; 
                            justify-content: center;"></div>`
            ).join('')}
        </div>
        <div style="display: flex; gap: 10px; margin: 15px 0; flex-wrap: wrap;">
            ${shuffled.map((item, i) => 
                `<div class="sequence-piece" draggable="true" data-item="${item}"
                     style="width: 70px; height: 70px; border: 2px solid #3498db; 
                            border-radius: 8px; display: flex; align-items: center; 
                            justify-content: center; font-size: 2rem; cursor: grab; 
                            background: white;">${item}</div>`
            ).join('')}
        </div>
    `;
    
    if ('ontouchstart' in window) {
        elements.taskArea.querySelectorAll('.sequence-piece, .sequence-slot').forEach(el => {
            el.style.width = '80px';
            el.style.height = '80px';
            el.style.fontSize = '2.5rem';
        });
    }
    
    elements.checkTaskBtn.disabled = false;
}

// ... (остальные функции заданий остаются похожими, но оптимизированными для мобильных)

function completeInteractiveTask() {
    if (!gameState.currentTask) return;
    
    let coinsEarned = 0;
    let expEarned = 0;
    
    switch(gameState.currentDifficulty) {
        case 'easy': 
            coinsEarned = 20; 
            expEarned = 1;
            break;
        case 'medium': 
            coinsEarned = 40; 
            expEarned = 3;
            break;
        case 'hard': 
            coinsEarned = 60; 
            expEarned = 5;
            break;
    }
    
    gameState.currentPlayer.coins += coinsEarned;
    gameState.currentPlayer.completedTasks += 1;
    gameState.currentPlayer.cleaningPoints += expEarned;
    
    const currentCityProgress = gameState.cityProgress[gameState.currentPlayer.city] || 0;
    const newProgress = Math.min(100, currentCityProgress + 10);
    updateCityProgress(gameState.currentPlayer.city, newProgress);
    
    if (gameState.currentPlayer.completedTasks >= 3 && gameState.currentPlayer.completedTasks % 3 === 0) {
        gameState.currentPlayer.level += 1;
        updatePlayerUI();
        addLogEntry(`🎉 Поздравляем! Вы повысили уровень до ${gameState.currentPlayer.level}!`);
        updateDifficultyButtons();
        showNotification(`🎉 Поздравляем! Вы достигли ${gameState.currentPlayer.level}-го уровня!`, 'success');
    }
    
    elements.interactiveTask.style.display = 'none';
    elements.noTaskMessage.style.display = 'block';
    elements.checkTaskBtn.disabled = true;
    elements.completeTaskBtn.disabled = true;
    gameState.taskInProgress = false;
    hasCurrentTask = false;
    
    elements.buildBtn.disabled = false;
    elements.rollDiceBtn.disabled = false;
    
    addLogEntry(`✅ Вы выполнили задание и получили ${coinsEarned} монет и ${expEarned} опыта!`);
    
    savePlayerState();
    showNotification(`✅ Задание выполнено! Вы получили ${coinsEarned} монет и ${expEarned} опыта!`, 'success');
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
elements.gameInfo.addEventListener('click', function(e) {
    if (e.target.tagName === 'H3' || e.target.classList.contains('toggle-icon')) {
        elements.gameInfo.classList.toggle('expanded');
    }
});

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

elements.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const room = document.getElementById('loginRoom').value.trim();
    
    if (username && room) {
        if (username.length < 2) {
            showNotification('Имя должно содержать至少 2 символа', 'error');
            return;
        }
        if (room.length < 1) {
            showNotification('Введите номер комнаты', 'error');
            return;
        }
        joinGame(username, room, false);
    } else {
        showNotification('Заполните все поля', 'error');
    }
});

elements.registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value.trim();
    const room = document.getElementById('registerRoom').value.trim();
    
    if (username && room) {
        if (username.length < 2) {
            showNotification('Имя должно содержать至少 2 символа', 'error');
            return;
        }
        if (room.length < 1) {
            showNotification('Введите номер комнаты', 'error');
            return;
        }
        joinGame(username, room, true);
    } else {
        showNotification('Заполните все поля', 'error');
    }
});

elements.rollDiceBtn.addEventListener('click', () => {
    if (gameState.gameOver || gameState.taskInProgress) return;
    
    if (hasCurrentTask) {
        showNotification('Сначала выполните текущее задание!', 'warning');
        return;
    }
    
    elements.diceValue.classList.add('rolling');
    elements.diceValue.querySelector('.dice-value').textContent = '?';
    elements.rollDiceBtn.disabled = true;
    elements.buildBtn.disabled = true;
    elements.moveBtn.disabled = true;
    
    setTimeout(() => {
        const value = Math.floor(Math.random() * 6) + 1;
        
        elements.diceValue.querySelector('.dice-value').textContent = value;
        elements.diceValue.classList.remove('rolling');
        
        gameState.currentPlayer.position += value;
        if (gameState.currentPlayer.position > 94) {
            gameState.currentPlayer.position = 94;
        }
        
        updatePlayerUI();
        updatePlayerCity();
        
        const randomTask = getRandomTask(gameState.currentDifficulty);
        gameState.currentTask = randomTask;
        hasCurrentTask = true;
        
        if (randomTask) {
            elements.currentTask.style.display = 'block';
            elements.taskDescription.textContent = randomTask.description;
            elements.noTaskMessage.style.display = 'none';
            elements.completeTaskBtn.disabled = false;
            
            elements.rollDiceBtn.disabled = true;
        }
        
        addLogEntry(`🎲 Вы бросили кубик и выпало: ${value}. Новое положение: ${gameState.currentPlayer.position}`);
        updatePlayerMarkers();
        
        socket.emit('dice_roll', {
            diceValue: value,
            newPosition: gameState.currentPlayer.position,
            task: randomTask
        });
        
        savePlayerState();
        
        if (gameState.currentPlayer) {
            setTimeout(() => {
                sendPlayerPositionToServer(
                    gameState.currentPlayer.position,
                    gameState.currentPlayer.city
                );
            }, 100);
        }
        
        showNotification(`🎲 Вы переместились на ${value} клеток! Получено новое задание.`, 'success');
        elements.buildBtn.disabled = true;
    }, 1200);
});

function updatePlayerCity() {
    const playerPosition = gameState.currentPlayer.position;
    let newCity = gameState.currentPlayer.city;
    
    for (const cityKey in gameData.cities) {
        if (gameData.cities[cityKey].cells.includes(playerPosition)) {
            newCity = cityKey;
            break;
        }
    }
    
    if (newCity !== gameState.currentPlayer.city) {
        const currentProgress = gameState.cityProgress[gameState.currentPlayer.city] || 0;
        const choiceKey = `${gameState.currentPlayer.city}_${newCity}`;
        
        if (currentProgress < 100 && !gameState.askedForChoice[choiceKey]) {
            showChoiceModal(newCity);
            gameState.askedForChoice[choiceKey] = true;
            return;
        }
        
        moveToCity(newCity);
    }
}

function moveToCity(cityKey) {
    gameState.currentPlayer.city = cityKey;
    updatePlayerUI();
    
    document.querySelectorAll('.city-card').forEach(card => {
        card.classList.remove('active');
        if (card.dataset.city === cityKey) {
            card.classList.add('active');
        }
    });
    
    addLogEntry(`🏙️ Вы прибыли в город: ${gameData.cities[cityKey].name}`);
    
    sendPlayerPositionToServer(gameState.currentPlayer.position, cityKey);
    
    // Проверяем возможность перемещения между городами
    checkCityMovement();
    
    savePlayerState();
    showNotification(`🏙️ Вы прибыли в ${gameData.cities[cityKey].name}!`, 'success');
    
    setTimeout(() => {
        showCityModal(cityKey);
    }, 500);
}

function checkCityMovement() {
    const currentCityKey = gameState.currentPlayer.city;
    const cityKeys = Object.keys(gameData.cities);
    const currentIndex = cityKeys.indexOf(currentCityKey);
    
    // Проверяем, можно ли перемещаться в другие города
    let canMoveToAny = false;
    
    for (let i = 0; i < cityKeys.length; i++) {
        if (i === currentIndex) continue;
        
        const cityKey = cityKeys[i];
        const cityProgress = gameState.cityProgress[cityKey] || 0;
        
        // Можно перемещаться в город, если:
        // 1. Это предыдущий город (уже был там)
        // 2. Это следующий город и текущий очищен на 100%
        // 3. Любой другой город, который уже был посещен и очищен
        if (i < currentIndex || (i === currentIndex + 1 && (gameState.cityProgress[currentCityKey] || 0) >= 100)) {
            canMoveToAny = true;
            break;
        }
    }
    
    if (canMoveToAny) {
        elements.moveBtn.disabled = false;
        elements.moveBtn.textContent = "🚶 Перейти в другой город";
    } else {
        elements.moveBtn.disabled = true;
        elements.moveBtn.textContent = "⏳ Завершите очищение города";
    }
}

elements.completeTaskBtn.addEventListener('click', () => {
    if (gameState.currentTask && !gameState.taskInProgress) {
        elements.currentTask.style.display = 'none';
        elements.interactiveTask.style.display = 'block';
        elements.completeTaskBtn.disabled = true;
        createInteractiveTask(gameState.currentTask);
        addLogEntry(`▶️ Вы начали выполнение задания: ${gameState.currentTask.description}`);
    } else if (gameState.taskInProgress) {
        showNotification('Задание уже выполняется!', 'warning');
    } else {
        showNotification('Сначала получите задание, бросив кубик!', 'warning');
    }
});

elements.checkTaskBtn.addEventListener('click', () => {
    if (gameState.taskInProgress) {
        completeInteractiveTask();
    } else {
        showNotification('Сначала начните выполнение задания!', 'warning');
    }
});

elements.difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('locked')) {
            const requiredLevel = gameData.difficultyRequirements[btn.id.replace('Btn', '')].level;
            showNotification(`Для этой сложности требуется ${requiredLevel}-й уровень!`, 'warning');
            return;
        }
        
        elements.difficultyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.currentDifficulty = btn.classList.contains('easy') ? 'easy' : 
                                    btn.classList.contains('medium') ? 'medium' : 'hard';
        addLogEntry(`⚙️ Установлена сложность: ${gameState.currentDifficulty}`);
    });
});

elements.sendMessageBtn.addEventListener('click', () => {
    const message = elements.chatInput.value.trim();
    if (message && gameState.currentPlayer) {
        if (message.length > 200) {
            showNotification('Сообщение слишком длинное (макс. 200 символов)', 'warning');
            return;
        }
        sendChatMessage(message);
        elements.chatInput.value = '';
    }
});

elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.sendMessageBtn.click();
    }
});

elements.inviteBtn.addEventListener('click', () => {
    const roomNumber = currentRoomId || gameState.roomId;
    if (roomNumber) {
        const inviteText = `🎮 *Присоединяйтесь к моей комнате в игре "Юный эколог"!*\n\n🔥 *НОМЕР КОМНАТЫ: ${roomNumber}* 🔥\n\n🌐 Игра доступна по адресу: ${window.location.origin}`;
        
        showNotification(`📩 Номер комнаты: ${roomNumber} скопирован!`, 'info');
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(inviteText).then(() => {
                showNotification('✅ Приглашение скопировано в буфер обмена!', 'success');
            }).catch(() => {
                const textArea = document.createElement('textarea');
                textArea.value = inviteText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            });
        }
    }
});

// Обработчик кнопки построить объект (прокрутка к строительству)
elements.buildBtn.addEventListener('click', () => {
    setTimeout(() => {
        elements.buildingsSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
        
        // Подсвечиваем раздел
        elements.buildingsSection.style.boxShadow = '0 0 20px rgba(78, 205, 196, 0.8)';
        elements.buildingsSection.style.transition = 'box-shadow 0.5s';
        setTimeout(() => {
            elements.buildingsSection.style.boxShadow = '';
        }, 2000);
    }, 100);
});

elements.cityModalCloseBtn.addEventListener('click', closeCityModal);
elements.cityModal.addEventListener('click', (e) => {
    if (e.target === elements.cityModal) closeCityModal();
});

elements.stayBtn.addEventListener('click', () => {
    closeChoiceModal();
    const currentCityData = gameData.cities[gameState.currentPlayer.city];
    const firstCell = currentCityData.cells[0];
    gameState.currentPlayer.position = firstCell;
    updatePlayerUI();
    updatePlayerMarkers();
    
    addLogEntry(`⏪ Вы остались в ${currentCityData.name} и вернулись в начало города.`);
    
    sendPlayerPositionToServer(gameState.currentPlayer.position, gameState.currentPlayer.city);
    
    savePlayerState();
    showNotification(`⏪ Вы остались в ${currentCityData.name}!`, 'info');
});

elements.moveForwardBtn.addEventListener('click', () => {
    closeChoiceModal();
    moveToCity(gameState.nextCity);
});

elements.choiceModal.addEventListener('click', (e) => {
    if (e.target === elements.choiceModal) closeChoiceModal();
});

elements.moveBtn.addEventListener('click', () => {
    if (gameState.gameOver) return;
    
    // Показываем список доступных для перемещения городов
    const cityKeys = Object.keys(gameData.cities);
    const currentCityKey = gameState.currentPlayer.city;
    const currentIndex = cityKeys.indexOf(currentCityKey);
    
    let availableCities = [];
    
    // Можно перемещаться в:
    // 1. Все предыдущие города (уже были там)
    // 2. Следующий город, если текущий очищен на 100%
    for (let i = 0; i < cityKeys.length; i++) {
        const cityKey = cityKeys[i];
        
        if (i === currentIndex) continue; // Текущий город пропускаем
        
        const cityProgress = gameState.cityProgress[cityKey] || 0;
        const currentCityProgress = gameState.cityProgress[currentCityKey] || 0;
        
        if (i < currentIndex) {
            // Предыдущие города - всегда доступны
            availableCities.push({
                key: cityKey,
                name: gameData.cities[cityKey].name,
                progress: cityProgress
            });
        } else if (i === currentIndex + 1 && currentCityProgress >= 100) {
            // Следующий город - только если текущий очищен
            availableCities.push({
                key: cityKey,
                name: gameData.cities[cityKey].name,
                progress: cityProgress
            });
        }
    }
    
    if (availableCities.length === 0) {
        showNotification('Нет доступных городов для перемещения!', 'warning');
        return;
    }
    
    // Создаем модальное окно для выбора города
    const modalHTML = `
        <div class="choice-modal active">
            <div class="choice-modal-content">
                <div class="choice-modal-header">
                    <h2 class="choice-modal-title">Выберите город для перемещения</h2>
                </div>
                <div class="choice-modal-body">
                    <p>Доступные города:</p>
                    <div class="cities-selection" style="margin: 15px 0;">
                        ${availableCities.map(city => `
                            <div class="city-select-option" data-city="${city.key}" 
                                 style="padding: 12px; margin: 8px 0; background: rgba(255,255,255,0.1); 
                                        border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                                <div style="font-weight: bold;">${city.name}</div>
                                <div style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">
                                    Прогресс очищения: ${city.progress}%
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="choice-modal-actions">
                    <button class="game-btn" id="cancelMoveBtn">Отмена</button>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Обработчики для выбора города
    modalContainer.querySelectorAll('.city-select-option').forEach(option => {
        option.addEventListener('click', function() {
            const selectedCity = this.dataset.city;
            const cityPosition = gameData.cities[selectedCity].cells[0];
            
            gameState.currentPlayer.position = cityPosition;
            moveToCity(selectedCity);
            
            modalContainer.remove();
        });
    });
    
    // Кнопка отмены
    modalContainer.querySelector('#cancelMoveBtn').addEventListener('click', () => {
        modalContainer.remove();
    });
    
    // Закрытие по клику вне модального окна
    modalContainer.querySelector('.choice-modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('choice-modal')) {
            modalContainer.remove();
        }
    });
});

// ==================== ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ ====================
setInterval(() => {
    if (socket.connected && gameState.currentPlayer) {
        sendPlayerPositionToServer(
            gameState.currentPlayer.position,
            gameState.currentPlayer.city
        );
        
        if (Math.random() < 0.25) {
            requestAllPlayersPositions();
        }
    }
}, 30000);

window.addEventListener('focus', () => {
    if (socket.connected) {
        setTimeout(() => {
            requestAllPlayersPositions();
        }, 500);
    }
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && socket.connected) {
        setTimeout(() => {
            requestAllPlayersPositions();
        }, 1000);
    }
});

window.addEventListener('beforeunload', () => {
    if (isConnected && gameState.currentPlayer) {
        gameState.currentPlayer.connected = false;
        savePlayerState();
        savePlayerStateToStorage();
    }
});

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ====================
document.addEventListener('DOMContentLoaded', () => {
    updateConnectionStatus('connecting', '🔄 Подключение к серверу...');
    console.log('🎮 Игра "Юный эколог" загружена и готова!');
    
    // Обновляем заголовок игровой карты
    const gameBoardTitle = document.querySelector('.game-board h2');
    if (gameBoardTitle) {
        gameBoardTitle.textContent = 'Игровая карта';
        gameBoardTitle.style.textAlign = 'center';
    }
    
    // Обновляем информацию об игре (убираем английские слова)
    const gameInfoContent = document.querySelector('.game-info-content');
    if (gameInfoContent) {
        const paragraphs = gameInfoContent.querySelectorAll('p');
        paragraphs.forEach(p => {
            p.textContent = p.textContent
                .replace(/Особенности игры:/g, 'Особенности игры:')
                .replace(/Как играть:/g, 'Как играть:')
                .replace(/Присоединяйтесь/g, 'Присоединяйтесь');
        });
        
        const lists = gameInfoContent.querySelectorAll('li');
        lists.forEach(li => {
            li.textContent = li.textContent
                .replace(/Реалистичная карта/g, 'Реалистичная карта')
                .replace(/Разнообразные интерактивные/g, 'Разнообразные интерактивные')
                .replace(/Многопользовательский режим/g, 'Многопользовательский режим')
                .replace(/Система уровней/g, 'Система уровней')
                .replace(/Полностью рабочие задания/g, 'Полностью рабочие задания');
        });
    }
    
    // Добавляем плашку с монетами и уровнем
    const header = document.querySelector('header');
    if (header && !document.getElementById('quickStatsHeader')) {
        const quickStats = document.createElement('div');
        quickStats.id = 'quickStatsHeader';
        quickStats.style.cssText = `
            position: absolute;
            top: 20px;
            left: 20px;
            display: flex;
            gap: 15px;
            background: rgba(0,0,0,0.7);
            padding: 10px 20px;
            border-radius: 25px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            z-index: 100;
        `;
        
        quickStats.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: gold; font-size: 1.2rem;">💰</span>
                <span style="font-weight: bold;" id="headerCoins">100</span>
                <span style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">монет</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #4ecdc4; font-size: 1.2rem;">⭐</span>
                <span style="font-weight: bold;" id="headerLevel">1</span>
                <span style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">ур.</span>
            </div>
        `;
        
        header.style.position = 'relative';
        header.appendChild(quickStats);
        
        // Функция обновления плашки
        function updateHeaderStats() {
            if (gameState.currentPlayer) {
                document.getElementById('headerCoins').textContent = gameState.currentPlayer.coins;
                document.getElementById('headerLevel').textContent = gameState.currentPlayer.level;
            }
        }
        
        // Периодическое обновление
        setInterval(updateHeaderStats, 1000);
    }
    
    // Тестирование подключения
    setTimeout(() => {
        if (!isConnected) {
            showNotification('Не удалось подключиться к серверу. Проверьте запущен ли server.js', 'error');
            updateConnectionStatus('error', '❌ Нет подключения');
        }
    }, 5000);
});

console.log('🎮 Игра "Юный эколог" полностью загружена!');
