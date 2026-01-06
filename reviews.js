const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
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

// Оставить отзыв о продавце
router.post('/', authenticate, async (req, res) => {
    try {
        const { sellerId, rating, comment, productId } = req.body;

        if (!sellerId || !rating) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Нельзя оставлять отзыв самому себе
        if (sellerId === req.userId) {
            return res.status(400).json({ error: 'Cannot review yourself' });
        }

        // Проверяем, существует ли продавец
        const { data: seller, error: sellerError } = await supabase
            .from('users')
            .select('id')
            .eq('id', sellerId)
            .single();

        if (sellerError) {
            return res.status(404).json({ error: 'Seller not found' });
        }

        // Проверяем, был ли уже оставлен отзыв для этого товара
        if (productId) {
            const { data: existingReview, error: reviewError } = await supabase
                .from('reviews')
                .select('id')
                .eq('seller_id', sellerId)
                .eq('buyer_id', req.userId)
                .eq('product_id', productId)
                .single();

            if (existingReview) {
                return res.status(400).json({ error: 'You have already reviewed this purchase' });
            }
        }

        // Создаем отзыв
        const { data: review, error } = await supabase
            .from('reviews')
            .insert([{
                seller_id: sellerId,
                buyer_id: req.userId,
                rating,
                comment,
                product_id: productId || null
            }])
            .select()
            .single();

        if (error) throw error;

        // Обновляем рейтинг продавца
        await updateSellerRating(sellerId);

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            review
        });

    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

// Получить отзывы о продавце
router.get('/seller/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const { data: reviews, error, count } = await supabase
            .from('reviews')
            .select(`
                *,
                buyer:users!buyer_id (
                    id,
                    first_name,
                    last_name,
                    username,
                    photo_url
                ),
                product:products (
                    id,
                    title,
                    images
                )
            `, { count: 'exact' })
            .eq('seller_id', sellerId)
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) throw error;

        // Получаем статистику отзывов
        const { data: stats } = await supabase
            .from('reviews')
            .select('rating')
            .eq('seller_id', sellerId);

        const ratingStats = {
            5: 0, 4: 0, 3: 0, 2: 0, 1: 0
        };

        stats.forEach(review => {
            ratingStats[review.rating]++;
        });

        res.json({
            success: true,
            reviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            },
            stats: ratingStats
        });

    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// Отправить жалобу
router.post('/report', authenticate, async (req, res) => {
    try {
        const { reportedUserId, productId, reason, description } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Reason is required' });
        }

        if (!reportedUserId && !productId) {
            return res.status(400).json({ error: 'Either user or product must be specified' });
        }

        // Проверяем, существует ли пользователь/товар
        if (reportedUserId) {
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('id', reportedUserId)
                .single();

            if (userError) {
                return res.status(404).json({ error: 'Reported user not found' });
            }
        }

        if (productId) {
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('id')
                .eq('id', productId)
                .single();

            if (productError) {
                return res.status(404).json({ error: 'Product not found' });
            }
        }

        // Создаем жалобу
        const { data: report, error } = await supabase
            .from('reports')
            .insert([{
                reporter_id: req.userId,
                reported_user_id: reportedUserId || null,
                product_id: productId || null,
                reason,
                description,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully. Our moderators will review it.',
            report
        });

    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

// Вспомогательная функция для обновления рейтинга продавца
async function updateSellerRating(sellerId) {
    try {
        // Получаем все отзывы продавца
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('rating')
            .eq('seller_id', sellerId);

        if (error) throw error;

        if (reviews.length === 0) {
            await supabase
                .from('users')
                .update({
                    rating: 5.00,
                    reviews_count: 0
                })
                .eq('id', sellerId);
            return;
        }

        // Рассчитываем средний рейтинг
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;

        await supabase
            .from('users')
            .update({
                rating: averageRating.toFixed(2),
                reviews_count: reviews.length
            })
            .eq('id', sellerId);

    } catch (error) {
        console.error('Update seller rating error:', error);
    }
}

module.exports = router;