const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');

// Middleware для проверки авторизации
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Проверяем пользователя
        const { data: user, error } = await supabase
            .from('users')
            .select('id, is_banned')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (user.is_banned) {
            return res.status(403).json({ error: 'Account is banned' });
        }

        req.userId = user.id;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Получить все товары с фильтрами
router.get('/', async (req, res) => {
    try {
        const { category, rarity, minPrice, maxPrice, sellerId, search } = req.query;
        
        let query = supabase
            .from('products')
            .select(`
                *,
                seller:users!seller_id (
                    id,
                    first_name,
                    last_name,
                    username,
                    photo_url,
                    rating,
                    reviews_count,
                    successful_sales
                )
            `)
            .eq('active', true)
            .order('created_at', { ascending: false });

        // Применяем фильтры
        if (category) query = query.eq('category', category);
        if (rarity) query = query.eq('rarity', rarity);
        if (sellerId) query = query.eq('seller_id', sellerId);
        if (minPrice) query = query.gte('price', minPrice);
        if (maxPrice) query = query.lte('price', maxPrice);
        if (search) query = query.ilike('title', `%${search}%`);

        const { data: products, error } = await query;

        if (error) throw error;

        res.json({ success: true, products });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Получить товар по ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: product, error } = await supabase
            .from('products')
            .select(`
                *,
                seller:users!seller_id (
                    id,
                    first_name,
                    last_name,
                    username,
                    photo_url,
                    rating,
                    reviews_count,
                    successful_sales
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Увеличиваем счетчик просмотров
        await supabase
            .from('products')
            .update({ views: product.views + 1 })
            .eq('id', id);

        res.json({ success: true, product });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Создать новый товар (только для авторизованных)
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            title,
            description,
            price,
            category,
            rarity,
            condition,
            year,
            images,
            location,
            shippingAvailable
        } = req.body;

        // Валидация
        if (!title || !price || !category || !rarity || !condition) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const validCategories = ['main', 'custom', 'premium', 'special', 'sets'];
        const validRarities = ['stg', 'th', 'main', 'rare', 'super_treasure'];
        const validConditions = ['new_in_box', 'excellent', 'good', 'used', 'damaged'];

        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        if (!validRarities.includes(rarity)) {
            return res.status(400).json({ error: 'Invalid rarity' });
        }

        if (!validConditions.includes(condition)) {
            return res.status(400).json({ error: 'Invalid condition' });
        }

        // Создаем товар
        const { data: product, error } = await supabase
            .from('products')
            .insert([{
                title,
                description,
                price: parseFloat(price),
                category,
                rarity,
                condition,
                year: year ? parseInt(year) : null,
                images: images || [],
                seller_id: req.userId,
                location,
                shipping_available: shippingAvailable || false,
                active: true
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ 
            success: true, 
            message: 'Product created successfully',
            product 
        });

    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// Обновить товар
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Проверяем, что товар принадлежит пользователю
        const { data: existingProduct, error: checkError } = await supabase
            .from('products')
            .select('seller_id')
            .eq('id', id)
            .single();

        if (checkError) throw checkError;

        if (existingProduct.seller_id !== req.userId) {
            return res.status(403).json({ error: 'Not authorized to update this product' });
        }

        // Обновляем товар
        const { data: product, error } = await supabase
            .from('products')
            .update({
                ...updateData,
                updated_at: new Date()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({ 
            success: true, 
            message: 'Product updated successfully',
            product 
        });

    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Удалить товар
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Проверяем, что товар принадлежит пользователю
        const { data: existingProduct, error: checkError } = await supabase
            .from('products')
            .select('seller_id')
            .eq('id', id)
            .single();

        if (checkError) throw checkError;

        if (existingProduct.seller_id !== req.userId) {
            return res.status(403).json({ error: 'Not authorized to delete this product' });
        }

        // Удаляем товар
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ 
            success: true, 
            message: 'Product deleted successfully' 
        });

    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Добавить/удалить из избранного
router.post('/:id/favorite', authenticate, async (req, res) => {
    try {
        const { id: productId } = req.params;

        // Проверяем, существует ли товар
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id')
            .eq('id', productId)
            .single();

        if (productError) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Проверяем, есть ли уже в избранном
        const { data: existingFavorite, error: favoriteError } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', req.userId)
            .eq('product_id', productId)
            .single();

        if (favoriteError && favoriteError.code !== 'PGRST116') {
            throw favoriteError;
        }

        if (existingFavorite) {
            // Удаляем из избранного
            await supabase
                .from('favorites')
                .delete()
                .eq('id', existingFavorite.id);

            res.json({ 
                success: true, 
                favorited: false,
                message: 'Removed from favorites'
            });
        } else {
            // Добавляем в избранное
            await supabase
                .from('favorites')
                .insert([{
                    user_id: req.userId,
                    product_id: productId
                }]);

            res.json({ 
                success: true, 
                favorited: true,
                message: 'Added to favorites'
            });
        }

    } catch (error) {
        console.error('Favorite error:', error);
        res.status(500).json({ error: 'Failed to update favorites' });
    }
});

module.exports = router;