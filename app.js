// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Инициализация приложения
tg.expand(); // Развернуть приложение на весь экран
tg.MainButton.setText("Готово").show();

// Элементы DOM
const userDataEl = document.getElementById('user-data');
const counterValueEl = document.getElementById('counter-value');
const themeTypeEl = document.getElementById('theme-type');
const colorBoxes = {
    bg: document.getElementById('bg-color'),
    text: document.getElementById('text-color'),
    hint: document.getElementById('hint-color'),
    link: document.getElementById('link-color')
};

// Состояние приложения
let counter = 0;
const appState = {
    user: null,
    themeParams: {}
};

// Инициализация приложения
function initApp() {
    // Получаем данные пользователя
    const user = tg.initDataUnsafe?.user;
    appState.user = user;
    
    // Отображаем информацию о пользователе
    if (user) {
        userDataEl.innerHTML = `
            <p><strong>ID:</strong> ${user.id}</p>
            <p><strong>Имя:</strong> ${user.first_name || 'Не указано'}</p>
            <p><strong>Фамилия:</strong> ${user.last_name || 'Не указана'}</p>
            <p><strong>Username:</strong> @${user.username || 'Не указан'}</p>
            <p><strong>Язык:</strong> ${user.language_code || 'Не указан'}</p>
        `;
    } else {
        userDataEl.innerHTML = '<p>Пользователь не авторизован</p>';
    }
    
    // Получаем параметры темы
    appState.themeParams = tg.themeParams;
    updateThemeInfo();
    
    // Обновляем тему при изменении
    tg.onEvent('themeChanged', updateThemeInfo);
    
    // Настраиваем главную кнопку
    tg.MainButton.onClick(() => {
        tg.showAlert(`Счетчик: ${counter}\nПользователь: ${user?.first_name || 'Гость'}`);
    });
}

// Обновление информации о теме
function updateThemeInfo() {
    const theme = tg.colorScheme;
    themeTypeEl.textContent = theme === 'dark' ? 'Темная 🌙' : 'Светлая ☀️';
    
    // Показываем цвета темы
    if (tg.themeParams) {
        colorBoxes.bg.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';
        colorBoxes.text.style.backgroundColor = tg.themeParams.text_color || '#000000';
        colorBoxes.hint.style.backgroundColor = tg.themeParams.hint_color || '#999999';
        colorBoxes.link.style.backgroundColor = tg.themeParams.link_color || '#2678b6';
    }
}

// Обновление счетчика
function updateCounter() {
    counterValueEl.textContent = counter;
    counterValueEl.style.color = counter >= 0 ? 
        (tg.themeParams.button_color || '#40a7e3') : 
        (tg.themeParams.destructive_text_color || '#ff3b30');
}

// Обработчики событий
document.getElementById('btn-increase').addEventListener('click', () => {
    counter++;
    updateCounter();
    tg.HapticFeedback.impactOccurred('light');
});

document.getElementById('btn-decrease').addEventListener('click', () => {
    counter--;
    updateCounter();
    tg.HapticFeedback.impactOccurred('light');
});

document.getElementById('btn-reset').addEventListener('click', () => {
    counter = 0;
    updateCounter();
    tg.HapticFeedback.impactOccurred('heavy');
});

document.getElementById('btn-alert').addEventListener('click', () => {
    tg.showAlert('Это уведомление от Telegram Mini App!');
    tg.HapticFeedback.notificationOccurred('success');
});

document.getElementById('btn-theme').addEventListener('click', () => {
    const newTheme = tg.colorScheme === 'dark' ? 'light' : 'dark';
    tg.setHeaderColor(newTheme === 'dark' ? 'secondary_bg_color' : 'bg_color');
    tg.showPopup({
        title: 'Тема изменена',
        message: `Переключено на ${newTheme === 'dark' ? 'темную' : 'светлую'} тему`,
        buttons: [{ type: 'ok' }]
    });
});

document.getElementById('btn-haptic').addEventListener('click', () => {
    tg.HapticFeedback.impactOccurred('medium');
});

document.getElementById('btn-send').addEventListener('click', () => {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (message) {
        // Отправляем данные обратно в бота
        tg.sendData(JSON.stringify({
            action: 'send_message',
            text: message,
            counter: counter
        }));
        
        tg.showAlert(`Сообщение отправлено: "${message}"`);
        messageInput.value = '';
    } else {
        tg.showAlert('Введите сообщение!');
    }
});

document.getElementById('btn-close').addEventListener('click', () => {
    tg.close();
});

// Запуск приложения при загрузке
document.addEventListener('DOMContentLoaded', initApp);
updateCounter();