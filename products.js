// Управление товарами
class ProductManager {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3000/api';
        this.currentFilters = {
            category: '',
            rarity: '',
            minPrice: '',
            maxPrice: '',
            search: ''
        };
        this.currentPage = 1;
        this.productsPerPage = 12;
    }

    // Загрузить товары с фильтрами
    async loadProducts(filters = {}) {
        try {
            // Обновляем фильтры
            this.currentFilters = { ...this.currentFilters, ...filters };
            
            // Строим URL с параметрами
            const params = new URLSearchParams();
            Object.entries(this.currentFilters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            
            params.append('page', this.currentPage);
            params.append('limit', this.productsPerPage);

            const response = await fetch(
                `${this.API_BASE_URL}/products?${params.toString()}`
            );

            if (!response.ok) {
                throw new Error('Failed to load products');
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Load products error:', error);
            throw error;
        }
    }

    // Получить товар по ID
    async getProductById(id) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/products/${id}`);
            
            if (!response.ok) {
                throw new Error('Product not found');
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Get product error:', error);
            throw error;
        }
    }

    // Создать новый товар
    async createProduct(productData) {
        try {
            const headers = window.authManager.getAuthHeaders();
            
            const response = await fetch(`${this.API_BASE_URL}/products`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(productData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create product');
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Create product error:', error);
            throw error;
        }
    }

    // Обновить товар
    async updateProduct(id, productData) {
        try {
            const headers = window.authManager.getAuthHeaders();
            
            const response = await fetch(`${this.API_BASE_URL}/products/${id}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(productData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update product');
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Update product error:', error);
            throw error;
        }
    }

    // Удалить товар
    async deleteProduct(id) {
        try {
            const headers = window.authManager.getAuthHeaders();
            
            const response = await fetch(`${this.API_BASE_URL}/products/${id}`, {
                method: 'DELETE',
                headers: headers
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete product');
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Delete product error:', error);
            throw error;
        }
    }

    // Добавить/удалить из избранного
    async toggleFavorite(productId) {
        try {
            const headers = window.authManager.getAuthHeaders();
            
            const response = await fetch(
                `${this.API_BASE_URL}/products/${productId}/favorite`,
                {
                    method: 'POST',
                    headers: headers
                }
            );

            if (!response.ok) {
                throw new Error('Failed to update favorite');
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Toggle favorite error:', error);
            throw error;
        }
    }

    // Загрузить избранные товары пользователя
    async getFavorites() {
        try {
            // Этот эндпоинт нужно будет добавить на бэкенде
            const response = await fetch(`${this.API_BASE_URL}/favorites`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to load favorites');
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Get favorites error:', error);
            throw error;
        }
    }

    // Создать HTML карточки товара
    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.id = product.id;
        
        // Проверяем, авторизован ли пользователь и добавлен ли товар в избранное
        const isFavorite = window.authManager.currentUser && 
                          product.is_favorite || false;

        card.innerHTML = `
            <div class="product-card-header">
                <span class="product-category">${this.getCategoryName(product.category)}</span>
                <span class="product-rarity rarity-${product.rarity}">
                    ${this.getRarityName(product.rarity)}
                </span>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                        onclick="productManager.handleFavorite(event, '${product.id}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" 
                         fill="${isFavorite ? '#ff6b35' : 'none'}" 
                         stroke="currentColor" stroke-width="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </button>
            </div>
            
            <div class="product-image-container">
                <img src="${product.images && product.images[0] ? product.images[0] : 'assets/no-image.jpg'}" 
                     alt="${product.title}" 
                     class="product-image"
                     onclick="productManager.openProductDetail('${product.id}')">
            </div>
            
            <div class="product-info">
                <h3 class="product-title" onclick="productManager.openProductDetail('${product.id}')">
                    ${product.title}
                </h3>
                
                <div class="product-price">${this.formatPrice(product.price)} ₽</div>
                
                <div class="product-condition">
                    <span class="condition-badge condition-${product.condition}">
                        ${this.getConditionName(product.condition)}
                    </span>
                    ${product.year ? `<span class="product-year">${product.year} г.</span>` : ''}
                </div>
                
                <div class="product-seller" onclick="productManager.openSellerProfile('${product.seller?.id}')">
                    <div class="seller-avatar">
                        ${product.seller?.first_name?.charAt(0) || 'П'}
                    </div>
                    <div class="seller-info">
                        <div class="seller-name">
                            ${product.seller?.first_name || 'Продавец'} 
                            ${product.seller?.last_name || ''}
                        </div>
                        <div class="seller-rating">
                            <span class="stars">${this.generateStars(product.seller?.rating || 0)}</span>
                            <span class="rating-value">${product.seller?.rating || '5.00'}</span>
                            <span class="reviews-count">(${product.seller?.reviews_count || 0})</span>
                        </div>
                    </div>
                </div>
                
                <div class="product-actions">
                    <button class="btn btn-primary" 
                            onclick="productManager.contactSeller(${product.seller?.telegram_id || 'null'})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                        Написать
                    </button>
                    
                    ${window.authManager.currentUser?.id === product.seller?.id ? `
                        <div class="owner-actions">
                            <button class="btn btn-secondary" onclick="productManager.editProduct('${product.id}')">
                                Редактировать
                            </button>
                            <button class="btn btn-danger" onclick="productManager.deleteProductPrompt('${product.id}')">
                                Удалить
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        return card;
    }

    // Обработчик избранного
    async handleFavorite(event, productId) {
        event.stopPropagation();
        
        if (!window.authManager.currentUser) {
            window.authManager.showNotification('error', 'Войдите, чтобы добавлять в избранное');
            return;
        }

        try {
            const result = await this.toggleFavorite(productId);
            const btn = event.target.closest('.favorite-btn');
            const svg = btn.querySelector('svg');
            
            if (result.favorited) {
                btn.classList.add('active');
                svg.setAttribute('fill', '#ff6b35');
                window.authManager.showNotification('success', 'Добавлено в избранное');
            } else {
                btn.classList.remove('active');
                svg.setAttribute('fill', 'none');
                window.authManager.showNotification('info', 'Удалено из избранного');
            }
        } catch (error) {
            window.authManager.showNotification('error', 'Ошибка при обновлении избранного');
        }
    }

    // Открыть детальную страницу товара
    openProductDetail(productId) {
        window.location.href = `product-detail.html?id=${productId}`;
    }

    // Открыть профиль продавца
    openSellerProfile(sellerId) {
        window.location.href = `profile.html?id=${sellerId}`;
    }

    // Связаться с продавцом через Telegram
    contactSeller(telegramId) {
        if (!telegramId) {
            window.authManager.showNotification('error', 'Телеграм продавца не указан');
            return;
        }

        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.openTelegramLink(`https://t.me/${telegramId}`);
        } else {
            // Fallback для браузера
            window.open(`https://t.me/${telegramId}`, '_blank');
        }
    }

    // Форматирование цены
    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU').format(price);
    }

    // Генерация звезд рейтинга
    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '★';
            } else if (i === fullStars && hasHalfStar) {
                stars += '½';
            } else {
                stars += '☆';
            }
        }
        return stars;
    }

    // Получить название категории
    getCategoryName(category) {
        const categories = {
            'main': 'Мейн',
            'custom': 'Кастомки',
            'premium': 'Премки',
            'special': 'Спецки',
            'sets': 'Наборы'
        };
        return categories[category] || category;
    }

    // Получить название редкости
    getRarityName(rarity) {
        const rarities = {
            'stg': 'STG',
            'th': 'TH',
            'main': 'Мейн',
            'rare': 'Редкий',
            'super_treasure': 'Супер сокровище'
        };
        return rarities[rarity] || rarity;
    }

    // Получить название состояния
    getConditionName(condition) {
        const conditions = {
            'new_in_box': 'Новый в коробке',
            'excellent': 'Отличное',
            'good': 'Хорошее',
            'used': 'Б/у',
            'damaged': 'Поврежденный'
        };
        return conditions[condition] || condition;
    }

    // Показать форму жалобы
    showReportForm(reportedUserId = null, productId = null) {
        const form = document.createElement('div');
        form.className = 'modal-overlay';
        form.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Отправить жалобу</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="report-form">
                        <input type="hidden" name="reportedUserId" value="${reportedUserId || ''}">
                        <input type="hidden" name="productId" value="${productId || ''}">
                        
                        <div class="form-group">
                            <label for="reason">Причина жалобы *</label>
                            <select id="reason" name="reason" required>
                                <option value="">Выберите причину</option>
                                <option value="scam">Мошенничество</option>
                                <option value="fake_product">Поддельный товар</option>
                                <option value="wrong_description">Несоответствие описанию</option>
                                <option value="bad_behavior">Грубое поведение</option>
                                <option value="spam">Спам</option>
                                <option value="other">Другое</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="description">Описание проблемы *</label>
                            <textarea id="description" name="description" rows="4" 
                                      placeholder="Подробно опишите проблему..." required></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" 
                                    onclick="this.closest('.modal-overlay').remove()">Отмена</button>
                            <button type="submit" class="btn btn-primary">Отправить жалобу</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(form);

        // Обработчик отправки формы
        form.querySelector('#report-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitReport(new FormData(e.target));
            form.remove();
        });
    }

    // Отправить жалобу
    async submitReport(formData) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/reviews/report`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    reportedUserId: formData.get('reportedUserId') || null,
                    productId: formData.get('productId') || null,
                    reason: formData.get('reason'),
                    description: formData.get('description')
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit report');
            }

            window.authManager.showNotification('success', 'Жалоба отправлена на рассмотрение');
            
        } catch (error) {
            console.error('Submit report error:', error);
            window.authManager.showNotification('error', 'Ошибка при отправке жалобы');
        }
    }
}

// Создаем глобальный экземпляр
window.productManager = new ProductManager();