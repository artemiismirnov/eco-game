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
let playerReconnectData = null; // Для восстановления игрока при переподключении

// Сохраняем данные игрока в localStorage для восстановления
function savePlayerLocalData(username, roomId) {
    if (typeof Storage !== 'undefined') {
        localStorage.setItem('eco_game_player', JSON.stringify({
            username: username,
            roomId: roomId,
            timestamp: Date.now()
        }));
    }
}

// Получаем сохраненные данные игрока
function getPlayerLocalData() {
    if (typeof Storage !== 'undefined') {
        const data = localStorage.getItem('eco_game_player');
        return data ? JSON.parse(data) : null;
    }
    return null;
}

// Минималистичный статус подключения - маленькая точка в углу
function updateConnectionStatus(status, text) {
    const statusDot = document.getElementById('connectionStatusDot');
    const statusText = document.getElementById('connectionStatusText');
    
    if (statusDot) {
        statusDot.className = 'connection-dot';
        if (status === 'connected') {
            statusDot.classList.add('connected');
            statusText.textContent = 'Подключено';
        } else if (status === 'connecting') {
            statusDot.classList.add('connecting');
            statusText.textContent = 'Подключение...';
        } else if (status === 'error') {
            statusDot.classList.add('error');
            statusText.textContent = 'Ошибка';
        }
    }
    console.log(`Connection: ${status} - ${text}`);
}

// Обработчики событий Socket.io
socket.on('connect', () => {
    console.log('✅ Подключено к серверу');
    isConnected = true;
    updateConnectionStatus('connected', '✅ Подключено к серверу');
    showNotification('Успешно подключено к игровому серверу', 'success');
    
    // При переподключении пытаемся восстановить игрока
    if (playerReconnectData) {
        console.log('🔄 Попытка восстановления игрока после переподключения');
        setTimeout(() => {
            joinGame(playerReconnectData.username, playerReconnectData.roomId, false);
        }, 1000);
    }
});

socket.on('disconnect', () => {
    console.log('❌ Отключено от сервера');
    isConnected = false;
    updateConnectionStatus('error', '❌ Не подключено к серверу');
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

// Успешное присоединение к комнате
socket.on('join-success', (playerData) => {
    console.log('✅ Успешно присоединились к комнате', playerData);
    gameState.roomId = playerData.roomId || currentRoomId;
    initializeGame(playerData);
});

// Ошибка присоединения к комнате
socket.on('room-error', (message) => {
    showNotification(typeof message === 'object' ? message.message || 'Комнаты с таким номером не существует' : message, 'error');
    // Возвращаем к форме авторизации
    authSection.style.display = 'block';
    gameContent.style.display = 'none';
});

// Обновление состояния комнаты
socket.on('room_state', (roomData) => {
    console.log('🔄 Получено обновление комнаты:', roomData);
    updateRoomState(roomData);
});

// Новый игрок присоединился - ТОЛЬКО в журнал
socket.on('player_joined', (data) => {
    console.log('👥 Новый игрок:', data.player.name);
    gameState.players[data.playerId] = data.player;
    updatePlayersList();
    updatePlayerMarkers();
    
    // ТОЛЬКО в журнал, не в чат (как просили)
    addLogEntry(`Игрок "${data.player.name}" присоединился к игре!`);
});

// Игрок покинул - ТОЛЬКО в журнал
socket.on('player_left', (data) => {
    console.log('🚪 Игрок покинул:', data.playerName);
    if (gameState.players[data.playerId]) {
        gameState.players[data.playerId].connected = false;
    }
    updatePlayersList();
    updatePlayerMarkers();
    
    // ТОЛЬКО в журнал, не в чат (как просили)
    addLogEntry(`Игрок "${data.playerName}" покинул игру.`);
});

// Обновление чата - ТОЛЬКО сообщения игроков (как просили)
socket.on('new_chat_message', (data) => {
    addChatMessage(data.playerName, data.message);
});

socket.on('chat_history', (messages) => {
    console.log('💬 Получена история чата:', messages.length, 'сообщений');
    chatMessages.innerHTML = '';
    messages.forEach(msg => {
        addChatMessage(msg.playerName, msg.message);
    });
});

// Бросок кубика другого игрока - ТОЛЬКО в журнал
socket.on('player_dice_roll', (data) => {
    if (gameState.players[data.playerId] && data.playerId !== gameState.currentPlayerId) {
        gameState.players[data.playerId].position = data.newPosition;
        gameState.players[data.playerId].currentTask = data.task;
        updatePlayerMarkers();
        
        // ТОЛЬКО в журнал (как просили)
        addLogEntry(`Игрок "${gameState.players[data.playerId].name}" бросил кубик: ${data.diceValue}`);
    }
});

// Обновление прогресса
socket.on('progress_updated', (data) => {
    gameState.cityProgress[data.cityKey] = data.progress;
    createCurrentCityProgress();
    addLogEntry(`Прогресс очищения города обновлен: ${data.progress}%`);
});

// Игровые данные - ОБНОВЛЕНО по вашему запросу
const gameData = {
    cities: {
        tver: { 
            name: "Тверь", 
            cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], // Изменено с 1-13 на 2-13
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
            cells: [81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92], // Изменено с 81-93 на 81-92
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
                description: "Посадите 3 дерева в парке",
                type: "drag",
                goal: 3,
                items: ["🌳", "🌳", "🌳", "🌳", "🌳"],
                zones: 3
            },
            {
                description: "Сортируйте мусор по контейнерам",
                type: "sort",
                items: [
                    {name: "Бумага", type: "paper", emoji: "📄"},
                    {name: "Пластик", type: "plastic", emoji: "🥤"},
                    {name: "Стекло", type: "glass", emoji: "🍶"},
                    {name: "Батарейки", type: "battery", emoji: "🔋"}
                ]
            },
            {
                description: "Ответьте на вопрос об экологии",
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
                description: "Найдите 3 отличия на картинках",
                type: "spot_difference",
                differences: 3,
                image1: "🌳🏠🚗🌲🌼",
                image2: "🌳🏠🚙🌲🌼"
            },
            {
                description: "Очистите пруд от листьев",
                type: "clean_pond",
                goal: 8,
                items: ["🍂", "🍂", "🍂", "🍂", "🍂", "🍂", "🍂", "🍂", "🌿", "🌿"]
            },
            {
                description: "Соберите съедобные грибы",
                type: "collect_mushrooms",
                goal: 5,
                items: ["🍄", "🍄", "🍄", "🍄", "🍄", "☠️", "☠️"]
            },
            {
                description: "Что такое биоразнообразие?",
                type: "quiz",
                question: "Что такое биоразнообразие?",
                options: [
                    {text: "Разнообразие живых организмов во всех формах", correct: true},
                    {text: "Разнообразие растений в саду", correct: false},
                    {text: "Разные цвета листьев", correct: false},
                    {text: "Много одинаковых деревьев", correct: false}
                ]
            }
        ],
        medium: [
            {
                description: "Очистите реку от 5 единиц мусора",
                type: "clean",
                goal: 5,
                items: ["🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🌿", "🌿", "🌿"]
            },
            {
                description: "Что такое устойчивое развитие?",
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
                description: "Соберите пазл из экологических символов",
                type: "puzzle",
                pieces: 6,
                image: "🌍♻️🌳💧🌞🌱"
            },
            {
                description: "Посадите цветы на клумбе",
                type: "plant_flowers",
                goal: 6,
                items: ["🌸", "🌺", "🌻", "🌼", "🌷", "💐"],
                zones: 6
            },
            {
                description: "Соберите вторсырье на переработку",
                type: "collect_recycling",
                goal: 7,
                items: ["📦", "🥤", "🍶", "📰", "🔋", "📦", "🥤"]
            },
            {
                description: "Как экономить воду?",
                type: "quiz",
                question: "Какой способ помогает экономить воду?",
                options: [
                    {text: "Закрывать кран во время чистки зубов", correct: true},
                    {text: "Принимать ванну по 2 часа", correct: false},
                    {text: "Поливать огород днем", correct: false},
                    {text: "Оставлять воду включенной", correct: false}
                ]
            },
            {
                description: "Постройте кормушку для птиц",
                type: "bird_feeder",
                pieces: ["🪵", "🪵", "🌾", "🌾", "🥜", "🥜"],
                correctOrder: ["🪵", "🪵", "🌾", "🌾", "🥜", "🥜"]
            }
        ],
        hard: [
            {
                description: "Что такое углеродный след?",
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
                description: "Решите экологическую головоломку",
                type: "puzzle_sequence",
                sequence: ["🌱", "🌳", "🏭", "💨", "🌍", "🔥"],
                correctOrder: ["🌱", "🌳", "🏭", "💨", "🔥", "🌍"]
            },
            {
                description: "Создайте систему компостирования",
                type: "compost_system",
                items: ["🍂", "🍎", "🥕", "🌿", "🗑️", "🌱"],
                correctOrder: ["🍎", "🥕", "🍂", "🌿", "🗑️", "🌱"]
            },
            {
                description: "Как работает солнечная батарея?",
                type: "quiz",
                question: "Как солнечная батарея производит электричество?",
                options: [
                    {text: "Преобразует солнечный свет в электричество", correct: true},
                    {text: "Использует энергию ветра", correct: false},
                    {text: "Сжигает топливо", correct: false},
                    {text: "Использует энергию воды", correct: false}
                ]
            },
            {
                description: "Спланируйте экологичный город",
                type: "eco_city",
                elements: ["🌳", "🚲", "♻️", "☀️", "🚶", "🏢"],
                correctOrder: ["🌳", "🚲", "♻️", "☀️", "🚶", "🏢"]
            },
            {
                description: "Зачем нужны заповедники?",
                type: "quiz",
                question: "Основная цель создания заповедников?",
                options: [
                    {text: "Сохранение редких видов и экосистем", correct: true},
                    {text: "Строительство домов", correct: false},
                    {text: "Добыча полезных ископаемых", correct: false},
                    {text: "Организация туризма", correct: false}
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
        },
        {
            name: "Экотропа",
            cost: 75,
            points: 150,
            description: "Пешеходная дорожка для экотуризма"
        },
        {
            name: "Пункт сбора батареек",
            cost: 60,
            points: 120,
            description: "Сбор и утилизация опасных отходов"
        },
        {
            name: "Зеленая крыша",
            cost: 90,
            points: 180,
            description: "Растительность на крыше для изоляции"
        }
    ],
    difficultyRequirements: {
        easy: { level: 1 },
        medium: { level: 5 },
        hard: { level: 10 }
    }
};

// Состояние игры
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
    cleanupItems: []
};

// Элементы DOM
const authSection = document.getElementById('authSection');
const gameContent = document.getElementById('gameContent');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const mapGrid = document.getElementById('mapGrid');
const citiesGrid = document.getElementById('citiesGrid');
const rollDiceBtn = document.getElementById('rollDiceBtn');
const buildBtn = document.getElementById('buildBtn');
const moveBtn = document.getElementById('moveBtn');
const completeTaskBtn = document.getElementById('completeTaskBtn');
const checkTaskBtn = document.getElementById('checkTaskBtn');
const diceValue = document.getElementById('diceValue');
const taskDescription = document.getElementById('taskDescription');
const currentTask = document.getElementById('currentTask');
const interactiveTask = document.getElementById('interactiveTask');
const taskArea = document.getElementById('taskArea');
const taskResult = document.getElementById('taskResult');
const noTaskMessage = document.getElementById('noTaskMessage');
const playerName = document.getElementById('playerName');
const currentCity = document.getElementById('currentCity');
const currentPosition = document.getElementById('currentPosition');
const coinsCount = document.getElementById('coinsCount');
const cleaningPoints = document.getElementById('cleaningPoints');
const playerLevel = document.getElementById('playerLevel');
const roomNumber = document.getElementById('roomNumber');
const onlinePlayers = document.getElementById('onlinePlayers');
const playersContainer = document.getElementById('playersContainer');
const inviteBtn = document.getElementById('inviteBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const easyBtn = document.getElementById('easyBtn');
const mediumBtn = document.getElementById('mediumBtn');
const hardBtn = document.getElementById('hardBtn');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const logEntries = document.getElementById('logEntries');
const buildingsSection = document.getElementById('buildingsSection');
const notification = document.getElementById('notification');
const cityModal = document.getElementById('cityModal');
const cityModalTitle = document.getElementById('cityModalTitle');
const cityModalSubtitle = document.getElementById('cityModalSubtitle');
const cityModalHistory = document.getElementById('cityModalHistory');
const cityModalProblem = document.getElementById('cityModalProblem');
const cityModalTask = document.getElementById('cityModalTask');
const cityModalCloseBtn = document.getElementById('cityModalCloseBtn');
const gameInfo = document.getElementById('gameInfo');
const cityProgressContainer = document.getElementById('cityProgressContainer');
const buildingsContainer = document.getElementById('buildingsContainer');
const choiceModal = document.getElementById('choiceModal');
const stayBtn = document.getElementById('stayBtn');
const moveForwardBtn = document.getElementById('moveForwardBtn');

// Добавляем элементы для нового интерфейса
const quickActionsBtn = document.getElementById('quickActionsBtn');
const quickActions = document.getElementById('quickActions');
const quickDiceBtn = document.getElementById('quickDiceBtn');
const quickBuildBtn = document.getElementById('quickBuildBtn');
const quickChatBtn = document.getElementById('quickChatBtn');
const quickTasksBtn = document.getElementById('quickTasksBtn');
const quickInviteBtn = document.getElementById('quickInviteBtn');

// ==================== ФУНКЦИИ СЕРВЕРА ====================

// Функция присоединения к игре
function joinGame(username, roomId, isNewRoom) {
    if (!isConnected) {
        showNotification('Нет подключения к серверу. Попробуйте обновить страницу.', 'error');
        return;
    }
    
    // Сохраняем ID комнаты для отображения
    currentRoomId = roomId;
    
    // Сохраняем данные игрока для возможного восстановления
    savePlayerLocalData(username, roomId);
    playerReconnectData = { username, roomId };
    
    socket.emit('join-room', {
        roomId: roomId,
        playerName: username,
        isNewRoom: isNewRoom
    });
    
    showNotification('Подключаемся к комнате...', 'info');
}

// Функция инициализации игры после присоединения к комнате
function initializeGame(playerData) {
    gameState.currentPlayer = playerData;
    gameState.currentPlayerId = socket.id;
    
    // Показываем игровой интерфейс
    authSection.style.display = 'none';
    gameContent.style.display = 'block';
    updatePlayerUI();
    roomNumber.textContent = currentRoomId || gameState.roomId;
    
    // Инициализируем игровые компоненты
    createMap();
    createCitiesGrid();
    createBuildingsList();
    updateDifficultyButtons();
    
    // Инициализируем быстрые кнопки
    initializeQuickActions();
    
    showNotification(`Добро пожаловать в игру, ${playerData.name}!`, 'success');
    
    setTimeout(() => {
        showCityModal(gameState.currentPlayer.city);
    }, 1000);
    
    // Запрашиваем состояние комнаты
    socket.emit('get_room_state');
}

// Функция обновления состояния комнаты
function updateRoomState(roomData) {
    // Обновляем список игроков
    gameState.players = roomData.players;
    
    // Обновляем прогресс городов
    gameState.cityProgress = roomData.cityProgress || {};
    
    // Обновляем UI
    updatePlayersList();
    updatePlayerMarkers();
    onlinePlayers.textContent = Object.keys(roomData.players).filter(id => roomData.players[id].connected).length;
    
    createCurrentCityProgress();
    
    // Синхронизируем данные текущего игрока
    if (gameState.currentPlayerId && gameState.players[gameState.currentPlayerId]) {
        const serverPlayer = gameState.players[gameState.currentPlayerId];
        gameState.currentPlayer = serverPlayer;
        updatePlayerUI();
        
        // Если игрок переподключился, активируем кнопки
        if (!gameState.taskInProgress) {
            rollDiceBtn.disabled = false;
            buildBtn.disabled = false;
        }
    }
}

// Функция обновления чата - ТОЛЬКО сообщения игроков (как просили)
function addChatMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = `<span class="chat-sender">${sender}:</span> <span class="chat-text">${message}</span>`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Функция сохранения состояния игрока на сервере
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
        color: gameState.currentPlayer.color,
        connected: true
    });
}

// Функция отправки сообщения в чат
function sendChatMessage(message) {
    if (isConnected && gameState.currentPlayer) {
        socket.emit('chat_message', {
            message: message
        });
    }
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ИГРЫ ====================

// Показать уведомление
function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = 'notification';
    
    if (type === 'success') {
        notification.style.background = 'var(--success)';
    } else if (type === 'warning') {
        notification.style.background = 'var(--warning)';
    } else if (type === 'error') {
        notification.style.background = 'var(--accent)';
    } else {
        notification.style.background = 'var(--secondary)';
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Создание карты с шестигранниками (как просили) - ОБНОВЛЕНО
function createMap() {
    mapGrid.innerHTML = '';
    
    const riverCells = [14, 15, 16, 17, 30, 31, 44, 45, 46, 59, 60, 61, 62, 63, 64, 65, 78, 79, 80];
    const forestCells = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93];
    
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.className = 'map-cell hexagon';
            cell.style.position = 'relative';
            
            const cellNumber = row * 10 + col + 1;
            
            if (cellNumber > 94) {
                cell.classList.add('empty');
                cell.textContent = '';
                mapGrid.appendChild(cell);
                continue;
            }
            
            // Добавляем номер клетки
            const numberSpan = document.createElement('span');
            numberSpan.className = 'cell-number';
            numberSpan.textContent = cellNumber;
            numberSpan.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 12px; font-weight: bold; color: #333; z-index: 1;';
            
            if (cellNumber === 1) {
                cell.classList.add('start');
                cell.style.background = 'rgba(76, 175, 80, 0.8)';
                cell.style.backgroundImage = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="%23007E33"/></svg>\')';
                cell.style.backgroundRepeat = 'no-repeat';
                cell.style.backgroundPosition = 'center';
                cell.style.backgroundSize = '60%';
                numberSpan.textContent = 'Старт';
                numberSpan.style.color = 'white';
                numberSpan.style.fontSize = '10px';
                numberSpan.style.top = '70%';
            } else if (cellNumber === 94) {
                cell.classList.add('finish');
                cell.style.background = 'rgba(244, 67, 54, 0.8)';
                cell.style.backgroundImage = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><polygon points="10,0 13,6 20,7 15,12 16,20 10,16 4,20 5,12 0,7 7,6" fill="%23D32F2F"/></svg>\')';
                cell.style.backgroundRepeat = 'no-repeat';
                cell.style.backgroundPosition = 'center';
                cell.style.backgroundSize = '60%';
                numberSpan.textContent = 'Финиш';
                numberSpan.style.color = 'white';
                numberSpan.style.fontSize = '10px';
                numberSpan.style.top = '70%';
            } else if (riverCells.includes(cellNumber)) {
                cell.classList.add('river');
                cell.style.background = 'rgba(33, 150, 243, 0.3)';
                cell.style.backgroundImage = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path d="M0,10 Q5,5 10,10 T20,10" stroke="%232196F3" fill="none" stroke-width="2"/></svg>\')';
                cell.style.backgroundRepeat = 'no-repeat';
                cell.style.backgroundPosition = 'center';
                numberSpan.style.color = '#2196F3';
            } else if (forestCells.includes(cellNumber)) {
                cell.classList.add('forest');
                cell.style.background = 'rgba(56, 142, 60, 0.3)';
                cell.style.backgroundImage = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path d="M10,2 L12,7 L17,7 L13,10 L15,15 L10,12 L5,15 L7,10 L3,7 L8,7 Z" fill="%23388E3C"/></svg>\')';
                cell.style.backgroundRepeat = 'no-repeat';
                cell.style.backgroundPosition = 'center';
                numberSpan.style.color = '#388E3C';
            } else {
                let isCity = false;
                for (const cityKey in gameData.cities) {
                    if (gameData.cities[cityKey].cells.includes(cellNumber)) {
                        cell.classList.add('city');
                        // Желтый цвет для всех клеток города (как просили)
                        cell.style.background = 'rgba(255, 235, 59, 0.8)';
                        cell.style.backgroundImage = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path d="M10 0L0 10h3v10h4v-6h6v6h4V10h3z" fill="%23FF9800"/></svg>\')';
                        cell.style.backgroundRepeat = 'no-repeat';
                        cell.style.backgroundPosition = 'center 5px';
                        cell.style.backgroundSize = '15px';
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
            mapGrid.appendChild(cell);
        }
    }
    
    updatePlayerMarkers();
}

// Обновление маркеров игроков для шестигранников
function updatePlayerMarkers() {
    document.querySelectorAll('.player-marker').forEach(marker => marker.remove());
    
    for (const playerId in gameState.players) {
        const player = gameState.players[playerId];
        if (!player.connected) continue;
        
        const marker = document.createElement('div');
        marker.className = 'player-marker';
        marker.id = `marker-${playerId}`;
        marker.setAttribute('data-player', player.name);
        
        const cellNumber = player.position || 1;
        const row = Math.floor((cellNumber - 1) / 10);
        const col = (cellNumber - 1) % 10;
        
        // Более точное позиционирование для шестигранников
        const leftPercent = (col * 10) + 5;
        const topPercent = (row * 10) + 5;
        
        // Смещение для четных строк (оптимизация для гексагональной сетки)
        if (row % 2 === 1) {
            marker.style.left = `${leftPercent + 2.5}%`;
        } else {
            marker.style.left = `${leftPercent}%`;
        }
        
        marker.style.top = `${topPercent}%`;
        marker.style.background = player.color;
        
        // Добавляем иконку для текущего игрока
        if (playerId === gameState.currentPlayerId) {
            marker.innerHTML = '<i class="fas fa-user" style="font-size: 12px; color: white;"></i>';
            marker.style.border = '3px solid white';
            marker.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.8)';
        } else {
            marker.style.border = '2px solid white';
            marker.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.7)';
        }
        
        // Добавляем всплывающую подсказку с именем игрока
        const tooltip = document.createElement('div');
        tooltip.className = 'player-tooltip';
        tooltip.textContent = player.name;
        tooltip.style.cssText = 'position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; white-space: nowrap; opacity: 0; transition: opacity 0.3s; pointer-events: none;';
        marker.appendChild(tooltip);
        
        // Показывать подсказку при наведении
        marker.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
        });
        marker.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });
        
        mapGrid.appendChild(marker);
    }
}

// Обновление списка игроков
function updatePlayersList() {
    playersContainer.innerHTML = '';
    
    for (const playerId in gameState.players) {
        const player = gameState.players[playerId];
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        
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
            <span>${player.cleaningPoints || 0} баллов (ур. ${player.level || 1})</span>
        `;
        
        playersContainer.appendChild(playerItem);
    }
}

// Обновление интерфейса игрока
function updatePlayerUI() {
    if (gameState.currentPlayer) {
        playerName.textContent = gameState.currentPlayer.name;
        currentCity.textContent = gameData.cities[gameState.currentPlayer.city]?.name || 'Тверь';
        currentPosition.textContent = gameState.currentPlayer.position;
        coinsCount.textContent = gameState.currentPlayer.coins || 0;
        cleaningPoints.textContent = gameState.currentPlayer.cleaningPoints || 0;
        playerLevel.textContent = gameState.currentPlayer.level || 1;
    }
}

// Создание прогресса для текущего города
function createCurrentCityProgress() {
    cityProgressContainer.innerHTML = '';
    
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
        
        cityProgressContainer.appendChild(progressElement);
    }
}

// Создание сетки городов
function createCitiesGrid() {
    citiesGrid.innerHTML = '';
    
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
        
        citiesGrid.appendChild(cityCard);
    }
}

// Создание списка зданий
function createBuildingsList() {
    buildingsContainer.innerHTML = '';
    
    gameData.buildings.forEach((building, index) => {
        const buildingItem = document.createElement('div');
        buildingItem.className = 'building-item';
        buildingItem.innerHTML = `
            <div>
                <div style="font-weight: bold;">${building.name} (${building.cost} монет)</div>
                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.7);">${building.description}</div>
                <div style="font-size: 0.8rem; color: var(--success); margin-top: 5px;">+${building.points} баллов очищения</div>
            </div>
            <button class="game-btn buy-btn" data-building="${index}">Купить 🏗️</button>
        `;
        
        buildingsContainer.appendChild(buildingItem);
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
                
                // ТОЛЬКО в журнал, а в чат отправляем сообщение от игрока (как просили)
                addLogEntry(`Вы построили "${building.name}"! Получено ${building.points} баллов очищения.`);
                
                // УВЕДОМЛЕНИЕ о покупке
                showNotification(`🎉 Вы построили "${building.name}"! +${building.points} баллов очищения.`, 'success');
                
                savePlayerState();
                
                if (gameState.currentPlayer.position >= 94 && gameState.currentPlayer.buildings.length >= 1) {
                    gameState.gameOver = true;
                    addLogEntry(`🎊 Поздравляем! Вы достигли Астрахани и построили объект! Игра завершена.`);
                    showNotification(`🎊 Поздравляем! Вы достигли Астрахани и построили объект! Игра завершена.`, 'success');
                }
                
                // Обновляем список зданий
                createBuildingsList();
            } else {
                showNotification(`❌ Недостаточно монет для постройки "${building.name}"! Нужно ${building.cost} монет.`, 'warning');
            }
        });
    });
}

// Обновление прогресса города
function updateCityProgress(cityKey, progress) {
    gameState.cityProgress[cityKey] = progress;
    createCurrentCityProgress();
    
    // Отправляем на сервер
    socket.emit('update_progress', {
        cityKey: cityKey,
        progress: progress
    });
    
    savePlayerState();
    
    // Обновляем сетку городов
    createCitiesGrid();
}

// Показать модальное окно города
function showCityModal(cityKey) {
    const city = gameData.cities[cityKey];
    if (!city) return;
    
    cityModalTitle.textContent = city.name;
    cityModalSubtitle.textContent = city.description;
    cityModalHistory.textContent = city.history;
    cityModalProblem.textContent = city.problem;
    cityModalTask.textContent = city.task;
    
    cityModal.classList.add('active');
}

// Закрыть модальное окно города
function closeCityModal() {
    cityModal.classList.remove('active');
}

// Показать модальное окно выбора
function showChoiceModal(nextCity) {
    gameState.nextCity = nextCity;
    choiceModal.classList.add('active');
}

// Закрыть модальное окно выбора
function closeChoiceModal() {
    choiceModal.classList.remove('active');
}

// Обновление кнопок сложности
function updateDifficultyButtons() {
    const playerLevel = gameState.currentPlayer?.level || 1;
    
    easyBtn.classList.remove('locked');
    
    if (playerLevel >= 5) {
        mediumBtn.classList.remove('locked');
    } else {
        mediumBtn.classList.add('locked');
    }
    
    if (playerLevel >= 10) {
        hardBtn.classList.remove('locked');
    } else {
        hardBtn.classList.add('locked');
    }
}

// Добавление записи в журнал (все игровые события здесь)
function addLogEntry(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    logEntries.appendChild(entry);
    logEntries.scrollTop = logEntries.scrollHeight;
}

// Получение случайного задания с расширенной логикой для большего разнообразия
function getRandomTask(difficulty) {
    const availableTasks = gameData.tasks[difficulty];
    if (!availableTasks || availableTasks.length === 0) return null;
    
    // Очищаем использованные задания если все уже использованы
    if (gameState.usedTasks[difficulty].length >= availableTasks.length * 0.7) {
        gameState.usedTasks[difficulty] = [];
    }
    
    let randomTask;
    let attempts = 0;
    
    // Используем более сложный алгоритм для предотвращения частых повторений
    do {
        // Взвешенный случайный выбор (новые задания имеют больший вес)
        const taskWeights = availableTasks.map(task => 
            gameState.usedTasks[difficulty].includes(task.description) ? 1 : 3
        );
        const totalWeight = taskWeights.reduce((a, b) => a + b, 0);
        let randomWeight = Math.random() * totalWeight;
        
        let selectedIndex = 0;
        for (let i = 0; i < taskWeights.length; i++) {
            randomWeight -= taskWeights[i];
            if (randomWeight <= 0) {
                selectedIndex = i;
                break;
            }
        }
        
        randomTask = availableTasks[selectedIndex];
        attempts++;
    } while (gameState.usedTasks[difficulty].includes(randomTask.description) && attempts < 50);
    
    if (!gameState.usedTasks[difficulty].includes(randomTask.description)) {
        gameState.usedTasks[difficulty].push(randomTask.description);
    }
    
    return randomTask;
}

// ==================== ИНТЕРАКТИВНЫЕ ЗАДАНИЯ (ОБНОВЛЕННЫЕ ДЛЯ МОБИЛЬНЫХ) ====================

// Создание интерактивного задания
function createInteractiveTask(task) {
    taskArea.innerHTML = '';
    taskResult.textContent = '';
    gameState.taskInProgress = true;
    
    // Очищаем состояние задания
    gameState.dragItems = [];
    gameState.dropZones = [];
    gameState.sortItems = [];
    gameState.sortBins = [];
    gameState.selectedPuzzlePieces = [];
    gameState.spotDifferencesFound = 0;
    gameState.cleanupItems = [];
    
    // Добавляем стили для мобильной прокрутки
    taskArea.style.overflow = 'auto';
    taskArea.style.maxHeight = '400px';
    taskArea.style.padding = '15px';
    
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
    } else if (task.type === "clean_pond") {
        createCleanPondTask(task);
    } else if (task.type === "collect_mushrooms") {
        createCollectMushroomsTask(task);
    } else if (task.type === "plant_flowers") {
        createPlantFlowersTask(task);
    } else if (task.type === "collect_recycling") {
        createCollectRecyclingTask(task);
    } else if (task.type === "bird_feeder") {
        createBirdFeederTask(task);
    } else if (task.type === "compost_system") {
        createCompostSystemTask(task);
    } else if (task.type === "eco_city") {
        createEcoCityTask(task);
    } else {
        createDefaultTask(task);
    }
    
    checkTaskBtn.disabled = true;
}

// Создание викторины
function createQuizTask(task) {
    taskArea.innerHTML = `
        <p><strong>${task.question}</strong></p>
        <div class="quiz-options" style="display: flex; flex-direction: column; gap: 10px;">
            ${task.options.map((option, index) => 
                `<div class="quiz-option" data-index="${index}" data-correct="${option.correct}" style="padding: 15px; margin: 5px 0; cursor: pointer; touch-action: manipulation;">
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
                opt.style.touchAction = 'none';
                if (opt.dataset.correct === 'true') {
                    opt.classList.add('correct');
                    opt.style.background = 'rgba(46, 204, 113, 0.3)';
                    opt.style.border = '2px solid #2ecc71';
                } else if (opt === this && !isCorrect) {
                    opt.classList.add('incorrect');
                    opt.style.background = 'rgba(231, 76, 60, 0.3)';
                    opt.style.border = '2px solid #e74c3c';
                }
            });
            
            taskResult.textContent = isCorrect ? 
                '✅ Правильно! Задание выполнено.' : 
                '❌ Неправильно. Попробуйте еще раз.';
            taskResult.style.color = isCorrect ? '#2ecc71' : '#e74c3c';
            
            if (isCorrect) {
                checkTaskBtn.disabled = false;
            }
        });
        
        // Добавляем обработчик для тач-устройств
        option.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(0.98)';
        });
        
        option.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(1)';
        });
    });
}

// Создание задания на перетаскивание (оптимизировано для мобильных)
function createDragTask(task) {
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Перетащите ${task.goal} дерева в специальные зоны посадки:</p>
        <div class="drag-container" style="margin-bottom: 20px;">
            <div class="drag-items" style="display: flex; flex-wrap: wrap; gap: 15px; margin: 15px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 12px; touch-action: pan-y;">
                ${task.items.map((item, index) => 
                    `<div class="draggable-item" data-index="${index}" draggable="true" style="cursor: grab; touch-action: none; width: 70px; height: 70px; font-size: 2.2rem;">
                        ${item}
                    </div>`
                ).join('')}
            </div>
            <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Перетащите деревья ниже</p>
            <div class="drop-zones" style="display: flex; flex-wrap: wrap; gap: 15px; margin: 15px 0; padding: 15px; background: rgba(46,204,113,0.1); border-radius: 12px; min-height: 100px; touch-action: pan-y;">
                ${Array.from({length: task.zones || task.goal}).map((_, index) => 
                    `<div class="drop-zone" data-zone="${index}" style="width: 80px; height: 80px; padding: 10px; font-size: 0.8rem;">
                        Зона ${index + 1}
                    </div>`
                ).join('')}
            </div>
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Перетащено: <span id="dragCount" style="font-weight: bold;">0</span>/${task.goal}</p>
    `;
    
    // Инициализация перетаскивания с поддержкой мобильных устройств
    initializeDragAndDropEnhanced(task.goal);
}

// Улучшенная инициализация перетаскивания для мобильных
function initializeDragAndDropEnhanced(goal) {
    const draggables = taskArea.querySelectorAll('.draggable-item');
    const dropZones = taskArea.querySelectorAll('.drop-zone');
    let draggedItem = null;
    let placedCount = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    
    // Функция для определения ближайшей зоны сброса
    function findNearestDropZone(x, y) {
        let nearestZone = null;
        let minDistance = Infinity;
        
        dropZones.forEach(zone => {
            const rect = zone.getBoundingClientRect();
            const zoneX = rect.left + rect.width / 2;
            const zoneY = rect.top + rect.height / 2;
            const distance = Math.sqrt((x - zoneX) ** 2 + (y - zoneY) ** 2);
            
            if (distance < minDistance && !zone.querySelector('.draggable-item')) {
                minDistance = distance;
                nearestZone = zone;
            }
        });
        
        return nearestZone;
    }
    
    draggables.forEach(item => {
        // Desktop drag
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            setTimeout(() => {
                this.style.opacity = '0.4';
            }, 0);
        });
        
        item.addEventListener('dragend', function() {
            this.style.opacity = '1';
        });
        
        // Mobile touch events
        item.addEventListener('touchstart', function(e) {
            e.preventDefault();
            draggedItem = this;
            this.style.opacity = '0.4';
            this.style.position = 'fixed';
            this.style.zIndex = '1000';
            
            const touch = e.touches[0];
            touchStartX = touch.clientX - this.getBoundingClientRect().left;
            touchStartY = touch.clientY - this.getBoundingClientRect().top;
            
            // Показываем подсказку
            showNotification('Перетащите элемент в зону посадки', 'info');
        });
        
        item.addEventListener('touchmove', function(e) {
            e.preventDefault();
            if (!draggedItem) return;
            
            const touch = e.touches[0];
            draggedItem.style.left = (touch.clientX - touchStartX) + 'px';
            draggedItem.style.top = (touch.clientY - touchStartY) + 'px';
            
            // Подсвечиваем ближайшую зону
            dropZones.forEach(zone => {
                zone.classList.remove('hover');
            });
            
            const nearestZone = findNearestDropZone(touch.clientX, touch.clientY);
            if (nearestZone) {
                nearestZone.classList.add('hover');
            }
        });
        
        item.addEventListener('touchend', function(e) {
            e.preventDefault();
            if (!draggedItem) return;
            
            const touch = e.changedTouches[0];
            const nearestZone = findNearestDropZone(touch.clientX, touch.clientY);
            
            if (nearestZone && !nearestZone.querySelector('.draggable-item')) {
                // Возвращаем элемент в нормальное состояние
                draggedItem.style.position = 'static';
                draggedItem.style.opacity = '1';
                draggedItem.style.zIndex = 'auto';
                draggedItem.style.left = '';
                draggedItem.style.top = '';
                draggedItem.style.cursor = 'default';
                draggedItem.draggable = false;
                
                // Переносим в зону
                nearestZone.appendChild(draggedItem);
                nearestZone.classList.remove('hover');
                
                placedCount++;
                document.getElementById('dragCount').textContent = placedCount;
                
                if (placedCount >= goal) {
                    checkTaskBtn.disabled = false;
                    taskResult.textContent = '✅ Отлично! Все деревья посажены!';
                    taskResult.style.color = '#2ecc71';
                    showNotification('Задание выполнено!', 'success');
                }
            } else {
                // Возвращаем на исходную позицию
                draggedItem.style.position = 'static';
                draggedItem.style.opacity = '1';
                draggedItem.style.zIndex = 'auto';
                draggedItem.style.left = '';
                draggedItem.style.top = '';
            }
            
            draggedItem = null;
        });
    });
    
    dropZones.forEach(zone => {
        // Desktop events
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
                draggedItem.style.cursor = 'default';
                draggedItem.draggable = false;
                placedCount++;
                
                document.getElementById('dragCount').textContent = placedCount;
                
                if (placedCount >= goal) {
                    checkTaskBtn.disabled = false;
                    taskResult.textContent = '✅ Отлично! Все деревья посажены!';
                    taskResult.style.color = '#2ecc71';
                }
            }
        });
        
        // Mobile styles
        zone.style.transition = 'all 0.3s ease';
        zone.style.border = '2px dashed #2ecc71';
        zone.style.display = 'flex';
        zone.style.alignItems = 'center';
        zone.style.justifyContent = 'center';
        zone.style.textAlign = 'center';
    });
}

// Создание задания на сортировку
function createSortTask(task) {
    const binTypes = {
        paper: { name: "Бумага", emoji: "📄", color: "#3498db" },
        plastic: { name: "Пластик", emoji: "🥤", color: "#e74c3c" },
        glass: { name: "Стекло", emoji: "🍶", color: "#2ecc71" },
        battery: { name: "Батарейки", emoji: "🔋", color: "#f39c12" }
    };
    
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Перетащите мусор в правильные контейнеры:</p>
        <div class="sorting-area" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0;">
            ${Object.entries(binTypes).map(([type, data]) => 
                `<div class="sort-bin" data-type="${type}" style="min-height: 120px; border: 2px solid ${data.color}; border-radius: 10px; padding: 10px; text-align: center; touch-action: pan-y;">
                    <div style="font-size: 1.8rem; margin-bottom: 5px;">${data.emoji}</div>
                    <div style="font-weight: bold; font-size: 0.9rem;">${data.name}</div>
                    <div class="sort-bin-content" style="min-height: 60px; margin-top: 8px; display: flex; flex-wrap: wrap; gap: 5px; justify-content: center;"></div>
                </div>`
            ).join('')}
        </div>
        <p style="text-align: center; margin: 10px 0; font-size: 0.9rem; color: rgba(255,255,255,0.7);">Перетащите предметы ниже в контейнеры</p>
        <div class="sort-items" style="display: flex; flex-wrap: wrap; gap: 8px; margin: 15px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 12px; justify-content: center; touch-action: pan-y;">
            ${task.items.map((item, index) => 
                `<div class="sort-item" data-index="${index}" data-type="${item.type}" draggable="true" style="cursor: grab; touch-action: none; padding: 12px 15px; background: ${binTypes[item.type].color}; border-radius: 10px; color: white; font-weight: bold; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; min-width: 100px; justify-content: center;">
                    ${item.emoji} ${item.name}
                </div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Отсортировано: <span id="sortCount" style="font-weight: bold;">0</span>/${task.items.length}</p>
    `;
    
    initializeSortingEnhanced(task.items.length);
}

// НОВЫЕ ТИПЫ ЗАДАНИЙ

// Очистка пруда
function createCleanPondTask(task) {
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Кликните по листьям, чтобы очистить пруд (${task.goal} листьев):</p>
        <div class="pond-container" style="width: 100%; height: 250px; background: linear-gradient(to bottom, #1abc9c, #16a085); border-radius: 12px; position: relative; margin: 15px 0; overflow: hidden; cursor: pointer;">
            ${task.items.map((item, index) => {
                const left = Math.random() * 85 + 5;
                const top = Math.random() * 75 + 10;
                const size = 30 + Math.random() * 20;
                const rotation = Math.random() * 360;
                return `<div class="pond-item" data-index="${index}" data-type="${item}" style="position: absolute; left: ${left}%; top: ${top}%; font-size: ${size}px; cursor: pointer; transform: rotate(${rotation}deg); transition: all 0.3s;">${item}</div>`;
            }).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Очищено: <span id="cleanPondCount" style="font-weight: bold;">0</span>/${task.goal}</p>
    `;
    
    initializeCleanPond(task.goal);
}

function initializeCleanPond(goal) {
    const pondItems = taskArea.querySelectorAll('.pond-item');
    let cleanedCount = 0;
    
    pondItems.forEach(item => {
        item.addEventListener('click', function() {
            if (!this.dataset.cleaned && this.dataset.type === '🍂') {
                this.style.opacity = '0.2';
                this.style.transform += ' scale(0.5)';
                this.dataset.cleaned = 'true';
                
                cleanedCount++;
                document.getElementById('cleanPondCount').textContent = cleanedCount;
                
                if (cleanedCount >= goal) {
                    checkTaskBtn.disabled = false;
                    taskResult.textContent = '✅ Отлично! Пруд очищен от листьев!';
                    taskResult.style.color = '#2ecc71';
                }
            }
        });
        
        // Для мобильных устройств
        item.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.style.transform += ' scale(1.1)';
        });
        
        item.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.style.transform = this.style.transform.replace(' scale(1.1)', '');
        });
    });
}

// Сбор грибов
function createCollectMushroomsTask(task) {
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Соберите съедобные грибы (🍄), избегая ядовитых (☠️):</p>
        <div class="forest-container" style="width: 100%; height: 300px; background: linear-gradient(to bottom, #27ae60, #229954); border-radius: 12px; position: relative; margin: 15px 0; overflow: hidden; cursor: pointer;">
            ${task.items.map((item, index) => {
                const left = Math.random() * 85 + 5;
                const top = Math.random() * 80 + 5;
                const size = 35 + Math.random() * 15;
                return `<div class="forest-item" data-index="${index}" data-type="${item}" style="position: absolute; left: ${left}%; top: ${top}%; font-size: ${size}px; cursor: pointer; transition: all 0.3s;">${item}</div>`;
            }).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Собрано грибов: <span id="mushroomCount" style="font-weight: bold;">0</span>/${task.goal}</p>
        <p style="font-size: 0.8rem; color: #f39c12; text-align: center; margin-top: 5px;">⚠️ Не трогайте ядовитые грибы (☠️)!</p>
    `;
    
    initializeCollectMushrooms(task.goal);
}

function initializeCollectMushrooms(goal) {
    const forestItems = taskArea.querySelectorAll('.forest-item');
    let collectedCount = 0;
    let touchedPoison = false;
    
    forestItems.forEach(item => {
        item.addEventListener('click', function() {
            const type = this.dataset.type;
            
            if (type === '🍄' && !this.dataset.collected) {
                this.style.opacity = '0.3';
                this.style.transform = 'scale(0.7)';
                this.dataset.collected = 'true';
                
                collectedCount++;
                document.getElementById('mushroomCount').textContent = collectedCount;
                
                if (collectedCount >= goal) {
                    checkTaskBtn.disabled = false;
                    taskResult.textContent = '✅ Отлично! Вы собрали все съедобные грибы!';
                    taskResult.style.color = '#2ecc71';
                }
            } else if (type === '☠️') {
                if (!touchedPoison) {
                    touchedPoison = true;
                    this.style.animation = 'shake 0.5s';
                    taskResult.textContent = '❌ Осторожно! Это ядовитый гриб!';
                    taskResult.style.color = '#e74c3c';
                    
                    setTimeout(() => {
                        this.style.animation = '';
                    }, 500);
                }
            }
        });
    });
}

// Посадка цветов
function createPlantFlowersTask(task) {
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Посадите цветы на клумбе в любом порядке:</p>
        <div class="flower-container" style="margin-bottom: 20px;">
            <div class="flower-items" style="display: flex; flex-wrap: wrap; gap: 15px; margin: 15px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 12px; justify-content: center;">
                ${task.items.map((item, index) => 
                    `<div class="flower-item" data-index="${index}" draggable="true" style="cursor: grab; width: 70px; height: 70px; font-size: 2.5rem; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.2); border-radius: 10px;">
                        ${item}
                    </div>`
                ).join('')}
            </div>
            <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Перетащите цветы ниже на клумбу</p>
            <div class="flower-bed" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; padding: 15px; background: linear-gradient(to bottom, #d35400, #e67e22); border-radius: 12px; min-height: 150px;">
                ${Array.from({length: task.zones || task.goal}).map((_, index) => 
                    `<div class="flower-zone" data-zone="${index}" style="border: 2px dashed #f1c40f; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: rgba(255,255,255,0.7); min-height: 70px;">
                        Клумба ${index + 1}
                    </div>`
                ).join('')}
            </div>
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Посажено: <span id="flowerCount" style="font-weight: bold;">0</span>/${task.goal}</p>
    `;
    
    initializeFlowerPlanting(task.goal);
}

// Инициализация посадки цветов
function initializeFlowerPlanting(goal) {
    const flowerItems = taskArea.querySelectorAll('.flower-item');
    const flowerZones = taskArea.querySelectorAll('.flower-zone');
    let plantedCount = 0;
    
    flowerItems.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.innerHTML);
        });
        
        // Touch events для мобильных
        item.addEventListener('touchstart', function(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.getBoundingClientRect();
            
            // Создаем копию для перетаскивания
            const clone = this.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.left = (touch.clientX - rect.width/2) + 'px';
            clone.style.top = (touch.clientY - rect.height/2) + 'px';
            clone.style.zIndex = '1000';
            clone.style.opacity = '0.8';
            document.body.appendChild(clone);
            
            clone.dataset.originalIndex = this.dataset.index;
            
            const touchMoveHandler = function(e) {
                const touch = e.touches[0];
                clone.style.left = (touch.clientX - rect.width/2) + 'px';
                clone.style.top = (touch.clientY - rect.height/2) + 'px';
            };
            
            const touchEndHandler = function(e) {
                const touch = e.changedTouches[0];
                
                // Проверяем, над какой зоной отпустили
                flowerZones.forEach(zone => {
                    const zoneRect = zone.getBoundingClientRect();
                    if (touch.clientX >= zoneRect.left && 
                        touch.clientX <= zoneRect.right &&
                        touch.clientY >= zoneRect.top && 
                        touch.clientY <= zoneRect.bottom &&
                        !zone.querySelector('.flower-item')) {
                        
                        zone.innerHTML = item.innerHTML;
                        zone.style.fontSize = '2rem';
                        zone.style.display = 'flex';
                        zone.style.alignItems = 'center';
                        zone.style.justifyContent = 'center';
                        zone.style.border = '2px solid #2ecc71';
                        
                        plantedCount++;
                        document.getElementById('flowerCount').textContent = plantedCount;
                        
                        if (plantedCount >= goal) {
                            checkTaskBtn.disabled = false;
                            taskResult.textContent = '✅ Прекрасно! Клумба цветет!';
                            taskResult.style.color = '#2ecc71';
                        }
                    }
                });
                
                document.body.removeChild(clone);
                document.removeEventListener('touchmove', touchMoveHandler);
                document.removeEventListener('touchend', touchEndHandler);
            };
            
            document.addEventListener('touchmove', touchMoveHandler);
            document.addEventListener('touchend', touchEndHandler);
        });
    });
    
    flowerZones.forEach(zone => {
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            const flower = e.dataTransfer.getData('text/plain');
            
            if (!this.querySelector('.flower-item')) {
                this.innerHTML = flower;
                this.style.fontSize = '2rem';
                this.style.display = 'flex';
                this.style.alignItems = 'center';
                this.style.justifyContent = 'center';
                this.style.border = '2px solid #2ecc71';
                
                plantedCount++;
                document.getElementById('flowerCount').textContent = plantedCount;
                
                if (plantedCount >= goal) {
                    checkTaskBtn.disabled = false;
                    taskResult.textContent = '✅ Прекрасно! Клумба цветет!';
                    taskResult.style.color = '#2ecc71';
                }
            }
        });
    });
}

// Сбор вторсырья
function createCollectRecyclingTask(task) {
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Соберите ${task.goal} единиц вторсырья, нажимая на них:</p>
        <div class="recycling-container" style="width: 100%; min-height: 200px; background: rgba(255,255,255,0.1); border-radius: 12px; position: relative; margin: 15px 0; padding: 20px; display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; align-items: center;">
            ${task.items.map((item, index) => 
                `<div class="recycling-item" data-index="${index}" style="font-size: 2.5rem; padding: 15px; background: rgba(52, 152, 219, 0.3); border-radius: 10px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; min-width: 80px; min-height: 80px;">
                    ${item}
                </div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Собрано: <span id="recyclingCount" style="font-weight: bold;">0</span>/${task.goal}</p>
    `;
    
    initializeCollectRecycling(task.goal);
}

function initializeCollectRecycling(goal) {
    const recyclingItems = taskArea.querySelectorAll('.recycling-item');
    let collectedCount = 0;
    
    recyclingItems.forEach(item => {
        item.addEventListener('click', function() {
            if (!this.dataset.collected) {
                this.style.opacity = '0.4';
                this.style.transform = 'scale(0.8)';
                this.style.background = 'rgba(46, 204, 113, 0.3)';
                this.dataset.collected = 'true';
                
                collectedCount++;
                document.getElementById('recyclingCount').textContent = collectedCount;
                
                if (collectedCount >= goal) {
                    checkTaskBtn.disabled = false;
                    taskResult.textContent = '✅ Отлично! Вторсырье собрано!';
                    taskResult.style.color = '#2ecc71';
                }
            }
        });
        
        // Touch feedback для мобильных
        item.addEventListener('touchstart', function() {
            if (!this.dataset.collected) {
                this.style.transform = 'scale(0.95)';
            }
        });
        
        item.addEventListener('touchend', function() {
            if (!this.dataset.collected) {
                this.style.transform = 'scale(1)';
            }
        });
    });
}

// Постройка кормушки для птиц
function createBirdFeederTask(task) {
    const shuffledPieces = [...task.pieces].sort(() => Math.random() - 0.5);
    
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Соберите кормушку в правильном порядке:</p>
        <div class="birdfeeder-target" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 12px; min-height: 120px; justify-content: center;">
            ${task.correctOrder.map((_, index) => 
                `<div class="birdfeeder-slot" data-index="${index}" style="width: 70px; height: 70px; border: 2px dashed #f39c12; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; color: rgba(255,255,255,0.5);">${index + 1}</div>`
            ).join('')}
        </div>
        <p style="text-align: center; margin: 10px 0; font-size: 0.9rem; color: rgba(255,255,255,0.7);">Перетащите детали снизу в правильные места</p>
        <div class="birdfeeder-pieces" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 12px; justify-content: center;">
            ${shuffledPieces.map((piece, index) => 
                `<div class="birdfeeder-piece" data-piece="${piece}" draggable="true" style="width: 70px; height: 70px; border: 2px solid #f39c12; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; cursor: grab; background: rgba(243, 156, 18, 0.2);">${piece}</div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Собрано: <span id="birdfeederCount" style="font-weight: bold;">0</span>/${task.correctOrder.length}</p>
    `;
    
    initializeBirdFeeder(task.correctOrder);
}

// Система компостирования
function createCompostSystemTask(task) {
    const shuffledItems = [...task.items].sort(() => Math.random() - 0.5);
    
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Расположите компоненты компоста в правильном порядке:</p>
        <div class="compost-target" style="display: flex; flex-direction: column; gap: 10px; margin: 20px 0; padding: 15px; background: rgba(139, 195, 74, 0.1); border-radius: 12px; min-height: 200px;">
            ${task.correctOrder.map((_, index) => 
                `<div class="compost-slot" data-index="${index}" style="min-height: 50px; border: 2px dashed #8bc34a; border-radius: 8px; padding: 10px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; color: rgba(255,255,255,0.5); margin-bottom: 5px;">
                    Слой ${index + 1}
                </div>`
            ).join('')}
        </div>
        <p style="text-align: center; margin: 10px 0; font-size: 0.9rem; color: rgba(255,255,255,0.7);">Перетащите компоненты снизу в правильные слои</p>
        <div class="compost-pieces" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 12px; justify-content: center;">
            ${shuffledItems.map((item, index) => 
                `<div class="compost-piece" data-piece="${item}" draggable="true" style="padding: 12px 15px; border: 2px solid #8bc34a; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; cursor: grab; background: rgba(139, 195, 74, 0.2);">${item}</div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Размещено: <span id="compostCount" style="font-weight: bold;">0</span>/${task.correctOrder.length}</p>
    `;
    
    initializeCompostSystem(task.correctOrder);
}

// Экологичный город
function createEcoCityTask(task) {
    const shuffledElements = [...task.elements].sort(() => Math.random() - 0.5);
    
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Расположите элементы экологичного города в правильном порядке:</p>
        <div class="ecocity-target" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; padding: 15px; background: rgba(41, 128, 185, 0.1); border-radius: 12px; min-height: 150px;">
            ${task.correctOrder.map((_, index) => 
                `<div class="ecocity-slot" data-index="${index}" style="min-height: 80px; border: 2px dashed #2980b9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; color: rgba(255,255,255,0.5); padding: 10px; text-align: center;">
                    Ячейка ${index + 1}
                </div>`
            ).join('')}
        </div>
        <p style="text-align: center; margin: 10px 0; font-size: 0.9rem; color: rgba(255,255,255,0.7);">Перетащите элементы снизу в правильные ячейки</p>
        <div class="ecocity-pieces" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 12px; justify-content: center;">
            ${shuffledElements.map((element, index) => 
                `<div class="ecocity-piece" data-piece="${element}" draggable="true" style="width: 80px; height: 80px; border: 2px solid #2980b9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2rem; cursor: grab; background: rgba(41, 128, 185, 0.2);">${element}</div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Размещено: <span id="ecocityCount" style="font-weight: bold;">0</span>/${task.correctOrder.length}</p>
    `;
    
    initializeEcoCity(task.correctOrder);
}

// Инициализация системы компостирования
function initializeCompostSystem(correctOrder) {
    const compostPieces = taskArea.querySelectorAll('.compost-piece');
    const compostSlots = taskArea.querySelectorAll('.compost-slot');
    let placedCount = 0;
    
    compostPieces.forEach(piece => {
        piece.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.dataset.piece);
        });
    });
    
    compostSlots.forEach((slot, slotIndex) => {
        slot.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        slot.addEventListener('drop', function(e) {
            e.preventDefault();
            const piece = e.dataTransfer.getData('text/plain');
            const expectedPiece = correctOrder[slotIndex];
            
            if (!this.hasChildNodes() && piece === expectedPiece) {
                const pieceElement = Array.from(compostPieces).find(p => 
                    p.dataset.piece === piece && !p.dataset.placed
                );
                
                if (pieceElement) {
                    this.innerHTML = piece;
                    this.style.fontSize = '1.8rem';
                    this.style.color = 'white';
                    this.style.display = 'flex';
                    this.style.alignItems = 'center';
                    this.style.justifyContent = 'center';
                    this.style.border = '2px solid #2ecc71';
                    this.style.background = 'rgba(139, 195, 74, 0.3)';
                    
                    pieceElement.style.opacity = '0.3';
                    pieceElement.style.cursor = 'default';
                    pieceElement.draggable = false;
                    pieceElement.dataset.placed = 'true';
                    
                    placedCount++;
                    document.getElementById('compostCount').textContent = placedCount;
                    
                    if (placedCount >= correctOrder.length) {
                        checkTaskBtn.disabled = false;
                        taskResult.textContent = '✅ Отлично! Система компостирования создана!';
                        taskResult.style.color = '#2ecc71';
                    }
                }
            }
        });
    });
}

// Инициализация экологического города
function initializeEcoCity(correctOrder) {
    const ecocityPieces = taskArea.querySelectorAll('.ecocity-piece');
    const ecocitySlots = taskArea.querySelectorAll('.ecocity-slot');
    let placedCount = 0;
    
    ecocityPieces.forEach(piece => {
        piece.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.dataset.piece);
        });
    });
    
    ecocitySlots.forEach((slot, slotIndex) => {
        slot.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        slot.addEventListener('drop', function(e) {
            e.preventDefault();
            const piece = e.dataTransfer.getData('text/plain');
            const expectedPiece = correctOrder[slotIndex];
            
            if (!this.hasChildNodes() && piece === expectedPiece) {
                const pieceElement = Array.from(ecocityPieces).find(p => 
                    p.dataset.piece === piece && !p.dataset.placed
                );
                
                if (pieceElement) {
                    this.innerHTML = piece;
                    this.style.fontSize = '1.8rem';
                    this.style.color = 'white';
                    this.style.display = 'flex';
                    this.style.alignItems = 'center';
                    this.style.justifyContent = 'center';
                    this.style.border = '2px solid #2ecc71';
                    this.style.background = 'rgba(41, 128, 185, 0.3)';
                    
                    pieceElement.style.opacity = '0.3';
                    pieceElement.style.cursor = 'default';
                    pieceElement.draggable = false;
                    pieceElement.dataset.placed = 'true';
                    
                    placedCount++;
                    document.getElementById('ecocityCount').textContent = placedCount;
                    
                    if (placedCount >= correctOrder.length) {
                        checkTaskBtn.disabled = false;
                        taskResult.textContent = '✅ Отлично! Экологичный город построен!';
                        taskResult.style.color = '#2ecc71';
                    }
                }
            }
        });
    });
}

// Инициализация кормушки для птиц
function initializeBirdFeeder(correctOrder) {
    const birdfeederPieces = taskArea.querySelectorAll('.birdfeeder-piece');
    const birdfeederSlots = taskArea.querySelectorAll('.birdfeeder-slot');
    let placedCount = 0;
    
    birdfeederPieces.forEach(piece => {
        piece.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.dataset.piece);
        });
    });
    
    birdfeederSlots.forEach((slot, slotIndex) => {
        slot.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        slot.addEventListener('drop', function(e) {
            e.preventDefault();
            const piece = e.dataTransfer.getData('text/plain');
            const expectedPiece = correctOrder[slotIndex];
            
            if (!this.hasChildNodes() && piece === expectedPiece) {
                const pieceElement = Array.from(birdfeederPieces).find(p => 
                    p.dataset.piece === piece && !p.dataset.placed
                );
                
                if (pieceElement) {
                    this.innerHTML = piece;
                    this.style.fontSize = '1.8rem';
                    this.style.color = 'white';
                    this.style.display = 'flex';
                    this.style.alignItems = 'center';
                    this.style.justifyContent = 'center';
                    this.style.border = '2px solid #2ecc71';
                    this.style.background = 'rgba(243, 156, 18, 0.3)';
                    
                    pieceElement.style.opacity = '0.3';
                    pieceElement.style.cursor = 'default';
                    pieceElement.draggable = false;
                    pieceElement.dataset.placed = 'true';
                    
                    placedCount++;
                    document.getElementById('birdfeederCount').textContent = placedCount;
                    
                    if (placedCount >= correctOrder.length) {
                        checkTaskBtn.disabled = false;
                        taskResult.textContent = '✅ Отлично! Кормушка для птиц готова!';
                        taskResult.style.color = '#2ecc71';
                    }
                }
            }
        });
    });
}

// Улучшенная инициализация сортировки для мобильных
function initializeSortingEnhanced(totalItems) {
    const sortItems = taskArea.querySelectorAll('.sort-item');
    const sortBins = taskArea.querySelectorAll('.sort-bin');
    let sortedCount = 0;
    
    sortItems.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.dataset.type);
        });
        
        // Touch events для мобильных
        item.addEventListener('touchstart', function(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.getBoundingClientRect();
            
            // Создаем копию для перетаскивания
            const clone = this.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.left = (touch.clientX - rect.width/2) + 'px';
            clone.style.top = (touch.clientY - rect.height/2) + 'px';
            clone.style.zIndex = '1000';
            clone.style.opacity = '0.8';
            document.body.appendChild(clone);
            
            const touchMoveHandler = function(e) {
                const touch = e.touches[0];
                clone.style.left = (touch.clientX - rect.width/2) + 'px';
                clone.style.top = (touch.clientY - rect.height/2) + 'px';
            };
            
            const touchEndHandler = function(e) {
                const touch = e.changedTouches[0];
                
                // Проверяем, над каким контейнером отпустили
                sortBins.forEach(bin => {
                    const binRect = bin.getBoundingClientRect();
                    if (touch.clientX >= binRect.left && 
                        touch.clientX <= binRect.right &&
                        touch.clientY >= binRect.top && 
                        touch.clientY <= binRect.bottom) {
                        
                        const itemType = item.dataset.type;
                        const binType = bin.dataset.type;
                        
                        if (itemType === binType) {
                            const binContent = bin.querySelector('.sort-bin-content');
                            binContent.appendChild(item);
                            item.style.margin = '3px';
                            item.style.cursor = 'default';
                            item.draggable = false;
                            item.dataset.placed = 'true';
                            
                            sortedCount++;
                            document.getElementById('sortCount').textContent = sortedCount;
                            
                            if (sortedCount >= totalItems) {
                                checkTaskBtn.disabled = false;
                                taskResult.textContent = '✅ Отлично! Весь мусор отсортирован!';
                                taskResult.style.color = '#2ecc71';
                            }
                        }
                    }
                });
                
                document.body.removeChild(clone);
                document.removeEventListener('touchmove', touchMoveHandler);
                document.removeEventListener('touchend', touchEndHandler);
            };
            
            document.addEventListener('touchmove', touchMoveHandler);
            document.addEventListener('touchend', touchEndHandler);
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
                        checkTaskBtn.disabled = false;
                        taskResult.textContent = '✅ Отлично! Весь мусор отсортирован!';
                        taskResult.style.color = '#2ecc71';
                    }
                }
            }
        });
    });
}

// Создание задания на очистку
function createCleanupTask(task) {
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Кликните по мусору, чтобы очистить реку:</p>
        <div class="river-container" style="width: 100%; height: 300px; background: linear-gradient(to bottom, #3498db, #2980b9); border-radius: 12px; position: relative; margin: 15px 0; overflow: hidden; cursor: crosshair; touch-action: manipulation;">
            ${task.items.map((item, index) => {
                const left = Math.random() * 80 + 10;
                const top = Math.random() * 70 + 15;
                const size = 40 + Math.random() * 20;
                return `<div class="cleanup-item" data-index="${index}" style="position: absolute; left: ${left}%; top: ${top}%; font-size: ${size}px; cursor: pointer; transform: rotate(${Math.random() * 30 - 15}deg); transition: all 0.3s;">${item}</div>`;
            }).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Очищено: <span id="cleanupCount" style="font-weight: bold;">0</span>/${task.goal}</p>
    `;
    
    initializeCleanupEnhanced(task.goal);
}

// Улучшенная инициализация очистки для мобильных
function initializeCleanupEnhanced(goal) {
    const cleanupItems = taskArea.querySelectorAll('.cleanup-item');
    let cleanedCount = 0;
    
    cleanupItems.forEach(item => {
        item.addEventListener('click', function() {
            if (!this.dataset.cleaned) {
                this.style.opacity = '0.2';
                this.style.transform += ' scale(0.7)';
                this.style.transition = 'all 0.3s';
                this.dataset.cleaned = 'true';
                
                cleanedCount++;
                document.getElementById('cleanupCount').textContent = cleanedCount;
                
                if (cleanedCount >= goal) {
                    checkTaskBtn.disabled = false;
                    taskResult.textContent = '✅ Отлично! Река очищена!';
                    taskResult.style.color = '#2ecc71';
                }
            }
        });
        
        // Touch feedback для мобильных
        item.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (!this.dataset.cleaned) {
                this.style.transform += ' scale(1.1)';
            }
        });
        
        item.addEventListener('touchend', function(e) {
            e.preventDefault();
            if (!this.dataset.cleaned) {
                this.style.transform = this.style.transform.replace(' scale(1.1)', '');
            }
        });
    });
}

// Создание задания-пазла
function createPuzzleTask(task) {
    const pieces = task.image.split('');
    const shuffledPieces = [...pieces].sort(() => Math.random() - 0.5);
    
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Соберите пазл в правильном порядке:</p>
        <div class="puzzle-target" style="display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 12px; min-height: 120px; justify-content: center;">
            ${pieces.map((piece, index) => 
                `<div class="puzzle-target-slot" data-index="${index}" style="width: 60px; height: 60px; border: 2px dashed #3498db; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; color: rgba(255,255,255,0.5);">${index + 1}</div>`
            ).join('')}
        </div>
        <p style="text-align: center; margin: 10px 0; font-size: 0.9rem; color: rgba(255,255,255,0.7);">Перетащите кусочки снизу в правильные места</p>
        <div class="puzzle-pieces" style="display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 12px; justify-content: center;">
            ${shuffledPieces.map((piece, index) => 
                `<div class="puzzle-piece" data-piece="${piece}" draggable="true" style="width: 60px; height: 60px; border: 2px solid #3498db; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; cursor: grab; background: rgba(52, 152, 219, 0.2);">${piece}</div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Собрано: <span id="puzzleCount" style="font-weight: bold;">0</span>/${pieces.length}</p>
    `;
    
    initializePuzzleEnhanced(pieces.length);
}

// Улучшенная инициализация пазла для мобильных
function initializePuzzleEnhanced(totalPieces) {
    const puzzlePieces = taskArea.querySelectorAll('.puzzle-piece');
    const puzzleSlots = taskArea.querySelectorAll('.puzzle-target-slot');
    let placedCount = 0;
    
    puzzlePieces.forEach(piece => {
        piece.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.dataset.piece);
        });
        
        // Touch events для мобильных
        piece.addEventListener('touchstart', function(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.getBoundingClientRect();
            
            // Создаем копию для перетаскивания
            const clone = this.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.left = (touch.clientX - rect.width/2) + 'px';
            clone.style.top = (touch.clientY - rect.height/2) + 'px';
            clone.style.zIndex = '1000';
            clone.style.opacity = '0.8';
            document.body.appendChild(clone);
            
            const touchMoveHandler = function(e) {
                const touch = e.touches[0];
                clone.style.left = (touch.clientX - rect.width/2) + 'px';
                clone.style.top = (touch.clientY - rect.height/2) + 'px';
            };
            
            const touchEndHandler = function(e) {
                const touch = e.changedTouches[0];
                
                // Проверяем, над каким слотом отпустили
                puzzleSlots.forEach(slot => {
                    const slotRect = slot.getBoundingClientRect();
                    if (touch.clientX >= slotRect.left && 
                        touch.clientX <= slotRect.right &&
                        touch.clientY >= slotRect.top && 
                        touch.clientY <= slotRect.bottom &&
                        !slot.hasChildNodes()) {
                        
                        slot.innerHTML = piece.innerHTML;
                        slot.style.fontSize = '1.8rem';
                        slot.style.color = 'white';
                        slot.style.display = 'flex';
                        slot.style.alignItems = 'center';
                        slot.style.justifyContent = 'center';
                        slot.style.border = '2px solid #2ecc71';
                        slot.style.background = 'rgba(52, 152, 219, 0.3)';
                        
                        piece.style.opacity = '0.3';
                        piece.style.cursor = 'default';
                        piece.draggable = false;
                        piece.dataset.placed = 'true';
                        
                        placedCount++;
                        document.getElementById('puzzleCount').textContent = placedCount;
                        
                        if (placedCount >= totalPieces) {
                            checkTaskBtn.disabled = false;
                            taskResult.textContent = '✅ Отлично! Пазл собран!';
                            taskResult.style.color = '#2ecc71';
                        }
                    }
                });
                
                document.body.removeChild(clone);
                document.removeEventListener('touchmove', touchMoveHandler);
                document.removeEventListener('touchend', touchEndHandler);
            };
            
            document.addEventListener('touchmove', touchMoveHandler);
            document.addEventListener('touchend', touchEndHandler);
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
                    this.innerHTML = piece;
                    this.style.fontSize = '1.8rem';
                    this.style.color = 'white';
                    this.style.display = 'flex';
                    this.style.alignItems = 'center';
                    this.style.justifyContent = 'center';
                    this.style.border = '2px solid #2ecc71';
                    this.style.background = 'rgba(52, 152, 219, 0.3)';
                    
                    pieceElement.style.opacity = '0.3';
                    pieceElement.style.cursor = 'default';
                    pieceElement.draggable = false;
                    pieceElement.dataset.placed = 'true';
                    
                    placedCount++;
                    document.getElementById('puzzleCount').textContent = placedCount;
                    
                    if (placedCount >= totalPieces) {
                        checkTaskBtn.disabled = false;
                        taskResult.textContent = '✅ Отлично! Пазл собран!';
                        taskResult.style.color = '#2ecc71';
                    }
                }
            }
        });
    });
}

// Создание задания "Найди отличия"
function createSpotDifferenceTask(task) {
    const differences = Array.from({length: task.differences}, (_, i) => i + 1);
    
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Найдите ${task.differences} отличия:</p>
        <div class="difference-container" style="display: flex; flex-direction: column; gap: 20px; margin: 20px 0; align-items: center;">
            <div class="difference-image" style="position: relative;">
                <div style="font-size: 2.5rem; padding: 20px; background: white; border-radius: 10px; text-align: center; min-width: 250px;">${task.image1}</div>
                ${differences.map((_, index) => {
                    const left = Math.random() * 70 + 15;
                    const top = Math.random() * 60 + 20;
                    return `<div class="difference-spot" data-index="${index}" style="position: absolute; left: ${left}%; top: ${top}%; width: 25px; height: 25px; border-radius: 50%; background: rgba(255, 0, 0, 0.3); cursor: pointer; display: none; border: 2px solid red;"></div>`;
                }).join('')}
            </div>
            <div class="difference-image" style="position: relative;">
                <div style="font-size: 2.5rem; padding: 20px; background: white; border-radius: 10px; text-align: center; min-width: 250px;">${task.image2}</div>
            </div>
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Найдено отличий: <span id="differenceCount" style="font-weight: bold;">0</span>/${task.differences}</p>
        <div style="text-align: center; margin-top: 15px;">
            <button class="game-btn small" id="showDifferencesBtn" style="padding: 10px 20px; font-size: 0.9rem;">Показать отличия 🔍</button>
        </div>
    `;
    
    initializeSpotDifferenceEnhanced(task.differences);
}

// Улучшенная инициализация "Найди отличия" для мобильных
function initializeSpotDifferenceEnhanced(totalDifferences) {
    const differenceSpots = taskArea.querySelectorAll('.difference-spot');
    let foundCount = 0;
    
    differenceSpots.forEach(spot => {
        spot.addEventListener('click', function() {
            if (!this.dataset.found) {
                this.style.background = 'rgba(46, 204, 113, 0.7)';
                this.style.border = '2px solid #2ecc71';
                this.dataset.found = 'true';
                
                foundCount++;
                document.getElementById('differenceCount').textContent = foundCount;
                
                if (foundCount >= totalDifferences) {
                    checkTaskBtn.disabled = false;
                    taskResult.textContent = '✅ Отлично! Все отличия найдены!';
                    taskResult.style.color = '#2ecc71';
                }
            }
        });
        
        // Touch events для мобильных
        spot.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (!this.dataset.found) {
                this.style.transform = 'scale(1.2)';
            }
        });
        
        spot.addEventListener('touchend', function(e) {
            e.preventDefault();
            if (!this.dataset.found) {
                this.style.transform = 'scale(1)';
            }
        });
    });
    
    // Кнопка показа отличий
    const showDiffBtn = taskArea.querySelector('#showDifferencesBtn');
    if (showDiffBtn) {
        showDiffBtn.addEventListener('click', function() {
            differenceSpots.forEach(spot => {
                spot.style.display = 'block';
            });
            this.disabled = true;
            this.textContent = 'Отличия показаны 👁️';
            this.style.background = 'var(--secondary)';
        });
        
        // Touch для мобильных
        showDiffBtn.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        });
        
        showDiffBtn.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
        });
    }
}

// Создание задания на последовательность
function createPuzzleSequenceTask(task) {
    const shuffledSequence = [...task.sequence].sort(() => Math.random() - 0.5);
    
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Расположите элементы в правильной последовательности:</p>
        <div class="sequence-target" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 12px; min-height: 120px; justify-content: center;">
            ${task.correctOrder.map((_, index) => 
                `<div class="sequence-slot" data-index="${index}" style="width: 70px; height: 70px; border: 2px dashed #9b59b6; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; color: rgba(255,255,255,0.5);">${index + 1}</div>`
            ).join('')}
        </div>
        <p style="text-align: center; margin: 10px 0; font-size: 0.9rem; color: rgba(255,255,255,0.7);">Перетащите элементы снизу в правильные места</p>
        <div class="sequence-pieces" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 12px; justify-content: center;">
            ${shuffledSequence.map((piece, index) => 
                `<div class="sequence-piece" data-piece="${piece}" draggable="true" style="width: 70px; height: 70px; border: 2px solid #9b59b6; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; cursor: grab; background: rgba(155, 89, 182, 0.2);">${piece}</div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Правильно размещено: <span id="sequenceCount" style="font-weight: bold;">0</span>/${task.correctOrder.length}</p>
    `;
    
    initializeSequenceEnhanced(task.correctOrder);
}

// Улучшенная инициализация последовательности для мобильных
function initializeSequenceEnhanced(correctOrder) {
    const sequencePieces = taskArea.querySelectorAll('.sequence-piece');
    const sequenceSlots = taskArea.querySelectorAll('.sequence-slot');
    let placedCount = 0;
    
    sequencePieces.forEach(piece => {
        piece.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.dataset.piece);
        });
        
        // Touch events для мобильных
        piece.addEventListener('touchstart', function(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.getBoundingClientRect();
            
            // Создаем копию для перетаскивания
            const clone = this.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.left = (touch.clientX - rect.width/2) + 'px';
            clone.style.top = (touch.clientY - rect.height/2) + 'px';
            clone.style.zIndex = '1000';
            clone.style.opacity = '0.8';
            document.body.appendChild(clone);
            
            const touchMoveHandler = function(e) {
                const touch = e.touches[0];
                clone.style.left = (touch.clientX - rect.width/2) + 'px';
                clone.style.top = (touch.clientY - rect.height/2) + 'px';
            };
            
            const touchEndHandler = function(e) {
                const touch = e.changedTouches[0];
                
                // Проверяем, над каким слотом отпустили
                sequenceSlots.forEach((slot, slotIndex) => {
                    const slotRect = slot.getBoundingClientRect();
                    if (touch.clientX >= slotRect.left && 
                        touch.clientX <= slotRect.right &&
                        touch.clientY >= slotRect.top && 
                        touch.clientY <= slotRect.bottom &&
                        !slot.hasChildNodes()) {
                        
                        const pieceValue = piece.dataset.piece;
                        const expectedPiece = correctOrder[slotIndex];
                        
                        if (pieceValue === expectedPiece) {
                            slot.innerHTML = pieceValue;
                            slot.style.fontSize = '1.8rem';
                            slot.style.color = 'white';
                            slot.style.display = 'flex';
                            slot.style.alignItems = 'center';
                            slot.style.justifyContent = 'center';
                            slot.style.border = '2px solid #2ecc71';
                            slot.style.background = 'rgba(155, 89, 182, 0.3)';
                            
                            piece.style.opacity = '0.3';
                            piece.style.cursor = 'default';
                            piece.draggable = false;
                            piece.dataset.placed = 'true';
                            
                            placedCount++;
                            document.getElementById('sequenceCount').textContent = placedCount;
                            
                            if (placedCount >= correctOrder.length) {
                                checkTaskBtn.disabled = false;
                                taskResult.textContent = '✅ Отлично! Последовательность верная!';
                                taskResult.style.color = '#2ecc71';
                            }
                        }
                    }
                });
                
                document.body.removeChild(clone);
                document.removeEventListener('touchmove', touchMoveHandler);
                document.removeEventListener('touchend', touchEndHandler);
            };
            
            document.addEventListener('touchmove', touchMoveHandler);
            document.addEventListener('touchend', touchEndHandler);
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
                    this.innerHTML = piece;
                    this.style.fontSize = '1.8rem';
                    this.style.color = 'white';
                    this.style.display = 'flex';
                    this.style.alignItems = 'center';
                    this.style.justifyContent = 'center';
                    this.style.border = '2px solid #2ecc71';
                    this.style.background = 'rgba(155, 89, 182, 0.3)';
                    
                    pieceElement.style.opacity = '0.3';
                    pieceElement.style.cursor = 'default';
                    pieceElement.draggable = false;
                    pieceElement.dataset.placed = 'true';
                    
                    placedCount++;
                    document.getElementById('sequenceCount').textContent = placedCount;
                    
                    if (placedCount >= correctOrder.length) {
                        checkTaskBtn.disabled = false;
                        taskResult.textContent = '✅ Отлично! Последовательность верная!';
                        taskResult.style.color = '#2ecc71';
                    }
                }
            }
        });
    });
}

// Создание задания по умолчанию
function createDefaultTask(task) {
    taskArea.innerHTML = `
        <p>Задание "${task.description}"</p>
        <p>Для демонстрации нажмите кнопку "Проверить выполнение"</p>
        <div style="margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 12px; text-align: center;">
            <p><strong>Демонстрация задания:</strong></p>
            <p style="font-size: 3rem; margin: 20px 0;">🎯</p>
            <p>Здесь будет интерактивная часть задания</p>
        </div>
    `;
    checkTaskBtn.disabled = false;
}

// Завершение интерактивного задания
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
    
    interactiveTask.style.display = 'none';
    noTaskMessage.style.display = 'block';
    checkTaskBtn.disabled = true;
    completeTaskBtn.disabled = true;
    gameState.taskInProgress = false;
    
    buildBtn.disabled = false;
    rollDiceBtn.disabled = false;
    
    // ТОЛЬКО в журнал (как просили), а в чат отправляем сообщение от игрока
    addLogEntry(`Вы выполнили задание и получили ${coinsEarned} монет и ${expEarned} опыта!`);
    
    savePlayerState();
    showNotification(`✅ Задание выполнено! Вы получили ${coinsEarned} монет и ${expEarned} опыта!`, 'success');
    
    // Обновляем UI игрока
    updatePlayerUI();
}

// ==================== БЫСТРЫЕ КНОПКИ ДЕЙСТВИЙ ====================

// Инициализация быстрых кнопок действий
function initializeQuickActions() {
    let quickActionsVisible = false;
    
    // Показать/скрыть быстрые действия
    quickActionsBtn.addEventListener('click', function() {
        quickActionsVisible = !quickActionsVisible;
        if (quickActionsVisible) {
            quickActions.classList.add('show');
            quickActionsBtn.classList.add('active');
            quickActionsBtn.innerHTML = '<div class="icon">✖️</div>';
        } else {
            quickActions.classList.remove('show');
            quickActionsBtn.classList.remove('active');
            quickActionsBtn.innerHTML = '<div class="icon">⚡</div>';
        }
    });
    
    // Быстрый бросок кубика
    quickDiceBtn.addEventListener('click', function() {
        if (!gameState.gameOver && !gameState.taskInProgress && rollDiceBtn && !rollDiceBtn.disabled) {
            rollDiceBtn.click();
            hideQuickActions();
        }
    });
    
    // Быстрая постройка (прокрутка к зданиям)
    quickBuildBtn.addEventListener('click', function() {
        buildingsSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
        hideQuickActions();
        
        // Подсветка секции зданий
        buildingsSection.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.7)';
        buildingsSection.style.transition = 'box-shadow 0.5s';
        setTimeout(() => {
            buildingsSection.style.boxShadow = '';
        }, 2000);
    });
    
    // Быстрый переход к чату
    quickChatBtn.addEventListener('click', function() {
        const chatSection = document.querySelector('.chat-section');
        if (chatSection) {
            chatSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
            });
            // Фокус на поле ввода
            setTimeout(() => {
                chatInput.focus();
            }, 300);
            hideQuickActions();
        }
    });
    
    // Быстрый переход к заданиям
    quickTasksBtn.addEventListener('click', function() {
        const taskCard = document.querySelector('.task-card');
        if (taskCard) {
            taskCard.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
            });
            hideQuickActions();
        }
    });
    
    // Быстрое приглашение
    quickInviteBtn.addEventListener('click', function() {
        inviteBtn.click();
        hideQuickActions();
    });
    
    // Скрыть быстрые действия
    function hideQuickActions() {
        quickActionsVisible = false;
        quickActions.classList.remove('show');
        quickActionsBtn.classList.remove('active');
        quickActionsBtn.innerHTML = '<div class="icon">⚡</div>';
    }
    
    // Скрыть при клике вне области
    document.addEventListener('click', function(event) {
        if (quickActionsVisible && 
            !quickActionsBtn.contains(event.target) && 
            !quickActions.contains(event.target)) {
            hideQuickActions();
        }
    });
    
    // На мобильных устройствах показываем кнопку быстрых действий
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        quickActionsBtn.style.display = 'flex';
    } else {
        quickActionsBtn.style.display = 'none'; // Скрываем на десктопе по вашему запросу
    }
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

// Переключение информации об игре
gameInfo.addEventListener('click', function(e) {
    if (e.target.tagName === 'H3' || e.target.classList.contains('toggle-icon')) {
        gameInfo.classList.toggle('expanded');
    }
});

// Переключение между вкладками авторизации
loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
});

// Обработка формы входа
loginForm.addEventListener('submit', (e) => {
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

// Обработка формы регистрации
registerForm.addEventListener('submit', (e) => {
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

// Бросок кубика
rollDiceBtn.addEventListener('click', () => {
    if (gameState.gameOver || gameState.taskInProgress) return;
    
    diceValue.classList.add('rolling');
    diceValue.querySelector('.dice-value').textContent = '?';
    rollDiceBtn.disabled = true;
    buildBtn.disabled = true;
    moveBtn.disabled = true;
    
    setTimeout(() => {
        const value = Math.floor(Math.random() * 6) + 1;
        
        diceValue.querySelector('.dice-value').textContent = value;
        diceValue.classList.remove('rolling');
        
        gameState.currentPlayer.position += value;
        if (gameState.currentPlayer.position > 94) {
            gameState.currentPlayer.position = 94;
        }
        
        updatePlayerUI();
        updatePlayerCity();
        
        const randomTask = getRandomTask(gameState.currentDifficulty);
        gameState.currentTask = randomTask;
        
        if (randomTask) {
            currentTask.style.display = 'block';
            taskDescription.textContent = randomTask.description;
            noTaskMessage.style.display = 'none';
            completeTaskBtn.disabled = false;
        }
        
        // ТОЛЬКО в журнал (как просили)
        addLogEntry(`🎲 Вы бросили кубик и выпало: ${value}. Новое положение: ${gameState.currentPlayer.position}`);
        
        updatePlayerMarkers();
        
        // Отправляем на сервер
        socket.emit('dice_roll', {
            diceValue: value,
            newPosition: gameState.currentPlayer.position,
            task: randomTask
        });
        
        savePlayerState();
        
        showNotification(`🎲 Вы переместились на ${value} клеток!`, 'success');
        
        // Включаем кнопку постройки только после выполнения задания
        buildBtn.disabled = true;
        rollDiceBtn.disabled = false;
    }, 1200);
});

// Обновление города игрока
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

// Переход в указанный город
function moveToCity(cityKey) {
    gameState.currentPlayer.city = cityKey;
    updatePlayerUI();
    
    document.querySelectorAll('.city-card').forEach(card => {
        card.classList.remove('active');
        if (card.dataset.city === cityKey) {
            card.classList.add('active');
        }
    });
    
    // ТОЛЬКО в журнал (как просили)
    addLogEntry(`🏙️ Вы прибыли в город: ${gameData.cities[cityKey].name}`);
    
    // ПРОВЕРКА ДЛЯ ПЕРЕМЕЩЕНИЯ МЕЖДУ ГОРОДАМИ (даже если уже прошел дальше)
    const cityKeys = Object.keys(gameData.cities);
    const currentIndex = cityKeys.indexOf(cityKey);
    
    // Проверяем все предыдущие города на 100% прогресс
    let canMoveToAny = false;
    for (let i = 0; i < currentIndex; i++) {
        const prevCityKey = cityKeys[i];
        if (gameState.cityProgress[prevCityKey] >= 100) {
            canMoveToAny = true;
            break;
        }
    }
    
    if (canMoveToAny) {
        moveBtn.disabled = false;
        moveBtn.textContent = "Перейти в другой город ⚡";
    } else if (gameState.cityProgress[cityKey] >= 100) {
        moveBtn.disabled = false;
        moveBtn.textContent = "Перейти в следующий город →";
    } else {
        moveBtn.disabled = true;
        moveBtn.textContent = "Завершите очищение города 🎯";
    }
    
    savePlayerState();
    showNotification(`🏙️ Вы прибыли в ${gameData.cities[cityKey].name}!`, 'success');
    
    setTimeout(() => {
        showCityModal(cityKey);
    }, 500);
}

// Начало выполнения задания
completeTaskBtn.addEventListener('click', () => {
    if (gameState.currentTask && !gameState.taskInProgress) {
        currentTask.style.display = 'none';
        interactiveTask.style.display = 'block';
        completeTaskBtn.disabled = true;
        
        // Создаем интерактивное задание
        createInteractiveTask(gameState.currentTask);
        
        addLogEntry(`🎯 Вы начали выполнение задания: ${gameState.currentTask.description}`);
    } else if (gameState.taskInProgress) {
        showNotification('Задание уже выполняется!', 'warning');
    } else {
        showNotification('Сначала получите задание, бросив кубик!', 'warning');
    }
});

// Проверка задания
checkTaskBtn.addEventListener('click', () => {
    if (gameState.taskInProgress) {
        completeInteractiveTask();
    } else {
        showNotification('Сначала начните выполнение задания!', 'warning');
    }
});

// Выбор сложности задания
difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('locked')) {
            const requiredLevel = gameData.difficultyRequirements[btn.id.replace('Btn', '')].level;
            showNotification(`Для этой сложности требуется ${requiredLevel}-й уровень!`, 'warning');
            return;
        }
        
        difficultyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.currentDifficulty = btn.classList.contains('easy') ? 'easy' : 
                                    btn.classList.contains('medium') ? 'medium' : 'hard';
        addLogEntry(`⚙️ Установлена сложность: ${gameState.currentDifficulty}`);
    });
});

// Отправка сообщения в чат
sendMessageBtn.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message && gameState.currentPlayer) {
        if (message.length > 200) {
            showNotification('Сообщение слишком длинное (макс. 200 символов)', 'warning');
            return;
        }
        sendChatMessage(message);
        chatInput.value = '';
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessageBtn.click();
    }
});

// Приглашение друзей
inviteBtn.addEventListener('click', () => {
    const roomNumber = currentRoomId || gameState.roomId;
    if (roomNumber) {
        const inviteText = `🎮 Присоединяйтесь к моей комнате в игре "Юный эколог"! \n\n🔢 **Номер комнаты:** ${roomNumber} \n🌐 Игра доступна по адресу: ${window.location.origin}`;
        
        showNotification(`📋 Номер комнаты: ${roomNumber} (скопировано в буфер обмена)`, 'info');
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(inviteText).then(() => {
                showNotification('✅ Приглашение скопировано в буфер обмена!', 'success');
            }).catch(() => {
                // Fallback для старых браузеров
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

// Закрытие модальных окон
cityModalCloseBtn.addEventListener('click', closeCityModal);
cityModal.addEventListener('click', (e) => {
    if (e.target === cityModal) closeCityModal();
});

stayBtn.addEventListener('click', () => {
    closeChoiceModal();
    const currentCityData = gameData.cities[gameState.currentPlayer.city];
    const firstCell = currentCityData.cells[0];
    gameState.currentPlayer.position = firstCell;
    updatePlayerUI();
    updatePlayerMarkers();
    addLogEntry(`⏪ Вы остались в ${currentCityData.name} и вернулись в начало города.`);
    savePlayerState();
    showNotification(`⏪ Вы остались в ${currentCityData.name}!`, 'info');
});

moveForwardBtn.addEventListener('click', () => {
    closeChoiceModal();
    moveToCity(gameState.nextCity);
});

choiceModal.addEventListener('click', (e) => {
    if (e.target === choiceModal) closeChoiceModal();
});

// Перемещение в другой город
moveBtn.addEventListener('click', () => {
    if (gameState.gameOver) return;
    
    const cityKeys = Object.keys(gameData.cities);
    const currentIndex = cityKeys.indexOf(gameState.currentPlayer.city);
    
    // Находим следующий город с 100% прогрессом
    let nextCityIndex = -1;
    for (let i = currentIndex + 1; i < cityKeys.length; i++) {
        const cityKey = cityKeys[i];
        if (gameState.cityProgress[cityKey] >= 100) {
            nextCityIndex = i;
            break;
        }
    }
    
    // Если не нашли вперед, ищем назад
    if (nextCityIndex === -1) {
        for (let i = currentIndex - 1; i >= 0; i--) {
            const cityKey = cityKeys[i];
            if (gameState.cityProgress[cityKey] >= 100) {
                nextCityIndex = i;
                break;
            }
        }
    }
    
    if (nextCityIndex !== -1) {
        const nextCity = cityKeys[nextCityIndex];
        const nextPosition = gameData.cities[nextCity].cells[0];
        gameState.currentPlayer.position = nextPosition;
        moveToCity(nextCity);
        
        if (nextCity === "astrakhan") {
            addLogEntry(`🏁 Вы достигли Астрахани! Постройте объект, чтобы завершить игру.`);
            showNotification(`🏁 Вы достигли Астрахани! Постройте объект, чтобы завершить игру.`, 'success');
        }
    } else {
        showNotification(`Необходимо достичь 100% прогресса очищения хотя бы в одном городе для перехода!`, 'warning');
    }
});

// Обработчик выхода из игры
window.addEventListener('beforeunload', () => {
    if (isConnected && gameState.currentPlayer) {
        // Помечаем игрока как отключенного
        gameState.currentPlayer.connected = false;
        savePlayerState();
    }
});

// Восстановление игрока при загрузке
window.addEventListener('load', () => {
    const savedData = getPlayerLocalData();
    if (savedData && savedData.username && savedData.roomId) {
        // Автоматически заполняем форму входа сохраненными данными
        document.getElementById('loginUsername').value = savedData.username;
        document.getElementById('loginRoom').value = savedData.roomId;
        
        // Показываем уведомление о возможности восстановления
        setTimeout(() => {
            showNotification('Найдены сохраненные данные игрока. Нажмите "Войти в комнату" для восстановления.', 'info');
        }, 1000);
    }
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    updateConnectionStatus('connecting', '🔄 Подключение к серверу...');
    console.log('🎮 Игра "Юный эколог" загружена и готова!');
    
    // Инициализация кнопки постройки
    buildBtn.disabled = false;
    
    // Обновляем заголовок карты
    const mapTitle = document.querySelector('.game-board h2');
    if (mapTitle) {
        mapTitle.textContent = 'Игровая карта';
        mapTitle.style.textAlign = 'center';
    }
    
    // Обновляем информацию об игре (убираем английские слова)
    const gameInfoContent = document.querySelector('.game-info-content');
    if (gameInfoContent) {
        gameInfoContent.innerHTML = `
            <p>"Юный эколог" — это увлекательная многопользовательская игра, в которой вы становитесь защитником природы. Ваша задача — пройти маршрут по городам России, решая экологические проблемы и помогая природе.</p>
            
            <p><strong>Особенности игры:</strong></p>
            <ul>
                <li>Реалистичная карта с городами России</li>
                <li>Разнообразные интерактивные экологические задания</li>
                <li>Возможность строить экологические объекты</li>
                <li>Многопользовательский режим до 6 игроков</li>
                <li>Система уровней и достижений</li>
                <li>Рабочие задания с перетаскиванием, сортировкой, викторинами</li>
            </ul>
            
            <p><strong>Как играть:</strong></p>
            <ol>
                <li>Создайте комнату или присоединитесь к существующей</li>
                <li>Бросайте кубик, чтобы перемещаться по карте с шестигранными клетками</li>
                <li>Выполняйте интерактивные экологические задания в городах</li>
                <li>Стройте экологические объекты для улучшения городов</li>
                <li>Общайтесь с другими игроками в чате</li>
                <li>Достигните Астрахани и завершите игру!</li>
            </ol>
            
            <p>Присоединяйтесь к игре и станьте настоящим защитником природы!</p>
        `;
    }
    
    // Создаем плашку с монетами и уровнем в левом верхнем углу
    const statsBar = document.createElement('div');
    statsBar.id = 'statsBar';
    statsBar.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(15px);
        border-radius: 15px;
        padding: 12px 20px;
        display: flex;
        gap: 25px;
        z-index: 999;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        font-size: 0.9rem;
    `;
    
    statsBar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #f39c12; font-weight: bold;">💰</span>
            <span>Монеты: <span id="statsCoins" style="font-weight: bold; color: #f39c12;">0</span></span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #3498db; font-weight: bold;">⭐</span>
            <span>Уровень: <span id="statsLevel" style="font-weight: bold; color: #3498db;">1</span></span>
        </div>
    `;
    
    document.body.appendChild(statsBar);
    
    // Функция обновления плашки статистики
    function updateStatsBar() {
        if (gameState.currentPlayer) {
            document.getElementById('statsCoins').textContent = gameState.currentPlayer.coins || 0;
            document.getElementById('statsLevel').textContent = gameState.currentPlayer.level || 1;
        }
    }
    
    // Периодическое обновление статистики
    setInterval(updateStatsBar, 1000);
    
    // Тестирование подключения
    setTimeout(() => {
        if (!isConnected) {
            showNotification('Не удалось подключиться к серверу. Проверьте запущен ли server.js', 'error');
            updateConnectionStatus('error', '❌ Нет подключения');
        }
    }, 5000);
});
