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
let lightThemeEnabled = false; // По умолчанию выключена (темная тема включена)

// Профиль игрока и настройки
let userProfile = JSON.parse(localStorage.getItem('userProfile')) || {
    name: '',
    avatar: '',
    birthDate: '',
    gender: 'not_set'
};

// Доступные цвета для фишек
const AVAILABLE_COLORS = [
    { name: 'Зеленый', hex: '#2ecc71' },
    { name: 'Красный', hex: '#e74c3c' },
    { name: 'Желтый', hex: '#f1c40f' },
    { name: 'Синий', hex: '#3498db' },
    { name: 'Фиолетовый', hex: '#9b59b6' },
    { name: 'Оранжевый', hex: '#e67e22' }
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
    colorGrid: document.getElementById('colorGrid'),
    
    // Новые элементы для профиля и настроек
    userProfileBadge: document.getElementById('userProfileBadge'),
    userAvatar: document.getElementById('userAvatar'),
    googleSignInBtn: document.getElementById('googleSignInBtn'),
    loginUsername: document.getElementById('loginUsername'),
    registerUsername: document.getElementById('registerUsername'),
    settingsForm: document.getElementById('settingsForm'),
    avatarUpload: document.getElementById('avatarUpload'),
    settingsAvatarPreview: document.getElementById('settingsAvatarPreview'),
    settingsDisplayName: document.getElementById('settingsDisplayName'),
    settingsBirthDate: document.getElementById('settingsBirthDate'),
    settingsGender: document.getElementById('settingsGender'),
    avatarChipOption: document.getElementById('avatarChipOption'),
    chipAvatarPreview: document.getElementById('chipAvatarPreview'),
    statsList: document.getElementById('statsList')
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

// ==================== НАСТРОЙКИ ПРОФИЛЯ И СТАТИСТИКА ====================
function updateProfileUI() {
    if (userProfile.avatar) {
        elements.userAvatar.src = userProfile.avatar;
        if(elements.settingsAvatarPreview) elements.settingsAvatarPreview.src = userProfile.avatar;
        if(elements.chipAvatarPreview) elements.chipAvatarPreview.src = userProfile.avatar;
        
        // Показываем бейдж и скрываем кнопку Google, если аватар установлен (даже без входа)
        elements.googleSignInBtn.style.display = 'none';
        elements.userProfileBadge.style.display = 'inline-block';
    }
    if (userProfile.name) {
        if(elements.settingsDisplayName) elements.settingsDisplayName.value = userProfile.name;
        if(elements.loginUsername) elements.loginUsername.value = userProfile.name;
        if(elements.registerUsername) elements.registerUsername.value = userProfile.name;
    }
    if (userProfile.birthDate && elements.settingsBirthDate) elements.settingsBirthDate.value = userProfile.birthDate;
    if (userProfile.gender && elements.settingsGender) elements.settingsGender.value = userProfile.gender;
}

// Обработка загрузки картинки (аватарки)
if (elements.avatarUpload) {
    elements.avatarUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                elements.settingsAvatarPreview.src = event.target.result;
            };
            reader.readAsDataURL(file); // Конвертация в Base64
        }
    });
}

// Сохранение настроек
if (elements.settingsForm) {
    elements.settingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        userProfile.name = elements.settingsDisplayName.value.trim();
        userProfile.birthDate = elements.settingsBirthDate.value;
        userProfile.gender = elements.settingsGender.value;
        userProfile.avatar = elements.settingsAvatarPreview.src;

        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        updateProfileUI();

        document.getElementById('settingsModal').classList.remove('active');
        showNotification('Настройки профиля сохранены!', 'success');
    });
}

// Обновление окна со статистикой игр
function updateStatsUI() {
    let stats = JSON.parse(localStorage.getItem('gameStats')) || [];
    if (stats.length === 0) {
        if(elements.statsList) {
            elements.statsList.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; padding: 30px 0;">Ваша история игр пока пуста...</p>';
        }
        return;
    }
    
    if(elements.statsList) {
        elements.statsList.innerHTML = stats.map(stat => `
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong style="color: #3498db;">Комната: ${stat.room}</strong>
                    <span style="color: #aaa; font-size: 0.85rem;">${stat.date}</span>
                </div>
                <div style="font-size: 0.9rem;">
                    Очки: <span style="color: #2ecc71; font-weight: bold;">${stat.points}</span> | 
                    Уровень: <span style="color: #f1c40f; font-weight: bold;">${stat.level}</span>
                </div>
            </div>
        `).join('');
    }
}

// ==================== ВЫБОР СМАЙЛИКОВ ====================
function initEmojiPicker() {
    const emojiCategories = {
        "Эмоции": ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"],
        "Природа": ["🌍", "🌎", "🌏", "🌱", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🌸", "🌹", "🌺", "🌻", "🌼", "💐", "🌷", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "🌪️", "🌫️", "🌊", "💧", "☔", "🔥", "⭐", "🌟", "🌠", "🌈"],
        "Животные": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🐈", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🐇", "🦝", "🦨", "🦡", "🦦", "🦥", "🐁", "🐀", "🐿️", "🦔"],
        "Еда": ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "🫖", "☕", "🍵", "🧃", "🥤", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🍾", "🧊"]
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
            name: "Тверь", position: 1, description: "Стартовый город",
            history: "Тверь — один из древнейших городов России, основанный в 1135 году.",
            problem: "Основные экологические проблемы Твери — загрязнение воздуха.",
            task: "Ваша задача — помочь городу справиться с экологическими проблемами."
        },
        kineshma: { 
            name: "Кинешма", position: 2, description: "Город на Волге",
            history: "Кинешма — старинный город на Волге, известный с 1504 года.",
            problem: "Главная экологическая проблема Кинешмы — загрязнение Волги.",
            task: "Помогите очистить берега Волги от мусора."
        },
        naberezhnye_chelny: { 
            name: "Набережные Челны", position: 3, description: "Город автомобилестроителей",
            history: "Набережные Челны — молодой город, основанный в 1930 году.",
            problem: "Основные экологические проблемы — загрязнение воздуха выбросами.",
            task: "Помогите внедрить экологичные технологии на автозаводе."
        },
        kazan: { 
            name: "Казань", position: 4, description: "Столица Татарстана",
            history: "Казань — тысячелетний город, столица Республики Татарстан.",
            problem: "Основные экологические проблемы Казани — высокий уровень загрязнения воздуха.",
            task: "Ваша задача — помочь внедрить систему переработки мусора."
        },
        volgograd: { 
            name: "Волгоград", position: 5, description: "Город-герой",
            history: "Волгоград — город-герой с богатой историей, известный Сталинградской битвой.",
            problem: "Волгоград страдает от сильного промышленного загрязнения.",
            task: "Помогите снизить промышленное загрязнение."
        },
        astrakhan: { 
            name: "Астрахань", position: 6, description: "Конечная точка маршрута",
            history: "Астрахань — древний город в дельте Волги.",
            problem: "Ключевые экологические проблемы Астрахани — снижение биоразнообразия.",
            task: "Ваша финальная задача — помочь сохранить уникальную экосистему."
        }
    },
    buildings: [
        { name: "Станция переработки", cost: 50, points: 100, description: "Перерабатывает мусор и уменьшает загрязнение" },
        { name: "Солнечная электростанция", cost: 100, points: 200, description: "Производит чистую энергию из солнечного света" },
        { name: "Эко-парк", cost: 150, points: 300, description: "Создает зеленую зону для отдыха и очистки воздуха" },
        { name: "Ветряная мельница", cost: 200, points: 400, description: "Производит энергию из ветра" },
        { name: "Очистные сооружения", cost: 250, points: 500, description: "Очищает воду от загрязнений" }
    ],
    difficultyRequirements: {
        easy: { level: 1 }, medium: { level: 5 }, hard: { level: 10 }
    }
};

let mapData = { cells: [], imageLoaded: false };

let gameState = {
    currentPlayer: null, currentPlayerId: null, players: {}, roomId: null, cityProgress: {},
    currentTask: null, currentDifficulty: "easy", gameOver: false,
    usedTasks: { easy: [], medium: [], hard: [] }, nextCity: null, askedForChoice: {},
    taskInProgress: false, dragItems: [], dropZones: [], sortItems: [], sortBins: [],
    selectedPuzzlePieces: [], cleanupItems: [], cleanupCount: 0, reconnected: false,
    playerProgress: {}, currentTurn: null, turnOrder: [], isMyTurn: false,
    isAtNewCity: false, hasUnfinishedTask: false,
    matchGameState: { cards: [], flippedCards: [], matchedPairs: 0, canFlip: true },
    quizSelectedAnswer: null, visitedCities: {}
};

// ==================== ФУНКЦИИ ВЫБОРА ЦВЕТА И АВАТАРКИ ====================
function showColorModal() {
    renderColorGrid();
    elements.colorModal.classList.add('active');
}

// Обработка клика по кнопке "Использовать аватар"
if(elements.avatarChipOption) {
    elements.avatarChipOption.addEventListener('click', () => {
        if (userProfile.avatar) {
            selectColor(userProfile.avatar); // Передаем URL/Base64 аватарки как "цвет"
        } else {
            showNotification('Сначала загрузите фото в настройках профиля или войдите через Google!', 'warning');
        }
    });
}

function renderColorGrid() {
    if (!elements.colorGrid) return;
    elements.colorGrid.innerHTML = '';
    
    // Получаем цвета/аватары, уже выбранные другими игроками в комнате
    const takenColors = Object.values(gameState.players)
        .filter(p => p.id !== socket.id && p.hasSelectedColor)
        .map(p => p.color);

    AVAILABLE_COLORS.forEach(colorObj => {
        const btn = document.createElement('div');
        btn.className = 'color-btn';
        btn.style.backgroundColor = colorObj.hex;
        btn.title = colorObj.name;

        // Если цвет занят, блокируем кнопку
        if (takenColors.includes(colorObj.hex)) {
            btn.classList.add('disabled');
        } else {
            btn.addEventListener('click', () => {
                selectColor(colorObj.hex);
            });
        }

        elements.colorGrid.appendChild(btn);
    });
}

function selectColor(colorOrAvatar) {
    elements.colorModal.classList.remove('active');
    
    if (gameState.currentPlayer) {
        gameState.currentPlayer.color = colorOrAvatar;
        gameState.currentPlayer.hasSelectedColor = true;
        
        // Отправляем выбранный цвет (или base64/URL картинки) на сервер
        socket.emit('select_color', { color: colorOrAvatar });

        // Обновляем свою фишку на карте
        updateOtherPlayerMarker(
            gameState.currentPlayerId,
            gameState.currentPlayer.name,
            gameState.currentPlayer.position,
            gameState.currentPlayer.city,
            colorOrAvatar
        );

        showNotification('Фишка успешно обновлена!', 'success');
        savePlayerState();
    }
}

// ==================== СЛУШАТЕЛИ СОБЫТИЙ SOCKET.IO ====================
socket.on('connect', () => {
    console.log('✅ Подключено к серверу');
    isConnected = true;
    
    // Если мы переподключились, сообщаем серверу
    if (gameState.currentPlayerId && gameState.reconnected) {
        socket.emit('player_reconnected');
        console.log('🔄 Уведомили сервер о восстановлении соединения');
    }
    
    setTimeout(() => { requestAllPlayersPositions(); }, 2000);
});

socket.on('disconnect', () => {
    console.log('❌ Отключено от сервера');
    isConnected = false;
    gameState.reconnected = true;
    showNotification('Потеряно соединение с сервером', 'error');
});

socket.on('connect_error', (error) => {
    console.log('❌ Ошибка подключения:', error);
    isConnected = false;
});

socket.on('join-success', (playerData) => {
    console.log('✅ Успешно присоединились к комнате', playerData);
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
    
    if (!playerData.hasSelectedColor) {
        setTimeout(() => { showColorModal(); }, 800);
    }
    
    setTimeout(() => { requestAllPlayersPositions(); }, 1500);
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

socket.on('player_color_updated', (data) => {
    const { playerId, color } = data;
    if (gameState.players[playerId]) {
        gameState.players[playerId].color = color;
        gameState.players[playerId].hasSelectedColor = true;
        
        const player = gameState.players[playerId];
        updateOtherPlayerMarker(playerId, player.name, player.position, player.city, color);
        
        if (elements.colorModal.classList.contains('active')) {
            renderColorGrid();
        }
    }
});

socket.on('room-error', (message) => {
    const errorMsg = typeof message === 'object' ? message.message : message;
    showNotification(errorMsg || 'Комнаты с таким номером не существует', 'error');
    elements.authSection.style.display = 'block';
    elements.gameContent.style.display = 'none';
    elements.resourcesPlaceholder.style.display = 'none';
    quickActionsBtn.classList.remove('show');
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
    setTimeout(() => { requestAllPlayersPositions(); }, 1000);
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
    if (data.playerName && data.message) {
        addChatMessage(data.playerName, data.message, false);
    }
});

socket.on('chat_history', (messages) => {
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
        
        updateOtherPlayerMarker(
            data.playerId, 
            gameState.players[data.playerId].name, 
            data.newPosition, 
            '', 
            gameState.players[data.playerId].color
        );
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
        addLogEntry(`📊 Ваш прогресс очищения города обновлен: ${data.progress}%`);
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
        socket.emit('player_position_update', { position: position, city: city });
    }
}

function requestAllPlayersPositions() {
    if (socket.connected) socket.emit('request_all_positions');
}

function updateOtherPlayerMarker(playerId, playerName, position, city, colorOrAvatar) {
    let marker = document.getElementById(`marker-${playerId}`);
    
    // Проверяем, является ли строка с цветом Base64 картинкой или URL
    let isAvatar = colorOrAvatar && (colorOrAvatar.startsWith('data:image') || colorOrAvatar.startsWith('http'));
    
    if (!marker) {
        marker = document.createElement('div');
        marker.className = 'player-marker';
        marker.id = `marker-${playerId}`;
        marker.setAttribute('data-player', playerName);
        marker.style.border = '2px solid white';
        marker.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.7)';
        
        const tooltip = document.createElement('div');
        tooltip.className = 'player-tooltip';
        tooltip.textContent = playerName;
        tooltip.style.cssText = 'position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; white-space: nowrap; opacity: 0; transition: opacity 0.3s; pointer-events: none;';
        marker.appendChild(tooltip);
        
        marker.addEventListener('mouseenter', () => tooltip.style.opacity = '1');
        marker.addEventListener('mouseleave', () => tooltip.style.opacity = '0');
        
        elements.mapOverlay.appendChild(marker);
    } 
    
    // Применяем заливку цветом или устанавливаем картинку как фон
    if (colorOrAvatar) {
        if (isAvatar) {
            marker.style.backgroundImage = `url(${colorOrAvatar})`;
            marker.style.backgroundColor = 'transparent';
            marker.innerHTML = ''; // Убираем иконку по умолчанию
        } else {
            marker.style.backgroundImage = 'none';
            marker.style.backgroundColor = colorOrAvatar;
            marker.innerHTML = '<i class="fas fa-user" style="font-size: 10px; color: white;"></i>';
        }
    } else {
        marker.style.backgroundColor = getRandomColor(playerId);
        marker.innerHTML = '<i class="fas fa-user" style="font-size: 10px; color: white;"></i>';
    }
    
    const cell = mapData.cells.find(c => c.number === position);
    if (cell) {
        marker.style.left = `${cell.x + cell.width/2}px`;
        marker.style.top = `${cell.y + cell.height/2}px`;
        
        const tooltip = marker.querySelector('.player-tooltip');
        if (tooltip) tooltip.textContent = `${playerName} (поз. ${position})`;
    }
    
    updatePlayerInList(playerId, position, playerName);
}

function getRandomColor(playerId) {
    const colors = ['#4ecdc4', '#ff6b6b', '#1dd1a1', '#54a0ff', '#ff9ff3', '#feca57', '#ff9f43', '#00d2d3', '#5f27cd', '#ff9e1f'];
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
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
    if (!found) updatePlayersList();
}

socket.on('player_position_update', (data) => {
    const { playerId, playerName, position, city, color } = data;
    if (playerId !== socket.id) {
        updateOtherPlayerMarker(playerId, playerName, position, city, color);
    }
});

socket.on('all_players_positions', (data) => {
    const { players } = data;
    for (const playerId in players) {
        const player = players[playerId];
        updateOtherPlayerMarker(playerId, player.name, player.position, player.city, player.color);
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
    setTimeout(() => { elements.notification.classList.remove('show'); }, 3000);
}

function joinGame(username, roomId, isNewRoom) {
    if (!isConnected) {
        showNotification('Нет подключения к серверу. Попробуйте обновить страницу.', 'error');
        return;
    }
    currentRoomId = roomId;
    socket.emit('join-room', { roomId: roomId, playerName: username, isNewRoom: isNewRoom });
    showNotification('Подключаемся к комнате...', 'info');
}

function initializeGame(playerData) {
    gameState.currentPlayer = playerData;
    gameState.currentPlayerId = socket.id;
    
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
    
    const savedTheme = localStorage.getItem('lightTheme');
    if (savedTheme === 'enabled') {
        toggleLightTheme(); 
    } else {
        quickThemeBtn.innerHTML = '🌞<div class="tooltip">Включить светлую тему</div>';
    }
    
    addLogEntry(`🎮 Добро пожаловать в игре, ${playerData.name}!`);
    updateRollDiceButtonState();
    
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
    gameState = {
        currentPlayer: null, currentPlayerId: null, players: {}, roomId: null, cityProgress: {},
        currentTask: null, currentDifficulty: "easy", gameOver: false,
        usedTasks: { easy: [], medium: [], hard: [] }, nextCity: null, askedForChoice: {},
        taskInProgress: false, dragItems: [], dropZones: [], sortItems: [], sortBins: [],
        selectedPuzzlePieces: [], cleanupItems: [], cleanupCount: 0, reconnected: false,
        playerProgress: {}, currentTurn: null, turnOrder: [], isMyTurn: false,
        isAtNewCity: false, hasUnfinishedTask: false,
        matchGameState: { cards: [], flippedCards: [], matchedPairs: 0, canFlip: true },
        quizSelectedAnswer: null, visitedCities: {}
    };
    hasCurrentTask = false;
    currentRoomId = null;
    
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
    if (roomData.playerProgress) gameState.playerProgress = roomData.playerProgress;
    
    updatePlayersList();
    updatePlayerMarkers();
    elements.onlinePlayers.textContent = Object.keys(gameState.players).filter(id => gameState.players[id].connected).length;
    
    createCurrentCityProgress();
    
    if (gameState.currentPlayerId && gameState.players[gameState.currentPlayerId]) {
        gameState.currentPlayer = gameState.players[gameState.currentPlayerId];
        updatePlayerUI();
        if (roomData.playerProgress && roomData.playerProgress[gameState.currentPlayerId]) {
            gameState.playerProgress[gameState.currentPlayerId] = roomData.playerProgress[gameState.currentPlayerId];
            createCurrentCityProgress();
            createCitiesGrid();
        }
    }
}

function addChatMessage(sender, message, isLocal = false) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = `<span class="chat-sender">${sender}:</span> <span class="chat-text">${message}</span>`;
    elements.chatMessages.appendChild(messageElement);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
    const emojis = message.match(emojiRegex);
    if (emojis) emojis.forEach(emoji => addRecentEmoji(emoji));
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
        hasSelectedColor: gameState.currentPlayer.hasSelectedColor || false,
        connected: true,
        progress: gameState.playerProgress[gameState.currentPlayerId],
        currentTask: gameState.currentTask,
        hasUnfinishedTask: hasCurrentTask || gameState.taskInProgress
    });
}

function sendChatMessage(message) {
    if (isConnected && gameState.currentPlayer) {
        socket.emit('chat_message', { message: message });
        elements.chatInput.value = '';
    }
}

// ==================== ФУНКЦИИ ДЛЯ КАРТЫ ====================
function loadMap() {
    if (window.mapData && window.mapData.imageUrl) {
        elements.mapImage.src = window.mapData.imageUrl;
        elements.mapImage.onload = function() {
            mapData.imageLoaded = true;
            loadSavedMap();
            updatePlayerMarkers();
        };
        elements.mapImage.onerror = function() {
            mapData.imageLoaded = false;
            loadSavedMap();
        };
    } else {
        loadSavedMap();
    }
}

function loadSavedMap() {
    fetch('eco-game-map-2025-12-27.json')
        .then(response => {
            if (!response.ok) throw new Error('Файл карты не найден');
            return response.json();
        })
        .then(savedMap => {
            if (savedMap.cells && Array.isArray(savedMap.cells)) {
                mapData.cells = savedMap.cells;
                createMapCells();
                updatePlayerMarkers();
            } else {
                throw new Error('Некорректный формат файла карты');
            }
        })
        .catch(error => {
            console.error('❌ Ошибка загрузки карты:', error);
            createDefaultMap();
        });
}

function createDefaultMap() {
    const containerWidth = elements.mapContainer.offsetWidth;
    const containerHeight = elements.mapContainer.offsetHeight;
    
    const cityPositions = [
        { city: 'tver', x: containerWidth * 0.1, y: containerHeight * 0.3, number: 1, type: 'start' },
        { city: 'kineshma', x: containerWidth * 0.3, y: containerHeight * 0.4, number: 2, type: 'city' },
        { city: 'naberezhnye_chelny', x: containerWidth * 0.5, y: containerHeight * 0.3, number: 3, type: 'city' },
        { city: 'kazan', x: containerWidth * 0.7, y: containerHeight * 0.4, number: 4, type: 'city' },
        { city: 'volgograd', x: containerWidth * 0.6, y: containerHeight * 0.6, number: 5, type: 'city' },
        { city: 'astrakhan', x: containerWidth * 0.8, y: containerHeight * 0.7, number: 6, type: 'finish' }
    ];
    
    mapData.cells = cityPositions.map((pos, index) => ({
        id: index + 1, number: pos.number, x: pos.x, y: pos.y, width: 40, height: 40,
        type: pos.type, city: pos.city, description: `Клетка города ${gameData.cities[pos.city]?.name || 'Неизвестный'}`
    }));
    createMapCells();
}

function createMapCells() {
    elements.mapOverlay.innerHTML = '';
    mapData.cells.forEach(cell => createCellElement(cell));
    updatePlayerMarkers();
}

function createCellElement(cell) {
    const cellElement = document.createElement('div');
    cellElement.className = 'map-cell hidden';
    cellElement.dataset.cellId = cell.id;
    cellElement.dataset.cellNumber = cell.number;
    cellElement.dataset.cellType = cell.type;
    cellElement.dataset.city = cell.city || '';
    
    cellElement.style.left = `${cell.x}px`;
    cellElement.style.top = `${cell.y}px`;
    cellElement.style.width = `${cell.width}px`;
    cellElement.style.height = `${cell.height}px`;
    
    if (cell.type === 'start') cellElement.classList.add('start');
    else if (cell.type === 'finish') cellElement.classList.add('finish');
    else if (cell.type === 'city') cellElement.classList.add('city');
    
    cellElement.addEventListener('click', function(e) {
        e.stopPropagation();
        if (cell.type === 'city' && cell.city) showCityModal(cell.city);
        else if (cell.type === 'start') showNotification('Это стартовая точка игры!', 'info');
        else if (cell.type === 'finish') showNotification('Это конечная точка игры!', 'info');
    });
    
    elements.mapOverlay.appendChild(cellElement);
    return cellElement;
}

// ==================== ФУНКЦИИ ИНТЕРФЕЙСА ====================
function updatePlayerMarkers() {
    document.querySelectorAll('.player-marker').forEach(marker => marker.remove());
    requestAllPlayersPositions();
}

function updatePlayersList() {
    elements.playersContainer.innerHTML = '';
    
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
        
        if (playerId === gameState.currentPlayerId) playerItem.classList.add('current');
        if (playerId === gameState.currentTurn) playerItem.classList.add('turn');
        if (!player.connected) playerItem.style.opacity = '0.6';
        
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
        
        elements.topCoinsCount.textContent = gameState.currentPlayer.coins;
        elements.topPlayerLevel.textContent = gameState.currentPlayer.level + ' ур.';
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
    if (gameState.gameOver || gameState.taskInProgress || !gameState.isMyTurn || hasCurrentTask) {
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
    if (!gameState.currentPlayerId || !gameState.playerProgress[gameState.currentPlayerId]) return false;
    
    const cityKeys = Object.keys(gameData.cities);
    const currentCityKey = gameState.currentPlayer.city;
    const currentIndex = cityKeys.indexOf(currentCityKey);
    
    if (currentIndex === -1 || currentIndex >= cityKeys.length - 1) return false;
    
    const newCityKey = cityKeys[currentIndex + 1];
    const currentCell = mapData.cells.find(cell => cell.number === gameState.currentPlayer.position);
    if (!currentCell) return false;
    
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
        
        if (isCurrentCity) cityCard.classList.add('active');
        if (isCompleted) cityCard.classList.add('completed');
        if (isAccessible && !isCurrentCity) cityCard.classList.add('accessible');
        
        let cellRange = '';
        switch(cityKey) {
            case 'tver': cellRange = '2-13'; break;
            case 'kineshma': cellRange = '18-29'; break;
            case 'naberezhnye_chelny': cellRange = '32-43'; break;
            case 'kazan': cellRange = '47-58'; break;
            case 'volgograd': cellRange = '66-77'; break;
            case 'astrakhan': cellRange = '81-92'; break;
            default: cellRange = '?';
        }
        
        cityCard.innerHTML = `
            <div class="city-name">${city.name}</div>
            <div class="city-position">Клетка: ${cellRange}</div>
            <div class="city-progress-mini">
                <div class="city-progress-fill" style="width: ${progress}%;"></div>
            </div>
            ${isAccessible && !isCurrentCity ? `<button class="city-action-btn" data-city="${cityKey}">🚗 Перейти</button>` : ''}
        `;
        
        cityCard.addEventListener('click', (e) => {
            if (!e.target.classList.contains('city-action-btn')) showCityModal(cityKey);
        });
        
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
    if (!gameState.currentPlayerId || !gameState.playerProgress[gameState.currentPlayerId]) return false;
    
    const playerProgress = gameState.playerProgress[gameState.currentPlayerId];
    const cityKeys = Object.keys(gameData.cities);
    const targetIndex = cityKeys.indexOf(cityKey);
    const currentIndex = cityKeys.indexOf(gameState.currentPlayer?.city || 'tver');
    
    if (targetIndex < currentIndex) return true;
    else if (targetIndex === currentIndex + 1) return (playerProgress[gameState.currentPlayer.city] || 0) >= 100;
    else if (targetIndex > currentIndex + 1) {
        for (let i = currentIndex + 1; i < targetIndex; i++) {
            if ((playerProgress[cityKeys[i]] || 0) < 100) return false;
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
                
                const cityKey = gameState.currentPlayer.city;
                const currentProgress = gameState.playerProgress[gameState.currentPlayerId]?.[cityKey] || 0;
                const newProgress = Math.min(100, currentProgress + 15);
                updateCityProgress(cityKey, newProgress);
                
                addLogEntry(`🏗️ Вы построили "${building.name}"! Получено ${building.points} баллов очищения.`);
                savePlayerState();
                checkGameCompletion();
                showNotification(`✅ Успешно построено "${building.name}" за ${building.cost} монет!`, 'success');
                createBuildingsList();
            } else {
                showNotification(`❌ Недостаточно монет для постройки "${building.name}"! Нужно ${building.cost} монет.`, 'warning');
            }
        });
    });
}

function updateCityProgress(cityKey, progress) {
    if (!gameState.playerProgress[gameState.currentPlayerId]) {
        gameState.playerProgress[gameState.currentPlayerId] = {};
    }
    gameState.playerProgress[gameState.currentPlayerId][cityKey] = progress;
    
    createCurrentCityProgress();
    
    socket.emit('update_progress', {
        cityKey: cityKey,
        progress: progress,
        playerId: gameState.currentPlayerId
    });
    
    savePlayerState();
    createCitiesGrid();
    checkGameCompletion();
}

function checkGameCompletion() {
    if (!gameState.currentPlayerId || !gameState.playerProgress[gameState.currentPlayerId]) return;
    
    const playerProgress = gameState.playerProgress[gameState.currentPlayerId];
    const allCitiesCompleted = Object.values(playerProgress).every(progress => progress >= 100);
    
    const finishCell = mapData.cells.find(cell => cell.type === 'finish');
    const isAtFinish = finishCell && gameState.currentPlayer.position === finishCell.number;
    
    if (allCitiesCompleted && isAtFinish) {
        gameState.gameOver = true;
        addLogEntry(`🎊 Поздравляем! Вы завершили игру! Все города очищены на 100% и вы достигли финиша!`);
        showNotification(`🎊 Поздравляем! Вы завершили игру!`, 'success');
        
        elements.rollDiceBtn.disabled = true;
        elements.buildBtn.disabled = true;
        elements.moveBtn.disabled = true;
        elements.completeTaskBtn.disabled = true;

        // Сохраняем статистику
        let stats = JSON.parse(localStorage.getItem('gameStats')) || [];
        stats.unshift({
            date: new Date().toLocaleDateString(),
            room: gameState.roomId || currentRoomId,
            points: gameState.currentPlayer.cleaningPoints,
            level: gameState.currentPlayer.level
        });
        localStorage.setItem('gameStats', JSON.stringify(stats));
        updateStatsUI();
    }
}

// ==================== УВЕДОМЛЕНИЕ О ПЕРЕХОДЕ В НОВЫЙ ГОРОД ====================
function checkForCityTransition(oldPosition, newPosition) {
    const oldCell = mapData.cells.find(cell => cell.number === oldPosition);
    const newCell = mapData.cells.find(cell => cell.number === newPosition);
    
    if (!oldCell || !newCell) return;
    
    if (newCell.type === 'city' && newCell.city) {
        const cityKey = newCell.city;
        const city = gameData.cities[cityKey];
        const wasInCity = oldCell.city === cityKey;
        
        if (!wasInCity) {
            showNotification(`🏙️ Вы прибыли в ${city.name}! ${city.description}`, 'info');
            addLogEntry(`🏙️ Вы прибыли в город ${city.name}`);
            
            if (!gameState.visitedCities[cityKey]) {
                setTimeout(() => { showCityModal(cityKey); }, 1000);
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
    
    const progress = gameState.playerProgress[gameState.currentPlayerId]?.[cityKey] || 0;
    elements.cityModalProgressFill.style.width = `${progress}%`;
    elements.cityModalProgressText.textContent = `${progress}%`;
    
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
    const invitationText = `🎮 Присоединяйтесь к моей комнате в игре "Юный эколог"!\n\n🔢 Номер комнаты: ${currentRoomId || gameState.roomId || '0'}\n\n🌐 Игра доступна по адресу: https://eco-game-dfb0.onrender.com\n\n👥 Ждем вас!`;
    navigator.clipboard.writeText(invitationText).then(() => {
        showNotification('Приглашение скопировано в буфер обмена!', 'success');
    }).catch(err => {
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
    if (playerLevel >= 5) elements.mediumBtn.classList.remove('locked');
    else elements.mediumBtn.classList.add('locked');
    if (playerLevel >= 10) elements.hardBtn.classList.remove('locked');
    else elements.hardBtn.classList.add('locked');
}

function addLogEntry(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    elements.logEntries.appendChild(entry);
    elements.logEntries.scrollTop = elements.logEntries.scrollHeight;
}

// ==================== ИНТЕРАКТИВНЫЕ ЗАДАНИЯ ====================
const gameDataTasks = {
    tasks: {
        easy: [
            { description: "Посадите 3 дерева в парке 🌲", type: "drag_click", goal: 3, items: ["🌲", "🌳", "🌲", "🌲", "🌳"], zones: 3, correctItems: ["🌲", "🌲", "🌲"] },
            { description: "Сортируйте мусор по контейнерам 🗑️", type: "sort_click", items: [{name: "Бумага", type: "paper", emoji: "📄"}, {name: "Пластик", type: "plastic", emoji: "🥤"}, {name: "Стекло", type: "glass", emoji: "🍶"}, {name: "Батарейки", type: "battery", emoji: "🔋"}] },
            { description: "Ответьте на вопрос об экологии ❓", type: "quiz", question: "Какой из этих материалов разлагается дольше всего?", options: [{text: "Бумага", correct: false}, {text: "Пластиковая бутылка", correct: true}, {text: "Банан", correct: false}, {text: "Хлопковая футболка", correct: false}] },
            { description: "Соберите мусор в парке 🧹", type: "clean", goal: 4, items: ["🗑️", "🗑️", "🗑️", "🗑️", "🌿", "🌿", "🌿"] },
            { description: "Что такое переработка отходы? ♻️", type: "quiz", question: "Что такое переработка отходов?", options: [{text: "Повторное использование материалов", correct: true}, {text: "Сжигание мусора", correct: false}, {text: "Закапывание отходов", correct: false}, {text: "Вывоз мусора на свалку", correct: false}] },
            { description: "Разделите отходы по категориям 📦", type: "sort_click", items: [{name: "Органика", type: "organic", emoji: "🍎"}, {name: "Металл", type: "metal", emoji: "🥫"}, {name: "Текстиль", type: "textile", emoji: "👕"}, {name: "Опасные", type: "hazardous", emoji: "☢️"}] },
            { description: "Как экономить воду? 💧", type: "quiz", question: "Какой способ помогает экономить воду?", options: [{text: "Принимать душ вместо ванны", correct: true}, {text: "Оставлять воду течь при чистке зубов", correct: false}, {text: "Поливать растения днем", correct: false}, {text: "Мыть машину ежедневно", correct: false}] },
            { description: "Соберите простой экологический пазл 🌍", type: "puzzle_image", pieces: 4, imageType: "ecology" },
            { description: "Найдите парные экологические символы 🎯", type: "match_game", pairs: 4, symbols: ["🌍", "♻️", "🌳", "💧", "🐦", "🐝", "🦋", "🐠"] }
        ],
        medium: [
            { description: "Очистите реку от 5 единиц мусора 🌊", type: "clean", goal: 5, items: ["🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🌿", "🌿", "🌿"] },
            { description: "Что такое устойчивое развитие? 🌱", type: "quiz", question: "Что такое устойчивое развитие?", options: [{text: "Развитие, удовлетворяющее потребности настоящего без ущерба для будущего", correct: true}, {text: "Быстрое экономическое развитие", correct: false}, {text: "Развитие только сельского хозяйства", correct: false}, {text: "Развитие промышленности без ограничений", correct: false}] },
            { description: "Соберите пазл из экологических символов 🧩", type: "puzzle_image", pieces: 6, imageType: "animals" },
            { description: "Посадите лес из 6 деревьев 🌲", type: "drag_click", goal: 6, items: ["🌲", "🌲", "🌳", "🌲", "🌲", "🌲", "🌲", "🌳"], zones: 6, correctItems: ["🌲", "🌲", "🌲", "🌲", "🌲", "🌲"] },
            { description: "Сортируйте опасные отходы ⚠️", type: "sort_click", items: [{name: "Батарейки", type: "battery", emoji: "🔋"}, {name: "Лампочки", type: "lamp", emoji: "💡"}, {name: "Лекарства", type: "medicine", emoji: "💊"}, {name: "Химикаты", type: "chemical", emoji: "🧪"}] },
            { description: "Создайте пищевую цепь 🐟", type: "sequence_click", items: ["🌿", "🐛", "🐦", "🦊"], correctOrder: ["🌿", "🐛", "🐦", "🦊"] },
            { description: "Что такое биоразнообразие? 🦋", type: "quiz", question: "Что означает биоразнообразие?", options: [{text: "Разнообразие живых организмов в экосистеме", correct: true}, {text: "Количество заводов в регионе", correct: false}, {text: "Разнообразие автомобилей", correct: false}, {text: "Количество жителей в городе", correct: false}] },
            { description: "Создайте экологическую последовательность 🌿", type: "sequence_click", items: ["🌱", "🌳", "🍎", "♻️"], correctOrder: ["🌱", "🌳", "🍎", "♻️"] },
            { description: "Найдите парные экологические символы 🎯", type: "match_game", pairs: 6, symbols: ["🌍", "♻️", "🌳", "💧", "🐦", "🐝", "🦋", "🐠", "🐻", "🦊", "🐸", "🦉"] }
        ],
        hard: [
            { description: "Что такое углеродный след? 👣", type: "quiz", question: "Что такое углеродный след?", options: [{text: "Количество парниковых газов, производимых деятельностью человека", correct: true}, {text: "След от угля на земле", correct: false}, {text: "Количество деревьев для поглощения CO2", correct: false}, {text: "Уровень загрязнения воздуха в городе", correct: false}] },
            { description: "Решите экологическую головоломку 🧠", type: "sequence_click", items: ["🌱", "🌳", "🏭", "💨", "🌍", "🔥"], correctOrder: ["🌱", "🌳", "🏭", "💨", "🔥", "🌍"] },
            { description: "Соберите сложный экологический пазл 🧩", type: "puzzle_image", pieces: 9, imageType: "nature" },
            { description: "Что такое возобновляемая энергия? ⚡", type: "quiz", question: "Что такое возобновляемая энергия?", options: [{text: "Энергия из неиссякаемых источников (солнце, ветер, вода)", correct: true}, {text: "Энергия из угля и нефти", correct: false}, {text: "Атомная энергия", correct: false}, {text: "Энергия из газа", correct: false}] },
            { description: "Очистите океан от мусора 🌊", type: "clean", goal: 8, items: ["🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🗑️", "🐠", "🐟", "🐡"] },
            { description: "Создайте экосистему из 8 элементов 🏞️", type: "drag_click", goal: 8, items: ["🌱", "🌳", "💧", "☀️", "🦋", "🐝", "🐞", "🦔", "🌼", "🍄"], zones: 8, correctItems: ["🌱", "🌳", "💧", "☀️", "🦋", "🐝", "🐞", "🦔"] },
            { description: "Расставьте стадии переработки ♻️", type: "sequence_click", items: ["🗑️", "🚚", "🏭", "🔄", "📦"], correctOrder: ["🗑️", "🚚", "🏭", "🔄", "📦"] },
            { description: "Что такое деградация почв? 🌵", type: "quiz", question: "Что вызывает деградацию почв?", options: [{text: "Вырубка лесов и эрозия", correct: true}, {text: "Посадка деревьев", correct: false}, {text: "Использование удобрений", correct: false}, {text: "Строительство парков", correct: false}] },
            { description: "Найдите все пары животных 🎯", type: "match_game", pairs: 8, symbols: ["🐻", "🦊", "🐰", "🦉", "🐸", "🐢", "🦋", "🐝", "🐞", "🦔", "🐿️", "🦡", "🦅", "🦆", "🦩", "🦜"] }
        ]
    }
};

function getRandomTask(difficulty) {
    const availableTasks = gameDataTasks.tasks[difficulty];
    if (!availableTasks || availableTasks.length === 0) {
        return {
            description: "Ответьте на вопрос об экологии", type: "quiz", question: "Что помогает сохранить природу?",
            options: [{text: "Посадка деревьев", correct: true}, {text: "Сжигание мусора", correct: false}, {text: "Вырубка лесов", correct: false}, {text: "Загрязнение рек", correct: false}]
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
    
    gameState.dragItems = []; gameState.dropZones = []; gameState.sortItems = []; gameState.sortBins = [];
    gameState.selectedPuzzlePieces = []; gameState.cleanupItems = []; gameState.cleanupCount = 0;
    gameState.matchGameState = { cards: [], flippedCards: [], matchedPairs: 0, canFlip: true };
    
    setTimeout(() => { elements.taskArea.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    
    if (task.type === "drag") task.type = "drag_click";
    else if (task.type === "sort") task.type = "sort_click";
    else if (task.type === "puzzle") task.type = "puzzle_click";
    else if (task.type === "puzzle_sequence" || task.type === "sequence") task.type = "sequence_click";
    
    if (task.type === "quiz") createQuizTask(task);
    else if (task.type === "drag_click") createDragClickTask(task);
    else if (task.type === "sort_click") createSortClickTask(task);
    else if (task.type === "clean") createCleanupTask(task);
    else if (task.type === "puzzle_click") createPuzzleClickTask(task);
    else if (task.type === "puzzle_image") createPuzzleImageTask(task);
    else if (task.type === "sequence_click") createSequenceClickTask(task);
    else if (task.type === "match_game") createMatchGameTask(task);
    else createDefaultTask(task);
    
    elements.completeTaskBtn.style.display = 'none';
    elements.checkTaskBtn.style.display = 'block';
    elements.checkTaskBtn.textContent = "✅ Проверить выполнение";
    elements.checkTaskBtn.disabled = false;
    
    updateRollDiceButtonState();
    
    if (window.innerWidth <= 768) {
        const dragContainers = elements.taskArea.querySelectorAll('.task-container, .drag-container, .sorting-area, .puzzle-area, .sequence-area, .match-grid');
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
                `<div class="quiz-option" data-index="${index}" data-correct="${option.correct}">${option.text}</div>`
            ).join('')}
        </div>
        <p class="spot-difference-hint">Выберите правильный ответ</p>
    `;
    
    let selectedOption = null;
    let canSelect = true;
    
    document.querySelectorAll('.quiz-option').forEach(option => {
        option.addEventListener('click', function() {
            if (!canSelect) return;
            if (selectedOption) selectedOption.classList.remove('selected');
            selectedOption = this;
            this.classList.add('selected');
            elements.checkTaskBtn.disabled = false;
        });
    });
    
    elements.checkTaskBtn.onclick = function() {
        if (!selectedOption) return;
        const isCorrect = selectedOption.dataset.correct === 'true';
        const allOptions = document.querySelectorAll('.quiz-option');
        canSelect = false;
        
        allOptions.forEach(opt => {
            opt.style.pointerEvents = 'none';
            if (opt === selectedOption) {
                if (isCorrect) opt.classList.add('correct');
                else opt.classList.add('incorrect');
            }
        });
        
        if (isCorrect) {
            elements.taskResult.textContent = '✅ Правильно! Задание выполнено.';
            elements.taskResult.style.color = '#2ecc71';
            elements.checkTaskBtn.style.display = 'none';
            elements.retryTaskBtn.style.display = 'none';
            setTimeout(() => { completeInteractiveTask(); }, 1500);
        } else {
            elements.taskResult.textContent = '❌ Неправильно. Попробуйте еще раз.';
            elements.taskResult.style.color = '#e74c3c';
            elements.checkTaskBtn.style.display = 'none';
            elements.retryTaskBtn.style.display = 'block';
        }
    };
    
    elements.retryTaskBtn.onclick = function() {
        document.querySelectorAll('.quiz-option').forEach(opt => {
            opt.classList.remove('correct', 'incorrect', 'selected');
            opt.style.pointerEvents = 'auto';
        });
        elements.taskResult.textContent = '';
        elements.checkTaskBtn.style.display = 'block';
        elements.retryTaskBtn.style.display = 'none';
        elements.checkTaskBtn.disabled = true;
        selectedOption = null;
        canSelect = true;
    };
}

function createDragClickTask(task) {
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Нажмите на ${task.goal} правильных предметов, затем нажмите на зоны для их размещения:</p>
        <div class="drag-container">
            <div class="task-container" id="dragItemsContainer">
                ${task.items.map((item, index) => 
                    `<div class="draggable-item" data-index="${index}" data-emoji="${item}" data-correct="${task.correctItems ? task.correctItems.includes(item) : true}">${item}</div>`
                ).join('')}
            </div>
            <p>Зоны для размещения:</p>
            <div class="task-container" id="dropZonesContainer">
                ${Array.from({length: task.zones || task.goal}).map((_, index) => 
                    `<div class="drop-zone" data-zone="${index}">Зона ${index + 1}</div>`
                ).join('')}
            </div>
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Правильно размещено: <span id="dragCount">0</span>/${task.goal}</p>
        <p class="spot-difference-hint">Нужно разместить только правильные предметы</p>
    `;
    initializeDragClickTask(task);
}

function initializeDragClickTask(task) {
    const draggables = elements.taskArea.querySelectorAll('.draggable-item');
    const dropZones = elements.taskArea.querySelectorAll('.drop-zone');
    let selectedItem = null;
    let placedCount = 0;
    let correctPlacedCount = 0;
    
    draggables.forEach(item => {
        item.addEventListener('click', function() {
            if (selectedItem) selectedItem.classList.remove('selected');
            selectedItem = this;
            this.classList.add('selected');
            dropZones.forEach(zone => { if (!zone.classList.contains('filled')) zone.classList.add('hover'); });
        });
    });
    
    dropZones.forEach(zone => {
        zone.addEventListener('click', function() {
            if (selectedItem && !this.classList.contains('filled')) {
                dropZones.forEach(z => z.classList.remove('hover'));
                const emoji = selectedItem.dataset.emoji;
                const isCorrect = selectedItem.dataset.correct === 'true';
                this.innerHTML = `<div style="font-size: 2.2rem;">${emoji}</div>`;
                this.classList.add('filled');
                this.classList.remove('hover');
                this.dataset.correct = isCorrect;
                
                selectedItem.classList.remove('selected');
                selectedItem.classList.add('placed');
                selectedItem.style.opacity = '0.5';
                selectedItem.style.cursor = 'default';
                selectedItem = null;
                
                placedCount++;
                if (isCorrect) correctPlacedCount++;
                document.getElementById('dragCount').textContent = correctPlacedCount;
                
                if (placedCount >= task.goal) {
                    elements.checkTaskBtn.disabled = false;
                    if (correctPlacedCount >= task.goal) {
                        elements.taskResult.textContent = '✅ Отлично! Все правильные предметы размещены!';
                        elements.taskResult.style.color = '#2ecc71';
                    } else {
                        elements.taskResult.textContent = `❌ Размещены не все правильные предметы! Правильных: ${correctPlacedCount}/${task.goal}`;
                        elements.taskResult.style.color = '#e74c3c';
                    }
                }
            }
        });
    });
    
    elements.checkTaskBtn.onclick = function() {
        if (correctPlacedCount >= task.goal) completeInteractiveTask();
        else {
            elements.taskResult.textContent = `❌ Не все правильные предметы размещены! Правильных: ${correctPlacedCount}/${task.goal}`;
            elements.taskResult.style.color = '#e74c3c';
            elements.retryTaskBtn.style.display = 'block';
        }
    };
    elements.retryTaskBtn.onclick = function() { createDragClickTask(task); };
}

function createSortClickTask(task) {
    const binTypes = {
        paper: { name: "Бумага", emoji: "📄" }, plastic: { name: "Пластик", emoji: "🥤" },
        glass: { name: "Стекло", emoji: "🍶" }, battery: { name: "Батарейки", emoji: "🔋" },
        organic: { name: "Органика", emoji: "🍎" }, metal: { name: "Металл", emoji: "🥫" },
        textile: { name: "Текстиль", emoji: "👕" }, hazardous: { name: "Опасные", emoji: "☢️" },
        lamp: { name: "Лампочки", emoji: "💡" }, medicine: { name: "Лекарства", emoji: "💊" },
        chemical: { name: "Химикаты", emoji: "🧪" }
    };
    
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Нажмите на мусор, затем на правильный контейнер:</p>
        <div class="sorting-area">
            <div class="task-container" id="sortBinsContainer">
                ${task.items.map((item) => {
                    const binData = binTypes[item.type] || { name: item.name, emoji: item.emoji };
                    return `<div class="sort-bin" data-type="${item.type}"><div class="bin-icon">${binData.emoji}</div><div class="bin-name">${binData.name}</div><div class="sort-bin-content"></div></div>`;
                }).join('')}
            </div>
            <p>Предметы для сортировки:</p>
            <div class="task-container" id="sortItemsContainer">
                ${task.items.map((item, index) => `<div class="sort-item" data-index="${index}" data-type="${item.type}"><div style="font-size: 1.8rem;">${item.emoji}</div><div style="font-size: 0.8rem; margin-top: 5px;">${item.name}</div></div>`).join('')}
            </div>
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Отсортировано: <span id="sortCount">0</span>/${task.items.length}</p>
    `;
    initializeSortClickTask(task);
}

function initializeSortClickTask(task) {
    const sortItems = elements.taskArea.querySelectorAll('.sort-item');
    const sortBins = elements.taskArea.querySelectorAll('.sort-bin');
    let selectedItem = null;
    let sortedCount = 0;
    let errorShown = false;
    
    sortItems.forEach(item => {
        item.addEventListener('click', function() {
            if (selectedItem) selectedItem.classList.remove('selected');
            selectedItem = this;
            this.classList.add('selected');
            const itemType = this.dataset.type;
            sortBins.forEach(bin => { if (bin.dataset.type === itemType && !bin.classList.contains('filled')) bin.classList.add('hover'); });
        });
    });
    
    sortBins.forEach(bin => {
        bin.addEventListener('click', function() {
            if (selectedItem) {
                const itemType = selectedItem.dataset.type;
                const binType = this.dataset.type;
                sortBins.forEach(b => b.classList.remove('hover'));
                
                if (itemType === binType) {
                    const binContent = this.querySelector('.sort-bin-content');
                    binContent.innerHTML = '';
                    const itemClone = selectedItem.cloneNode(true);
                    itemClone.classList.add('placed');
                    itemClone.style.width = '100%'; itemClone.style.height = '100%'; itemClone.style.margin = '0';
                    itemClone.style.display = 'flex'; itemClone.style.flexDirection = 'column'; itemClone.style.alignItems = 'center'; itemClone.style.justifyContent = 'center';
                    binContent.appendChild(itemClone);
                    
                    this.classList.add('filled');
                    selectedItem.classList.remove('selected');
                    selectedItem.style.opacity = '0.5';
                    selectedItem.style.cursor = 'default';
                    selectedItem = null;
                    
                    sortedCount++;
                    document.getElementById('sortCount').textContent = sortedCount;
                    errorShown = false;
                    
                    if (sortedCount >= task.items.length) {
                        elements.checkTaskBtn.disabled = false;
                        elements.taskResult.textContent = '✅ Отлично! Весь мусор отсортирован правильно!';
                        elements.taskResult.style.color = '#2ecc71';
                    }
                } else {
                    if (!errorShown) {
                        showNotification('❌ Неправильный контейнер! Попробуйте другой.', 'warning');
                        errorShown = true;
                        setTimeout(() => {
                            if (selectedItem) { selectedItem.classList.remove('selected'); selectedItem = null; }
                            errorShown = false;
                        }, 1000);
                    }
                }
            }
        });
    });
    
    elements.checkTaskBtn.onclick = function() {
        if (sortedCount >= task.items.length) completeInteractiveTask();
        else {
            elements.taskResult.textContent = `❌ Не весь мусор отсортирован! Осталось: ${task.items.length - sortedCount}`;
            elements.taskResult.style.color = '#e74c3c';
            elements.retryTaskBtn.style.display = 'block';
        }
    };
    elements.retryTaskBtn.onclick = function() { createSortClickTask(task); };
}

function createCleanupTask(task) {
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Кликните по урне, чтобы очистить:</p>
        <div class="river-container">
            ${task.items.map((item, index) => {
                const left = Math.random() * 80 + 10;
                const top = Math.random() * 70 + 15;
                const isTrash = item === '🗑️';
                return `<div class="cleanup-item" data-index="${index}" data-trash="${isTrash}" style="left: ${left}%; top: ${top}%;">${item}</div>`;
            }).join('')}
        </div>
        <div class="cleanup-counter">Очищено: <span id="cleanupCount">0</span>/${task.goal}</div>
    `;
    initializeCleanup(task);
}

function initializeCleanup(task) {
    const cleanupItems = elements.taskArea.querySelectorAll('.cleanup-item');
    let cleanedCount = 0;
    const totalTrash = task.goal;
    
    cleanupItems.forEach(item => {
        item.addEventListener('click', function() {
            if (!this.classList.contains('cleaned') && this.dataset.trash === "true") {
                this.classList.add('cleaned');
                cleanedCount++;
                document.getElementById('cleanupCount').textContent = cleanedCount;
                if (cleanedCount >= totalTrash) {
                    elements.checkTaskBtn.disabled = false;
                    elements.taskResult.textContent = '✅ Отлично! Очистка завершена!';
                    elements.taskResult.style.color = '#2ecc71';
                }
            } else if (this.dataset.trash === "false") {
                showNotification('Это не урна! Кликайте только на урны (🗑️)', 'warning');
            }
        });
    });
    
    elements.checkTaskBtn.onclick = function() {
        if (cleanedCount >= totalTrash) completeInteractiveTask();
        else {
            elements.taskResult.textContent = `❌ Не весь мусор очищен! Осталось: ${totalTrash - cleanedCount}`;
            elements.taskResult.style.color = '#e74c3c';
            elements.retryTaskBtn.style.display = 'block';
        }
    };
    elements.retryTaskBtn.onclick = function() { createCleanupTask(task); };
}

function createPuzzleClickTask(task) {
    task.type = "puzzle_image";
    task.imageType = "ecology";
    createPuzzleImageTask(task);
}

function createPuzzleImageTask(task) {
    let imagePieces = [];
    switch(task.imageType) {
        case "ecology": imagePieces = ["🌍", "♻️", "🌳", "💧", "🌱", "🌞", "🌀", "🌊", "🦋"]; break;
        case "animals": imagePieces = ["🐻", "🦊", "🐰", "🦉", "🐸", "🐢", "🦋", "🐝", "🐞"]; break;
        case "nature": imagePieces = ["🏔️", "🌲", "🌊", "☀️", "🌙", "⭐", "🌺", "🍄", "🪨"]; break;
        default: imagePieces = ["🌍", "♻️", "🌳", "💧", "🌱", "🌞", "🌀", "🌊", "🦋"];
    }
    
    const pieces = imagePieces.slice(0, task.pieces);
    const shuffledPieces = shuffleArray([...pieces]);
    
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Нажмите на кусочек пазла, затем на слот для его размещения:</p>
        <div class="puzzle-image-container">
            <div style="font-size: 3rem; margin: 10px; display: flex; flex-wrap: wrap; justify-content: center; gap: 5px;">
                ${pieces.map(piece => `<span style="font-size: 2.5rem;">${piece}</span>`).join('')}
            </div>
        </div>
        <div class="puzzle-area">
            <p>Соберите пазл в правильном порядке:</p>
            <div class="task-container" id="puzzleTarget">
                ${pieces.map((piece, index) => `<div class="puzzle-target-slot" data-index="${index}" data-expected="${piece}"></div>`).join('')}
            </div>
            <p>Кусочки пазла:</p>
            <div class="task-container" id="puzzlePieces">
                ${shuffledPieces.map((piece) => `<div class="puzzle-piece" data-piece="${piece}">${piece}</div>`).join('')}
            </div>
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Собрано: <span id="puzzleCount">0</span>/${pieces.length}</p>
    `;
    initializePuzzleImage(pieces);
}

function initializePuzzleImage(correctPieces) {
    const puzzlePieces = elements.taskArea.querySelectorAll('.puzzle-piece');
    const puzzleSlots = elements.taskArea.querySelectorAll('.puzzle-target-slot');
    let selectedPiece = null;
    let placedCount = 0;
    
    puzzlePieces.forEach(piece => {
        piece.addEventListener('click', function() {
            if (selectedPiece) selectedPiece.classList.remove('selected');
            selectedPiece = this;
            this.classList.add('selected');
            puzzleSlots.forEach(slot => { if (!slot.classList.contains('filled')) slot.classList.add('hover'); });
        });
    });
    
    puzzleSlots.forEach((slot) => {
        slot.addEventListener('click', function() {
            if (selectedPiece && this.classList.contains('hover')) {
                const pieceEmoji = selectedPiece.dataset.piece;
                const expectedEmoji = this.dataset.expected;
                
                if (pieceEmoji === expectedEmoji) {
                    puzzleSlots.forEach(s => s.classList.remove('hover'));
                    this.innerHTML = `<div style="font-size: 2.2rem;">${pieceEmoji}</div>`;
                    this.classList.add('filled');
                    this.classList.remove('hover');
                    
                    selectedPiece.classList.remove('selected');
                    selectedPiece.style.opacity = '0.5';
                    selectedPiece.style.cursor = 'default';
                    selectedPiece = null;
                    
                    placedCount++;
                    document.getElementById('puzzleCount').textContent = placedCount;
                    
                    if (placedCount >= correctPieces.length) {
                        elements.checkTaskBtn.disabled = false;
                        elements.taskResult.textContent = '✅ Отлично! Пазл собран!';
                        elements.taskResult.style.color = '#2ecc71';
                    }
                } else {
                    elements.taskResult.textContent = '❌ Неправильное место! Попробуйте другой слот.';
                    elements.taskResult.style.color = '#e74c3c';
                    selectedPiece.classList.remove('selected');
                    selectedPiece = null;
                    puzzleSlots.forEach(s => s.classList.remove('hover'));
                }
            }
        });
    });
    
    elements.checkTaskBtn.onclick = function() {
        if (placedCount >= correctPieces.length) completeInteractiveTask();
        else {
            elements.taskResult.textContent = `❌ Пазл не собран! Осталось: ${correctPieces.length - placedCount}`;
            elements.taskResult.style.color = '#e74c3c';
            elements.retryTaskBtn.style.display = 'block';
        }
    };
    elements.retryTaskBtn.onclick = function() { if (gameState.currentTask) createPuzzleImageTask(gameState.currentTask); };
}

function createSequenceClickTask(task) {
    const items = task.sequence || task.items;
    const correctOrder = task.correctOrder || items;
    const shuffledItems = shuffleArray([...items]);
    
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Нажмите на элементы в правильной последовательности:</p>
        <div class="sequence-area">
            <p>Правильная последовательность:</p>
            <div class="task-container" id="sequenceTarget">
                ${correctOrder.map((_, index) => `<div class="sequence-slot" data-index="${index}" data-expected="${correctOrder[index]}"></div>`).join('')}
            </div>
            <p>Элементы для размещения:</p>
            <div class="task-container" id="sequencePieces">
                ${shuffledItems.map((piece) => `<div class="sequence-piece" data-piece="${piece}">${piece}</div>`).join('')}
            </div>
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">Правильно размещено: <span id="sequenceCount">0</span>/${correctOrder.length}</p>
    `;
    initializeSequenceClick(correctOrder);
}

function initializeSequenceClick(correctOrder) {
    const sequencePieces = elements.taskArea.querySelectorAll('.sequence-piece');
    const sequenceSlots = elements.taskArea.querySelectorAll('.sequence-slot');
    let selectedPiece = null;
    let placedCount = 0;
    
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
                const pieceEmoji = selectedPiece.dataset.piece;
                const expectedEmoji = this.dataset.expected;
                
                if (pieceEmoji === expectedEmoji) {
                    sequenceSlots.forEach(s => s.classList.remove('hover'));
                    this.innerHTML = `<div style="font-size: 2.2rem;">${pieceEmoji}</div>`;
                    this.classList.add('filled');
                    this.classList.remove('hover');
                    
                    selectedPiece.classList.remove('selected');
                    selectedPiece.style.opacity = '0.5';
                    selectedPiece.style.cursor = 'default';
                    selectedPiece = null;
                    
                    placedCount++;
                    document.getElementById('sequenceCount').textContent = placedCount;
                    
                    if (placedCount >= correctOrder.length) {
                        elements.checkTaskBtn.disabled = false;
                        elements.taskResult.textContent = '✅ Отлично! Последовательность верная!';
                        elements.taskResult.style.color = '#2ecc71';
                    }
                } else {
                    elements.taskResult.textContent = '❌ Неправильная последовательность! Попробуйте другой слот.';
                    elements.taskResult.style.color = '#e74c3c';
                    selectedPiece.classList.remove('selected');
                    selectedPiece = null;
                    sequenceSlots.forEach(s => s.classList.remove('hover'));
                }
            }
        });
    });
    
    elements.checkTaskBtn.onclick = function() {
        if (placedCount >= correctOrder.length) completeInteractiveTask();
        else {
            elements.taskResult.textContent = `❌ Последовательность не завершена! Осталось: ${correctOrder.length - placedCount}`;
            elements.taskResult.style.color = '#e74c3c';
            elements.retryTaskBtn.style.display = 'block';
        }
    };
    elements.retryTaskBtn.onclick = function() { if (gameState.currentTask) createSequenceClickTask(gameState.currentTask); };
}

function createMatchGameTask(task) {
    const symbols = task.symbols;
    const pairs = task.pairs;
    let cards = [];
    for (let i = 0; i < pairs; i++) {
        const symbol = symbols[i % symbols.length];
        cards.push({symbol: symbol, id: i});
        cards.push({symbol: symbol, id: i});
    }
    cards = shuffleArray(cards);
    
    elements.taskArea.innerHTML = `
        <p><strong>${task.description}</strong></p>
        <p>Найдите все пары одинаковых символов:</p>
        <div class="match-grid">
            ${cards.map((card, index) => 
                `<div class="match-card" data-index="${index}" data-symbol="${card.symbol}" data-id="${card.id}">
                    <div class="card-back">?</div>
                    <div class="card-content">${card.symbol}</div>
                </div>`
            ).join('')}
        </div>
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-align: center; margin-top: 10px;">
            Найдено пар: <span id="matchCount">0</span>/${pairs}
        </p>
    `;
    initializeMatchGame(task);
}

function initializeMatchGame(task) {
    const cards = elements.taskArea.querySelectorAll('.match-card');
    gameState.matchGameState.cards = cards;
    gameState.matchGameState.matchedPairs = 0;
    gameState.matchGameState.flippedCards = [];
    gameState.matchGameState.canFlip = true;
    
    cards.forEach(card => {
        card.addEventListener('click', function() {
            if (!gameState.matchGameState.canFlip || this.classList.contains('flipped') || this.classList.contains('matched') || gameState.matchGameState.flippedCards.length >= 2) return;
            
            this.classList.add('flipped');
            gameState.matchGameState.flippedCards.push(this);
            
            if (gameState.matchGameState.flippedCards.length === 2) {
                gameState.matchGameState.canFlip = false;
                const card1 = gameState.matchGameState.flippedCards[0];
                const card2 = gameState.matchGameState.flippedCards[1];
                
                if (card1.dataset.id === card2.dataset.id) {
                    setTimeout(() => {
                        card1.classList.add('matched');
                        card2.classList.add('matched');
                        gameState.matchGameState.flippedCards = [];
                        gameState.matchGameState.canFlip = true;
                        
                        gameState.matchGameState.matchedPairs++;
                        document.getElementById('matchCount').textContent = gameState.matchGameState.matchedPairs;
                        
                        if (gameState.matchGameState.matchedPairs >= task.pairs) {
                            elements.checkTaskBtn.disabled = false;
                            elements.taskResult.textContent = '✅ Отлично! Все пары найдены!';
                            elements.taskResult.style.color = '#2ecc71';
                        }
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
        else {
            elements.taskResult.textContent = `❌ Не все пары найдены! Осталось: ${task.pairs - gameState.matchGameState.matchedPairs}`;
            elements.taskResult.style.color = '#e74c3c';
            elements.retryTaskBtn.style.display = 'block';
        }
    };
    elements.retryTaskBtn.onclick = function() {
        gameState.matchGameState = { cards: [], flippedCards: [], matchedPairs: 0, canFlip: true };
        createMatchGameTask(task);
    };
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
    elements.checkTaskBtn.onclick = function() { completeInteractiveTask(); };
}

function completeInteractiveTask() {
    if (!gameState.currentTask) return;
    
    let coinsEarned = 0; let expEarned = 0;
    switch(gameState.currentDifficulty) {
        case 'easy': coinsEarned = 20; expEarned = 1; break;
        case 'medium': coinsEarned = 40; expEarned = 3; break;
        case 'hard': coinsEarned = 60; expEarned = 5; break;
    }
    
    gameState.currentPlayer.coins += coinsEarned;
    if (!gameState.currentPlayer.completedTasks) gameState.currentPlayer.completedTasks = 0;
    gameState.currentPlayer.completedTasks += 1;
    gameState.currentPlayer.cleaningPoints += expEarned;
    
    const cityKey = gameState.currentPlayer.city;
    const currentProgress = gameState.playerProgress[gameState.currentPlayerId]?.[cityKey] || 0;
    const newProgress = Math.min(100, currentProgress + 10);
    updateCityProgress(cityKey, newProgress);
    
    if (gameState.currentPlayer.completedTasks >= 3 && gameState.currentPlayer.completedTasks % 3 === 0) {
        gameState.currentPlayer.level += 1;
        updatePlayerUI();
        addLogEntry(`🎉 Поздравляем! Вы повысили уровень до ${gameState.currentPlayer.level}!`);
        updateDifficultyButtons();
        showNotification(`Поздравляем! Вы достигли ${gameState.currentPlayer.level}-го уровня!`, 'success');
    }
    
    elements.interactiveTask.style.display = 'none';
    elements.currentTask.style.display = 'none';
    elements.noTaskMessage.style.display = 'block';
    elements.checkTaskBtn.style.display = 'none';
    elements.retryTaskBtn.style.display = 'none';
    elements.completeTaskBtn.disabled = true;
    elements.completeTaskBtn.style.display = 'block';
    elements.completeTaskBtn.textContent = "▶️ Начать выполнение задания";
    gameState.taskInProgress = false;
    hasCurrentTask = false;
    gameState.hasUnfinishedTask = false;
    gameState.currentTask = null;
    
    elements.buildBtn.disabled = false;
    updateRollDiceButtonState();
    
    if (gameState.isMyTurn) {
        socket.emit('end_turn');
        gameState.isMyTurn = false;
        updateTurnIndicator();
    }
    
    addLogEntry(`✅ Вы выполнили задание и получили ${coinsEarned} монет и ${expEarned} опыта!`);
    savePlayerState();
    showNotification(`✅ Задание выполнено! Вы получили ${coinsEarned} монет и ${expEarned} опыта!`, 'success');
}

// ==================== ФУНКЦИИ ПЕРЕМЕЩЕНИЯ МЕЖДУ ГОРОДАМИ ====================
function moveToExistingCity(cityKey) {
    if (!canAccessCity(cityKey)) {
        showNotification(`❌ Вы не можете перейти в этот город!`, 'warning');
        return;
    }
    
    const cityCell = mapData.cells.find(cell => cell.city === cityKey);
    if (!cityCell) {
        showNotification(`❌ Клетка для города ${gameData.cities[cityKey].name} не найдена!`, 'error');
        return;
    }
    
    const oldPosition = gameState.currentPlayer.position;
    gameState.currentPlayer.position = cityCell.number;
    gameState.currentPlayer.city = cityKey;
    
    updatePlayerUI();
    updateOtherPlayerMarker(
        gameState.currentPlayerId, 
        gameState.currentPlayer.name, 
        cityCell.number, 
        cityKey, 
        gameState.currentPlayer.color || '#8e44ad'
    );
    
    checkForCityTransition(oldPosition, cityCell.number);
    sendPlayerPositionToServer(cityCell.number, cityKey);
    savePlayerState();
    
    createCitiesGrid();
    createCurrentCityProgress();
    
    showNotification(`🚗 Вы переместились в ${gameData.cities[cityKey].name}!`, 'success');
    addLogEntry(`🚗 Вы переместились в ${gameData.cities[cityKey].name}`);
    
    if (!gameState.visitedCities[cityKey]) {
        setTimeout(() => { showCityModal(cityKey); }, 500);
        gameState.visitedCities[cityKey] = true;
    }
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
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
            element.style.transition = 'box-shadow 0.5s';
            setTimeout(() => { element.style.boxShadow = ''; }, 2000);
        }
    }
    
    quickDiceBtn.addEventListener('click', function() {
        quickActions.classList.remove('show'); quickActionsBtn.classList.remove('active'); quickActionsVisible = false;
        scrollToElement('rollDiceBtn');
        setTimeout(() => {
            if (!elements.rollDiceBtn.disabled && !gameState.gameOver && !gameState.taskInProgress && !hasCurrentTask) elements.rollDiceBtn.click();
            else if (gameState.taskInProgress) showNotification('Завершите текущее задание перед броском кубика!', 'warning');
            else if (gameState.gameOver) showNotification('Игра завершена!', 'warning');
            else if (hasCurrentTask) showNotification('Сначала выполните текущее задание!', 'warning');
            else if (!gameState.isMyTurn) showNotification('Сейчас не ваш ход!', 'warning');
        }, 500);
    });
    
    quickBuildBtn.addEventListener('click', function() {
        quickActions.classList.remove('show'); quickActionsBtn.classList.remove('active'); quickActionsVisible = false;
        if (elements.buildBtn.disabled) { showNotification('Сначала выполните задание, чтобы построить объект!', 'warning'); return; }
        setTimeout(() => {
            const buildingsContainer = document.getElementById('buildingsContainer');
            if (buildingsContainer) {
                buildingsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                elements.buildingsSection.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                elements.buildingsSection.style.transition = 'box-shadow 0.5s';
                setTimeout(() => { elements.buildingsSection.style.boxShadow = ''; }, 2000);
            }
        }, 100);
    });
    
    quickChatBtn.addEventListener('click', function() {
        quickActions.classList.remove('show'); quickActionsBtn.classList.remove('active'); quickActionsVisible = false;
        setTimeout(() => {
            const chatSection = document.querySelector('.chat-section');
            if (chatSection) {
                chatSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => { elements.chatInput.focus(); }, 300);
            }
        }, 100);
    });
    
    quickTasksBtn.addEventListener('click', function() {
        quickActions.classList.remove('show'); quickActionsBtn.classList.remove('active'); quickActionsVisible = false;
        setTimeout(() => {
            const taskCard = document.querySelector('.task-card');
            if (taskCard) taskCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    });
    
    quickInviteBtn.addEventListener('click', function() {
        quickActions.classList.remove('show'); quickActionsBtn.classList.remove('active'); quickActionsVisible = false;
        showInviteModal();
    });
    
    quickThemeBtn.addEventListener('click', function() {
        quickActions.classList.remove('show'); quickActionsBtn.classList.remove('active'); quickActionsVisible = false;
        toggleLightTheme();
    });
    
    document.addEventListener('click', function(event) {
        if (quickActionsVisible && !quickActionsBtn.contains(event.target) && !quickActions.contains(event.target)) {
            quickActions.classList.remove('show'); quickActionsBtn.classList.remove('active'); quickActionsVisible = false;
        }
    });
    
    function updateQuickButtons() {
        updateRollDiceButtonState();
        if (gameState.gameOver) {
            quickDiceBtn.style.opacity = '0.5'; quickDiceBtn.style.cursor = 'not-allowed'; quickDiceBtn.title = 'Игра завершена';
            quickBuildBtn.style.opacity = '0.5'; quickBuildBtn.style.cursor = 'not-allowed'; quickBuildBtn.title = 'Игра завершена';
        } else {
            if (!gameState.isMyTurn) {
                quickDiceBtn.style.opacity = '0.5'; quickDiceBtn.style.cursor = 'not-allowed'; quickDiceBtn.title = 'Сейчас не ваш ход';
            } else if (hasCurrentTask || gameState.taskInProgress) {
                quickDiceBtn.style.opacity = '0.5'; quickDiceBtn.style.cursor = 'not-allowed'; quickDiceBtn.title = 'Сначала выполните задание';
            } else {
                quickDiceBtn.style.opacity = '1'; quickDiceBtn.style.cursor = 'pointer'; quickDiceBtn.title = 'Бросить кубик';
            }
            
            if (hasCurrentTask || gameState.taskInProgress) {
                quickBuildBtn.style.opacity = '0.5'; quickBuildBtn.style.cursor = 'not-allowed'; quickBuildBtn.title = 'Сначала выполните задание';
            } else {
                quickBuildBtn.style.opacity = '1'; quickBuildBtn.style.cursor = 'pointer'; quickBuildBtn.title = 'Построить объект';
            }
        }
        
        if (elements.gameContent.style.display === 'block') quickActionsBtn.style.display = 'flex';
        else quickActionsBtn.style.display = 'none';
    }
    
    setInterval(updateQuickButtons, 1000);
    updateQuickButtons();
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
elements.loginTab.addEventListener('click', () => {
    elements.loginTab.classList.add('active'); elements.registerTab.classList.remove('active');
    elements.loginForm.classList.add('active'); elements.registerForm.classList.remove('active');
});

elements.registerTab.addEventListener('click', () => {
    elements.registerTab.classList.add('active'); elements.loginTab.classList.remove('active');
    elements.registerForm.classList.add('active'); elements.loginForm.classList.remove('active');
});

elements.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const roomId = document.getElementById('loginRoom').value.trim();
    if (username && roomId) joinGame(username, roomId, false);
});

elements.registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value.trim();
    const roomId = document.getElementById('registerRoom').value.trim();
    if (username && roomId) joinGame(username, roomId, true);
});

elements.rollDiceBtn.addEventListener('click', () => {
    if (gameState.gameOver || gameState.taskInProgress || hasCurrentTask || !gameState.isMyTurn) return;
    
    elements.diceValue.classList.add('rolling');
    elements.rollDiceBtn.disabled = true;
    
    setTimeout(() => {
        const diceValue = Math.floor(Math.random() * 6) + 1;
        elements.diceValue.querySelector('.dice-value').textContent = diceValue;
        elements.diceValue.classList.remove('rolling');
        
        const oldPosition = gameState.currentPlayer.position;
        const newPosition = Math.min(gameState.currentPlayer.position + diceValue, mapData.cells.length);
        gameState.currentPlayer.position = newPosition;
        
        const currentCell = mapData.cells.find(cell => cell.number === newPosition);
        if (currentCell && currentCell.type === 'city' && currentCell.city) {
            gameState.currentPlayer.city = currentCell.city;
        }
        
        updatePlayerUI();
        updateOtherPlayerMarker(
            gameState.currentPlayerId, 
            gameState.currentPlayer.name, 
            newPosition, 
            gameState.currentPlayer.city, 
            gameState.currentPlayer.color || '#8e44ad'
        );
        
        checkForCityTransition(oldPosition, newPosition);
        sendPlayerPositionToServer(newPosition, gameState.currentPlayer.city);
        savePlayerState();
        
        addLogEntry(`🎲 Вы бросили кубик и получили ${diceValue}. Новая позиция: ${newPosition}`);
        
        gameState.currentTask = getRandomTask(gameState.currentDifficulty);
        elements.currentTask.style.display = 'block';
        elements.taskDescription.textContent = gameState.currentTask.description;
        elements.noTaskMessage.style.display = 'none';
        elements.completeTaskBtn.disabled = false;
        hasCurrentTask = true;
        
        updateRollDiceButtonState();
        socket.emit('end_turn');
        gameState.isMyTurn = false;
        updateTurnIndicator();
    }, 1200);
});

elements.completeTaskBtn.addEventListener('click', () => {
    if (!gameState.currentTask) return;
    elements.interactiveTask.style.display = 'block';
    createInteractiveTask(gameState.currentTask);
});

elements.checkTaskBtn.addEventListener('click', () => {
    if (elements.checkTaskBtn.onclick) elements.checkTaskBtn.onclick();
});

elements.retryTaskBtn.addEventListener('click', () => {
    if (gameState.currentTask) {
        elements.taskResult.textContent = '';
        elements.retryTaskBtn.style.display = 'none';
        createInteractiveTask(gameState.currentTask);
    }
});

elements.sendMessageBtn.addEventListener('click', () => {
    const message = elements.chatInput.value.trim();
    if (message) sendChatMessage(message);
});

elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') elements.sendMessageBtn.click();
});

elements.inviteBtn.addEventListener('click', () => { showInviteModal(); });
elements.copyInviteBtn.addEventListener('click', () => { copyInvitation(); });
elements.closeInviteBtn.addEventListener('click', () => { closeInviteModal(); });

elements.leaveRoomBtn.addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите покинуть комнату?')) {
        socket.emit('leave-room');
        resetGameState();
        elements.authSection.style.display = 'block';
        elements.gameContent.style.display = 'none';
        elements.resourcesPlaceholder.style.display = 'none';
        quickActionsBtn.classList.remove('show');
        showNotification('Вы покинули комнату', 'info');
    }
});

elements.cityModalCloseBtn.addEventListener('click', () => { closeCityModal(); });
elements.stayBtn.addEventListener('click', () => { closeChoiceModal(); showNotification('Вы остались в текущем городе', 'info'); });
elements.moveForwardBtn.addEventListener('click', () => {
    closeChoiceModal();
    if (gameState.nextCity) moveToExistingCity(gameState.nextCity);
});

elements.gameInfo.addEventListener('click', () => { elements.gameInfo.classList.toggle('expanded'); });

elements.difficultyBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        if (this.classList.contains('locked')) {
            showNotification('Этот уровень сложности заблокирован. Повысьте уровень игрока!', 'warning');
            return;
        }
        elements.difficultyBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        gameState.currentDifficulty = this.id.replace('Btn', '');
        showNotification(`Сложность изменена на: ${this.textContent.trim()}`, 'info');
    });
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Игра "Юный эколог" запущена!');
    updateProfileUI(); // Загружаем профиль при старте
    updateStatsUI(); // Подгружаем статистику при старте
    
    setTimeout(() => {
        if (!isConnected) showNotification('Не удалось подключиться к серверу. Проверьте интернет-соединение.', 'error');
    }, 5000);
    
    updateRecentEmojisDisplay();
});

// ==================== GOOGLE АВТОРИЗАЦИЯ ====================
function decodeJwtResponse(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function handleCredentialResponse(response) {
    const responsePayload = decodeJwtResponse(response.credential);
    
    const userName = responsePayload.given_name || responsePayload.name;
    const userPicture = responsePayload.picture;
    
    // Если профиль был пустым, берем данные из Google
    if (!userProfile.name) {
        userProfile.name = userName;
        userProfile.avatar = userPicture;
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
    }
    
    updateProfileUI();
    showNotification(`Привет, ${userName}! Вы успешно вошли через Google.`, 'success');
}

window.onload = function () {
    const GOOGLE_CLIENT_ID = "921001738618-bmaal1s4a6e2ubfbrjc3ullvnov0igjn.apps.googleusercontent.com"; 
    
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
    });
    
    // Если аватар уже установлен, Google кнопку не рендерим (обрабатывается в updateProfileUI)
    if (!userProfile.avatar) {
        google.accounts.id.renderButton(
            document.getElementById("googleSignInBtn"),
            { theme: "outline", size: "large", shape: "pill" }
        );
        google.accounts.id.prompt(); 
    }
};

// Обработчик выхода перенесен в выпадающее меню
document.getElementById('logoutBtn').addEventListener('click', () => {
    google.accounts.id.disableAutoSelect();
    
    // Очищаем профиль
    userProfile = { name: '', avatar: '', birthDate: '', gender: 'not_set' };
    localStorage.removeItem('userProfile');
    
    // Возвращаем UI
    elements.googleSignInBtn.style.display = 'block';
    elements.userProfileBadge.style.display = 'none';
    
    if(elements.loginUsername) elements.loginUsername.value = '';
    if(elements.registerUsername) elements.registerUsername.value = '';
    
    // Скрываем меню если было открыто
    document.getElementById('profileDropdown')?.classList.remove('active');
    
    // Рендерим кнопку Google заново
    google.accounts.id.renderButton(
        document.getElementById("googleSignInBtn"),
        { theme: "outline", size: "large", shape: "pill" }
    );
    
    showNotification('Вы вышли из профиля', 'info');
});
