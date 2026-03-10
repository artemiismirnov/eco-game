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
    resourcesPlaceholder: document.getElementById('resourcesPlaceholder'),
    topCoinsCount: document.getElementById('topCoinsCount'),
    topPlayerLevel: document.getElementById('topPlayerLevel')
};

// ==================== КНОПКИ БЫСТРЫХ ДЕЙСТВИЙ ====================
const quickActionsBtn = document.getElementById('quickActionsBtn');
const quickActions = document.getElementById('quickActions');
const quickDiceBtn = document.getElementById('quickDiceBtn');
const quickBuildBtn = document.getElementById('quickBuildBtn');
const quickChatBtn = document.getElementById('quickChatBtn');
const quickTasksBtn = document.getElementById('quickTasksBtn');
const quickInviteBtn = document.getElementById('quickInviteBtn');

// ==================== ИГРОВЫЕ ДАННЫЕ ====================
const gameData = {
    cities: {
        tver: { 
            name: "Тверь", 
            cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],  // Изменено с 1-13 на 2-13
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
            cells: [81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92],  // Изменено с 81-93 на 81-92
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
                description: "Найдите 3 отличия на картинках 🔍",
                type: "spot_difference",
                differences: 3,
                image1: "🌳🏠🚗🌲🌼",
                image2: "🌳🏠🚙🌲🌼"
            },
            {
                description: "Соберите мусор в парке 🧹",
                type: "clean",
                goal: 4,
                items: ["🗑️", "🗑️", "🗑️", "🗑️", "🌿", "🌿", "🌿"]
            },
            {
                description: "Что такое переработка отходов? ♻️",
                type: "quiz",
                question: "Что такое переработка отходов?",
                options: [
                    {text: "Повторное использование материалов", correct: true},
                    {text: "Сжигание мусора", correct: false},
                    {text: "Закапывание отходов", correct: false},
                    {text: "Вывоз мусора на свалку", correct: false}
                ]
            },
            {
                description: "Разделите отходы по категориям 📦",
                type: "sort",
                items: [
                    {name: "Органика", type: "organic", emoji: "🍎"},
                    {name: "Металл", type: "metal", emoji: "🥫"},
                    {name: "Текстиль", type: "textile", emoji: "👕"},
                    {name: "Опасные", type: "hazardous", emoji: "☢️"}
                ]
            },
            {
                description: "Как экономить воду? 💧",
                type: "quiz",
                question: "Какой способ помогает экономить воду?",
                options: [
                    {text: "Принимать душ вместо ванны", correct: true},
                    {text: "Оставлять воду течь при чистке зубов", correct: false},
                    {text: "Поливать растения днем", correct: false},
                    {text: "Мыть машину ежедневно", correct: false}
                ]
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
                description: "Посадите лес из 6 деревьев 🌲",
                type: "drag",
                goal: 6,
                items: ["🌲", "🌲", "🌲", "🌲", "🌲", "🌲", "🌳", "🌳"],
                zones: 6
            },
            {
                description: "Сортируйте опасные отходы ⚠️",
                type: "sort",
                items: [
                    {name: "Батарейки", type: "battery", emoji: "🔋"},
                    {name: "Лампочки", type: "lamp", emoji: "💡"},
                    {name: "Лекарства", type: "medicine", emoji: "💊"},
                    {name: "Химикаты", type: "chemical", emoji: "🧪"}
                ]
            },
            {
                description: "Найдите 4 отличия на картинках природы 🏞️",
                type: "spot_difference",
                differences: 4,
                image1: "🌳🌲🏞️🌼🦌",
                image2: "🌳🌲🏞️🌸🦌"
            },
            {
                description: "Создайте пищевую цепь 🐟",
                type: "sequence",
                items: ["🌿", "🐛", "🐦", "🦊"],
                correctOrder: ["🌿", "🐛", "🐦", "🦊"]
            },
            {
                description: "Что такое биоразнообразие? 🦋",
                type: "quiz",
                question: "Что означает биоразнообразие?",
                options: [
                    {text: "Разнообразие живых организмов в экосистеме", correct: true},
                    {text: "Количество заводов в регионе", correct: false},
                    {text: "Разнообразие автомобилей", correct: false},
                    {text: "Количество жителей в городе", correct: false}
                ]
            }
        ],
        hard: [
            {
                description: "Что такое углеродный след? 👣",
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
                description: "Соберите сложный экологический пазл 🧩",
                type: "puzzle",
                pieces: 9,
                image: "🌍♻️🌳💧🌞🌱🌀🌊🦋"
            },
            {
                description: "Что такое возобновляемая энергия? ⚡",
                type: "quiz",
                question: "Что такое возобновляемая энергия?",
                options: [
                    {text: "Энергия из неиссякаемых источников (солнце, ветер, вода)", correct: true},
                    {text: "Энергия из угля и нефти", correct: false},
                    {text: "Атомная энергия", correct: false},
                    {text: "Энергия из газа", correct: false}
                ]
            },
            {
                description: "Очистите океан от мусора 🌊",
                type: "clean",
                goal: 8,
                items: ["🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🐠", "🐟", "🐡"]
            },
            {
                description: "Создайте экосистему из 8 элементов 🏞️",
                type: "drag",
                goal: 8,
                items: ["🌱", "🌳", "💧", "☀️", "🦋", "🐝", "🐞", "🦔", "🌼", "🍄"],
                zones: 8
            },
            {
                description: "Расставьте стадии переработки ♻️",
                type: "sequence",
                items: ["🗑️", "🚚", "🏭", "🔄", "📦"],
                correctOrder: ["🗑️", "🚚", "🏭", "🔄", "📦"]
            },
            {
                description: "Что такое деградация почв? 🌵",
                type: "quiz",
                question: "Что вызывает деградацию почв?",
                options: [
                    {text: "Вырубка лесов и эрозия", correct: true},
                    {text: "Посадка деревьев", correct: false},
                    {text: "Использование удобрений", correct: false},
                    {text: "Строительство парков", correct: false}
                ]
            }
        ]
    },
    buildings: [
        {
            name: "Станция переработки",
            cost: 50,
            points: 100,
            description: "Перерабатывает мусор и уменьшает загрязнение"
        },
        {
            name: "Солнечная электростанция",
            cost: 100,
            points: 200,
            description: "Производит чистую энергию из солнечного света"
        },
        {
            name: "Эко-парк",
            cost: 150,
            points: 300,
            description: "Создает зеленую зону для отдыха и очистки воздуха"
        },
        {
            name: "Ветряная мельница",
            cost: 200,
            points: 400,
            description: "Производит энергию из ветра"
        },
        {
            name: "Очистные сооружения",
            cost: 250,
            points: 500,
            description: "Очищает воду от загрязнений"
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
    reconnected: false
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
    
    // Если мы переподключились, сообщаем серверу
    if (gameState.currentPlayerId && gameState.reconnected) {
        socket.emit('player_reconnected');
        console.log('🔄 Уведомили сервер о восстановлении соединения');
    }
    
    // Запрашиваем позиции всех игроков при подключении
    setTimeout(() => {
        requestAllPlayersPositions();
    }, 2000);
});

socket.on('disconnect', () => {
    console.log('❌ Отключено от сервера');
    isConnected = false;
    updateConnectionStatus('error', '❌ Не подключено к серверу');
    gameState.reconnected = true;
    showNotification('Потеряно соединение с сервером', 'error');
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
    gameState.reconnected = playerData.reconnected || false;
    initializeGame(playerData);
    
    // Запрашиваем позиции всех игроков после присоединения к комнате
    setTimeout(() => {
        requestAllPlayersPositions();
    }, 1500);
});

socket.on('room-error', (message) => {
    const errorMsg = typeof message === 'object' ? message.message : message;
    showNotification(errorMsg || 'Комнаты с таким номером не существует', 'error');
    elements.authSection.style.display = 'block';
    elements.gameContent.style.display = 'none';
    elements.resourcesPlaceholder.style.display = 'none';
    quickActionsBtn.classList.remove('show');
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
    
    addLogEntry(`🎉 Игрок "${data.player.name}" присоединился к игре!`);
    
    setTimeout(() => {
        requestAllPlayersPositions();
    }, 1000);
});

socket.on('player_reconnected', (data) => {
    console.log('🔄 Игрок восстановил соединение:', data.playerName);
    if (gameState.players[data.playerId]) {
        gameState.players[data.playerId].connected = true;
    }
    updatePlayersList();
    updatePlayerMarkers();
    
    addLogEntry(`🔌 Игрок "${data.playerName}" восстановил соединение`);
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
            const positionSpan = item.querySelector('.player-position-badge');
            if (positionSpan) {
                positionSpan.textContent = `поз. ${position}`;
            } else {
                const posElement = document.createElement('span');
                posElement.className = 'player-position-badge';
                posElement.textContent = `поз. ${position}`;
                item.querySelector('span').appendChild(posElement);
            }
        }
    });
    
    if (!found) {
        updatePlayersList();
    }
}

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
    elements.resourcesPlaceholder.style.display = 'flex';
    updatePlayerUI();
    elements.roomNumber.textContent = currentRoomId || gameState.roomId;
    
    createMap();
    createCitiesGrid();
    createBuildingsList();
    updateDifficultyButtons();
    
    initializeQuickActions();
    
    addLogEntry(`🎮 Добро пожаловать в игру, ${playerData.name}!`);
    
    setTimeout(() => {
        showCityModal(gameState.currentPlayer.city);
    }, 1000);
    
    socket.emit('get_room_state');
    
    if (gameState.reconnected) {
        showNotification('✅ Соединение восстановлено! Вы можете продолжать игру.', 'success');
        elements.rollDiceBtn.disabled = false;
        elements.buildBtn.disabled = false;
    }
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
    const forestCells = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92];
    
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.className = 'map-cell hexagon';
            cell.style.position = 'relative';
            
            const cellNumber = row * 10 + col + 1;
            
            if (cellNumber > 100) {
                cell.classList.add('empty');
                cell.textContent = '';
                elements.mapGrid.appendChild(cell);
                continue;
            }
            
            const numberSpan = document.createElement('span');
            numberSpan.className = 'cell-number';
            numberSpan.textContent = cellNumber;
            numberSpan.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 10px; font-weight: bold; color: #333; z-index: 1;';
            
            if (cellNumber === 1) {
                cell.classList.add('start');
                cell.style.background = 'rgba(76, 175, 80, 0.8)';
                numberSpan.textContent = '1';
                numberSpan.style.color = 'white';
                numberSpan.style.fontSize = '10px';
                numberSpan.style.top = '70%';
                
                if (gameState.currentPlayer && !gameState.currentPlayer.position) {
                    gameState.currentPlayer.position = 1;
                    updatePlayerUI();
                }
            } else if (cellNumber === 100) {
                cell.classList.add('finish');
                cell.style.background = 'rgba(244, 67, 54, 0.8)';
                numberSpan.textContent = '100';
                numberSpan.style.color = 'white';
                numberSpan.style.fontSize = '10px';
                numberSpan.style.top = '70%';
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
                        numberSpan.style.top = '70%';
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
                <span class="player-position-badge">поз. ${player.position || 1}</span>
            </span>
            <span><strong>${player.cleaningPoints}</strong> баллов</span>
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
        
        // Обновляем верхний плейсхолдер
        elements.topCoinsCount.textContent = gameState.currentPlayer.coins;
        elements.topPlayerLevel.textContent = gameState.currentPlayer.level + ' ур.';
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
                
                if (gameState.currentPlayer.position >= 94 && gameState.currentPlayer.buildings.length >= 1) {
                    gameState.gameOver = true;
                    addLogEntry(`🎊 Поздравляем! Вы достигли Астрахани и построили объект! Игра завершена.`);
                    showNotification(`🎊 Поздравляем! Вы достигли Астрахани и построили объект! Игра завершена.`, 'success');
                }
                
                // Показываем уведомление о покупке
                showNotification(`✅ Успешно построено "${building.name}" за ${building.cost} монет!`, 'success');
                
                createBuildingsList();
            } else {
                showNotification(`❌ Недостаточно монет для постройки "${building.name}"! Нужно ${building.cost} монет.`, 'warning');
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
    
    quickActionsBtn.classList.add('show');
    
    quickActionsBtn.addEventListener('click', function() {
        quickActionsVisible = !quickActionsVisible;
        if (quickActionsVisible) {
            quickActions.classList.add('show');
            quickActionsBtn.classList.add('active');
        } else {
            quickActions.classList.remove('show');
            quickActionsBtn.classList.remove('active');
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
    
    quickDiceBtn.addEventListener('click', function() {
        quickActions.classList.remove('show');
        quickActionsBtn.classList.remove('active');
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
    
    quickBuildBtn.addEventListener('click', function() {
        quickActions.classList.remove('show');
        quickActionsBtn.classList.remove('active');
        quickActionsVisible = false;
        
        if (elements.buildBtn.disabled) {
            showNotification('Сначала выполните задание, чтобы построить объект!', 'warning');
            return;
        }
        
        setTimeout(() => {
            scrollToElement('buildingsSection');
            
            const buildBtnPosition = elements.buildBtn.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({
                top: buildBtnPosition - 100,
                behavior: 'smooth'
            });
            
            elements.buildBtn.focus();
        }, 100);
    });
    
    quickChatBtn.addEventListener('click', function() {
        quickActions.classList.remove('show');
        quickActionsBtn.classList.remove('active');
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
    
    quickTasksBtn.addEventListener('click', function() {
        quickActions.classList.remove('show');
        quickActionsBtn.classList.remove('active');
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
    
    quickInviteBtn.addEventListener('click', function() {
        quickActions.classList.remove('show');
        quickActionsBtn.classList.remove('active');
        quickActionsVisible = false;
        
        elements.inviteBtn.click();
    });
    
    document.addEventListener('click', function(event) {
        if (quickActionsVisible && 
            !quickActionsBtn.contains(event.target) && 
            !quickActions.contains(event.target)) {
            quickActions.classList.remove('show');
            quickActionsBtn.classList.remove('active');
            quickActionsVisible = false;
        }
    });
    
    function updateQuickButtons() {
        if (gameState.gameOver) {
            quickDiceBtn.style.opacity = '0.5';
            quickDiceBtn.style.cursor = 'not-allowed';
            quickDiceBtn.title = 'Игра завершена';
            quickBuildBtn.style.opacity = '0.5';
            quickBuildBtn.style.cursor = 'not-allowed';
            quickBuildBtn.title = 'Игра завершена';
        } else {
            quickDiceBtn.style.opacity = '1';
            quickDiceBtn.style.cursor = 'pointer';
            quickDiceBtn.title = 'Бросить кубик';
            
            if (hasCurrentTask || gameState.taskInProgress) {
                quickBuildBtn.style.opacity = '0.5';
                quickBuildBtn.style.cursor = 'not-allowed';
                quickBuildBtn.title = 'Сначала выполните задание';
            } else {
                quickBuildBtn.style.opacity = '1';
                quickBuildBtn.style.cursor = 'pointer';
                quickBuildBtn.title = 'Построить объект';
            }
        }
        
        if (elements.gameContent.style.display === 'block') {
            quickActionsBtn.style.display = 'flex';
        } else {
            quickActionsBtn.style.display = 'none';
        }
    }
    
    setInterval(updateQuickButtons, 1000);
    updateQuickButtons();
}

// ==================== ИНТЕРАКТИВНЫЕ ЗАДАНИЯ ====================
function getRandomTask(difficulty) {
    const availableTasks = gameData.tasks[difficulty];
    if (!availableTasks || availableTasks.length === 0) return null;
    
    if (gameState.usedTasks[difficulty].length >= availableTasks.length) {
        gameState.usedTasks[difficulty] = [];
    }
    
    let randomTask;
    let attempts = 0;
    do {
        randomTask = availableTasks[Math.floor(Math.random() * availableTasks.length)];
        attempts++;
    } while (gameState.usedTasks[difficulty].includes(randomTask.description) && attempts < 20);
    
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
    
    gameState.dragItems = [];
    gameState.dropZones = [];
    gameState.sortItems = [];
    gameState.sortBins = [];
    gameState.selectedPuzzlePieces = [];
    gameState.spotDifferencesFound = 0;
    gameState.cleanupItems = [];
    
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
    } else if (task.type === "spot_difference") {
        createSpotDifferenceTask(task);
    } else if (task.type === "puzzle_sequence") {
        createPuzzleSequenceTask(task);
    } else if (task.type === "sequence") {
        createSequenceTask(task);
    } else {
        createDefaultTask(task);
    }
    
    elements.checkTaskBtn.disabled = true;
    
    // Добавляем контейнер для прокрутки на мобильных устройствах
    if (window.innerWidth <= 768) {
        const dragContainers = elements.taskArea.querySelectorAll('.drag-items, .sort-items, .puzzle-pieces, .sequence-pieces');
        dragContainers.forEach(container => {
            container.parentNode.classList.add('drag-scroll-container');
            container.classList.add('drag-scroll-content');
        });
    }
}

function createQuizTask(task) {
    elements.taskArea.innerHTML = `
        <p><strong>${task.question}</strong></p>
        <div class="quiz-options">
            ${task.options.map((option, index) => 
                `<div class="quiz-option" data-index="${index}" data-correct="${option.correct}">
                    ${option.text}
                </div>`
            ).join('')}
        </div>
    `;
    
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
    });
}

function createDragTask(task) {
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Перетащите ${task.goal} предметов в специальные зоны:</p>
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
                        Зона ${index + 1}
                    </div>`
                ).join('')}
            </div>
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Перетащено: <span id="dragCount">0</span>/${task.goal}</p>
    `;
    
    initializeDragAndDrop(task.goal);
}

function initializeDragAndDrop(goal) {
    const draggables = elements.taskArea.querySelectorAll('.draggable-item');
    const dropZones = elements.taskArea.querySelectorAll('.drop-zone');
    let draggedItem = null;
    let placedCount = 0;
    
    // Функция для прокрутки при перетаскивании
    let scrollInterval;
    
    draggables.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            setTimeout(() => {
                this.style.opacity = '0.4';
            }, 0);
            
            // Начинаем прокрутку при перетаскивании
            scrollInterval = setInterval(() => {
                const rect = this.getBoundingClientRect();
                if (rect.top < 100) {
                    window.scrollBy(0, -10);
                } else if (rect.bottom > window.innerHeight - 100) {
                    window.scrollBy(0, 10);
                }
            }, 50);
        });
        
        item.addEventListener('dragend', function() {
            this.style.opacity = '1';
            clearInterval(scrollInterval);
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
            clearInterval(scrollInterval);
            this.classList.remove('hover');
            
            if (draggedItem && !this.querySelector('.draggable-item')) {
                this.appendChild(draggedItem);
                draggedItem.style.position = 'static';
                draggedItem.style.cursor = 'default';
                draggedItem.draggable = false;
                placedCount++;
                
                document.getElementById('dragCount').textContent = placedCount;
                
                if (placedCount >= goal) {
                    elements.checkTaskBtn.disabled = false;
                    elements.taskResult.textContent = '✅ Отлично! Все предметы размещены!';
                    elements.taskResult.style.color = '#2ecc71';
                }
            }
        });
    });
}

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
        showNotification(`Поздравляем! Вы достигли ${gameState.currentPlayer.level}-го уровня!`, 'success');
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
    
    updateQuickButtons();
}

function createSortTask(task) {
    const binTypes = {
        paper: { name: "Бумага", emoji: "📄", color: "#3498db" },
        plastic: { name: "Пластик", emoji: "🥤", color: "#e74c3c" },
        glass: { name: "Стекло", emoji: "🍶", color: "#2ecc71" },
        battery: { name: "Батарейки", emoji: "🔋", color: "#f39c12" },
        organic: { name: "Органика", emoji: "🍎", color: "#8e44ad" },
        metal: { name: "Металл", emoji: "🥫", color: "#95a5a6" },
        textile: { name: "Текстиль", emoji: "👕", color: "#e67e22" },
        hazardous: { name: "Опасные", emoji: "☢️", color: "#c0392b" },
        lamp: { name: "Лампочки", emoji: "💡", color: "#f1c40f" },
        medicine: { name: "Лекарства", emoji: "💊", color: "#9b59b6" },
        chemical: { name: "Химикаты", emoji: "🧪", color: "#1abc9c" }
    };
    
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Перетащите мусор в правильные контейнеры:</p>
        <div class="sorting-area">
            ${task.items.map((item, index) => {
                const binData = binTypes[item.type] || { name: item.name, emoji: item.emoji, color: "#3498db" };
                return `<div class="sort-bin" data-type="${item.type}">
                    <div class="bin-icon">${binData.emoji}</div>
                    <div class="bin-name">${binData.name}</div>
                    <div class="sort-bin-content"></div>
                </div>`;
            }).join('')}
        </div>
        <div class="sort-items">
            ${task.items.map((item, index) => 
                `<div class="sort-item" data-index="${index}" data-type="${item.type}" draggable="true">
                    <span class="item-emoji">${item.emoji}</span>
                    <span class="item-name">${item.name}</span>
                </div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Отсортировано: <span id="sortCount">0</span>/${task.items.length}</p>
    `;
    
    initializeSorting(task.items.length);
}

function initializeSorting(totalItems) {
    const sortItems = elements.taskArea.querySelectorAll('.sort-item');
    const sortBins = elements.taskArea.querySelectorAll('.sort-bin');
    let sortedCount = 0;
    
    sortItems.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.dataset.type);
        });
    });
    
    sortBins.forEach(bin => {
        bin.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        bin.addEventListener('drop', function(e) {
            e.preventDefault();
            const itemType = e.dataTransfer.getData('text/plain');
            const binType = this.dataset.type;
            
            if (itemType === binType) {
                const draggedItem = Array.from(sortItems).find(item => 
                    item.dataset.type === itemType && !item.dataset.placed
                );
                
                if (draggedItem) {
                    const binContent = this.querySelector('.sort-bin-content');
                    binContent.appendChild(draggedItem);
                    draggedItem.style.margin = '5px';
                    draggedItem.style.cursor = 'default';
                    draggedItem.draggable = false;
                    draggedItem.dataset.placed = 'true';
                    
                    sortedCount++;
                    document.getElementById('sortCount').textContent = sortedCount;
                    
                    if (sortedCount >= totalItems) {
                        elements.checkTaskBtn.disabled = false;
                        elements.taskResult.textContent = '✅ Отлично! Весь мусор отсортирован!';
                        elements.taskResult.style.color = '#2ecc71';
                    }
                }
            }
        });
    });
}

function createCleanupTask(task) {
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Кликните по мусору, чтобы очистить:</p>
        <div class="river-container">
            ${task.items.map((item, index) => {
                const left = Math.random() * 80 + 10;
                const top = Math.random() * 70 + 15;
                return `<div class="cleanup-item" data-index="${index}">${item}</div>`;
            }).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Очищено: <span id="cleanupCount">0</span>/${task.goal}</p>
    `;
    
    initializeCleanup(task.goal);
}

function initializeCleanup(goal) {
    const cleanupItems = elements.taskArea.querySelectorAll('.cleanup-item');
    let cleanedCount = 0;
    
    cleanupItems.forEach(item => {
        item.addEventListener('click', function() {
            if (!this.dataset.cleaned) {
                this.style.opacity = '0.3';
                this.style.transform = 'scale(0.8)';
                this.dataset.cleaned = 'true';
                
                cleanedCount++;
                document.getElementById('cleanupCount').textContent = cleanedCount;
                
                if (cleanedCount >= goal) {
                    elements.checkTaskBtn.disabled = false;
                    elements.taskResult.textContent = '✅ Отлично! Очистка завершена!';
                    elements.taskResult.style.color = '#2ecc71';
                }
            }
        });
    });
}

function createPuzzleTask(task) {
    const pieces = task.image.split('');
    const shuffledPieces = [...pieces].sort(() => Math.random() - 0.5);
    
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Соберите пазл в правильном порядке:</p>
        <div class="puzzle-target">
            ${pieces.map((piece, index) => 
                `<div class="puzzle-target-slot" data-index="${index}"></div>`
            ).join('')}
        </div>
        <div class="puzzle-pieces">
            ${shuffledPieces.map((piece, index) => 
                `<div class="puzzle-piece" data-piece="${piece}" draggable="true">${piece}</div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Собрано: <span id="puzzleCount">0</span>/${pieces.length}</p>
    `;
    
    initializePuzzle(pieces.length);
}

function createPuzzleSequenceTask(task) {
    const shuffledSequence = [...task.sequence].sort(() => Math.random() - 0.5);
    
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Расположите элементы в правильной последовательности:</p>
        <div class="sequence-target">
            ${task.correctOrder.map((_, index) => 
                `<div class="sequence-slot" data-index="${index}"></div>`
            ).join('')}
        </div>
        <div class="sequence-pieces">
            ${shuffledSequence.map((piece, index) => 
                `<div class="sequence-piece" data-piece="${piece}" draggable="true">${piece}</div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Правильно размещено: <span id="sequenceCount">0</span>/${task.correctOrder.length}</p>
    `;
    
    initializeSequence(task.correctOrder);
}

function createSequenceTask(task) {
    const shuffledSequence = [...task.items].sort(() => Math.random() - 0.5);
    
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Расставьте элементы в правильной последовательности:</p>
        <div class="sequence-target">
            ${task.correctOrder.map((_, index) => 
                `<div class="sequence-slot" data-index="${index}"></div>`
            ).join('')}
        </div>
        <div class="sequence-pieces">
            ${shuffledSequence.map((piece, index) => 
                `<div class="sequence-piece" data-piece="${piece}" draggable="true">${piece}</div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Правильно размещено: <span id="sequenceCount">0</span>/${task.correctOrder.length}</p>
    `;
    
    initializeSequence(task.correctOrder);
}

function createSpotDifferenceTask(task) {
    const differences = Array.from({length: task.differences}, (_, i) => i + 1);
    
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Найдите ${task.differences} отличия:</p>
        <div class="difference-container">
            <div class="difference-image">
                <div class="diff-image-content">${task.image1}</div>
                ${differences.map((_, index) => {
                    const left = Math.random() * 70 + 15;
                    const top = Math.random() * 60 + 20;
                    return `<div class="difference-spot" data-index="${index}" style="left: ${left}%; top: ${top}%;"></div>`;
                }).join('')}
            </div>
            <div class="difference-image">
                <div class="diff-image-content">${task.image2}</div>
            </div>
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Найдено отличий: <span id="differenceCount">0</span>/${task.differences}</p>
        <button class="game-btn small" id="showDifferencesBtn">Показать отличия</button>
    `;
    
    initializeSpotDifference(task.differences);
}

function createDefaultTask(task) {
    elements.taskArea.innerHTML = `
        <p>Задание "${task.description}"</p>
        <p>Для демонстрации нажмите кнопку "Проверить выполнение"</p>
        <div class="demo-task-area">
            <p><strong>Демонстрация задания:</strong></p>
            <p>Здесь будет интерактивная часть задания</p>
        </div>
    `;
    elements.checkTaskBtn.disabled = false;
}

function initializePuzzle(totalPieces) {
    const puzzlePieces = elements.taskArea.querySelectorAll('.puzzle-piece');
    const puzzleSlots = elements.taskArea.querySelectorAll('.puzzle-target-slot');
    let placedCount = 0;
    
    puzzlePieces.forEach(piece => {
        piece.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.dataset.piece);
        });
    });
    
    puzzleSlots.forEach(slot => {
        slot.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        slot.addEventListener('drop', function(e) {
            e.preventDefault();
            const piece = e.dataTransfer.getData('text/plain');
            
            if (!this.hasChildNodes()) {
                const pieceElement = Array.from(puzzlePieces).find(p => 
                    p.dataset.piece === piece && !p.dataset.placed
                );
                
                if (pieceElement) {
                    this.appendChild(pieceElement);
                    pieceElement.style.position = 'static';
                    pieceElement.style.cursor = 'default';
                    pieceElement.draggable = false;
                    pieceElement.dataset.placed = 'true';
                    
                    placedCount++;
                    document.getElementById('puzzleCount').textContent = placedCount;
                    
                    if (placedCount >= totalPieces) {
                        elements.checkTaskBtn.disabled = false;
                        elements.taskResult.textContent = '✅ Отлично! Пазл собран!';
                        elements.taskResult.style.color = '#2ecc71';
                    }
                }
            }
        });
    });
}

function initializeSequence(correctOrder) {
    const sequencePieces = elements.taskArea.querySelectorAll('.sequence-piece');
    const sequenceSlots = elements.taskArea.querySelectorAll('.sequence-slot');
    let placedCount = 0;
    
    sequencePieces.forEach(piece => {
        piece.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.dataset.piece);
        });
    });
    
    sequenceSlots.forEach((slot, slotIndex) => {
        slot.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        slot.addEventListener('drop', function(e) {
            e.preventDefault();
            const piece = e.dataTransfer.getData('text/plain');
            const expectedPiece = correctOrder[slotIndex];
            
            if (!this.hasChildNodes() && piece === expectedPiece) {
                const pieceElement = Array.from(sequencePieces).find(p => 
                    p.dataset.piece === piece && !p.dataset.placed
                );
                
                if (pieceElement) {
                    this.appendChild(pieceElement);
                    pieceElement.style.position = 'static';
                    pieceElement.style.cursor = 'default';
                    pieceElement.draggable = false;
                    pieceElement.dataset.placed = 'true';
                    
                    placedCount++;
                    document.getElementById('sequenceCount').textContent = placedCount;
                    
                    if (placedCount >= correctOrder.length) {
                        elements.checkTaskBtn.disabled = false;
                        elements.taskResult.textContent = '✅ Отлично! Последовательность верная!';
                        elements.taskResult.style.color = '#2ecc71';
                    }
                }
            }
        });
    });
}

function initializeSpotDifference(totalDifferences) {
    const differenceSpots = elements.taskArea.querySelectorAll('.difference-spot');
    let foundCount = 0;
    
    differenceSpots.forEach(spot => {
        spot.addEventListener('click', function() {
            if (!this.dataset.found) {
                this.style.background = 'rgba(46, 204, 113, 0.7)';
                this.dataset.found = 'true';
                
                foundCount++;
                document.getElementById('differenceCount').textContent = foundCount;
                
                if (foundCount >= totalDifferences) {
                    elements.checkTaskBtn.disabled = false;
                    elements.taskResult.textContent = '✅ Отлично! Все отличия найдены!';
                    elements.taskResult.style.color = '#2ecc71';
                }
            }
        });
    });
    
    const showDiffBtn = elements.taskArea.querySelector('#showDifferencesBtn');
    if (showDiffBtn) {
        showDiffBtn.addEventListener('click', function() {
            differenceSpots.forEach(spot => {
                spot.style.display = 'block';
            });
            this.disabled = true;
        });
    }
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

// Кнопка "Построить объект" - прокрутка к зданиям
elements.buildBtn.addEventListener('click', () => {
    if (gameState.currentPlayer && gameState.currentPlayer.city) {
        // Прокручиваем к секции зданий
        const buildingsSection = document.getElementById('buildingsSection');
        if (buildingsSection) {
            buildingsSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
            });
            
            // Добавляем эффект выделения
            buildingsSection.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
            buildingsSection.style.transition = 'box-shadow 0.5s';
            setTimeout(() => {
                buildingsSection.style.boxShadow = '';
            }, 2000);
        }
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
        if (gameState.currentPlayer.position > 100) {
            gameState.currentPlayer.position = 100;
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
    
    if (gameState.cityProgress[cityKey] >= 100) {
        elements.moveBtn.disabled = false;
        elements.moveBtn.textContent = "🚗 Перейти в следующий город";
    } else {
        elements.moveBtn.disabled = true;
        elements.moveBtn.textContent = "Завершите очищение города";
    }
    
    savePlayerState();
    showNotification(`🏙️ Вы прибыли в ${gameData.cities[cityKey].name}!`, 'success');
    
    setTimeout(() => {
        showCityModal(cityKey);
    }, 500);
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
        const inviteText = `🎮 Присоединяйтесь к моей комнате в игре "Юный эколог"!\n\n🔢 **Номер комнаты: ${roomNumber}**\n\n🌐 Игра доступна по адресу:\n${window.location.origin}\n\n👥 Ждем вас!`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(inviteText).then(() => {
                showNotification('✅ Приглашение скопировано в буфер обмена! Номер комнаты выделен жирным.', 'success');
            }).catch(() => {
                const textArea = document.createElement('textarea');
                textArea.value = inviteText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showNotification('✅ Приглашение скопировано в буфер обмена! Номер комнаты выделен жирным.', 'success');
            });
        }
    }
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
    
    addLogEntry(`⏮️ Вы остались в ${currentCityData.name} и вернулись в начало города.`);
    
    sendPlayerPositionToServer(gameState.currentPlayer.position, gameState.currentPlayer.city);
    
    savePlayerState();
    showNotification(`⏮️ Вы остались в ${currentCityData.name}!`, 'info');
});

elements.moveForwardBtn.addEventListener('click', () => {
    closeChoiceModal();
    moveToCity(gameState.nextCity);
});

elements.choiceModal.addEventListener('click', (e) => {
    if (e.target === elements.choiceModal) closeChoiceModal();
});

// Кнопка для перемещения между уже пройденными городами
elements.moveBtn.addEventListener('click', function() {
    if (gameState.gameOver) return;
    
    const currentCityKey = gameState.currentPlayer.city;
    if (gameState.cityProgress[currentCityKey] < 100) {
        showNotification(`❌ Необходимо достичь 100% прогресса очищения в ${gameData.cities[currentCityKey].name} для перехода!`, 'warning');
        return;
    }
    
    const cityKeys = Object.keys(gameData.cities);
    const currentIndex = cityKeys.indexOf(currentCityKey);
    
    if (currentIndex < cityKeys.length - 1) {
        const nextCity = cityKeys[currentIndex + 1];
        const nextPosition = gameData.cities[nextCity].cells[0];
        gameState.currentPlayer.position = nextPosition;
        moveToCity(nextCity);
        
        if (nextCity === "astrakhan") {
            addLogEntry(`🏁 Вы достигли Астрахани! Постройте объект, чтобы завершить игру.`);
            showNotification(`🏁 Вы достигли Астрахани! Постройте объект, чтобы завершить игру.`, 'success');
        }
    }
});

// Функция для перемещения между уже пройденными городами
window.moveToExistingCity = function(cityKey) {
    const cityMenu = document.querySelector('div[style*="position: fixed; top: 0; left: 0; width: 100%"]');
    if (cityMenu) cityMenu.remove();
    
    if (gameState.cityProgress[cityKey] >= 100) {
        socket.emit('move_to_city', { cityKey: cityKey });
        showNotification(`🚗 Вы переместились в ${gameData.cities[cityKey].name}!`, 'success');
        addLogEntry(`🚗 Вы переместились в ${gameData.cities[cityKey].name}`);
    } else {
        showNotification(`❌ Этот город еще не полностью очищен!`, 'warning');
    }
};

// Обновление кнопки перемещения между городами
elements.buildBtn.addEventListener('click', function() {
    if (gameState.currentPlayer && gameState.currentPlayer.city) {
        const currentCityKey = gameState.currentPlayer.city;
        const cityKeys = Object.keys(gameData.cities);
        const currentIndex = cityKeys.indexOf(currentCityKey);
        
        if (currentIndex > 0) {
            // Показываем меню выбора города
            const cityMenu = document.createElement('div');
            cityMenu.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center;';
            cityMenu.innerHTML = `
                <div style="background: var(--card-bg); padding: 30px; border-radius: 15px; max-width: 500px; width: 90%;">
                    <h3 style="text-align: center; margin-bottom: 20px;">Переместиться в другой город</h3>
                    <p style="margin-bottom: 20px;">Выберите город для перемещения (только уже пройденные):</p>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
                        ${cityKeys.slice(0, currentIndex).map(cityKey => {
                            const city = gameData.cities[cityKey];
                            const progress = gameState.cityProgress[cityKey] || 0;
                            return `
                                <button class="game-btn" onclick="moveToExistingCity('${cityKey}')" style="text-align: left;">
                                    <div>${city.name}</div>
                                    <div style="font-size: 0.8rem; opacity: 0.8;">Прогресс: ${progress}%</div>
                                </button>
                            `;
                        }).join('')}
                    </div>
                    <button class="game-btn" onclick="this.parentElement.parentElement.remove()" style="width: 100%;">Отмена</button>
                </div>
            `;
            
            document.body.appendChild(cityMenu);
        }
    }
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
    }
});

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ====================
document.addEventListener('DOMContentLoaded', () => {
    updateConnectionStatus('connecting', '🔄 Подключение к серверу...');
    console.log('🎮 Игра "Юный эколог" загружена и готова!');
    
    elements.buildBtn.disabled = false;
    
    setTimeout(() => {
        if (!isConnected) {
            showNotification('Не удалось подключиться к серверу. Проверьте запущен ли server.js', 'error');
            updateConnectionStatus('error', '❌ Нет подключения');
        }
    }, 5000);
});

console.log('🎮 Игра "Юный эколог" полностью загружена!');


