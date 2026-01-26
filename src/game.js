// ==================== ОСНОВНОЙ ФАЙЛ ИГРОВОЙ ЛОГИКИ ====================

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
let lightThemeEnabled = false; // По умолчанию выключена (темная тема включена)

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
    inviteGameUrl: document.getElementById('inviteGameUrl')
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
        if (recentEmojis.length > 10) {
            recentEmojis = recentEmojis.slice(0, 10);
        }
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

// ==================== СТИЛИ ДЛЯ ИГРЫ ====================
// Добавляем стили динамически
const gameStyles = `
/* Полные стили из оригинального файла */
/* Из-за ограничения размера, полные стили не включены здесь */
/* В реальном проекте стили должны быть в отдельном CSS файле */
`;

// Создаем элемент стилей
const styleElement = document.createElement('style');
styleElement.textContent = gameStyles;
document.head.appendChild(styleElement);

// ==================== СВЕТЛАЯ ТЕМА ====================
function toggleLightTheme() {
    lightThemeEnabled = !lightThemeEnabled;
    
    if (lightThemeEnabled) {
        document.body.classList.add('light-theme');
        quickThemeBtn.innerHTML = '🌙<div class="tooltip">Включить темную тему</div>';
        showNotification('🌞 Светлая тема включена!', 'info');
        
        // Сохраняем в localStorage
        localStorage.setItem('lightTheme', 'enabled');
    } else {
        document.body.classList.remove('light-theme');
        quickThemeBtn.innerHTML = '🌞<div class="tooltip">Включить светлую тему</div>';
        showNotification('🌙 Темная тема включена', 'info');
        
        // Сохраняем в localStorage
        localStorage.setItem('lightTheme', 'disabled');
    }
}

// ==================== ВЫБОР СМАЙЛИКОВ ====================
function initEmojiPicker() {
    const emojiCategories = {
        "Эмоции": ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"],
        "Природа": ["🌍", "🌎", "🌏", "🌱", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🌸", "🌹", "🌺", "🌻", "🌼", "💐", "🌷", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "🌪️", "🌫️", "🌊", "💧", "☔", "🔥", "⭐", "🌟", "🌠", "🌈"],
        "Животные": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🐈", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🐇", "🦝", "🦨", "🦡", "🦦", "🦥", "🐁", "🐀", "🐿️", "🦔"],
        "Еда": ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "🫖", "☕", "🍵", "🧃", "🥤", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🍾", "🧊"],
        "Спорт": ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "🤺", "⛹️", "🤾", "🏌️", "🏇", "🧘"],
        "Транспорт": ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🦯", "🦽", "🦼", "🛴", "🚲", "🛵", "🏍️", "🛺", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "✈️", "🛫", "🛬", "🛩️", "💺", "🛰️", "🚀", "🛸", "🚁", "🛶", "⛵", "🚤", "🛥️", "🛳️", "⛴️", "🚢"],
        "Экология": ["🌱", "🌿", "🌳", "🌲", "🌍", "🌎", "🌏", "♻️", "💧", "☀️", "💨", "🔥", "🌀", "🌊", "🦋", "🐝", "🐞", "🌺", "🍃", "🪴", "🏞️", "🗑️", "🚯", "🚮", "🚰", "🚱", "🧴", "🧽", "🛁", "🚿", "🛀", "🧼", "🫧"]
    };
    
    let emojiPickerVisible = false;
    
    // Очищаем пикер
    elements.emojiPicker.innerHTML = '';
    
    // Добавляем секцию недавних смайликов в пикер
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
    
    // Обновляем отображение недавних смайликов в пикере
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
    
    // Добавляем категории смайликов
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
    
    // Инициализируем отображение недавних смайликов в пикере
    updateEmojiPickerRecent();
    
    // Обработчик кнопки смайликов
    elements.emojiPickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPickerVisible = !emojiPickerVisible;
        
        if (emojiPickerVisible) {
            elements.emojiPicker.classList.add('show');
            updateEmojiPickerRecent(); // Обновляем при открытии
        } else {
            elements.emojiPicker.classList.remove('show');
        }
    });
    
    // Закрытие пикера при клике вне его
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
        tver: { 
            name: "Тверь", 
            position: 1,
            description: "Стартовый город",
            history: "Тверь — один из древнейших городов России, основанный в 1135 году. Расположена на берегах рек Волга, Тверца и Тьмака.",
            problem: "Основные экологические проблемы Твери — загрязнение воздуха промышленными предприятиями и транспортными выбросами.",
            task: "Ваша задача — помочь городу справиться с экологическими проблемами путем посадки деревьев и внедрения чистых технологий."
        },
        kineshma: { 
            name: "Кинешма", 
            position: 2,
            description: "Город на Волге",
            history: "Кинешма — старинный город на Волге, известный с 1504 года. Важный промышленный и культурный центр Ивановской области.",
            problem: "Главная экологическая проблема Кинешмы — загрязнение Волги промышленными стоками и бытовыми отходами.",
            task: "Помогите очистить берега Волги от мусора и организовать систему переработки отходов."
        },
        naberezhnye_chelny: { 
            name: "Набережные Челны", 
            position: 3,
            description: "Город автомобилестроителей",
            history: "Набережные Челны — молодой город, основанный в 1930 году. Крупный центр автомобильной промышленности России.",
            problem: "Основные экологические проблемы — загрязнение воздуха автомобильными выбросами и промышленными предприятиями.",
            task: "Помогите внедрить экологичные технологии на автозаводе и развить общественный транспорт."
        },
        kazan: { 
            name: "Казань", 
            position: 4,
            description: "Столица Татарстана",
            history: "Казань — тысячелетний город, столица Республики Татарстан. Крупный культурный, экономический и научный центр России.",
            problem: "Основные экологические проблемы Казани — высокий уровень загрязнения воздуха, транспортные пробки, утилизация отходов.",
            task: "Ваша задача — помочь внедрить экологичные технологии, развить велоинфраструктуру и систему переработки мусора."
        },
        volgograd: { 
            name: "Волгоград", 
            position: 5,
            description: "Город-герой",
            history: "Волгоград — город-герой с богатой историей, известный Сталинградской битвой. Крупный промышленный центр на Волге.",
            problem: "Волгоград страдает от сильного промышленного загрязнения, особенно в районах металлургических и химических заводов.",
            task: "Помогите снизить промышленное загрязнение путем модернизации предприятий и создания зеленых зон."
        },
        astrakhan: { 
            name: "Астрахань", 
            position: 6,
            description: "Конечная точка маршрута",
            history: "Астрахань — древний город в дельте Волги, основанный в 1558 году. Важный рыболовный и транспортный узел.",
            problem: "Ключевые экологические проблемы Астрахани — снижение биоразнообразия, загрязнение вод дельты Волги, опустынивание.",
            task: "Ваша финальная задача — помочь сохранить уникальную экосистему дельты Волги и восстановить природное равновесие."
        }
    },
    tasks: {
        easy: [
            {
                description: "Посадите 3 дерева в парке 🌲",
                type: "drag_click",
                goal: 3,
                items: ["🌲", "🌳", "🌲", "🌲", "🌳"],
                zones: 3,
                correctItems: ["🌲", "🌲", "🌲"]
            },
            {
                description: "Сортируйте мусор по контейнерам 🗑️",
                type: "sort_click",
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
                    {text: "Бумага", correct: false},
                    {text: "Пластиковая бутылка", correct: true},
                    {text: "Банан", correct: false},
                    {text: "Хлопковая футболка", correct: false}
                ]
            },
            {
                description: "Соберите мусор в парке 🧹",
                type: "clean",
                goal: 4,
                items: ["🗑️", "🗑️", "🗑️", "🗑️", "🌿", "🌿", "🌿"]
            },
            {
                description: "Что такое переработка отходы? ♻️",
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
                type: "sort_click",
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
            },
            {
                description: "Соберите простой экологический пазл 🌍",
                type: "puzzle_image",
                pieces: 4,
                imageType: "ecology"
            },
            {
                description: "Найдите парные экологические символы 🎯",
                type: "match_game",
                pairs: 4,
                symbols: ["🌍", "♻️", "🌳", "💧", "🐦", "🐝", "🦋", "🐠"]
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
                type: "puzzle_image",
                pieces: 6,
                imageType: "animals"
            },
            {
                description: "Посадите лес из 6 деревьев 🌲",
                type: "drag_click",
                goal: 6,
                items: ["🌲", "🌲", "🌳", "🌲", "🌲", "🌲", "🌲", "🌳"],
                zones: 6,
                correctItems: ["🌲", "🌲", "🌲", "🌲", "🌲", "🌲"]
            },
            {
                description: "Сортируйте опасные отходы ⚠️",
                type: "sort_click",
                items: [
                    {name: "Батарейки", type: "battery", emoji: "🔋"},
                    {name: "Лампочки", type: "lamp", emoji: "💡"},
                    {name: "Лекарства", type: "medicine", emoji: "💊"},
                    {name: "Химикаты", type: "chemical", emoji: "🧪"}
                ]
            },
            {
                description: "Создайте пищевую цепь 🐟",
                type: "sequence_click",
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
            },
            {
                description: "Создайте экологическую последовательность 🌿",
                type: "sequence_click",
                items: ["🌱", "🌳", "🍎", "♻️"],
                correctOrder: ["🌱", "🌳", "🍎", "♻️"]
            },
            {
                description: "Найдите парные экологические символы 🎯",
                type: "match_game",
                pairs: 6,
                symbols: ["🌍", "♻️", "🌳", "💧", "🐦", "🐝", "🦋", "🐠", "🐻", "🦊", "🐸", "🦉"]
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
                type: "sequence_click",
                items: ["🌱", "🌳", "🏭", "💨", "🌍", "🔥"],
                correctOrder: ["🌱", "🌳", "🏭", "💨", "🔥", "🌍"]
            },
            {
                description: "Соберите сложный экологический пазл 🧩",
                type: "puzzle_image",
                pieces: 9,
                imageType: "nature"
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
                type: "drag_click",
                goal: 8,
                items: ["🌱", "🌳", "💧", "☀️", "🦋", "🐝", "🐞", "🦔", "🌼", "🍄"],
                zones: 8,
                correctItems: ["🌱", "🌳", "💧", "☀️", "🦋", "🐝", "🐞", "🦔"]
            },
            {
                description: "Расставьте стадии переработки ♻️",
                type: "sequence_click",
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
            },
            {
                description: "Найдите все пары животных 🎯",
                type: "match_game",
                pairs: 8,
                symbols: ["🐻", "🦊", "🐰", "🦉", "🐸", "🐢", "🦋", "🐝", "🐞", "🦔", "🐿️", "🦡", "🦅", "🦆", "🦩", "🦜"]
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

// ==================== ДАННЫЕ КАРТЫ ====================
let mapData = {
    cells: [],
    imageLoaded: false
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
    cleanupItems: [],
    cleanupCount: 0,
    reconnected: false,
    playerProgress: {},
    currentTurn: null,
    turnOrder: [],
    isMyTurn: false,
    isAtNewCity: false,
    hasUnfinishedTask: false,
    matchGameState: {
        cards: [],
        flippedCards: [],
        matchedPairs: 0,
        canFlip: true
    },
    quizSelectedAnswer: null,
    visitedCities: {} // Хранит, посещали ли мы уже город
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
    gameState.currentTurn = playerData.currentTurn;
    gameState.turnOrder = playerData.turnOrder || [];
    gameState.isMyTurn = playerData.isMyTurn || false;
    gameState.hasUnfinishedTask = playerData.hasUnfinishedTask || false;
    
    // Загружаем сохраненный прогресс игрока
    if (playerData.playerProgress) {
        gameState.playerProgress[playerData.playerId] = playerData.playerProgress;
    }
    
    initializeGame(playerData);
    
    // Запрашиваем позиции всех игроков после присоединения к комнате
    setTimeout(() => {
        requestAllPlayersPositions();
    }, 1500);
    
    // Обновляем индикатор очереди
    updateTurnIndicator();
    
    // Если есть незавершенное задание, показываем его
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
    const errorMsg = typeof message === 'object' ? message.message : message;
    showNotification(errorMsg || 'Комнаты с таким номером не существует', 'error');
    elements.authSection.style.display = 'block';
    elements.gameContent.style.display = 'none';
    elements.resourcesPlaceholder.style.display = 'none';
    quickActionsBtn.classList.remove('show');
    // Сбрасываем состояние
    resetGameState();
});

socket.on('room_state', (roomData) => {
    console.log('🔄 Получено обновление комнаты:', roomData);
    updateRoomState(roomData);
    
    // Обновляем очередь ходов
    if (roomData.currentTurn) {
        gameState.currentTurn = roomData.currentTurn;
        gameState.turnOrder = roomData.turnOrder || [];
        gameState.isMyTurn = (socket.id === roomData.currentTurn);
        updateTurnIndicator();
    }
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

// Получаем сообщения из чата и отображаем их
socket.on('new_chat_message', (data) => {
    console.log('💬 Получено сообщение от сервера:', data);
    if (data.playerName && data.message) {
        addChatMessage(data.playerName, data.message, false);
    }
});

socket.on('chat_history', (messages) => {
    console.log('💬 Получена история чата:', messages.length, 'сообщений');
    if (messages && Array.isArray(messages)) {
        elements.chatMessages.innerHTML = '';
        messages.forEach(msg => {
            if (msg.playerName && msg.playerName !== 'Система') {
                addChatMessage(msg.playerName, msg.message, false);
            }
        });
    }
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
    // Обновляем прогресс для конкретного игрока
    if (!gameState.playerProgress[data.playerId]) {
        gameState.playerProgress[data.playerId] = {};
    }
    gameState.playerProgress[data.playerId][data.cityKey] = data.progress;
    
    // Если это текущий игрок, обновляем UI
    if (data.playerId === gameState.currentPlayerId) {
        createCurrentCityProgress();
        addLogEntry(`📊 Ваш прогресс очищения города обновлен: ${data.progress}%`);
        
        // Обновляем карточки городов
        createCitiesGrid();
    }
});

socket.on('turn_update', (data) => {
    console.log('🔄 Получено обновление очереди ходов:', data);
    gameState.currentTurn = data.currentTurn;
    gameState.turnOrder = data.turnOrder || [];
    gameState.isMyTurn = (socket.id === data.currentTurn);
    
    updateTurnIndicator();
    
    if (gameState.isMyTurn) {
        showNotification('🎉 Сейчас ваш ход! Бросайте кубик.', 'success');
        elements.rollDiceBtn.disabled = false;
        addLogEntry('🎲 Сейчас ваш ход! Бросайте кубик.');
    } else {
        const currentPlayer = gameState.players[data.currentTurn];
        if (currentPlayer) {
            showNotification(`⏳ Сейчас ходит ${currentPlayer.name}. Ожидайте своей очереди.`, 'info');
            elements.rollDiceBtn.disabled = true;
        }
    }
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
        
        elements.mapOverlay.appendChild(marker);
        console.log(`🆕 Создан маркер для игрока ${playerName}`);
    }
    
    // Находим клетку с указанной позицией
    const cell = mapData.cells.find(c => c.number === position);
    if (cell) {
        marker.style.left = `${cell.x + cell.width/2}px`;
        marker.style.top = `${cell.y + cell.height/2}px`;
        
        const tooltip = marker.querySelector('.player-tooltip');
        if (tooltip) {
            tooltip.textContent = `${playerName} (поз. ${position})`;
        }
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
        elements.notification.classList.add('success');
        elements.notification.style.background = 'var(--success)';
    } else if (type === 'warning') {
        elements.notification.classList.add('warning');
        elements.notification.style.background = 'var(--warning)';
    } else if (type === 'error') {
        elements.notification.classList.add('error');
        elements.notification.style.background = 'var(--accent)';
    } else {
        elements.notification.classList.add('info');
        elements.notification.style.background = 'linear-gradient(135deg, #8e44ad, #3498db)';
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
    
    // Инициализируем прогресс для текущего игрока
    if (!gameState.playerProgress[gameState.currentPlayerId]) {
        gameState.playerProgress[gameState.currentPlayerId] = {};
        for (const cityKey in gameData.cities) {
            gameState.playerProgress[gameState.currentPlayerId][cityKey] = playerData.progress?.[cityKey] || 0;
        }
    }
    
    elements.authSection.style.display = 'none';
    elements.gameContent.style.display = 'block';
    elements.resourcesPlaceholder.style.display = 'flex';
    updatePlayerUI();
    elements.roomNumber.textContent = currentRoomId || gameState.roomId;
    
    loadMap();
    createCitiesGrid();
    createBuildingsList();
    updateDifficultyButtons();
    updateLevelProgress();
    
    initializeQuickActions();
    initEmojiPicker();
    updateRecentEmojisDisplay();
    
    // Обновляем URL игры в приглашении
    elements.inviteGameUrl.textContent = window.location.origin;
    
    // Проверяем сохраненную тему - по умолчанию темная тема
    const savedTheme = localStorage.getItem('lightTheme');
    if (savedTheme === 'enabled') {
        toggleLightTheme(); // Включаем светлую если сохранена
    } else {
        // По умолчанию темная тема
        quickThemeBtn.innerHTML = '🌞<div class="tooltip">Включить светлую тему</div>';
    }
    
    addLogEntry(`🎮 Добро пожаловать в игре, ${playerData.name}!`);
    
    // Обновляем состояние кнопки броска кубика
    updateRollDiceButtonState();
    
    // НЕ показываем информацию о Твери сразу - только при входе в город
    // Вместо этого показываем общее приветствие
    setTimeout(() => {
        showNotification(`🎮 Добро пожаловать в игре, ${playerData.name}! Начните с броска кубика.`, 'success');
    }, 1000);
    
    socket.emit('get_room_state');
    
    if (gameState.reconnected) {
        showNotification('✅ Соединение восстановлено! Вы можете продолжать игру.', 'success');
        elements.buildBtn.disabled = false;
        updateTurnIndicator();
    }
}

function resetGameState() {
    // Сбрасываем состояние игры при выходе из комнаты
    gameState = {
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
        cleanupItems: [],
        cleanupCount: 0,
        reconnected: false,
        playerProgress: {},
        currentTurn: null,
        turnOrder: [],
        isMyTurn: false,
        isAtNewCity: false,
        hasUnfinishedTask: false,
        matchGameState: {
            cards: [],
            flippedCards: [],
            matchedPairs: 0,
            canFlip: true
        },
        quizSelectedAnswer: null,
        visitedCities: {}
    };
    
    hasCurrentTask = false;
    currentRoomId = null;
    
    // Сбрасываем UI
    elements.interactiveTask.style.display = 'none';
    elements.currentTask.style.display = 'none';
    elements.noTaskMessage.style.display = 'block';
    elements.checkTaskBtn.style.display = 'none';
    elements.retryTaskBtn.style.display = 'none';
    elements.completeTaskBtn.style.display = 'block';
    elements.completeTaskBtn.disabled = true;
    elements.completeTaskBtn.textContent = "▶️ Начать выполнение задания";
    elements.rollDiceBtn.disabled = true;
    elements.buildBtn.disabled = true;
    elements.moveBtn.disabled = true;
    elements.taskResult.textContent = '';
    elements.taskArea.innerHTML = '';
}

function updateRoomState(roomData) {
    gameState.players = roomData.players || {};
    gameState.cityProgress = roomData.cityProgress || {};
    
    // Загружаем прогресс игроков, если он есть
    if (roomData.playerProgress) {
        gameState.playerProgress = roomData.playerProgress;
    }
    
    updatePlayersList();
    updatePlayerMarkers();
    elements.onlinePlayers.textContent = Object.keys(gameState.players).filter(id => gameState.players[id].connected).length;
    
    createCurrentCityProgress();
    
    if (gameState.currentPlayerId && gameState.players[gameState.currentPlayerId]) {
        const serverPlayer = gameState.players[gameState.currentPlayerId];
        gameState.currentPlayer = serverPlayer;
        updatePlayerUI();
        
        // Обновляем прогресс из данных сервера
        if (roomData.playerProgress && roomData.playerProgress[gameState.currentPlayerId]) {
            gameState.playerProgress[gameState.currentPlayerId] = roomData.playerProgress[gameState.currentPlayerId];
            createCurrentCityProgress();
            createCitiesGrid();
        }
    }
}

// Функция добавления сообщения в чат
function addChatMessage(sender, message, isLocal = false) {
    console.log(`💬 Добавление сообщения в чат: ${sender}: ${message} (isLocal: ${isLocal})`);
    
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = `<span class="chat-sender">${sender}:</span> <span class="chat-text">${message}</span>`;
    elements.chatMessages.appendChild(messageElement);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    
    // Ищем эмодзи в сообщении и добавляем в недавние
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
    const emojis = message.match(emojiRegex);
    if (emojis) {
        emojis.forEach(emoji => {
            addRecentEmoji(emoji);
        });
    }
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
        connected: true,
        progress: gameState.playerProgress[gameState.currentPlayerId],
        currentTask: gameState.currentTask,
        hasUnfinishedTask: hasCurrentTask || gameState.taskInProgress
    });
}

// Функция отправки сообщения в чат
function sendChatMessage(message) {
    if (isConnected && gameState.currentPlayer) {
        console.log(`📤 Отправка сообщения в чат: ${message}`);
        
        // Отправляем сообщение на сервер
        socket.emit('chat_message', {
            message: message
        });
        
        // Очищаем поле ввода
        elements.chatInput.value = '';
        
        // НЕ добавляем сообщение локально - оно придет от сервера
        // чтобы избежать задвоения
    }
}

// ==================== ФУНКЦИИ ДЛЯ КАРТЫ ====================
function loadMap() {
    console.log('🗺️ Загрузка карты...');
    
    // Используем карту из mapData.js
    if (window.mapData && window.mapData.imageUrl) {
        elements.mapImage.src = window.mapData.imageUrl;
        elements.mapImage.onload = function() {
            console.log('✅ Изображение карты загружено');
            mapData.imageLoaded = true;
            
            // Загружаем сохраненную карту из файла
            loadSavedMap();
            
            // Обновляем маркеры игроков
            updatePlayerMarkers();
        };
        
        elements.mapImage.onerror = function() {
            console.error('❌ Ошибка загрузки изображения карты');
            showNotification('Ошибка загрузки карты', 'error');
            mapData.imageLoaded = false;
            
            // Создаем заглушку
            loadSavedMap();
        };
    } else {
        console.error('❐ Данные карты не найдены в mapData.js');
        showNotification('Данные карты не найдены', 'error');
        
        // Загружаем сохраненную карту из файла
        loadSavedMap();
    }
}

function loadSavedMap() {
    console.log('📂 Загрузка сохраненной карты...');
    
    // Используем данные карты из mapData.js
    if (window.mapData && window.mapData.cells) {
        mapData.cells = window.mapData.cells;
        console.log(`✅ Загружена карта с ${mapData.cells.length} клетками`);
        
        // Создаем клетки на карте
        createMapCells();
        
        // Если есть игроки, обновляем их маркеры
        updatePlayerMarkers();
        
        showNotification('Карта городов России успешно загружена!', 'success');
    } else {
        console.error('❌ Ошибка загрузки карты: данные не найдены');
        
        // Создаем базовую карту с городами
        createDefaultMap();
        showNotification('Используется стандартная карта городов', 'info');
    }
}

function createDefaultMap() {
    console.log('📍 Создание стандартной карты городов');
    
    const containerWidth = elements.mapContainer.offsetWidth;
    const containerHeight = elements.mapContainer.offsetHeight;
    
    // Создаем клетки для каждого города
    const cityPositions = [
        { city: 'tver', x: containerWidth * 0.1, y: containerHeight * 0.3, number: 1, type: 'start' },
        { city: 'kineshma', x: containerWidth * 0.3, y: containerHeight * 0.4, number: 2, type: 'city' },
        { city: 'naberezhnye_chelny', x: containerWidth * 0.5, y: containerHeight * 0.3, number: 3, type: 'city' },
        { city: 'kazan', x: containerWidth * 0.7, y: containerHeight * 0.4, number: 4, type: 'city' },
        { city: 'volgograd', x: containerWidth * 0.6, y: containerHeight * 0.6, number: 5, type: 'city' },
        { city: 'astrakhan', x: containerWidth * 0.8, y: containerHeight * 0.7, number: 6, type: 'finish' }
    ];
    
    mapData.cells = cityPositions.map((pos, index) => ({
        id: index + 1,
        number: pos.number,
        x: pos.x,
        y: pos.y,
        width: 40,
        height: 40,
        type: pos.type,
        city: pos.city,
        description: `Клетка города ${gameData.cities[pos.city]?.name || 'Неизвестный'}`
    }));
    
    createMapCells();
}

function createMapCells() {
    // Очищаем overlay
    elements.mapOverlay.innerHTML = '';
    
    // Создаем клетки (всегда скрытые)
    mapData.cells.forEach(cell => {
        createCellElement(cell);
    });
    
    console.log(`✅ Создано ${mapData.cells.length} клеток на карте`);
    
    // Если есть игроки, обновляем их маркеры
    updatePlayerMarkers();
}

function createCellElement(cell) {
    const cellElement = document.createElement('div');
    cellElement.className = 'map-cell hidden';
    cellElement.dataset.cellId = cell.id;
    cellElement.dataset.cellNumber = cell.number;
    cellElement.dataset.cellType = cell.type;
    cellElement.dataset.city = cell.city || '';
    
    // Позиционируем клетку
    cellElement.style.left = `${cell.x}px`;
    cellElement.style.top = `${cell.y}px`;
    cellElement.style.width = `${cell.width}px`;
    cellElement.style.height = `${cell.height}px`;
    
    // Добавляем классы в зависимости от типа
    if (cell.type === 'start') {
        cellElement.classList.add('start');
    } else if (cell.type === 'finish') {
        cellElement.classList.add('finish');
    } else if (cell.type === 'city') {
        cellElement.classList.add('city');
    }
    
    // Добавляем обработчики событий
    cellElement.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Показываем информацию о городе
        if (cell.type === 'city' && cell.city) {
            showCityModal(cell.city);
        } else if (cell.type === 'start') {
            showNotification('Это стартовая точка игры!', 'info');
        } else if (cell.type === 'finish') {
            showNotification('Это конечная точка игры!', 'info');
        }
    });
    
    elements.mapOverlay.appendChild(cellElement);
    return cellElement;
}

// ==================== ФУНКЦИИ ИНТЕРФЕЙСА ====================
function updatePlayerMarkers() {
    // Удаляем старые маркеры игроков
    document.querySelectorAll('.player-marker').forEach(marker => {
        marker.remove();
    });
    
    requestAllPlayersPositions();
}

function updatePlayersList() {
    elements.playersContainer.innerHTML = '';
    
    // Сортируем игроков по порядку ходов, если есть очередь
    let playersArray = Object.entries(gameState.players);
    
    if (gameState.turnOrder && gameState.turnOrder.length > 0) {
        playersArray.sort((a, b) => {
            const indexA = gameState.turnOrder.indexOf(a[0]);
            const indexB = gameState.turnOrder.indexOf(b[0]);
            return (indexA - indexB);
        });
    }
    
    playersArray.forEach(([playerId, player]) => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.dataset.playerId = playerId;
        
        if (playerId === gameState.currentPlayerId) {
            playerItem.classList.add('current');
        }
        
        if (playerId === gameState.currentTurn) {
            playerItem.classList.add('turn');
        }
        
        if (!player.connected) {
            playerItem.style.opacity = '0.6';
        }
        
        const statusIcon = player.connected ? '🟢' : '🔴';
        const turnIndicator = playerId === gameState.currentTurn ? ' 👑' : '';
        
        playerItem.innerHTML = `
            <span>${statusIcon} ${player.name}${turnIndicator}
                ${playerId === gameState.currentPlayerId ? '<span style="color: #8e44ad;">(Вы)</span>' : ''}
                <span class="player-position-badge">поз. ${player.position || 0}</span>
            </span>
            <span><strong>${player.cleaningPoints}</strong> баллов</span>
        `;
        
        elements.playersContainer.appendChild(playerItem);
    });
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
        
        // Обновляем прогресс уровня
        updateLevelProgress();
    }
}

function updateLevelProgress() {
    if (gameState.currentPlayer) {
        const completedTasks = gameState.currentPlayer.completedTasks || 0;
        const progress = (completedTasks % 3) * 33.33;
        elements.levelProgressFill.style.width = `${progress}%`;
    }
}

function updateTurnIndicator() {
    if (gameState.currentTurn) {
        elements.turnIndicator.style.display = 'block';
        
        if (gameState.isMyTurn) {
            elements.turnIndicator.classList.add('your-turn');
            elements.turnIndicator.classList.remove('other-turn');
            elements.turnMessage.textContent = '🎉 Сейчас ваш ход! Бросайте кубик.';
        } else {
            const currentPlayer = gameState.players[gameState.currentTurn];
            if (currentPlayer) {
                elements.turnIndicator.classList.add('other-turn');
                elements.turnIndicator.classList.remove('your-turn');
                elements.turnMessage.textContent = `⏳ Сейчас ходит ${currentPlayer.name}. Ожидайте своей очереди.`;
            }
        }
    } else {
        elements.turnIndicator.style.display = 'none';
    }
}

function updateRollDiceButtonState() {
    // Отключаем кнопку броска кубика если:
    // 1. Не наш ход
    // 2. Есть незавершенное задание
    // 3. Игра завершена
    // 4. Задание в процессе выполнения
    if (gameState.gameOver || gameState.taskInProgress) {
        elements.rollDiceBtn.disabled = true;
        elements.rollDiceBtn.style.opacity = '0.7';
    } else if (!gameState.isMyTurn) {
        elements.rollDiceBtn.disabled = true;
        elements.rollDiceBtn.style.opacity = '0.7';
    } else if (hasCurrentTask) {
        elements.rollDiceBtn.disabled = true;
        elements.rollDiceBtn.style.opacity = '0.7';
    } else {
        elements.rollDiceBtn.disabled = false;
        elements.rollDiceBtn.style.opacity = '1';
    }
}

function createCurrentCityProgress() {
    elements.cityProgressContainer.innerHTML = '';
    
    if (gameState.currentPlayer && gameState.currentPlayer.city) {
        const cityKey = gameState.currentPlayer.city;
        const city = gameData.cities[cityKey];
        const progress = gameState.playerProgress[gameState.currentPlayerId]?.[cityKey] || 0;
        
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
            <div style="font-size: 0.9rem; color: rgba(255,255,255,0.7); margin-top: 5px;">
                ${progress >= 100 ? '✅ Город полностью очищен!' : `Для перехода в следующий город необходимо достичь 100%`}
            </div>
        `;
        
        elements.cityProgressContainer.appendChild(progressElement);
        
        // Обновляем кнопку перехода
        if (progress >= 100 && canMoveToNextCity()) {
            elements.moveBtn.disabled = false;
            elements.moveBtn.textContent = "🚗 Перейти в следующий город";
        } else {
            elements.moveBtn.disabled = true;
            elements.moveBtn.textContent = "Завершите очищение города";
        }
    }
}

function canMoveToNextCity() {
    if (!gameState.currentPlayerId || !gameState.playerProgress[gameState.currentPlayerId]) {
        return false;
    }
    
    const cityKeys = Object.keys(gameData.cities);
    const currentCityKey = gameState.currentPlayer.city;
    const currentIndex = cityKeys.indexOf(currentCityKey);
    
    if (currentIndex === -1 || currentIndex >= cityKeys.length - 1) {
        return false;
    }
    
    // Проверяем, достигли ли мы нового города
    const newCityKey = cityKeys[currentIndex + 1];
    
    // Находим клетку с позицией игрока
    const currentCell = mapData.cells.find(cell => cell.number === gameState.currentPlayer.position);
    if (!currentCell) return false;
    
    // Проверяем, находится ли игрок в городе (по названию города в клетке)
    return currentCell.city === newCityKey;
}

function createCitiesGrid() {
    elements.citiesGrid.innerHTML = '';
    
    const currentCityKey = gameState.currentPlayer?.city || 'tver';
    
    for (const cityKey in gameData.cities) {
        const city = gameData.cities[cityKey];
        const progress = gameState.playerProgress[gameState.currentPlayerId]?.[cityKey] || 0;
        const isCurrentCity = cityKey === currentCityKey;
        const isCompleted = progress >= 100;
        const isAccessible = canAccessCity(cityKey);
        
        const cityCard = document.createElement('div');
        cityCard.className = 'city-card';
        cityCard.dataset.city = cityKey;
        
        if (isCurrentCity) {
            cityCard.classList.add('active');
        }
        
        if (isCompleted) {
            cityCard.classList.add('completed');
        }
        
        if (isAccessible && !isCurrentCity) {
            cityCard.classList.add('accessible');
        }
        
        // Обновляем информацию о клетках городов
        let cellRange = '';
        switch(cityKey) {
            case 'tver':
                cellRange = '2-13';
                break;
            case 'kineshma':
                cellRange = '18-29';
                break;
            case 'naberezhnye_chelny':
                cellRange = '32-43';
                break;
            case 'kazan':
                cellRange = '47-58';
                break;
            case 'volgograd':
                cellRange = '66-77';
                break;
            case 'astrakhan':
                cellRange = '81-92';
                break;
            default:
                cellRange = '?';
        }
        
        cityCard.innerHTML = `
            <div class="city-name">${city.name}</div>
            <div class="city-position">Клетка: ${cellRange}</div>
            <div class="city-progress-mini">
                <div class="city-progress-fill" style="width: ${progress}%;"></div>
            </div>
            ${isAccessible && !isCurrentCity ? `<button class="city-action-btn" data-city="${cityKey}">🚗 Перейти</button>` : ''}
        `;
        
        // Обработчик клика для просмотра информации о городе
        cityCard.addEventListener('click', (e) => {
            if (!e.target.classList.contains('city-action-btn')) {
                showCityModal(cityKey);
            }
        });
        
        // Обработчик клика для кнопки перехода
        const actionBtn = cityCard.querySelector('.city-action-btn');
        if (actionBtn) {
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                moveToExistingCity(cityKey);
            });
        }
        
        elements.citiesGrid.appendChild(cityCard);
    }
}

function canAccessCity(cityKey) {
    if (!gameState.currentPlayerId || !gameState.playerProgress[gameState.currentPlayerId]) {
        return false;
    }
    
    const playerProgress = gameState.playerProgress[gameState.currentPlayerId];
    const cityKeys = Object.keys(gameData.cities);
    const targetIndex = cityKeys.indexOf(cityKey);
    const currentIndex = cityKeys.indexOf(gameState.currentPlayer?.city || 'tver');
    
    // Можно перейти если:
    // 1. Это текущий город
    // 2. Это предыдущий город
    // 3. Это следующий город и текущий завершен на 100%
    // 4. Любой город, который уже был пройден (прогресс > 0)
    
    const targetProgress = playerProgress[cityKey] || 0;
    
    if (targetIndex < currentIndex) {
        // Предыдущие города доступны всегда
        return true;
    } else if (targetIndex === currentIndex + 1) {
        // Следующий город доступен только если текущий завершен
        const currentProgress = playerProgress[gameState.currentPlayer.city] || 0;
        return currentProgress >= 100;
    } else if (targetIndex > currentIndex + 1) {
        // Города дальше доступны только если все предыдущие завершены
        for (let i = currentIndex + 1; i < targetIndex; i++) {
            const prevCityKey = cityKeys[i];
            if ((playerProgress[prevCityKey] || 0) < 100) {
                return false;
            }
        }
        return true;
    }
    
    return false;
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
                
                // Обновляем прогресс для текущего игрока
                const cityKey = gameState.currentPlayer.city;
                const currentProgress = gameState.playerProgress[gameState.currentPlayerId]?.[cityKey] || 0;
                const newProgress = Math.min(100, currentProgress + 15);
                
                updateCityProgress(cityKey, newProgress);
                
                addLogEntry(`🏗️ Вы построили "${building.name}"! Получено ${building.points} баллов очищения.`);
                
                savePlayerState();
                
                // Проверяем завершение игры
                checkGameCompletion();
                
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
    // Обновляем прогресс для текущего игрока
    if (!gameState.playerProgress[gameState.currentPlayerId]) {
        gameState.playerProgress[gameState.currentPlayerId] = {};
    }
    gameState.playerProgress[gameState.currentPlayerId][cityKey] = progress;
    
    createCurrentCityProgress();
    
    // Отправляем на сервер
    socket.emit('update_progress', {
        cityKey: cityKey,
        progress: progress,
        playerId: gameState.currentPlayerId
    });
    
    savePlayerState();
    createCitiesGrid();
    
    // Проверяем завершение игры
    checkGameCompletion();
}

function checkGameCompletion() {
    if (!gameState.currentPlayerId || !gameState.playerProgress[gameState.currentPlayerId]) {
        return;
    }
    
    const playerProgress = gameState.playerProgress[gameState.currentPlayerId];
    const allCitiesCompleted = Object.values(playerProgress).every(progress => progress >= 100);
    
    // Находим финишную клетку
    const finishCell = mapData.cells.find(cell => cell.type === 'finish');
    const isAtFinish = finishCell && gameState.currentPlayer.position === finishCell.number;
    
    if (allCitiesCompleted && isAtFinish) {
        gameState.gameOver = true;
        addLogEntry(`🎊 Поздравляем! Вы завершили игру! Все города очищены на 100% и вы достигли финиша!`);
        showNotification(`🎊 Поздравляем! Вы завершили игру!`, 'success');
        
        // Отключаем кнопки
        elements.rollDiceBtn.disabled = true;
        elements.buildBtn.disabled = true;
        elements.moveBtn.disabled = true;
        elements.completeTaskBtn.disabled = true;
    }
}

// ==================== УВЕДОМЛЕНИЕ О ПЕРЕХОДЕ В НОВЫЙ ГОРОД ====================
function checkForCityTransition(oldPosition, newPosition) {
    // Находим клетки, на которых находились и оказались
    const oldCell = mapData.cells.find(cell => cell.number === oldPosition);
    const newCell = mapData.cells.find(cell => cell.number === newPosition);
    
    if (!oldCell || !newCell) return;
    
    // Проверяем, перешли ли мы в новый город
    if (newCell.type === 'city' && newCell.city) {
        const cityKey = newCell.city;
        const city = gameData.cities[cityKey];
        
        // Проверяем, был ли игрок уже в этом городе
        const wasInCity = oldCell.city === cityKey;
        
        if (!wasInCity) {
            // Это новый город для игрока
            showNotification(`🏙️ Вы прибыли в ${city.name}! ${city.description}`, 'info');
            addLogEntry(`🏙️ Вы прибыли в город ${city.name}`);
            
            // Показываем информацию о городе только при первом посещении
            if (!gameState.visitedCities[cityKey]) {
                setTimeout(() => {
                    showCityModal(cityKey);
                }, 1000);
                gameState.visitedCities[cityKey] = true;
            }
        }
    }
}

function showCityModal(cityKey) {
    const city = gameData.cities[cityKey];
    if (!city) return;
    
    elements.cityModalTitle.textContent = city.name;
    elements.cityModalSubtitle.textContent = city.description;
    elements.cityModalHistory.textContent = city.history;
    elements.cityModalProblem.textContent = city.problem;
    elements.cityModalTask.textContent = city.task;
    
    // Показываем прогресс
    const progress = gameState.playerProgress[gameState.currentPlayerId]?.[cityKey] || 0;
    elements.cityModalProgressFill.style.width = `${progress}%`;
    elements.cityModalProgressText.textContent = `${progress}%`;
    
    // Показываем кнопку перехода, если город доступен и не текущий
    const isCurrentCity = cityKey === (gameState.currentPlayer?.city || 'tver');
    const isAccessible = canAccessCity(cityKey);
    
    if (isAccessible && !isCurrentCity) {
        elements.cityModalMoveBtn.style.display = 'block';
        elements.cityModalMoveBtn.onclick = () => {
            closeCityModal();
            moveToExistingCity(cityKey);
        };
    } else {
        elements.cityModalMoveBtn.style.display = 'none';
    }
    
    elements.cityModal.classList.add('active');
}

function closeCityModal() {
    elements.cityModal.classList.remove('active');
}

function showInviteModal() {
    elements.inviteRoomNumber.textContent = currentRoomId || gameState.roomId || '0';
    elements.inviteModal.classList.add('active');
}

function closeInviteModal() {
    elements.inviteModal.classList.remove('active');
}

function copyInvitation() {
    const gameUrl = window.location.origin;
    const invitationText = `🎮 Присоединяйтесь к моей комнате в игре "Юный эколог"!\n\n🔢 Номер комнаты: ${currentRoomId || gameState.roomId || '0'}\n\n🌐 Игра доступна по адресу: ${gameUrl}\n\n👥 Ждем вас!`;
    
    navigator.clipboard.writeText(invitationText).then(() => {
        showNotification('Приглашение скопировано в буфер обмена!', 'success');
    }).catch(err => {
        console.error('Ошибка копирования:', err);
        showNotification('Не удалось скопировать приглашение', 'error');
    });
}

function showChoiceModal(nextCity) {
    const currentCityKey = gameState.currentPlayer.city;
    const currentProgress = gameState.playerProgress[gameState.currentPlayerId]?.[currentCityKey] || 0;
    const currentCityName = gameData.cities[currentCityKey]?.name || 'Текущий город';
    
    elements.choiceCurrentCityName.textContent = currentCityName;
    elements.choiceCurrentCityProgress.textContent = `${currentProgress}%`;
    elements.choiceCurrentCityProgressFill.style.width = `${currentProgress}%`;
    
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

// ==================== ИНТЕРАКТИВНЫЕ ЗАДАНИЯ ====================

function getRandomTask(difficulty) {
    const availableTasks = gameData.tasks[difficulty];
    if (!availableTasks || availableTasks.length === 0) {
        // Если нет заданий, создаем простое задание по умолчанию
        return {
            description: "Ответьте на вопрос об экологии",
            type: "quiz",
            question: "Что помогает сохранить природу?",
            options: [
                {text: "Посадка деревьев", correct: true},
                {text: "Сжигание мусора", correct: false},
                {text: "Вырубка лесов", correct: false},
                {text: "Загрязнение рек", correct: false}
            ]
        };
    }
    
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
    
    // Перемешиваем варианты ответов для тестовых заданий
    if (randomTask.type === "quiz" && randomTask.options) {
        randomTask.options = shuffleArray(randomTask.options);
    }
    
    return randomTask;
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function createInteractiveTask(task) {
    elements.taskArea.innerHTML = '';
    elements.taskResult.textContent = '';
    elements.checkTaskBtn.style.display = 'none';
    elements.retryTaskBtn.style.display = 'none';
    gameState.taskInProgress = true;
    hasCurrentTask = true;
    
    gameState.dragItems = [];
    gameState.dropZones = [];
    gameState.sortItems = [];
    gameState.sortBins = [];
    gameState.selectedPuzzlePieces = [];
    gameState.cleanupItems = [];
    gameState.cleanupCount = 0;
    gameState.matchGameState = {
        cards: [],
        flippedCards: [],
        matchedPairs: 0,
        canFlip: true
    };
    
    // Прокручиваем к началу задания
    setTimeout(() => {
        elements.taskArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    // Преобразуем старые типы заданий в новые
    if (task.type === "drag") {
        task.type = "drag_click";
    } else if (task.type === "sort") {
        task.type = "sort_click";
    } else if (task.type === "puzzle") {
        task.type = "puzzle_click";
    } else if (task.type === "puzzle_sequence" || task.type === "sequence") {
        task.type = "sequence_click";
    }
    
    if (task.type === "quiz") {
        createQuizTask(task);
    } else if (task.type === "drag_click") {
        createDragClickTask(task);
    } else if (task.type === "sort_click") {
        createSortClickTask(task);
    } else if (task.type === "clean") {
        createCleanupTask(task);
    } else if (task.type === "puzzle_click") {
        createPuzzleClickTask(task);
    } else if (task.type === "puzzle_image") {
        createPuzzleImageTask(task);
    } else if (task.type === "sequence_click") {
        createSequenceClickTask(task);
    } else if (task.type === "match_game") {
        createMatchGameTask(task);
    } else {
        createDefaultTask(task);
    }
    
    // Кнопка "Начать выполнение задания" меняется на "Проверить выполнение"
    elements.completeTaskBtn.style.display = 'none';
    elements.checkTaskBtn.style.display = 'block';
    elements.checkTaskBtn.textContent = "✅ Проверить выполнение";
    elements.checkTaskBtn.disabled = false;
    
    // Обновляем состояние кнопки броска кубика
    updateRollDiceButtonState();
    
    // Добавляем контейнер для прокрутки на мобильных устройствах
    if (window.innerWidth <= 768) {
        const dragContainers = elements.taskArea.querySelectorAll('.task-container, .drag-container, .sorting-area, .puzzle-area, .sequence-area, .match-grid');
        dragContainers.forEach(container => {
            container.parentNode.classList.add('drag-scroll-container');
            container.classList.add('drag-scroll-content');
        });
    }
}

// Из-за ограничения размера ответа, не все функции заданий включены полностью
// В реальном проекте они должны быть реализованы

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
            } else if (!gameState.isMyTurn) {
                showNotification('Сейчас не ваш ход!', 'warning');
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
            // Прокручиваем к доступным объектам
            const buildingsContainer = document.getElementById('buildingsContainer');
            if (buildingsContainer) {
                buildingsContainer.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Подсвечиваем секцию зданий
                elements.buildingsSection.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                elements.buildingsSection.style.transition = 'box-shadow 0.5s';
                setTimeout(() => {
                    elements.buildingsSection.style.boxShadow = '';
                }, 2000);
            }
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
        
        showInviteModal();
    });
    
    quickThemeBtn.addEventListener('click', function() {
        quickActions.classList.remove('show');
        quickActionsBtn.classList.remove('active');
        quickActionsVisible = false;
        
        toggleLightTheme();
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
        updateRollDiceButtonState();
        
        if (gameState.gameOver) {
            quickDiceBtn.style.opacity = '0.5';
            quickDiceBtn.style.cursor = 'not-allowed';
            quickDiceBtn.title = 'Игра завершена';
            quickBuildBtn.style.opacity = '0.5';
            quickBuildBtn.style.cursor = 'not-allowed';
            quickBuildBtn.title = 'Игра завершена';
        } else {
            if (!gameState.isMyTurn) {
                quickDiceBtn.style.opacity = '0.5';
                quickDiceBtn.style.cursor = 'not-allowed';
                quickDiceBtn.title = 'Сейчас не ваш ход';
            } else if (hasCurrentTask || gameState.taskInProgress) {
                quickDiceBtn.style.opacity = '0.5';
                quickDiceBtn.style.cursor = 'not-allowed';
                quickDiceBtn.title = 'Сначала выполните задание';
            } else {
                quickDiceBtn.style.opacity = '1';
                quickDiceBtn.style.cursor = 'pointer';
                quickDiceBtn.title = 'Бросить кубик';
            }
            
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

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

// Обработчики событий для авторизации
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
    const roomId = document.getElementById('loginRoom').value.trim();
    
    if (username && roomId) {
        joinGame(username, roomId, false);
    }
});

elements.registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value.trim();
    const roomId = document.getElementById('registerRoom').value.trim();
    
    if (username && roomId) {
        joinGame(username, roomId, true);
    }
});

// Обработчики событий для игровых действий
elements.rollDiceBtn.addEventListener('click', () => {
    if (gameState.gameOver || gameState.taskInProgress || hasCurrentTask || !gameState.isMyTurn) {
        return;
    }
    
    elements.diceValue.classList.add('rolling');
    elements.rollDiceBtn.disabled = true;
    
    // Генерируем случайное значение кубика (1-6)
    const diceValue = Math.floor(Math.random() * 6) + 1;
    
    setTimeout(() => {
        elements.diceValue.classList.remove('rolling');
        elements.diceValue.querySelector('.dice-value').textContent = diceValue;
        
        // Сохраняем старую позицию
        const oldPosition = gameState.currentPlayer.position;
        
        // Вычисляем новую позицию
        let newPosition = gameState.currentPlayer.position + diceValue;
        
        // Проверяем, не вышли ли за пределы карты
        const maxPosition = mapData.cells.length;
        if (newPosition > maxPosition) {
            newPosition = maxPosition;
        }
        
        // Обновляем позицию игрока
        gameState.currentPlayer.position = newPosition;
        
        // Определяем город на основе позиции
        const cell = mapData.cells.find(c => c.number === newPosition);
        if (cell && cell.city) {
            gameState.currentPlayer.city = cell.city;
        }
        
        updatePlayerUI();
        
        // Получаем задание
        const task = getRandomTask(gameState.currentDifficulty);
        gameState.currentTask = task;
        
        // Отображаем задание
        elements.currentTask.style.display = 'block';
        elements.taskDescription.textContent = task.description;
        elements.noTaskMessage.style.display = 'none';
        elements.completeTaskBtn.disabled = false;
        hasCurrentTask = true;
        
        // Отправляем результат броска на сервер
        socket.emit('player_dice_roll', {
            diceValue: diceValue,
            newPosition: newPosition,
            task: task,
            playerId: gameState.currentPlayerId
        });
        
        // Отправляем обновление позиции
        sendPlayerPositionToServer(newPosition, gameState.currentPlayer.city);
        
        // Обновляем маркер игрока
        updatePlayerMarkers();
        
        // Проверяем переход в новый город
        checkForCityTransition(oldPosition, newPosition);
        
        addLogEntry(`🎲 Вы бросили кубик: ${diceValue}. Переместились на позицию ${newPosition}`);
        
        // Сохраняем состояние
        savePlayerState();
        
        // Показываем уведомление
        showNotification(`🎲 Вы бросили кубик: ${diceValue}! Новое положение: ${newPosition}`, 'success');
        
        // Передаем ход следующему игроку
        socket.emit('end_turn');
        gameState.isMyTurn = false;
        updateTurnIndicator();
    }, 1200);
});

elements.completeTaskBtn.addEventListener('click', () => {
    if (gameState.currentTask) {
        elements.interactiveTask.style.display = 'block';
        elements.currentTask.style.display = 'none';
        createInteractiveTask(gameState.currentTask);
    }
});

elements.buildBtn.addEventListener('click', () => {
    if (hasCurrentTask) {
        showNotification('Сначала выполните текущее задание!', 'warning');
        return;
    }
    
    // Прокручиваем к секции зданий
    elements.buildingsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

elements.moveBtn.addEventListener('click', () => {
    if (hasCurrentTask) {
        showNotification('Сначала выполните текущее задание!', 'warning');
        return;
    }
    
    // Находим следующий город
    const cityKeys = Object.keys(gameData.cities);
    const currentCityKey = gameState.currentPlayer.city;
    const currentIndex = cityKeys.indexOf(currentCityKey);
    
    if (currentIndex < cityKeys.length - 1) {
        const nextCityKey = cityKeys[currentIndex + 1];
        const nextCity = gameData.cities[nextCityKey];
        
        // Находим первую клетку следующего города
        const nextCityCell = mapData.cells.find(cell => cell.city === nextCityKey);
        if (nextCityCell) {
            // Сохраняем старую позицию
            const oldPosition = gameState.currentPlayer.position;
            
            // Перемещаем игрока
            gameState.currentPlayer.position = nextCityCell.number;
            gameState.currentPlayer.city = nextCityKey;
            
            updatePlayerUI();
            
            // Отправляем обновление позиции
            sendPlayerPositionToServer(nextCityCell.number, nextCityKey);
            
            // Обновляем маркер
            updatePlayerMarkers();
            
            // Проверяем переход в новый город
            checkForCityTransition(oldPosition, nextCityCell.number);
            
            // Обновляем UI
            createCitiesGrid();
            createCurrentCityProgress();
            
            addLogEntry(`🚗 Вы перешли в следующий город: ${nextCity.name}`);
            showNotification(`🚗 Вы перешли в ${nextCity.name}!`, 'success');
            
            // Сохраняем состояние
            savePlayerState();
        }
    }
});

elements.checkTaskBtn.addEventListener('click', () => {
    // Проверка задания будет выполняться в конкретных функциях заданий
});

elements.retryTaskBtn.addEventListener('click', () => {
    // Повтор задания будет выполняться в конкретных функциях заданий
});

// Обработчики для выбора сложности
elements.difficultyBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        if (this.classList.contains('locked')) {
            showNotification('Этот уровень сложности заблокирован. Повысьте уровень игрока!', 'warning');
            return;
        }
        
        elements.difficultyBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        gameState.currentDifficulty = this.id.replace('Btn', '');
        
        showNotification(`Установлена сложность: ${this.textContent.trim()}`, 'info');
    });
});

// Обработчики для чата
elements.sendMessageBtn.addEventListener('click', () => {
    const message = elements.chatInput.value.trim();
    if (message && gameState.currentPlayer) {
        sendChatMessage(message);
    }
});

elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && gameState.currentPlayer) {
        const message = elements.chatInput.value.trim();
        if (message) {
            sendChatMessage(message);
        }
    }
});

// Обработчики для модальных окон
elements.cityModalCloseBtn.addEventListener('click', closeCityModal);
elements.cityModal.addEventListener('click', (e) => {
    if (e.target === elements.cityModal) {
        closeCityModal();
    }
});

elements.stayBtn.addEventListener('click', () => {
    closeChoiceModal();
    showNotification('Вы остались в текущем городе', 'info');
});

elements.moveForwardBtn.addEventListener('click', () => {
    closeChoiceModal();
    // Здесь будет логика перехода вперед
});

elements.choiceModal.addEventListener('click', (e) => {
    if (e.target === elements.choiceModal) {
        closeChoiceModal();
    }
});

// Обработчики для приглашения
elements.inviteBtn.addEventListener('click', showInviteModal);
elements.copyInviteBtn.addEventListener('click', copyInvitation);
elements.closeInviteBtn.addEventListener('click', closeInviteModal);
elements.inviteModal.addEventListener('click', (e) => {
    if (e.target === elements.inviteModal) {
        closeInviteModal();
    }
});

// Обработчик для выхода из комнаты
elements.leaveRoomBtn.addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите покинуть комнату?')) {
        resetGameState();
        elements.authSection.style.display = 'block';
        elements.gameContent.style.display = 'none';
        elements.resourcesPlaceholder.style.display = 'none';
        quickActionsBtn.classList.remove('show');
        showNotification('Вы покинули комнату', 'info');
        
        // Отключаемся от комнаты на сервере
        socket.emit('leave_room');
    }
});

// Обработчик для информации об игре
elements.gameInfo.querySelector('h3').addEventListener('click', function() {
    elements.gameInfo.classList.toggle('expanded');
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Игра "Юный эколог" инициализируется...');
    
    // Обновляем URL в приглашении
    elements.inviteGameUrl.textContent = window.location.origin;
    
    // Инициализируем отображение недавних смайликов
    updateRecentEmojisDisplay();
});
