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
    
    // Если мы были в игре до отключения, пытаемся переподключиться
    if (gameState.currentPlayer && gameState.currentPlayer.name) {
        const storedUsername = localStorage.getItem('lastUsername');
        const storedRoomId = localStorage.getItem('lastRoomId');
        
        if (storedUsername && storedRoomId) {
            console.log('🔄 Пытаемся переподключиться как:', storedUsername);
            socket.emit('player_reconnected', {
                roomId: storedRoomId,
                playerName: storedUsername
            });
            showNotification('Переподключение...', 'info');
        }
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
    
    // Сохраняем данные для возможного переподключения
    if (playerData.name && playerData.roomId) {
        localStorage.setItem('lastUsername', playerData.name);
        localStorage.setItem('lastRoomId', playerData.roomId);
        localStorage.setItem('lastPlayerData', JSON.stringify(playerData));
    }
    
    initializeGame(playerData);
});

// Ошибка присоединения к комнате
socket.on('room-error', (data) => {
    const message = data.message || data;
    if (message.includes('[object Object]')) {
        showNotification('Комнаты с таким номером не существует', 'error');
    } else {
        showNotification(message, 'error');
    }
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

// Получение позиций всех игроков
socket.on('all_players_positions', (data) => {
    console.log('📍 Получены позиции всех игроков:', data);
    
    if (data.players) {
        for (const playerId in data.players) {
            const player = data.players[playerId];
            if (playerId !== gameState.currentPlayerId && player.position) {
                // Обновляем позицию игрока на карте
                updatePlayerMarker(playerId, player.position, player.city, player.color, player.name);
            }
        }
    }
});

// Обновление позиции игрока
socket.on('player_position_update', (data) => {
    if (data.playerId !== gameState.currentPlayerId) {
        updatePlayerMarker(data.playerId, data.position, data.city, data.color, data.playerName);
    }
});

// Игрок переподключился
socket.on('player_reconnected', (data) => {
    console.log('🔄 Игрок переподключился:', data.player.name);
    if (gameState.players[data.playerId]) {
        gameState.players[data.playerId] = data.player;
        gameState.players[data.playerId].connected = true;
        updatePlayersList();
        updatePlayerMarkers();
        addLogEntry(`Игрок "${data.player.name}" переподключился!`);
    }
});

// Игровые данные
const gameData = {
    cities: {
        tver: { 
            name: "Тверь", 
            cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 
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
                description: "Что такое экология?",
                type: "quiz",
                question: "Что такое экология?",
                options: [
                    {text: "Наука о взаимоотношениях живых организмов с окружающей средой", correct: true},
                    {text: "Наука о растениях", correct: false},
                    {text: "Изучение погоды", correct: false},
                    {text: "Наука о животных", correct: false}
                ]
            },
            {
                description: "Разделите мусор на 4 категории",
                type: "sort",
                items: [
                    {name: "Яблоко", type: "organic", emoji: "🍎"},
                    {name: "Газета", type: "paper", emoji: "📰"},
                    {name: "Бутылка", type: "plastic", emoji: "🧴"},
                    {name: "Батарейка", type: "battery", emoji: "🔋"},
                    {name: "Стекло", type: "glass", emoji: "🥃"},
                    {name: "Консервная банка", type: "metal", emoji: "🥫"}
                ]
            },
            {
                description: "Посадите 5 деревьев для очистки воздуха",
                type: "drag",
                goal: 5,
                items: ["🌳", "🌳", "🌳", "🌳", "🌳", "🌳", "🌳"],
                zones: 5
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
                description: "Что такое парниковый эффект?",
                type: "quiz",
                question: "Что такое парниковый эффект?",
                options: [
                    {text: "Удержание тепла в атмосфере Земли парниковыми газами", correct: true},
                    {text: "Эффект от парников для растений", correct: false},
                    {text: "Повышение температуры в городе", correct: false},
                    {text: "Эффект от горячих источников", correct: false}
                ]
            },
            {
                description: "Очистите пляж от 8 единиц мусора",
                type: "clean",
                goal: 8,
                items: ["🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🐚", "🐚", "🐚"]
            },
            {
                description: "Соберите цепочку экологических действий",
                type: "puzzle_sequence",
                sequence: ["🌱", "🌳", "🏭", "💨", "🌍", "🔥"],
                correctOrder: ["🌱", "🌳", "🏭", "💨", "🔥", "🌍"]
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
                description: "Что такое биоразнообразие?",
                type: "quiz",
                question: "Что такое биоразнообразие?",
                options: [
                    {text: "Разнообразие живых организмов во всех их проявлениях", correct: true},
                    {text: "Разнообразие растений в саду", correct: false},
                    {text: "Количество видов в зоопарке", correct: false},
                    {text: "Разнообразие экосистем в городе", correct: false}
                ]
            },
            {
                description: "Создайте экологический город будущего",
                type: "drag_complex",
                goal: 7,
                items: ["🌳", "♻️", "☀️", "💨", "🚲", "🚇", "🏢"],
                zones: 7,
                descriptions: ["Парк", "Перерабатывающий завод", "Солнечные панели", "Ветряки", "Велосипедные дорожки", "Общественный транспорт", "Эко-здания"]
            },
            {
                description: "Что такое экологический след?",
                type: "quiz",
                question: "Что такое экологический след?",
                options: [
                    {text: "Мера воздействия человека на окружающую среду", correct: true},
                    {text: "Следы животных в лесу", correct: false},
                    {text: "Площадь земли для выращивания пищи", correct: false},
                    {text: "Уровень загрязнения воды", correct: false}
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
const buildingsContainer = document.getElementById('buildingsContainer');
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
const choiceModal = document.getElementById('choiceModal');
const stayBtn = document.getElementById('stayBtn');
const moveForwardBtn = document.getElementById('moveForwardBtn');

// ==================== ФУНКЦИИ СЕРВЕРА ====================

// Функция присоединения к игре
function joinGame(username, roomId, isNewRoom) {
    if (!isConnected) {
        showNotification('Нет подключения к серверу. Попробуйте обновить страницу.', 'error');
        return;
    }
    
    // Сохраняем ID комнаты для отображения
    currentRoomId = roomId;
    
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
    
    // Обновляем заголовок карты
    document.querySelector('.game-board h2').textContent = 'Игровая карта';
    document.querySelector('.game-board h2').style.textAlign = 'center';
    
    // Обновляем информацию об игре
    document.querySelector('.game-info-content p').innerHTML = `
        "Юный эколог" — это увлекательная многопользовательская игра, в которой вы становитесь защитником природы. 
        Ваша задача — пройти маршрут по городам России, решая экологические проблемы и помогая природе.
    `;
    
    updatePlayerUI();
    roomNumber.textContent = currentRoomId || gameState.roomId;
    
    // Инициализируем игровые компоненты
    createMap();
    createCitiesGrid();
    createBuildingsList();
    updateDifficultyButtons();
    
    showNotification(`Добро пожаловать в игру, ${playerData.name}!`, 'success');
    
    setTimeout(() => {
        showCityModal(gameState.currentPlayer.city);
    }, 1000);
    
    // Запрашиваем состояние комнаты
    socket.emit('get_room_state');
    
    // Запрашиваем позиции всех игроков
    socket.emit('request_all_positions');
    
    // Удаляем панель быстрых действий с главного экрана
    const quickActionsBtn = document.getElementById('quickActionsBtn');
    const quickActions = document.getElementById('quickActions');
    if (quickActionsBtn) quickActionsBtn.style.display = 'none';
    if (quickActions) quickActions.style.display = 'none';
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

// Функция обновления маркера игрока
function updatePlayerMarker(playerId, position, city, color, playerName) {
    // Находим или создаем маркер
    let marker = document.getElementById(`marker-${playerId}`);
    
    if (!marker) {
        marker = document.createElement('div');
        marker.className = 'player-marker';
        marker.id = `marker-${playerId}`;
        marker.setAttribute('data-player', playerName);
        marker.style.background = color || getRandomColor(playerId);
        marker.style.border = '2px solid white';
        marker.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.7)';
        
        if (playerId === gameState.currentPlayerId) {
            marker.innerHTML = '<i class="fas fa-user" style="font-size: 12px; color: white;"></i>';
            marker.style.border = '3px solid white';
            marker.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.8)';
        } else {
            marker.innerHTML = '<i class="fas fa-user" style="font-size: 10px; color: white;"></i>';
        }
        
        // Добавляем всплывающую подсказку
        const tooltip = document.createElement('div');
        tooltip.className = 'player-tooltip';
        tooltip.textContent = playerName;
        tooltip.style.cssText = 'position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; white-space: nowrap; opacity: 0; transition: opacity 0.3s; pointer-events: none;';
        marker.appendChild(tooltip);
        
        marker.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
        });
        marker.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });
        
        mapGrid.appendChild(marker);
    }
    
    // Обновляем позицию маркера
    const cellNumber = position || 1;
    const row = Math.floor((cellNumber - 1) / 10);
    const col = (cellNumber - 1) % 10;
    
    const leftPercent = (col * 10) + 5;
    const topPercent = (row * 10) + 5;
    
    // Смещение для четных строк (оптимизация для гексагональной сетки)
    if (row % 2 === 1) {
        marker.style.left = `${leftPercent + 2.5}%`;
    } else {
        marker.style.left = `${leftPercent}%`;
    }
    
    marker.style.top = `${topPercent}%`;
    
    // Обновляем подсказку
    const tooltip = marker.querySelector('.player-tooltip');
    if (tooltip) {
        tooltip.textContent = `${playerName} (поз. ${position})`;
    }
}

// Функция для получения случайного цвета
function getRandomColor(playerId) {
    const colors = ['#4ecdc4', '#ff6b6b', '#ffe66d', '#1a535c', '#95e1d3', '#f08a5d'];
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
        hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
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

// Создание карты с шестигранниками (как просили)
function createMap() {
    mapGrid.innerHTML = '';
    
    const riverCells = [14, 15, 16, 17, 30, 31, 44, 45, 46, 59, 60, 61, 62, 63, 64, 65, 78, 79, 80];
    const forestCells = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92];
    
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
        
        updatePlayerMarker(playerId, player.position, player.city, player.color, player.name);
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
            <span>${player.cleaningPoints || 0} баллов (поз. ${player.position || 1})</span>
        `;
        
        playersContainer.appendChild(playerItem);
    }
}

// Обновление интерфейса игрока
function updatePlayerUI() {
    if (gameState.currentPlayer) {
        playerName.textContent = gameState.currentPlayer.name;
        currentCity.textContent = gameData.cities[gameState.currentPlayer.city]?.name || 'Тверь';
        currentPosition.textContent = gameState.currentPlayer.position || 1;
        coinsCount.textContent = gameState.currentPlayer.coins || 100;
        cleaningPoints.textContent = gameState.currentPlayer.cleaningPoints || 0;
        playerLevel.textContent = gameState.currentPlayer.level || 1;
        
        // Обновляем плашку в левом верхнем углу
        updatePlayerStatsBar();
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
                addChatMessage(gameState.currentPlayer.name, `Построил "${building.name}"! 🏗️`);
                
                savePlayerState();
                
                if (gameState.currentPlayer.position >= 94 && gameState.currentPlayer.buildings.length >= 1) {
                    gameState.gameOver = true;
                    addLogEntry(`🎊 Поздравляем! Вы достигли Астрахани и построили объект! Игра завершена.`);
                    addChatMessage(gameState.currentPlayer.name, `🎊 Достиг Астрахани и построил объект! Игра завершена.`);
                    showNotification(`🎊 Поздравляем! Вы достигли Астрахани и построили объект! Игра завершена.`, 'success');
                }
                
                // Показываем уведомление о покупке
                showNotification(`Вы построили "${building.name}" за ${building.cost} монет! Получено ${building.points} баллов очищения. 🎉`, 'success');
                
                // Обновляем список зданий
                createBuildingsList();
            } else {
                showNotification(`Недостаточно монет для постройки "${building.name}"! 💰`, 'warning');
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

// Получение случайного задания
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

// Обновление плашки в левом верхнем углу
function updatePlayerStatsBar() {
    // Создаем или обновляем плашку
    let statsBar = document.getElementById('playerStatsBar');
    
    if (!statsBar) {
        statsBar = document.createElement('div');
        statsBar.id = 'playerStatsBar';
        statsBar.style.cssText = `
            position: fixed;
            top: 80px;
            left: 20px;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 15px;
            padding: 15px;
            z-index: 999;
            color: white;
            font-size: 14px;
            min-width: 150px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            display: none;
        `;
        document.body.appendChild(statsBar);
    }
    
    if (gameContent.style.display === 'block') {
        statsBar.style.display = 'block';
        statsBar.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: var(--secondary); text-align: center;">${gameState.currentPlayer?.name || 'Игрок'}</div>
            <div style="margin-bottom: 5px;">💰 <strong>Монеты:</strong> ${gameState.currentPlayer?.coins || 0}</div>
            <div style="margin-bottom: 5px;">⭐ <strong>Уровень:</strong> ${gameState.currentPlayer?.level || 1}</div>
            <div style="margin-bottom: 5px;">🏆 <strong>Баллы:</strong> ${gameState.currentPlayer?.cleaningPoints || 0}</div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.7); text-align: center; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                Позиция: ${gameState.currentPlayer?.position || 1}
            </div>
        `;
    } else {
        statsBar.style.display = 'none';
    }
}

// ==================== ИНТЕРАКТИВНЫЕ ЗАДАНИЯ ====================

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
    } else if (task.type === "drag_complex") {
        createDragComplexTask(task);
    } else {
        createDefaultTask(task);
    }
    
    checkTaskBtn.disabled = true;
}

// Создание викторины
function createQuizTask(task) {
    taskArea.innerHTML = `
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
            
            taskResult.textContent = isCorrect ? 
                '✅ Правильно! Задание выполнено.' : 
                '❌ Неправильно. Попробуйте еще раз.';
            taskResult.style.color = isCorrect ? '#2ecc71' : '#e74c3c';
            
            if (isCorrect) {
                checkTaskBtn.disabled = false;
            }
        });
    });
}

// Создание задания на перетаскивание
function createDragTask(task) {
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Перетащите ${task.goal} дерева в специальные зоны посадки:</p>
        <div class="drag-container">
            <div class="drag-items" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; max-height: 200px; overflow-y: auto;">
                ${task.items.map((item, index) => 
                    `<div class="draggable-item" data-index="${index}" draggable="true" style="cursor: grab; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; font-size: 2rem; background: linear-gradient(135deg, #3498db, #2980b9); border-radius: 10px;">
                        ${item}
                    </div>`
                ).join('')}
            </div>
            <div class="drop-zones" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0; padding: 15px; background: rgba(46,204,113,0.1); border-radius: 8px; max-height: 200px; overflow-y: auto;">
                ${Array.from({length: task.zones || task.goal}).map((_, index) => 
                    `<div class="drop-zone" data-zone="${index}" style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; border: 3px dashed #2ecc71; border-radius: 10px; background: rgba(46, 204, 113, 0.1);">
                        Зона ${index + 1}
                    </div>`
                ).join('')}
            </div>
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Перетащено: <span id="dragCount">0</span>/${task.goal}</p>
    `;
    
    // Инициализация перетаскивания
    initializeDragAndDrop(task.goal);
}

// Создание сложного задания на перетаскивание
function createDragComplexTask(task) {
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Создайте экологический город будущего, перетащив элементы в зоны:</p>
        <div class="drag-container">
            <div class="drag-items" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; max-height: 200px; overflow-y: auto;">
                ${task.items.map((item, index) => 
                    `<div class="draggable-item" data-index="${index}" draggable="true" style="cursor: grab; width: 70px; height: 70px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 2rem; background: linear-gradient(135deg, #3498db, #2980b9); border-radius: 10px;">
                        ${item}<br><small style="font-size: 10px;">${task.descriptions?.[index] || ''}</small>
                    </div>`
                ).join('')}
            </div>
            <div class="drop-zones" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0; padding: 15px; background: rgba(46,204,113,0.1); border-radius: 8px; max-height: 200px; overflow-y: auto;">
                ${Array.from({length: task.zones || task.goal}).map((_, index) => 
                    `<div class="drop-zone" data-zone="${index}" style="width: 90px; height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 3px dashed #2ecc71; border-radius: 10px; background: rgba(46, 204, 113, 0.1); font-size: 12px; text-align: center;">
                        ${task.descriptions?.[index] || `Зона ${index + 1}`}
                    </div>`
                ).join('')}
            </div>
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Размещено: <span id="dragCount">0</span>/${task.goal}</p>
    `;
    
    // Инициализация перетаскивания
    initializeDragAndDrop(task.goal);
}

// Создание задания на сортировку
function createSortTask(task) {
    const binTypes = {
        paper: { name: "Бумага", emoji: "📄", color: "#3498db" },
        plastic: { name: "Пластик", emoji: "🥤", color: "#e74c3c" },
        glass: { name: "Стекло", emoji: "🍶", color: "#2ecc71" },
        battery: { name: "Батарейки", emoji: "🔋", color: "#f39c12" },
        metal: { name: "Металл", emoji: "🥫", color: "#9b59b6" },
        organic: { name: "Органика", emoji: "🍎", color: "#e67e22" }
    };
    
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Перетащите мусор в правильные контейнеры:</p>
        <div class="sorting-area" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin: 20px 0; max-height: 300px; overflow-y: auto;">
            ${task.items.map(item => binTypes[item.type]).filter((value, index, self) => 
                self.findIndex(v => v.name === value.name) === index
            ).map((data, index) => 
                `<div class="sort-bin" data-type="${Object.keys(binTypes).find(key => binTypes[key].name === data.name)}" style="min-height: 150px; border: 2px solid ${data.color}; border-radius: 8px; padding: 10px; text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">${data.emoji}</div>
                    <div style="font-weight: bold;">${data.name}</div>
                    <div class="sort-bin-content" style="min-height: 80px; margin-top: 10px;"></div>
                </div>`
            ).join('')}
        </div>
        <div class="sort-items" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; max-height: 200px; overflow-y: auto;">
            ${task.items.map((item, index) => 
                `<div class="sort-item" data-index="${index}" data-type="${item.type}" draggable="true" style="cursor: grab; padding: 10px 15px; background: ${binTypes[item.type]?.color || '#95a5a6'}; border-radius: 8px; color: white; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                    ${item.emoji} ${item.name}
                </div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Отсортировано: <span id="sortCount">0</span>/${task.items.length}</p>
    `;
    
    initializeSorting(task.items.length);
}

// Инициализация перетаскивания
function initializeDragAndDrop(goal) {
    const draggables = taskArea.querySelectorAll('.draggable-item');
    const dropZones = taskArea.querySelectorAll('.drop-zone');
    let draggedItem = null;
    let placedCount = 0;
    
    draggables.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            setTimeout(() => {
                this.style.opacity = '0.4';
            }, 0);
        });
        
        item.addEventListener('dragend', function() {
            this.style.opacity = '1';
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
                draggedItem.style.cursor = 'default';
                draggedItem.draggable = false;
                placedCount++;
                
                document.getElementById('dragCount').textContent = placedCount;
                
                if (placedCount >= goal) {
                    checkTaskBtn.disabled = false;
                    taskResult.textContent = '✅ Отлично! Задание выполнено!';
                    taskResult.style.color = '#2ecc71';
                }
            }
        });
    });
}

// Инициализация сортировки
function initializeSorting(totalItems) {
    const sortItems = taskArea.querySelectorAll('.sort-item');
    const sortBins = taskArea.querySelectorAll('.sort-bin');
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
        <div class="river-container" style="width: 100%; height: 300px; background: linear-gradient(to bottom, #3498db, #2980b9); border-radius: 8px; position: relative; margin: 15px 0; overflow: hidden; cursor: crosshair;">
            ${task.items.map((item, index) => {
                const left = Math.random() * 80 + 10;
                const top = Math.random() * 70 + 15;
                return `<div class="cleanup-item" data-index="${index}" style="position: absolute; left: ${left}%; top: ${top}%; font-size: 2rem; cursor: pointer; transform: rotate(${Math.random() * 30 - 15}deg);">${item}</div>`;
            }).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Очищено: <span id="cleanupCount">0</span>/${task.goal}</p>
    `;
    
    initializeCleanup(task.goal);
}

// Инициализация очистки
function initializeCleanup(goal) {
    const cleanupItems = taskArea.querySelectorAll('.cleanup-item');
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
                    checkTaskBtn.disabled = false;
                    taskResult.textContent = '✅ Отлично! Река очищена!';
                    taskResult.style.color = '#2ecc71';
                }
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
        <div class="puzzle-target" style="display: flex; gap: 5px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; min-height: 100px; flex-wrap: wrap;">
            ${pieces.map((piece, index) => 
                `<div class="puzzle-target-slot" data-index="${index}" style="width: 50px; height: 50px; border: 2px dashed #3498db; border-radius: 8px; display: flex; align-items: center; justify-content: center;"></div>`
            ).join('')}
        </div>
        <div class="puzzle-pieces" style="display: flex; flex-wrap: wrap; gap: 5px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
            ${shuffledPieces.map((piece, index) => 
                `<div class="puzzle-piece" data-piece="${piece}" draggable="true" style="width: 50px; height: 50px; border: 2px solid #3498db; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; cursor: grab; background: white;">${piece}</div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Собрано: <span id="puzzleCount">0</span>/${pieces.length}</p>
    `;
    
    initializePuzzle(pieces.length);
}

// Инициализация пазла
function initializePuzzle(totalPieces) {
    const puzzlePieces = taskArea.querySelectorAll('.puzzle-piece');
    const puzzleSlots = taskArea.querySelectorAll('.puzzle-target-slot');
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
        <div class="difference-container" style="display: flex; flex-direction: column; gap: 20px; margin: 20px 0; justify-content: center;">
            <div class="difference-images" style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                <div class="difference-image" style="position: relative;">
                    <div style="font-size: 3rem; padding: 20px; background: white; border-radius: 8px; text-align: center;">${task.image1}</div>
                    ${differences.map((_, index) => {
                        const left = Math.random() * 70 + 15;
                        const top = Math.random() * 60 + 20;
                        return `<div class="difference-spot" data-index="${index}" style="position: absolute; left: ${left}%; top: ${top}%; width: 20px; height: 20px; border-radius: 50%; background: rgba(255, 0, 0, 0.3); cursor: pointer; display: none;"></div>`;
                    }).join('')}
                </div>
                <div class="difference-image" style="position: relative;">
                    <div style="font-size: 3rem; padding: 20px; background: white; border-radius: 8px; text-align: center;">${task.image2}</div>
                </div>
            </div>
            <div style="text-align: center;">
                <button class="game-btn small" id="showDifferencesBtn" style="margin-top: 10px;">Показать отличия 👁️</button>
            </div>
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center;">Найдено отличий: <span id="differenceCount">0</span>/${task.differences}</p>
    `;
    
    initializeSpotDifference(task.differences);
}

// Инициализация "Найди отличия"
function initializeSpotDifference(totalDifferences) {
    const differenceSpots = taskArea.querySelectorAll('.difference-spot');
    let foundCount = 0;
    
    differenceSpots.forEach(spot => {
        spot.addEventListener('click', function() {
            if (!this.dataset.found) {
                this.style.background = 'rgba(46, 204, 113, 0.7)';
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
    });
    
    // Кнопка показа отличий
    const showDiffBtn = taskArea.querySelector('#showDifferencesBtn');
    if (showDiffBtn) {
        showDiffBtn.addEventListener('click', function() {
            differenceSpots.forEach(spot => {
                spot.style.display = 'block';
            });
            this.disabled = true;
        });
    }
}

// Создание задания на последовательность
function createPuzzleSequenceTask(task) {
    const shuffledSequence = [...task.sequence].sort(() => Math.random() - 0.5);
    
    taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Расположите элементы в правильной последовательности:</p>
        <div class="sequence-target" style="display: flex; gap: 5px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; min-height: 100px; flex-wrap: wrap;">
            ${task.correctOrder.map((_, index) => 
                `<div class="sequence-slot" data-index="${index}" style="width: 60px; height: 60px; border: 2px dashed #3498db; border-radius: 8px; display: flex; align-items: center; justify-content: center;"></div>`
            ).join('')}
        </div>
        <div class="sequence-pieces" style="display: flex; flex-wrap: wrap; gap: 5px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
            ${shuffledSequence.map((piece, index) => 
                `<div class="sequence-piece" data-piece="${piece}" draggable="true" style="width: 60px; height: 60px; border: 2px solid #3498db; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2rem; cursor: grab; background: white;">${piece}</div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Правильно размещено: <span id="sequenceCount">0</span>/${task.correctOrder.length}</p>
    `;
    
    initializeSequence(task.correctOrder);
}

// Инициализация последовательности
function initializeSequence(correctOrder) {
    const sequencePieces = taskArea.querySelectorAll('.sequence-piece');
    const sequenceSlots = taskArea.querySelectorAll('.sequence-slot');
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
        <div style="margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
            <p><strong>Демонстрация задания:</strong></p>
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
        addChatMessage(gameState.currentPlayer.name, `Достиг ${gameState.currentPlayer.level}-го уровня! ⭐`);
        updateDifficultyButtons();
        showNotification(`Поздравляем! Вы достигли ${gameState.currentPlayer.level}-го уровня! ⭐`, 'success');
    }
    
    interactiveTask.style.display = 'none';
    noTaskMessage.style.display = 'block';
    checkTaskBtn.disabled = true;
    completeTaskBtn.disabled = true;
    gameState.taskInProgress = false;
    hasCurrentTask = false;
    
    buildBtn.disabled = false;
    rollDiceBtn.disabled = false;
    
    // ТОЛЬКО в журнал (как просили), а в чат отправляем сообщение от игрока
    addLogEntry(`Вы выполнили задание и получили ${coinsEarned} монет и ${expEarned} опыта!`);
    addChatMessage(gameState.currentPlayer.name, `Выполнил задание! ✅`);
    
    savePlayerState();
    showNotification(`Задание выполнено! Вы получили ${coinsEarned} монет и ${expEarned} опыта! 🎉`, 'success');
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
        addLogEntry(`Вы бросили кубик и выпало: ${value}. Новое положение: ${gameState.currentPlayer.position}`);
        
        updatePlayerMarkers();
        
        // Отправляем на сервер
        socket.emit('dice_roll', {
            diceValue: value,
            newPosition: gameState.currentPlayer.position,
            task: randomTask
        });
        
        savePlayerState();
        
        showNotification(`Вы переместились на ${value} клеток!`, 'success');
        
        // Включаем кнопку постройки
        buildBtn.disabled = false;
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
    addLogEntry(`Вы прибыли в город: ${gameData.cities[cityKey].name}`);
    
    if (gameState.cityProgress[cityKey] >= 100) {
        moveBtn.disabled = false;
        moveBtn.textContent = "Перейти в следующий город";
    } else {
        moveBtn.disabled = true;
        moveBtn.textContent = "Завершите очищение города";
    }
    
    savePlayerState();
    showNotification(`Вы прибыли в ${gameData.cities[cityKey].name}!`, 'success');
    
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
        
        addLogEntry(`Вы начали выполнение задания: ${gameState.currentTask.description}`);
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
            showNotification(`Для этой сложности требуется ${requiredLevel}-й уровень! 🔒`, 'warning');
            return;
        }
        
        difficultyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.currentDifficulty = btn.classList.contains('easy') ? 'easy' : 
                                    btn.classList.contains('medium') ? 'medium' : 'hard';
        addLogEntry(`Установлена сложность: ${gameState.currentDifficulty}`);
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
        const inviteText = `Присоединяйтесь к моей комнате в игре "Юный эколог"! 🎮\n\nНомер комнаты: 🏷️ <strong>${roomNumber}</strong> 🏷️\n\nИгра доступна по адресу: ${window.location.origin}\n\nЖду вас в игре! 👋`;
        
        showNotification(`Номер комнаты: ${roomNumber} (скопировано в буфер обмена) 📋`, 'info');
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(inviteText.replace(/<strong>|<\/strong>/g, '')).then(() => {
                showNotification('Приглашение скопировано в буфер обмена! 📋', 'success');
            }).catch(() => {
                // Fallback для старых браузеров
                const textArea = document.createElement('textarea');
                textArea.value = inviteText.replace(/<strong>|<\/strong>/g, '');
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
    addLogEntry(`Вы остались в ${currentCityData.name} и вернулись в начало города.`);
    savePlayerState();
    showNotification(`Вы остались в ${currentCityData.name}!`, 'info');
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
    
    const currentCityKey = gameState.currentPlayer.city;
    
    // Проверяем, можно ли перейти в следующий город
    const cityKeys = Object.keys(gameData.cities);
    const currentIndex = cityKeys.indexOf(currentCityKey);
    
    if (currentIndex < cityKeys.length - 1) {
        const nextCity = cityKeys[currentIndex + 1];
        
        // Разрешаем переход, даже если ушли дальше
        const nextPosition = gameData.cities[nextCity].cells[0];
        gameState.currentPlayer.position = nextPosition;
        moveToCity(nextCity);
        
        if (nextCity === "astrakhan") {
            addLogEntry(`🏁 Вы достигли Астрахани! Постройте объект, чтобы завершить игру.`);
            showNotification(`🏁 Вы достигли Астрахани! Постройте объект, чтобы завершить игру.`, 'success');
        }
    } else {
        showNotification('Вы уже в последнем городе!', 'info');
    }
});

// Обработчик выхода из игры
window.addEventListener('beforeunload', () => {
    if (isConnected) {
        // Помечаем игрока как отключенного
        if (gameState.currentPlayer) {
            gameState.currentPlayer.connected = false;
            savePlayerState();
        }
    }
});

// Обработчик кнопки "Построить объект" - скролл к строительству
buildBtn.addEventListener('click', () => {
    // Прокручиваем к секции строительства
    buildingsSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
    });
    
    // Добавляем подсветку
    buildingsSection.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
    buildingsSection.style.transition = 'box-shadow 0.5s';
    setTimeout(() => {
        buildingsSection.style.boxShadow = '';
    }, 2000);
});

// Периодическая проверка подключения
setInterval(() => {
    if (isConnected && socket.connected) {
        // Проверяем, можно ли что-то делать
        if (gameState.currentPlayer && gameState.currentPlayer.connected === false) {
            // Игрок отключен, пытаемся переподключиться
            const storedUsername = localStorage.getItem('lastUsername');
            const storedRoomId = localStorage.getItem('lastRoomId');
            
            if (storedUsername && storedRoomId) {
                socket.emit('player_reconnected', {
                    roomId: storedRoomId,
                    playerName: storedUsername
                });
            }
        }
    }
}, 10000); // Каждые 10 секунд

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    updateConnectionStatus('connecting', '🔄 Подключение к серверу...');
    console.log('🎮 Игра "Юный эколог" загружена и готова!');
    
    // Инициализация кнопки постройки
    buildBtn.disabled = false;
    
    // Обновляем плашку статистики
    updatePlayerStatsBar();
    
    // Тестирование подключения
    setTimeout(() => {
        if (!isConnected) {
            showNotification('Не удалось подключиться к серверу. Проверьте запущен ли server.js', 'error');
            updateConnectionStatus('error', '❌ Нет подключения');
        }
    }, 5000);
});
