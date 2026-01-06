// Управление аутентификацией
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('auth_token');
        this.API_BASE_URL = 'http://localhost:3000/api';
    }

    // Инициализация Telegram WebApp
    async initTelegram() {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            
            // Настройка темы
            const theme = window.Telegram.WebApp.colorScheme;
            document.documentElement.setAttribute('data-theme', theme);
            
            // Установка цветов
            window.Telegram.WebApp.setHeaderColor('#1a1f26');
            window.Telegram.WebApp.setBackgroundColor('#0f1419');
            
            return window.Telegram.WebApp.initData;
        }
        return null;
    }

    // Авторизация через Telegram
    async loginWithTelegram() {
        try {
            const initData = await this.initTelegram();
            
            if (!initData) {
                console.warn('Not in Telegram WebApp');
                return false;
            }

            const response = await fetch(`${this.API_BASE_URL}/auth/telegram`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ initData })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            
            if (data.success) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Показываем уведомление об успешной авторизации
                this.showNotification('success', 'Вы успешно авторизованы!');
                
                return true;
            }

            return false;

        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('error', 'Ошибка авторизации');
            return false;
        }
    }

    // Проверка авторизации
    async checkAuth() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                this.logout();
                return false;
            }

            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                return true;
            }

            return false;

        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    // Выход
    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        
        // Если в Telegram WebApp, закрываем приложение
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.close();
        } else {
            window.location.href = 'index.html';
        }
    }

    // Получить заголовки авторизации
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Показать уведомление
    showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✓' : '✗'}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Анимация появления
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Удаление через 3 секунды
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Перенаправление если не авторизован
    async requireAuth(redirectTo = 'index.html') {
        const isAuthenticated = await this.checkAuth();
        
        if (!isAuthenticated) {
            this.showNotification('error', 'Требуется авторизация');
            setTimeout(() => {
                window.location.href = redirectTo;
            }, 1500);
            return false;
        }
        
        return true;
    }
}

// Создаем глобальный экземпляр
window.authManager = new AuthManager();

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем авторизацию
    const isAuthenticated = await window.authManager.checkAuth();
    
    // Обновляем UI в зависимости от статуса авторизации
    updateAuthUI(isAuthenticated);
    
    // Обработчик кнопки входа/выхода
    const authButton = document.getElementById('auth-button');
    if (authButton) {
        authButton.addEventListener('click', async () => {
            if (window.authManager.currentUser) {
                if (confirm('Вы уверены, что хотите выйти?')) {
                    window.authManager.logout();
                }
            } else {
                await window.authManager.loginWithTelegram();
                location.reload();
            }
        });
    }
});

// Обновление UI в зависимости от статуса авторизации
function updateAuthUI(isAuthenticated) {
    const authButton = document.getElementById('auth-button');
    const userMenu = document.getElementById('user-menu');
    const addProductBtn = document.getElementById('add-product-btn');

    if (authButton) {
        if (isAuthenticated) {
            const user = window.authManager.currentUser;
            authButton.innerHTML = `
                <span>${user.firstName}</span>
                <small>Выйти</small>
            `;
        } else {
            authButton.innerHTML = `
                <span>Войти через Telegram</span>
                <small>Требуется для публикации</small>
            `;
        }
    }

    if (userMenu && isAuthenticated) {
        userMenu.style.display = 'block';
    }

    if (addProductBtn) {
        addProductBtn.disabled = !isAuthenticated;
        if (!isAuthenticated) {
            addProductBtn.title = 'Для добавления товара требуется авторизация';
        }
    }
}